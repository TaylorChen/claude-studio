/**
 * 设置和配置管理组件
 * 提供用户自定义配置功能
 */

class SettingsComponent {
    constructor() {
        this.settings = this.loadSettings();
        this.defaultSettings = {
            // 编辑器设置
            editor: {
                fontSize: 14,
                fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                tabSize: 4,
                insertSpaces: true,
                wordWrap: 'on',
                lineNumbers: true,
                minimap: true,
                formatOnSave: true,
                formatOnPaste: true
            },
            // 主题设置
            theme: {
                colorTheme: 'vs-dark',
                iconTheme: 'default'
            },
            // 终端设置
            terminal: {
                fontFamily: "'Consolas', 'Monaco', monospace",
                fontSize: 13,
                shell: 'default'
            },
            // AI设置
            ai: {
                model: 'claude-3-sonnet',
                temperature: 0.7,
                maxTokens: 4000,
                streamResponse: true
            },
            // Git设置
            git: {
                autoFetch: true,
                autoRefresh: true,
                defaultRemote: 'origin'
            },
            // 文件设置
            files: {
                autoSave: false,
                autoSaveDelay: 1000,
                exclude: ['node_modules', '.git', 'dist', 'build']
            },
            // 搜索设置
            search: {
                caseSensitive: false,
                wholeWord: false,
                useRegex: false
            }
        };
    }

    /**
     * 加载设置
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('claudeStudioSettings');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        }
        return this.defaultSettings;
    }

    /**
     * 保存设置
     */
    saveSettings() {
        try {
            localStorage.setItem('claudeStudioSettings', JSON.stringify(this.settings));
            return true;
        } catch (error) {
            console.error('保存设置失败:', error);
            return false;
        }
    }

