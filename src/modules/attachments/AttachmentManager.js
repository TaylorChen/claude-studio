/**
 * 附件管理器 - 处理文件和图片附件
 * 支持验证、预览、管理和发送附件
 */

class AttachmentManager {
    constructor() {
        this.attachments = [];  // 附件列表
        this.maxFileSize = 100 * 1024 * 1024;  // 100 MB
        this.supportedImageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        this.supportedTextTypes = [
            'text/plain', 'text/markdown', 'text/html', 'text/css',
            'text/javascript', 'application/json', 'application/xml',
            'text/x-python', 'text/x-java', 'text/x-cpp', 'text/x-sql'
        ];
        
        // 项目根目录（Claude CLI 的工作目录）
        this.projectRoot = '/Users/ahyk/python/claude-studio';
        
        console.log('✓ AttachmentManager 已初始化');
        console.log(`📂 项目根目录: ${this.projectRoot}`);
    }

    /**
     * 添加附件
     * @param {File} file - 文件对象
     * @param {string} filePath - 文件系统路径（来自 Electron 对话框）
     * @returns {Promise<Object|null>} 附件对象或 null
     */
    async addAttachment(file, filePath = null) {
        try {
            console.log('📎 开始添加附件:', file.name);

            // 验证文件
            const validation = this.validateFile(file);
            if (!validation.valid) {
                console.error('❌ 文件验证失败:', validation.error);
                alert(`❌ 文件验证失败: ${validation.error}`);
                return null;
            }

            // 生成附件对象
            const attachment = {
                id: this.generateAttachmentId(),
                type: this.getAttachmentType(file.type),
                name: file.name,
                size: file.size,
                mimeType: file.type,
                path: filePath || file.path || '',  // 优先使用传入的路径，其次 File.path，最后空字符串
                preview: null,  // 预览数据 (图片为 base64)
                file: file,  // 文件对象
                addedAt: Date.now()
            };

            console.log(`📝 附件路径: ${attachment.path}`);

            // 生成预览 (如果是图片)
            if (attachment.type === 'image') {
                attachment.preview = await this.generateImagePreview(file);
            }

            // 添加到列表
            this.attachments.push(attachment);
            console.log(`✅ 附件添加成功 (${this.attachments.length} 个)`);

            return attachment;
        } catch (error) {
            console.error('❌ 添加附件失败:', error);
            return null;
        }
    }

    /**
     * 删除附件
     * @param {string} attachmentId - 附件 ID
     * @returns {boolean} 是否成功删除
     */
    removeAttachment(attachmentId) {
        const index = this.attachments.findIndex(att => att.id === attachmentId);
        if (index !== -1) {
            const removed = this.attachments.splice(index, 1)[0];
            console.log(`✅ 附件已删除: ${removed.name}`);
            return true;
        }
        console.warn(`⚠️ 未找到附件: ${attachmentId}`);
        return false;
    }

    /**
     * 验证文件
     * @param {File} file - 文件对象
     * @returns {Object} { valid: boolean, error?: string }
     */
    validateFile(file) {
        // 检查文件是否为空
        if (!file) {
            return { valid: false, error: '文件为空' };
        }

        // 检查文件大小
        if (file.size > this.maxFileSize) {
            const maxSizeMB = this.maxFileSize / (1024 * 1024);
            return { valid: false, error: `文件过大 (最大 ${maxSizeMB} MB)` };
        }

        // 检查文件名
        if (!file.name || file.name.trim() === '') {
            return { valid: false, error: '文件名无效' };
        }

        // 检查 MIME 类型
        const isImage = this.supportedImageTypes.includes(file.type);
        const isText = this.supportedTextTypes.includes(file.type);
        const isGeneral = file.type === '' || file.type.startsWith('application/');

        if (!isImage && !isText && !isGeneral) {
            console.warn(`⚠️ 不寻常的 MIME 类型: ${file.type}`);
        }

        // 检查重复附件
        if (this.isDuplicateAttachment(file.name)) {
            return { valid: false, error: '该文件已添加过' };
        }

        return { valid: true };
    }

