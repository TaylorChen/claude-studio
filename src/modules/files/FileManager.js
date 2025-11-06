/**
 * 文件管理模块
 * 负责文件树、搜索、快速打开等功能
 */

const store = require('../../store');

class FileManager {
  constructor() {
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
   * @returns {Promise<void>}
   */
  async loadFileTree() {
    const result = await window.electronAPI.listFiles();
    
    if (result.success) {
      // 构建树形结构
      const tree = this.buildTree(result.files);
      this.fileTree = tree;
      store.setState('files.fileTree', tree);
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

      // 点击事件
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (node.type === 'directory') {
          node.isExpanded = !node.isExpanded;
          this.refreshTree(container);
        } else {
          await this.openFile(node.path);
        }
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
    return map[ext] || 'plaintext';
  }
}

module.exports = FileManager;


