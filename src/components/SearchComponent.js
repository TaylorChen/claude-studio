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
     */
    async searchInProject(query, options = {}) {
        if (!query || !query.trim()) {
            return [];
        }

        // 合并选项
        this.searchOptions = { ...this.searchOptions, ...options };

        if (!window.electronAPI || !window.electronAPI.searchInFiles) {
            console.error('搜索API不可用');
            return [];
        }

        try {
            const result = await window.electronAPI.searchInFiles(query, this.searchOptions);
            if (result.success) {
                this.searchResults = result.results;
                this.currentResultIndex = 0;
                return this.searchResults;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('搜索失败:', error);
            throw error;
        }
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


