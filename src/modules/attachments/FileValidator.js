/**
 * 文件验证器 - 提供详细的文件验证和安全检查
 */

class FileValidator {
    constructor(options = {}) {
        // 文件大小限制
        this.maxFileSize = options.maxFileSize || 100 * 1024 * 1024;  // 100 MB
        this.maxImageSize = options.maxImageSize || 50 * 1024 * 1024;  // 50 MB
        
        // 支持的文件类型
        this.allowedMimeTypes = {
            image: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
            text: [
                'text/plain', 'text/markdown', 'text/html', 'text/css', 'text/xml',
                'text/javascript', 'text/x-python', 'text/x-java', 'text/x-cpp',
                'application/json', 'application/xml', 'application/sql'
            ],
            document: [
                'application/pdf', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ],
            archive: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed']
        };

        // 不允许的扩展名
        this.blockedExtensions = [
            '.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.js',
            '.jar', '.app', '.deb', '.dmg', '.rpm'
        ];

        console.log('✓ FileValidator 已初始化');
    }

    /**
     * 完整验证
     * @param {File} file - 文件对象
     * @returns {Object} { valid: boolean, errors: [], warnings: [] }
     */
    validate(file) {
        const errors = [];
        const warnings = [];

        // 基础检查
        if (!file) {
            errors.push('文件不存在');
            return { valid: false, errors, warnings };
        }

        // 检查文件名
        if (!file.name || file.name.trim() === '') {
            errors.push('文件名无效');
        }

        // 检查大小
        const sizeCheck = this.validateSize(file);
        if (!sizeCheck.valid) {
            errors.push(sizeCheck.error);
        }

        // 检查扩展名
        const extCheck = this.validateExtension(file.name);
        if (!extCheck.valid) {
            errors.push(extCheck.error);
        }

        // 检查 MIME 类型
        const mimeCheck = this.validateMimeType(file.type);
        if (!mimeCheck.valid) {
            warnings.push(mimeCheck.warning);
        }

        // 检查文件内容 (如果是文本文件)
        if (file.type.startsWith('text/') || file.type === '') {
            const contentWarnings = this.checkTextFileContent(file.name);
            warnings.push(...contentWarnings);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 验证文件大小
     * @param {File} file - 文件对象
     * @returns {Object} { valid: boolean, error?: string }
     */
    validateSize(file) {
        // 特殊处理图片大小
        if (file.type.startsWith('image/')) {
            if (file.size > this.maxImageSize) {
                const maxMB = this.maxImageSize / (1024 * 1024);
                return { 
                    valid: false, 
                    error: `图片过大 (最大 ${maxMB} MB)` 
                };
            }
        } else {
            if (file.size > this.maxFileSize) {
                const maxMB = this.maxFileSize / (1024 * 1024);
                return { 
                    valid: false, 
                    error: `文件过大 (最大 ${maxMB} MB)` 
                };
            }
        }

        return { valid: true };
    }

    /**
     * 验证文件扩展名
     * @param {string} fileName - 文件名
     * @returns {Object} { valid: boolean, error?: string }
     */
    validateExtension(fileName) {
        const ext = '.' + fileName.split('.').pop().toLowerCase();

        // 检查黑名单
        if (this.blockedExtensions.includes(ext)) {
            return { 
                valid: false, 
                error: `不支持的文件类型: ${ext}` 
            };
        }

        return { valid: true };
    }

    /**
     * 验证 MIME 类型
     * @param {string} mimeType - MIME 类型
     * @returns {Object} { valid: boolean, warning?: string }
     */
    validateMimeType(mimeType) {
        if (!mimeType) {
            return { 
                valid: false, 
                warning: '无法识别文件类型，将作为普通文件处理' 
            };
        }

        // 检查是否在允许列表中
        const allAllowed = Object.values(this.allowedMimeTypes).flat();
        if (!allAllowed.includes(mimeType) && !mimeType.startsWith('text/')) {
            return { 
                valid: false, 
                warning: `不常见的文件类型: ${mimeType}` 
            };
        }

        return { valid: true };
    }

    /**
     * 检查文本文件内容警告
     * @param {string} fileName - 文件名
     * @returns {Array} 警告信息数组
     */
    checkTextFileContent(fileName) {
        const warnings = [];
        const upperName = fileName.toUpperCase();

        // 检查可疑的文件名模式
        if (upperName.includes('PASSWORD') || upperName.includes('SECRET') || upperName.includes('API_KEY')) {
            warnings.push('⚠️ 警告: 文件可能包含敏感信息 (密码、密钥等)');
        }

        if (upperName.includes('CONFIG') && !upperName.includes('README')) {
            warnings.push('💡 提示: 配置文件将被分享给 AI');
        }

        return warnings;
    }

    /**
     * 获取 MIME 类型分类
     * @param {string} mimeType - MIME 类型
     * @returns {string} 分类: 'image' | 'text' | 'document' | 'archive' | 'unknown'
     */
    getMimeTypeCategory(mimeType) {
        for (const [category, types] of Object.entries(this.allowedMimeTypes)) {
            if (types.includes(mimeType)) {
                return category;
            }
        }
        
        // 根据前缀进行分类
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('text/')) return 'text';
        if (mimeType.startsWith('application/')) return 'document';
        
        return 'unknown';
    }

    /**
     * 检查是否为安全的图片格式
     * @param {string} mimeType - MIME 类型
     * @returns {boolean}
     */
    isSafeImageFormat(mimeType) {
        const safeFormats = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        return safeFormats.includes(mimeType);
    }

    /**
     * 检查文件是否可以直接读取为文本
     * @param {string} mimeType - MIME 类型
     * @returns {boolean}
     */
    canReadAsText(mimeType) {
        return this.allowedMimeTypes.text.includes(mimeType) || 
               mimeType.startsWith('text/') || 
               mimeType === '';
    }

    /**
     * 获取文件类型描述
     * @param {string} mimeType - MIME 类型
     * @returns {string}
     */
    getFileTypeDescription(mimeType) {
        const descriptions = {
            'image/png': 'PNG 图片',
            'image/jpeg': 'JPEG 图片',
            'image/gif': 'GIF 图片',
            'image/webp': 'WebP 图片',
            'text/plain': '文本文件',
            'text/markdown': 'Markdown 文件',
            'text/html': 'HTML 文件',
            'text/css': 'CSS 文件',
            'text/javascript': 'JavaScript 文件',
            'text/x-python': 'Python 文件',
            'application/json': 'JSON 文件',
            'application/pdf': 'PDF 文档'
        };

        return descriptions[mimeType] || 'Unknown';
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileValidator;
}

