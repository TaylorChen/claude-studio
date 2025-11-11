/**
 * AttachmentProcessor - 处理和转换附件
 * 
 * 职责:
 * 1. 读取附件文件内容
 * 2. 转换为 Base64 (如果需要)
 * 3. 提取文件元数据
 * 4. 验证文件大小和类型
 */

class AttachmentProcessor {
  constructor() {
    this.maxFileSize = 100 * 1024 * 1024; // 100MB
    this.supportedTypes = {
      image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
      document: ['.txt', '.md', '.pdf', '.json', '.xml', '.csv', '.html'],
      code: ['.js', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.rb', '.ts', '.jsx']
    };
  }

  /**
   * 处理单个附件
   * @param {Object} attachment - 附件对象
   * @returns {Promise<Object>} 处理后的附件信息
   */
  async processAttachment(attachment) {

    try {
      // 验证文件
      const validation = this.validateAttachment(attachment);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // 获取文件元数据
      const metadata = {
        id: attachment.id,
        name: attachment.name,
        path: attachment.path,
        size: attachment.size,
        type: this.getAttachmentType(attachment.name),
        extension: this.getFileExtension(attachment.name),
        formattedSize: this.formatFileSize(attachment.size),
        processedAt: new Date().toISOString()
      };

      console.log('✓ 附件处理完成:', metadata);
      return { success: true, data: metadata };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 批量处理多个附件
   * @param {Array} attachments - 附件数组
   * @returns {Promise<Object>} {successful: [], failed: []}
   */
  async processMultiple(attachments) {

    const results = {
      successful: [],
      failed: []
    };

    for (const attachment of attachments) {
      const result = await this.processAttachment(attachment);
      if (result.success) {
        results.successful.push(result.data);
      } else {
        results.failed.push({
          name: attachment.name,
          error: result.error
        });
      }
    }

    console.log(`✓ 处理完成: ${results.successful.length} 成功, ${results.failed.length} 失败`);
    return results;
  }

  /**
   * 验证附件
   * @param {Object} attachment - 附件对象
   * @returns {Object} {valid: boolean, error?: string}
   */
  validateAttachment(attachment) {
    // 检查必要字段
    if (!attachment.name || !attachment.path) {
      return { valid: false, error: '附件信息不完整' };
    }

    // 检查文件大小
    if (attachment.size > this.maxFileSize) {
      return { 
        valid: false, 
        error: `文件过大 (${this.formatFileSize(attachment.size)})，最大限制 ${this.formatFileSize(this.maxFileSize)}` 
      };
    }

    // 检查文件类型
    const ext = this.getFileExtension(attachment.name);
    if (!this.isSupportedType(ext)) {
      return { 
        valid: false, 
        error: `不支持的文件类型: ${ext}` 
      };
    }

    return { valid: true };
  }

  /**
   * 获取文件扩展名
   * @param {string} fileName - 文件名
   * @returns {string} 扩展名
   */
  getFileExtension(fileName) {
    if (!fileName) return '';
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot === -1) return '';
    return fileName.substring(lastDot).toLowerCase();
  }

  /**
   * 获取附件类型
   * @param {string} fileName - 文件名
   * @returns {string} 类型 (image|document|code|unknown)
   */
  getAttachmentType(fileName) {
    const ext = this.getFileExtension(fileName);
    
    for (const [type, extensions] of Object.entries(this.supportedTypes)) {
      if (extensions.includes(ext)) {
        return type;
      }
    }
    
    return 'unknown';
  }

  /**
   * 检查是否支持的文件类型
   * @param {string} ext - 文件扩展名
   * @returns {boolean}
   */
  isSupportedType(ext) {
    for (const extensions of Object.values(this.supportedTypes)) {
      if (extensions.includes(ext)) {
        return true;
      }
    }
    return false;
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
   * 获取所有支持的文件类型列表
   * @returns {Array<string>} 扩展名列表
   */
  getSupportedExtensions() {
    const all = [];
    for (const extensions of Object.values(this.supportedTypes)) {
      all.push(...extensions);
    }
    return [...new Set(all)];
  }

  /**
   * 获取支持的文件类型描述
   * @returns {Object} 类型描述
   */
  getSupportedTypesDescription() {
    return {
      image: {
        extensions: this.supportedTypes.image,
        description: '图像文件 (JPG, PNG, GIF, WebP 等)'
      },
      document: {
        extensions: this.supportedTypes.document,
        description: '文档文件 (TXT, MD, PDF, JSON 等)'
      },
      code: {
        extensions: this.supportedTypes.code,
        description: '代码文件 (JavaScript, Python, Java 等)'
      }
    };
  }

  /**
   * 检查附件是否为图像
   * @param {Object} attachment - 附件对象
   * @returns {boolean}
   */
  isImage(attachment) {
    const ext = this.getFileExtension(attachment.name);
    return this.supportedTypes.image.includes(ext);
  }

  /**
   * 检查附件是否为文档
   * @param {Object} attachment - 附件对象
   * @returns {boolean}
   */
  isDocument(attachment) {
    const ext = this.getFileExtension(attachment.name);
    return this.supportedTypes.document.includes(ext);
  }

  /**
   * 检查附件是否为代码
   * @param {Object} attachment - 附件对象
   * @returns {boolean}
   */
  isCode(attachment) {
    const ext = this.getFileExtension(attachment.name);
    return this.supportedTypes.code.includes(ext);
  }
}

// 暴露给全局作用域
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AttachmentProcessor;
}

