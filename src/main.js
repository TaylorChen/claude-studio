/**
 * Claude Studio - 主进程
 * Electron Main Process
 */

const { app, BrowserWindow, ipcMain, dialog, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');

// 加载 node-pty（使用预编译版本）
let pty = null;
try {
  // 优先使用预编译版本
  pty = require('@homebridge/node-pty-prebuilt-multiarch');
  console.log('✅ 使用预编译的 node-pty');
} catch (e1) {
  try {
    // 回退到标准版本
    pty = require('node-pty');
    console.log('✅ 使用标准的 node-pty');
  } catch (e2) {
    console.warn('⚠️ node-pty 不可用，终端功能将被禁用');
  }
}

// Claude AI 服务
const ClaudeService = require('./modules/ai/ClaudeService');
const claudeService = new ClaudeService();

// 对话历史管理
const ChatHistoryManager = require('./modules/ai/ChatHistoryManager');
const chatHistoryManager = new ChatHistoryManager();

// 工作区状态文件路径
const workspaceStateFile = path.join(app.getPath('userData'), 'workspace-state.json');

// 全局变量
let mainWindow = null;
let projectDir = process.cwd();
const terminals = new Map();  // terminalId -> ptyProcess

/**
 * 创建主窗口
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false  // 需要访问 node-pty
    },
    title: 'Claude Studio',
    titleBarStyle: 'hiddenInset',  // macOS 风格
    trafficLightPosition: { x: 12, y: 12 },
    backgroundColor: '#1e1e1e'
  });

  // 加载主界面
  const htmlPath = path.join(__dirname, '..', 'index.html');
  mainWindow.loadFile(htmlPath);

  // 开发模式
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // 创建菜单
  createMenu();

  // 窗口事件
  mainWindow.on('closed', () => {
    mainWindow = null;
    // 清理所有终端
    terminals.forEach((ptyProcess) => {
      ptyProcess.kill();
    });
    terminals.clear();
  });

}

/**
 * 创建应用菜单
 */
function createMenu() {
  const isMac = process.platform === 'darwin';
  
  const template = [
    // macOS 应用菜单
    ...(isMac ? [{
      label: 'CLAUDE-STUDIO',
      submenu: [
        { role: 'about', label: 'About CLAUDE-STUDIO' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: 'Hide CLAUDE-STUDIO' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit CLAUDE-STUDIO' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu:open-project')
        },
        {
          label: 'Open File',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => mainWindow.webContents.send('menu:open-file')
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu:save')
        },
        ...(!isMac ? [
          { type: 'separator' },
          { role: 'quit' }
        ] : [])
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'AI',
      submenu: [
        {
          label: 'Inline Edit',
          accelerator: 'CmdOrCtrl+K',
          click: () => mainWindow.webContents.send('menu:ai-inline-edit')
        },
        {
          label: 'Chat',
          accelerator: 'CmdOrCtrl+L',
          click: () => mainWindow.webContents.send('menu:ai-chat')
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' }
      ]
    }
  ];

  if (isMac && template.length > 0) {
  }
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ==================== Claude AI 服务 ====================

// 启动 Claude CLI
ipcMain.handle('claude:start', async () => {
  try {
    const result = await claudeService.start();
    return result;
  } catch (error) {
    console.error('启动 Claude CLI 失败:', error);
    return { success: false, error: error.message };
  }
});

// 停止 Claude CLI
ipcMain.handle('claude:stop', async () => {
  try {
    const result = await claudeService.stop();
    return result;
  } catch (error) {
    console.error('停止 Claude CLI 失败:', error);
    return { success: false, error: error.message };
  }
});

// 发送消息到 Claude
ipcMain.handle('claude:sendMessage', async (event, message, options = {}) => {
  try {
    const response = await claudeService.sendMessage(message, options);
    return { success: true, response };
  } catch (error) {
    console.error('发送消息失败:', error);
    return { success: false, error: error.message };
  }
});

// 检查 Claude 状态
ipcMain.handle('claude:checkStatus', () => {
  return claudeService.checkStatus();
});

// 更新 Claude 配置
ipcMain.handle('claude:updateConfig', (event, config) => {
  claudeService.updateConfig(config);
  return { success: true };
});

// 监听 Claude 事件并转发到渲染进程
claudeService.on('connected', () => {
  if (mainWindow) {
    mainWindow.webContents.send('claude:connected');
  }
});

claudeService.on('disconnected', () => {
  if (mainWindow) {
    mainWindow.webContents.send('claude:disconnected');
  }
});

claudeService.on('reconnecting', (attempt) => {
  if (mainWindow) {
    mainWindow.webContents.send('claude:reconnecting', attempt);
  }
});

claudeService.on('error', (error) => {
  if (mainWindow) {
    mainWindow.webContents.send('claude:error', error.message);
  }
});

claudeService.on('messageChunk', (chunk) => {
  if (mainWindow) {
    mainWindow.webContents.send('claude:messageChunk', chunk);
  }
});

// ==================== 会话管理 ====================

// 列出所有会话
ipcMain.handle('claude:session:list', async () => {
  try {
    const { spawn } = require('child_process');
    return new Promise((resolve) => {
      const process = spawn('claude', ['session', 'ls'], { shell: true });
      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        // 检查是否需要登录
        if (error.includes('Invalid API key') || error.includes('Please run /login')) {
          resolve({ 
            success: false, 
            error: 'Claude CLI 未登录，请先运行 "claude login"',
            needLogin: true,
            sessions: [] 
          });
          return;
        }

        if (code === 0 && output.trim()) {
          // 解析文本输出
          const lines = output.trim().split('\n');
          const sessions = [];
          
          // 跳过表头，解析每一行
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
              // 假设格式: "session-id  created-time  model"
              const parts = line.split(/\s+/);
              if (parts.length >= 1) {
                sessions.push({
                  id: parts[0],
                  created: parts.length > 1 ? parts[1] : '',
                  model: parts.length > 2 ? parts.slice(2).join(' ') : ''
                });
              }
            }
          }
          
          resolve({ success: true, sessions });
        } else {
          // 返回空列表而不是错误
          resolve({ success: true, sessions: [], message: '暂无会话' });
        }
      });

      // 缩短超时时间到 5 秒
      setTimeout(() => {
        process.kill();
        // 超时也返回空列表
        resolve({ success: true, sessions: [], message: '获取会话超时' });
      }, 5000);
    });
  } catch (error) {
    console.error('列出会话失败:', error);
    return { success: true, sessions: [], message: '获取会话失败' };
  }
});

// 显示会话详情
ipcMain.handle('claude:session:show', async (event, sessionId) => {
  try {
    const { spawn } = require('child_process');
    return new Promise((resolve) => {
      const process = spawn('claude', ['session', 'show', sessionId], { shell: true });
      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0 && output.trim()) {
          // 返回原始文本输出
          resolve({ success: true, session: { id: sessionId, output: output.trim() } });
        } else {
          resolve({ success: false, error: error || '无法获取会话详情' });
        }
      });

      setTimeout(() => {
        process.kill();
        resolve({ success: false, error: '获取会话详情超时' });
      }, 5000);
    });
  } catch (error) {
    console.error('显示会话详情失败:', error);
    return { success: false, error: error.message };
  }
});

