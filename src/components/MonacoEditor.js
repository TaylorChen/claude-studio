/**
 * Monaco Editor 组件封装
 * 提供专业的代码编辑体验
 */

class MonacoEditorComponent {
    constructor(containerId) {
        this.containerId = containerId;
        this.editor = null;
        this.currentModel = null;
        this.models = new Map(); // 存储打开的文件模型
        this.decorations = [];
    }

    /**
     * 初始化Monaco编辑器
     */
    async init() {
        try {
            // 确保Monaco已加载
            if (!window.monaco) {
                await this.loadMonaco();
            }

            const container = document.getElementById(this.containerId);
            if (!container) {
                throw new Error(`Container ${this.containerId} not found`);
            }

            // 创建编辑器实例
            this.editor = monaco.editor.create(container, {
                value: '',
                language: 'javascript',
                theme: 'vs-dark',
                fontSize: 14,
                fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                lineNumbers: 'on',
                roundedSelection: true,
                scrollBeyondLastLine: false,
                readOnly: false,
                minimap: {
                    enabled: true
                },
                automaticLayout: true,
                tabSize: 4,
                insertSpaces: true,
                wordWrap: 'on',
                folding: true,
                renderWhitespace: 'selection',
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: true,
                smoothScrolling: true,
                formatOnPaste: true,
                formatOnType: true,
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                snippetSuggestions: 'top',
                renderLineHighlight: 'all',
                scrollbar: {
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10
                }
            });

            // 绑定事件
            this.bindEvents();

            return this.editor;
        } catch (error) {
            console.error('❌ Monaco Editor 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 加载Monaco编辑器库
     */
    async loadMonaco() {
        return new Promise((resolve, reject) => {
            if (window.monaco) {
                resolve(window.monaco);
                return;
            }

            require.config({ 
                paths: { 
                    'vs': './node_modules/monaco-editor/min/vs' 
                }
            });

            require(['vs/editor/editor.main'], function() {
                resolve(window.monaco);
            }, reject);
        });
    }

    /**
     * 绑定编辑器事件
     */
    bindEvents() {
        // 内容改变事件
        this.editor.onDidChangeModelContent((e) => {
            this.onContentChange && this.onContentChange(e);
        });

        // 光标位置改变事件
        this.editor.onDidChangeCursorPosition((e) => {
            this.onCursorPositionChange && this.onCursorPositionChange(e);
        });

        // 焦点改变事件
        this.editor.onDidFocusEditorText(() => {
            this.onFocus && this.onFocus();
        });

        this.editor.onDidBlurEditorText(() => {
            this.onBlur && this.onBlur();
        });
    }

    /**
     * 打开文件
     */
    openFile(filePath, content, language) {
        try {
            // 检查是否已有该文件的模型
            let model = this.models.get(filePath);

            if (!model) {
                // 创建新模型
                const uri = monaco.Uri.file(filePath);
                model = monaco.editor.createModel(content, language, uri);
                this.models.set(filePath, model);
            } else {
                // 更新现有模型的内容
                model.setValue(content);
            }

            // 设置当前模型
            this.editor.setModel(model);
            this.currentModel = model;

            // 设置语言
            if (language) {
                monaco.editor.setModelLanguage(model, language);
            }

        } catch (error) {
            console.error('打开文件失败:', error);
        }
    }

    /**
     * 获取当前内容
     */
    getValue() {
        return this.editor ? this.editor.getValue() : '';
    }

    /**
     * 设置内容
     */
    setValue(value) {
        if (this.editor) {
            this.editor.setValue(value);
        }
    }

    /**
     * 获取选中的文本
     */
    getSelectedText() {
        if (!this.editor) return '';
        const selection = this.editor.getSelection();
        return this.editor.getModel().getValueInRange(selection);
    }

    /**
     * 插入文本
     */
    insertText(text) {
        if (!this.editor) return;
        const selection = this.editor.getSelection();
        const id = { major: 1, minor: 1 };
        const op = {
            identifier: id,
            range: selection,
            text: text,
            forceMoveMarkers: true
        };
        this.editor.executeEdits('insert-text', [op]);
    }

    /**
     * 格式化代码
     */
    async formatDocument() {
        if (!this.editor) return;
        await this.editor.getAction('editor.action.formatDocument').run();
    }

    /**
     * 查找文本
     */
    find(text, options = {}) {
        if (!this.editor) return;
        this.editor.trigger('find', 'actions.find', {
            searchString: text,
            ...options
        });
    }

    /**
     * 替换文本
     */
    replace(searchText, replaceText, options = {}) {
        if (!this.editor) return;
        this.editor.trigger('replace', 'editor.action.startFindReplaceAction', {
            searchString: searchText,
            replaceString: replaceText,
            ...options
        });
    }

    /**
     * 跳转到指定行
     */
    gotoLine(lineNumber) {
        if (!this.editor) return;
        this.editor.revealLineInCenter(lineNumber);
        this.editor.setPosition({ lineNumber, column: 1 });
    }

    /**
     * 设置只读模式
     */
    setReadOnly(readonly) {
        if (this.editor) {
            this.editor.updateOptions({ readOnly: readonly });
        }
    }

    /**
     * 设置主题
     */
    setTheme(theme) {
        monaco.editor.setTheme(theme);
    }

    /**
     * 添加装饰（高亮、下划线等）
     */
    addDecorations(decorations) {
        if (!this.editor) return;
        this.decorations = this.editor.deltaDecorations(this.decorations, decorations);
    }

    /**
     * 清除所有装饰
     */
    clearDecorations() {
        if (!this.editor) return;
        this.decorations = this.editor.deltaDecorations(this.decorations, []);
    }

    /**
     * 获取光标位置
     */
    getCursorPosition() {
        if (!this.editor) return null;
        return this.editor.getPosition();
    }

    /**
     * 设置光标位置
     */
    setCursorPosition(lineNumber, column) {
        if (!this.editor) return;
        this.editor.setPosition({ lineNumber, column });
    }

    /**
     * 获取语言
     */
    getLanguage() {
        if (!this.editor || !this.currentModel) return null;
        return this.currentModel.getLanguageId();
    }

    /**
     * 设置语言
     */
    setLanguage(language) {
        if (!this.editor || !this.currentModel) return;
        monaco.editor.setModelLanguage(this.currentModel, language);
    }

    /**
     * 销毁编辑器
     */
    dispose() {
        if (this.editor) {
            // 销毁所有模型
            this.models.forEach(model => model.dispose());
            this.models.clear();
            
            // 销毁编辑器实例
            this.editor.dispose();
            this.editor = null;
        }
    }

    /**
     * 根据文件扩展名获取语言
     */
    static getLanguageFromExtension(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'json': 'json',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'less': 'less',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'sql': 'sql',
            'md': 'markdown',
            'xml': 'xml',
            'yml': 'yaml',
            'yaml': 'yaml',
            'sh': 'shell',
            'bash': 'shell',
            'ps1': 'powershell',
            'r': 'r',
            'swift': 'swift',
            'kt': 'kotlin',
            'vue': 'html'
        };
        return languageMap[ext] || 'plaintext';
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonacoEditorComponent;
}


