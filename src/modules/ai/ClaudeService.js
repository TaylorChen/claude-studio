/**
 * Claude Service - Claude CLI 集成
 * 管理与 Claude CLI 的连接和通信
 */

const { spawn } = require('child_process');
const EventEmitter = require('events');

class ClaudeService extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.isConnected = false;
    this.isReconnecting = false;
    this.messageQueue = [];
    this.currentMessage = null;
    this.responseBuffer = '';
    this.config = {
      cliPath: 'claude', // Claude CLI 路径
      model: 'claude-opus-4-1-20250805', // 默认模型
      maxRetries: 3,
      retryDelay: 2000
    };
  }

  /**
   * 启动 Claude CLI 连接
   */
  async start() {
    if (this.isConnected) {
      return { success: true, message: 'Already connected' };
    }

    try {
      // 测试 Claude CLI 是否可用
      const testResult = await this.testClaudeCli();
      if (!testResult.success) {
        this.emit('error', new Error(testResult.error));
        return testResult;
      }

      // Claude CLI 可用，标记为已连接
      // 注意：我们不再启动长期运行的进程
      // 每次发送消息都会启动一个新的 claude --print 进程
      this.isConnected = true;
      this.emit('connected');

      return { success: true, message: 'Claude CLI is ready' };
    } catch (error) {
      this.emit('error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 测试 Claude CLI 是否可用
   */
  async testClaudeCli() {
    return new Promise((resolve) => {
      const testProcess = spawn(this.config.cliPath, ['--version'], {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // 传递所有可能的 Claude 环境变量
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
          ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN || '',
          ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || '',
          ...(this.config.env || {})
        }
      });

      let output = '';
      let error = '';

      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      testProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      testProcess.on('close', (code) => {
        // 检查是否需要登录
        if (error.includes('Invalid API key') || error.includes('Please run /login')) {
          resolve({
            success: false,
            error: 'Claude CLI 未登录，请先运行 "claude login"',
            needLogin: true
          });
          return;
        }

        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: error || 'Claude CLI 不可用'
          });
        }
      });

      // 3秒超时
      setTimeout(() => {
        testProcess.kill();
        resolve({
          success: false,
          error: 'Claude CLI 检测超时'
        });
      }, 3000);
    });
  }

  /**
   * 停止 Claude CLI 连接
   */
  async stop() {
    // 不再需要停止长期运行的进程
    // 每次消息都是独立的进程
    this.isConnected = false;
    this.emit('disconnected');
    return { success: true, message: 'Claude CLI stopped' };
  }

  /**
   * 重启连接
   */
  async restart() {
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
    return await this.start();
  }

  /**
   * 发送消息到 Claude
   * @param {string} message - 用户消息
   * @param {Object} options - 选项
   * @returns {Promise<string>} - AI 响应
   */
  async sendMessage(message, options = {}) {
    // 使用 claude --print 命令（非交互式）
    // 这样每次发送消息都是一个独立的进程
    return new Promise((resolve, reject) => {
      // 构建完整的消息（包含上下文）
      const fullMessage = this.buildMessage(message, options);

      // 使用 claude --print 模式
      const args = ['--print'];
      
      // 如果指定了模型
      if (this.config.model) {
        args.push('--model', this.config.model);
      }

      // 启动 claude 进程（注意：重命名为 claudeProcess 避免与 process.env 冲突）
      const claudeProcess = spawn(this.config.cliPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
          ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN || '',
          ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || '',
          ...(this.config.env || {})
        }
      });

      let output = '';
      let error = '';

      // 监听输出
      claudeProcess.stdout.on('data', (data) => {
        output += data.toString();
        // 流式输出
        this.emit('messageChunk', data.toString());
      });

      // 监听错误
      claudeProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      // 进程结束
      claudeProcess.on('close', (code) => {
        if (code === 0 && output.trim()) {
          resolve(output.trim());
          this.emit('messageReceived', output.trim());
        } else {
          reject(new Error(error || '消息发送失败'));
        }
      });

      // 发送消息
      try {
        claudeProcess.stdin.write(fullMessage);
        claudeProcess.stdin.end();
        this.emit('messageSent', fullMessage);
      } catch (err) {
        reject(err);
      }

      // 设置超时（30 秒，因为 API 调用可能需要时间）
      const timeout = options.timeout || 30000;
      setTimeout(() => {
        claudeProcess.kill();
        reject(new Error('Claude CLI 响应超时（30秒）。可能原因：\n1. 网络连接问题\n2. API 服务繁忙\n3. 消息过长'));
      }, timeout);
    });
  }

  /**
   * 构建消息（添加上下文）
   */
  buildMessage(message, options) {
    const { context } = options;

    if (!context) {
      return message;
    }

    let fullMessage = message;

    // 添加文件上下文
    if (context.filePath && context.content) {
      fullMessage = `当前文件: ${context.filePath}\n\n文件内容:\n\`\`\`${context.language || ''}\n${context.content}\n\`\`\`\n\n${message}`;
    }

    // 添加选中代码上下文
    if (context.selection) {
      fullMessage += `\n\n选中的代码:\n\`\`\`${context.language || ''}\n${context.selection}\n\`\`\``;
    }

    return fullMessage;
  }

  /**
   * 处理 CLI 输出
   */
  handleOutput(data) {
    this.responseBuffer += data;

    // 检测响应结束标记（这里需要根据实际 CLI 输出调整）
    if (this.isResponseComplete(data)) {
      if (this.currentMessage) {
        // 取消超时
        if (this.currentMessage.timeoutId) {
          clearTimeout(this.currentMessage.timeoutId);
        }
        
        const response = this.parseResponse(this.responseBuffer);
        this.currentMessage.resolve(response);
        this.emit('messageReceived', response);
        this.currentMessage = null;
        this.responseBuffer = '';
      }
    } else {
      // 流式输出
      this.emit('messageChunk', data);
    }
  }

  /**
   * 判断响应是否完成
   */
  isResponseComplete(data) {
    // Claude CLI 通常在响应结束后会有一个新的提示符
    // 这里需要根据实际情况调整
    return data.includes('\n> ') || data.includes('\n$ ') || data.endsWith('\n');
  }

  /**
   * 解析响应
   */
  parseResponse(buffer) {
    // 移除提示符和多余的空白
    let response = buffer
      .replace(/^>\s*/gm, '')
      .replace(/^\$\s*/gm, '')
      .trim();

    return response;
  }

  /**
   * 处理错误输出
   */
  handleError(data) {
    console.error('Claude CLI Error:', data);
    
    // 检查是否是登录错误
    if (data.includes('Invalid API key') || data.includes('Please run /login')) {
      const loginError = new Error('Claude CLI 未登录，请先运行 "claude login"');
      loginError.needLogin = true;
      this.emit('error', loginError);
      
      if (this.currentMessage) {
        this.currentMessage.reject(loginError);
        this.currentMessage = null;
      }
      
      // 断开连接
      this.isConnected = false;
      this.emit('disconnected');
      return;
    }
    
    this.emit('error', new Error(data));

    if (this.currentMessage) {
      this.currentMessage.reject(new Error(data));
      this.currentMessage = null;
    }
  }

  /**
   * 处理进程关闭
   */
  handleClose(code) {
    this.isConnected = false;
    this.emit('disconnected', code);

    // 自动重连
    if (code !== 0 && !this.isReconnecting) {
      this.attemptReconnect();
    }
  }

  /**
   * 尝试重连
   */
  async attemptReconnect(retries = 0) {
    if (retries >= this.config.maxRetries) {
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.isReconnecting = true;
    this.emit('reconnecting', retries + 1);

    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));

    try {
      await this.start();
      this.isReconnecting = false;
      this.emit('reconnected');
    } catch (error) {
      await this.attemptReconnect(retries + 1);
    }
  }

  /**
   * 检查连接状态
   */
  checkStatus() {
    return {
      isConnected: this.isConnected,
      isReconnecting: this.isReconnecting,
      hasProcess: !!this.process,
      queueLength: this.messageQueue.length
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }
}

module.exports = ClaudeService;


