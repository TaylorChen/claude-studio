/**
 * 标签页右键菜单组件
 * 为文件标签页提供 VS Code 风格的上下文菜单
 * 支持：关闭、关闭其他、分割、复制路径等操作
 */

class TabContextMenu {
  constructor(editorManager) {
    this.editorManager = editorManager;
    this.menuElement = null;
    this.currentTab = null;
    this.currentPath = null;
  }

  /**
   * 显示右键菜单
   * @param {string} tabPath - 标签页对应的文件路径
   * @param {MouseEvent} event - 右键点击事件
   */
  show(tabPath, event) {
    event.preventDefault();
    event.stopPropagation();

    this.currentPath = tabPath;
    this.currentTab = this.editorManager.openTabs.find(tab => tab.path === tabPath);

    if (!this.currentTab) {
      console.warn('⚠️ 找不到标签页:', tabPath);
      return;
    }

    // 获取或创建菜单容器
    if (this.menuElement) {
      this.menuElement.remove();
    }

    this.menuElement = this.createMenuElement();
    document.body.appendChild(this.menuElement);

    // 定位菜单
    const x = event.clientX;
    const y = event.clientY;

    // 确保菜单不超出视口
    const menuRect = this.menuElement.getBoundingClientRect();
    const adjustX = x + menuRect.width > window.innerWidth ? x - menuRect.width : x;
    const adjustY = y + menuRect.height > window.innerHeight ? y - menuRect.height : y;

    this.menuElement.style.left = Math.max(0, adjustX) + 'px';
    this.menuElement.style.top = Math.max(0, adjustY) + 'px';

    // 绑定事件
    this.attachMenuEvents();

    // 点击外部关闭菜单
    setTimeout(() => {
      document.addEventListener('click', () => this.hide(), { once: true });
      document.addEventListener('contextmenu', () => this.hide(), { once: true });
    }, 100);
  }

  /**
   * 创建菜单 DOM 元素
   */
  createMenuElement() {
    const menu = document.createElement('div');
    menu.className = 'tab-context-menu';
    menu.style.cssText = `
      position: fixed;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      min-width: 220px;
      font-size: 13px;
    `;

    const menuHTML = this.getMenuHTML();
    menu.innerHTML = menuHTML;

    return menu;
  }

  /**
   * 获取菜单 HTML
   */
  getMenuHTML() {
    const tab = this.currentTab;
    const fileName = tab.name;
    const isDirty = tab.isDirty;
    const isActive = tab.isActive;

    return `
      <!-- 关闭操作 -->
      <div class="tab-menu-section">
        <div class="tab-menu-item" data-action="close" title="关闭此标签">
          <span class="tab-menu-label">关闭</span>
          <span class="tab-menu-shortcut">⌘W</span>
        </div>
        <div class="tab-menu-item" data-action="closeOthers" title="关闭其他标签">
          <span class="tab-menu-label">关闭其他</span>
          <span class="tab-menu-shortcut">⌘⇧T</span>
        </div>
        <div class="tab-menu-item" data-action="closeRight" title="关闭右侧标签">
          <span class="tab-menu-label">关闭右侧</span>
        </div>
        <div class="tab-menu-item" data-action="closeAll" title="关闭所有">
          <span class="tab-menu-label">关闭全部</span>
          <span class="tab-menu-shortcut">⌘⇧W</span>
        </div>
      </div>

      <!-- 分割符 -->
      <div class="tab-menu-separator"></div>

      <!-- 复制操作 -->
      <div class="tab-menu-section">
        <div class="tab-menu-item" data-action="copyPath" title="复制完整路径">
          <span class="tab-menu-label">复制路径</span>
          <span class="tab-menu-shortcut">⌘⇧C</span>
        </div>
        <div class="tab-menu-item" data-action="copyRelativePath" title="复制相对路径">
          <span class="tab-menu-label">复制相对路径</span>
        </div>
      </div>

      <!-- 分割符 -->
      <div class="tab-menu-separator"></div>

      <!-- 分割操作 -->
      <div class="tab-menu-section">
        <div class="tab-menu-item" data-action="splitUp" title="向上分割">
          <span class="tab-menu-label">上下分割</span>
          <span class="tab-menu-shortcut">⌘⇧↑</span>
        </div>
        <div class="tab-menu-item" data-action="splitDown" title="向下分割">
          <span class="tab-menu-label">下方分割</span>
          <span class="tab-menu-shortcut">⌘⇧↓</span>
        </div>
        <div class="tab-menu-item" data-action="splitLeft" title="左侧分割">
          <span class="tab-menu-label">左侧分割</span>
          <span class="tab-menu-shortcut">⌘⇧←</span>
        </div>
        <div class="tab-menu-item" data-action="splitRight" title="右侧分割">
          <span class="tab-menu-label">右侧分割</span>
          <span class="tab-menu-shortcut">⌘⇧→</span>
        </div>
      </div>

      <!-- 分割符 -->
      <div class="tab-menu-separator"></div>

      <!-- 其他操作 -->
      <div class="tab-menu-section">
        <div class="tab-menu-item" data-action="pin" ${isActive ? '' : 'style="opacity: 0.5; cursor: not-allowed;"'} title="固定此标签">
          <span class="tab-menu-label">📌 固定标签</span>
        </div>
        <div class="tab-menu-item" data-action="reopenClosed" title="重新打开已关闭的文件">
          <span class="tab-menu-label">重新打开</span>
          <span class="tab-menu-shortcut">⌘⇧T</span>
        </div>
      </div>

      <!-- 分割符 -->
      <div class="tab-menu-separator"></div>

      <!-- 文件操作 -->
      <div class="tab-menu-section">
        <div class="tab-menu-item" data-action="revealFinder" title="在 Finder 中显示">
          <span class="tab-menu-label">在 Finder 中显示</span>
        </div>
        <div class="tab-menu-item" data-action="showInExplorer" title="在文件树中定位">
          <span class="tab-menu-label">在文件树中定位</span>
        </div>
      </div>
    `;
  }

