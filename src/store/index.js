/**
 * 简单的状态管理系统
 * 使用发布-订阅模式
 */

class Store {
  constructor() {
    this.state = {
      // 编辑器状态
      editor: {
        activeFile: null,
        openFiles: [],  // { path, content, language, isDirty }
        selection: null,
        cursorPosition: null
      },
      
      // AI 状态
      ai: {
        conversations: [],  // { id, messages }
        isProcessing: false,
        currentSuggestion: null,
        inlineEditMode: false
      },
      
      // 文件管理状态
      files: {
        projectPath: null,
        fileTree: null,
        searchResults: [],
        recentFiles: []
      },
      
      // 终端状态
      terminal: {
        instances: [],  // { id, pty }
        activeTerminal: null
      },
      
      // UI 状态
      ui: {
        sidebarVisible: true,
        sidebarWidth: 250,
        aiPanelVisible: false,
        aiPanelWidth: 400,
        terminalVisible: true,
        terminalHeight: 200,
        theme: 'dark',
        commandPaletteVisible: false
      }
    };
    
    this.listeners = new Map();
  }

  /**
   * 获取状态
   * @param {string} path - 状态路径，如 'editor.activeFile'
   * @returns {*} 状态值
   */
  getState(path) {
    if (!path) return this.state;
    return path.split('.').reduce((obj, key) => obj?.[key], this.state);
  }

  /**
   * 设置状态
   * @param {string} path - 状态路径
   * @param {*} value - 新值
   */
  setState(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => obj[key], this.state);
    
    const oldValue = target[lastKey];
    target[lastKey] = value;
    
    // 通知监听者
    this.notify(path, value, oldValue);
  }

  /**
   * 更新状态（合并对象）
   * @param {string} path - 状态路径
   * @param {object} updates - 要合并的更新
   */
  updateState(path, updates) {
    const current = this.getState(path);
    if (typeof current === 'object' && current !== null) {
      this.setState(path, { ...current, ...updates });
    } else {
      this.setState(path, updates);
    }
  }

  /**
   * 订阅状态变化
   * @param {string} path - 状态路径
   * @param {Function} callback - 回调函数 (newValue, oldValue) => void
   * @returns {Function} 取消订阅函数
   */
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, []);
    }
    this.listeners.get(path).push(callback);
    
    // 返回取消订阅函数
    return () => {
      const callbacks = this.listeners.get(path);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * 通知监听者
   * @param {string} path - 状态路径
   * @param {*} newValue - 新值
   * @param {*} oldValue - 旧值
   */
  notify(path, newValue, oldValue) {
    // 精确匹配
    const exactListeners = this.listeners.get(path) || [];
    exactListeners.forEach(callback => callback(newValue, oldValue));
    
    // 通知父路径监听者（如 'editor' 会收到 'editor.activeFile' 的变化）
    const parts = path.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('.');
      const parentListeners = this.listeners.get(parentPath) || [];
      parentListeners.forEach(callback => callback(this.getState(parentPath)));
    }
  }

  /**
   * 批量更新（减少通知次数）
   * @param {Function} updater - 更新函数
   */
  batch(updater) {
    const originalNotify = this.notify;
    const notifications = [];
    
    // 暂时收集通知
    this.notify = (path, newValue, oldValue) => {
      notifications.push({ path, newValue, oldValue });
    };
    
    updater();
    
    // 恢复通知并批量发送
    this.notify = originalNotify;
    notifications.forEach(({ path, newValue, oldValue }) => {
      this.notify(path, newValue, oldValue);
    });
  }
}

// 导出单例
const store = new Store();
module.exports = store;


