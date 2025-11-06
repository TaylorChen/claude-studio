/**
 * AI 服务模块
 * 负责与 Claude API 的所有交互
 */

const store = require('../../store');

class AIService {
  constructor() {
    this.conversationHistory = new Map();  // conversationId -> messages
  }

  /**
   * 内联编辑（Cmd+K 模式）
   * @param {string} selectedText - 选中的代码
   * @param {string} instruction - 用户指令
   * @returns {Promise<string>} AI 生成的代码
   */
  async inlineEdit(selectedText, instruction) {
    store.setState('ai.isProcessing', true);

    try {
      // 收集上下文
      const context = await this.gatherContext();
      
      // 构建提示词
      const prompt = this.buildInlineEditPrompt(selectedText, instruction, context);
      
      // 调用 Claude
      const result = await window.electronAPI.sendCommand(prompt);
      
      if (result.success) {
        return result.response;
      } else {
        throw new Error(result.error);
      }
    } finally {
      store.setState('ai.isProcessing', false);
    }
  }

  /**
   * 聊天对话（Cmd+L 模式）
   * @param {string} message - 用户消息
   * @param {string} conversationId - 对话 ID
   * @returns {Promise<object>} { response, conversationId }
   */
  async chat(message, conversationId = null) {
    store.setState('ai.isProcessing', true);

    try {
      // 创建或获取对话
      if (!conversationId) {
        conversationId = `conv-${Date.now()}`;
      }

      let messages = this.conversationHistory.get(conversationId) || [];
      
      // 添加用户消息
      messages.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // 收集上下文
      const context = await this.gatherContext();
      
      // 构建完整提示
      const prompt = this.buildChatPrompt(messages, context);
      
      // 调用 Claude
      const result = await window.electronAPI.sendCommand(prompt);
      
      if (result.success) {
        // 添加 AI 响应
        messages.push({
          role: 'assistant',
          content: result.response,
          timestamp: new Date()
        });

        this.conversationHistory.set(conversationId, messages);

        // 更新 store
        this.updateConversations();

        return {
          response: result.response,
          conversationId
        };
      } else {
        throw new Error(result.error);
      }
    } finally {
      store.setState('ai.isProcessing', false);
    }
  }

  /**
   * 代码补全（Tab 模式）
   * @param {string} prefix - 光标前的代码
   * @param {string} suffix - 光标后的代码
   * @returns {Promise<string>} 补全建议
   */
  async autocomplete(prefix, suffix) {
    // 简单实现：基于前缀预测
    const context = await this.gatherContext();
    const prompt = this.buildAutocompletePrompt(prefix, suffix, context);
    
    const result = await window.electronAPI.sendCommand(prompt);
    
    if (result.success) {
      return result.response;
    }
    return '';
  }

  /**
   * 代码解释
   * @param {string} code - 要解释的代码
   * @returns {Promise<string>} 解释文本
   */
  async explain(code) {
    store.setState('ai.isProcessing', true);

    try {
      const prompt = `请解释以下代码的功能：\n\n\`\`\`\n${code}\n\`\`\``;
      const result = await window.electronAPI.sendCommand(prompt);
      
      if (result.success) {
        return result.response;
      } else {
        throw new Error(result.error);
      }
    } finally {
      store.setState('ai.isProcessing', false);
    }
  }

  /**
   * 代码优化
   * @param {string} code - 要优化的代码
   * @returns {Promise<string>} 优化后的代码
   */
  async optimize(code) {
    store.setState('ai.isProcessing', true);

    try {
      const prompt = `请优化以下代码，提高性能和可读性：\n\n\`\`\`\n${code}\n\`\`\`\n\n只返回优化后的代码，不需要解释。`;
      const result = await window.electronAPI.sendCommand(prompt);
      
      if (result.success) {
        return result.response;
      } else {
        throw new Error(result.error);
      }
    } finally {
      store.setState('ai.isProcessing', false);
    }
  }