  /**
   * 绑定菜单事件处理
   */
  attachMenuEvents() {
    const menuItems = this.menuElement.querySelectorAll('.tab-menu-item');

    menuItems.forEach(item => {
      // 跳过禁用项
      if (item.style.opacity === '0.5') {
        return;
      }

      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = 'var(--bg-hover)';
      });

      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
      });

      item.addEventListener('click', (e) => {
        e.preventDefault();
        const action = item.dataset.action;
        this.executeAction(action);
        this.hide();
      });
    });
  }

  /**
   * 执行菜单操作
   * @param {string} action - 操作名称
   */
  executeAction(action) {
    console.log(`执行菜单操作: ${action}`, this.currentPath);

    switch (action) {
      // ===== 关闭操作 =====
      case 'close':
        this.editorManager.closeTab(this.currentPath);
        break;

      case 'closeOthers':
        this.closeOthers();
        break;

      case 'closeRight':
        this.closeRight();
        break;

      case 'closeAll':
        this.editorManager.openTabs.forEach(tab => {
          this.editorManager.closeTab(tab.path);
        });
        break;

      // ===== 复制操作 =====
      case 'copyPath':
        this.copyToClipboard(this.currentPath);
        this.showNotification(`✓ 已复制路径`);
        break;

      case 'copyRelativePath':
        const relativePath = this.getRelativePath(this.currentPath);
        this.copyToClipboard(relativePath);
        this.showNotification(`✓ 已复制相对路径`);
        break;

      // ===== 分割操作 =====
      case 'splitUp':
      case 'splitDown':
      case 'splitLeft':
      case 'splitRight':
        this.showNotification(`⚠️ 分割功能开发中...`);
        break;

      // ===== 其他操作 =====
      case 'pin':
        this.pinTab();
        break;

      case 'reopenClosed':
        this.showNotification(`⚠️ 重新打开功能开发中...`);
        break;

      case 'revealFinder':
        this.revealInFinder();
        break;

      case 'showInExplorer':
        this.showInExplorer();
        break;

      default:
        console.warn('未知操作:', action);
    }
  }

  /**
   * 关闭其他标签
   */
  closeOthers() {
    const tabsToClose = this.editorManager.openTabs.filter(tab => tab.path !== this.currentPath);
    tabsToClose.forEach(tab => {
      this.editorManager.closeTab(tab.path);
    });
    this.showNotification(`✓ 已关闭其他标签`);
  }

  /**
   * 关闭右侧标签
   */
  closeRight() {
    const currentIndex = this.editorManager.openTabs.findIndex(tab => tab.path === this.currentPath);
    if (currentIndex === -1) return;

    const tabsToClose = this.editorManager.openTabs.slice(currentIndex + 1);
    tabsToClose.forEach(tab => {
      this.editorManager.closeTab(tab.path);
    });
    this.showNotification(`✓ 已关闭右侧标签`);
  }

  /**
   * 固定标签
   */
  pinTab() {
    if (!this.currentTab) return;

    this.currentTab.pinned = !this.currentTab.pinned;
    this.editorManager.renderTabs();

    const message = this.currentTab.pinned ? '✓ 已固定' : '✓ 已取消固定';
    this.showNotification(message);
  }

  /**
   * 在 Finder 中显示
   */
  revealInFinder() {
    // 调用主进程显示文件
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('show-item-in-folder', this.currentPath);
      this.showNotification('✓ 已在 Finder 中打开');
    } else {
      console.warn('⚠️ 无法调用系统文件浏览器');
    }
  }

  /**
   * 在文件树中显示
   */
  showInExplorer() {
    // 定位到文件树
    if (window.fileManager) {
      window.fileManager.expandAndSelect(this.currentPath);
      this.showNotification('✓ 已在文件树中定位');
    }
  }

  /**
   * 复制到剪贴板
   * @param {string} text - 要复制的文本
   */
  copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(err => {
      });
    }
  }

  /**
   * 获取相对路径
   * @param {string} fullPath - 完整路径
   * @returns {string} 相对路径
   */
  getRelativePath(fullPath) {
    const projectPath = window.store?.getState('editor.projectPath') || '/';
    if (fullPath.startsWith(projectPath)) {
      return fullPath.substring(projectPath.length).replace(/^\//, '');
    }
    return fullPath;
  }

  /**
   * 显示通知
   * @param {string} message - 消息内容
   */
  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'tab-menu-notification';
    notification.style.cssText = `
      position: fixed;
      top: 50px;
      right: 20px;
      background: var(--bg-tertiary);
      color: var(--text-primary);
      padding: 10px 16px;
      border-radius: 4px;
      border: 1px solid var(--border-color);
      z-index: 10001;
      font-size: 12px;
      animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * 隐藏菜单
   */
  hide() {
    if (this.menuElement) {
      this.menuElement.remove();
      this.menuElement = null;
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TabContextMenu;
}

