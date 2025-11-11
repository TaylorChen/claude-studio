/**
 * 真实终端组件
 * 提供真实的命令行执行能力
 */

class TerminalComponent {
    constructor(containerId) {
        this.containerId = containerId;
        this.history = [];
        this.historyIndex = 0;
        this.currentDirectory = null;
    }

    /**
     * 初始化终端
     */
    async init() {
        try {
            const container = document.getElementById(this.containerId);
            if (!container) {
                throw new Error(`Container ${this.containerId} not found`);
            }

            // 获取当前工作目录
            if (window.electronAPI) {
                const projectDir = await window.electronAPI.getProjectDir();
                this.currentDirectory = projectDir;
            }

            // 绑定输入事件
            this.bindEvents();

            // 显示欢迎消息
            this.showWelcome();

        } catch (error) {
            throw error;
        }
    }

    /**
     * 显示欢迎消息
     */
    showWelcome() {
        this.writeLine('Claude Studio Terminal v1.0');
        this.writeLine(`当前目录: ${this.currentDirectory || '未设置'}`);
        this.writeLine('输入 help 查看可用命令\n');
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        const input = document.getElementById('terminalInput');
        if (!input) return;

        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const command = input.value.trim();
                if (command) {
                    await this.executeCommand(command);
                    input.value = '';
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory(-1, input);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory(1, input);
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.autoComplete(input);
            }
        });
    }

    /**
     * 执行命令
     */
    async executeCommand(command) {
        // 添加到历史记录
        this.history.push(command);
        this.historyIndex = this.history.length;

        // 显示命令
        this.writeLine(`$ ${command}`, 'prompt');

        // 检查是否是内置命令
        if (this.isBuiltinCommand(command)) {
            this.executeBuiltinCommand(command);
            return;
        }

        // 执行真实命令
        if (window.electronAPI && window.electronAPI.executeTerminalCommand) {
            try {
                const result = await window.electronAPI.executeTerminalCommand(command);
                if (result.success) {
                    if (result.output) {
                        this.writeLine(result.output);
                    }
                } else {
                    this.writeLine(result.error || '命令执行失败', 'error');
                }
            } catch (error) {
                this.writeLine(`错误: ${error.message}`, 'error');
            }
        } else {
            // 回退到模拟命令
            this.executeSimulatedCommand(command);
        }
    }

    /**
     * 检查是否是内置命令
     */
    isBuiltinCommand(command) {
        const cmd = command.split(' ')[0];
        return ['help', 'clear', 'history', 'cd'].includes(cmd);
    }

    /**
     * 执行内置命令
     */
    executeBuiltinCommand(command) {
        const parts = command.split(' ');
        const cmd = parts[0];

        switch (cmd) {
            case 'help':
                this.showHelp();
                break;
            case 'clear':
                this.clear();
                break;
            case 'history':
                this.showHistory();
                break;
            case 'cd':
                this.changeDirectory(parts[1]);
                break;
        }
    }

    /**
     * 执行模拟命令（降级方案）
     */
    executeSimulatedCommand(command) {
        const parts = command.split(' ');
        const cmd = parts[0];

        switch (cmd) {
            case 'ls':
            case 'dir':
                this.writeLine('package.json  src/  node_modules/  README.md');
                break;
            case 'pwd':
                this.writeLine(this.currentDirectory || '/current/directory');
                break;
            case 'date':
                this.writeLine(new Date().toString());
                break;
            case 'echo':
                this.writeLine(parts.slice(1).join(' '));
                break;
            case 'whoami':
                this.writeLine(process.env.USER || 'user');
                break;
            default:
                this.writeLine(`命令未找到: ${cmd}`, 'error');
                this.writeLine('提示: 某些命令需要真实终端支持');
        }
    }

    /**
     * 显示帮助
     */
    showHelp() {
        const help = `
可用命令:
  help          - 显示此帮助信息
  clear         - 清除终端
  history       - 显示命令历史
  cd <dir>      - 切换目录
  ls/dir        - 列出文件
  pwd           - 显示当前目录
  echo <text>   - 输出文本
  date          - 显示日期时间
  
支持所有系统命令（需要真实终端支持）
        `;
        this.writeLine(help);
    }

    /**
     * 显示历史
     */
    showHistory() {
        if (this.history.length === 0) {
            this.writeLine('暂无历史记录');
            return;
        }
        this.history.forEach((cmd, index) => {
            this.writeLine(`${index + 1}  ${cmd}`);
        });
    }

    /**
     * 切换目录
     */
    async changeDirectory(dir) {
        if (!dir) {
            this.writeLine('用法: cd <directory>');
            return;
        }

        if (window.electronAPI && window.electronAPI.changeDirectory) {
            try {
                const result = await window.electronAPI.changeDirectory(dir);
                if (result.success) {
                    this.currentDirectory = result.directory;
                    this.writeLine(`切换到: ${this.currentDirectory}`);
                } else {
                    this.writeLine(result.error, 'error');
                }
            } catch (error) {
                this.writeLine(`错误: ${error.message}`, 'error');
            }
        } else {
            this.writeLine('cd 命令需要真实终端支持', 'error');
        }
    }

    /**
     * 写入一行文本
     */
    writeLine(text, className = '') {
        const terminal = document.getElementById(this.containerId);
        if (!terminal) return;

        const line = document.createElement('div');
        line.className = `terminal-line ${className}`;
        line.textContent = text;

        // 插入到输入框之前
        const inputContainer = terminal.querySelector('.terminal-input');
        terminal.insertBefore(line, inputContainer);

        // 滚动到底部
        terminal.scrollTop = terminal.scrollHeight;
    }

    /**
     * 清除终端
     */
    clear() {
        const terminal = document.getElementById(this.containerId);
        if (!terminal) return;

        // 保留输入框
        const inputContainer = terminal.querySelector('.terminal-input');
        terminal.innerHTML = '';
        if (inputContainer) {
            terminal.appendChild(inputContainer);
        }
    }

    /**
     * 导航历史记录
     */
    navigateHistory(direction, input) {
        if (direction === -1 && this.historyIndex > 0) {
            this.historyIndex--;
            input.value = this.history[this.historyIndex];
        } else if (direction === 1 && this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            input.value = this.history[this.historyIndex];
        } else if (direction === 1 && this.historyIndex === this.history.length - 1) {
            this.historyIndex++;
            input.value = '';
        }
    }

    /**
     * 自动补全
     */
    async autoComplete(input) {
        const text = input.value;
        const parts = text.split(' ');
        const lastPart = parts[parts.length - 1];

        // 这里可以实现文件名自动补全等功能
        // 暂时简单实现命令补全
        const commands = ['help', 'clear', 'history', 'cd', 'ls', 'pwd', 'echo', 'date'];
        const matches = commands.filter(cmd => cmd.startsWith(lastPart));

        if (matches.length === 1) {
            parts[parts.length - 1] = matches[0];
            input.value = parts.join(' ');
        } else if (matches.length > 1) {
            this.writeLine('\n可能的命令:');
            this.writeLine(matches.join('  '));
            this.writeLine('');
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TerminalComponent;
}


