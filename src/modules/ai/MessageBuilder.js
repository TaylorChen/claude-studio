/**
 * MessageBuilder - 构建包含附件的消息格式
 * 
 * 职责:
 * 1. 将文本 + 附件组合成 Claude API 格式
 * 2. 处理不同类型的附件 (文件/图片)
 * 3. 支持多个附件
 * 4. 格式转换 (Base64 等)
 */

class MessageBuilder {
  constructor() {
    this.supportedImageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    this.supportedDocTypes = ['.txt', '.md', '.pdf', '.json', '.xml', '.csv'];
    this.supportedCodeTypes = ['.js', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.rb'];
  }

  /**
   * 构建包含附件的完整消息
   * @param {string} text - 用户输入的文本
   * @param {Array} attachments - 附件数组
   * @returns {Object} 消息对象
   */
  buildMessage(text, attachments = []) {

    // 基础消息对象
    const messageObj = {
      text: text,
      attachments: []
    };

    // 处理附件
    if (attachments && attachments.length > 0) {
      messageObj.attachments = attachments.map(att => this.formatAttachment(att));
    }

    console.log('✓ 消息构建完成:', messageObj);
    return messageObj;
  }

  /**
   * 格式化单个附件
   * @param {Object} attachment - 附件对象 {id, type, name, size, path}
   * @returns {Object} 格式化后的附件
   */
  formatAttachment(attachment) {
    if (!attachment) return null;

    const ext = this.getFileExtension(attachment.name);
    const fileType = this.getFileType(ext);


    return {
      id: attachment.id,
      name: attachment.name,
      size: attachment.size,
      type: fileType,
      extension: ext,
      path: attachment.path,
      // 附加信息，用于 Claude 识别
      originalType: attachment.type,
      formattedSize: this.formatFileSize(attachment.size)
    };
  }

  /**
   * 获取文件扩展名
   * @param {string} fileName - 文件名
   * @returns {string} 扩展名 (包含点)
   */
  getFileExtension(fileName) {
    if (!fileName) return '';
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot === -1) return '';
    return fileName.substring(lastDot).toLowerCase();
  }

  /**
   * 获取文件类型分类
   * @param {string} ext - 文件扩展名
   * @returns {string} 文件类型
   */
  getFileType(ext) {
    if (this.supportedImageTypes.includes(ext)) {
      return 'image';
    } else if (this.supportedCodeTypes.includes(ext)) {
      return 'code';
    } else if (this.supportedDocTypes.includes(ext)) {
      return 'document';
    } else {
      return 'file';
    }
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * 构建简单的消息摘要 (用于日志)
   * @param {Object} messageObj - 消息对象
   * @returns {string} 摘要
   */
  summarizeMessage(messageObj) {
    if (!messageObj) return '(空)';
    
    const textPreview = messageObj.text?.substring(0, 50) || '(无文本)';
    const attachmentCount = messageObj.attachments?.length || 0;
    
    return `文本: "${textPreview}...", 附件: ${attachmentCount} 个`;
  }

  /**
   * 验证消息格式
   * @param {Object} messageObj - 消息对象
   * @returns {boolean} 是否有效
   */
  isValidMessage(messageObj) {
    if (!messageObj) {
      console.warn('⚠️ 消息对象为空');
      return false;
    }

    if (!messageObj.text || messageObj.text.trim().length === 0) {
      console.warn('⚠️ 消息文本为空');
      return false;
    }

    return true;
  }

  /**
   * 获取消息统计信息
   * @param {Object} messageObj - 消息对象
   * @returns {Object} 统计信息
   */
  getMessageStats(messageObj) {
    return {
      textLength: messageObj.text?.length || 0,
      attachmentCount: messageObj.attachments?.length || 0,
      totalSize: (messageObj.attachments || []).reduce((sum, att) => sum + (att.size || 0), 0),
      hasImages: (messageObj.attachments || []).some(att => att.type === 'image'),
      hasDocuments: (messageObj.attachments || []).some(att => att.type === 'document'),
      hasCode: (messageObj.attachments || []).some(att => att.type === 'code')
    };
  }
}

// 暴露给全局作用域
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MessageBuilder;
}

