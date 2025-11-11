/**
 * 文件管理模块
 * 负责文件树、搜索、快速打开等功能
 */

const store = require('../../store');

class FileManager {
  constructor(windowId = null) {
    this.windowId = windowId || `window-${Date.now()}-${Math.random()}`;
    this.projectPath = null;
    this.fileTree = null;
    this.watcher = null;
  }

  /**
   * 打开项目文件夹
   * @returns {Promise<boolean>}
   */
  async openProject() {
    const result = await window.electronAPI.openProjectDialog();
    
    if (result.success) {
      this.projectPath = result.projectPath;
      store.setState('files.projectPath', this.projectPath);
      
      // 加载文件树
      await this.loadFileTree();
      
      // 开始监听文件变化
      this.watchFiles();
      
      return true;
    }
    return false;
  }

  /**
   * 加载文件树
   * @param {string} projectPath - 项目路径（可选，用于强制加载特定项目）
   * @returns {Promise<void>}
   */
  async loadFileTree(projectPath = null) {
    try {
      // 如果提供了项目路径，更新到本地
      if (projectPath) {
        this.projectPath = projectPath;
      }
      
      
      const result = await window.electronAPI.listFiles();
      
      if (result.success) {
        // 构建树形结构
        const tree = this.buildTree(result.files);
        this.fileTree = tree;
        
        // 只更新当前窗口的状态（通过本地存储）
        if (!this.projectPath && result.success) {
          const projectDir = await window.electronAPI.getProjectDir();
          this.projectPath = projectDir;
        }
        
      } else {
      }
    } catch (error) {
    }
  }

  /**
   * 构建树形结构
   * @param {Array} files - 扁平的文件列表
   * @returns {Array} 树形结构
   */
  buildTree(files) {
    const tree = [];
    const map = new Map();

    // 排序：目录在前，文件在后
    files.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    files.forEach(file => {
      const parts = file.path.split('/');
      const name = parts[parts.length - 1];
      
      const node = {
        name,
        path: file.path,
        type: file.type,
        children: file.type === 'directory' ? [] : undefined,
        isExpanded: false
      };

      if (parts.length === 1) {
        tree.push(node);
      } else {
        const parentPath = parts.slice(0, -1).join('/');
        const parent = this.findNode(tree, parentPath);
        if (parent && parent.children) {
          parent.children.push(node);
        }
      }

      map.set(file.path, node);
    });

    return tree;
  }

