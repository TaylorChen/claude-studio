/**
 * 工作区状态持久化管理
 * 负责保存和恢复用户的工作环境
 */
class WorkspaceState {
  constructor() {
    this.storageKey = 'claude-studio-workspace-state';
    this.autoSaveInterval = null;
  }

  /**
   * 初始化
   */
  init() {
    // 每 30 秒自动保存一次
    this.startAutoSave();
    
    // 监听窗口关闭事件，保存状态
    window.addEventListener('beforeunload', () => {
      this.saveState();
    });
  }

  /**
   * 保存当前状态
   */
  saveState() {
    try {
      const state = this.collectState();
      localStorage.setItem(this.storageKey, JSON.stringify(state));
      console.log('✅ 工作区状态已保存', state);
      return true;
    } catch (error) {
      console.error('❌ 保存工作区状态失败:', error);
      return false;
    }
  }

  /**
   * 恢复保存的状态
   */
  loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (!saved) {
        console.log('📝 没有找到保存的工作区状态');
        return null;
      }

      const state = JSON.parse(saved);
      console.log('✅ 工作区状态已恢复', state);
      return state;
    } catch (error) {
      console.error('❌ 恢复工作区状态失败:', error);
      return null;
    }
  }

  /**
   * 收集当前状态
   */
  collectState() {
    const app = window.claudeStudio; // 全局应用实例
    
    return {
      version: '1.0',
      timestamp: Date.now(),
      
      // 编辑器状态
      editor: {
        openTabs: this.collectOpenTabs(),
        activeFileIndex: this.getActiveTabIndex(),
        cursorPosition: app?.editor?.editor?.getPosition() || null,
        scrollPosition: app?.editor?.editor?.getScrollTop() || 0
      },
      
      // UI 布局
      ui: {
        sidebarVisible: document.querySelector('.sidebar')?.style.display !== 'none',
        sidebarWidth: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')) || 250,
        aiPanelVisible: document.querySelector('.ai-panel')?.style.display !== 'none',
        aiPanelWidth: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ai-panel-width')) || 400,
        terminalVisible: document.querySelector('.terminal-container')?.style.display !== 'none',
        theme: document.body.getAttribute('data-theme') || 'dark'
      },
      
      // 项目信息
      project: {
        lastOpenPath: app?.files?.currentPath || null,
        expandedFolders: this.collectExpandedFolders(),
        recentFiles: this.collectRecentFiles()
      },
      
      // 搜索状态
      search: {
        lastQuery: document.querySelector('#search-input')?.value || '',
        searchHistory: this.getSearchHistory()
      }
    };
  }

  /**
   * 收集打开的标签页
   */
  collectOpenTabs() {
    const tabs = [];
    const tabElements = document.querySelectorAll('.editor-tab');
    
    tabElements.forEach(tab => {
      const filePath = tab.getAttribute('data-file');
      if (filePath) {
        tabs.push({
          path: filePath,
          title: tab.querySelector('.tab-title')?.textContent || '',
          isDirty: tab.classList.contains('tab-dirty') || false
        });
      }
    });
    
    return tabs;
  }

  /**
   * 获取当前活动标签的索引
   */
  getActiveTabIndex() {
    const tabs = document.querySelectorAll('.editor-tab');
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i].classList.contains('active')) {
        return i;
      }
    }
    return 0;
  }

  /**
   * 收集展开的文件夹
   */
  collectExpandedFolders() {
    const expanded = [];
    const folderElements = document.querySelectorAll('.tree-item.expanded');
    
    folderElements.forEach(folder => {
      const path = folder.getAttribute('data-path');
      if (path) {
        expanded.push(path);
      }
    });
    
    return expanded;
  }

  /**
   * 收集最近的文件
   */
  collectRecentFiles() {
    const recent = localStorage.getItem('claude-studio-recent-files');
    return recent ? JSON.parse(recent) : [];
  }

  /**
   * 获取搜索历史
   */
  getSearchHistory() {
    const history = localStorage.getItem('claude-studio-search-history');
    return history ? JSON.parse(history) : [];
  }

  /**
   * 应用保存的状态
   */
  async applyState(state, app) {
    if (!state) return;

    try {
      console.log('🔄 正在恢复工作区状态...');

      // 恢复 UI 布局
      if (state.ui) {
        this.applyUIState(state.ui);
      }

      // 恢复打开的标签页
      if (state.editor?.openTabs?.length > 0) {
        await this.applyEditorState(state.editor, app);
      }

      // 恢复展开的文件夹
      if (state.project?.expandedFolders?.length > 0) {
        this.applyExpandedFolders(state.project.expandedFolders);
      }

      // 恢复搜索状态
      if (state.search?.lastQuery) {
        const searchInput = document.querySelector('#search-input');
        if (searchInput) {
          searchInput.value = state.search.lastQuery;
        }
      }

      console.log('✅ 工作区状态恢复完成');
    } catch (error) {
      console.error('❌ 应用工作区状态失败:', error);
    }
  }

  /**
   * 应用 UI 状态
   */
  applyUIState(uiState) {
    // 恢复侧边栏宽度
    if (uiState.sidebarWidth) {
      document.documentElement.style.setProperty('--sidebar-width', `${uiState.sidebarWidth}px`);
    }

    // 恢复 AI 面板宽度
    if (uiState.aiPanelWidth) {
      document.documentElement.style.setProperty('--ai-panel-width', `${uiState.aiPanelWidth}px`);
    }

    // 恢复 AI 面板可见性
    if (uiState.aiPanelVisible) {
      const aiPanel = document.querySelector('.ai-panel');
      if (aiPanel) {
        aiPanel.style.display = 'flex';
      }
    }

    // 恢复主题
    if (uiState.theme) {
      document.body.setAttribute('data-theme', uiState.theme);
    }

    console.log('✅ UI 状态已恢复');
  }

  /**
   * 应用编辑器状态
   */
  async applyEditorState(editorState, app) {
    if (!app || !editorState.openTabs) return;

    try {
      // 重新打开所有标签页
      for (let i = 0; i < editorState.openTabs.length; i++) {
        const tab = editorState.openTabs[i];
        
        try {
          // 读取文件内容
          const content = await window.electronAPI.files.readFile(tab.path);
          
          // 在编辑器中打开
          await app.editor.openFile(tab.path, content);
          
          console.log(`✅ 已恢复标签: ${tab.title}`);
        } catch (error) {
          console.warn(`⚠️  无法恢复标签: ${tab.title}`, error);
        }
      }

      // 激活上次活动的标签
      if (editorState.activeFileIndex !== undefined && editorState.activeFileIndex >= 0) {
        const tabs = document.querySelectorAll('.editor-tab');
        if (tabs[editorState.activeFileIndex]) {
          tabs[editorState.activeFileIndex].click();
        }
      }

      // 恢复光标位置
      if (editorState.cursorPosition && app.editor.editor) {
        setTimeout(() => {
          app.editor.editor.setPosition(editorState.cursorPosition);
          app.editor.editor.revealPositionInCenter(editorState.cursorPosition);
        }, 100);
      }

      // 恢复滚动位置
      if (editorState.scrollPosition && app.editor.editor) {
        setTimeout(() => {
          app.editor.editor.setScrollTop(editorState.scrollPosition);
        }, 200);
      }

      console.log('✅ 编辑器状态已恢复');
    } catch (error) {
      console.error('❌ 恢复编辑器状态失败:', error);
    }
  }

  /**
   * 应用展开的文件夹
   */
  applyExpandedFolders(expandedFolders) {
    expandedFolders.forEach(path => {
      const folder = document.querySelector(`.tree-item[data-path="${path}"]`);
      if (folder && !folder.classList.contains('expanded')) {
        folder.click();
      }
    });
  }

  /**
   * 启动自动保存
   */
  startAutoSave() {
    // 每 30 秒自动保存
    this.autoSaveInterval = setInterval(() => {
      this.saveState();
    }, 30000);
  }

  /**
   * 停止自动保存
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * 清除保存的状态
   */
  clearState() {
    try {
      localStorage.removeItem(this.storageKey);
      console.log('✅ 工作区状态已清除');
      return true;
    } catch (error) {
      console.error('❌ 清除工作区状态失败:', error);
      return false;
    }
  }

  /**
   * 导出状态（用于备份）
   */
  exportState() {
    const state = this.loadState();
    if (state) {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claude-studio-workspace-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  /**
   * 导入状态（从备份恢复）
   */
  async importState(file) {
    try {
      const text = await file.text();
      const state = JSON.parse(text);
      localStorage.setItem(this.storageKey, text);
      console.log('✅ 工作区状态已导入');
      return state;
    } catch (error) {
      console.error('❌ 导入工作区状态失败:', error);
      return null;
    }
  }
}

// 导出单例
const workspaceState = new WorkspaceState();
export default workspaceState;

