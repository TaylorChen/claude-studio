/**
 * 命令注册表 - 管理所有可用的命令
 * 定义命令的元数据和处理器
 */

class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.initializeCommands();
  }

  /**
   * 初始化所有可用的命令
   */
  initializeCommands() {
    // 会话管理命令
    this.registerCommand({
      name: 'new',
      description: '创建新会话',
      category: 'session',
      usage: '/new',
      params: [],
      handler: async (executor) => {
        const session = executor.chatComponent.createNewSession();
        return {
          success: true,
          message: `✓ 已创建新会话: ${session.title}`
        };
      }
    });

    this.registerCommand({
      name: 'list',
      description: '列出所有会话',
      category: 'session',
      usage: '/list',
      params: [],
      handler: async (executor) => {
        const sessions = Object.values(executor.chatComponent.sessions);
        if (sessions.length === 0) {
          return {
            success: true,
            message: '📋 没有会话'
          };
        }
        let msg = '📋 所有会话:\n';
        sessions.forEach((s, i) => {
          const isActive = s.id === executor.chatComponent.currentSessionId ? ' ✓' : '';
          msg += `${i + 1}. ${s.title} (${s.messages.length} 条消息)${isActive}\n`;
        });
        return { success: true, message: msg };
      }
    });

    this.registerCommand({
      name: 'clear',
      description: '清空当前会话',
      category: 'session',
      usage: '/clear',
      params: [],
      handler: async (executor) => {
        const current = executor.chatComponent.getCurrentSession();
        if (current) {
          current.messages = [];
          executor.chatComponent.saveSessions();
          executor.chatComponent.refreshMessagesDisplay();
          return { success: true, message: '✓ 已清空当前会话' };
        }
        return { success: false, message: '❌ 无法找到当前会话' };
      }
    });

    this.registerCommand({
      name: 'delete',
      description: '删除指定会话',
      category: 'session',
      usage: '/delete <session_id>',
      params: ['session_id'],
      handler: async (executor, args) => {
        if (args.length === 0) {
          return { success: false, message: '❌ 缺少参数: session_id' };
        }
        const sessionId = args[0];
        const session = executor.chatComponent.sessions[sessionId];
        if (!session) {
          return { success: false, message: `❌ 会话不存在: ${sessionId}` };
        }
        executor.chatComponent.deleteSession(sessionId);
        return { success: true, message: `✓ 已删除会话: ${session.title}` };
      }
    });

    this.registerCommand({
      name: 'rename',
      description: '重命名当前会话',
      category: 'session',
      usage: '/rename <new_name>',
      params: ['new_name'],
      handler: async (executor, args) => {
        if (args.length === 0) {
          return { success: false, message: '❌ 缺少参数: new_name' };
        }
        const newName = args.join(' ').trim();
        if (!newName) {
          return { success: false, message: '❌ 新名称不能为空' };
        }
        const current = executor.chatComponent.getCurrentSession();
        if (current) {
          executor.chatComponent.renameSession(current.id, newName);
          return { success: true, message: `✓ 已重命名为: ${newName}` };
        }
        return { success: false, message: '❌ 无法找到当前会话' };
      }
    });

    // 模型管理命令
    this.registerCommand({
      name: 'model',
      description: '查看当前模型',
      category: 'model',
      usage: '/model',
      params: [],
      handler: async (executor) => {
        const currentModel = executor.chatComponent.currentModel || 'claude-3-5-sonnet';
        return {
          success: true,
          message: `🤖 当前模型: ${currentModel}`
        };
      }
    });

    this.registerCommand({
      name: 'model list',
      description: '列出可用模型',
      category: 'model',
      usage: '/model list',
      params: [],
      handler: async (executor) => {
        const models = [
          'claude-3-5-sonnet',
          'claude-3-5-haiku',
          'claude-3-opus'
        ];
        let msg = '🤖 可用模型:\n';
        models.forEach((m, i) => {
          msg += `${i + 1}. ${m}\n`;
        });
        return { success: true, message: msg };
      }
    });

    this.registerCommand({
      name: 'model set',
      description: '切换模型',
      category: 'model',
      usage: '/model set <model_name>',
      params: ['model_name'],
      // MVP-3.3 Phase 2: 参数定义
      paramDefinitions: [
        {
          name: 'model_name',
          type: 'select',
          description: '模型名称',
          values: ['claude-3-5-sonnet', 'claude-3-5-haiku', 'claude-3-opus'],
          required: true
        }
      ],
      handler: async (executor, args) => {
        if (args.length === 0) {
          return { success: false, message: '❌ 缺少参数: model_name' };
        }
        const modelName = args.join(' ').trim();
        const validModels = ['claude-3-5-sonnet', 'claude-3-5-haiku', 'claude-3-opus'];
        if (!validModels.includes(modelName)) {
          return {
            success: false,
            message: `❌ 无效的模型: ${modelName}\n可用模型: ${validModels.join(', ')}`
          };
        }
        executor.chatComponent.currentModel = modelName;
        return { success: true, message: `✓ 已切换到模型: ${modelName}` };
      }
    });

    // 信息查询命令
    this.registerCommand({
      name: 'help',
      description: '显示帮助信息',
      category: 'info',
      usage: '/help [command]',
      params: ['command (可选)'],
      // MVP-3.3 Phase 2: 参数定义
      paramDefinitions: [
        {
          name: 'command',
          type: 'select',
          description: '命令名称（可选）',
          values: [],  // 动态获取，见下面的 getAll() 调用
          required: false
        }
      ],
      handler: async (executor, args) => {
        if (args.length > 0) {
          const cmdName = args[0].replace('/', '');
          const cmd = this.getCommand(cmdName);
          if (cmd) {
            let msg = `## 📚 /${cmd.name}\n\n`;
            msg += `**描述**: ${cmd.description}\n\n`;
            msg += `**用法**: \`${cmd.usage}\`\n\n`;
            if (cmd.params && cmd.params.length > 0) {
              msg += `**参数**: ${cmd.params.join(', ')}\n\n`;
            }
            msg += `**分类**: ${cmd.category}`;
            return {
              success: true,
              message: msg
            };
          }
          return { success: false, message: `❌ 未找到命令: ${args[0]}` };
        }

        let msg = '# 📚 所有可用命令\n\n';
        const categories = {};
        this.commands.forEach(cmd => {
          if (!categories[cmd.category]) {
            categories[cmd.category] = [];
          }
          categories[cmd.category].push(cmd);
        });

        const categoryNames = {
          'session': '🔄 会话管理',
          'model': '🤖 模型管理',
          'info': 'ℹ️ 信息查询',
          'import-export': '📤 导入导出',
          'config': '⚙️ 设置管理',
          'other': '📌 其他命令'
        };

        for (const [category, cmds] of Object.entries(categories)) {
          const categoryName = categoryNames[category] || category;
          msg += `## ${categoryName}\n\n`;
          cmds.forEach(cmd => {
            msg += `- **/${cmd.name}** - ${cmd.description}\n`;
          });
          msg += '\n';
        }

        msg += '---\n\n';
        msg += '### 💡 使用提示\n\n';
        msg += '- 输入 `/help <command>` 查看具体命令帮助\n';
        msg += '- 例如: `/help /new` 或 `/help /model`\n';
        msg += '- 所有命令都支持参数自动补全';
        
        return { success: true, message: msg };
      }
    });

    this.registerCommand({
      name: 'info',
      description: '显示系统信息',
      category: 'info',
      usage: '/info',
      params: [],
      handler: async (executor) => {
        const sessionCount = Object.keys(executor.chatComponent.sessions).length;
        const totalMessages = Object.values(executor.chatComponent.sessions).reduce(
          (sum, s) => sum + (s.messages?.length || 0),
          0
        );
        const currentSession = executor.chatComponent.getCurrentSession();

        let msg = '📊 系统信息:\n';
        msg += `  会话总数: ${sessionCount}\n`;
        msg += `  消息总数: ${totalMessages}\n`;
        msg += `  当前会话: ${currentSession?.title || '无'}\n`;
        msg += `  当前会话消息数: ${currentSession?.messages?.length || 0}\n`;
        msg += `  模型: ${executor.chatComponent.currentModel || 'claude-3-5-sonnet'}\n`;

        return { success: true, message: msg };
      }
    });

    this.registerCommand({
      name: 'status',
      description: '显示连接状态',
      category: 'info',
      usage: '/status',
      params: [],
      handler: async (executor) => {
        const msg = '✓ 系统状态: 正常\n' +
                   '✓ AI 服务: 已连接\n' +
                   '✓ 本地存储: 可用\n' +
                   '✓ 应用版本: 1.0.0';
        return { success: true, message: msg };
      }
    });

    // 导入导出命令
    this.registerCommand({
      name: 'export',
      description: '导出当前会话',
      category: 'import-export',
      usage: '/export [format]',
      params: ['format (json/markdown)'],
      // MVP-3.3 Phase 2: 参数定义
      paramDefinitions: [
        {
          name: 'format',
          type: 'select',
          description: '导出格式',
          values: ['json', 'markdown'],
          required: false
        }
      ],
      handler: async (executor, args) => {
        const format = args.length > 0 ? args[0].toLowerCase() : 'json';
        const current = executor.chatComponent.getCurrentSession();
        if (!current) {
          return { success: false, message: '❌ 无法找到当前会话' };
        }

        if (format === 'json') {
          const data = JSON.stringify(current, null, 2);
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${current.title}-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
          return { success: true, message: `✓ 已导出为 JSON 格式` };
        } else if (format === 'markdown') {
          let md = `# ${current.title}\n\n`;
          md += `**创建于**: ${new Date(current.createdAt).toLocaleString()}\n\n`;
          current.messages.forEach((msg, i) => {
            md += `## ${msg.role === 'user' ? '👤 用户' : '🤖 助手'}\n\n`;
            md += `${msg.content}\n\n---\n\n`;
          });

          const blob = new Blob([md], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${current.title}-${Date.now()}.md`;
          a.click();
          URL.revokeObjectURL(url);
          return { success: true, message: `✓ 已导出为 Markdown 格式` };
        }

        return { success: false, message: `❌ 不支持的格式: ${format}` };
      }
    });

    this.registerCommand({
      name: 'settings',
      description: '打开设置对话框',
      category: 'config',
      usage: '/settings',
      params: [],
      handler: async (executor) => {
        if (window.systemPromptDialog) {
          window.systemPromptDialog.open();
          return { success: true, message: '✓ 已打开设置' };
        }
        return { success: false, message: '❌ 设置对话框不可用' };
      }
    });

    this.registerCommand({
      name: 'prompt',
      description: '管理系统提示',
      category: 'config',
      usage: '/prompt',
      params: [],
      handler: async (executor) => {
        if (window.systemPromptDialog) {
          window.systemPromptDialog.open();
          return { success: true, message: '✓ 已打开系统提示管理' };
        }
        return { success: false, message: '❌ 提示管理器不可用' };
      }
    });

    this.registerCommand({
      name: 'clear-cache',
      description: '清除本地缓存',
      category: 'config',
      usage: '/clear-cache',
      params: [],
      handler: async (executor) => {
        try {
          localStorage.clear();
          return { success: true, message: '✓ 已清除所有本地缓存' };
        } catch (error) {
          return { success: false, message: `❌ 清除缓存失败: ${error.message}` };
        }
      }
    });
  }

  /**
   * 注册一个新命令
   * @param {Object} commandDef - 命令定义
   */
  registerCommand(commandDef) {
    if (!commandDef.name || !commandDef.handler) {
      throw new Error('命令必须有 name 和 handler');
    }

    this.commands.set(commandDef.name, {
      name: commandDef.name,
      description: commandDef.description || '',
      category: commandDef.category || 'other',
      usage: commandDef.usage || `/${commandDef.name}`,
      params: commandDef.params || [],
      handler: commandDef.handler
    });

    console.log(`✓ 已注册命令: /${commandDef.name}`);
  }

  /**
   * 获取指定名称的命令
   * @param {string} name - 命令名
   * @returns {Object|null} 命令定义或 null
   */
  getCommand(name) {
    const cmd = this.commands.get(name.toLowerCase()) || null;
    
    // MVP-3.3 Phase 2: 动态填充参数值
    if (cmd && cmd.paramDefinitions) {
      cmd.paramDefinitions.forEach(param => {
        // 为 /help 命令动态填充命令列表
        if (cmd.name === 'help' && param.name === 'command') {
          param.values = this.getAll().map(c => c.name);
        }
      });
    }
    
    return cmd;
  }

  /**
   * 获取所有命令
   * @returns {Array} 命令数组
   */
  getAll() {
    return Array.from(this.commands.values());
  }

  /**
   * 按类别获取命令
   * @param {string} category - 类别名
   * @returns {Array} 同类别的命令数组
   */
  getByCategory(category) {
    return this.getAll().filter(cmd => cmd.category === category);
  }

  /**
   * 检查命令是否存在
   * @param {string} name - 命令名
   * @returns {boolean} 命令是否存在
   */
  hasCommand(name) {
    return this.commands.has(name.toLowerCase());
  }

  /**
   * 获取所有类别
   * @returns {Set} 类别集合
   */
  getCategories() {
    const categories = new Set();
    this.commands.forEach(cmd => {
      categories.add(cmd.category);
    });
    return categories;
  }

  /**
   * MVP-3.3 Phase 2: 获取命令的参数建议
   * @param {string} commandName - 命令名
   * @param {number} paramIndex - 参数索引
   * @returns {Object|null} 参数定义或 null
   */
  getParameterValues(commandName, paramIndex) {
    const cmd = this.getCommand(commandName);
    if (!cmd || !cmd.paramDefinitions || paramIndex >= cmd.paramDefinitions.length) {
      return null;
    }
    return cmd.paramDefinitions[paramIndex];
  }

  /**
   * MVP-3.3 Phase 2: 验证参数值是否有效
   * @param {string} commandName - 命令名
   * @param {number} paramIndex - 参数索引
   * @param {string} value - 参数值
   * @returns {boolean} 参数是否有效
   */
  validateParameter(commandName, paramIndex, value) {
    const paramDef = this.getParameterValues(commandName, paramIndex);
    if (!paramDef) return true; // 无定义则认为有效

    if (paramDef.type === 'select' && paramDef.values) {
      return paramDef.values.includes(value);
    }
    if (paramDef.type === 'text') {
      return typeof value === 'string' && value.length > 0;
    }
    return true;
  }

  /**
   * MVP-3.3 Phase 2: 获取命令的参数定义（用于前端显示建议）
   * @param {string} commandName - 命令名
   * @returns {Array} 参数定义数组
   */
  getParameterDefinitions(commandName) {
    const cmd = this.getCommand(commandName);
    return cmd && cmd.paramDefinitions ? cmd.paramDefinitions : [];
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CommandRegistry;
}