  /**
   * 查找节点
   * @param {Array} tree - 树
   * @param {string} path - 路径
   * @returns {object|null} 节点
   */
  findNode(tree, path) {
    for (const node of tree) {
      if (node.path === path) {
        return node;
      }
      if (node.children) {
        const found = this.findNode(node.children, path);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 渲染文件树
   * @param {HTMLElement} container - 容器元素
   * @param {Array} tree - 树数据
   * @param {number} level - 层级
   */
  renderTree(container, tree = this.fileTree, level = 0) {
    if (!tree) return;

    tree.forEach(node => {
      const item = document.createElement('div');
      item.className = 'file-tree-item';
      item.style.paddingLeft = `${level * 16 + 8}px`;
      item.dataset.path = node.path;

      const icon = node.type === 'directory' ? 
        (node.isExpanded ? '📂' : '📁') : 
        this.getFileIcon(node.name);

      item.innerHTML = `
        <span class="file-icon">${icon}</span>
        <span class="file-name">${node.name}</span>
      `;

      // 左键点击事件
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (node.type === 'directory') {
          node.isExpanded = !node.isExpanded;
          this.refreshTree(container);
        } else {
          await this.openFile(node.path);
        }
      });

      // 右键菜单事件
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showContextMenu(e, node);
      });

      container.appendChild(item);

      // 递归渲染子节点
      if (node.type === 'directory' && node.isExpanded && node.children) {
        this.renderTree(container, node.children, level + 1);
      }
    });
  }

  /**
   * 刷新文件树显示
   * @param {HTMLElement} container - 容器元素
   */
  refreshTree(container) {
    container.innerHTML = '';
    this.renderTree(container);
  }

  /**
   * 打开文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<void>}
   */
  async openFile(filePath) {
    const result = await window.electronAPI.readFile(filePath);
    
    if (result.success) {
      const ext = filePath.split('.').pop();
      const language = this.getLanguageFromExtension(ext);
      
      // 通过事件总线通知编辑器打开文件
      window.dispatchEvent(new CustomEvent('file:open', {
        detail: {
          path: filePath,
          content: result.content,
          language
        }
      }));

      // 添加到最近文件
      this.addToRecentFiles(filePath);
    }
  }

  /**
   * 新建文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>}
   */
  async createFile(filePath) {
    const result = await window.electronAPI.createFile(filePath, '');
    
    if (result.success) {
      await this.loadFileTree();
      await this.openFile(filePath);
      return true;
    }
    return false;
  }

  /**
   * 删除文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>}
   */
  async deleteFile(filePath) {
    const confirmed = confirm(`确定要删除 ${filePath} 吗？`);
    if (!confirmed) return false;

    const result = await window.electronAPI.deleteFile(filePath);
    
    if (result.success) {
      await this.loadFileTree();
      
      // 如果是当前打开的文件，关闭它
      window.dispatchEvent(new CustomEvent('file:close', {
        detail: { path: filePath }
      }));
      
      return true;
    }
    return false;
  }

  /**
   * 重命名文件
   * @param {string} oldPath - 旧路径
   * @param {string} newPath - 新路径
   * @returns {Promise<boolean>}
   */
  async renameFile(oldPath, newPath) {
    const result = await window.electronAPI.renameFile(oldPath, newPath);
    
    if (result.success) {
      await this.loadFileTree();
      
      // 更新编辑器中打开的文件
      window.dispatchEvent(new CustomEvent('file:rename', {
        detail: { oldPath, newPath }
      }));
      
      return true;
    }
    return false;
  }

  /**
   * 搜索文件
   * @param {string} query - 搜索关键词
   * @returns {Promise<Array>} 搜索结果
   */
  async searchFiles(query) {
    if (!query) {
      store.setState('files.searchResults', []);
      return [];
    }

    const result = await window.electronAPI.searchInFiles(query);
    
    if (result.success) {
      store.setState('files.searchResults', result.results);
      return result.results;
    }
    return [];
  }

  /**
   * 快速打开文件（Cmd+P）
   * @param {string} query - 文件名关键词
   * @returns {Array} 匹配的文件
   */
  quickOpen(query) {
    if (!this.fileTree) return [];

    const allFiles = this.flattenTree(this.fileTree);
    
    if (!query) return allFiles.slice(0, 20);  // 返回前20个

    // 模糊匹配
    const results = allFiles
      .filter(file => file.type !== 'directory')
      .map(file => ({
        file,
        score: this.fuzzyScore(file.name.toLowerCase(), query.toLowerCase())
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(item => item.file);

    return results;
  }

  /**
   * 展平树形结构
   * @param {Array} tree - 树
   * @returns {Array} 扁平列表
   */
  flattenTree(tree) {
    const result = [];
    
    const traverse = (nodes) => {
      nodes.forEach(node => {
        result.push(node);
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    
    traverse(tree);
    return result;
  }

  /**
   * 模糊匹配评分
   * @param {string} str - 字符串
   * @param {string} pattern - 模式
   * @returns {number} 分数
   */
  fuzzyScore(str, pattern) {
    let score = 0;
    let patternIdx = 0;
    let strIdx = 0;

    while (strIdx < str.length && patternIdx < pattern.length) {
      if (str[strIdx] === pattern[patternIdx]) {
        score += 10;
        patternIdx++;
      }
      strIdx++;
    }

    if (patternIdx !== pattern.length) {
      return 0;  // 没有完全匹配
    }

    // 奖励连续匹配
    if (str.includes(pattern)) {
      score += 50;
    }

    // 奖励开头匹配
    if (str.startsWith(pattern)) {
      score += 100;
    }

    return score;
  }

  /**
   * 添加到最近文件
   * @param {string} filePath - 文件路径
   */
  addToRecentFiles(filePath) {
    let recentFiles = store.getState('files.recentFiles');
    recentFiles = recentFiles.filter(f => f !== filePath);  // 去重
    recentFiles.unshift(filePath);  // 添加到开头
    recentFiles = recentFiles.slice(0, 10);  // 最多保留10个
    store.setState('files.recentFiles', recentFiles);
  }

  /**
   * 监听文件变化
   */
  async watchFiles() {
    // 通过主进程监听文件变化
    // 这里简化实现，实际应该使用 chokidar
    // window.electronAPI.watchFiles((event, files) => {
    //   this.loadFileTree();
    // });
  }

  /**
   * 获取文件图标
   * @param {string} filename - 文件名
   * @returns {string} 图标
   */
  getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
      'js': '📜',
      'ts': '📘',
      'jsx': '⚛️',
      'tsx': '⚛️',
      'html': '🌐',
      'css': '🎨',
      'json': '📋',
      'md': '📝',
      'py': '🐍',
      'java': '☕',
      'rb': '💎',
      'go': '🐹',
      'rs': '🦀',
      'php': '🐘',
      'png': '🖼️',
      'jpg': '🖼️',
      'svg': '🎨',
      'pdf': '📄',
      'zip': '📦'
    };
    return icons[ext] || '📄';
  }

  /**
   * 根据扩展名获取语言
   * @param {string} ext - 扩展名
   * @returns {string} 语言标识
   */
  getLanguageFromExtension(ext) {
    
    const map = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'rb': 'ruby',
      'go': 'go',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'rs': 'rust',
      'php': 'php',
      'sql': 'sql',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml'
    };
    
    const result = map[ext] || 'plaintext';
    
    return result;
  }

  /**
   * 显示右键菜单
   * @param {Event} event - 鼠标事件
   * @param {Object} node - 文件节点
   */
  showContextMenu(event, node) {
    
    // 移除之前的菜单
    const existingMenu = document.getElementById('file-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    // 只对文件显示完整菜单
    if (node.type === 'directory') {
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
        label: '添加到 Claude 对话',
        icon: '💬',
        action: () => this.addToClaudeChat(node, false),
        className: 'menu-item-claude'
      },
      {
        label: '添加到新 Claude 对话',
        icon: '✨',
        action: () => this.addToClaudeChat(node, true),
        className: 'menu-item-claude'
      },
      { divider: true },
      {
        label: '复制路径',
        icon: '📋',
        action: () => this.copyPath(node.path)
      },
      {
        label: '复制相对路径',
        icon: '📌',
        action: () => this.copyRelativePath(node.path)
      },
      { divider: true },
      {
        label: '在 Finder 中显示',
        icon: '📂',
        action: () => this.revealInFinder(node.path)
      }
    ];

    // 创建菜单项
    menuItems.forEach((item, index) => {
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
          item.action();
          menu.remove();
        });

        menu.appendChild(menuItem);
      }
    });

    document.body.appendChild(menu);

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
   * @param {Object} node - 文件节点
   * @param {boolean} isNew - 是否创建新聊天
   */
  async addToClaudeChat(node, isNew) {
    try {
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
      if (window.aiChat) {
        if (isNew) {
          // 创建新会话
          window.aiChat.createNewSession();
          // 稍微延迟后发送消息，确保新会话已创建
          setTimeout(() => {
            window.aiChat.inputElement.value = message;
            window.aiChat.inputElement.focus();
          }, 100);
        } else {
          // 添加到现有聊天
          window.aiChat.inputElement.value = message;
          window.aiChat.inputElement.focus();
        }
      } else {
        alert('Claude Chat Component not found. Make sure AI Chat is initialized.');
      }
    } catch (error) {
      alert('Failed to add file to chat: ' + error.message);
    }
  }

  /**
   * 复制文件路径
   * @param {string} filePath - 文件路径
   */
  copyPath(filePath) {
    navigator.clipboard.writeText(filePath).then(() => {
      this.showNotification('Path copied to clipboard');
    }).catch(err => {
    });
  }

  /**
   * 复制相对路径
   * @param {string} filePath - 文件路径
   */
  copyRelativePath(filePath) {
    const relativePath = './' + filePath;
    navigator.clipboard.writeText(relativePath).then(() => {
      this.showNotification('Relative path copied to clipboard');
    }).catch(err => {
    });
  }

  /**
   * 在 Finder 中显示文件
   * @param {string} filePath - 文件路径
   */
  revealInFinder(filePath) {
    if (window.electronAPI && window.electronAPI.revealInFinder) {
      window.electronAPI.revealInFinder(filePath);
    } else {
      console.warn('⚠️ revealInFinder API not available');
    }
  }

  /**
   * 显示通知
   * @param {string} message - 通知消息
   */
  showNotification(message) {
    // 如果有全局 toast 对象，使用它
    if (typeof toast !== 'undefined' && toast.show) {
      toast.show(message, 'info', 2000);
    } else {
      console.log(message);
    }
  }
}

module.exports = FileManager;


