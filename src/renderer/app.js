/**
 * Claude Studio - 渲染进程（浏览器兼容版本）
 * 所有代码内联，不使用 CommonJS require
 */

(function() {
  'use strict';

  // ==================== Toast 通知系统 ====================
  class ToastManager {
    constructor() {
      this.container = null;
      this.init();
    }

    init() {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 3000) {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      
      const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
      };
      
      toast.style.cssText = `
        padding: 12px 20px;
        margin-bottom: 10px;
        border-radius: 4px;
        background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44aa44' : '#4444aa'};
        color: white;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        pointer-events: auto;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
        word-wrap: break-word;
      `;
      
      toast.textContent = `${icons[type] || ''} ${message}`;
      this.container.appendChild(toast);

      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
  }

  const toast = new ToastManager();

  // ==================== 状态管理 ====================
  class Store {
    constructor() {
      this.state = {
        editor: {
          activeFile: null,
          openFiles: [],
          selection: null,
          cursorPosition: null
        },
        ai: {
          conversations: [],
          isProcessing: false,
          currentSuggestion: null,
          inlineEditMode: false
        },
        files: {
          projectPath: null,
          fileTree: null,
          searchResults: [],
          recentFiles: []
        },
        terminal: {
          instances: [],
          activeTerminal: null
        },
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

    getState(path) {
      if (!path) return this.state;
      return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }

    setState(path, value) {
      const keys = path.split('.');
      const lastKey = keys.pop();
      const target = keys.reduce((obj, key) => obj[key], this.state);
      const oldValue = target[lastKey];
      target[lastKey] = value;
      this.notify(path, value, oldValue);
    }

    subscribe(path, callback) {
      if (!this.listeners.has(path)) {
        this.listeners.set(path, []);
      }
      this.listeners.get(path).push(callback);
      return () => {
        const callbacks = this.listeners.get(path);
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      };
    }

    notify(path, newValue, oldValue) {
      const exactListeners = this.listeners.get(path) || [];
      exactListeners.forEach(callback => callback(newValue, oldValue));
    }
  }

  const store = new Store();

  // ==================== 编辑器管理器 ====================
  class EditorManager {
    constructor() {
      this.monaco = null;
      this.editor = null;
      this.models = new Map();
      this.viewStates = new Map();
      this.openTabs = []; // 打开的标签列表
      this.tabsContainer = null; // 标签栏容器
    }

    async init(container) {
      // 使用 AMD require 加载 Monaco Editor
      await new Promise((resolve, reject) => {
        // 确保 AMD loader 已加载
        if (typeof require === 'undefined') {
          reject(new Error('Monaco Editor loader not found'));
          return;
        }
        
        require(['vs/editor/editor.main'], () => {
          resolve();
        }, (error) => {
          console.error('❌ Monaco Editor 加载失败:', error);
          reject(error);
        });
      });

      this.monaco = window.monaco;

      this.editor = this.monaco.editor.create(container, {
        theme: 'vs-dark',
        fontSize: 14,
        fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
        automaticLayout: true,
        minimap: { enabled: true }
      });

      // 设置状态栏更新
      this.setupStatusBar();

      // 初始化标签栏
      this.tabsContainer = document.getElementById('tabs-bar');
      if (this.tabsContainer) {
      }

    }

    setupStatusBar() {
      // 监听光标位置变化
      this.editor.onDidChangeCursorPosition((e) => {
        const position = e.position;
        const statusPosition = document.getElementById('status-position');
        if (statusPosition) {
          statusPosition.textContent = `Ln ${position.lineNumber}, Col ${position.column}`;
        }
      });

      // 监听模型变化（切换文件时）
      this.editor.onDidChangeModel(() => {
        const model = this.editor.getModel();
        if (model) {
          const language = model.getLanguageId() || 'plaintext';
          const statusLanguage = document.getElementById('status-language');
          if (statusLanguage) {
            const langMap = {
              'javascript': 'JavaScript',
              'typescript': 'TypeScript',
              'html': 'HTML',
              'css': 'CSS',
              'json': 'JSON',
              'markdown': 'Markdown',
              'python': 'Python'
            };
            statusLanguage.textContent = langMap[language] || language.toUpperCase();
          }
        }
      });

    }

    openFile(filePath, content, language) {
      const currentFile = store.getState('editor.activeFile');
      if (currentFile && this.editor.getModel()) {
        this.viewStates.set(currentFile, this.editor.saveViewState());
      }

      let model = this.models.get(filePath);
      if (!model) {
        const uri = this.monaco.Uri.file(filePath);
        model = this.monaco.editor.createModel(content, language, uri);
        this.models.set(filePath, model);
      }

      this.editor.setModel(model);

      const viewState = this.viewStates.get(filePath);
      if (viewState) {
        this.editor.restoreViewState(viewState);
      }

      store.setState('editor.activeFile', filePath);
      
      // 添加标签
      this.addTab(filePath);
      
      this.editor.focus();
    }

    addTab(filePath) {
      // 如果标签已存在，只激活它
      const existingTab = this.openTabs.find(tab => tab.path === filePath);
      if (existingTab) {
        this.activateTab(filePath);
        return;
      }

      // 添加新标签
      const fileName = filePath.split('/').pop();
      this.openTabs.push({
        path: filePath,
        name: fileName,
        isDirty: false
      });

      this.renderTabs();
      this.activateTab(filePath);
      
    }

    activateTab(filePath) {
      // 更新激活状态
      this.openTabs.forEach(tab => tab.isActive = (tab.path === filePath));
      this.renderTabs();
    }

    closeTab(filePath, event) {
      if (event) {
        event.stopPropagation();
      }

      const index = this.openTabs.findIndex(tab => tab.path === filePath);
      if (index === -1) return;

      const tab = this.openTabs[index];
      
      // 如果是当前活跃的标签，需要切换到另一个标签
      if (tab.isActive && this.openTabs.length > 1) {
        // 优先切换到右边的标签，如果没有则切换到左边
        const newIndex = index < this.openTabs.length - 1 ? index + 1 : index - 1;
        const newTab = this.openTabs[newIndex];
        
        // 切换编辑器模型
        const model = this.models.get(newTab.path);
        if (model) {
          this.editor.setModel(model);
          const viewState = this.viewStates.get(newTab.path);
          if (viewState) {
            this.editor.restoreViewState(viewState);
          }
          store.setState('editor.activeFile', newTab.path);
        }
      }

      // 移除标签
      this.openTabs.splice(index, 1);
      
      // 清理模型和视图状态
      const model = this.models.get(filePath);
      if (model) {
        model.dispose();
        this.models.delete(filePath);
      }
      this.viewStates.delete(filePath);

      // 如果没有打开的标签了，清空编辑器
      if (this.openTabs.length === 0) {
        this.editor.setModel(null);
        store.setState('editor.activeFile', null);
      }

      this.renderTabs();
      
      const fileName = filePath.split('/').pop();
      toast.show(`已关闭: ${fileName}`, 'info', 1500);
    }

    switchTab(filePath) {
      const model = this.models.get(filePath);
      if (!model) {
        console.warn('⚠️ 标签对应的模型不存在:', filePath);
        return;
      }

      // 保存当前文件的视图状态
      const currentFile = store.getState('editor.activeFile');
      if (currentFile && this.editor.getModel()) {
        this.viewStates.set(currentFile, this.editor.saveViewState());
      }

      // 切换模型
      this.editor.setModel(model);

      // 恢复视图状态
      const viewState = this.viewStates.get(filePath);
      if (viewState) {
        this.editor.restoreViewState(viewState);
      }

      store.setState('editor.activeFile', filePath);
      this.activateTab(filePath);
      this.editor.focus();

      const fileName = filePath.split('/').pop();
    }

    renderTabs() {
      if (!this.tabsContainer) return;

      this.tabsContainer.innerHTML = '';

      this.openTabs.forEach(tab => {
        const tabElement = document.createElement('div');
        tabElement.className = `tab-item ${tab.isActive ? 'active' : ''}`;
        tabElement.dataset.path = tab.path;

        // 文件类型图标
        const ext = tab.name.split('.').pop().toLowerCase();
        const iconMap = {
          'js': '📜',
          'ts': '🔷',
          'jsx': '⚛️',
          'tsx': '⚛️',
          'html': '🌐',
          'css': '🎨',
          'json': '📋',
          'md': '📝',
          'py': '🐍',
          'txt': '📄'
        };
        const icon = iconMap[ext] || '📄';

        tabElement.innerHTML = `
          <span class="tab-icon">${icon}</span>
          <span class="tab-name">${tab.name}</span>
          ${tab.isDirty ? '<span class="tab-dirty">●</span>' : ''}
          <span class="tab-close">×</span>
        `;

        // 点击标签切换文件
        tabElement.addEventListener('click', (e) => {
          if (!e.target.classList.contains('tab-close')) {
            this.switchTab(tab.path);
          }
        });

        // 点击关闭按钮
        const closeBtn = tabElement.querySelector('.tab-close');
        closeBtn.addEventListener('click', (e) => {
          this.closeTab(tab.path, e);
        });

        this.tabsContainer.appendChild(tabElement);
      });

    }

    async save() {
      const content = this.editor.getValue();
      const activeFile = store.getState('editor.activeFile');
      if (activeFile && window.electronAPI) {
        const result = await window.electronAPI.writeFile(activeFile, content);
        return result.success;
      }
      return false;
    }

    getSelection() {
      const selection = this.editor.getSelection();
      if (selection && !selection.isEmpty()) {
        return this.editor.getModel().getValueInRange(selection);
      }
      return '';
    }

    getActiveFilePath() {
      return store.getState('editor.activeFile') || null;
    }

    getActiveLanguage() {
      const model = this.editor?.getModel();
      return model ? model.getLanguageId() : null;
    }
  }

  // ==================== AI 服务 ====================
  class AIService {
    async chat(message) {
      store.setState('ai.isProcessing', true);
      try {
        if (!window.electronAPI) {
          throw new Error('Electron API 未加载');
        }
        const result = await window.electronAPI.sendCommand(message);
        store.setState('ai.isProcessing', false);
        if (result.success) {
          return { response: result.response };
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        store.setState('ai.isProcessing', false);
        throw error;
      }
    }

    async inlineEdit(selectedText, instruction) {
      const prompt = `你是代码编辑助手。用户选中了代码：\n\`\`\`\n${selectedText}\n\`\`\`\n\n指令："${instruction}"\n\n请直接返回修改后的代码。`;
      store.setState('ai.isProcessing', true);
      try {
        const result = await window.electronAPI.sendCommand(prompt);
        store.setState('ai.isProcessing', false);
        if (result.success) {
          return result.response;
        }
        throw new Error(result.error);
      } catch (error) {
        store.setState('ai.isProcessing', false);
        throw error;
      }
    }
  }

  // ==================== 终端管理器 ====================
  class TerminalManager {
    constructor() {
      this.terminals = new Map(); // terminalId -> { xterm, fitAddon }
      this.activeTerminalId = null;
      this.terminalCounter = 0;
    }

    async init() {
      // 等待 xterm 库加载（最多等待 5 秒）
      let attempts = 0;
      while (typeof Terminal === 'undefined' && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (typeof Terminal === 'undefined') {
        console.error('❌ xterm 库加载超时');
        return false;
      }
      
      console.log('✅ xterm 库已就绪');

      // 创建默认终端
      await this.createTerminal();
      return true;
    }

    async createTerminal() {
      const terminalId = `terminal-${++this.terminalCounter}`;
      const container = document.getElementById('terminal-container');
      
      if (!container) {
        console.error('❌ 终端容器不存在');
        return null;
      }

      // 创建 xterm 实例
      const xterm = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", "Courier New", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
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
        scrollback: 1000,
        allowTransparency: false
      });

      // 创建 fit addon
      const fitAddon = new FitAddon();
      xterm.loadAddon(fitAddon);

      // 清空容器并挂载
      container.innerHTML = '';
      xterm.open(container);
      
      // 调整大小以适应容器
      setTimeout(() => {
        fitAddon.fit();
      }, 0);

      // 监听窗口大小变化
      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
        this.resizeTerminalPty(terminalId, xterm.cols, xterm.rows);
      });
      resizeObserver.observe(container);

      // 保存终端实例
      this.terminals.set(terminalId, {
        xterm,
        fitAddon,
        resizeObserver
      });
      this.activeTerminalId = terminalId;

      // 通知主进程创建 PTY
      const result = await window.electronAPI.createTerminal(terminalId, {
        cols: xterm.cols,
        rows: xterm.rows
      });

      if (!result.success) {
        console.error('❌ 创建终端失败:', result.error);
        xterm.writeln('\x1b[1;31m终端创建失败: ' + result.error + '\x1b[0m');
        return null;
      }

      // 监听来自主进程的数据
      window.electronAPI.onTerminalData(terminalId, (data) => {
        xterm.write(data);
      });

      window.electronAPI.onTerminalExit(terminalId, () => {
        xterm.writeln('\r\n\x1b[1;33m终端进程已退出\x1b[0m');
      });

      // 监听用户输入
      xterm.onData((data) => {
        window.electronAPI.writeToTerminal(terminalId, data);
      });

      console.log('✅ 终端创建成功:', terminalId);
      return terminalId;
    }

    async resizeTerminalPty(terminalId, cols, rows) {
      if (window.electronAPI && window.electronAPI.resizeTerminal) {
        await window.electronAPI.resizeTerminal(terminalId, cols, rows);
      }
    }

    async closeTerminal(terminalId) {
      const terminal = this.terminals.get(terminalId);
      if (terminal) {
        terminal.resizeObserver.disconnect();
        terminal.xterm.dispose();
        this.terminals.delete(terminalId);
        
        if (window.electronAPI && window.electronAPI.closeTerminal) {
          await window.electronAPI.closeTerminal(terminalId);
        }
      }
    }

    async closeAllTerminals() {
      for (const terminalId of this.terminals.keys()) {
        await this.closeTerminal(terminalId);
      }
    }
  }

  // ==================== 文件管理器 ====================
  class FileManager {
    constructor() {
      this.projectPath = null;
      this.fileTree = null;
      this.treeContainer = null; // 保存树容器的引用
    }

    async openProject() {
      if (!window.electronAPI) return false;
      const result = await window.electronAPI.openProjectDialog();
      if (result.success) {
        this.projectPath = result.projectPath;
        store.setState('files.projectPath', this.projectPath);
        
        // 提取项目名称
        const projectName = this.projectPath.split('/').pop();
        
        // 更新侧边栏标题显示项目名称
        const sidebarHeader = document.querySelector('.sidebar-header span');
        if (sidebarHeader) {
          sidebarHeader.textContent = projectName;
        }
        
        // 更新状态栏显示项目路径
        const statusProject = document.getElementById('status-project');
        if (statusProject) {
          statusProject.textContent = projectName;
        }
        
        // 加载文件树（传入项目名称）
        await this.loadFileTree(projectName);
        return true;
      }
      return false;
    }

    async loadFileTree(projectName) {
      if (!window.electronAPI) return;
      const result = await window.electronAPI.listFiles();
      if (result.success) {
        
        // 按路径排序，确保父目录在子目录之前
        result.files.sort((a, b) => {
          const aDepth = a.path.split('/').length;
          const bDepth = b.path.split('/').length;
          if (aDepth !== bDepth) return aDepth - bDepth;
          return a.path.localeCompare(b.path);
        });
        
        
        // 传入项目名称构建树
        const tree = this.buildTree(result.files, projectName);
        this.fileTree = tree;
        store.setState('files.fileTree', tree);
        
      }
    }

    buildTree(files, projectName) {
      const nodeMap = new Map();
      const topLevelNodes = [];


      // 构建树形结构
      files.forEach((file, index) => {
        const node = {
          name: file.name,
          path: file.path,
          type: file.type,
          children: file.type === 'directory' ? [] : undefined,
          isExpanded: false
        };
        
        nodeMap.set(file.path, node);

        const parts = file.path.split('/');
        if (parts.length === 1) {
          // 顶层节点
          topLevelNodes.push(node);
        } else {
          // 子节点，找到父节点并添加
          const parentPath = parts.slice(0, -1).join('/');
          const parent = nodeMap.get(parentPath);
          if (parent && parent.children) {
            parent.children.push(node);
          } else {
            console.warn(`  [${index}] ⚠️ 找不到父节点: ${parentPath} (子: ${file.path})`);
          }
        }
      });

      
      // 排序函数：目录在前，文件在后，同类型按名称排序
      const sortNodes = (nodes) => {
        return nodes.sort((a, b) => {
          // 目录优先
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          // 同类型按名称排序
          return a.name.localeCompare(b.name);
        });
      };
      
      // 递归排序所有节点的子节点
      const sortChildren = (nodes) => {
        nodes.forEach(node => {
          if (node.children && node.children.length > 0) {
            sortNodes(node.children);
            sortChildren(node.children);
          }
        });
      };
      
      // 排序顶层节点
      sortNodes(topLevelNodes);
      // 递归排序所有子节点
      sortChildren(topLevelNodes);
      
      
      // 创建项目根节点
      const finalProjectName = projectName || this.projectPath?.split('/').pop() || 'claude-studio';
      const rootNode = {
        name: finalProjectName,
        path: '', // 根节点路径为空字符串
        type: 'directory',
        children: topLevelNodes,
        isExpanded: true, // 默认展开
        isRoot: true // 标记为根节点
      };
      
      
      return [rootNode];
    }

    renderTree(container, tree = this.fileTree, level = 0) {
      if (!tree) return;
      
      // 保存根容器的引用
      if (level === 0) {
        this.treeContainer = container;
        container.innerHTML = '';
      }

      tree.forEach(node => {

        // 创建节点项
        const item = document.createElement('div');
        item.className = node.isRoot ? 'file-tree-item file-tree-root' : 'file-tree-item';
        item.style.paddingLeft = `${level * 16 + 8}px`;
        item.dataset.path = node.path;
        
        // 根节点添加特殊样式
        if (node.isRoot) {
          item.style.fontWeight = 'bold';
        }

        // 图标：根据类型和状态显示不同图标
        let icon;
        if (node.isRoot) {
          // 项目根节点使用特殊图标
          icon = node.isExpanded ? '📂' : '📁';
        } else if (node.type === 'directory') {
          icon = node.isExpanded ? '📂' : '📁';
        } else {
          icon = '📄';
        }

        item.innerHTML = `
          <span class="file-icon">${icon}</span>
          <span class="file-name">${node.name}</span>
        `;

        // 点击事件
        item.addEventListener('click', async (e) => {
          e.stopPropagation();
          
          if (node.type === 'directory' || node.isRoot) {
            // 切换展开状态（目录或根节点）
            node.isExpanded = !node.isExpanded;
            const nodeType = node.isRoot ? '项目根' : '目录';
            if (node.children && node.children.length > 0) {
            }
            // 重新渲染整个树（使用根容器）
            this.refreshTree();
          } else {
            // 打开文件
            await this.openFile(node.path);
          }
        });

        // 右键菜单事件
        item.addEventListener('contextmenu', (e) => {
          console.log('🖱️ 右键点击文件树项目:', node.name);
          e.preventDefault();
          e.stopPropagation();
          this.showContextMenu(e, node);
        });

        container.appendChild(item);

        // 如果是展开的目录或根节点，递归渲染子节点
        if ((node.type === 'directory' || node.isRoot) && node.isExpanded && node.children && node.children.length > 0) {
          this.renderTree(container, node.children, level + 1);
        }
      });
      
      if (level === 0) {
      }
    }

    async openFile(filePath) {
      if (!window.electronAPI) return;
      const result = await window.electronAPI.readFile(filePath);
      if (result.success) {
        const ext = filePath.split('.').pop();
        const language = this.getLanguageFromExtension(ext);
        window.dispatchEvent(new CustomEvent('file:open', {
          detail: { path: filePath, content: result.content, language }
        }));
      }
    }

    getLanguageFromExtension(ext) {
      const map = {
        'js': 'javascript', 'jsx': 'javascript',
        'ts': 'typescript', 'tsx': 'typescript',
        'html': 'html', 'css': 'css',
        'json': 'json', 'md': 'markdown',
        'py': 'python', 'go': 'go'
      };
      return map[ext] || 'plaintext';
    }

    refreshTree() {
      // 使用保存的根容器引用
      if (this.treeContainer) {
        this.renderTree(this.treeContainer, this.fileTree, 0);
      }
    }

    /**
     * 显示右键菜单
     */
    showContextMenu(event, node) {
      console.log('📋 显示右键菜单，节点类型:', node.type, '路径:', node.path);
      
      // 移除之前的菜单
      const existingMenu = document.getElementById('file-context-menu');
      if (existingMenu) {
        existingMenu.remove();
      }

      // 只对文件显示完整菜单
      if (node.type === 'directory' || node.isRoot) {
        console.log('⚠️ 目录不显示菜单，跳过');
        return;
      }

      // 创建菜单容器
      const menu = document.createElement('div');
      menu.id = 'file-context-menu';
      menu.className = 'context-menu';
      menu.style.cssText = `
        position: fixed;
        left: ${event.pageX}px;
        top: ${event.pageY}px;
        background: var(--bg-tertiary, #2d2d30);
        border: 1px solid var(--border-color, #3e3e42);
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        z-index: 10000;
        min-width: 220px;
        padding: 8px 0;
      `;

      // 菜单项数据
      const menuItems = [
        {
          label: 'Add File to Claude Chat',
          icon: '💬',
          action: () => this.addToClaudeChat(node, false),
          className: 'menu-item-claude'
        },
        {
          label: 'Add File to New Claude Chat',
          icon: '✨',
          action: () => this.addToClaudeChat(node, true),
          className: 'menu-item-claude'
        },
        { divider: true },
        {
          label: 'Add as Attachment',
          icon: '📎',
          action: () => this.addFileAsAttachment(node),
          className: 'menu-item-attachment'
        },
        {
          label: 'Add as Attachment (New Chat)',
          icon: '📎✨',
          action: () => this.addFileAsAttachmentNew(node),
          className: 'menu-item-attachment'
        },
        {
          label: 'Add as Image Attachment',
          icon: '🖼️',
          action: () => this.addFileAsAttachmentImage(node),
          className: 'menu-item-attachment'
        },
        { divider: true },
        {
          label: 'Copy Path',
          icon: '📋',
          action: () => this.copyPath(node.path)
        },
        {
          label: 'Copy Relative Path',
          icon: '📌',
          action: () => this.copyRelativePath(node.path)
        },
        { divider: true },
        {
          label: 'Reveal in Finder',
          icon: '📂',
          action: () => this.revealInFinder(node.path)
        }
      ];

      // 创建菜单项
      menuItems.forEach((item) => {
        if (item.divider) {
          const divider = document.createElement('div');
          divider.style.cssText = `
            height: 1px;
            background: var(--border-color, #3e3e42);
            margin: 4px 0;
          `;
          menu.appendChild(divider);
        } else {
          const menuItem = document.createElement('div');
          menuItem.className = `menu-item ${item.className || ''}`;
          menuItem.style.cssText = `
            padding: 8px 12px;
            cursor: pointer;
            color: var(--text-primary, #cccccc);
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            transition: background 0.15s ease;
            user-select: none;
          `;

          menuItem.innerHTML = `
            <span style="font-size: 14px;">${item.icon}</span>
            <span>${item.label}</span>
          `;

          menuItem.addEventListener('mouseenter', () => {
            menuItem.style.background = 'var(--bg-hover, #2a2d2e)';
          });

          menuItem.addEventListener('mouseleave', () => {
            menuItem.style.background = 'transparent';
          });

          menuItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('✅ 点击菜单项:', item.label);
            item.action();
            menu.remove();
          });

          menu.appendChild(menuItem);
        }
      });

      console.log('✅ 菜单已创建，共 ' + menuItems.length + ' 项');
      console.log('📍 菜单位置: x=' + event.pageX + ', y=' + event.pageY);
      document.body.appendChild(menu);
      console.log('✅ 菜单已添加到 DOM');

      // 点击其他地方关闭菜单
      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      };

      setTimeout(() => {
        document.addEventListener('click', closeMenu);
      }, 0);
    }

    /**
     * 添加文件到 Claude 聊天
     */
    async addToClaudeChat(node, isNew) {
      try {
        console.log('📂 开始添加文件到 Claude 聊天, isNew=' + isNew);
        
        // 确保 AI 聊天组件已初始化
        if (!window.aiChat) {
          console.log('⚠️ AI 聊天组件未初始化，正在初始化...');
          
          // 尝试通过 window.studio 获取 app 实例
          if (window.studio && typeof window.studio.toggleAIPanel === 'function') {
            // 调用 toggleAIPanel 来初始化 AI 聊天
            window.studio.toggleAIPanel();
            
            // 等待初始化完成
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // 再次检查
        if (!window.aiChat) {
          console.error('❌ Claude Chat Component not found. Make sure AI Chat is initialized.');
          alert('Claude Chat Component not found. Please open the AI Chat panel first (Cmd+Shift+L).');
          return;
        }

        // 读取文件内容
        const result = await window.electronAPI.readFile(node.path);
        if (!result.success) {
          alert('Failed to read file: ' + result.error);
          return;
        }

        const fileContent = result.content;
        const fileName = node.name;

        // 构建消息
        const message = `I'm adding a file to our chat:\n\n**File: ${fileName}**\n\n\`\`\`\n${fileContent}\n\`\`\``;

        // 通过全局接口与 AI 聊天组件通信
        if (isNew) {
          // 创建新会话
          console.log('➕ 创建新会话');
          window.aiChat.createNewSession();
          
          // 稍微延迟后发送消息，确保新会话已创建
          setTimeout(() => {
            if (window.aiChat && window.aiChat.inputElement) {
              window.aiChat.inputElement.value = message;
              window.aiChat.inputElement.focus();
              console.log('✅ 文件已添加到新 Claude 聊天窗口');
            }
          }, 100);
        } else {
          // 添加到现有聊天
          console.log('💬 添加到现有会话');
          if (window.aiChat && window.aiChat.inputElement) {
            window.aiChat.inputElement.value = message;
            window.aiChat.inputElement.focus();
            console.log('✅ 文件已添加到 Claude 聊天窗口');
          }
        }
      } catch (error) {
        console.error('❌ 添加文件到聊天失败:', error);
        alert('Failed to add file to chat: ' + error.message);
      }
    }

    /**
     * 将文件作为附件添加到现有聊天
     */
    async addFileAsAttachment(node, isImage = false) {
      try {
        console.log('📎 开始添加文件作为附件...');
        
        // 确保 AI 聊天组件已初始化
        if (!window.aiChat) {
          console.log('⚠️ AI 聊天组件未初始化，正在初始化...');
          if (window.studio && typeof window.studio.toggleAIPanel === 'function') {
            window.studio.toggleAIPanel();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        if (!window.aiChat) {
          alert('Claude Chat Component not found. Please open the AI Chat panel first (Cmd+L).');
          return;
        }

        // 确保附件管理器已初始化
        if (!window.attachmentManager) {
          console.error('❌ AttachmentManager not found');
          alert('Attachment manager not initialized');
          return;
        }

        // 创建虚拟 File 对象
        const fileName = node.name;
        const fakeFile = {
          name: fileName,
          size: 0,
          type: isImage ? 'image/png' : 'application/octet-stream',
          path: node.path
        };

        // 添加附件
        console.log('📎 添加附件到管理器:', fileName);
        const attachment = await window.attachmentManager.addAttachment(fakeFile, node.path);
        
        if (attachment) {
          window.aiChat.updateAttachmentsList();
          console.log('✅ 附件已添加:', fileName);
          
          // 打开 AI Chat 如果还没有打开
          const aiPanel = document.querySelector('.ai-chat-container');
          if (aiPanel && aiPanel.style.display === 'none') {
            if (window.studio && typeof window.studio.toggleAIPanel === 'function') {
              window.studio.toggleAIPanel();
            }
          }
          
          console.log('✅ 文件已添加为附件');
        } else {
          alert('Failed to add file as attachment');
        }
      } catch (error) {
        console.error('❌ 添加附件失败:', error);
        alert('Failed to add attachment: ' + error.message);
      }
    }

    /**
     * 将文件作为附件添加到新聊天
     */
    async addFileAsAttachmentNew(node, isImage = false) {
      try {
        console.log('📎✨ 开始添加文件作为附件到新会话...');
        
        // 确保 AI 聊天组件已初始化
        if (!window.aiChat) {
          console.log('⚠️ AI 聊天组件未初始化，正在初始化...');
          if (window.studio && typeof window.studio.toggleAIPanel === 'function') {
            window.studio.toggleAIPanel();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        if (!window.aiChat) {
          alert('Claude Chat Component not found');
          return;
        }

        // 创建新会话
        console.log('➕ 创建新会话');
        window.aiChat.createNewSession();
        
        // 延迟以确保新会话已创建
        await new Promise(resolve => setTimeout(resolve, 300));

        // 添加附件
        if (window.attachmentManager) {
          const fileName = node.name;
          const fakeFile = {
            name: fileName,
            size: 0,
            type: isImage ? 'image/png' : 'application/octet-stream',
            path: node.path
          };

          console.log('📎 添加附件到新会话:', fileName);
          const attachment = await window.attachmentManager.addAttachment(fakeFile, node.path);
          
          if (attachment) {
            window.aiChat.updateAttachmentsList();
            console.log('✅ 附件已添加到新会话:', fileName);
          }
        }

      } catch (error) {
        console.error('❌ 添加附件到新会话失败:', error);
        alert('Failed to add attachment: ' + error.message);
      }
    }

    /**
     * 将图片文件作为附件添加
     */
    async addFileAsAttachmentImage(node) {
      return this.addFileAsAttachment(node, true);
    }

    /**
     * 复制文件路径
     */
    copyPath(filePath) {
      navigator.clipboard.writeText(filePath).then(() => {
        console.log('✅ 路径已复制到剪贴板');
      }).catch(err => {
        console.error('❌ 复制失败:', err);
      });
    }

    /**
     * 复制相对路径
     */
    copyRelativePath(filePath) {
      const relativePath = './' + filePath;
      navigator.clipboard.writeText(relativePath).then(() => {
        console.log('✅ 相对路径已复制到剪贴板');
      }).catch(err => {
        console.error('❌ 复制失败:', err);
      });
    }

    /**
     * 在 Finder 中显示文件
     */
    revealInFinder(filePath) {
      if (window.electronAPI && window.electronAPI.revealInFinder) {
        window.electronAPI.revealInFinder(filePath);
        console.log('✅ 在 Finder 中打开');
      } else {
        console.warn('⚠️ revealInFinder API not available');
      }
    }
  }

  // ==================== 可调整大小管理器 ====================
  class ResizerManager {
    constructor() {
      this.isResizing = false;
      this.currentResizer = null;
      this.startX = 0;
      this.startWidth = 0;
      this.startY = 0;
      this.startHeight = 0;
      this.targetElement = null;
      this.dimension = null;
      this.minSize = 0;
      this.maxSize = Infinity;
      this.moveCount = 0;
    }

    init() {
      // 初始化侧边栏调整器
      const sidebarResizer = document.getElementById('sidebar-resizer');
      const sidebar = document.querySelector('.sidebar');
      if (sidebarResizer && sidebar) {
        this.setupResizer(sidebarResizer, sidebar, 'width');
      }

      // 初始化 AI 面板调整器
      const aiResizer = document.getElementById('ai-resizer');
      const aiPanel = document.querySelector('.ai-panel');
      if (aiResizer && aiPanel) {
        console.log('✅ AI 面板 Resizer 初始化成功', {
          resizer: aiResizer.id,
          panel: aiPanel.className,
          initialWidth: aiPanel.getBoundingClientRect().width
        });
        this.setupResizer(aiResizer, aiPanel, 'width');
      } else {
        console.error('❌ AI 面板 Resizer 初始化失败', {
          hasResizer: !!aiResizer,
          hasPanel: !!aiPanel
        });
      }

      // 初始化终端高度调整器
      const terminalResizer = document.getElementById('terminal-resizer');
      const terminalPanel = document.querySelector('.terminal-panel');
      if (terminalResizer && terminalPanel) {
        this.setupResizer(terminalResizer, terminalPanel, 'height', { min: 120, max: 600 });
      }
    }

    setupResizer(resizer, targetElement, dimension = 'width', options = {}) {
      resizer.addEventListener('mousedown', (e) => {
        console.log('🖱️ Resizer mousedown 事件触发', {
          resizerId: resizer.id,
          targetClass: targetElement.className,
          dimension: dimension
        });
        this.startResize(e, resizer, targetElement, dimension, options);
      });
    }

    startResize(e, resizer, targetElement, dimension, options = {}) {
      e.preventDefault();
      this.isResizing = true;
      this.currentResizer = resizer;
      this.targetElement = targetElement;
      this.dimension = dimension;

      if (dimension === 'width') {
        this.startX = e.clientX;
        const rect = targetElement.getBoundingClientRect();
        this.startWidth = rect.width;

        const computed = getComputedStyle(this.targetElement);
        const defaultMin = parseInt(computed.minWidth) || 200;
        const defaultMax = parseInt(computed.maxWidth) || 800;
        this.minSize = options.min ?? defaultMin;
        this.maxSize = options.max ?? defaultMax;
        
        console.log('🎯 开始宽度调整', {
          element: targetElement.className.split(' ')[0],
          startX: this.startX,
          startWidth: this.startWidth,
          minSize: this.minSize,
          maxSize: this.maxSize,
          cssVariable: targetElement.classList.contains('ai-panel') ? '--ai-panel-width' : '--sidebar-width'
        });
      } else {
        this.startY = e.clientY;
        const rect = targetElement.getBoundingClientRect();
        this.startHeight = rect.height;
        this.minSize = options.min ?? 120;
        this.maxSize = options.max ?? 600;
      }
      
      // 添加全局事件监听器
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
      
      // 添加不可选择的样式（防止文本被选中）
      document.body.style.userSelect = 'none';
      document.body.style.cursor = dimension === 'height' ? 'row-resize' : 'col-resize';
    }

    handleMouseMove = (e) => {
      if (!this.isResizing || !this.targetElement) return;
      
      if (this.dimension === 'width') {
        const deltaX = e.clientX - this.startX;
        let newWidth;
        let calculatedWidth;

        if (this.targetElement.classList.contains('ai-panel')) {
          calculatedWidth = this.startWidth - deltaX;
          newWidth = calculatedWidth;
          
          // 每 50 次移动输出一次日志，避免日志过多
          if (!this._logCounter) this._logCounter = 0;
          if (this._logCounter % 50 === 0) {
            console.log('📏 AI 面板宽度调整中', {
              currentX: e.clientX,
              startX: this.startX,
              deltaX: deltaX,
              direction: deltaX < 0 ? '← 向左(变大)' : '→ 向右(变小)',
              startWidth: this.startWidth,
              calculatedWidth: calculatedWidth,
              beforeClamp: newWidth
            });
          }
          this._logCounter++;
        } else {
          newWidth = this.startWidth + deltaX;
        }

        const beforeClamp = newWidth;
        newWidth = Math.max(this.minSize, Math.min(this.maxSize, newWidth));
        
        if (beforeClamp !== newWidth && this.targetElement.classList.contains('ai-panel')) {
          console.log('⚠️ 宽度被边界限制', {
            beforeClamp: beforeClamp,
            afterClamp: newWidth,
            minSize: this.minSize,
            maxSize: this.maxSize,
            hitMin: beforeClamp < this.minSize,
            hitMax: beforeClamp > this.maxSize
          });
        }

        if (this.targetElement.classList.contains('sidebar')) {
          document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
          
          // 强制更新元素的 flex-basis（直接设置内联样式）
          this.targetElement.style.flexBasis = `${newWidth}px`;
          this.targetElement.style.width = `${newWidth}px`;
          
          store.setState('ui.sidebarWidth', newWidth);
        } else if (this.targetElement.classList.contains('ai-panel')) {
          document.documentElement.style.setProperty('--ai-panel-width', `${newWidth}px`);
          
          // 强制更新元素的 flex-basis（直接设置内联样式）
          this.targetElement.style.flexBasis = `${newWidth}px`;
          this.targetElement.style.width = `${newWidth}px`;
          
          // 强制浏览器重绘
          void this.targetElement.offsetWidth;
          
          store.setState('ui.aiPanelWidth', newWidth);
          
          // 验证 CSS 变量是否设置成功
          const cssVarValue = getComputedStyle(document.documentElement).getPropertyValue('--ai-panel-width');
          const actualWidth = this.targetElement.getBoundingClientRect().width;
          const computedWidth = getComputedStyle(this.targetElement).width;
          
          if (this._logCounter % 50 === 0) {
            console.log('🔍 CSS 变量验证', {
              setCSSVar: `${newWidth}px`,
              getCSSVar: cssVarValue.trim(),
              actualWidth: actualWidth,
              computedWidth: computedWidth,
              inlineStyle: this.targetElement.style.flexBasis,
              match: actualWidth === newWidth
            });
          }
        }
      } else if (this.dimension === 'height') {
        const deltaY = e.clientY - this.startY;
        let newHeight = this.startHeight - deltaY;
        newHeight = Math.max(this.minSize, Math.min(this.maxSize, newHeight));
        document.documentElement.style.setProperty('--terminal-height', `${newHeight}px`);
        store.setState('ui.terminalHeight', newHeight);
      }
    }

    handleMouseUp = () => {
      if (!this.isResizing) return;
      
      const wasAIPanel = this.targetElement && this.targetElement.classList.contains('ai-panel');
      const finalWidth = wasAIPanel ? this.targetElement.getBoundingClientRect().width : null;
      
      if (wasAIPanel) {
        const cssVarValue = getComputedStyle(document.documentElement).getPropertyValue('--ai-panel-width');
        const computedWidth = getComputedStyle(this.targetElement).width;
        const computedFlexBasis = getComputedStyle(this.targetElement).flexBasis;
        const inlineWidth = this.targetElement.style.width;
        const inlineFlexBasis = this.targetElement.style.flexBasis;
        
        console.log('✅ AI 面板宽度调整完成', {
          finalWidth: finalWidth,
          totalMoves: this._logCounter || 0,
          cssVariable: cssVarValue.trim(),
          computedWidth: computedWidth,
          computedFlexBasis: computedFlexBasis,
          inlineWidth: inlineWidth,
          inlineFlexBasis: inlineFlexBasis,
          match: Math.abs(finalWidth - parseFloat(computedWidth)) < 1
        });
        
        // 额外验证：检查元素的实际渲染尺寸
        console.log('🔬 深度验证', {
          getBoundingClientRect: this.targetElement.getBoundingClientRect(),
          offsetWidth: this.targetElement.offsetWidth,
          clientWidth: this.targetElement.clientWidth,
          scrollWidth: this.targetElement.scrollWidth
        });
        
        this._logCounter = 0;
      }
      
      this.isResizing = false;
      this.currentResizer = null;
      this.targetElement = null;
      this.dimension = null;
      this.moveCount = 0;
      
      // 移除全局事件监听器
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
      
      // 恢复样式
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      
    }
  }

  // ==================== 上下文管理器 ====================
  class ContextManager {
    constructor(editorManager) {
      this.editorManager = editorManager;
    }

    /**
     * 获取当前编辑器上下文
     */
    getCurrentContext() {
      if (!this.editorManager || !this.editorManager.editor) {
        return null;
      }

      const model = this.editorManager.editor.getModel();
      if (!model) {
        return null;
      }

      const selection = this.editorManager.editor.getSelection();
      const position = this.editorManager.editor.getPosition();
      const lineContent = position ? model.getLineContent(position.lineNumber) : '';

      return {
        filePath: this.editorManager.activeFile || 'untitled',
        language: model.getLanguageId(),
        content: model.getValue(),
        lineCount: model.getLineCount(),
        selection: selection ? model.getValueInRange(selection) : '',
        hasSelection: selection && !selection.isEmpty(),
        cursorLine: position ? position.lineNumber : 0,
        cursorColumn: position ? position.column : 0,
        currentLine: lineContent,
        textBeforeCursor: lineContent.substring(0, position ? position.column - 1 : 0)
      };
    }

    /**
     * 构建 AI 提示词
     */
    buildPrompt(userMessage, context) {
      if (!context) {
        return userMessage;
      }

      const parts = [];

      // 添加文件信息
      if (context.filePath && context.filePath !== 'untitled') {
        parts.push(`文件: ${context.filePath}`);
        parts.push(`语言: ${context.language}`);
        parts.push('');
      }

      // 添加选中代码
      if (context.hasSelection && context.selection) {
        parts.push('选中的代码:');
        parts.push('```' + context.language);
        parts.push(context.selection);
        parts.push('```');
        parts.push('');
      }

      // 添加用户消息
      parts.push(userMessage);

      return parts.join('\n');
    }

    /**
     * 提取代码块
     */
    extractCodeBlock(response) {
      const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/;
      const match = response.match(codeBlockRegex);
      return match && match[1] ? match[1].trim() : response.trim();
    }
  }

  // ==================== 工作区状态持久化 ====================
  class WorkspaceState {
    constructor() {
      this.storageKey = 'claude-studio-workspace-state';
      this.autoSaveInterval = null;
    }

    init() {
      // 延迟启动自动保存，避免在恢复状态前保存空状态
      setTimeout(() => {
        this.startAutoSave();
      }, 5000); // 5 秒后再启动自动保存
      
      window.addEventListener('beforeunload', () => {
        this.saveState();
      });
    }

    async saveState() {
      try {
        const state = this.collectState();
        
        // 保护机制：如果当前没有打开标签，检查之前是否有保存
        if (state.editor.openTabs.length === 0) {
          const loadResult = await window.electronAPI.workspace.loadState();
          if (loadResult.success && loadResult.state) {
            if (loadResult.state.editor?.openTabs?.length > 0) {
              return false;
            }
          }
        }
        
        // 使用文件系统保存
        const result = await window.electronAPI.workspace.saveState(state);
        if (result.success) {
          return true;
        } else {
          console.error('❌ 保存失败:', result.error);
          return false;
        }
      } catch (error) {
        console.error('❌ 保存工作区状态失败:', error);
        return false;
      }
    }

    async loadState() {
      try {
        const result = await window.electronAPI.workspace.loadState();
        if (!result.success) {
          console.error('❌ 加载失败:', result.error);
          return null;
        }
        
        if (!result.state) {
          return null;
        }
        
        return result.state;
      } catch (error) {
        console.error('❌ 恢复工作区状态失败:', error);
        return null;
      }
    }

    collectState() {
      const app = window.claudeStudio;
      
      return {
        version: '1.0',
        timestamp: Date.now(),
        editor: {
          openTabs: this.collectOpenTabs(),
          activeFileIndex: this.getActiveTabIndex()
        },
        ui: {
          sidebarWidth: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')) || 250,
          aiPanelVisible: document.querySelector('.ai-panel')?.style.display !== 'none',
          aiPanelWidth: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ai-panel-width')) || 400
        }
      };
    }

    collectOpenTabs() {
      const tabs = [];
      const tabElements = document.querySelectorAll('.tab-item');
      
      tabElements.forEach((tab, index) => {
        const filePath = tab.dataset.path;
        if (filePath) {
          tabs.push({
            path: filePath,
            title: tab.querySelector('.tab-name')?.textContent || filePath.split('/').pop()
          });
        }
      });
      
      return tabs;
    }

    getActiveTabIndex() {
      const tabs = Array.from(document.querySelectorAll('.tab-item'));
      return tabs.findIndex(tab => tab.classList.contains('active'));
    }

    async applyState(state, app) {
      if (!state) return;
      
      try {
        if (state.ui) {
          this.applyUIState(state.ui);
        }
        
        if (state.editor?.openTabs?.length > 0) {
          await this.applyEditorState(state.editor, app);
        }
      } catch (error) {
        console.error('❌ 应用工作区状态失败:', error);
      }
    }

    applyUIState(uiState) {
      if (uiState.sidebarWidth) {
        document.documentElement.style.setProperty('--sidebar-width', `${uiState.sidebarWidth}px`);
      }
      if (uiState.aiPanelWidth) {
        document.documentElement.style.setProperty('--ai-panel-width', `${uiState.aiPanelWidth}px`);
      }
      if (uiState.aiPanelVisible) {
        const aiPanel = document.querySelector('.ai-panel');
        if (aiPanel) aiPanel.style.display = 'flex';
      }
    }

    async applyEditorState(editorState, app) {
      if (!app || !editorState.openTabs) return;
      
      for (const tab of editorState.openTabs) {
        try {
          // 读取文件内容
          const fileResult = await window.electronAPI.readFile(tab.path);
          
          if (!fileResult || !fileResult.success) {
            console.error(`❌ 文件读取失败: ${tab.title}`, fileResult);
            continue;
          }
          
          // 打开文件到编辑器
          await app.editor.openFile(tab.path, fileResult.content);
        } catch (error) {
          console.error(`⚠️  无法恢复标签: ${tab.title}`, error);
        }
      }
      
      // 延迟激活，确保标签已渲染
      setTimeout(() => {
        if (editorState.activeFileIndex >= 0) {
          const tabs = document.querySelectorAll('.tab-item');
          if (tabs[editorState.activeFileIndex]) {
            tabs[editorState.activeFileIndex].click();
          }
        }
      }, 200);
    }

    startAutoSave() {
      this.autoSaveInterval = setInterval(() => {
        this.saveState();
      }, 30000);
    }

    stopAutoSave() {
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
      }
    }

    async clearState() {
      try {
        const result = await window.electronAPI.workspace.clearState();
        if (result.success) {
          return true;
        } else {
          console.error('❌ 清除失败:', result.error);
          return false;
        }
      } catch (error) {
        console.error('❌ 清除工作区状态失败:', error);
        return false;
      }
    }
  }

  // ==================== 主应用类 ====================
  class ClaudeStudio {
    constructor() {
      this.editor = null;
      this.ai = null;
      this.files = null;
      this.terminal = null;
      this.resizer = null;
      this.contextManager = null;
      this.errorDiagnostics = null;
      this.workspaceState = null;
      this.claudeConnected = false;
      this.claudeReconnecting = false;
      this.initialized = false;
      this.currentConversationId = null;
      this.lastTerminalHeight = store.getState('ui.terminalHeight') || 200;
      
      // 附件管理系统
      this.attachmentManager = null;
      this.fileValidator = null;
    }

    async init() {

      try {
        // 检查 electronAPI
        if (!window.electronAPI) {
          throw new Error('Electron API 未加载');
        }

        // 初始化模块
        this.editor = new EditorManager();
        this.ai = new AIService();
        this.files = new FileManager();
        this.terminal = new TerminalManager();
        this.resizer = new ResizerManager();
        this.contextManager = new ContextManager(this.editor);
        
        // 初始化附件管理系统
        if (typeof FileValidator !== 'undefined' && typeof AttachmentManager !== 'undefined') {
          this.fileValidator = new FileValidator();
          this.attachmentManager = new AttachmentManager();
          console.log('✓ 附件管理系统已初始化');
        } else {
          console.warn('⚠️ 附件管理系统未加载');
        }

        // 初始化编辑器
        const editorContainer = document.getElementById('editor-container');
        if (editorContainer) {
          await this.editor.init(editorContainer);
          // 设置代码补全
          this.setupCodeCompletion();
          // 初始化错误诊断（需要 ErrorDiagnostics 模块）
          this.initErrorDiagnostics();
        }

        // 初始化面包屑路径容器（在这里初始化，而不是在 EditorManager）
        this.breadcrumbContainer = document.getElementById('breadcrumb-bar');
        console.log('✅ 初始化面包屑容器:', this.breadcrumbContainer);

        // 初始化文件树
        const fileTreeContainer = document.getElementById('file-tree');
        if (fileTreeContainer) {
          await this.files.loadFileTree();
          this.files.renderTree(fileTreeContainer);
        }

        // 初始化可调整大小的分隔条
        this.resizer.init();

        // 初始化终端
        await this.terminal.init();

        const initialTerminalHeight = store.getState('ui.terminalHeight');
        if (typeof initialTerminalHeight === 'number') {
          document.documentElement.style.setProperty('--terminal-height', `${initialTerminalHeight}px`);
          this.lastTerminalHeight = initialTerminalHeight;
        }
        this.updateTerminalVisibility(store.getState('ui.terminalVisible'));

        // 绑定事件
        this.bindEvents();
        this.bindKeyboardShortcuts();
        this.subscribeToStore();
        
        // 监听全局快捷键事件（来自主进程）
        if (window.electronAPI && window.electronAPI.onToggleAIPanel) {
          window.electronAPI.onToggleAIPanel(() => {
            this.toggleAIPanel();
          });
        }

        // 启动 Claude AI
        await this.startClaude();
        
        // 设置 Claude 事件监听
        this.setupClaudeListeners();
        
        // 初始化对话历史
        await this.initChatHistory();

        // 初始化工作区状态管理
        this.workspaceState = new WorkspaceState();
        this.workspaceState.init();
        
        // 恢复上次的工作区状态
        const savedState = await this.workspaceState.loadState();
        if (savedState) {
          console.log('📂 发现保存的工作区状态，正在恢复...');
          // 延迟恢复，确保 DOM 已准备好
          setTimeout(async () => {
            await this.workspaceState.applyState(savedState, this);
          }, 500);
        }

        // 将应用实例挂载到全局，供 WorkspaceState 访问
        window.claudeStudio = this;

        this.initialized = true;
        this.showWelcome();
      } catch (error) {
        console.error('❌ 初始化失败:', error);
        alert('应用初始化失败: ' + error.message);
      }
    }

    bindEvents() {
      // 文件打开事件
      window.addEventListener('file:open', (e) => {
        const { path, content, language, line = 1, column = 1 } = e.detail;
        
        // 打开文件在编辑器中
        this.editor.openFile(path, content, language);
        
        // 设置光标位置（如果指定了行列号）
        if (line && column && this.editor.editor) {
          try {
            console.log('🎯 设置光标位置:', { line, column });
            // 使用 setTimeout 确保编辑器内容已加载
            setTimeout(() => {
              this.editor.editor.revealLineInCenter(line);
              this.editor.editor.setPosition({ lineNumber: line, column: column });
              console.log('✅ 光标位置设置成功');
            }, 100);
          } catch (posError) {
            console.warn('⚠️ 设置光标位置失败:', posError.message);
            // 不中断流程，继续
          }
        }
        
        // 更新活跃文件状态
        store.setState('editor.activeFile', path);
        
        // 更新面包屑路径
        console.log('📍 调用 updateBreadcrumb，路径:', path);
        console.log('📍 breadcrumbContainer:', this.breadcrumbContainer);
        this.updateBreadcrumb(path);
        
        // 显示打开成功提示
        const fileName = path.split('/').pop();
        toast.show(`已打开: ${fileName}`, 'info', 2000);
      });

      // 打开项目按钮
      const openProjectBtn = document.getElementById('open-project-btn');
      if (openProjectBtn) {
        openProjectBtn.addEventListener('click', async () => {
          const success = await this.files.openProject();
          if (success) {
            this.files.refreshTree();
          }
        });
      }

      // 刷新文件树按钮
      const refreshFilesBtn = document.getElementById('refresh-files-btn');
      if (refreshFilesBtn) {
        refreshFilesBtn.addEventListener('click', async () => {
          await this.files.loadFileTree();
          this.files.refreshTree();
        });
      }

      // 新建文件按钮
      const newFileBtn = document.getElementById('new-file-btn');
      if (newFileBtn) {
        newFileBtn.addEventListener('click', () => {
        });
      }

      // 新建文件夹按钮
      const newFolderBtn = document.getElementById('new-folder-btn');
      if (newFolderBtn) {
        newFolderBtn.addEventListener('click', () => {
        });
      }

      // AI 聊天发送按钮
      const sendChatBtn = document.getElementById('send-chat-btn');
      const chatInput = document.getElementById('chat-input');
      if (sendChatBtn && chatInput) {
        sendChatBtn.addEventListener('click', () => this.sendChatMessage());
        chatInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendChatMessage();
          }
        });
      }

      // AI 面板关闭按钮
      const closeAIPanel = document.getElementById('close-ai-panel');
      if (closeAIPanel) {
        closeAIPanel.addEventListener('click', () => {
          store.setState('ui.aiPanelVisible', false);
        });
      }

      // 对话历史按钮
      const historyBtn = document.getElementById('history-btn');
      if (historyBtn) {
        historyBtn.addEventListener('click', () => {
          this.showHistoryDialog();
        });
      }

      // 工作区状态管理按钮
      const workspaceStateBtn = document.getElementById('workspace-state-btn');
      if (workspaceStateBtn) {
        workspaceStateBtn.addEventListener('click', () => {
          this.showWorkspaceStateDialog();
        });
      }

      // 会话管理按钮
      const sessionsBtn = document.getElementById('sessions-btn');
      if (sessionsBtn) {
        sessionsBtn.addEventListener('click', () => {
          // MVP-1.2: 切换会话列表
          if (window.aiChat && typeof window.aiChat.toggleSessionList === 'function') {
            window.aiChat.toggleSessionList();
          } else {
            // 备用方案：显示对话框
            this.showSessionsDialog();
          }
        });
      }

      // MVP-2.1: 系统提示设置按钮
      const promptSettingsBtn = document.getElementById('prompt-settings-btn');
      if (promptSettingsBtn) {
        promptSettingsBtn.addEventListener('click', () => {
          if (window.systemPromptManager && typeof SystemPromptDialog !== 'undefined') {
            const promptDialog = new SystemPromptDialog(window.systemPromptManager);
            promptDialog.open();
          }
        });
      }

      // 模型选择按钮
      const modelSelectBtn = document.getElementById('model-select-btn');
      if (modelSelectBtn) {
        modelSelectBtn.addEventListener('click', () => {
          this.showModelSelectDialog();
        });
      }

      // 顶部栏按钮绑定
      
      // AI 助手按钮
      const toggleAIBtn = document.getElementById('toggle-ai-btn');
      if (toggleAIBtn) {
        toggleAIBtn.addEventListener('click', () => {
          this.toggleAIPanel();
        });
      }
      
      const toggleSidebar = document.getElementById('toggle-sidebar');
      if (toggleSidebar) {
        toggleSidebar.addEventListener('click', () => {
          const sidebar = document.querySelector('.sidebar');
          if (sidebar) {
            const isCollapsed = sidebar.style.display === 'none';
            sidebar.style.display = isCollapsed ? 'flex' : 'none';
          }
        });
      }

      const toggleTerminal = document.getElementById('toggle-terminal');
      if (toggleTerminal) {
        toggleTerminal.addEventListener('click', () => {
          const visible = store.getState('ui.terminalVisible');
          if (visible) {
            const currentHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--terminal-height'), 10);
            if (!Number.isNaN(currentHeight)) {
              this.lastTerminalHeight = currentHeight;
            }
            store.setState('ui.terminalVisible', false);
            toast.show('终端已隐藏', 'info', 1500);
          } else {
            if (typeof this.lastTerminalHeight === 'number') {
              document.documentElement.style.setProperty('--terminal-height', `${this.lastTerminalHeight}px`);
              store.setState('ui.terminalHeight', this.lastTerminalHeight);
            }
            store.setState('ui.terminalVisible', true);
            toast.show('终端已打开', 'info', 1500);
          }
        });
      }

      // 快速搜索框集成
      const quickSearch = document.getElementById('quick-search');
      if (quickSearch) {
        quickSearch.addEventListener('focus', () => {
          this.showSearchPanel();
        });
        quickSearch.addEventListener('input', (e) => {
          const searchInput = document.getElementById('searchInput');
          if (searchInput) {
            searchInput.value = e.target.value;
            this.performSearch();
          }
        });
        quickSearch.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            quickSearch.blur();
            this.hideSearchPanel();
          }
        });
      }

      // 搜索面板事件
      const searchCloseBtn = document.getElementById('searchCloseBtn');
      if (searchCloseBtn) {
        searchCloseBtn.addEventListener('click', () => this.hideSearchPanel());
      }

      const searchBtn = document.getElementById('searchBtn');
      if (searchBtn) {
        searchBtn.addEventListener('click', () => this.performSearch());
      }

      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            this.performSearch();
          } else if (e.key === 'Escape') {
            this.hideSearchPanel();
          }
        });
      }

      // 搜索结果导航
      const prevBtn = document.getElementById('prevResultBtn');
      const nextBtn = document.getElementById('nextResultBtn');
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (window.searchComponent) {
            window.searchComponent.previousResult();
            this.renderSearchResults();
          }
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (window.searchComponent) {
            window.searchComponent.nextResult();
            this.renderSearchResults();
          }
        });
      }

    }

    /**
     * 显示搜索面板
     */
    showSearchPanel() {
      const panel = document.getElementById('search-panel');
      if (panel) {
        panel.style.display = 'flex';
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.focus();
        }
      }
    }

    /**
     * 隐藏搜索面板
     */
    hideSearchPanel() {
      const panel = document.getElementById('search-panel');
      if (panel) {
        panel.style.display = 'none';
      }
      // 清空快速搜索框
      const quickSearch = document.getElementById('quick-search');
      if (quickSearch) {
        quickSearch.value = '';
      }
    }

    /**
     * 执行搜索 - 优先搜索当前文件，再搜索整个项目
     */
    async performSearch() {
      if (!window.searchComponent) return;

      const searchInput = document.getElementById('searchInput');
      const query = searchInput?.value.trim();

      if (!query) {
        document.getElementById('searchResults').innerHTML = 
          '<div class="no-results">输入搜索词开始搜索</div>';
        return;
      }

      // 获取搜索选项
      const options = {
        caseSensitive: document.getElementById('caseSensitive')?.checked || false,
        wholeWord: document.getElementById('wholeWord')?.checked || false,
        useRegex: document.getElementById('useRegex')?.checked || false
      };

      try {
        // 尝试在当前编辑器文件中搜索
        const activeFile = store.getState('editor.activeFile');
        
        // 获取当前编辑器内容的多种方式
        let currentContent = null;
        if (this.editor) {
          // 方式1: 使用 getValue() 方法 (Monaco Editor)
          if (typeof this.editor.getValue === 'function') {
            currentContent = this.editor.getValue();
            console.log('✅ 使用 getValue() 获取编辑器内容');
          }
          // 方式2: 直接访问 currentContent 属性 (备选)
          else if (this.editor.currentContent) {
            currentContent = this.editor.currentContent;
            console.log('✅ 使用 currentContent 属性获取编辑器内容');
          }
          // 方式3: 使用 getContent() 方法 (备选)
          else if (typeof this.editor.getContent === 'function') {
            currentContent = this.editor.getContent();
            console.log('✅ 使用 getContent() 获取编辑器内容');
          }
          // 方式4: 尝试从 MonacoEditor 对象获取编辑器实例
          else if (this.editor.editor && typeof this.editor.editor.getValue === 'function') {
            currentContent = this.editor.editor.getValue();
            console.log('✅ 从编辑器实例获取内容');
          }
        }

        // 如果内容为空或仅空白，提示
        if (!currentContent || currentContent.trim().length === 0) {
          console.warn('⚠️ 编辑器内容为空，检查编辑器状态:', {
            editorExists: !!this.editor,
            hasGetValue: !!(this.editor && typeof this.editor.getValue === 'function'),
            editorValue: currentContent ? currentContent.substring(0, 50) : 'null'
          });
        }

        // 调试日志
        console.log('🔍 搜索调试信息:', {
          activeFile,
          hasEditor: !!this.editor,
          hasContent: !!currentContent,
          contentLength: currentContent?.length || 0,
          query,
          searchOptions: options
        });

        // 🔑 关键改变：现在总是使用项目搜索作为主要方式
        // 项目搜索会首先尝试在本地文件中查找匹配项
        console.log('📁 开始项目搜索...');
        
        try {
          await window.searchComponent.searchInProject(query, options);
          console.log('📁 项目搜索结果:', window.searchComponent.searchResults.length, '个匹配');
        } catch (projError) {
          console.warn('❌ 项目搜索失败:', projError);
          window.searchComponent.searchResults = [];
        }
        
        window.searchComponent.currentResultIndex = 0;
        this.renderSearchResults();
      } catch (error) {
        console.error('❌ 搜索失败:', error);
        document.getElementById('searchResults').innerHTML = 
          `<div class="no-results">搜索失败: ${error.message}</div>`;
      }
    }

    /**
     * 渲染搜索结果
     */
    renderSearchResults() {
      if (!window.searchComponent) return;

      const results = window.searchComponent.searchResults;
      const countElement = document.getElementById('searchResultsCount');
      const resultsContainer = document.getElementById('searchResults');

      if (!countElement || !resultsContainer) return;

      // 按文件分组统计
      const fileCount = new Set(results.map(r => r.file)).size;
      const summary = fileCount > 1 
        ? `${results.length} 个结果，${fileCount} 个文件` 
        : `${results.length} 个结果`;
      countElement.textContent = summary;

      if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">未找到匹配项</div>';
        return;
      }

      const html = results.map((result, index) => {
        const fileName = result.file ? result.file.split('/').pop() : '未知文件';
        const fileIcon = result.isCurrentFile ? '📄' : '📑';
        
        return `
          <div class="search-result-item ${index === window.searchComponent.currentResultIndex ? 'active' : ''}"
               onclick="(async () => { await window.studio.selectSearchResult(${index}); })()">
            <div class="result-file">${fileIcon} ${fileName}</div>
            <div class="result-location">第 ${result.line || 0} 行 第 ${result.column || 1} 列</div>
            <div class="result-content">${this.highlightSearchMatch(result.content, result.match)}</div>
          </div>
        `;
      }).join('');

      resultsContainer.innerHTML = html;
    }

    /**
     * 高亮匹配文本
     */
    highlightSearchMatch(content, match) {
      if (!match || !content) return content;
      return content.replace(
        new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        '<mark>$&</mark>'
      );
    }

    /**
     * 选择搜索结果并打开对应文件
     */
    async selectSearchResult(index) {
      if (!window.searchComponent) return;
      const result = window.searchComponent.searchResults[index];
      if (!result) return;

      window.searchComponent.currentResultIndex = index;
      this.renderSearchResults();

      // 打开搜索结果对应的文件
      await this.openSearchResultFile(result);
    }

    /**
     * 打开搜索结果对应的文件
     */
    async openSearchResultFile(result) {
      if (!result || !result.file) return;

      const filePath = result.file;
      const line = result.line || 1;
      const column = result.column || 1;

      console.log('🔍 打开搜索结果文件:', filePath, `(行: ${line}, 列: ${column})`);

      try {
        // 处理文件路径
        let fullPath = filePath;
        if (filePath.startsWith('./')) {
          fullPath = filePath.substring(2); // 移除 './'
        }

        console.log('📂 文件路径:', fullPath);

        // 检查是否有 Electron API
        if (!window.electronAPI || !window.electronAPI.readFile) {
          console.warn('⚠️ Electron API 不可用，尝试使用替代方案');
          this.openSearchResultFileSync(result);
          return;
        }

        // 使用 IPC 通信读取文件
        console.log('📡 通过 IPC 读取文件...');
        
        let ipcResult;
        try {
          ipcResult = await window.electronAPI.readFile(fullPath);
          console.log('✅ IPC 调用成功');
        } catch (ipcError) {
          console.warn('⚠️ IPC 调用失败:', ipcError.message);
          console.warn('⚠️ 切换到备选方案...');
          this.openSearchResultFileSync(result);
          return;
        }

        // 处理 IPC 返回结果
        // IPC 返回格式: { success: true, content: "..." }
        let content;
        if (ipcResult && typeof ipcResult === 'object') {
          if (!ipcResult.success) {
            console.warn('⚠️ IPC 返回错误:', ipcResult.error);
            alert(`无法读取文件: ${ipcResult.error || '未知错误'}`);
            return;
          }
          content = ipcResult.content;
        } else {
          // 直接字符串返回（兼容旧版本）
          content = ipcResult;
        }

        if (!content) {
          console.warn('⚠️ 文件内容为空或不存在');
          alert(`无法读取文件: ${filePath}`);
          return;
        }

        // 确保内容是字符串
        const contentStr = typeof content === 'string' ? content : String(content);
        
        console.log('✅ 文件内容读取成功，长度:', contentStr.length, '字节');

        // 获取文件扩展名并检测语言
        const ext = fullPath.split('.').pop();
        const language = this.getLanguageFromExtension(ext);

        console.log('📝 检测到语言:', language);

        // 使用统一的文件打开逻辑（与资源列表一致）
        console.log('📤 触发统一的文件打开事件...');
        window.dispatchEvent(new CustomEvent('file:open', {
          detail: { 
            path: fullPath, 
            content: contentStr, 
            language,
            line: line,
            column: column
          }
        }));

        console.log('✅ 文件打开事件已触发');
      } catch (error) {
        console.error('❌ 打开文件失败:', error.message);
        console.error('错误堆栈:', error.stack);
        alert(`打开文件失败: ${error.message}`);
      }
    }

    /**
     * 从文件扩展名获取语言类型
     */
    getLanguageFromExtension(ext) {
      const languageMap = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'json': 'json',
        'md': 'markdown',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'less': 'less',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'cs': 'csharp',
        'sh': 'shell',
        'bash': 'shell',
        'yml': 'yaml',
        'yaml': 'yaml',
        'xml': 'xml',
        'txt': 'text'
      };
      
      return languageMap[ext?.toLowerCase()] || 'text';
    }

    /**
     * 同步打开文件（备选方案，当 IPC 不可用时使用）
     */
    openSearchResultFileSync(result) {
      if (!result || !result.file) return;

      const filePath = result.file;
      const line = result.line || 1;
      const column = result.column || 1;

      console.log('🔄 使用备选方案打开文件...');

      try {
        // 尝试使用 Node.js require（可能在某些配置下可用）
        const fs = require('fs');
        const path = require('path');

        let fullPath = filePath;
        if (filePath.startsWith('./')) {
          fullPath = path.join(process.cwd(), filePath);
        } else if (!path.isAbsolute(filePath)) {
          fullPath = path.join(process.cwd(), filePath);
        }

        console.log('📂 完整文件路径:', fullPath);

        // 检查文件是否存在
        if (!fs.existsSync(fullPath)) {
          console.warn('⚠️ 文件不存在:', fullPath);
          alert(`文件不存在: ${filePath}`);
          return;
        }

        // 读取文件内容
        const content = fs.readFileSync(fullPath, 'utf-8');
        const language = this.detectLanguage(fullPath);

        console.log('✅ 文件内容读取成功，长度:', content.length, '字节');

        // 打开文件在编辑器中
        if (this.editor) {
          this.editor.openFile(fullPath, content, language);

          if (this.editor.editor && line && column) {
            this.editor.editor.revealLineInCenter(line);
            this.editor.editor.setPosition({ lineNumber: line, column: column });
          }

          store.setState('editor.activeFile', fullPath);
          console.log('✅ 文件已在编辑器中打开');
        }
      } catch (fallbackError) {
        console.error('❌ 备选方案也失败了:', fallbackError.message);
        alert(`无法打开文件: ${result.file}\n\n原因: ${fallbackError.message}`);
      }
    }

    /**
     * 更新面包屑路径
     */
    updateBreadcrumb(filePath) {
      if (!this.breadcrumbContainer) {
        console.warn('⚠️ breadcrumbContainer 未找到或未初始化');
        return;
      }

      console.log('🍞 开始更新面包屑，路径:', filePath);

      // 清空现有面包屑
      this.breadcrumbContainer.innerHTML = '';

      // 规范化路径：移除开头的 ./
      let normalizedPath = filePath;
      if (normalizedPath.startsWith('./')) {
        normalizedPath = normalizedPath.substring(2);
      }

      console.log('🍞 规范化后的路径:', normalizedPath);

      // 分割路径
      const parts = normalizedPath.split('/').filter(p => p.length > 0);

      console.log('🍞 路径分割结果:', parts);

      // 如果没有路径，显示文件名
      if (parts.length === 0) {
        this.breadcrumbContainer.innerHTML = '<span class="breadcrumb-item current">文件</span>';
        console.log('✅ 面包屑已更新 (单个文件)');
        return;
      }

      // 构建面包屑
      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;

        // 添加路径项
        const item = document.createElement('span');
        item.className = `breadcrumb-item ${isLast ? 'current' : ''}`;
        
        // 构建到该项的完整路径
        const itemPath = './' + parts.slice(0, index + 1).join('/');

        item.innerHTML = part;
        
        // 如果不是最后一项（当前文件），添加点击事件
        if (!isLast) {
          item.style.cursor = 'pointer';
          item.addEventListener('click', async () => {
            console.log('🔍 点击面包屑导航:', itemPath);
            // 如果点击的是文件夹，可以在文件树中展开（预留扩展）
            // 或者显示该文件夹的内容
          });
        }

        this.breadcrumbContainer.appendChild(item);

        // 添加分隔符（除了最后一项）
        if (!isLast) {
          const separator = document.createElement('span');
          separator.className = 'breadcrumb-separator';
          separator.innerHTML = '›';
          this.breadcrumbContainer.appendChild(separator);
        }
      });

      console.log('✅ 面包屑已更新:', parts.join(' › '));

      // 如果路径过长，添加滚动提示
      if (parts.length > 5) {
        this.breadcrumbContainer.style.justifyContent = 'flex-start';
      }
    }

    /**
     * 根据文件扩展名检测语言
     */
    detectLanguage(filePath) {
      const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
      
      const languageMap = {
        '.js': 'javascript',
        '.ts': 'typescript',
        '.jsx': 'javascript',
        '.tsx': 'typescript',
        '.json': 'json',
        '.md': 'markdown',
        '.html': 'html',
        '.css': 'css',
        '.scss': 'scss',
        '.py': 'python',
        '.java': 'java',
        '.cpp': 'cpp',
        '.c': 'c',
        '.xml': 'xml',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.sh': 'shell',
        '.bash': 'shell',
        '.txt': 'plaintext'
      };

      return languageMap[ext] || 'plaintext';
    }

    bindKeyboardShortcuts() {
      document.addEventListener('keydown', async (e) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

        // Cmd/Ctrl + K - 内联编辑
        if (cmdOrCtrl && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK' || e.keyCode === 75)) {
          e.preventDefault();
          e.stopPropagation();
          await this.showInlineEditDialog();
        }

        // Cmd/Ctrl + L - AI 聊天
        // 使用 e.code 而不是 e.key，因为 macOS 上 Cmd+L 的 e.key 可能是 'Meta'
        if (cmdOrCtrl && (e.key === 'l' || e.key === 'L' || e.code === 'KeyL' || e.keyCode === 76)) {
          e.preventDefault();
          e.stopPropagation();
          this.toggleAIPanel();
        }

        // Cmd/Ctrl + S - 保存文件
        if (cmdOrCtrl && (e.key === 's' || e.key === 'S' || e.code === 'KeyS' || e.keyCode === 83)) {
          e.preventDefault();
          await this.saveCurrentFile();
        }

        // Cmd/Ctrl + W - 关闭当前标签
        if (cmdOrCtrl && (e.key === 'w' || e.key === 'W' || e.code === 'KeyW' || e.keyCode === 87)) {
          e.preventDefault();
          const activeFile = store.getState('editor.activeFile');
          if (activeFile) {
            this.editor.closeTab(activeFile);
          }
        }

        // Cmd/Ctrl + Tab - 切换到下一个标签
        if (cmdOrCtrl && (e.key === 'Tab' || e.code === 'Tab' || e.keyCode === 9) && !e.shiftKey) {
          e.preventDefault();
          const tabs = this.editor.openTabs;
          if (tabs.length > 1) {
            const currentIndex = tabs.findIndex(tab => tab.isActive);
            const nextIndex = (currentIndex + 1) % tabs.length;
            this.editor.switchTab(tabs[nextIndex].path);
          }
        }

        // Cmd/Ctrl + Shift + Tab - 切换到上一个标签
        if (cmdOrCtrl && e.shiftKey && (e.key === 'Tab' || e.code === 'Tab' || e.keyCode === 9)) {
          e.preventDefault();
          const tabs = this.editor.openTabs;
          if (tabs.length > 1) {
            const currentIndex = tabs.findIndex(tab => tab.isActive);
            const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
            this.editor.switchTab(tabs[prevIndex].path);
          }
        }

        // Cmd/Ctrl + Shift + C - 继续上次对话 (MVP-1.1)
        if (cmdOrCtrl && e.shiftKey && (e.key === 'c' || e.key === 'C' || e.code === 'KeyC' || e.keyCode === 67)) {
          e.preventDefault();
          e.stopPropagation();
          // 确保 AI 面板是打开的
          if (!store.getState('ui.aiPanelVisible')) {
            store.setState('ui.aiPanelVisible', true);
          }
          // 调用 AI 聊天组件的继续对话方法
          if (window.aiChat && typeof window.aiChat.continueLastConversation === 'function') {
            window.aiChat.continueLastConversation();
          }
        }

        // Cmd/Ctrl + Shift + F - 打开搜索
        if (cmdOrCtrl && e.shiftKey && (e.key === 'f' || e.key === 'F' || e.code === 'KeyF' || e.keyCode === 70)) {
          e.preventDefault();
          e.stopPropagation();
          this.showSearchPanel();
        }
      });

    }

    subscribeToStore() {
      // 监听 AI 面板可见性
      store.subscribe('ui.aiPanelVisible', (visible) => {
        const aiPanel = document.querySelector('.ai-panel');
        const aiResizer = document.getElementById('ai-resizer');
        
        console.log('👁️ AI 面板可见性变化', {
          visible: visible,
          hasPanel: !!aiPanel,
          hasResizer: !!aiResizer,
          currentWidth: aiPanel ? aiPanel.getBoundingClientRect().width : null
        });
        
        if (aiPanel) {
          if (visible) {
            aiPanel.classList.remove('hidden');
            if (aiResizer) aiResizer.classList.remove('hidden');
          } else {
            aiPanel.classList.add('hidden');
            if (aiResizer) aiResizer.classList.add('hidden');
          }
        }
      });

      // 监听终端显示状态
      store.subscribe('ui.terminalVisible', (visible) => {
        this.updateTerminalVisibility(visible);
      });

      // 监听终端高度
      store.subscribe('ui.terminalHeight', (height) => {
        if (typeof height === 'number') {
          document.documentElement.style.setProperty('--terminal-height', `${height}px`);
        }
      });

      // 监听 AI 处理状态
      store.subscribe('ai.isProcessing', (isProcessing) => {
        const sendBtn = document.getElementById('send-chat-btn');
        if (sendBtn) {
          sendBtn.disabled = isProcessing;
          sendBtn.textContent = isProcessing ? '⏳' : '➤';
        }
      });

    }

    updateTerminalVisibility(visible) {
      const terminalPanel = document.querySelector('.terminal-panel');
      const terminalResizer = document.getElementById('terminal-resizer');

      if (!terminalPanel || !terminalResizer) return;

      if (visible) {
        terminalPanel.classList.remove('hidden');
        terminalPanel.style.display = 'flex';
        terminalResizer.classList.remove('hidden');
        terminalResizer.style.display = '';
      } else {
        terminalPanel.classList.add('hidden');
        terminalPanel.style.display = 'none';
        terminalResizer.classList.add('hidden');
        terminalResizer.style.display = 'none';
      }
    }

    toggleAIPanel() {
      const visible = store.getState('ui.aiPanelVisible');
      store.setState('ui.aiPanelVisible', !visible);
      
      if (!visible) {
        // 打开 AI 面板
        toast.show('💬 AI 助手已打开 (Cmd+Shift+L 关闭)', 'info', 2000);
        
        // MVP-1.1: 初始化 AI 聊天组件
        if (!window.aiChat) {
          try {
            const aiChatContainer = document.querySelector('.ai-panel');
            if (aiChatContainer && typeof AIChatComponent !== 'undefined') {
              window.aiChat = new AIChatComponent('aiChatContainer');
              window.aiChat.init();
            }
          } catch (error) {
            console.warn('⚠️ 无法初始化 AI 聊天组件:', error);
          }
        }
        
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
          setTimeout(() => chatInput.focus(), 100);
        } else {
          console.warn('⚠️ 找不到 chat-input 元素');
        }
      } else {
        // 关闭 AI 面板
        toast.show('AI 助手已关闭', 'info', 1500);
      }
    }

    async saveCurrentFile() {
      try {
        const activeFile = store.getState('editor.activeFile');
        if (!activeFile) {
          toast.show('没有打开的文件', 'warning');
          return;
        }
        
        const success = await this.editor.save();
        if (success) {
          const fileName = activeFile.split('/').pop();
          toast.show(`文件已保存: ${fileName}`, 'success');
        } else {
          toast.show('保存失败', 'error');
        }
      } catch (error) {
        console.error('保存失败:', error);
        toast.show(`保存失败: ${error.message}`, 'error');
      }
    }

    /**
     * 启动 Claude AI 服务
     */
    async startClaude() {
      try {
        if (window.electronAPI && window.electronAPI.claude) {
          const result = await window.electronAPI.claude.start();
          if (result.success) {
            this.claudeConnected = true;
            this.updateClaudeStatus('connected');
            console.log('✅ Claude AI 已启动');
          } else {
            console.warn('⚠️ Claude AI 启动失败:', result.message);
            this.updateClaudeStatus('disconnected');
          }
        }
      } catch (error) {
        console.error('❌ Claude AI 启动异常:', error);
        this.updateClaudeStatus('error', error.message);
      }
    }

    /**
     * 设置 Claude 事件监听
     */
    setupClaudeListeners() {
      if (!window.electronAPI || !window.electronAPI.claude) return;

      // 连接成功
      window.electronAPI.claude.onConnected(() => {
        this.claudeConnected = true;
        this.claudeReconnecting = false;
        this.updateClaudeStatus('connected');
        console.log('🔗 Claude AI 已连接');
      });

      // 连接断开
      window.electronAPI.claude.onDisconnected(() => {
        this.claudeConnected = false;
        this.updateClaudeStatus('disconnected');
        console.warn('⚠️ Claude AI 已断开');
      });

      // 重连中
      window.electronAPI.claude.onReconnecting((attempt) => {
        this.claudeReconnecting = true;
        this.updateClaudeStatus('reconnecting', `重连中 (${attempt})`);
        console.log(`🔄 Claude AI 重连中 (第 ${attempt} 次尝试)`);
      });

      // 错误
      window.electronAPI.claude.onError((error) => {
        this.updateClaudeStatus('error', error.message);
        console.error('❌ Claude AI 错误:', error);
      });

      // 消息块（流式响应）
      window.electronAPI.claude.onMessageChunk((chunk) => {
        this.appendToLastMessage(chunk);
      });
    }

    /**
     * 更新 Claude 连接状态显示
     */
    updateClaudeStatus(status, message = '') {
      const statusIndicator = document.querySelector('.claude-status');
      if (!statusIndicator) return;

      const statusConfig = {
        connected: { text: '● 已连接', class: 'status-connected', color: '#4ade80' },
        disconnected: { text: '● 已断开', class: 'status-disconnected', color: '#ef4444' },
        reconnecting: { text: `● ${message}`, class: 'status-reconnecting', color: '#fbbf24' },
        error: { text: `● 错误`, class: 'status-error', color: '#ef4444' }
      };

      const config = statusConfig[status] || statusConfig.disconnected;
      statusIndicator.textContent = config.text;
      statusIndicator.className = `claude-status ${config.class}`;
      statusIndicator.style.color = config.color;
    }

    async sendChatMessage() {
      const chatInput = document.getElementById('chat-input');
      const message = chatInput?.value.trim();
      
      if (!message) return;

      // 检查 Claude 是否连接
      if (!this.claudeConnected) {
        this.addMessageToChat('error', 'Claude AI 未连接，请稍候...');
        // 尝试重新启动
        await this.startClaude();
        return;
      }

      if (chatInput) {
        chatInput.value = '';
      }

      // 显示用户消息
      this.addMessageToChat('user', message);
      
      // 保存用户消息到历史
      await window.electronAPI.history.addMessage('user', message);

      // 创建 AI 消息占位符（用于流式响应）
      const assistantMessageId = this.addMessageToChat('assistant', '');

      try {
        // 获取上下文
        const context = this.contextManager.getCurrentContext();
        const prompt = this.contextManager.buildPrompt(message, context);

        // 发送消息到 Claude
        const result = await window.electronAPI.claude.sendMessage(prompt);
        
        // 检查结果
        if (result && result.success && result.response) {
          // 更新最后的消息内容
          this.updateMessageContent(assistantMessageId, result.response);
          // 保存 AI 响应到历史
          await window.electronAPI.history.addMessage('assistant', result.response);
          // 保存当前对话
          await window.electronAPI.history.save();
        } else {
          // 显示错误
          this.updateMessageContent(assistantMessageId, '');
          this.addMessageToChat('error', 'AI 响应失败: ' + (result?.error || '未知错误'));
        }
      } catch (error) {
        console.error('AI 聊天失败:', error);
        this.updateMessageContent(assistantMessageId, '');
        this.addMessageToChat('error', 'AI 响应失败: ' + error.message);
      }
    }

    addMessageToChat(role, content) {
      const messagesContainer = document.getElementById('chat-messages');
      if (!messagesContainer) return null;

      const messageDiv = document.createElement('div');
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      messageDiv.id = messageId;
      messageDiv.className = `message message-${role}`;
      messageDiv.dataset.rawContent = content; // 保存原始内容用于流式更新
      
      const now = new Date();
      const time = now.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      const avatar = role === 'user' ? '👤' : role === 'assistant' ? '🤖' : '⚠️';
      const author = role === 'user' ? '你' : role === 'assistant' ? 'Claude' : '系统';

      messageDiv.innerHTML = `
        <div class="message-header">
          <span class="message-author">${author}</span>
          <span class="message-time">${time}</span>
        </div>
        <div class="message-body">${this.formatMessage(content)}</div>
      `;

      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      return messageId;
    }

    /**
     * 追加内容到最后一条消息（用于流式响应）
     */
    appendToLastMessage(chunk) {
      const messagesContainer = document.getElementById('chat-messages');
      if (!messagesContainer) return;

      const messages = messagesContainer.querySelectorAll('.message-assistant');
      if (messages.length === 0) return;

      const lastMessage = messages[messages.length - 1];
      const messageBody = lastMessage.querySelector('.message-body');
      if (!messageBody) return;

      // 累积原始内容
      const currentRawContent = lastMessage.dataset.rawContent || '';
      const newRawContent = currentRawContent + chunk;
      lastMessage.dataset.rawContent = newRawContent;

      // 更新显示内容
      messageBody.innerHTML = this.formatMessage(newRawContent);
      
      // 自动滚动到底部
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * 更新指定消息的内容
     */
    updateMessageContent(messageId, content) {
      if (!messageId) return;

      const messageDiv = document.getElementById(messageId);
      if (!messageDiv) return;

      const messageBody = messageDiv.querySelector('.message-body');
      if (!messageBody) return;

      messageDiv.dataset.rawContent = content;
      messageBody.innerHTML = this.formatMessage(content);
    }

    formatMessage(content) {
      if (!content) return '';
      
      // 确保 content 是字符串
      let formatted = typeof content === 'string' ? content : String(content);
      
      // 代码块
      formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
      // 行内代码
      formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
      // 粗体
      formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // 斜体
      formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      // 换行
      formatted = formatted.replace(/\n/g, '<br>');
      return formatted;
    }

    /**
     * 初始化错误诊断系统
     */
    initErrorDiagnostics() {
      // 注意：ErrorDiagnostics 需要动态加载
      // 这里暂时只初始化占位符，实际功能在后续完善
      try {
        // 如果 ErrorDiagnostics 类可用
        if (typeof ErrorDiagnostics !== 'undefined') {
          this.errorDiagnostics = new ErrorDiagnostics(
            this.editor.editor,
            window.electronAPI.claude,
            this.contextManager
          );
          this.errorDiagnostics.init();
        }
      } catch (error) {
        console.warn('错误诊断初始化失败:', error);
      }
    }

    /**
     * 初始化对话历史
     */
    async initChatHistory() {
      try {
        // 开始新对话
        const result = await window.electronAPI.history.new({
          filePath: this.editor.getActiveFilePath(),
          language: this.editor.getActiveLanguage(),
          projectPath: await window.electronAPI.getProjectDir()
        });
        
        if (result.success) {
          this.currentConversationId = result.conversationId;
        }
      } catch (error) {
        console.error('初始化对话历史失败:', error);
      }
    }

    showWelcome() {
      // Show welcome message
      toast.show('🤖 Welcome to Claude Studio v2.0!', 'info', 3000);
    }

    // ==================== 内联编辑功能 ====================

    /**
     * 显示内联编辑对话框
     */
    async showInlineEditDialog() {
      // 检查是否有编辑器和选中的代码
      if (!this.editor || !this.editor.editor) {
        toast.show('⚠️ 请先打开一个文件', 'warning');
        return;
      }

      const selection = this.editor.editor.getSelection();
      if (!selection || selection.isEmpty()) {
        toast.show('⚠️ 请先选中要编辑的代码', 'warning');
        return;
      }

      // 检查 Claude 是否连接
      if (!this.claudeConnected) {
        toast.show('⚠️ Claude AI 未连接', 'warning');
        await this.startClaude();
        return;
      }

      // 创建内联编辑对话框
      const dialog = document.createElement('div');
      dialog.className = 'inline-edit-dialog';
      dialog.innerHTML = `
        <div class="inline-edit-content">
          <div class="inline-edit-header">
            <span>✨ AI 内联编辑</span>
            <button class="inline-edit-close">×</button>
          </div>
          <div class="inline-edit-body">
            <input 
              type="text" 
              class="inline-edit-input" 
              placeholder="输入编辑指令，例如：重构这段代码、添加注释、优化性能..."
              autofocus
            />
            <div class="inline-edit-actions">
              <button class="inline-edit-cancel">取消 (Esc)</button>
              <button class="inline-edit-submit">编辑 (Enter)</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      const input = dialog.querySelector('.inline-edit-input');
      const submitBtn = dialog.querySelector('.inline-edit-submit');
      const cancelBtn = dialog.querySelector('.inline-edit-cancel');
      const closeBtn = dialog.querySelector('.inline-edit-close');

      // 聚焦输入框
      setTimeout(() => input.focus(), 100);

      // 关闭对话框
      const closeDialog = () => {
        dialog.remove();
      };

      // 提交编辑
      const submitEdit = async () => {
        const instruction = input.value.trim();
        if (!instruction) {
          toast.show('⚠️ 请输入编辑指令', 'warning');
          return;
        }

        closeDialog();
        await this.handleInlineEdit(instruction);
      };

      // 绑定事件
      submitBtn.addEventListener('click', submitEdit);
      cancelBtn.addEventListener('click', closeDialog);
      closeBtn.addEventListener('click', closeDialog);

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeDialog();
        }
      });

      // 点击外部关闭
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          closeDialog();
        }
      });
    }

    /**
     * 处理内联编辑请求
     */
    async handleInlineEdit(instruction) {
      try {
        const editor = this.editor.editor;
        const model = editor.getModel();
        const selection = editor.getSelection();
        
        if (!selection || selection.isEmpty()) {
          toast.show('⚠️ 没有选中的代码', 'warning');
          return;
        }

        const selectedText = model.getValueInRange(selection);
        
        // 显示加载状态
        toast.show('⏳ AI 正在编辑代码...', 'info');

        // 构建提示词
        const context = this.contextManager.getCurrentContext();
        const prompt = `请根据以下指令修改选中的代码。只返回修改后的代码，不要包含任何解释或 markdown 代码块标记。

指令: ${instruction}

原始代码:
${selectedText}

修改后的代码:`;

        // 发送到 Claude
        const response = await window.electronAPI.claude.sendMessage(prompt);
        
        if (!response) {
          throw new Error('AI 未返回响应');
        }

        // 提取代码
        const editedCode = this.contextManager.extractCodeBlock(response);

        // 显示 diff 预览
        this.showDiffPreview(selectedText, editedCode, selection);

      } catch (error) {
        console.error('内联编辑失败:', error);
        toast.show(`❌ 编辑失败: ${error.message}`, 'error');
      }
    }

    /**
     * 显示 diff 预览并让用户选择接受或拒绝
     */
    showDiffPreview(originalCode, editedCode, selection) {
      // 创建 diff 预览对话框
      const dialog = document.createElement('div');
      dialog.className = 'diff-preview-dialog';
      dialog.innerHTML = `
        <div class="diff-preview-content">
          <div class="diff-preview-header">
            <span>📝 预览更改</span>
            <button class="diff-preview-close">×</button>
          </div>
          <div class="diff-preview-body">
            <div class="diff-preview-section">
              <div class="diff-label">原始代码:</div>
              <pre class="diff-code diff-original">${this.escapeHtml(originalCode)}</pre>
            </div>
            <div class="diff-preview-section">
              <div class="diff-label">修改后:</div>
              <pre class="diff-code diff-edited">${this.escapeHtml(editedCode)}</pre>
            </div>
          </div>
          <div class="diff-preview-actions">
            <button class="diff-reject">拒绝 (Esc)</button>
            <button class="diff-accept">接受 (Enter)</button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      const acceptBtn = dialog.querySelector('.diff-accept');
      const rejectBtn = dialog.querySelector('.diff-reject');
      const closeBtn = dialog.querySelector('.diff-preview-close');

      // 关闭对话框
      const closeDialog = () => {
        dialog.remove();
      };

      // 接受更改
      const acceptChanges = () => {
        const editor = this.editor.editor;
        editor.executeEdits('inline-edit', [{
          range: selection,
          text: editedCode
        }]);
        closeDialog();
        toast.show('✅ 已应用更改', 'success');
      };

      // 拒绝更改
      const rejectChanges = () => {
        closeDialog();
        toast.show('❌ 已拒绝更改', 'info');
      };

      // 绑定事件
      acceptBtn.addEventListener('click', acceptChanges);
      rejectBtn.addEventListener('click', rejectChanges);
      closeBtn.addEventListener('click', rejectChanges);

      // 键盘快捷键
      const keyHandler = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          acceptChanges();
          document.removeEventListener('keydown', keyHandler);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          rejectChanges();
          document.removeEventListener('keydown', keyHandler);
        }
      };
      document.addEventListener('keydown', keyHandler);

      // 点击外部关闭
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          rejectChanges();
          document.removeEventListener('keydown', keyHandler);
        }
      });
    }

    /**
     * HTML 转义
     */
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // ==================== 智能代码补全 ====================

    /**
     * 设置代码补全
     */
    setupCodeCompletion() {
      if (!this.editor || !this.editor.editor) return;

      this.completionState = {
        isShowing: false,
        suggestion: null,
        decorations: [],
        typingTimer: null,
        lastTriggerPosition: null
      };

      // 监听内容变化
      this.editor.editor.onDidChangeModelContent((e) => {
        this.handleContentChange(e);
      });

      // 监听键盘事件
      this.editor.editor.onKeyDown((e) => {
        this.handleCompletionKeyDown(e);
      });
    }

    /**
     * 处理内容变化
     */
    handleContentChange(e) {
      // 清除之前的定时器
      if (this.completionState.typingTimer) {
        clearTimeout(this.completionState.typingTimer);
      }

      // 如果正在显示补全，先清除
      if (this.completionState.isShowing) {
        this.clearCompletion();
      }

      // 检查是否应该触发补全
      const editor = this.editor.editor;
      const position = editor.getPosition();
      const model = editor.getModel();
      
      if (!position || !model) return;

      // 获取当前行内容
      const lineContent = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineContent.substring(0, position.column - 1);

      // 触发条件：
      // 1. 至少输入了一些字符
      // 2. 不是空格或特殊字符结尾
      // 3. Claude 已连接
      const shouldTrigger = textBeforeCursor.length > 2 && 
                           /[a-zA-Z0-9_]$/.test(textBeforeCursor) &&
                           this.claudeConnected;

      if (shouldTrigger) {
        // 延迟触发补全（停止输入 800ms 后）
        this.completionState.typingTimer = setTimeout(() => {
          this.triggerCompletion(position);
        }, 800);
      }
    }

    /**
     * 触发代码补全
     */
    async triggerCompletion(position) {
      try {
        const editor = this.editor.editor;
        const model = editor.getModel();
        
        if (!model) return;

        // 记录触发位置
        this.completionState.lastTriggerPosition = position;

        // 获取上下文
        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1);
        const textAfterCursor = lineContent.substring(position.column - 1);

        // 获取前几行代码作为上下文
        const startLine = Math.max(1, position.lineNumber - 10);
        const contextBefore = model.getValueInRange({
          startLineNumber: startLine,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        // 构建提示词
        const context = this.contextManager.getCurrentContext();
        const prompt = `请为以下代码提供智能补全。只返回应该补全的代码片段，不要包含任何解释或标记。

文件类型: ${context.language}
当前行前的代码:
${textBeforeCursor}

补全内容:`;

        // 发送到 Claude（简短版本，适合快速补全）
        const response = await window.electronAPI.claude.sendMessage(prompt, {
          maxTokens: 256,
          temperature: 0.3 // 降低随机性，获得更确定的补全
        });

        if (!response) return;

        // 提取补全内容
        const completion = this.extractCompletion(response, textBeforeCursor);

        if (completion && completion.trim()) {
          // 显示补全建议
          this.showCompletion(completion, position);
        }

      } catch (error) {
        console.error('代码补全失败:', error);
        // 静默失败，不打扰用户
      }
    }

    /**
     * 提取补全内容
     */
    extractCompletion(response, textBeforeCursor) {
      // 清理响应
      let completion = response.trim();
      
      // 移除代码块标记
      completion = completion.replace(/^```[\w]*\n?/gm, '');
      completion = completion.replace(/\n?```$/gm, '');
      
      // 移除可能的重复前缀
      const lastWord = textBeforeCursor.split(/\s+/).pop();
      if (lastWord && completion.startsWith(lastWord)) {
        completion = completion.substring(lastWord.length);
      }
      
      return completion;
    }

    /**
     * 显示补全建议（幽灵文本）
     */
    showCompletion(suggestion, position) {
      const editor = this.editor.editor;
      
      // 创建装饰（灰色幽灵文本）
      const decorations = editor.deltaDecorations(
        this.completionState.decorations,
        [
          {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column
            },
            options: {
              after: {
                content: suggestion.split('\n')[0], // 只显示第一行
                inlineClassName: 'ghost-text-suggestion'
              }
            }
          }
        ]
      );

      this.completionState.isShowing = true;
      this.completionState.suggestion = suggestion;
      this.completionState.decorations = decorations;

      // 显示提示：按 Tab 接受
      // 使用状态栏或轻微提示
    }

    /**
     * 清除补全建议
     */
    clearCompletion() {
      if (!this.editor || !this.editor.editor) return;

      const editor = this.editor.editor;
      
      if (this.completionState.decorations.length > 0) {
        editor.deltaDecorations(this.completionState.decorations, []);
      }

      this.completionState.isShowing = false;
      this.completionState.suggestion = null;
      this.completionState.decorations = [];
    }

    /**
     * 接受补全建议
     */
    acceptCompletion() {
      if (!this.completionState.isShowing || !this.completionState.suggestion) return;

      const editor = this.editor.editor;
      const position = editor.getPosition();
      
      if (!position) return;

      // 插入补全内容
      editor.executeEdits('accept-completion', [
        {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          },
          text: this.completionState.suggestion
        }
      ]);

      // 清除补全状态
      this.clearCompletion();
    }

    /**
     * 处理补全相关的键盘事件
     */
    handleCompletionKeyDown(e) {
      // Tab 键 - 接受补全
      if (e.keyCode === 2 && this.completionState.isShowing) { // 2 = Tab
        e.preventDefault();
        this.acceptCompletion();
        return;
      }

      // Escape 键 - 取消补全
      if (e.keyCode === 9 && this.completionState.isShowing) { // 9 = Escape
        e.preventDefault();
        this.clearCompletion();
        return;
      }

      // 方向键、退格等 - 清除补全
      if (this.completionState.isShowing) {
        const clearKeys = [13, 14, 15, 16, 1]; // Left, Up, Right, Down, Backspace
        if (clearKeys.includes(e.keyCode)) {
          this.clearCompletion();
        }
      }
    }

    // ==================== 会话管理 ====================

    /**
     * 显示会话管理对话框
     */
    async showSessionsDialog() {
      const dialog = document.createElement('div');
      dialog.className = 'settings-dialog';
      dialog.innerHTML = `
        <div class="settings-content">
          <div class="settings-header">
            <span class="settings-title">📋 会话管理</span>
            <button class="settings-close">×</button>
          </div>
          <div class="settings-body">
            <div class="loading-state">
              <div class="loading-spinner"></div>
              <div>加载会话列表...</div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      const closeBtn = dialog.querySelector('.settings-close');
      const settingsBody = dialog.querySelector('.settings-body');

      // 关闭对话框
      const closeDialog = () => {
        dialog.remove();
      };

      closeBtn.addEventListener('click', closeDialog);
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          closeDialog();
        }
      });

      // 加载会话列表
      try {
        const result = await window.electronAPI.claude.session.list();
        
        if (result.success && result.sessions && result.sessions.length > 0) {
          // 显示会话列表
          settingsBody.innerHTML = `
            <div class="sessions-list" id="sessions-list"></div>
          `;
          
          const sessionsList = document.getElementById('sessions-list');
          result.sessions.forEach(session => {
            this.renderSessionItem(sessionsList, session, closeDialog);
          });
        } else {
          // 显示空状态
          settingsBody.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">📭</div>
              <div class="empty-state-text">暂无会话记录</div>
            </div>
          `;
        }
      } catch (error) {
        console.error('加载会话列表失败:', error);
        settingsBody.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div class="empty-state-text">加载失败: ${error.message}</div>
          </div>
        `;
      }
    }

    /**
     * 渲染会话项
     */
    renderSessionItem(container, session, closeDialog) {
      const sessionItem = document.createElement('div');
      sessionItem.className = 'session-item';
      
      const sessionId = session.id || session.name || 'Unknown';
      const createdAt = session.created_at || session.createdAt || '未知时间';
      const lastActive = session.last_active || session.lastActive || '未知';
      
      sessionItem.innerHTML = `
        <div class="session-info">
          <div class="session-id">${sessionId}</div>
          <div class="session-meta">
            <span>创建: ${createdAt}</span>
            <span>最后活跃: ${lastActive}</span>
          </div>
        </div>
        <div class="session-actions">
          <button class="session-btn session-btn-restore" data-id="${sessionId}">恢复</button>
          <button class="session-btn session-btn-delete" data-id="${sessionId}">删除</button>
        </div>
      `;

      container.appendChild(sessionItem);

      // 恢复会话
      const restoreBtn = sessionItem.querySelector('.session-btn-restore');
      restoreBtn.addEventListener('click', async () => {
        try {
          toast.show('⏳ 正在恢复会话...', 'info');
          const result = await window.electronAPI.claude.session.restore(sessionId);
          if (result.success) {
            toast.show('✅ 会话已恢复', 'success');
            closeDialog();
          } else {
            toast.show(`❌ 恢复失败: ${result.error}`, 'error');
          }
        } catch (error) {
          toast.show(`❌ 恢复失败: ${error.message}`, 'error');
        }
      });

      // 删除会话
      const deleteBtn = sessionItem.querySelector('.session-btn-delete');
      deleteBtn.addEventListener('click', async () => {
        if (!confirm(`确定要删除会话 "${sessionId}" 吗？`)) return;
        
        try {
          toast.show('⏳ 正在删除会话...', 'info');
          const result = await window.electronAPI.claude.session.delete(sessionId);
          if (result.success) {
            toast.show('✅ 会话已删除', 'success');
            sessionItem.remove();
          } else {
            toast.show(`❌ 删除失败: ${result.error}`, 'error');
          }
        } catch (error) {
          toast.show(`❌ 删除失败: ${error.message}`, 'error');
        }
      });
    }

    // ==================== 对话历史管理 ====================

    /**
     * 显示对话历史对话框
     */
    async showHistoryDialog() {
      const dialog = document.createElement('div');
      dialog.className = 'settings-dialog';
      dialog.innerHTML = `
        <div class="settings-content" style="width: 700px; max-height: 80vh;">
          <div class="settings-header">
            <span class="settings-title">📚 对话历史</span>
            <button class="settings-close">×</button>
          </div>
          <div class="settings-body">
            <div class="history-controls" style="margin-bottom: 16px; display: flex; gap: 8px;">
              <input type="text" id="history-search" placeholder="搜索对话..." 
                     style="flex: 1; padding: 8px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-dark); color: var(--text);">
              <button class="sidebar-btn" id="export-all-btn" title="导出所有">📤</button>
              <button class="sidebar-btn" id="import-btn" title="导入">📥</button>
              <button class="sidebar-btn" id="clear-all-btn" title="清空">🗑️</button>
            </div>
            <div class="loading-state">
              <div class="loading-spinner"></div>
              <div>加载对话列表...</div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      // 关闭按钮
      const closeBtn = dialog.querySelector('.settings-close');
      closeBtn.addEventListener('click', () => dialog.remove());

      // 点击外部关闭
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.remove();
      });

      // 加载对话列表
      try {
        const result = await window.electronAPI.history.getAll();
        if (result.success) {
          this.renderHistoryList(dialog, result.conversations);
          
          // 绑定搜索功能
          const searchInput = dialog.querySelector('#history-search');
          searchInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            if (query) {
              const searchResult = await window.electronAPI.history.search(query);
              if (searchResult.success) {
                this.renderHistoryList(dialog, searchResult.results);
              }
            } else {
              const allResult = await window.electronAPI.history.getAll();
              if (allResult.success) {
                this.renderHistoryList(dialog, allResult.conversations);
              }
            }
          });

          // 导出所有按钮
          const exportAllBtn = dialog.querySelector('#export-all-btn');
          exportAllBtn.addEventListener('click', async () => {
            try {
              const result = await window.electronAPI.history.exportAll();
              if (result.success && !result.canceled) {
                toast.show(`✅ 已导出到: ${result.filePath}`, 'success');
              }
            } catch (error) {
              toast.show(`❌ 导出失败: ${error.message}`, 'error');
            }
          });

          // 导入按钮
          const importBtn = dialog.querySelector('#import-btn');
          importBtn.addEventListener('click', async () => {
            try {
              const result = await window.electronAPI.history.import();
              if (result.success && !result.canceled) {
                toast.show('✅ 对话已导入', 'success');
                // 重新加载列表
                const refreshResult = await window.electronAPI.history.getAll();
                if (refreshResult.success) {
                  this.renderHistoryList(dialog, refreshResult.conversations);
                }
              }
            } catch (error) {
              toast.show(`❌ 导入失败: ${error.message}`, 'error');
            }
          });

          // 清空所有按钮
          const clearAllBtn = dialog.querySelector('#clear-all-btn');
          clearAllBtn.addEventListener('click', async () => {
            if (!confirm('确定要清空所有对话历史吗？此操作不可恢复！')) return;
            try {
              await window.electronAPI.history.clearAll();
              toast.show('✅ 已清空所有历史', 'success');
              this.renderHistoryList(dialog, []);
            } catch (error) {
              toast.show(`❌ 清空失败: ${error.message}`, 'error');
            }
          });
        } else {
          const bodyEl = dialog.querySelector('.settings-body');
          bodyEl.innerHTML = `<div class="empty-state">加载失败: ${result.error}</div>`;
        }
      } catch (error) {
        const bodyEl = dialog.querySelector('.settings-body');
        bodyEl.innerHTML = `<div class="empty-state">加载失败: ${error.message}</div>`;
      }
    }

    /**
     * 渲染历史记录列表
     */
    renderHistoryList(dialog, conversations) {
      const bodyEl = dialog.querySelector('.settings-body');
      const controls = bodyEl.querySelector('.history-controls');
      
      if (conversations.length === 0) {
        bodyEl.innerHTML = '';
        bodyEl.appendChild(controls);
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = '暂无对话历史';
        bodyEl.appendChild(empty);
        return;
      }

      const listContainer = document.createElement('div');
      listContainer.className = 'sessions-list';
      listContainer.style.maxHeight = '60vh';
      listContainer.style.overflowY = 'auto';

      conversations.forEach(conv => {
        const item = this.renderHistoryItem(conv);
        listContainer.appendChild(item);
      });

      bodyEl.innerHTML = '';
      bodyEl.appendChild(controls);
      bodyEl.appendChild(listContainer);
    }

    /**
     * 渲染单个历史记录项
     */
    renderHistoryItem(conversation) {
      const item = document.createElement('div');
      item.className = 'session-item';
      
      const date = new Date(conversation.timestamp);
      const formattedDate = date.toLocaleString('zh-CN');
      const messageCount = conversation.messages.length;
      
      item.innerHTML = `
        <div class="session-info">
          <div class="session-id">${conversation.title || '无标题对话'}</div>
          <div class="session-meta">
            ${formattedDate} • ${messageCount} 条消息
            ${conversation.context.filePath ? `<br><span style="font-size: 10px; color: var(--text-dim);">📄 ${conversation.context.filePath}</span>` : ''}
          </div>
        </div>
        <div class="session-actions">
          <button class="session-btn session-btn-restore" title="恢复">📖</button>
          <button class="session-btn session-btn-export" title="导出">💾</button>
          <button class="session-btn session-btn-delete" title="删除">🗑️</button>
        </div>
      `;

      // 恢复对话
      const restoreBtn = item.querySelector('.session-btn-restore');
      restoreBtn.addEventListener('click', async () => {
        try {
          const result = await window.electronAPI.history.restore(conversation.id);
          if (result.success) {
            // 清空当前聊天
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) {
              chatMessages.innerHTML = '';
            }
            
            // 显示历史消息
            result.conversation.messages.forEach(msg => {
              this.addMessageToChat(msg.role, msg.content);
            });
            
            this.currentConversationId = conversation.id;
            toast.show('✅ 对话已恢复', 'success');
            
            // 关闭对话框
            document.querySelector('.settings-dialog').remove();
          } else {
            toast.show(`❌ 恢复失败: ${result.error}`, 'error');
          }
        } catch (error) {
          toast.show(`❌ 恢复失败: ${error.message}`, 'error');
        }
      });

      // 导出对话
      const exportBtn = item.querySelector('.session-btn-export');
      exportBtn.addEventListener('click', async () => {
        try {
          const result = await window.electronAPI.history.export(conversation.id);
          if (result.success && !result.canceled) {
            toast.show(`✅ 已导出到: ${result.filePath}`, 'success');
          }
        } catch (error) {
          toast.show(`❌ 导出失败: ${error.message}`, 'error');
        }
      });

      // 删除对话
      const deleteBtn = item.querySelector('.session-btn-delete');
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('确定要删除这条对话吗？')) return;
        
        try {
          const result = await window.electronAPI.history.delete(conversation.id);
          if (result.success) {
            toast.show('✅ 对话已删除', 'success');
            item.remove();
          } else {
            toast.show(`❌ 删除失败: ${result.error}`, 'error');
          }
        } catch (error) {
          toast.show(`❌ 删除失败: ${error.message}`, 'error');
        }
      });

      return item;
    }

    // ==================== 模型管理 ====================

    /**
     * 显示模型选择对话框
     */
    async showModelSelectDialog() {
      const dialog = document.createElement('div');
      dialog.className = 'settings-dialog';
      dialog.innerHTML = `
        <div class="settings-content">
          <div class="settings-header">
            <span class="settings-title">⚙️ 选择模型</span>
            <button class="settings-close">×</button>
          </div>
          <div class="settings-body">
            <div class="loading-state">
              <div class="loading-spinner"></div>
              <div>加载模型列表...</div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      const closeBtn = dialog.querySelector('.settings-close');
      const settingsBody = dialog.querySelector('.settings-body');

      // 关闭对话框
      const closeDialog = () => {
        dialog.remove();
      };

      closeBtn.addEventListener('click', closeDialog);
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          closeDialog();
        }
      });

      // 加载模型列表和当前模型
      try {
        const [modelsResult, currentResult] = await Promise.all([
          window.electronAPI.claude.model.list(),
          window.electronAPI.claude.model.current()
        ]);

        const currentModel = currentResult.success ? currentResult.model : null;
        
        if (modelsResult.success && modelsResult.models && modelsResult.models.length > 0) {
          // 显示模型列表
          settingsBody.innerHTML = `
            <div class="models-list" id="models-list"></div>
          `;
          
          const modelsList = document.getElementById('models-list');
          modelsResult.models.forEach(model => {
            this.renderModelItem(modelsList, model, currentModel, closeDialog);
          });
        } else {
          settingsBody.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">⚠️</div>
              <div class="empty-state-text">无法加载模型列表</div>
            </div>
          `;
        }
      } catch (error) {
        console.error('加载模型列表失败:', error);
        settingsBody.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div class="empty-state-text">加载失败: ${error.message}</div>
          </div>
        `;
      }
    }

    /**
     * 渲染模型项
     */
    renderModelItem(container, model, currentModel, closeDialog) {
      const modelItem = document.createElement('div');
      const isActive = model.id === currentModel;
      modelItem.className = `model-item ${isActive ? 'active' : ''}`;
      
      const modelName = model.name || model.id;
      const modelDescription = model.description || '';
      const modelId = model.id;
      
      modelItem.innerHTML = `
        <div class="model-name">
          ${modelName}
          ${isActive ? '<span class="model-badge">当前</span>' : ''}
        </div>
        ${modelDescription ? `<div class="model-description">${modelDescription}</div>` : ''}
        <div class="model-id">${modelId}</div>
      `;

      container.appendChild(modelItem);

      // 点击选择模型
      modelItem.addEventListener('click', async () => {
        if (isActive) return; // 已经是当前模型
        
        try {
          toast.show('⏳ 正在切换模型...', 'info');
          const result = await window.electronAPI.claude.model.set(modelId);
          
          if (result.success) {
            toast.show(`✅ 已切换到 ${modelName}`, 'success');
            
            // 更新所有模型项的状态
            container.querySelectorAll('.model-item').forEach(item => {
              item.classList.remove('active');
              const badge = item.querySelector('.model-badge');
              if (badge) badge.remove();
            });
            
            // 标记当前选中的模型
            modelItem.classList.add('active');
            const nameDiv = modelItem.querySelector('.model-name');
            if (nameDiv) {
              nameDiv.innerHTML += '<span class="model-badge">当前</span>';
            }
            
            // 重启 Claude 服务以使用新模型
            await this.startClaude();
            
            setTimeout(() => closeDialog(), 1000);
          } else {
            toast.show(`❌ 切换失败: ${result.error}`, 'error');
          }
        } catch (error) {
          toast.show(`❌ 切换失败: ${error.message}`, 'error');
        }
      });
    }

    /**
     * 显示工作区状态管理对话框
     */
    async showWorkspaceStateDialog() {
      const dialog = document.createElement('div');
      dialog.className = 'settings-dialog';
      
      const savedState = await this.workspaceState.loadState();
      const hasState = savedState !== null;
      const stateInfo = hasState ? `
        <div style="padding: 12px; background: var(--bg-tertiary); border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">💾 保存的状态信息</div>
          <div style="font-size: 14px;">
            <div>📅 保存时间: ${new Date(savedState.timestamp).toLocaleString('zh-CN')}</div>
            <div>📂 打开标签: ${savedState.editor?.openTabs?.length || 0} 个</div>
            <div>📏 侧边栏宽度: ${savedState.ui?.sidebarWidth || 250}px</div>
            <div>🤖 AI 面板: ${savedState.ui?.aiPanelVisible ? '显示' : '隐藏'}</div>
          </div>
        </div>
      ` : '<div style="padding: 12px; text-align: center; color: var(--text-dim);">暂无保存的工作区状态</div>';
      
      dialog.innerHTML = `
        <div class="settings-content" style="width: 500px;">
          <div class="settings-header">
            <span class="settings-title">💾 工作区状态管理</span>
            <button class="settings-close">×</button>
          </div>
          <div class="settings-body">
            ${stateInfo}
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <button class="session-btn" id="save-state-btn" style="width: 100%; padding: 12px; justify-content: center;">
                💾 立即保存工作区状态
              </button>
              
              <button class="session-btn" id="restore-state-btn" style="width: 100%; padding: 12px; justify-content: center;" ${!hasState ? 'disabled' : ''}>
                🔄 恢复工作区状态
              </button>
              
              <button class="session-btn" id="clear-state-btn" style="width: 100%; padding: 12px; justify-content: center;" ${!hasState ? 'disabled' : ''}>
                🗑️ 清除保存的状态
              </button>
            </div>
            
            <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-color);">
              <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
                <strong>💡 功能说明：</strong><br>
                • 自动保存：每30秒自动保存一次<br>
                • 退出保存：关闭应用时自动保存<br>
                • 恢复内容：打开的文件、UI布局、面板状态等<br>
                • 下次启动时将自动恢复您的工作环境
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      // 关闭按钮
      const closeBtn = dialog.querySelector('.settings-close');
      const closeDialog = () => dialog.remove();
      closeBtn.addEventListener('click', closeDialog);
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) closeDialog();
      });

      // 立即保存按钮
      const saveBtn = dialog.querySelector('#save-state-btn');
      saveBtn.addEventListener('click', async () => {
        // 先收集当前状态，让用户看到
        const state = this.workspaceState.collectState();
        const tabCount = state.editor.openTabs.length;
        
        console.log('🔍 即将保存的状态:', state);
        console.log('📂 当前打开标签数:', tabCount);
        
        // 如果没有标签，警告用户
        if (tabCount === 0) {
          const confirm = window.confirm(
            '⚠️ 警告：当前没有打开的标签页！\n\n' +
            '保存空状态会清除之前保存的所有文件。\n\n' +
            '是否继续保存？'
          );
          if (!confirm) {
            toast.show('❌ 已取消保存', 'info');
            return;
          }
        }
        
        const success = await this.workspaceState.saveState();
        if (success) {
          toast.show(`✅ 工作区状态已保存 (${tabCount} 个标签)`, 'success');
          closeDialog();
        } else {
          toast.show('❌ 保存失败（可能被保护机制阻止）', 'warning');
        }
      });

      // 恢复状态按钮
      const restoreBtn = dialog.querySelector('#restore-state-btn');
      if (hasState) {
        restoreBtn.addEventListener('click', async () => {
          try {
            await this.workspaceState.applyState(savedState, this);
            toast.show('✅ 工作区状态已恢复', 'success');
            closeDialog();
          } catch (error) {
            toast.show('❌ 恢复失败: ' + error.message, 'error');
          }
        });
      }

      // 清除状态按钮
      const clearBtn = dialog.querySelector('#clear-state-btn');
      if (hasState) {
        clearBtn.addEventListener('click', async () => {
          if (confirm('确定要清除保存的工作区状态吗？')) {
            const success = await this.workspaceState.clearState();
            if (success) {
              toast.show('✅ 工作区状态已清除', 'success');
              closeDialog();
            } else {
              toast.show('❌ 清除失败', 'error');
            }
          }
        });
      }
    }
  }

  // ==================== 初始化 ====================
  const studio = new ClaudeStudio();
  console.log('✓ ClaudeStudio 类已实例化');

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    console.log('ℹ️ DOM 加载中，等待 DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('✓ DOMContentLoaded 事件触发，开始初始化...');
      studio.init().catch(err => {
        console.error('❌ 初始化失败:', err);
      });
    });
  } else {
    console.log('✓ DOM 已加载，立即初始化...');
    studio.init().catch(err => {
      console.error('❌ 初始化失败:', err);
    });
  }

  // 导出供外部使用
  window.studio = studio;
  window.store = store;
  console.log('✓ 全局变量导出完成');

  // 注: window.aiChat 会在 toggleAIPanel 时被 AIChatComponent 创建和设置
  // 注: window.chatHistoryManager 会由 AIChatComponent 或其他模块设置
  
  // 暴露附件管理系统供外部使用
  if (studio && studio.attachmentManager) {
    window.attachmentManager = studio.attachmentManager;
    window.fileValidator = studio.fileValidator;
    console.log('✓ 附件管理系统已暴露到全局');
  }

})();

