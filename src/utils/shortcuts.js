/**
 * 快捷键管理工具
 */

class ShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  }

  /**
   * 注册快捷键
   * @param {string} keys - 快捷键组合，如 'Cmd+K', 'Ctrl+P'
   * @param {Function} callback - 回调函数
   * @param {string} description - 描述
   */
  register(keys, callback, description = '') {
    const normalizedKeys = this.normalizeKeys(keys);
    this.shortcuts.set(normalizedKeys, { callback, description });
  }

  /**
   * 标准化快捷键（处理 Mac/Win 差异）
   */
  normalizeKeys(keys) {
    let normalized = keys;
    
    // 替换 Cmd/Ctrl
    if (this.isMac) {
      normalized = normalized.replace(/CmdOrCtrl/g, 'Meta');
    } else {
      normalized = normalized.replace(/CmdOrCtrl/g, 'Ctrl');
    }
    
    return normalized.toLowerCase();
  }

  /**
   * 处理键盘事件
   */
  handleKeyEvent(event) {
    const keys = [];
    
    if (event.metaKey) keys.push('meta');
    if (event.ctrlKey) keys.push('ctrl');
    if (event.altKey) keys.push('alt');
    if (event.shiftKey) keys.push('shift');
    
    // 主键
    const mainKey = event.key.toLowerCase();
    if (!['meta', 'control', 'alt', 'shift'].includes(mainKey)) {
      keys.push(mainKey);
    }
    
    const keyCombo = keys.join('+');
    
    // 查找匹配的快捷键
    const shortcut = this.shortcuts.get(keyCombo);
    if (shortcut) {
      event.preventDefault();
      shortcut.callback(event);
      return true;
    }
    
    return false;
  }

  /**
   * 启动监听
   */
  listen() {
    document.addEventListener('keydown', (e) => {
      this.handleKeyEvent(e);
    });
  }

  /**
   * 获取所有快捷键
   */
  getAll() {
    return Array.from(this.shortcuts.entries()).map(([keys, { description }]) => ({
      keys,
      description
    }));
  }

  /**
   * 取消注册
   */
  unregister(keys) {
    const normalizedKeys = this.normalizeKeys(keys);
    this.shortcuts.delete(normalizedKeys);
  }

  /**
   * 清空所有快捷键
   */
  clear() {
    this.shortcuts.clear();
  }
}

module.exports = ShortcutManager;


