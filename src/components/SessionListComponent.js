/**
 * 会话列表组件
 * 显示所有历史对话会话，支持搜索、筛选和恢复
 * MVP-1.2 实施
 */

class SessionListComponent {
  constructor(historyManager, onSessionSelect) {
    this.historyManager = historyManager;
    this.onSessionSelect = onSessionSelect;
    this.container = null;
    this.searchQuery = '';
    this.filteredSessions = [];
    this.selectedSessionId = null;
  }

  /**
   * 初始化会话列表
   * @param {string} containerId - 容器元素 ID
   */
  render(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn('⚠️ 找不到会话列表容器:', containerId);
      return;
    }

    this.container.innerHTML = this.getHTML();
    this.attachEvents();
    this.loadSessions();
  }

  /**
   * 获取 HTML 模板
   */
  getHTML() {
    return `
      <div class="session-list-container">
        <!-- 搜索框 -->
        <div class="session-search-bar">
          <input 
            type="text" 
            id="session-search-input" 
            class="session-search-input"
            placeholder="搜索会话..."
            autocomplete="off"
          >
          <button class="session-search-btn" id="session-search-clear" title="清空搜索">✕</button>
        </div>

        <!-- 动作按钮 -->
        <div class="session-actions">
          <button class="session-action-btn" id="session-new-btn" title="新建对话">
            ➕ 新建
          </button>
          <button class="session-action-btn" id="session-refresh-btn" title="刷新列表">
            🔄 刷新
          </button>
          <!-- MVP-1.3: 导出/导入按钮 -->
          <button class="session-action-btn" id="session-export-btn" title="导出会话">
            💾 导出
          </button>
          <button class="session-action-btn" id="session-import-btn" title="导入会话">
            📥 导入
          </button>
        </div>
        
        <!-- 隐藏的文件输入 -->
        <input type="file" id="session-import-input" accept=".json,.md" style="display: none;">
        

        <!-- 会话统计 -->
        <div class="session-stats">
          <span id="session-count">共 0 个会话</span>
        </div>

        <!-- 会话列表 -->
        <div class="session-items" id="session-items">
          <div class="session-empty">
            <p>📭 没有会话记录</p>
            <p style="font-size: 12px; color: #666;">开始与 AI 对话来创建第一个会话</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 绑定事件处理器
   */
  attachEvents() {
    // 搜索输入
    const searchInput = document.getElementById('session-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.filterSessions();
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.filterSessions();
        }
      });
    }

    // 清空搜索
    const clearBtn = document.getElementById('session-search-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.searchQuery = '';
        if (searchInput) {
          searchInput.value = '';
        }
        this.filterSessions();
      });
    }

    // 新建对话
    const newBtn = document.getElementById('session-new-btn');
    if (newBtn) {
      newBtn.addEventListener('click', () => {
        if (this.onSessionSelect) {
          this.onSessionSelect(null); // null 表示新建对话
        }
      });
    }

    // 刷新列表
    const refreshBtn = document.getElementById('session-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadSessions();
      });
    }

    // MVP-1.3: 导出按钮
    const exportBtn = document.getElementById('session-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        // 创建导出格式选择菜单
        const menu = document.createElement('div');
        menu.className = 'session-export-menu';
        menu.style.cssText = `
          position: absolute;
          bottom: 160px;
          right: 10px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          z-index: 1000;
          min-width: 120px;
        `;

        const jsonBtn = document.createElement('button');
        jsonBtn.textContent = '💾 JSON';
        jsonBtn.style.cssText = `
          display: block;
          width: 100%;
          padding: 8px 12px;
          background: transparent;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          text-align: left;
          font-size: 12px;
        `;
        jsonBtn.addEventListener('click', () => {
          this.exportSessions('json');
          document.body.removeChild(menu);
        });

        const mdBtn = document.createElement('button');
        mdBtn.textContent = '📝 Markdown';
        mdBtn.style.cssText = `
          display: block;
          width: 100%;
          padding: 8px 12px;
          background: transparent;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          text-align: left;
          font-size: 12px;
          border-top: 1px solid var(--border-color);
        `;
        mdBtn.addEventListener('click', () => {
          this.exportSessions('markdown');
          document.body.removeChild(menu);
        });

        menu.appendChild(jsonBtn);
        menu.appendChild(mdBtn);
        document.body.appendChild(menu);

        // 点击外部关闭菜单
        setTimeout(() => {
          document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && !exportBtn.contains(e.target)) {
              if (menu.parentNode) {
                document.body.removeChild(menu);
              }
              document.removeEventListener('click', closeMenu);
            }
          });
        }, 0);
      });
    }

    // MVP-1.3: 导入按钮
    const importBtn = document.getElementById('session-import-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        this.importSessions();
      });
    }

    // MVP-1.3: 文件输入变化事件
    const importInput = document.getElementById('session-import-input');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.handleImportFile(file);
          // 重置 input，以便可以导入同名文件
          importInput.value = '';
        }
      });
    }
  }

  /**
   * 加载所有会话
   */
  loadSessions() {
    if (!this.historyManager) {
      console.warn('⚠️ 历史管理器未初始化');
      return;
    }

    try {
      const conversations = this.historyManager.getAllConversations();
      this.filteredSessions = conversations;
      this.renderSessions(conversations);
      this.updateStats(conversations.length);
    } catch (error) {
      this.showError('加载会话失败');
    }
  }

  /**
   * 筛选会话
   */
  filterSessions() {
    if (!this.historyManager) return;

    let filtered;
    if (this.searchQuery.trim()) {
      filtered = this.historyManager.search(this.searchQuery);
    } else {
      filtered = this.historyManager.getAllConversations();
    }

    this.filteredSessions = filtered;
    this.renderSessions(filtered);
    this.updateStats(filtered.length, this.searchQuery.length > 0);
  }

  /**
   * 渲染会话列表
   */
  renderSessions(sessions) {
    const itemsContainer = document.getElementById('session-items');
    if (!itemsContainer) return;

    if (sessions.length === 0) {
      itemsContainer.innerHTML = `
        <div class="session-empty">
          <p>📭 ${this.searchQuery ? '找不到匹配的会话' : '没有会话记录'}</p>
          <p style="font-size: 12px; color: #666;">
            ${this.searchQuery ? '尝试使用其他搜索关键词' : '开始与 AI 对话来创建会话'}
          </p>
        </div>
      `;
      return;
    }

    itemsContainer.innerHTML = sessions
      .map((session) => this.renderSessionItem(session))
      .join('');

    // 绑定会话项的事件
    this.attachSessionItemEvents();
  }

  /**
   * 渲染单个会话项
   */
  renderSessionItem(session) {
    const date = new Date(session.timestamp);
    const dateStr = this.formatDate(date);
    const preview = this.getSessionPreview(session);
    const messageCount = (session.messages && session.messages.length) || 0;

    return `
      <div class="session-item" data-session-id="${session.id}">
        <div class="session-item-header">
          <div class="session-item-title">${this.escapeHtml(session.title || '新对话')}</div>
          <div class="session-item-date">${dateStr}</div>
        </div>
        
        <div class="session-item-preview">
          ${preview}
        </div>
        
        <div class="session-item-meta">
          <span class="session-item-count">💬 ${messageCount} 条消息</span>
          <div class="session-item-actions">
            <button class="session-item-btn restore-btn" 
                    data-session-id="${session.id}"
                    title="恢复此会话">
              ↺ 恢复
            </button>
            <button class="session-item-btn delete-btn" 
                    data-session-id="${session.id}"
                    title="删除此会话">
              🗑️ 删除
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 获取会话预览文本
   */
  getSessionPreview(session) {
    if (!session.messages || session.messages.length === 0) {
      return '<span style="color: #999;">暂无内容</span>';
    }

    // 获取第一条用户消息作为预览
    const userMessage = session.messages.find((msg) => msg.role === 'user' || msg.type === 'user');
    if (userMessage) {
      const preview = userMessage.content.substring(0, 100);
      return this.escapeHtml(preview) + (userMessage.content.length > 100 ? '...' : '');
    }

    // 如果没有用户消息，显示对话信息
    return `<span style="color: #999;">共 ${session.messages.length} 条消息</span>`;
  }

  /**
   * 格式化日期
   */
  formatDate(date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const dayDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (dayDiff === 0) {
      // 今天
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (dayDiff === 1) {
      // 昨天
      return '昨天';
    } else if (dayDiff < 7) {
      // 本周
      return `${dayDiff} 天前`;
    } else if (dayDiff < 30) {
      // 本月
      const weeks = Math.floor(dayDiff / 7);
      return `${weeks} 周前`;
    } else {
      // 显示日期
      return date.toLocaleDateString('zh-CN');
    }
  }

  /**
   * 绑定会话项事件
   */
  attachSessionItemEvents() {
    // 恢复按钮
    document.querySelectorAll('.restore-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sessionId = btn.dataset.sessionId;
        this.restoreSession(sessionId);
      });
    });

    // 删除按钮
    document.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const sessionId = btn.dataset.sessionId;
        if (confirm('确定要删除这个会话吗？')) {
          await this.deleteSession(sessionId);
        }
      });
    });

    // 会话项点击
    document.querySelectorAll('.session-item').forEach((item) => {
      item.addEventListener('click', () => {
        const sessionId = item.dataset.sessionId;
        this.selectSession(sessionId);
      });
    });
  }

  /**
   * 选择会话（高亮显示）
   */
  selectSession(sessionId) {
    // 移除其他会话的高亮
    document.querySelectorAll('.session-item').forEach((item) => {
      item.classList.remove('selected');
    });

    // 高亮当前会话
    const item = document.querySelector(`[data-session-id="${sessionId}"]`);
    if (item) {
      item.classList.add('selected');
    }

    this.selectedSessionId = sessionId;
  }

  /**
   * 恢复会话
   */
  restoreSession(sessionId) {
    if (!this.historyManager) {
      this.showError('历史管理器未初始化');
      return;
    }

    try {
      const session = this.historyManager.getConversationById(sessionId);
      if (session) {
        this.selectSession(sessionId);
        if (this.onSessionSelect) {
          this.onSessionSelect(session);
        }
      } else {
        this.showError('会话不存在');
      }
    } catch (error) {
      this.showError('恢复会话失败');
    }
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId) {
    if (!this.historyManager) {
      this.showError('历史管理器未初始化');
      return;
    }

    try {
      await this.historyManager.deleteConversation(sessionId);
      this.loadSessions();
      this.showSuccess('会话已删除');
    } catch (error) {
      this.showError('删除会话失败');
    }
  }

  /**
   * 更新统计信息
   */
  updateStats(count, isFiltered = false) {
    const statsEl = document.getElementById('session-count');
    if (statsEl) {
      if (isFiltered) {
        statsEl.textContent = `找到 ${count} 个会话`;
      } else {
        statsEl.textContent = `共 ${count} 个会话`;
      }
    }
  }

  /**
   * 显示成功消息
   */
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  /**
   * 显示错误消息
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * 显示通知
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `session-notification session-notification-${type}`;
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
   * HTML 转义
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
   * MVP-1.3: 导出会话
   */
  exportSessions(format = 'json') {
    if (!this.historyManager) {
      this.showError('历史管理器未初始化');
      return;
    }

    try {
      const sessions = this.historyManager.getAllConversations();
      if (sessions.length === 0) {
        this.showError('没有会话可以导出');
        return;
      }

      if (!window.sessionExportImportManager) {
        this.showError('导出管理器未初始化');
        return;
      }

      let content, filename, mimeType;

      if (format === 'json') {
        const json = window.sessionExportImportManager.exportSessionsAsJSON(sessions);
        content = JSON.stringify(json, null, 2);
        filename = `claude-studio-sessions-${Date.now()}.json`;
        mimeType = 'application/json';
      } else if (format === 'markdown') {
        content = window.sessionExportImportManager.exportSessionsAsMarkdown(sessions);
        filename = `claude-studio-sessions-${Date.now()}.md`;
        mimeType = 'text/markdown';
      } else {
        this.showError('不支持的导出格式');
        return;
      }

      window.sessionExportImportManager.downloadFile(filename, content, mimeType);
      this.showSuccess(`✓ 已导出 ${sessions.length} 个会话 (${format.toUpperCase()})`);
    } catch (error) {
      this.showError('导出失败: ' + error.message);
    }
  }

  /**
   * MVP-1.3: 导入会话
   */
  importSessions() {
    const fileInput = document.getElementById('session-import-input');
    if (!fileInput) {
      this.showError('文件输入框未找到');
      return;
    }

    fileInput.click();
  }

  /**
   * MVP-1.3: 处理导入的文件
   */
  async handleImportFile(file) {
    if (!file) return;

    try {
      if (!window.sessionExportImportManager) {
        this.showError('导入管理器未初始化');
        return;
      }

      if (!this.historyManager) {
        this.showError('历史管理器未初始化');
        return;
      }

      // 读取文件
      const content = await window.sessionExportImportManager.readFile(file);

      let importedSessions = [];

      // 判断文件格式
      if (file.name.endsWith('.json')) {
        importedSessions = window.sessionExportImportManager.importSessionsFromJSON(content);
      } else if (file.name.endsWith('.md')) {
        importedSessions = window.sessionExportImportManager.importSessionsFromMarkdown(content);
      } else {
        this.showError('不支持的文件格式，请使用 .json 或 .md 文件');
        return;
      }

      if (importedSessions.length === 0) {
        this.showError('没有有效的会话可以导入');
        return;
      }

      // 确认导入
      const confirmMsg = `确定要导入 ${importedSessions.length} 个会话吗？`;
      if (!confirm(confirmMsg)) {
        return;
      }

      // 添加导入的会话
      let successCount = 0;
      importedSessions.forEach((session) => {
        try {
          this.historyManager.conversations.unshift(session);
          successCount++;
        } catch (error) {
          console.warn('⚠️ 导入会话失败:', error);
        }
      });

      // 保存
      this.historyManager.saveConversations();

      // 刷新列表
      this.loadSessions();

      this.showSuccess(`✓ 成功导入 ${successCount} 个会话`);
    } catch (error) {
      this.showError('导入失败: ' + error.message);
    }
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
  module.exports = SessionListComponent;
}

