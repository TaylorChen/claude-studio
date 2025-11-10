/**
 * ChatHistoryManager - 对话历史管理器
 * 负责保存、加载、搜索和导出对话历史
 */

const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class ChatHistoryManager {
  constructor() {
    this.dbPath = path.join(app.getPath('userData'), 'chat-history.json');
    this.conversations = [];
    this.currentConversation = null;
    this.maxConversations = 100; // 最多保存100个对话
    this.initialized = false;
  }

  /**
   * 初始化历史管理器
   */
  async init() {
    try {
      await this.loadHistory();
      this.initialized = true;
    } catch (error) {
      this.conversations = [];
      await this.persist();
      this.initialized = true;
    }
  }

  /**
   * 开始新对话
   */
  startNewConversation(context = {}) {
    this.currentConversation = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      messages: [],
      context: {
        filePath: context.filePath || null,
        language: context.language || null,
        projectPath: context.projectPath || null
      },
      title: null, // 自动生成
      tags: []
    };
    return this.currentConversation.id;
  }

  /**
   * 添加消息到当前对话
   */
  addMessage(role, content, metadata = {}) {
    if (!this.currentConversation) {
      this.startNewConversation();
    }

    const message = {
      id: this.generateId(),
      role, // 'user' | 'assistant'
      content,
      timestamp: new Date().toISOString(),
      metadata // 可包含代码块、文件路径等
    };

    this.currentConversation.messages.push(message);

    // 自动生成标题（基于第一条用户消息）
    if (!this.currentConversation.title && role === 'user') {
      this.currentConversation.title = this.generateTitle(content);
    }

    return message.id;
  }

  /**
   * 保存当前对话
   */
  async saveCurrentConversation() {
    if (!this.currentConversation || this.currentConversation.messages.length === 0) {
      return;
    }

    // 检查是否已存在（更新）
    const existingIndex = this.conversations.findIndex(
      conv => conv.id === this.currentConversation.id
    );

    if (existingIndex >= 0) {
      this.conversations[existingIndex] = { ...this.currentConversation };
    } else {
      this.conversations.unshift(this.currentConversation);
    }

    // 限制历史数量
    if (this.conversations.length > this.maxConversations) {
      this.conversations = this.conversations.slice(0, this.maxConversations);
    }

    await this.persist();
  }

  /**
   * 加载历史对话
   */
  async loadHistory() {
    const data = await fs.readFile(this.dbPath, 'utf-8');
    this.conversations = JSON.parse(data);
  }

  /**
   * 持久化到磁盘
   */
  async persist() {
    await fs.writeFile(
      this.dbPath,
      JSON.stringify(this.conversations, null, 2),
      'utf-8'
    );
  }

  /**
   * 获取所有对话（按时间倒序）
   */
  getAllConversations() {
    return this.conversations.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
  }

  /**
   * 根据 ID 获取对话
   */
  getConversationById(id) {
    return this.conversations.find(conv => conv.id === id);
  }

  /**
   * 恢复对话（设置为当前对话）
   */
  restoreConversation(id) {
    const conversation = this.getConversationById(id);
    if (conversation) {
      this.currentConversation = { ...conversation };
      return this.currentConversation;
    }
    return null;
  }

  /**
   * 删除对话
   */
  async deleteConversation(id) {
    const index = this.conversations.findIndex(conv => conv.id === id);
    if (index >= 0) {
      this.conversations.splice(index, 1);
      await this.persist();
      return true;
    }
    return false;
  }

  /**
   * 搜索对话
   */
  search(query) {
    const lowerQuery = query.toLowerCase();
    return this.conversations.filter(conv => {
      // 搜索标题
      if (conv.title && conv.title.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // 搜索消息内容
      return conv.messages.some(msg => 
        msg.content.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * 按标签筛选
   */
  filterByTag(tag) {
    return this.conversations.filter(conv => 
      conv.tags && conv.tags.includes(tag)
    );
  }

  /**
   * 导出对话
   */
  async exportConversation(id, filePath) {
    const conversation = this.getConversationById(id);
    if (!conversation) {
      throw new Error('对话不存在');
    }

    await fs.writeFile(
      filePath,
      JSON.stringify(conversation, null, 2),
      'utf-8'
    );
  }

  /**
   * 导出所有对话
   */
  async exportAll(filePath) {
    await fs.writeFile(
      filePath,
      JSON.stringify(this.conversations, null, 2),
      'utf-8'
    );
  }

  /**
   * 导入对话
   */
  async importConversation(filePath) {
    const data = await fs.readFile(filePath, 'utf-8');
    const conversation = JSON.parse(data);
    
    // 确保有必要的字段
    if (!conversation.id || !conversation.messages) {
      throw new Error('无效的对话文件');
    }

    // 避免 ID 冲突
    if (this.getConversationById(conversation.id)) {
      conversation.id = this.generateId();
    }

    this.conversations.unshift(conversation);
    await this.persist();
    return conversation.id;
  }

  /**
   * 清空所有历史
   */
  async clearAll() {
    this.conversations = [];
    this.currentConversation = null;
    await this.persist();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const totalMessages = this.conversations.reduce(
      (sum, conv) => sum + conv.messages.length,
      0
    );

    return {
      totalConversations: this.conversations.length,
      totalMessages,
      oldestDate: this.conversations.length > 0 
        ? this.conversations[this.conversations.length - 1].timestamp
        : null,
      newestDate: this.conversations.length > 0
        ? this.conversations[0].timestamp
        : null
    };
  }

  /**
   * 生成唯一 ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成对话标题（基于第一条用户消息）
   */
  generateTitle(firstMessage) {
    // 截取前50个字符作为标题
    const title = firstMessage.trim().substring(0, 50);
    return title.length < firstMessage.length ? `${title}...` : title;
  }

  /**
   * 获取最后一个对话
   * @returns {object|null} 最后一个对话对象或 null
   */
  getLastConversation() {
    if (this.conversations.length === 0) {
      return null;
    }
    // 对话已按时间倒序排列，第一个是最新的
    return this.conversations[0];
  }

  /**
   * 恢复为最后一个对话
   * @returns {object|null} 恢复的对话对象或 null
   */
  restoreLastConversation() {
    const lastConv = this.getLastConversation();
    if (lastConv) {
      this.currentConversation = JSON.parse(JSON.stringify(lastConv));
      return this.currentConversation;
    }
    return null;
  }

  /**
   * 转换为 Markdown 格式
   */
  toMarkdown(conversationId) {
    const conversation = this.getConversationById(conversationId);
    if (!conversation) {
      return '';
    }

    let markdown = `# ${conversation.title}\n\n`;
    markdown += `**日期**: ${new Date(conversation.timestamp).toLocaleString()}\n\n`;
    
    if (conversation.context.filePath) {
      markdown += `**文件**: ${conversation.context.filePath}\n\n`;
    }

    markdown += `---\n\n`;

    conversation.messages.forEach(msg => {
      const role = msg.role === 'user' ? '👤 用户' : '🤖 AI';
      markdown += `## ${role}\n\n`;
      markdown += `${msg.content}\n\n`;
      markdown += `---\n\n`;
    });

    return markdown;
  }
}

module.exports = ChatHistoryManager;