// 删除会话
ipcMain.handle('claude:session:delete', async (event, sessionId) => {
  try {
    const { spawn } = require('child_process');
    return new Promise((resolve) => {
      const process = spawn('claude', ['session', 'delete', sessionId, '--yes'], { shell: true });
      let error = '';

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, message: 'Session deleted successfully' });
        } else {
          resolve({ success: false, error: error || '删除会话失败' });
        }
      });

      setTimeout(() => {
        process.kill();
        resolve({ success: false, error: '删除会话超时' });
      }, 5000);
    });
  } catch (error) {
    console.error('删除会话失败:', error);
    return { success: false, error: error.message };
  }
});

// 恢复会话
ipcMain.handle('claude:session:restore', async (event, sessionId) => {
  try {
    const { spawn } = require('child_process');
    return new Promise((resolve) => {
      const process = spawn('claude', ['session', 'restore', sessionId], { shell: true });
      let error = '';

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, message: 'Session restored successfully' });
        } else {
          resolve({ success: false, error: error || '恢复会话失败' });
        }
      });

      setTimeout(() => {
        process.kill();
        resolve({ success: false, error: '恢复会话超时' });
      }, 5000);
    });
  } catch (error) {
    console.error('恢复会话失败:', error);
    return { success: false, error: error.message };
  }
});

// ==================== 模型管理 ====================

