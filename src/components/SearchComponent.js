/**
 * 搜索和替换组件
 * 提供全局搜索和替换功能
 */

class SearchComponent {
    constructor() {
        this.searchResults = [];
        this.currentResultIndex = 0;
        this.searchOptions = {
            caseSensitive: false,
            wholeWord: false,
            useRegex: false
        };
    }

    /**
     * 在项目中搜索
     * 支持两种模式：Electron API (优先) 或本地文件系统搜索
     */
    async searchInProject(query, options = {}) {
        if (!query || !query.trim()) {
            return [];
        }

        // 合并选项
        this.searchOptions = { ...this.searchOptions, ...options };

        console.log('🔍 开始项目搜索，查询词:', query, '选项:', this.searchOptions);

        // 方式1: 尝试使用 Electron API (优先)
        let useElectronAPI = false;
        if (window.electronAPI && window.electronAPI.searchInFiles) {
            try {
                console.log('📡 使用 Electron API 搜索...');
                const result = await window.electronAPI.searchInFiles(query, this.searchOptions);
                if (result && result.success && result.results && result.results.length > 0) {
                    this.searchResults = result.results;
                    this.currentResultIndex = 0;
                    console.log('✅ Electron API 搜索成功:', this.searchResults.length, '个结果');
                    useElectronAPI = true;
                    return this.searchResults;
                } else if (result && result.success) {
                    console.log('⚠️ Electron API 搜索无结果，继续使用本地搜索');
                    useElectronAPI = false;  // 继续使用本地搜索
                } else {
                    console.log('⚠️ Electron API 返回异常:', result);
                }
            } catch (error) {
                console.warn('⚠️ Electron API 搜索失败:', error.message);
            }
        } else {
            console.log('ℹ️ Electron API 不可用，使用本地搜索');
        }

        // 方式2: 使用本地搜索 (作为主要搜索方式或回退)
        console.log('🔍 开始本地文件搜索...');
        this.searchResults = this.searchInLocalFiles(query, options);
        this.currentResultIndex = 0;
        console.log('📁 本地搜索结果:', this.searchResults.length, '个匹配');
        
        return this.searchResults;
    }

    /**
     * 在本地文件中搜索 (不依赖 Electron API)
     * 优先搜索文件名，然后搜索内容
     */
    searchInLocalFiles(query, options = {}) {
        const results = [];
        
        // 获取更完整的项目文件清单
        const projectFiles = this.getProjectFilesList();

        // 创建搜索模式
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flags = options.caseSensitive ? 'g' : 'gi';
        const searchPattern = new RegExp(escapedQuery, flags);

        console.log('🔍 本地搜索: 查询词:', query, '使用模式:', searchPattern);
        console.log('🔍 本地搜索: 扫描项目文件', projectFiles.length, '个');

        // 第一阶段：精确文件名匹配 (优先级最高)
        const exactMatches = [];
        projectFiles.forEach(file => {
            if (file.name.toLowerCase() === query.toLowerCase()) {
                exactMatches.push({
                    file: file.path,
                    line: 1,
                    column: 1,
                    content: `📄 ${file.name}`,
                    match: query,
                    isFileName: true,
                    matchType: 'exact'
                });
                console.log('✅ 精确匹配文件名:', file.name);
            }
        });

        // 第二阶段：文件名包含搜索词 (优先级高)
        const partialMatches = [];
        projectFiles.forEach(file => {
            if (exactMatches.find(r => r.file === file.path)) return; // 跳过已匹配的

            if (searchPattern.test(file.name)) {
                partialMatches.push({
                    file: file.path,
                    line: 1,
                    column: 1,
                    content: `📄 ${file.name}`,
                    match: query,
                    isFileName: true,
                    matchType: 'filename'
                });
                console.log('✅ 文件名包含匹配:', file.name);
            }
        });

        // 第三阶段：文件路径包含搜索词 (优先级中)
        const pathMatches = [];
        projectFiles.forEach(file => {
            if (exactMatches.find(r => r.file === file.path) || partialMatches.find(r => r.file === file.path)) {
                return; // 跳过已匹配的
            }

            if (searchPattern.test(file.path)) {
                pathMatches.push({
                    file: file.path,
                    line: 1,
                    column: 1,
                    content: `📄 ${file.name}`,
                    match: query,
                    isFileName: true,
                    matchType: 'path'
                });
                console.log('✅ 路径包含匹配:', file.path);
            }
        });

        // 合并结果，按优先级排序
        results.push(...exactMatches);
        results.push(...partialMatches);
        results.push(...pathMatches);

        console.log('📁 本地搜索完成:',
            '精确匹配', exactMatches.length, '个,',
            '文件名匹配', partialMatches.length, '个,',
            '路径匹配', pathMatches.length, '个'
        );

        return results;
    }

