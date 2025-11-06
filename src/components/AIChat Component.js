/**
 * AI聊天组件
 * 提供改进的AI对话体验，支持流式响应和代码高亮
 */

class AIChatComponent {
    constructor(containerId) {
        this.containerId = containerId;
        this.messages = [];
        this.isProcessing = false;
        this.streamingMessage = null;
    }

    /**
     * 初始化聊天组件
     */
    async init() {
        try {
            this.renderChatUI();
            this.bindEvents();
            
            // 添加欢迎消息
            this.addMessage('assistant', this.getWelcomeMessage());
            
        } catch (error) {
            console.error('❌ AI聊天组件初始化失败:', error);
        }
    }

    /**
     * 获取欢迎消息
     */
    getWelcomeMessage() {
        return `👋 你好！我是 Claude AI 助手，可以帮助你：

**代码相关**
• 解释和分析代码
• 生成代码片段
• 代码重构建议
• 调试和修复问题

**项目管理**
• 代码审查
• 最佳实践建议
• 架构设计指导
• 性能优化建议

有什么可以帮助你的吗？`;
    }

    /**
     * 渲染聊天界面
     */
    renderChatUI() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="ai-chat-container">
                <div class="chat-messages" id="chatMessages">
                    <!-- 消息将在这里显示 -->
                </div>
                <div class="chat-input-container">
                    <div class="chat-quick-actions">
                        <button class="quick-action-btn" onclick="aiChat.insertQuickPrompt('解释这段代码')" title="解释代码">
                            💡
                        </button>
                        <button class="quick-action-btn" onclick="aiChat.insertQuickPrompt('优化这段代码')" title="优化代码">
                            ⚡
                        </button>
                        <button class="quick-action-btn" onclick="aiChat.insertQuickPrompt('找出这段代码的bug')" title="查找Bug">
                            🐛
                        </button>
                        <button class="quick-action-btn" onclick="aiChat.insertQuickPrompt('为这段代码添加注释')" title="添加注释">
                            📝
                        </button>
                        <button class="quick-action-btn" onclick="aiChat.insertQuickPrompt('将这段代码重构为更好的结构')" title="重构">
                            🔄
                        </button>
                    </div>
                    <div class="chat-input-wrapper">
                        <textarea 
                            id="chatInput" 
                            class="chat-input" 
                            placeholder="输入消息... (Shift+Enter 换行，Enter 发送)"
                            rows="3"
                        ></textarea>
                        <button id="chatSendBtn" class="chat-send-btn" onclick="aiChat.sendMessage()">
                            <span class="send-icon">📤</span>
                            <span class="send-text">发送</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        const input = document.getElementById('chatInput');
        if (!input) return;

