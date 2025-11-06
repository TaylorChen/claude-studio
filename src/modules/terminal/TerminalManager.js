/**
 * 终端管理模块
 * 负责集成 xterm.js 和 node-pty
 */

const store = require('../../store');

class TerminalManager {
  constructor() {
    this.terminals = new Map();  // terminalId -> { xterm, container }
    this.activeTerminalId = null;
    this.nextId = 1;
  }

  /**
   * 创建新终端
   * @param {HTMLElement} container - 容器元素
   * @returns {string} 终端 ID
   */
  async create(container) {
    const { Terminal } = require('xterm');
    const { FitAddon } = require('xterm-addon-fit');

    // 创建 xterm 实例
    const xterm = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      scrollback: 10000,
      rendererType: 'canvas'
    });

    // 添加自适应插件
    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    // 挂载到容器
    xterm.open(container);
    fitAddon.fit();

    // 监听窗口大小变化
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        // 通知主进程调整 pty 大小
        if (terminalId) {
          window.electronAPI.resizeTerminal(terminalId, xterm.cols, xterm.rows);
        }
      } catch (e) {
        console.error('终端自适应失败:', e);
      }
    });
    resizeObserver.observe(container);

    // 生成终端 ID
    const terminalId = `terminal-${this.nextId++}`;

    // 创建 PTY 进程（通过主进程）
    const ptyResult = await window.electronAPI.createTerminal(terminalId, {
      cols: xterm.cols,
      rows: xterm.rows
    });

    if (!ptyResult.success) {
      console.error('创建 PTY 失败:', ptyResult.error);
      return null;
    }

    // 监听 PTY 输出
    window.electronAPI.onTerminalData(terminalId, (data) => {
      xterm.write(data);
    });

    // 监听用户输入
    xterm.onData((data) => {
      window.electronAPI.writeToTerminal(terminalId, data);
    });

    // 保存终端实例
    this.terminals.set(terminalId, {
      xterm,
      container,
      fitAddon,
      resizeObserver
    });

    // 设置为活动终端
    this.activeTerminalId = terminalId;

    // 更新状态
    this.updateStore();

    return terminalId;
  }

  /**
   * 销毁终端
   * @param {string} terminalId - 终端 ID
   */
  async destroy(terminalId) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) return;

    // 清理资源
    terminal.resizeObserver.disconnect();
    terminal.xterm.dispose();

    // 关闭 PTY
    await window.electronAPI.closeTerminal(terminalId);

    // 从映射中移除
    this.terminals.delete(terminalId);

    // 如果是活动终端，切换到其他终端
    if (this.activeTerminalId === terminalId) {
      const remaining = Array.from(this.terminals.keys());
      this.activeTerminalId = remaining.length > 0 ? remaining[0] : null;
    }

    this.updateStore();
  }

  /**
   * 切换活动终端
   * @param {string} terminalId - 终端 ID
   */
  setActive(terminalId) {
    if (this.terminals.has(terminalId)) {
      this.activeTerminalId = terminalId;
      this.updateStore();
      
      // 聚焦终端
      const terminal = this.terminals.get(terminalId);
      if (terminal) {
        terminal.xterm.focus();
      }
    }
  }

  /**
   * 获取活动终端
   * @returns {object|null} 终端对象
   */
  getActive() {
    if (!this.activeTerminalId) return null;
    return this.terminals.get(this.activeTerminalId);
  }

  /**
   * 执行命令
   * @param {string} command - 命令
   * @param {string} terminalId - 终端 ID（可选，默认为活动终端）
   */
  execute(command, terminalId = this.activeTerminalId) {
    if (!terminalId) return;
    
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      // 发送命令并执行
      window.electronAPI.writeToTerminal(terminalId, command + '\r');
    }
  }

  /**
   * 清屏
   * @param {string} terminalId - 终端 ID（可选）
   */
  clear(terminalId = this.activeTerminalId) {
    if (!terminalId) return;
    
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      terminal.xterm.clear();
    }
  }

  /**
   * 分割终端（创建新终端）
   * @param {HTMLElement} container - 容器元素
   * @returns {Promise<string>} 新终端 ID
   */
  async split(container) {
    return await this.create(container);
  }

  /**
   * 切换终端可见性
   */
  toggleVisibility() {
    const visible = store.getState('ui.terminalVisible');
    store.setState('ui.terminalVisible', !visible);
  }

  /**
   * 获取所有终端 ID
   * @returns {Array<string>}
   */
  getAllTerminalIds() {
    return Array.from(this.terminals.keys());
  }

  /**
   * 更新 store
   */
  updateStore() {
    const instances = this.getAllTerminalIds().map(id => ({
      id,
      isActive: id === this.activeTerminalId
    }));

    store.batch(() => {
      store.setState('terminal.instances', instances);
      store.setState('terminal.activeTerminal', this.activeTerminalId);
    });
  }

  /**
   * 销毁所有终端
   */
  async destroyAll() {
    const ids = this.getAllTerminalIds();
    for (const id of ids) {
      await this.destroy(id);
    }
  }
}

module.exports = TerminalManager;


