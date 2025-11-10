/**
 * 系统提示管理器
 * 处理系统提示的配置、保存和加载
 * MVP-2.1 实施
 */

class SystemPromptManager {
  constructor() {
    this.currentPrompt = null;
    this.promptMode = 'default'; // 'default', 'custom', 'template'
    this.customPrompts = [];
    this.init();
  }

  /**
   * 初始化系统提示管理器
   */
  init() {
    this.loadPrompts();
    this.setDefaultPrompt();
  }

  /**
   * 设置默认提示
   */
  setDefaultPrompt() {
    this.currentPrompt = {
      id: 'default',
      name: '默认提示',
      mode: 'default',
      content: `You are Claude, an AI assistant made by Anthropic. You aim to be helpful, harmless, and honest in your interactions.

Key characteristics:
- Be direct and concise
- Provide accurate information
- Ask for clarification when needed
- Acknowledge uncertainty
- Maintain user privacy
- Follow instructions carefully`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  /**
   * 获取所有预设提示模板
   */
  getPresetPrompts() {
    return [
      {
        id: 'preset_code_expert',
        name: '代码专家模式',
        mode: 'preset',
        content: `You are an expert programming assistant. Focus on:
- Writing clean, efficient code
- Following best practices
- Explaining complex concepts clearly
- Suggesting optimizations
- Providing complete examples with comments`,
        description: '专门用于编程和技术问题'
      },
      {
        id: 'preset_creative',
        name: '创意写作模式',
        mode: 'preset',
        content: `You are a creative writing assistant. Your role is to:
- Help brainstorm ideas
- Improve writing quality
- Suggest vivid language
- Maintain narrative consistency
- Encourage creative expression`,
        description: '适用于创意写作和内容创建'
      },
      {
        id: 'preset_analytical',
        name: '数据分析模式',
        mode: 'preset',
        content: `You are an analytical assistant specialized in data analysis. You:
- Interpret complex data clearly
- Suggest appropriate analysis methods
- Explain statistical concepts
- Identify patterns and insights
- Provide data-driven recommendations`,
        description: '用于数据分析和研究'
      },
      {
        id: 'preset_tutor',
        name: '教学辅导模式',
        mode: 'preset',
        content: `You are an educational tutor. Your approach:
- Explain concepts step by step
- Use examples and analogies
- Check understanding
- Adapt to learning style
- Encourage questions`,
        description: '专为学习和教育设计'
      }
    ];
  }

  /**
   * 获取当前提示
   */
  getCurrentPrompt() {
    return this.currentPrompt;
  }

  /**
   * 获取当前提示内容
   */
  getCurrentPromptContent() {
    return this.currentPrompt ? this.currentPrompt.content : '';
  }

  /**
   * 切换到预设提示
   */
  switchToPreset(presetId) {
    const preset = this.getPresetPrompts().find(p => p.id === presetId);
    if (!preset) {
      throw new Error('预设提示不存在');
    }

    this.currentPrompt = {
      ...preset,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.promptMode = 'template';
    this.savePrompts();
    return this.currentPrompt;
  }

  /**
   * 切换到默认提示
   */
  switchToDefault() {
    this.setDefaultPrompt();
    this.promptMode = 'default';
    this.savePrompts();
    return this.currentPrompt;
  }

  /**
   * 创建自定义提示
   */
  createCustomPrompt(name, content) {
    if (!name || !content) {
      throw new Error('提示名称和内容不能为空');
    }

    const customPrompt = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      mode: 'custom',
      content,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.customPrompts.push(customPrompt);
    this.savePrompts();
    return customPrompt;
  }

  /**
   * 更新自定义提示
   */
  updateCustomPrompt(promptId, name, content) {
    const prompt = this.customPrompts.find(p => p.id === promptId);
    if (!prompt) {
      throw new Error('自定义提示不存在');
    }

    prompt.name = name || prompt.name;
    prompt.content = content || prompt.content;
    prompt.updatedAt = Date.now();

    this.savePrompts();
    return prompt;
  }

  /**
   * 删除自定义提示
   */
  deleteCustomPrompt(promptId) {
    const index = this.customPrompts.findIndex(p => p.id === promptId);
    if (index === -1) {
      throw new Error('自定义提示不存在');
    }

    this.customPrompts.splice(index, 1);
    this.savePrompts();
  }

  /**
   * 获取所有自定义提示
   */
  getCustomPrompts() {
    return this.customPrompts;
  }

  /**
   * 切换到自定义提示
   */
  switchToCustom(promptId) {
    const prompt = this.customPrompts.find(p => p.id === promptId);
    if (!prompt) {
      throw new Error('自定义提示不存在');
    }

    this.currentPrompt = JSON.parse(JSON.stringify(prompt));
    this.promptMode = 'custom';
    this.savePrompts();
    return this.currentPrompt;
  }

  /**
   * 保存提示到本地存储
   */
  savePrompts() {
    try {
      const data = {
        currentPrompt: this.currentPrompt,
        promptMode: this.promptMode,
        customPrompts: this.customPrompts,
        savedAt: Date.now()
      };

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('claude_system_prompts', JSON.stringify(data));
      }
    } catch (error) {
      console.error('❌ 保存提示失败:', error);
    }
  }

  /**
   * 从本地存储加载提示
   */
  loadPrompts() {
    try {
      if (typeof localStorage === 'undefined') return;

      const data = localStorage.getItem('claude_system_prompts');
      if (data) {
        const parsed = JSON.parse(data);
        this.currentPrompt = parsed.currentPrompt || this.currentPrompt;
        this.promptMode = parsed.promptMode || 'default';
        this.customPrompts = parsed.customPrompts || [];
      }
    } catch (error) {
      console.error('❌ 加载提示失败:', error);
    }
  }

  /**
   * 获取提示统计信息
   */
  getPromptStats() {
    return {
      currentMode: this.promptMode,
      currentPromptName: this.currentPrompt?.name || '未知',
      totalCustomPrompts: this.customPrompts.length,
      totalPresets: this.getPresetPrompts().length,
      lastUpdated: this.currentPrompt?.updatedAt
    };
  }

  /**
   * 导出提示为 JSON
   */
  exportPromptsAsJSON() {
    return {
      currentPrompt: this.currentPrompt,
      promptMode: this.promptMode,
      customPrompts: this.customPrompts,
      presets: this.getPresetPrompts(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * 导入提示从 JSON
   */
  importPromptsFromJSON(jsonContent) {
    try {
      const data = JSON.parse(jsonContent);

      if (data.customPrompts && Array.isArray(data.customPrompts)) {
        this.customPrompts = data.customPrompts;
      }

      if (data.currentPrompt) {
        this.currentPrompt = data.currentPrompt;
      }

      if (data.promptMode) {
        this.promptMode = data.promptMode;
      }

      this.savePrompts();
      return { success: true, importedCount: this.customPrompts.length };
    } catch (error) {
      throw new Error(`导入失败: ${error.message}`);
    }
  }

  /**
   * 获取提示摘要（用于显示）
   */
  getPromptSummary(content, maxLength = 100) {
    if (!content) return '暂无内容';
    const lines = content.split('\n');
    const summary = lines[0] || '';
    return summary.length > maxLength ? summary.substring(0, maxLength) + '...' : summary;
  }

  /**
   * 验证提示内容
   */
  validatePrompt(content) {
    if (!content || typeof content !== 'string') {
      return { valid: false, error: '提示内容必须是非空字符串' };
    }

    if (content.length < 10) {
      return { valid: false, error: '提示内容至少需要 10 个字符' };
    }

    if (content.length > 5000) {
      return { valid: false, error: '提示内容不能超过 5000 个字符' };
    }

    return { valid: true };
  }

  /**
   * 获取提示使用统计
   */
  getUsageStats() {
    return {
      defaultPromptUses: 0, // 实际使用统计需要在 AIChatComponent 中记录
      customPromptsCount: this.customPrompts.length,
      presetsCount: this.getPresetPrompts().length,
      totalCharacters: this.currentPrompt?.content?.length || 0
    };
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SystemPromptManager;
}