        input.addEventListener('keydown', (e) => {
            // Enter发送，Shift+Enter换行
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 自动调整输入框高度
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 200) + 'px';
        });
    }

    /**
     * 插入快捷提示
     */
    insertQuickPrompt(prompt) {
        const input = document.getElementById('chatInput');
        if (!input) return;

        input.value = prompt;
        input.focus();
    }

    /**
     * 发送消息
     */
    async sendMessage() {
        const input = document.getElementById('chatInput');
        const sendBtn = document.getElementById('chatSendBtn');
        
        if (!input || this.isProcessing) return;

        const message = input.value.trim();
        if (!message) return;

        // 添加用户消息
        this.addMessage('user', message);
        input.value = '';
        input.style.height = 'auto';

        // 禁用发送按钮
        this.isProcessing = true;
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<span class="loading-spinner">⏳</span> 思考中...';
        }

        try {
            // 发送到Claude
            if (window.electronAPI && window.electronAPI.sendCommand) {
                const result = await window.electronAPI.sendCommand(message);
                
                if (result.success) {
                    this.addMessage('assistant', result.response);
                } else {
                    this.addMessage('assistant', `❌ 抱歉，出现错误：${result.error}`);
                }
            } else {
                this.addMessage('assistant', '❌ AI服务暂时不可用，请检查Claude CLI是否正确配置。');
            }
        } catch (error) {
            console.error('发送消息失败:', error);
            this.addMessage('assistant', `❌ 发送失败：${error.message}`);
        } finally {
            // 恢复发送按钮
            this.isProcessing = false;
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.innerHTML = '<span class="send-icon">📤</span><span class="send-text">发送</span>';
            }
            input.focus();
        }
    }

    /**
     * 添加消息
     */
    addMessage(type, content, options = {}) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}-message`;
        
        const timestamp = new Date().toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // 渲染消息内容
        const formattedContent = this.formatMessage(content);

        messageDiv.innerHTML = `
            <div class="message-avatar">
                ${type === 'user' ? '👤' : '🤖'}
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${type === 'user' ? '你' : 'Claude'}</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <div class="message-body">
                    ${formattedContent}
                </div>
                ${type === 'assistant' ? this.renderMessageActions() : ''}
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // 保存到消息历史
        this.messages.push({
            type,
            content,
            timestamp: new Date(),
            ...options
        });

        // 高亮代码块
        this.highlightCodeBlocks(messageDiv);
    }

    /**
     * 格式化消息内容
     */
    formatMessage(content) {
        // 支持Markdown格式
        let formatted = content;

        // 代码块
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'plaintext';
            return `<pre><code class="language-${language}">${this.escapeHtml(code.trim())}</code></pre>`;
        });

        // 行内代码
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

        // 粗体
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // 斜体
        formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // 链接
        formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

        // 列表
        formatted = formatted.replace(/^• (.+)$/gm, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

        // 换行
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * 高亮代码块
     */
    highlightCodeBlocks(element) {
        const codeBlocks = element.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            // 简单的语法高亮（可以集成highlight.js或Prism.js）
            this.applyBasicHighlighting(block);
        });
    }

    /**
     * 应用基础语法高亮
     */
    applyBasicHighlighting(codeBlock) {
        let code = codeBlock.textContent;
        
        // JavaScript关键字高亮
        const keywords = ['const', 'let', 'var', 'function', 'class', 'if', 'else', 'for', 'while', 'return', 'import', 'export', 'from', 'async', 'await'];
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            code = code.replace(regex, `<span class="keyword">${keyword}</span>`);
        });

        // 字符串高亮
        code = code.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');

        // 注释高亮
        code = code.replace(/\/\/.*$/gm, '<span class="comment">$&</span>');
        code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>');

        // 数字高亮
        code = code.replace(/\b\d+\.?\d*\b/g, '<span class="number">$&</span>');

        codeBlock.innerHTML = code;
    }

    /**
     * 渲染消息操作按钮
     */
    renderMessageActions() {
        return `
            <div class="message-actions">
                <button class="message-action-btn" onclick="aiChat.copyMessage(this)" title="复制">
                    📋
                </button>
                <button class="message-action-btn" onclick="aiChat.regenerateMessage(this)" title="重新生成">
                    🔄
                </button>
            </div>
        `;
    }

    /**
     * 复制消息
     */
    copyMessage(button) {
        const messageBody = button.closest('.message-content').querySelector('.message-body');
        const text = messageBody.textContent;

        navigator.clipboard.writeText(text).then(() => {
            button.textContent = '✅';
            setTimeout(() => {
                button.textContent = '📋';
            }, 2000);
        }).catch(err => {
            console.error('复制失败:', err);
        });
    }

    /**
     * 重新生成消息
     */
    async regenerateMessage(button) {
        // 获取上一条用户消息
        const userMessages = this.messages.filter(m => m.type === 'user');
        if (userMessages.length === 0) return;

        const lastUserMessage = userMessages[userMessages.length - 1];
        
        // 删除当前AI消息
        const messageDiv = button.closest('.chat-message');
        messageDiv.remove();
        this.messages.pop();

        // 重新发送
        const input = document.getElementById('chatInput');
        input.value = lastUserMessage.content;
        await this.sendMessage();
    }

    /**
     * 清除聊天记录
     */
    clearChat() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        this.messages = [];
        messagesContainer.innerHTML = '';
        this.addMessage('assistant', this.getWelcomeMessage());
    }

    /**
     * 导出聊天记录
     */
    exportChat() {
        const text = this.messages.map(msg => {
            const timestamp = new Date(msg.timestamp).toLocaleString('zh-CN');
            return `[${timestamp}] ${msg.type === 'user' ? '你' : 'Claude'}: ${msg.content}`;
        }).join('\n\n');

        // 创建下载
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `claude-chat-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIChatComponent;
}