    /**
     * 获取设置值
     */
    get(key) {
        const keys = key.split('.');
        let value = this.settings;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // 返回默认值
                value = this.defaultSettings;
                for (const dk of keys) {
                    if (value && typeof value === 'object' && dk in value) {
                        value = value[dk];
                    } else {
                        return null;
                    }
                }
                return value;
            }
        }
        
        return value;
    }

    /**
     * 设置值
     */
    set(key, value) {
        const keys = key.split('.');
        let current = this.settings;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in current) || typeof current[k] !== 'object') {
                current[k] = {};
            }
            current = current[k];
        }
        
        current[keys[keys.length - 1]] = value;
        this.saveSettings();
        
        // 触发设置更改事件
        this.onSettingChanged && this.onSettingChanged(key, value);
    }

    /**
     * 重置设置
     */
    reset(key = null) {
        if (key) {
            // 重置特定设置
            this.set(key, this.get(key));
        } else {
            // 重置所有设置
            this.settings = { ...this.defaultSettings };
            this.saveSettings();
        }
    }

    /**
     * 渲染设置界面
     */
    renderSettingsPanel(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const html = `
            <div class="settings-panel">
                <div class="settings-header">
                    <h2>设置</h2>
                    <button class="settings-btn" onclick="settingsComponent.resetAll()">
                        重置所有
                    </button>
                </div>

                <div class="settings-content">
                    <!-- 编辑器设置 -->
                    <div class="settings-section">
                        <h3>编辑器</h3>
                        ${this.renderEditorSettings()}
                    </div>

                    <!-- 主题设置 -->
                    <div class="settings-section">
                        <h3>主题</h3>
                        ${this.renderThemeSettings()}
                    </div>

                    <!-- 终端设置 -->
                    <div class="settings-section">
                        <h3>终端</h3>
                        ${this.renderTerminalSettings()}
                    </div>

                    <!-- AI设置 -->
                    <div class="settings-section">
                        <h3>AI 助手</h3>
                        ${this.renderAISettings()}
                    </div>

                    <!-- Git设置 -->
                    <div class="settings-section">
                        <h3>Git</h3>
                        ${this.renderGitSettings()}
                    </div>

                    <!-- 文件设置 -->
                    <div class="settings-section">
                        <h3>文件</h3>
                        ${this.renderFileSettings()}
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.bindSettingEvents();
    }

    /**
     * 渲染编辑器设置
     */
    renderEditorSettings() {
        return `
            <div class="setting-item">
                <label>字体大小</label>
                <input type="number" 
                       id="editor-fontSize" 
                       value="${this.get('editor.fontSize')}" 
                       min="10" max="30" />
            </div>
            <div class="setting-item">
                <label>Tab 大小</label>
                <input type="number" 
                       id="editor-tabSize" 
                       value="${this.get('editor.tabSize')}" 
                       min="2" max="8" />
            </div>
            <div class="setting-item">
                <label>
                    <input type="checkbox" 
                           id="editor-wordWrap" 
                           ${this.get('editor.wordWrap') === 'on' ? 'checked' : ''} />
                    自动换行
                </label>
            </div>
            <div class="setting-item">
                <label>
                    <input type="checkbox" 
                           id="editor-minimap" 
                           ${this.get('editor.minimap') ? 'checked' : ''} />
                    显示代码地图
                </label>
            </div>
            <div class="setting-item">
                <label>
                    <input type="checkbox" 
                           id="editor-formatOnSave" 
                           ${this.get('editor.formatOnSave') ? 'checked' : ''} />
                    保存时格式化
                </label>
            </div>
        `;
    }

    /**
     * 渲染主题设置
     */
    renderThemeSettings() {
        return `
            <div class="setting-item">
                <label>颜色主题</label>
                <select id="theme-colorTheme">
                    <option value="vs-dark" ${this.get('theme.colorTheme') === 'vs-dark' ? 'selected' : ''}>暗色</option>
                    <option value="vs-light" ${this.get('theme.colorTheme') === 'vs-light' ? 'selected' : ''}>亮色</option>
                    <option value="hc-black" ${this.get('theme.colorTheme') === 'hc-black' ? 'selected' : ''}>高对比度</option>
                </select>
            </div>
        `;
    }

    /**
     * 渲染终端设置
     */
    renderTerminalSettings() {
        return `
            <div class="setting-item">
                <label>字体大小</label>
                <input type="number" 
                       id="terminal-fontSize" 
                       value="${this.get('terminal.fontSize')}" 
                       min="10" max="24" />
            </div>
        `;
    }

    /**
     * 渲染AI设置
     */
    renderAISettings() {
        return `
            <div class="setting-item">
                <label>模型</label>
                <select id="ai-model">
                    <option value="claude-3-opus" ${this.get('ai.model') === 'claude-3-opus' ? 'selected' : ''}>Claude 3 Opus</option>
                    <option value="claude-3-sonnet" ${this.get('ai.model') === 'claude-3-sonnet' ? 'selected' : ''}>Claude 3 Sonnet</option>
                    <option value="claude-3-haiku" ${this.get('ai.model') === 'claude-3-haiku' ? 'selected' : ''}>Claude 3 Haiku</option>
                </select>
            </div>
            <div class="setting-item">
                <label>温度 (创造性)</label>
                <input type="range" 
                       id="ai-temperature" 
                       value="${this.get('ai.temperature')}" 
                       min="0" max="1" step="0.1" />
                <span id="temperature-value">${this.get('ai.temperature')}</span>
            </div>
            <div class="setting-item">
                <label>
                    <input type="checkbox" 
                           id="ai-streamResponse" 
                           ${this.get('ai.streamResponse') ? 'checked' : ''} />
                    流式响应
                </label>
            </div>
        `;
    }

    /**
     * 渲染Git设置
     */
    renderGitSettings() {
        return `
            <div class="setting-item">
                <label>
                    <input type="checkbox" 
                           id="git-autoFetch" 
                           ${this.get('git.autoFetch') ? 'checked' : ''} />
                    自动获取
                </label>
            </div>
            <div class="setting-item">
                <label>
                    <input type="checkbox" 
                           id="git-autoRefresh" 
                           ${this.get('git.autoRefresh') ? 'checked' : ''} />
                    自动刷新状态
                </label>
            </div>
        `;
    }

    /**
     * 渲染文件设置
     */
    renderFileSettings() {
        return `
            <div class="setting-item">
                <label>
                    <input type="checkbox" 
                           id="files-autoSave" 
                           ${this.get('files.autoSave') ? 'checked' : ''} />
                    自动保存
                </label>
            </div>
            <div class="setting-item">
                <label>自动保存延迟 (ms)</label>
                <input type="number" 
                       id="files-autoSaveDelay" 
                       value="${this.get('files.autoSaveDelay')}" 
                       min="500" max="5000" step="100" />
            </div>
        `;
    }

    /**
     * 绑定设置事件
     */
    bindSettingEvents() {
        // 绑定所有输入元素的change事件
        const inputs = document.querySelectorAll('.settings-panel input, .settings-panel select');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                const id = input.id;
                const [section, key] = id.split('-');
                let value;

                if (input.type === 'checkbox') {
                    value = input.checked;
                } else if (input.type === 'number' || input.type === 'range') {
                    value = parseFloat(input.value);
                } else {
                    value = input.value;
                }

                // 特殊处理
                if (id === 'editor-wordWrap') {
                    value = input.checked ? 'on' : 'off';
                }

                this.set(`${section}.${key}`, value);

                // 更新温度显示
                if (id === 'ai-temperature') {
                    const display = document.getElementById('temperature-value');
                    if (display) display.textContent = value;
                }
            });
        });
    }

    /**
     * 重置所有设置
     */
    resetAll() {
        if (confirm('确定要重置所有设置吗？')) {
            this.reset();
            window.location.reload();
        }
    }

    /**
     * 应用设置到编辑器
     */
    applyToEditor(editor) {
        if (!editor) return;

        editor.updateOptions({
            fontSize: this.get('editor.fontSize'),
            fontFamily: this.get('editor.fontFamily'),
            tabSize: this.get('editor.tabSize'),
            insertSpaces: this.get('editor.insertSpaces'),
            wordWrap: this.get('editor.wordWrap'),
            minimap: { enabled: this.get('editor.minimap') },
            formatOnSave: this.get('editor.formatOnSave'),
            formatOnPaste: this.get('editor.formatOnPaste')
        });

        // 设置主题
        if (window.monaco) {
            monaco.editor.setTheme(this.get('theme.colorTheme'));
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsComponent;
}


