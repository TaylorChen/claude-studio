/**
 * Git 集成组件
 * 提供完整的Git版本控制功能
 */

class GitComponent {
    constructor() {
        this.currentBranch = null;
        this.stagedFiles = [];
        this.unstagedFiles = [];
        this.status = null;
    }

    /**
     * 初始化Git组件
     */
    async init() {
        try {
            await this.refreshStatus();
        } catch (error) {
        }
    }

    /**
     * 刷新Git状态
     */
    async refreshStatus() {
        if (!window.electronAPI || !window.electronAPI.gitStatus) {
            console.warn('Git API 不可用');
            return null;
        }

        try {
            const result = await window.electronAPI.gitStatus();
            if (result.success) {
                this.status = result.status;
                this.currentBranch = result.branch;
                this.parseStatus(result.status);
                return this.status;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('获取Git状态失败:', error);
            return null;
        }
    }

    /**
     * 解析Git状态
     */
    parseStatus(status) {
        // 解析git status输出，提取staged和unstaged文件
        this.stagedFiles = [];
        this.unstagedFiles = [];

        // 简单的状态解析
        const lines = status.split('\n');
        lines.forEach(line => {
            if (line.startsWith('M ') || line.startsWith('A ') || line.startsWith('D ')) {
                this.stagedFiles.push(line.trim());
            } else if (line.includes('modified:') || line.includes('deleted:') || line.includes('new file:')) {
                this.unstagedFiles.push(line.trim());
            }
        });
    }

    /**
     * 暂存文件
     */
    async stageFile(filePath) {
        if (!window.electronAPI || !window.electronAPI.gitAdd) {
            throw new Error('Git API 不可用');
        }

        try {
            const result = await window.electronAPI.gitAdd(filePath);
            if (result.success) {
                await this.refreshStatus();
                return true;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('暂存文件失败:', error);
            throw error;
        }
    }

    /**
     * 暂存所有文件
     */
    async stageAll() {
        return await this.stageFile('.');
    }

    /**
     * 取消暂存文件
     */
    async unstageFile(filePath) {
        if (!window.electronAPI || !window.electronAPI.gitReset) {
            throw new Error('Git API 不可用');
        }

        try {
            const result = await window.electronAPI.gitReset(filePath);
            if (result.success) {
                await this.refreshStatus();
                return true;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('取消暂存失败:', error);
            throw error;
        }
    }

    /**
     * 提交更改
     */
    async commit(message) {
        if (!message || !message.trim()) {
            throw new Error('提交信息不能为空');
        }

        if (!window.electronAPI || !window.electronAPI.gitCommit) {
            throw new Error('Git API 不可用');
        }

        try {
            const result = await window.electronAPI.gitCommit(message);
            if (result.success) {
                await this.refreshStatus();
                return true;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('提交失败:', error);
            throw error;
        }
    }

    /**
     * 推送到远程
     */
    async push(remote = 'origin', branch = null) {
        if (!window.electronAPI || !window.electronAPI.gitPush) {
            throw new Error('Git API 不可用');
        }

        const targetBranch = branch || this.currentBranch || 'main';

        try {
            const result = await window.electronAPI.gitPush(remote, targetBranch);
            if (result.success) {
                return true;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('推送失败:', error);
            throw error;
        }
    }

    /**
     * 拉取远程更改
     */
    async pull(remote = 'origin', branch = null) {
        if (!window.electronAPI || !window.electronAPI.gitPull) {
            throw new Error('Git API 不可用');
        }

        const targetBranch = branch || this.currentBranch || 'main';

        try {
            const result = await window.electronAPI.gitPull(remote, targetBranch);
            if (result.success) {
                await this.refreshStatus();
                return true;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('拉取失败:', error);
            throw error;
        }
    }

    /**
     * 切换分支
     */
    async checkout(branch) {
        if (!window.electronAPI || !window.electronAPI.gitCheckout) {
            throw new Error('Git API 不可用');
        }

        try {
            const result = await window.electronAPI.gitCheckout(branch);
            if (result.success) {
                this.currentBranch = branch;
                await this.refreshStatus();
                return true;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('切换分支失败:', error);
            throw error;
        }
    }

    /**
     * 创建新分支
     */
    async createBranch(branchName) {
        if (!window.electronAPI || !window.electronAPI.gitCreateBranch) {
            throw new Error('Git API 不可用');
        }

        try {
            const result = await window.electronAPI.gitCreateBranch(branchName);
            if (result.success) {
                return true;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('创建分支失败:', error);
            throw error;
        }
    }

    /**
     * 获取提交历史
     */
    async getLog(limit = 10) {
        if (!window.electronAPI || !window.electronAPI.gitLog) {
            throw new Error('Git API 不可用');
        }

        try {
            const result = await window.electronAPI.gitLog(limit);
            if (result.success) {
                return result.log;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('获取提交历史失败:', error);
            throw error;
        }
    }

    /**
     * 查看文件差异
     */
    async diff(filePath) {
        if (!window.electronAPI || !window.electronAPI.gitDiff) {
            throw new Error('Git API 不可用');
        }

        try {
            const result = await window.electronAPI.gitDiff(filePath);
            if (result.success) {
                return result.diff;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('获取文件差异失败:', error);
            throw error;
        }
    }

    /**
     * 渲染Git状态面板
     */
    renderStatusPanel(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const html = `
            <div class="git-panel">
                <div class="git-header">
                    <div class="git-branch">
                        <span class="git-icon">🔀</span>
                        <span class="branch-name">${this.currentBranch || '未知分支'}</span>
                    </div>
                    <div class="git-actions">
                        <button class="git-btn" onclick="gitComponent.pull()" title="拉取">
                            ⬇️
                        </button>
                        <button class="git-btn" onclick="gitComponent.push()" title="推送">
                            ⬆️
                        </button>
                        <button class="git-btn" onclick="gitComponent.refreshStatus()" title="刷新">
                            🔄
                        </button>
                    </div>
                </div>

                <div class="git-changes">
                    <div class="git-section">
                        <div class="git-section-header">
                            <span>更改 (${this.unstagedFiles.length})</span>
                            <button class="git-btn-small" onclick="gitComponent.stageAll()">全部暂存</button>
                        </div>
                        <div class="git-file-list">
                            ${this.renderFileList(this.unstagedFiles, false)}
                        </div>
                    </div>

                    <div class="git-section">
                        <div class="git-section-header">
                            <span>已暂存 (${this.stagedFiles.length})</span>
                        </div>
                        <div class="git-file-list">
                            ${this.renderFileList(this.stagedFiles, true)}
                        </div>
                    </div>
                </div>

                <div class="git-commit">
                    <textarea 
                        id="gitCommitMessage" 
                        placeholder="输入提交信息..."
                        class="git-commit-input"
                    ></textarea>
                    <button class="git-commit-btn" onclick="gitComponent.commitChanges()">
                        提交
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * 渲染文件列表
     */
    renderFileList(files, isStaged) {
        if (files.length === 0) {
            return '<div class="git-file-empty">没有更改</div>';
        }

        return files.map(file => `
            <div class="git-file-item">
                <span class="file-status">M</span>
                <span class="file-name">${file}</span>
                <div class="file-actions">
                    ${isStaged ? 
                        `<button onclick="gitComponent.unstageFile('${file}')">-</button>` :
                        `<button onclick="gitComponent.stageFile('${file}')">+</button>`
                    }
                </div>
            </div>
        `).join('');
    }

    /**
     * 提交更改（从UI调用）
     */
    async commitChanges() {
        const messageInput = document.getElementById('gitCommitMessage');
        if (!messageInput) return;

        const message = messageInput.value.trim();
        if (!message) {
            alert('请输入提交信息');
            return;
        }

        try {
            await this.commit(message);
            messageInput.value = '';
            alert('提交成功');
            this.renderStatusPanel('sidebarContent');
        } catch (error) {
            alert(`提交失败: ${error.message}`);
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitComponent;
}