    /**
     * 获取项目文件列表
     * 包括预定义文件 + 动态检测的文件
     */
    getProjectFilesList() {
        // 基础预定义文件
        const baseFiles = [
            // 根目录 HTML
            { name: 'index.html', path: './index.html', type: 'html' },
            
            // 配置文件
            { name: 'package.json', path: './package.json', type: 'json' },
            { name: '.gitignore', path: './.gitignore', type: 'text' },
            
            // 文档文件 (通用)
            { name: 'README.md', path: './README.md', type: 'markdown' },
            { name: 'CONTRIBUTING.md', path: './CONTRIBUTING.md', type: 'markdown' },
            { name: 'LICENSE', path: './LICENSE', type: 'text' },
            { name: 'CHANGELOG.md', path: './CHANGELOG.md', type: 'markdown' },
            { name: 'ARCHITECTURE.md', path: './ARCHITECTURE.md', type: 'markdown' },
            
            // 源代码目录中的主要文件
            { name: 'main.js', path: './src/main.js', type: 'javascript' },
            { name: 'app.js', path: './src/renderer/app.js', type: 'javascript' },
            { name: 'preload.js', path: './src/preload.js', type: 'javascript' },
        ];

        // 动态添加已打开的编辑器文件
        const editorFiles = this.getOpenedEditorFiles();
        
        // 动态检测 MVP 相关文件
        const mvpFiles = this.detectMVPFiles();
        
        // 合并所有文件，去重
        const allFiles = [...baseFiles, ...editorFiles, ...mvpFiles];
        const uniqueFiles = this.deduplicateFiles(allFiles);
        
        console.log('📁 项目文件清单: 基础', baseFiles.length, '个 + 编辑器', editorFiles.length, '个 + MVP', mvpFiles.length, '个 = 总计', uniqueFiles.length, '个');
        
        return uniqueFiles;
    }

    /**
     * 获取已打开的编辑器文件列表
     */
    getOpenedEditorFiles() {
        const files = [];
        
        try {
            // 尝试从 store 获取当前打开的文件
            if (window.store) {
                const activeFile = window.store.getState('editor.activeFile');
                if (activeFile) {
                    files.push({
                        name: activeFile.split('/').pop(),
                        path: activeFile,
                        type: this.getFileType(activeFile)
                    });
                }
            }
            
            // 尝试从 DOM 获取已打开的文件标签
            const tabs = document.querySelectorAll('[data-file-path]');
            tabs.forEach(tab => {
                const filePath = tab.getAttribute('data-file-path');
                if (filePath) {
                    files.push({
                        name: filePath.split('/').pop(),
                        path: filePath,
                        type: this.getFileType(filePath)
                    });
                }
            });
        } catch (e) {
            console.warn('⚠️ 获取编辑器文件失败:', e.message);
        }
        
        return files;
    }

    /**
     * 动态检测 MVP 相关文件
     */
    detectMVPFiles() {
        const files = [];
        
        // MVP 相关文件模式
        const mvpPatterns = [
            'MVP-1.1-IMPLEMENTATION.md',
            'MVP-1.2-IMPLEMENTATION.md',
            'MVP-1.3-IMPLEMENTATION.md',
            'MVP-2.1-IMPLEMENTATION.md',
            'MVP-3.3-PHASE1-IMPLEMENTATION-SUMMARY.md',
            'MVP-3.3-PHASE1-TESTING.md',
            'MVP-3.3-PHASE2-DELIVERABLES.md',
            'MVP-3.3-PHASE2-EXTENSION-GUIDE.md',
            'MVP-3.3-PHASE2-FINAL-REPORT.md',
            'MVP-3.3-PHASE2-IMPLEMENTATION.md',
            'MVP-3.3-PHASE2-QUICK-TEST.md',
            'MVP-3.3-PHASE2-SUMMARY.md',
            'MVP-3.3-PHASE2-TESTING.md',
            'MVP-3.3-PHASE2-VALIDATION.js',
            'MVP-3.3-PHASE3-DAY1-SUMMARY.md',
            'MVP-3.3-PHASE3-DAY2-PLAN.md',
            'MVP-3.3-PHASE3-DAY2-SUMMARY.md',
            'MVP-3.3-PHASE3-DAY3-FINAL-TESTING.md',
            'MVP-3.3-PHASE3-FINAL-REPORT.md',
            'MVP-3.3-PHASE3-PLAN.md',
            'MVP-3.3-PLAN.md',
            'plan.md'
        ];
        
        // 转换为文件对象
        mvpPatterns.forEach(name => {
            files.push({
                name: name,
                path: './' + name,
                type: this.getFileType(name)
            });
        });
        
        return files;
    }