// 列出可用模型
// 默认模型列表 - 保持一致性
const DEFAULT_MODELS = [
  { id: 'claude-opus-4-1-20250805', name: 'Claude Opus 4.1', description: '最新最强大的模型' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: '高效平衡模型' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: '平衡性能和成本' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: '快速响应' }
];

ipcMain.handle('claude:model:list', async () => {
  try {
    const { spawn } = require('child_process');
    return new Promise((resolve, reject) => {
      const process = spawn('claude', ['model', 'ls'], { shell: true });
      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        // 尝试解析 Claude CLI 的输出
        // 如果解析成功，返回解析后的模型列表
        // 否则返回默认列表
        console.log('claude model ls 输出:', output);
        if (code === 0 && output.trim()) {
          // TODO: 实现 Claude CLI 输出解析
          // 目前返回默认列表，因为 Claude CLI 的格式可能不同
          resolve({ 
            success: true, 
            models: DEFAULT_MODELS
          });
        } else {
          resolve({ 
            success: true, 
            models: DEFAULT_MODELS
          });
        }
      });

      // 增加超时时间到 10 秒，确保有足够时间获取模型列表
      setTimeout(() => {
        process.kill();
        console.warn('claude model ls 超时，使用默认模型列表');
        resolve({ 
          success: true, 
          models: DEFAULT_MODELS
        });
      }, 10000);
    });
  } catch (error) {
    console.error('列出模型失败:', error);
    // 返回默认模型列表而不是错误
    return { 
      success: true, 
      models: DEFAULT_MODELS
    };
  }
});

// 验证模型 ID 是否有效
function isValidModel(modelId) {
  return DEFAULT_MODELS.some(m => m.id === modelId);
}

// 设置默认模型
ipcMain.handle('claude:model:set', async (event, modelId) => {
  try {
    // 验证模型 ID
    if (!isValidModel(modelId)) {
      console.warn(`⚠️ 无效的模型 ID: ${modelId}`);
      return { 
        success: false, 
        error: `模型不存在: ${modelId}`,
        validModels: DEFAULT_MODELS.map(m => m.id)
      };
    }
    
    // 更新 ClaudeService 的配置
    claudeService.updateConfig({ model: modelId });
    
    // 如果 claude CLI 支持，也更新 CLI 配置
    const { spawn } = require('child_process');
    return new Promise((resolve, reject) => {
      const process = spawn('claude', ['model', 'set', modelId], { shell: true });
      let error = '';

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        // 即使 CLI 命令失败，只要我们更新了服务配置就算成功
        resolve({ success: true, message: `Model set to ${modelId}` });
      });

      setTimeout(() => {
        process.kill();
        resolve({ success: true, message: `Model set to ${modelId}` });
      }, 5000);
    });
  } catch (error) {
    console.error('设置模型失败:', error);
    return { success: false, error: error.message };
  }
});

// 获取当前模型
ipcMain.handle('claude:model:current', () => {
  try {
    const currentModel = claudeService.config.model || 'claude-opus-4-1-20250805';
    return { success: true, model: currentModel };
  } catch (error) {
    console.error('获取当前模型失败:', error);
    return { success: false, error: error.message };
  }
});

// ==================== 对话历史管理 ====================

// 开始新对话
ipcMain.handle('history:new', (event, context) => {
  try {
    const conversationId = chatHistoryManager.startNewConversation(context);
    return { success: true, conversationId };
  } catch (error) {
    console.error('开始新对话失败:', error);
    return { success: false, error: error.message };
  }
});

// 添加消息
ipcMain.handle('history:addMessage', (event, role, content, metadata) => {
  try {
    const messageId = chatHistoryManager.addMessage(role, content, metadata);
    return { success: true, messageId };
  } catch (error) {
    console.error('添加消息失败:', error);
    return { success: false, error: error.message };
  }
});

// 保存当前对话
ipcMain.handle('history:save', async () => {
  try {
    await chatHistoryManager.saveCurrentConversation();
    return { success: true };
  } catch (error) {
    console.error('保存对话失败:', error);
    return { success: false, error: error.message };
  }
});

// 获取所有对话
ipcMain.handle('history:getAll', () => {
  try {
    const conversations = chatHistoryManager.getAllConversations();
    return { success: true, conversations };
  } catch (error) {
    console.error('获取对话列表失败:', error);
    return { success: false, error: error.message };
  }
});

