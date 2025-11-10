/**
 * 命令执行器 - 执行已解析的命令
 * 处理参数验证、命令执行和结果格式化
 */

class CommandExecutor {
  /**
   * 初始化命令执行器
   * @param {CommandRegistry} registry - 命令注册表
   * @param {AIChatComponent} chatComponent - 聊天组件
   */
  constructor(registry, chatComponent) {
    this.registry = registry;
    this.chatComponent = chatComponent;
    this.history = [];
    this.maxHistorySize = 100;
  }

  /**
   * 执行命令
   * @param {string} command - 命令名
   * @param {Array} args - 参数数组
   * @returns {Promise<Object>} { success, message, data }
   */
  async execute(command, args = []) {
    const commandName = command.toLowerCase();

    console.log(`🔍 执行命令: ${commandName}`, args);

    // 检查命令是否存在
    if (!this.registry.hasCommand(commandName)) {
      console.warn(`⚠️ 未知命令: ${commandName}`);
      return {
        success: false,
        message: `❌ 未知命令: /${commandName}\n输入 /help 查看可用命令`
      };
    }

    try {
      const commandDef = this.registry.getCommand(commandName);

      // 参数验证
      const validation = this.validateArgs(commandDef, args);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.error
        };
      }

      // 执行处理器
      const result = await commandDef.handler(this, args);

      // 记录命令到历史
      this.addToHistory({
        command: commandName,
        args: args,
        result: result,
        timestamp: Date.now()
      });

      console.log(`✓ 命令执行成功: ${commandName}`, result);
      return result;

    } catch (error) {
      console.error(`❌ 命令执行失败: ${commandName}`, error);
      return {
        success: false,
        message: `❌ 命令执行出错: ${error.message}`
      };
    }
  }

  /**
   * 验证命令参数
   * @param {Object} commandDef - 命令定义
   * @param {Array} args - 参数数组
   * @returns {Object} { valid, error }
   */
  validateArgs(commandDef, args) {
    // 某些命令可能需要特定数量的参数
    // 这里可以根据需要添加更严格的验证

    if (commandDef.name === 'delete' && args.length === 0) {
      return {
        valid: false,
        error: '❌ 缺少参数: /delete <session_id>'
      };
    }

    if (commandDef.name === 'rename' && args.length === 0) {
      return {
        valid: false,
        error: '❌ 缺少参数: /rename <new_name>'
      };
    }

    if (commandDef.name === 'model set' && args.length === 0) {
      return {
        valid: false,
        error: '❌ 缺少参数: /model set <model_name>'
      };
    }

    return { valid: true, error: '' };
  }

  /**
   * 添加命令到历史记录
   * @param {Object} entry - 历史记录条目
   */
  addToHistory(entry) {
    this.history.push(entry);

    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * 获取命令执行历史
   * @returns {Array} 历史记录数组
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * 清空命令历史
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * 搜索历史记录
   * @param {string} query - 搜索查询
   * @returns {Array} 匹配的历史记录
   */
  searchHistory(query) {
    return this.history.filter(entry =>
      entry.command.includes(query.toLowerCase()) ||
      entry.args.some(arg => arg.includes(query))
    );
  }

  /**
   * 获取最后执行的命令
   * @returns {Object|null} 最后的命令或 null
   */
  getLastCommand() {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  /**
   * 获取指定命令的信息
   * @param {string} name - 命令名
   * @returns {Object|null} 命令定义或 null
   */
  getCommand(name) {
    return this.registry.getCommand(name);
  }

  /**
   * 获取所有可用命令
   * @returns {Array} 命令数组
   */
  getAllCommands() {
    return this.registry.getAll();
  }

  /**
   * 获取命令使用统计
   * @returns {Object} 使用统计
   */
  getStatistics() {
    const stats = {};

    this.history.forEach(entry => {
      if (!stats[entry.command]) {
        stats[entry.command] = {
          count: 0,
          success: 0,
          failed: 0
        };
      }
      stats[entry.command].count++;
      if (entry.result.success) {
        stats[entry.command].success++;
      } else {
        stats[entry.command].failed++;
      }
    });

    return stats;
  }

  /**
   * 获取最常用的命令
   * @param {number} limit - 返回数量限制
   * @returns {Array} 最常用命令列表
   */
  getMostUsedCommands(limit = 10) {
    const stats = this.getStatistics();
    return Object.entries(stats)
      .map(([cmd, stat]) => ({ command: cmd, ...stat }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * 获取执行成功率
   * @returns {Object} { total, success, failed, rate }
   */
  getSuccessRate() {
    if (this.history.length === 0) {
      return { total: 0, success: 0, failed: 0, rate: 0 };
    }

    const successful = this.history.filter(e => e.result.success).length;
    const failed = this.history.length - successful;

    return {
      total: this.history.length,
      success: successful,
      failed: failed,
      rate: ((successful / this.history.length) * 100).toFixed(2) + '%'
    };
  }

  /**
   * 格式化执行结果用于显示
   * @param {Object} result - 执行结果
   * @returns {string} 格式化的消息
   */
  formatResult(result) {
    if (result.success) {
      return result.message || '✓ 命令执行成功';
    } else {
      return result.message || '❌ 命令执行失败';
    }
  }

  /**
   * 生成命令帮助文本
   * @returns {string} 帮助文本
   */
  generateHelpText() {
    const categories = this.registry.getCategories();
    let help = '📚 **斜杠命令帮助**\n\n';

    for (const category of categories) {
      const cmds = this.registry.getByCategory(category);
      help += `**【${category}】**\n`;
      cmds.forEach(cmd => {
        help += `• \`/${cmd.name}\` - ${cmd.description}\n`;
      });
      help += '\n';
    }

    help += '输入 `/help <command>` 查看具体命令帮助\n';
    help += '例如: `/help /new` 或 `/help /model`';

    return help;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CommandExecutor;
}

