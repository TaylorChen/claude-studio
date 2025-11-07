const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld('electronAPI', {
  // Claude AI 服务（新版）
  claude: {
    start: () => ipcRenderer.invoke('claude:start'),
    stop: () => ipcRenderer.invoke('claude:stop'),
    sendMessage: (message, options) => ipcRenderer.invoke('claude:sendMessage', message, options),
    checkStatus: () => ipcRenderer.invoke('claude:checkStatus'),
    updateConfig: (config) => ipcRenderer.invoke('claude:updateConfig', config),
    
    // 会话管理
    session: {
      list: () => ipcRenderer.invoke('claude:session:list'),
      show: (sessionId) => ipcRenderer.invoke('claude:session:show', sessionId),
      delete: (sessionId) => ipcRenderer.invoke('claude:session:delete', sessionId),
      restore: (sessionId) => ipcRenderer.invoke('claude:session:restore', sessionId)
    },
    
    // 模型管理
    model: {
      list: () => ipcRenderer.invoke('claude:model:list'),
      set: (modelId) => ipcRenderer.invoke('claude:model:set', modelId),
      current: () => ipcRenderer.invoke('claude:model:current')
    },
    
    // 事件监听
    onConnected: (callback) => {
      ipcRenderer.on('claude:connected', callback);
      return () => ipcRenderer.removeListener('claude:connected', callback);
    },
    onDisconnected: (callback) => {
      ipcRenderer.on('claude:disconnected', callback);
      return () => ipcRenderer.removeListener('claude:disconnected', callback);
    },
    onReconnecting: (callback) => {
      ipcRenderer.on('claude:reconnecting', (event, attempt) => callback(attempt));
      return () => ipcRenderer.removeListener('claude:reconnecting', callback);
    },
    onError: (callback) => {
      ipcRenderer.on('claude:error', (event, error) => callback(error));
      return () => ipcRenderer.removeListener('claude:error', callback);
    },
    onMessageChunk: (callback) => {
      ipcRenderer.on('claude:messageChunk', (event, chunk) => callback(chunk));
      return () => ipcRenderer.removeListener('claude:messageChunk', callback);
    }
  },

  // 对话历史管理
  history: {
    new: (context) => ipcRenderer.invoke('history:new', context),
    addMessage: (role, content, metadata) => ipcRenderer.invoke('history:addMessage', role, content, metadata),
    save: () => ipcRenderer.invoke('history:save'),
    getAll: () => ipcRenderer.invoke('history:getAll'),
    getById: (id) => ipcRenderer.invoke('history:getById', id),
    restore: (id) => ipcRenderer.invoke('history:restore', id),
    delete: (id) => ipcRenderer.invoke('history:delete', id),
    search: (query) => ipcRenderer.invoke('history:search', query),
    export: (id, filePath) => ipcRenderer.invoke('history:export', id, filePath),
    exportAll: () => ipcRenderer.invoke('history:exportAll'),
    import: () => ipcRenderer.invoke('history:import'),
    clearAll: () => ipcRenderer.invoke('history:clearAll'),
    getStats: () => ipcRenderer.invoke('history:getStats')
  },

  // 文件系统操作
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  createFile: (filePath, content) => ipcRenderer.invoke('create-file', filePath, content),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('rename-file', oldPath, newPath),
  createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),
  listFiles: () => ipcRenderer.invoke('list-files'),
  getProjectDir: () => ipcRenderer.invoke('get-project-dir'),
  getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath),
  searchInFiles: (query, options) => ipcRenderer.invoke('search-in-files', query, options),
  replaceInFiles: (searchText, replaceText, options) => ipcRenderer.invoke('replace-in-files', searchText, replaceText, options),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  openProjectDialog: () => ipcRenderer.invoke('open-project-dialog'),
  newProjectDialog: () => ipcRenderer.invoke('new-project-dialog'),

  // 终端操作
  createTerminal: (terminalId, options) => ipcRenderer.invoke('create-terminal', terminalId, options),
  writeToTerminal: (terminalId, data) => ipcRenderer.invoke('write-to-terminal', terminalId, data),
  resizeTerminal: (terminalId, cols, rows) => ipcRenderer.invoke('resize-terminal', terminalId, cols, rows),
  closeTerminal: (terminalId) => ipcRenderer.invoke('close-terminal', terminalId),
  onTerminalData: (terminalId, callback) => {
    const channel = `terminal-data-${terminalId}`;
    ipcRenderer.on(channel, (event, data) => callback(data));
    return () => ipcRenderer.removeListener(channel, callback);
  },
  executeTerminalCommand: (command) => ipcRenderer.invoke('execute-terminal-command', command),

  // Git操作
  gitStatus: () => ipcRenderer.invoke('git-status'),
  gitAdd: (filePath) => ipcRenderer.invoke('git-add', filePath),
  gitCommit: (message) => ipcRenderer.invoke('git-commit', message),
  gitPush: (remote, branch) => ipcRenderer.invoke('git-push', remote, branch),
  gitPull: (remote, branch) => ipcRenderer.invoke('git-pull', remote, branch),
  gitCheckout: (branch) => ipcRenderer.invoke('git-checkout', branch),
  gitCreateBranch: (branchName) => ipcRenderer.invoke('git-create-branch', branchName),
  gitReset: (filePath) => ipcRenderer.invoke('git-reset', filePath),
  gitLog: (limit) => ipcRenderer.invoke('git-log', limit),
  gitDiff: (filePath) => ipcRenderer.invoke('git-diff', filePath),

  // 事件监听
  onClaudeReady: (callback) => {
    ipcRenderer.on('claude-ready', callback);
    return () => ipcRenderer.removeListener('claude-ready', callback);
  },
  onClaudeOutput: (callback) => {
    ipcRenderer.on('claude-output', callback);
    return () => ipcRenderer.removeListener('claude-output', callback);
  },
  onClaudeError: (callback) => {
    ipcRenderer.on('claude-error', callback);
    return () => ipcRenderer.removeListener('claude-error', callback);
  },
  onClaudeClosed: (callback) => {
    ipcRenderer.on('claude-closed', callback);
    return () => ipcRenderer.removeListener('claude-closed', callback);
  },
  onClaudeDisconnected: (callback) => {
    ipcRenderer.on('claude-disconnected', callback);
    return () => ipcRenderer.removeListener('claude-disconnected', callback);
  },
  onProjectChanged: (callback) => {
    ipcRenderer.on('project-changed', callback);
    return () => ipcRenderer.removeListener('project-changed', callback);
  },

  // AI 面板切换事件（全局快捷键触发）
  onToggleAIPanel: (callback) => {
    ipcRenderer.on('toggle-ai-panel', callback);
    return () => ipcRenderer.removeListener('toggle-ai-panel', callback);
  },

  // 工作区状态管理
  workspace: {
    saveState: (state) => ipcRenderer.invoke('workspace:saveState', state),
    loadState: () => ipcRenderer.invoke('workspace:loadState'),
    clearState: () => ipcRenderer.invoke('workspace:clearState')
  },

  // 通用事件监听
  on: (channel, callback) => {
    const validChannels = ['claude-ready', 'claude-output', 'claude-error', 'claude-closed', 'claude-disconnected', 'project-changed', 'toggle-ai-panel'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
      return () => ipcRenderer.removeListener(channel, callback);
    }
  },

  // 移除事件监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// 开发模式下的调试信息
if (process.env.NODE_ENV === 'development') {
}