// 根据 ID 获取对话
ipcMain.handle('history:getById', (event, id) => {
  try {
    const conversation = chatHistoryManager.getConversationById(id);
    return { success: true, conversation };
  } catch (error) {
    console.error('获取对话失败:', error);
    return { success: false, error: error.message };
  }
});

// 恢复对话
ipcMain.handle('history:restore', (event, id) => {
  try {
    const conversation = chatHistoryManager.restoreConversation(id);
    return { success: true, conversation };
  } catch (error) {
    console.error('恢复对话失败:', error);
    return { success: false, error: error.message };
  }
});

// 删除对话
ipcMain.handle('history:delete', async (event, id) => {
  try {
    await chatHistoryManager.deleteConversation(id);
    return { success: true };
  } catch (error) {
    console.error('删除对话失败:', error);
    return { success: false, error: error.message };
  }
});

// 搜索对话
ipcMain.handle('history:search', (event, query) => {
  try {
    const results = chatHistoryManager.search(query);
    return { success: true, results };
  } catch (error) {
    console.error('搜索对话失败:', error);
    return { success: false, error: error.message };
  }
});

// 导出对话
ipcMain.handle('history:export', async (event, id, filePath) => {
  try {
    if (!filePath) {
      // 显示保存对话框
      const result = await dialog.showSaveDialog(mainWindow, {
        title: '导出对话',
        defaultPath: `conversation-${id}.json`,
        filters: [
          { name: 'JSON', extensions: ['json'] },
          { name: 'Markdown', extensions: ['md'] }
        ]
      });
      
      if (result.canceled) {
        return { success: false, canceled: true };
      }
      
      filePath = result.filePath;
    }
    
    // 判断导出格式
    if (filePath.endsWith('.md')) {
      const markdown = chatHistoryManager.toMarkdown(id);
      await fs.promises.writeFile(filePath, markdown, 'utf-8');
    } else {
      await chatHistoryManager.exportConversation(id, filePath);
    }
    
    return { success: true, filePath };
  } catch (error) {
    console.error('导出对话失败:', error);
    return { success: false, error: error.message };
  }
});

// 导出所有对话
ipcMain.handle('history:exportAll', async () => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出所有对话',
      defaultPath: 'all-conversations.json',
      filters: [
        { name: 'JSON', extensions: ['json'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, canceled: true };
    }
    
    await chatHistoryManager.exportAll(result.filePath);
    return { success: true, filePath: result.filePath };
  } catch (error) {
    console.error('导出所有对话失败:', error);
    return { success: false, error: error.message };
  }
});

// 导入对话
ipcMain.handle('history:import', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '导入对话',
      filters: [
        { name: 'JSON', extensions: ['json'] }
      ],
      properties: ['openFile']
    });
    
    if (result.canceled) {
      return { success: false, canceled: true };
    }
    
    const conversationId = await chatHistoryManager.importConversation(result.filePaths[0]);
    return { success: true, conversationId };
  } catch (error) {
    console.error('导入对话失败:', error);
    return { success: false, error: error.message };
  }
});

// 清空所有历史
ipcMain.handle('history:clearAll', async () => {
  try {
    await chatHistoryManager.clearAll();
    return { success: true };
  } catch (error) {
    console.error('清空历史失败:', error);
    return { success: false, error: error.message };
  }
});

// 获取统计信息
ipcMain.handle('history:getStats', () => {
  try {
    const stats = chatHistoryManager.getStats();
    return { success: true, stats };
  } catch (error) {
    console.error('获取统计信息失败:', error);
    return { success: false, error: error.message };
  }
});

// ==================== 工作区状态管理 ====================

