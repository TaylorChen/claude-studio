/**
 * 命令解析器 - 识别和解析斜杠命令
 * 用于将用户输入分解为命令名和参数
 */

class CommandParser {
  /**
   * 检查输入是否为命令，并解析命令名和参数
   * @param {string} input - 用户输入
   * @returns {Object} { isCommand: boolean, command: string, args: string[], rawInput: string }
   */
  parse(input) {
    // 去除前后空格
    const trimmed = input.trim();

    // 检查是否以 / 开头
    if (!trimmed.startsWith('/')) {
      return {
        isCommand: false,
        command: '',
        args: [],
        rawInput: trimmed
      };
    }

    // 移除开头的 /
    const content = trimmed.substring(1).trim();

    // 如果只有 /，不是有效命令
    if (!content) {
      return {
        isCommand: false,
        command: '',
        args: [],
        rawInput: trimmed
      };
    }

    // 分割命令和参数
    const parts = this.tokenize(content);
    if (parts.length === 0) {
      return {
        isCommand: false,
        command: '',
        args: [],
        rawInput: trimmed
      };
    }

    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // 验证命令名有效性
    if (!this.validateCommandName(command)) {
      console.warn(`⚠️ 无效的命令名: ${command}`);
      return {
        isCommand: false,
        command: '',
        args: [],
        rawInput: trimmed
      };
    }

    return {
      isCommand: true,
      command: command,
      args: args,
      rawInput: trimmed
    };
  }

  /**
   * 将输入字符串分割为令牌（命令和参数）
   * 支持引号处理
   * @param {string} input - 输入字符串
   * @returns {string[]} 令牌数组
   */
  tokenize(input) {
    const tokens = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const nextChar = input[i + 1];

      // 处理引号
      if ((char === '"' || char === "'") && (i === 0 || input[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        } else {
          current += char;
        }
        continue;
      }

      // 处理空格（仅当不在引号内时）
      if (char === ' ' && !inQuotes) {
        if (current.length > 0) {
          tokens.push(current);
          current = '';
        }
        continue;
      }

      current += char;
    }

    // 添加最后一个令牌
    if (current.length > 0) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * 验证命令名的有效性
   * 命令名必须由字母、数字、下划线和连字符组成
   * @param {string} name - 命令名
   * @returns {boolean} 是否有效
   */
  validateCommandName(name) {
    // 命令名不能为空
    if (!name || name.length === 0) {
      return false;
    }

    // 命令名长度限制在 1-32 之间
    if (name.length > 32) {
      return false;
    }

    // 只允许字母、数字、下划线和连字符
    // 支持 /model set 这样的多词命令
    const validPattern = /^[a-z0-9_-]+(\s[a-z0-9_-]+)*$/i;
    return validPattern.test(name);
  }

  /**
   * 获取命令的帮助文本
   * @param {string} command - 命令名
   * @returns {string} 帮助文本
   */
  getCommandHelp(command) {
    const helpTexts = {
      'new': '创建新会话\n用法: /new\n示例: /new',
      'list': '列出所有会话\n用法: /list\n示例: /list',
      'clear': '清空当前会话\n用法: /clear\n示例: /clear',
      'delete': '删除指定会话\n用法: /delete <session_id>\n示例: /delete session_1',
      'rename': '重命名当前会话\n用法: /rename <new_name>\n示例: /rename 我的新对话',
      'model': '查看当前模型\n用法: /model\n示例: /model',
      'help': '显示帮助信息\n用法: /help [command]\n示例: /help /new',
      'info': '显示系统信息\n用法: /info\n示例: /info',
      'status': '显示连接状态\n用法: /status\n示例: /status',
      'export': '导出当前会话\n用法: /export [format]\n示例: /export json',
      'import': '导入会话文件\n用法: /import\n示例: /import',
      'settings': '打开设置对话框\n用法: /settings\n示例: /settings',
      'prompt': '管理系统提示\n用法: /prompt\n示例: /prompt',
      'clear-cache': '清除本地缓存\n用法: /clear-cache\n示例: /clear-cache'
    };

    return helpTexts[command.toLowerCase()] || `未找到命令 "${command}" 的帮助信息`;
  }

  /**
   * MVP-3.3 Phase 2: 识别当前输入的参数位置
   * @param {string} input - 完整输入
   * @returns {Object} { command: string, paramIndex: number, partialParam: string }
   */
  identifyParameterPosition(input) {
    const trimmed = input.trim();
    
    // 必须以 / 开头
    if (!trimmed.startsWith('/')) {
      return { command: '', paramIndex: -1, partialParam: '' };
    }

    // 移除 / 并分割
    const content = trimmed.substring(1);
    const parts = content.split(/\s+/);
    
    if (parts.length === 0) {
      return { command: '', paramIndex: -1, partialParam: '' };
    }

    // 第一部分是命令
    const command = parts[0].toLowerCase();
    
    // 参数索引 = 总部分数 - 2（减去 / 和命令本身）
    // 如果输入以空格结尾，表示要求下一个参数
    const endsWithSpace = input.endsWith(' ');
    let paramIndex = parts.length - 2;
    let partialParam = '';

    if (paramIndex < 0) {
      paramIndex = 0;
      partialParam = '';
    } else if (endsWithSpace) {
      // 空格结尾，输入下一个参数的第一个字符
      paramIndex = parts.length - 1;
      partialParam = '';
    } else {
      // 获取当前正在输入的参数的部分内容
      partialParam = parts[parts.length - 1];
    }

    return {
      command: command,
      paramIndex: paramIndex,
      partialParam: partialParam
    };
  }

  /**
   * MVP-3.3 Phase 2: 获取参数建议
   * @param {string} commandName - 命令名
   * @param {number} paramIndex - 参数索引
   * @param {string} partial - 部分输入
   * @param {Array} paramValues - 参数值列表
   * @returns {Array} 匹配的建议列表
   */
  getParameterSuggestions(commandName, paramIndex, partial, paramValues = []) {
    if (!paramValues || paramValues.length === 0) {
      return [];
    }

    // 如果没有部分输入，返回所有参数值
    if (!partial || partial.length === 0) {
      return paramValues;
    }

    // 执行模糊匹配
    const lowerPartial = partial.toLowerCase();
    return paramValues.filter(val => 
      val.toLowerCase().includes(lowerPartial)
    );
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CommandParser;
}

