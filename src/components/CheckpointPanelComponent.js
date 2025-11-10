/**
 * 检查点面板组件
 * 显示检查点历史列表,支持预览、对比和恢复
 * MVP-4.1 & MVP-4.2 实施
 */

class CheckpointPanelComponent {
  constructor(checkpointManager) {
    this.checkpointManager = checkpointManager;
    this.container = null;
    this.currentFile = null;
    this.selectedCheckpointId = null;
    this.compareMode = false;
    this.compareCheckpointId = null;
  }

  /**
   * 渲染检查点面板
   * @param {string} containerId - 容器元素 ID
   */
  render(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn('⚠️ 找不到检查点面板容器:', containerId);
      return;
    }

    this.container.innerHTML = this.getHTML();
    this.attachEvents();
    this.loadCheckpoints();
  }

  /**
   * 获取 HTML 模板
   */
  getHTML() {
    return `
      <div class="checkpoint-panel-container">
        <!-- 头部工具栏 -->
        <div class="checkpoint-header">
          <div class="checkpoint-title">
            <span>📌 检查点历史</span>
            <button class="checkpoint-close-btn" id="checkpoint-close" title="关闭面板">✕</button>
          </div>
          
          <div class="checkpoint-toolbar">
            <button class="checkpoint-tool-btn" id="checkpoint-create-btn" title="创建检查点">
              ➕ 创建
            </button>
            <button class="checkpoint-tool-btn" id="checkpoint-refresh-btn" title="刷新列表">
              🔄 刷新
            </button>
            <button class="checkpoint-tool-btn" id="checkpoint-clear-btn" title="清空历史">
              🗑️ 清空
            </button>
            <button class="checkpoint-tool-btn" id="checkpoint-export-btn" title="导出检查点">
              💾 导出
            </button>
          </div>

          <!-- 当前文件信息 -->
          <div class="checkpoint-file-info" id="checkpoint-file-info">
            <span class="checkpoint-file-name">未选择文件</span>
          </div>

          <!-- 分支选择器 (MVP-4.2) -->
          <div class="checkpoint-branch-selector">
            <label>分支:</label>
            <select id="checkpoint-branch-select" class="checkpoint-branch-select">
              <option value="main">main</option>
            </select>
            <button class="checkpoint-branch-btn" id="checkpoint-new-branch-btn" title="创建分支">+</button>
          </div>

          <!-- 统计信息 -->
          <div class="checkpoint-stats" id="checkpoint-stats">
            <span>共 0 个检查点</span>
          </div>
        </div>

        <!-- 检查点列表 -->
        <div class="checkpoint-list" id="checkpoint-list">
          <div class="checkpoint-empty">
            <p>📭 没有检查点</p>
            <p style="font-size: 12px; color: #666;">编辑文件时将自动创建检查点</p>
          </div>
        </div>

        <!-- 对比视图 (MVP-4.1) -->
        <div class="checkpoint-compare-view" id="checkpoint-compare-view" style="display: none;">
          <div class="checkpoint-compare-header">
            <span>📊 差异对比</span>
            <button class="checkpoint-compare-close" id="checkpoint-compare-close">✕</button>
          </div>
          <div class="checkpoint-compare-stats" id="checkpoint-compare-stats">
            <!-- 差异统计 -->
          </div>
          <div class="checkpoint-compare-content" id="checkpoint-compare-content">
            <!-- 差异内容 -->
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 绑定事件处理器
   */
  attachEvents() {
    // 关闭按钮
    const closeBtn = document.getElementById('checkpoint-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide();
      });
    }

    // 创建检查点按钮
    const createBtn = document.getElementById('checkpoint-create-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        this.createManualCheckpoint();
      });
    }

    // 刷新按钮
    const refreshBtn = document.getElementById('checkpoint-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadCheckpoints();
      });
    }

    // 清空按钮
    const clearBtn = document.getElementById('checkpoint-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearCheckpoints();
      });
    }

    // 导出按钮
    const exportBtn = document.getElementById('checkpoint-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportCheckpoints();
      });
    }

    // 分支选择器
    const branchSelect = document.getElementById('checkpoint-branch-select');
    if (branchSelect) {
      branchSelect.addEventListener('change', (e) => {
        this.switchBranch(e.target.value);
      });
    }

    // 新建分支按钮
    const newBranchBtn = document.getElementById('checkpoint-new-branch-btn');
    if (newBranchBtn) {
      newBranchBtn.addEventListener('click', () => {
        this.createNewBranch();
      });
    }

    // 关闭对比视图
    const compareCloseBtn = document.getElementById('checkpoint-compare-close');
    if (compareCloseBtn) {
      compareCloseBtn.addEventListener('click', () => {
        this.hideCompareView();
      });
    }
  }

  /**
   * 加载检查点列表
   */
  loadCheckpoints() {
    if (!this.checkpointManager) {
      console.warn('⚠️ 检查点管理器未初始化');
      return;
    }

    // 更新当前文件信息
    this.updateCurrentFileInfo();

    // 获取检查点
    let checkpoints;
    if (this.currentFile) {
      checkpoints = this.checkpointManager.getCheckpointsForFile(this.currentFile);
    } else {
      checkpoints = this.checkpointManager.checkpoints;
    }

    // 渲染检查点列表
    this.renderCheckpointList(checkpoints);

    // 更新统计信息
    this.updateStats(checkpoints.length);

    // 更新分支选择器
    this.updateBranchSelector();
  }

  /**
   * 更新当前文件信息
   */
  updateCurrentFileInfo() {
    const fileInfo = document.getElementById('checkpoint-file-info');
    if (!fileInfo) return;

    // 获取当前活动文件
    if (window.store && window.store.getState) {
      this.currentFile = window.store.getState('editor.activeFile');
    }

    if (this.currentFile) {
      const fileName = this.currentFile.split('/').pop();
      fileInfo.innerHTML = `
        <span class="checkpoint-file-name" title="${this.currentFile}">
          📄 ${fileName}
        </span>
      `;
    } else {
      fileInfo.innerHTML = `
        <span class="checkpoint-file-name">未选择文件</span>
      `;
    }
  }

  /**
   * 渲染检查点列表
   * @param {Array} checkpoints - 检查点数组
   */
  renderCheckpointList(checkpoints) {
    const listContainer = document.getElementById('checkpoint-list');
    if (!listContainer) return;

    if (checkpoints.length === 0) {
      listContainer.innerHTML = `
        <div class="checkpoint-empty">
          <p>📭 没有检查点</p>
          <p style="font-size: 12px; color: #666;">
            ${this.currentFile ? '开始编辑文件来创建检查点' : '打开文件后可以查看检查点'}
          </p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = checkpoints
      .map((checkpoint) => this.renderCheckpointItem(checkpoint))
      .join('');

    // 绑定检查点项事件
    this.attachCheckpointItemEvents();
  }

  /**
   * 渲染单个检查点项
   * @param {Object} checkpoint - 检查点对象
   * @returns {string} HTML 字符串
   */
  renderCheckpointItem(checkpoint) {
    const date = new Date(checkpoint.timestamp);
    const timeStr = this.formatTime(date);
    const fileName = checkpoint.filePath.split('/').pop();
    const isSelected = checkpoint.id === this.selectedCheckpointId;

    return `
      <div class="checkpoint-item ${isSelected ? 'selected' : ''}" data-checkpoint-id="${checkpoint.id}">
        <div class="checkpoint-item-header">
          <div class="checkpoint-item-icon">
            ${checkpoint.manual ? '📌' : '⚙️'}
          </div>
          <div class="checkpoint-item-info">
            <div class="checkpoint-item-description">
              ${this.escapeHtml(checkpoint.description)}
            </div>
            <div class="checkpoint-item-meta">
              <span class="checkpoint-item-time">${timeStr}</span>
              <span class="checkpoint-item-file">${this.escapeHtml(fileName)}</span>
              <span class="checkpoint-item-size">${checkpoint.metadata.lines} 行</span>
            </div>
          </div>
        </div>
        
        <div class="checkpoint-item-actions">
          <button class="checkpoint-item-btn restore-btn" 
                  data-checkpoint-id="${checkpoint.id}"
                  title="恢复到此检查点">
            ↺ 恢复
          </button>
          <button class="checkpoint-item-btn compare-btn" 
                  data-checkpoint-id="${checkpoint.id}"
                  title="对比差异">
            📊 对比
          </button>
          <button class="checkpoint-item-btn delete-btn" 
                  data-checkpoint-id="${checkpoint.id}"
                  title="删除检查点">
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 绑定检查点项事件
   */
  attachCheckpointItemEvents() {
    // 恢复按钮
    document.querySelectorAll('.restore-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const checkpointId = btn.dataset.checkpointId;
        this.restoreCheckpoint(checkpointId);
      });
    });

    // 对比按钮
    document.querySelectorAll('.compare-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const checkpointId = btn.dataset.checkpointId;
        this.compareCheckpoint(checkpointId);
      });
    });

    // 删除按钮
    document.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const checkpointId = btn.dataset.checkpointId;
        if (confirm('确定要删除这个检查点吗？')) {
          this.deleteCheckpoint(checkpointId);
        }
      });
    });

    // 检查点项点击
    document.querySelectorAll('.checkpoint-item').forEach((item) => {
      item.addEventListener('click', () => {
        const checkpointId = item.dataset.checkpointId;
        this.selectCheckpoint(checkpointId);
      });
    });
  }

  /**
   * 选择检查点
   * @param {string} checkpointId - 检查点 ID
   */
  selectCheckpoint(checkpointId) {
    // 移除其他检查点的选中状态
    document.querySelectorAll('.checkpoint-item').forEach((item) => {
      item.classList.remove('selected');
    });

    // 选中当前检查点
    const item = document.querySelector(`[data-checkpoint-id="${checkpointId}"]`);
    if (item) {
      item.classList.add('selected');
    }

    this.selectedCheckpointId = checkpointId;
  }

  /**
   * 恢复检查点
   * @param {string} checkpointId - 检查点 ID
   */
  restoreCheckpoint(checkpointId) {
    if (!this.checkpointManager) {
      this.showNotification('❌ 检查点管理器未初始化', 'error');
      return;
    }

    const result = this.checkpointManager.restoreCheckpoint(checkpointId);
    if (!result) {
      this.showNotification('❌ 恢复失败', 'error');
      return;
    }

    // 恢复编辑器内容
    if (window.editorManager && window.editorManager.editor) {
      window.editorManager.editor.setValue(result.content);
      this.showNotification(`✓ 已恢复: ${result.checkpoint.description}`, 'success');
    } else {
      this.showNotification('❌ 编辑器未初始化', 'error');
    }
  }

  /**
   * 对比检查点
   * @param {string} checkpointId - 检查点 ID
   */
  compareCheckpoint(checkpointId) {
    if (!this.checkpointManager) {
      this.showNotification('❌ 检查点管理器未初始化', 'error');
      return;
    }

    const diff = this.checkpointManager.compareCheckpoints(checkpointId);
    if (!diff) {
      this.showNotification('❌ 无法对比', 'error');
      return;
    }

    this.showCompareView(checkpointId, diff);
  }

  /**
   * 显示对比视图
   * @param {string} checkpointId - 检查点 ID
   * @param {Object} diff - 差异信息
   */
  showCompareView(checkpointId, diff) {
    const compareView = document.getElementById('checkpoint-compare-view');
    const compareStats = document.getElementById('checkpoint-compare-stats');
    
    if (!compareView || !compareStats) return;

    // 显示对比视图
    compareView.style.display = 'block';

    // 渲染差异统计
    compareStats.innerHTML = `
      <div class="checkpoint-diff-stats">
        <div class="diff-stat additions">
          <span class="diff-stat-label">新增:</span>
          <span class="diff-stat-value">+${diff.additions}</span>
        </div>
        <div class="diff-stat deletions">
          <span class="diff-stat-label">删除:</span>
          <span class="diff-stat-value">-${diff.deletions}</span>
        </div>
        <div class="diff-stat changes">
          <span class="diff-stat-label">修改:</span>
          <span class="diff-stat-value">~${diff.changes}</span>
        </div>
        <div class="diff-stat total">
          <span class="diff-stat-label">总计:</span>
          <span class="diff-stat-value">${diff.total}</span>
        </div>
      </div>
    `;

    this.compareMode = true;
    this.compareCheckpointId = checkpointId;
  }

  /**
   * 隐藏对比视图
   */
  hideCompareView() {
    const compareView = document.getElementById('checkpoint-compare-view');
    if (compareView) {
      compareView.style.display = 'none';
    }
    this.compareMode = false;
    this.compareCheckpointId = null;
  }

  /**
   * 删除检查点
   * @param {string} checkpointId - 检查点 ID
   */
  deleteCheckpoint(checkpointId) {
    if (!this.checkpointManager) {
      this.showNotification('❌ 检查点管理器未初始化', 'error');
      return;
    }

    const success = this.checkpointManager.deleteCheckpoint(checkpointId);
    if (success) {
      this.showNotification('✓ 检查点已删除', 'success');
      this.loadCheckpoints();
    } else {
      this.showNotification('❌ 删除失败', 'error');
    }
  }

  /**
   * 创建手动检查点
   */
  createManualCheckpoint() {
    if (!this.checkpointManager) {
      this.showNotification('❌ 检查点管理器未初始化', 'error');
      return;
    }

    if (!window.editorManager || !window.editorManager.editor) {
      this.showNotification('❌ 编辑器未初始化', 'error');
      return;
    }

    const activeFile = window.store ? window.store.getState('editor.activeFile') : null;
    if (!activeFile) {
      this.showNotification('❌ 没有打开的文件', 'error');
      return;
    }

    // 提示用户输入描述
    const description = prompt('输入检查点描述 (可选):', '');
    if (description === null) {
      return; // 用户取消
    }

    const content = window.editorManager.editor.getValue();
    const checkpoint = this.checkpointManager.createCheckpoint({
      filePath: activeFile,
      content,
      changeType: 'manual',
      description: description || '手动创建',
      manual: true
    });

    if (checkpoint) {
      this.showNotification('✓ 检查点已创建', 'success');
      this.loadCheckpoints();
    } else {
      this.showNotification('❌ 创建失败', 'error');
    }
  }

  /**
   * 清空检查点
   */
  clearCheckpoints() {
    if (!this.checkpointManager) {
      this.showNotification('❌ 检查点管理器未初始化', 'error');
      return;
    }

    const message = this.currentFile 
      ? '确定要清空当前文件的所有检查点吗？'
      : '确定要清空所有检查点吗？';

    if (!confirm(message)) {
      return;
    }

    this.checkpointManager.clearCheckpoints(this.currentFile);
    this.showNotification('✓ 检查点已清空', 'success');
    this.loadCheckpoints();
  }

  /**
   * 导出检查点
   */
  exportCheckpoints() {
    if (!this.checkpointManager) {
      this.showNotification('❌ 检查点管理器未初始化', 'error');
      return;
    }

    const data = this.checkpointManager.exportCheckpoints(this.currentFile);
    const json = JSON.stringify(data, null, 2);
    
    const filename = this.currentFile 
      ? `checkpoint-${this.currentFile.split('/').pop()}-${Date.now()}.json`
      : `checkpoint-all-${Date.now()}.json`;

    this.downloadFile(filename, json, 'application/json');
    this.showNotification('✓ 检查点已导出', 'success');
  }

  /**
   * 创建新分支 (MVP-4.2)
   */
  createNewBranch() {
    if (!this.checkpointManager) {
      this.showNotification('❌ 检查点管理器未初始化', 'error');
      return;
    }

    const branchName = prompt('输入分支名称:', '');
    if (!branchName || !branchName.trim()) {
      return;
    }

    const success = this.checkpointManager.createBranch(branchName.trim());
    if (success) {
      this.showNotification(`✓ 分支 "${branchName}" 已创建`, 'success');
      this.updateBranchSelector();
    } else {
      this.showNotification('❌ 分支创建失败', 'error');
    }
  }

  /**
   * 切换分支
   * @param {string} branchName - 分支名称
   */
  switchBranch(branchName) {
    if (!this.checkpointManager) {
      return;
    }

    const success = this.checkpointManager.switchBranch(branchName);
    if (success) {
      this.showNotification(`✓ 切换到分支: ${branchName}`, 'success');
      this.loadCheckpoints();
    }
  }

  /**
   * 更新分支选择器
   */
  updateBranchSelector() {
    const branchSelect = document.getElementById('checkpoint-branch-select');
    if (!branchSelect || !this.checkpointManager) return;

    const branches = this.checkpointManager.getBranches();
    const currentBranch = this.checkpointManager.currentBranch;

    branchSelect.innerHTML = branches.map(branch => 
      `<option value="${branch}" ${branch === currentBranch ? 'selected' : ''}>
        ${branch}
      </option>`
    ).join('');
  }

  /**
   * 更新统计信息
   * @param {number} count - 检查点数量
   */
  updateStats(count) {
    const statsEl = document.getElementById('checkpoint-stats');
    if (statsEl) {
      statsEl.textContent = `共 ${count} 个检查点`;
    }
  }

  /**
   * 格式化时间
   * @param {Date} date - 日期对象
   * @returns {string} 格式化后的时间字符串
   */
  formatTime(date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
      return '刚刚';
    } else if (minutes < 60) {
      return `${minutes} 分钟前`;
    } else if (hours < 24) {
      return `${hours} 小时前`;
    } else if (days < 7) {
      return `${days} 天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  }

  /**
   * HTML 转义
   * @param {string} text - 文本
   * @returns {string} 转义后的文本
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * 下载文件
   * @param {string} filename - 文件名
   * @param {string} content - 文件内容
   * @param {string} mimeType - MIME 类型
   */
  downloadFile(filename, content, mimeType = 'text/plain') {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('❌ 下载失败:', error);
      this.showNotification('❌ 下载失败', 'error');
    }
  }

  /**
   * 显示通知
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型 (success, error, info)
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `checkpoint-notification checkpoint-notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 70px;
      right: 20px;
      background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#4ade80' : '#3b82f6'};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 1001;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * 显示面板
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
      this.loadCheckpoints();
    }
  }

  /**
   * 隐藏面板
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * 切换面板显示/隐藏
   */
  toggle() {
    if (this.container) {
      if (this.container.style.display === 'none') {
        this.show();
      } else {
        this.hide();
      }
    }
  }

  /**
   * 设置当前文件
   * @param {string} filePath - 文件路径
   */
  setCurrentFile(filePath) {
    this.currentFile = filePath;
    this.loadCheckpoints();
  }

  /**
   * 销毁组件
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CheckpointPanelComponent;
}