// 保存工作区状态
ipcMain.handle('workspace:saveState', async (event, state) => {
  try {
    await fs.promises.writeFile(workspaceStateFile, JSON.stringify(state, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('❌ 保存工作区状态失败:', error);
    return { success: false, error: error.message };
  }
});

// 加载工作区状态
ipcMain.handle('workspace:loadState', async () => {
  try {
    if (!fs.existsSync(workspaceStateFile)) {
      return { success: true, state: null };
    }
    
    const content = await fs.promises.readFile(workspaceStateFile, 'utf-8');
    const state = JSON.parse(content);
    return { success: true, state };
  } catch (error) {
    console.error('❌ 加载工作区状态失败:', error);
    return { success: false, error: error.message, state: null };
  }
});

// 清除工作区状态
ipcMain.handle('workspace:clearState', async () => {
  try {
    if (fs.existsSync(workspaceStateFile)) {
      await fs.promises.unlink(workspaceStateFile);
    }
    return { success: true };
  } catch (error) {
    console.error('❌ 清除工作区状态失败:', error);
    return { success: false, error: error.message };
  }
});

// ==================== 文件系统操作 ====================

ipcMain.handle('get-project-dir', () => projectDir);

ipcMain.handle('list-files', async () => {
  try {
    const files = [];
    
    function scanDirectory(dir, relativePath = '') {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        if (['node_modules', '.git', '.DS_Store', 'dist', 'build'].includes(item)) continue;
        
        const fullPath = path.join(dir, item);
        // 始终使用 / 作为路径分隔符，确保前端解析一致
        const relativeFilePath = relativePath ? `${relativePath}/${item}` : item;
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          files.push({
            name: item,
            path: relativeFilePath,
            type: 'directory'
          });
          scanDirectory(fullPath, relativeFilePath);
        } else {
          files.push({
            name: item,
            path: relativeFilePath,
            type: 'file',
            size: stats.size
          });
        }
      }
    }
    
    scanDirectory(projectDir);
    
    return { success: true, files };
  } catch (error) {
    console.error('❌ 文件扫描失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const fullPath = path.join(projectDir, filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    const fullPath = path.join(projectDir, filePath);
    fs.writeFileSync(fullPath, content, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-file', async (event, filePath, content = '') => {
  try {
    const fullPath = path.join(projectDir, filePath);
    const dir = path.dirname(fullPath);
    
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    const fullPath = path.join(projectDir, filePath);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rename-file', async (event, oldPath, newPath) => {
  try {
    const fullOldPath = path.join(projectDir, oldPath);
    const fullNewPath = path.join(projectDir, newPath);
    fs.renameSync(fullOldPath, fullNewPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-directory', async (event, dirPath) => {
  try {
    const fullPath = path.join(projectDir, dirPath);
    fs.mkdirSync(fullPath, { recursive: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-project-dialog', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择项目文件夹'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      projectDir = result.filePaths[0];
      return { success: true, projectPath: projectDir };
    }
    return { success: false, error: '用户取消操作' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-attachment-files', async (event, filterType = 'all') => {
  try {
    let filters = [];
    
    if (filterType === 'image' || filterType === 'all') {
      filters.push({ name: '图像文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'] });
    }
    
    if (filterType === 'document' || filterType === 'all') {
      filters.push({ name: '文档文件', extensions: ['txt', 'md', 'pdf', 'json', 'xml', 'csv', 'html'] });
    }
    
    if (filterType === 'code' || filterType === 'all') {
      filters.push({ name: '代码文件', extensions: ['js', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'rb', 'ts', 'jsx', 'tsx'] });
    }
    
    if (filterType === 'all') {
      filters.push({ name: '所有文件', extensions: ['*'] });
    }
    
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择要附加的文件',
      properties: ['openFile', 'multiSelections'],
      filters: filters
    });

    if (!result.canceled && result.filePaths.length > 0) {
      // 返回选中文件的完整路径
      return { success: true, filePaths: result.filePaths };
    }
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('search-in-files', async (event, query, options = {}) => {
  try {
    const results = [];
    // 简单实现：遍历文件搜索
    // 实际应该使用更高效的搜索算法
    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==================== Claude CLI 操作 ====================

async function sendClaudeCommand(command) {
  return new Promise((resolve, reject) => {
    const claudePath = '/opt/homebrew/Cellar/node/23.11.0/bin/claude';
    const envVars = {
      ...process.env,
      CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS: '1',
      ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || 'https://open.bigmodel.cn/api/anthropic',
      ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN
    };

    const claudeProcess = spawn(claudePath, ['--print', command], {
      cwd: projectDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      env: envVars
    });

    let response = '';
    const timeout = setTimeout(() => {
      claudeProcess.kill('SIGTERM');
      resolve(response || '命令执行超时');
    }, 30000);

    claudeProcess.stdout.on('data', (data) => {
      response += data.toString();
      clearTimeout(timeout);
      setTimeout(() => {
        claudeProcess.kill('SIGTERM');
        resolve(response.trim());
      }, 2000);
    });

    claudeProcess.stderr.on('data', (data) => {
      console.error('Claude错误:', data.toString());
    });

    claudeProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

ipcMain.handle('send-command', async (event, command) => {
  try {
    const response = await sendClaudeCommand(command);
    return { success: true, response };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==================== 终端操作 ====================

ipcMain.handle('create-terminal', async (event, terminalId, options) => {
  try {
    // 检查 node-pty 是否可用
    if (!pty) {
      return { 
        success: false, 
        error: 'node-pty 未编译。\n\n请在终端运行以下命令：\n\n1. 安装编译工具：\n   npm install -g node-gyp\n\n2. 重新编译：\n   npx electron-rebuild -f -w node-pty\n\n或使用预编译版本：\n   npm install @homebridge/node-pty-prebuilt-multiarch' 
      };
    }
    
    const shell = os.platform() === 'win32' ? 'powershell.exe' : (os.platform() === 'darwin' ? '/bin/zsh' : '/bin/bash');
    
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd: projectDir || process.env.HOME || process.cwd(),
      env: process.env
    });

    terminals.set(terminalId, ptyProcess);

    ptyProcess.onData((data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(`terminal-data-${terminalId}`, data);
      }
    });

    ptyProcess.onExit(() => {
      terminals.delete(terminalId);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(`terminal-exit-${terminalId}`);
      }
    });

    console.log('✅ 终端创建成功:', terminalId);
    return { success: true };
  } catch (error) {
    console.error('❌ 创建终端失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-to-terminal', async (event, terminalId, data) => {
  try {
    const ptyProcess = terminals.get(terminalId);
    if (ptyProcess) {
      ptyProcess.write(data);
      return { success: true };
    }
    return { success: false, error: '终端不存在' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('resize-terminal', async (event, terminalId, cols, rows) => {
  try {
    const ptyProcess = terminals.get(terminalId);
    if (ptyProcess) {
      ptyProcess.resize(cols, rows);
      return { success: true };
    }
    return { success: false, error: '终端不存在' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('close-terminal', async (event, terminalId) => {
  try {
    const ptyProcess = terminals.get(terminalId);
    if (ptyProcess) {
      ptyProcess.kill();
      terminals.delete(terminalId);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==================== Git 操作 ====================

async function executeGitCommand(args) {
  return new Promise((resolve, reject) => {
    const gitProcess = spawn('git', args, {
      cwd: projectDir,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    gitProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    gitProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    gitProcess.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || stdout));
      }
    });

    gitProcess.on('error', reject);
  });
}

// ==================== 文件操作相关处理器 ====================

ipcMain.handle('reveal-in-finder', async (event, filePath) => {
  try {
    const fullPath = path.join(projectDir, filePath);
    
    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'File not found' };
    }

    // 根据平台使用不同的命令
    const { shell } = require('electron');
    shell.showItemInFolder(fullPath);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==================== Git 相关处理器 ====================

ipcMain.handle('git-status', async () => {
  try {
    const output = await executeGitCommand(['status', '--porcelain']);
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-add', async (event, filePath) => {
  try {
    await executeGitCommand(['add', filePath]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-commit', async (event, message) => {
  try {
    await executeGitCommand(['commit', '-m', message]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-push', async (event, remote = 'origin', branch = 'main') => {
  try {
    await executeGitCommand(['push', remote, branch]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-log', async (event, limit = 10) => {
  try {
    const output = await executeGitCommand(['log', `--max-count=${limit}`, '--pretty=format:%H|%an|%ae|%ad|%s']);
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==================== 应用生命周期 ====================

// 设置应用名称
app.setName('CLAUDE-STUDIO');

app.whenReady().then(async () => {
  
  // 再次设置应用名称
  app.setName('CLAUDE-STUDIO');
  
  // 初始化对话历史管理器
  try {
    await chatHistoryManager.init();
  } catch (error) {
    console.error('❌ 对话历史初始化失败:', error);
  }
  
  createWindow();
  
  // 注册全局快捷键
  try {
    // Cmd+Shift+L for AI panel (avoiding system Cmd+L conflict)
    const ret = globalShortcut.register('CommandOrControl+Shift+L', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('toggle-ai-panel');
      }
    });
    
    if (ret) {
    } else {
      console.warn('⚠️ 全局快捷键 Cmd+Shift+L 注册失败（可能被占用）');
    }
  } catch (error) {
    console.error('❌ 全局快捷键注册失败:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  // 注销所有全局快捷键
  globalShortcut.unregisterAll();
});

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});