  /**
   * 查找 Bug
   * @param {string} code - 要检查的代码
   * @returns {Promise<string>} Bug 分析
   */
  async findBugs(code) {
    store.setState('ai.isProcessing', true);

    try {
      const prompt = `请分析以下代码，找出可能存在的 bug 或问题：\n\n\`\`\`\n${code}\n\`\`\``;
      const result = await window.electronAPI.sendCommand(prompt);
      
      if (result.success) {
        return result.response;
      } else {
        throw new Error(result.error);
      }
    } finally {
      store.setState('ai.isProcessing', false);
    }
  }

  /**
   * 生成文档
   * @param {string} code - 要生成文档的代码
   * @returns {Promise<string>} 生成的文档
   */
  async generateDocs(code) {
    store.setState('ai.isProcessing', true);

    try {
      const prompt = `请为以下代码生成详细的文档注释（JSDoc 格式）：\n\n\`\`\`\n${code}\n\`\`\``;
      const result = await window.electronAPI.sendCommand(prompt);
      
      if (result.success) {
        return result.response;
      } else {
        throw new Error(result.error);
      }
    } finally {
      store.setState('ai.isProcessing', false);
    }
  }

  /**
   * 收集上下文信息
   * @returns {Promise<object>} 上下文对象
   */
  async gatherContext() {
    const activeFile = store.getState('editor.activeFile');
    const projectPath = store.getState('files.projectPath');
    
    const context = {
      currentFile: activeFile,
      projectPath,
      language: null,
      recentFiles: store.getState('files.recentFiles')
    };

    // 如果有打开的文件，获取语言信息
    if (activeFile) {
      const ext = activeFile.split('.').pop();
      context.language = this.getLanguageFromExtension(ext);
    }

    return context;
  }

  /**
   * 构建内联编辑提示词
   */
  buildInlineEditPrompt(selectedText, instruction, context) {
    let prompt = `你是一个代码编辑助手。用户选中了以下代码：\n\n\`\`\`${context.language || ''}\n${selectedText}\n\`\`\`\n\n`;
    prompt += `用户的指令是："${instruction}"\n\n`;
    prompt += `请直接返回修改后的代码，不要有任何解释或额外文字。`;
    return prompt;
  }

  /**
   * 构建聊天提示词
   */
  buildChatPrompt(messages, context) {
    let prompt = `你是一个 AI 编程助手，正在协助用户开发代码。\n\n`;
    
    if (context.currentFile) {
      prompt += `当前文件：${context.currentFile}\n`;
    }
    if (context.projectPath) {
      prompt += `项目路径：${context.projectPath}\n`;
    }
    
    prompt += `\n对话历史：\n`;
    messages.slice(-10).forEach(msg => {  // 只保留最近10条消息
      prompt += `${msg.role === 'user' ? '用户' : 'AI'}：${msg.content}\n`;
    });

    return prompt;
  }

  /**
   * 构建自动补全提示词
   */
  buildAutocompletePrompt(prefix, suffix, context) {
    let prompt = `请预测下一段代码。\n\n`;
    prompt += `文件类型：${context.language || 'unknown'}\n\n`;
    prompt += `光标前的代码：\n\`\`\`\n${prefix.slice(-500)}\n\`\`\`\n\n`;  // 只取最后500字符
    prompt += `光标后的代码：\n\`\`\`\n${suffix.slice(0, 200)}\n\`\`\`\n\n`;
    prompt += `请补全光标位置的代码，只返回补全部分。`;
    return prompt;
  }

  /**
   * 根据文件扩展名获取语言
   */
  getLanguageFromExtension(ext) {
    const map = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'rb': 'ruby',
      'go': 'go',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'rs': 'rust',
      'php': 'php'
    };
    return map[ext] || ext;
  }

  /**
   * 更新对话列表到 store
   */
  updateConversations() {
    const conversations = Array.from(this.conversationHistory.entries()).map(([id, messages]) => ({
      id,
      messages,
      lastMessage: messages[messages.length - 1],
      createdAt: messages[0].timestamp
    }));
    store.setState('ai.conversations', conversations);
  }

  /**
   * 清除对话
   * @param {string} conversationId - 对话 ID
   */
  clearConversation(conversationId) {
    this.conversationHistory.delete(conversationId);
    this.updateConversations();
  }

  /**
   * 清除所有对话
   */
  clearAllConversations() {
    this.conversationHistory.clear();
    store.setState('ai.conversations', []);
  }
}

module.exports = AIService;