    /**
     * 文件去重
     */
    deduplicateFiles(files) {
        const seen = new Set();
        const unique = [];
        
        files.forEach(file => {
            const key = file.path.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(file);
            }
        });
        
        return unique;
    }

    /**
     * 获取文件类型
     */
    getFileType(filePath) {
        if (!filePath) return 'unknown';
        
        if (filePath.endsWith('.md')) return 'markdown';
        if (filePath.endsWith('.js')) return 'javascript';
        if (filePath.endsWith('.json')) return 'json';
        if (filePath.endsWith('.html')) return 'html';
        if (filePath.endsWith('.css')) return 'css';
        if (filePath.endsWith('.txt')) return 'text';
        
        return 'text';
    }

    /**
     * 在当前文件中搜索
     */
    searchInCurrentFile(query, content, options = {}) {
        if (!query || !content) {
            return [];
        }

        const results = [];
        const lines = content.split('\n');
        
        let searchPattern;
        if (options.useRegex) {
            try {
                const flags = options.caseSensitive ? 'g' : 'gi';
                searchPattern = new RegExp(query, flags);
            } catch (e) {
                console.error('无效的正则表达式:', e);
                return [];
            }
        } else {
            const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const flags = options.caseSensitive ? 'g' : 'gi';
            searchPattern = new RegExp(escapedQuery, flags);
        }

        lines.forEach((line, index) => {
            const matches = line.matchAll(searchPattern);
            for (const match of matches) {
                results.push({
                    line: index + 1,
                    column: match.index + 1,
                    content: line,
                    match: match[0]
                });
            }
        });

        return results;
    }

    /**
     * 替换文本
     */
    async replaceInProject(searchText, replaceText, options = {}) {
        if (!searchText || !window.electronAPI || !window.electronAPI.replaceInFiles) {
            return { success: false, error: '替换API不可用' };
        }

        try {
            const result = await window.electronAPI.replaceInFiles(
                searchText,
                replaceText,
                { ...this.searchOptions, ...options }
            );
            return result;
        } catch (error) {
            console.error('替换失败:', error);
            throw error;
        }
    }

    /**
     * 在当前文件中替换
     */
    replaceInCurrentFile(content, searchText, replaceText, options = {}) {
        if (!searchText || !content) {
            return content;
        }

        let searchPattern;
        if (options.useRegex) {
            try {
                const flags = options.caseSensitive ? 'g' : 'gi';
                searchPattern = new RegExp(searchText, flags);
            } catch (e) {
                console.error('无效的正则表达式:', e);
                return content;
            }
        } else {
            const escapedQuery = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const flags = options.caseSensitive ? 'g' : 'gi';
            searchPattern = new RegExp(escapedQuery, flags);
        }

        return content.replace(searchPattern, replaceText);
    }

    /**
     * 导航到下一个结果
     */
    nextResult() {
        if (this.searchResults.length === 0) return null;
        
        this.currentResultIndex = (this.currentResultIndex + 1) % this.searchResults.length;
        return this.searchResults[this.currentResultIndex];
    }

    /**
     * 导航到上一个结果
     */
    previousResult() {
        if (this.searchResults.length === 0) return null;
        
        this.currentResultIndex = (this.currentResultIndex - 1 + this.searchResults.length) % this.searchResults.length;
        return this.searchResults[this.currentResultIndex];
    }

    /**
     * 获取当前结果
     */
    getCurrentResult() {
        if (this.searchResults.length === 0) return null;
        return this.searchResults[this.currentResultIndex];
    }

    /**
     * 清除搜索结果
     */
    clearResults() {
        this.searchResults = [];
        this.currentResultIndex = 0;
    }

    /**
     * 渲染搜索界面
     */
    renderSearchPanel(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const html = `
            <div class="search-panel">
                <div class="search-input-group">
                    <input 
                        type="text" 
                        id="searchInput" 
                        class="search-input-field" 
                        placeholder="搜索..."
                    />
                    <button class="search-btn" onclick="searchComponent.performSearch()">
                        🔍
                    </button>
                </div>

                <div class="search-options">
                    <label class="search-option">
                        <input type="checkbox" id="caseSensitive" />
                        <span>区分大小写 (Aa)</span>
                    </label>
                    <label class="search-option">
                        <input type="checkbox" id="wholeWord" />
                        <span>全字匹配 (Ab)</span>
                    </label>
                    <label class="search-option">
                        <input type="checkbox" id="useRegex" />
                        <span>正则表达式 (.*)</span>
                    </label>
                </div>

                <div class="search-replace">
                    <input 
                        type="text" 
                        id="replaceInput" 
                        class="search-input-field" 
                        placeholder="替换为..."
                    />
                    <div class="search-replace-buttons">
                        <button class="search-btn" onclick="searchComponent.replaceOne()">
                            替换
                        </button>
                        <button class="search-btn" onclick="searchComponent.replaceAll()">
                            全部替换
                        </button>
                    </div>
                </div>

                <div class="search-results" id="searchResults">
                    <div class="search-results-header">
                        <span id="searchResultsCount">0 个结果</span>
                        <div class="search-navigation">
                            <button onclick="searchComponent.previousResult()">⬆</button>
                            <button onclick="searchComponent.nextResult()">⬇</button>
                        </div>
                    </div>
                    <div class="search-results-list" id="searchResultsList">
                        <!-- 搜索结果将在这里显示 -->
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.bindSearchEvents();
    }

    /**
     * 绑定搜索事件
     */
    bindSearchEvents() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }

        // 绑定选项复选框
        ['caseSensitive', 'wholeWord', 'useRegex'].forEach(optionId => {
            const checkbox = document.getElementById(optionId);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.performSearch();
                });
            }
        });
    }

    /**
     * 执行搜索
     */
    async performSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        const query = searchInput.value.trim();
        if (!query) {
            this.clearResults();
            this.renderResults();
            return;
        }

        // 获取选项
        const options = {
            caseSensitive: document.getElementById('caseSensitive')?.checked || false,
            wholeWord: document.getElementById('wholeWord')?.checked || false,
            useRegex: document.getElementById('useRegex')?.checked || false
        };

        try {
            await this.searchInProject(query, options);
            this.renderResults();
        } catch (error) {
            console.error('搜索失败:', error);
            alert(`搜索失败: ${error.message}`);
        }
    }

    /**
     * 替换一个
     */
    async replaceOne() {
        const currentResult = this.getCurrentResult();
        if (!currentResult) {
            alert('没有选中的搜索结果');
            return;
        }

        const replaceInput = document.getElementById('replaceInput');
        if (!replaceInput) return;

        const replaceText = replaceInput.value;
        
        // 这里需要实现具体的替换逻辑
        // 通常会打开文件，定位到位置，然后替换
    }

    /**
     * 全部替换
     */
    async replaceAll() {
        const searchInput = document.getElementById('searchInput');
        const replaceInput = document.getElementById('replaceInput');
        
        if (!searchInput || !replaceInput) return;

        const searchText = searchInput.value.trim();
        const replaceText = replaceInput.value;

        if (!searchText) {
            alert('请输入搜索文本');
            return;
        }

        const confirmed = confirm(`确定要替换所有 ${this.searchResults.length} 个匹配项吗？`);
        if (!confirmed) return;

        try {
            const result = await this.replaceInProject(searchText, replaceText);
            if (result.success) {
                alert(`成功替换 ${result.count} 个匹配项`);
                await this.performSearch(); // 重新搜索
            } else {
                alert(`替换失败: ${result.error}`);
            }
        } catch (error) {
            alert(`替换失败: ${error.message}`);
        }
    }

    /**
     * 渲染搜索结果
     */
    renderResults() {
        const countElement = document.getElementById('searchResultsCount');
        const listElement = document.getElementById('searchResultsList');

        if (!countElement || !listElement) return;

        countElement.textContent = `${this.searchResults.length} 个结果`;

        if (this.searchResults.length === 0) {
            listElement.innerHTML = '<div class="no-results">没有找到匹配项</div>';
            return;
        }

        const html = this.searchResults.map((result, index) => `
            <div class="search-result-item ${index === this.currentResultIndex ? 'active' : ''}"
                 onclick="searchComponent.selectResult(${index})">
                <div class="result-file">${result.file}</div>
                <div class="result-location">第 ${result.line} 行</div>
                <div class="result-content">${this.highlightMatch(result.content, result.match)}</div>
            </div>
        `).join('');

        listElement.innerHTML = html;
    }

    /**
     * 高亮匹配文本
     */
    highlightMatch(content, match) {
        if (!match) return content;
        return content.replace(
            new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
            '<mark>$&</mark>'
        );
    }

    /**
     * 选择结果
     */
    selectResult(index) {
        this.currentResultIndex = index;
        const result = this.searchResults[index];
        
        // 触发打开文件并跳转到指定行
        if (window.studio && result) {
            // 这里需要调用主应用的打开文件方法
        }

        this.renderResults();
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchComponent;
}


