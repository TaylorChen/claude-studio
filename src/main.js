/**
 * Claude Studio - 主进程
 * Electron Main Process
 */

const { app, BrowserWindow, ipcMain, dialog, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
// const pty = require('node-pty');  // 暂时禁用，等待重新编译
const os = require('os');

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
    // 暂时禁用终端功能，等待 node-pty 重新编译
    console.warn('⚠️ 终端功能暂时不可用，需要重新编译 node-pty');
    return { 
      success: false, 
      error: '终端功能暂时不可用。请运行: npm rebuild node-pty' 
    };
    
    /* 原始代码（等待修复）
    const shell = os.platform() === 'win32' ? 'powershell.exe' : '/bin/zsh';
    
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd: projectDir,
      env: process.env
    });

    terminals.set(terminalId, ptyProcess);

    ptyProcess.onData((data) => {
      mainWindow.webContents.send(`terminal-data-${terminalId}`, data);
    });

    ptyProcess.onExit(() => {
      terminals.delete(terminalId);
    });

    return { success: true };
    */
  } catch (error) {
    console.error('创建终端失败:', error);
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

app.whenReady().then(() => {
  
  // 再次设置应用名称
  app.setName('CLAUDE-STUDIO');
  
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
