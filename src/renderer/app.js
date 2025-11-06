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
  }

  // ==================== 可调整大小管理器 ====================
  class ResizerManager {
    constructor() {
      this.isResizing = false;
      this.currentResizer = null;
      this.startX = 0;
      this.startWidth = 0;
      this.targetElement = null;
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
        this.setupResizer(aiResizer, aiPanel, 'width');
      }
    }

    setupResizer(resizer, targetElement, dimension) {
      resizer.addEventListener('mousedown', (e) => {
        this.startResize(e, resizer, targetElement, dimension);
      });
    }

    startResize(e, resizer, targetElement, dimension) {
      e.preventDefault();
      this.isResizing = true;
      this.currentResizer = resizer;
      this.targetElement = targetElement;
      this.startX = e.clientX;
      
      // 获取当前宽度
      const rect = targetElement.getBoundingClientRect();
      this.startWidth = rect.width;
      
      // 添加全局事件监听器
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
      
      // 添加不可选择的样式（防止文本被选中）
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    handleMouseMove = (e) => {
      if (!this.isResizing || !this.targetElement) return;
      
      const deltaX = e.clientX - this.startX;
      let newWidth;
      
      // 判断是左侧还是右侧元素
      if (this.targetElement.classList.contains('ai-panel')) {
        // AI 面板在右侧，向左拖动增加宽度
        newWidth = this.startWidth - deltaX;
      } else {
        // 侧边栏在左侧，向右拖动增加宽度
        newWidth = this.startWidth + deltaX;
      }
      
      // 获取最小和最大宽度
      const minWidth = parseInt(getComputedStyle(this.targetElement).minWidth) || 200;
      const maxWidth = parseInt(getComputedStyle(this.targetElement).maxWidth) || 800;
      
      // 限制宽度范围
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      
      // 应用新宽度（通过 CSS 变量）
      if (this.targetElement.classList.contains('sidebar')) {
        document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
        store.setState('ui.sidebarWidth', newWidth);
      } else if (this.targetElement.classList.contains('ai-panel')) {
        document.documentElement.style.setProperty('--ai-panel-width', `${newWidth}px`);
        store.setState('ui.aiPanelWidth', newWidth);
      }
    }

    handleMouseUp = () => {
      if (!this.isResizing) return;
      
      this.isResizing = false;
      this.currentResizer = null;
      this.targetElement = null;
      this.moveCount = 0;
      
      // 移除全局事件监听器
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
      
      // 恢复样式
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      
    }
  }

  // ==================== 主应用类 ====================
  class ClaudeStudio {
    constructor() {
      this.editor = null;
      this.ai = null;
      this.files = null;
      this.resizer = null;
      this.initialized = false;
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
        this.resizer = new ResizerManager();

        // 初始化编辑器
        const editorContainer = document.getElementById('editor-container');
        if (editorContainer) {
          await this.editor.init(editorContainer);
        }

        // 初始化文件树
        const fileTreeContainer = document.getElementById('file-tree');
        if (fileTreeContainer) {
          await this.files.loadFileTree();
          this.files.renderTree(fileTreeContainer);
        }

        // 初始化可调整大小的分隔条
        this.resizer.init();

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

        this.initialized = true;
        this.showWelcome();
      } catch (error) {
        console.error('❌ 初始化失败:', error);
        alert('应用初始化失败: ' + error.message);
      }
    }

    bindEvents() {
      // 文件打开事件
      window.addEventListener('file:open', async (e) => {
        const { path, content, language } = e.detail;
        this.editor.openFile(path, content, language);
        
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
          toast.show('终端功能需要重新编译 node-pty 模块', 'warning', 2000);
        });
      }

      // 快速搜索框（暂时只添加焦点提示）
      const quickSearch = document.getElementById('quick-search');
      if (quickSearch) {
        quickSearch.addEventListener('focus', () => {
          toast.show('搜索功能开发中...', 'info', 2000);
        });
        quickSearch.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            quickSearch.blur();
          }
        });
      }

    }

    bindKeyboardShortcuts() {
      document.addEventListener('keydown', async (e) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

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
      });

    }

    subscribeToStore() {
      // 监听 AI 面板可见性
      store.subscribe('ui.aiPanelVisible', (visible) => {
        const aiPanel = document.querySelector('.ai-panel');
        const aiResizer = document.getElementById('ai-resizer');
        
        
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

      // 监听 AI 处理状态
      store.subscribe('ai.isProcessing', (isProcessing) => {
        const sendBtn = document.getElementById('send-chat-btn');
        if (sendBtn) {
          sendBtn.disabled = isProcessing;
          sendBtn.textContent = isProcessing ? '⏳' : '➤';
        }
      });

    }

    toggleAIPanel() {
      const visible = store.getState('ui.aiPanelVisible');
      store.setState('ui.aiPanelVisible', !visible);
      
      if (!visible) {
        // 打开 AI 面板
        toast.show('💬 AI 助手已打开 (Cmd+Shift+L 关闭)', 'info', 2000);
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

    async sendChatMessage() {
      const chatInput = document.getElementById('chat-input');
      const message = chatInput?.value.trim();
      
      if (!message) return;

      if (chatInput) {
        chatInput.value = '';
      }

      this.addMessageToChat('user', message);

      try {
        const { response } = await this.ai.chat(message);
        this.addMessageToChat('assistant', response);
      } catch (error) {
        console.error('AI 聊天失败:', error);
        this.addMessageToChat('error', 'AI 响应失败: ' + error.message);
      }
    }

    addMessageToChat(role, content) {
      const messagesContainer = document.getElementById('chat-messages');
      if (!messagesContainer) return;

      const messageDiv = document.createElement('div');
      messageDiv.className = `message message-${role}`;
      
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
    }

    formatMessage(content) {
      let formatted = content;
      formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
      formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
      formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      formatted = formatted.replace(/\n/g, '<br>');
      return formatted;
    }

    showWelcome() {
      // Show welcome message
      toast.show('🤖 Welcome to Claude Studio v2.0!', 'info', 3000);
    }
  }

  // ==================== 初始化 ====================
  const studio = new ClaudeStudio();

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      studio.init();
    });
  } else {
    studio.init();
  }

  // 导出供外部使用
  window.studio = studio;
  window.store = store;

})();