    /**
     * 检查是否为重复附件
     * @param {string} fileName - 文件名
     * @returns {boolean}
     */
    isDuplicateAttachment(fileName) {
        return this.attachments.some(att => att.name === fileName);
    }

    /**
     * 生成图片预览 (Base64)
     * @param {File} file - 图片文件
     * @returns {Promise<string>} Base64 预览数据
     */
    async generateImagePreview(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                console.log(`✅ 图片预览已生成: ${file.name}`);
                resolve(e.target.result);  // Base64 字符串
            };
            reader.onerror = (error) => {
                console.error('❌ 生成预览失败:', error);
                resolve(null);  // 返回 null，继续处理
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * 获取附件类型
     * @param {string} mimeType - MIME 类型
     * @returns {string} 'image' | 'text' | 'file'
     */
    getAttachmentType(mimeType) {
        if (this.supportedImageTypes.includes(mimeType)) {
            return 'image';
        }
        if (this.supportedTextTypes.includes(mimeType) || mimeType === '') {
            return 'text';
        }
        return 'file';
    }

    /**
     * 生成附件 ID
     * @returns {string}
     */
    generateAttachmentId() {
        return `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 通过 Electron 文件对话框添加附件
     * @param {string} filterType - 文件类型过滤器 ('all'|'image'|'document'|'code')
     * @returns {Promise<Array>} 添加的附件对象数组
     */
    async addAttachmentFromDialog(filterType = 'all') {
        try {
            // 使用 Electron API 打开文件对话框
            if (!window.electronAPI || !window.electronAPI.selectAttachmentFiles) {
                console.error('❌ Electron API 不可用');
                alert('❌ 文件对话框功能不可用');
                return [];
            }

            console.log('📂 打开文件对话框...');
            const result = await window.electronAPI.selectAttachmentFiles(filterType);

            if (!result.success) {
                if (result.canceled) {
                    console.log('⚠️ 用户取消了文件选择');
                } else {
                    console.error('❌ 文件对话框错误:', result.error);
                    alert(`❌ 文件对话框错误: ${result.error}`);
                }
                return [];
            }

            // 处理选中的文件
            const addedAttachments = [];
            for (const filePath of result.filePaths) {
                // 从路径提取文件名和 MIME 类型
                const fileName = filePath.split('/').pop() || filePath.split('\\').pop();
                const mimeType = this.getMimeType(fileName);

                // 创建虚拟 File 对象
                const fakeFile = {
                    name: fileName,
                    size: 0,  // 我们不能直接获取大小，稍后可以通过 IPC 获取
                    type: mimeType,
                    path: filePath
                };

                // 添加附件
                const attachment = await this.addAttachment(fakeFile, filePath);
                if (attachment) {
                    addedAttachments.push(attachment);
                }
            }

            console.log(`✅ 成功添加 ${addedAttachments.length} 个附件`);
            return addedAttachments;
        } catch (error) {
            console.error('❌ 添加附件失败:', error);
            alert(`❌ 添加附件失败: ${error.message}`);
            return [];
        }
    }

    /**
     * 根据文件名获取 MIME 类型
     * @param {string} fileName - 文件名
     * @returns {string} MIME 类型
     */
    getMimeType(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const mimeTypes = {
            // 图片
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'svg': 'image/svg+xml',
            // 文档
            'txt': 'text/plain',
            'md': 'text/markdown',
            'pdf': 'application/pdf',
            'json': 'application/json',
            'xml': 'application/xml',
            'csv': 'text/csv',
            'html': 'text/html',
            // 代码
            'js': 'text/javascript',
            'py': 'text/x-python',
            'java': 'text/x-java',
            'cpp': 'text/x-cpp',
            'c': 'text/x-c',
            'go': 'text/x-golang',
            'rs': 'text/x-rust',
            'rb': 'text/x-ruby',
            'ts': 'text/typescript',
            'jsx': 'text/jsx',
            'tsx': 'text/tsx'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * 检查路径是否可被 Claude CLI 访问
     * Claude CLI 只能访问其工作目录及以下的文件
     * @param {string} filePath - 文件路径
     * @returns {boolean}
     */
    isPathAccessible(filePath) {
        if (!filePath) return false;
        
        // 检查是否是相对路径 (总是可访问)
        if (filePath.startsWith('./') || filePath.startsWith('../')) {
            return true;
        }
        
        // 检查是否在项目根目录中
        if (filePath.startsWith(this.projectRoot)) {
            return true;
        }
        
        return false;
    }

    /**
     * 将不可访问的路径转换为相对路径
     * @param {string} filePath - 文件系统路径
     * @returns {string} 相对路径
     */
    getRelativePath(filePath) {
        if (!filePath) return '';
        
        // 如果已经是相对路径
        if (filePath.startsWith('./') || filePath.startsWith('../')) {
            return filePath;
        }
        
        // 如果在项目目录中，转换为相对路径
        if (filePath.startsWith(this.projectRoot)) {
            const relative = filePath.substring(this.projectRoot.length);
            return './' + (relative.startsWith('/') ? relative.substring(1) : relative);
        }
        
        // 对于其他路径，尝试从文件名开始
        const fileName = filePath.split('/').pop();
        return './' + fileName;
    }

    /**
     * 获取可访问的文件路径 (用于发送给 Claude)
     * 优先选择能让 Claude 访问的路径格式
     * @param {string} filePath - 文件路径
     * @returns {string} 可访问的路径
     */
    getAccessiblePath(filePath) {
        if (!filePath) return '';
        
        console.log(`🔍 检查路径访问性: ${filePath}`);
        
        // 如果已经可访问，直接返回
        if (this.isPathAccessible(filePath)) {
            console.log(`✅ 路径可访问: ${filePath}`);
            return filePath;
        }
        
        // 否则转换为相对路径
        const relativePath = this.getRelativePath(filePath);
        console.log(`⚠️ 路径需要转换: ${filePath} → ${relativePath}`);
        
        return relativePath;
    }

    /**
     * 获取所有附件
     * @returns {Array}
     */
    getAttachments() {
        return this.attachments;
    }

    /**
     * 获取附件数量
     * @returns {number}
     */
    getAttachmentCount() {
        return this.attachments.length;
    }

    /**
     * 清空所有附件
     */
    clearAttachments() {
        const count = this.attachments.length;
        this.attachments = [];
        console.log(`✅ 已清空 ${count} 个附件`);
    }

    /**
     * 获取附件信息
     * @param {string} attachmentId - 附件 ID
     * @returns {Object|null}
     */
    getAttachmentInfo(attachmentId) {
        return this.attachments.find(att => att.id === attachmentId) || null;
    }

    /**
     * 获取总附件大小
     * @returns {number} 字节数
     */
    getTotalSize() {
        return this.attachments.reduce((total, att) => total + att.size, 0);
    }

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化的大小
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    }

    /**
     * 获取文件图标
     * @param {string} mimeType - MIME 类型
     * @returns {string} 图标 emoji
     */
    static getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.includes('pdf')) return '📕';
        if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
        if (mimeType.includes('video/')) return '🎬';
        if (mimeType.includes('audio/')) return '🎵';
        if (mimeType.includes('json')) return '📋';
        if (mimeType.includes('javascript') || mimeType.includes('text/x')) return '📝';
        return '📄';
    }

    /**
     * 获取附件摘要信息
     * @returns {Object}
     */
    getSummary() {
        return {
            count: this.attachments.length,
            totalSize: this.getTotalSize(),
            totalSizeFormatted: AttachmentManager.formatFileSize(this.getTotalSize()),
            types: {
                images: this.attachments.filter(a => a.type === 'image').length,
                texts: this.attachments.filter(a => a.type === 'text').length,
                files: this.attachments.filter(a => a.type === 'file').length
            }
        };
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AttachmentManager;
}

