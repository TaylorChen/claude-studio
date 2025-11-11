/**
 * AI聊天组件 - 支持多会话和持久化
 * 提供改进的AI对话体验，支持流式响应和代码高亮
 */

class AIChatComponent {
    constructor(containerId) {
        this.containerId = containerId;
        this.messages = [];
        this.isProcessing = false;
        this.streamingMessage = null;
        this.sessionList = null;  // MVP-1.2 会话列表组件
        this.sessionListVisible = false;  // 会话列表是否显示
        this.initialized = false;  // 防止重复初始化
        
        // 多会话支持
        this.currentSessionId = null;  // 当前会话 ID
        this.sessions = {};  // 所有会话: { sessionId: { id, title, messages, createdAt, updatedAt } }
        this.sessionOrder = [];  // 会话顺序
        
        // Phase 3: 斜杠命令系统
        this.commandParser = null;      // 命令解析器
        this.commandRegistry = null;    // 命令注册表
        this.commandExecutor = null;    // 命令执行器
        
        // MVP-3.3: 命令增强
        this.suggestionsSelectedIndex = -1;  // 当前选中的建议索引
        this.currentSuggestions = [];        // 当前显示的建议列表
        
        // MVP-3.3 Phase 3: 命令历史搜索
        this.historySearchVisible = false;   // 历史搜索是否显示
        this.historySearchQuery = '';        // 搜索查询
        this.historySearchResults = [];      // 搜索结果
        this.historySearchIndex = -1;        // 当前选中的搜索结果索引
        
        // 同步加载（使用备用的同步方式先初始化，异步加载数据）
        this.loadSessionsSync();
        this.initializeDefaultSession();
        this.initializeCommandSystem();
    }

    /**
     * 同步加载会话 (从 localStorage，用于构造函数)
     */
    loadSessionsSync() {
        try {
            const data = localStorage.getItem('claude_ai_sessions');
            if (data) {
                const parsed = JSON.parse(data);
                this.sessions = parsed.sessions || {};
                this.sessionOrder = parsed.sessionOrder || [];
                this.currentSessionId = parsed.currentSessionId;
                console.log(`✓ 从 localStorage 同步加载了 ${Object.keys(this.sessions).length} 个会话`);
            }
        } catch (error) {
        }
    }

    /**
     * 异步加载会话 (从 IndexedDB，用于初始化后)
     */
    async loadSessions() {
        try {
            // 尝试从 IndexedDB 加载
            if (window.indexedDBManager && window.indexedDBManager.isSupported) {
                const indexedDBData = await window.indexedDBManager.loadSessions();
                if (indexedDBData) {
                    this.sessions = indexedDBData.sessions || {};
                    this.sessionOrder = indexedDBData.sessionOrder || [];
                    this.currentSessionId = indexedDBData.currentSessionId;
                    console.log(`✓ 从 IndexedDB 异步加载了 ${Object.keys(this.sessions).length} 个会话`);
                    this.saveSessions();  // 同时更新 UI
                    return;
                }
            }

            // 降级到 localStorage (如果 IndexedDB 加载失败)
            const data = localStorage.getItem('claude_ai_sessions');
            if (data) {
                const parsed = JSON.parse(data);
                this.sessions = parsed.sessions || {};
                this.sessionOrder = parsed.sessionOrder || [];
                this.currentSessionId = parsed.currentSessionId;
                console.log(`✓ 从 localStorage 异步加载了 ${Object.keys(this.sessions).length} 个会话`);
                
                // 同时迁移到 IndexedDB
                if (window.indexedDBManager && window.indexedDBManager.isSupported) {
                    const migrated = await window.indexedDBManager.migrateFromLocalStorage();
                    if (migrated) {
                        console.log('✓ 已自动迁移数据到 IndexedDB');
                    }
                }
            }
        } catch (error) {
        }
    }

    /**
     * 保存所有会话到本地存储 (支持 IndexedDB 和 localStorage)
     */
    async saveSessions() {
        try {
            const data = {
                sessions: this.sessions,
                sessionOrder: this.sessionOrder,
                currentSessionId: this.currentSessionId,
                savedAt: new Date().toISOString()
            };

            // 优先保存到 IndexedDB
            if (window.indexedDBManager && window.indexedDBManager.isSupported && window.indexedDBManager.db) {
                const indexedDBSuccess = await window.indexedDBManager.saveSessions(data);
                if (indexedDBSuccess) {
                    // 同时保留 localStorage 备份
            localStorage.setItem('claude_ai_sessions', JSON.stringify(data));
                    return;
                }
            }

            // 降级到 localStorage
            localStorage.setItem('claude_ai_sessions', JSON.stringify(data));
        } catch (error) {
        }
    }

    /**
     * 初始化默认会话
     */
    initializeDefaultSession() {
        // 如果没有会话，创建一个默认会话
        if (this.sessionOrder.length === 0) {
            const sessionId = this.generateSessionId();
            this.sessions[sessionId] = {
                id: sessionId,
                title: '新对话',
                messages: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            this.sessionOrder.push(sessionId);
            this.currentSessionId = sessionId;
            this.saveSessions().catch(e => console.error('❌ 保存默认会话出错:', e));
        } else if (!this.currentSessionId) {
            // 恢复最后一个活跃会话
            this.currentSessionId = this.sessionOrder[this.sessionOrder.length - 1];
        }
    }

    /**
     * 初始化命令系统
     */
    initializeCommandSystem() {
        try {
            if (typeof CommandParser === 'undefined' || 
                typeof CommandRegistry === 'undefined' || 
                typeof CommandExecutor === 'undefined') {
                console.warn('⚠️ 命令系统类未加载');
                return;
            }

            // 创建命令系统实例
            this.commandParser = new CommandParser();
            this.commandRegistry = new CommandRegistry();
            this.commandExecutor = new CommandExecutor(this.commandRegistry, this);

            console.log('✓ 命令系统初始化完成');
            console.log(`✓ 已注册 ${this.commandRegistry.getAll().length} 个命令`);
        } catch (error) {
        }
    }

    /**
     * 生成唯一的会话 ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 获取当前会话
     */
    getCurrentSession() {
        return this.sessions[this.currentSessionId];
    }

    /**
     * 创建新会话
     */
    createNewSession() {
        // 保存当前会话的消息
        const current = this.getCurrentSession();
        if (current) {
            current.messages = this.messages;
            current.updatedAt = Date.now();
        }

        const sessionId = this.generateSessionId();
        const newSession = {
            id: sessionId,
            title: '新对话',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        console.log('➕ 创建新会话:', sessionId);
        
        this.sessions[sessionId] = newSession;
        this.sessionOrder.push(sessionId);
        this.currentSessionId = sessionId;
        this.messages = [];
        
        // 清空附件列表
        if (window.attachmentManager) {
            window.attachmentManager.clearAttachments();
            if (this.updateAttachmentsList) {
                this.updateAttachmentsList();
            }
        }
        
        this.saveSessions().catch(e => console.error('❌ 保存新会话出错:', e));
        
        // 刷新 UI - 只刷新标签页和消息内容
        this.renderSessionTabs();
        this.refreshMessagesDisplay();
        
        // 如果会话列表面板打开，也要刷新
        if (this.sessionListVisible) {
            this.renderCurrentSessionsList();
        }
        
        this.showNotification('✓ 创建新会话');
        
        return newSession;
    }

    /**
     * 切换会话
     */
    switchSession(sessionId) {
        if (!this.sessions[sessionId]) {
            return;
        }


        // 保存当前会话的消息
        const current = this.getCurrentSession();
        if (current) {
            current.messages = this.messages;
            current.updatedAt = Date.now();
        }

        // 切换到新会话
        this.currentSessionId = sessionId;
        const newSession = this.sessions[sessionId];
        this.messages = newSession.messages || [];
        
        // 清空附件列表
        if (window.attachmentManager) {
            window.attachmentManager.clearAttachments();
            if (this.updateAttachmentsList) {
                this.updateAttachmentsList();
            }
        }
        
        
        this.saveSessions().catch(e => console.error('❌ 保存会话切换出错:', e));
        
        // 刷新 UI - 只刷新标签页和消息内容，不重新渲染整个 UI
        this.renderSessionTabs();
        this.refreshMessagesDisplay();
        
        // 如果会话列表面板打开，也要刷新
        if (this.sessionListVisible) {
            this.renderCurrentSessionsList();
        }
        
        this.showNotification(`✓ 已切换到: ${newSession.title}`);
    }

    /**
     * 删除会话
     */
    deleteSession(sessionId) {
        if (this.sessionOrder.length <= 1) {
            this.showNotification('⚠️ 必须保留至少一个会话');
            return;
        }

        const title = this.sessions[sessionId]?.title || '对话';
        
        // 删除会话
        delete this.sessions[sessionId];
        this.sessionOrder = this.sessionOrder.filter(id => id !== sessionId);
        
        // 如果删除的是当前会话，切换到最后一个会话
        if (this.currentSessionId === sessionId) {
            this.currentSessionId = this.sessionOrder[this.sessionOrder.length - 1];
            this.messages = this.sessions[this.currentSessionId].messages || [];
        }
        
        this.saveSessions().catch(e => console.error('❌ 保存会话删除出错:', e));
        
        // 刷新 UI - 只刷新标签页和消息内容
        this.renderSessionTabs();
        this.refreshMessagesDisplay();
        
        // 如果会话列表面板打开，也要刷新
        if (this.sessionListVisible) {
            this.renderCurrentSessionsList();
        }
        
        this.showNotification(`✓ 已删除: ${title}`);
    }

    /**
     * 重命名会话
     */
    renameSession(sessionId, newTitle) {
        if (this.sessions[sessionId]) {
            this.sessions[sessionId].title = newTitle;
            this.sessions[sessionId].updatedAt = Date.now();
            this.saveSessions().catch(e => console.error('❌ 保存会话重命名出错:', e));
            this.renderSessionTabs();
            
            // 如果会话列表面板打开，也要刷新
            if (this.sessionListVisible) {
                this.renderCurrentSessionsList();
            }
            
            this.showNotification(`✓ 已重命名为: ${newTitle}`);
        }
    }

    /**
     * 显示会话右键菜单
     */
    showSessionContextMenu(sessionId, event) {
        const session = this.sessions[sessionId];
        if (!session) return;

        // 创建上下文菜单
        const menu = document.createElement('div');
        menu.className = 'session-context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            z-index: 10000;
            min-width: 150px;
        `;

        const options = [
            { label: '✏️ 编辑名称', action: () => this.editSessionTitle(sessionId) },
            { label: '🗑️ 删除', action: () => this.deleteSession(sessionId) }
        ];

        options.forEach(opt => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                color: var(--text-primary);
                border-bottom: 1px solid var(--border-color);
                transition: all 0.2s;
            `;
            item.textContent = opt.label;
            item.onmouseover = () => {
                item.style.background = 'var(--accent)';
                item.style.color = 'white';
            };
            item.onmouseout = () => {
                item.style.background = 'transparent';
                item.style.color = 'var(--text-primary)';
            };
            item.onclick = () => {
                opt.action();
                document.body.removeChild(menu);
            };
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        // 点击其他地方时关闭菜单
        const closeMenu = (e) => {
            if (menu && !menu.contains(e.target)) {
                if (document.body.contains(menu)) {
                    document.body.removeChild(menu);
                }
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    /**
     * 编辑会话标题
     */
    editSessionTitle(sessionId) {
        const session = this.sessions[sessionId];
        if (!session) return;

        // 创建自定义输入对话框
        const dialogOverlay = document.createElement('div');
        dialogOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 20px;
            min-width: 300px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        `;

        dialog.innerHTML = `
            <div style="margin-bottom: 15px; font-weight: bold; color: var(--text-primary);">
                编辑会话名称
            </div>
            <input type="text" id="session-title-input" value="${session.title}" 
                   style="
                       width: 100%;
                       padding: 8px;
                       background: var(--bg-primary);
                       color: var(--text-primary);
                       border: 1px solid var(--border-color);
                       border-radius: 4px;
                       box-sizing: border-box;
                       font-size: 14px;
                       margin-bottom: 15px;
                   ">
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button id="cancel-btn" style="
                    padding: 8px 16px;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                ">取消</button>
                <button id="confirm-btn" style="
                    padding: 8px 16px;
                    background: var(--accent);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 13px;
                ">确定</button>
            </div>
        `;

        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);

        const inputElement = dialog.querySelector('#session-title-input');
        const cancelBtn = dialog.querySelector('#cancel-btn');
        const confirmBtn = dialog.querySelector('#confirm-btn');

        // 自动聚焦输入框
        setTimeout(() => inputElement.focus(), 100);

        // 选中所有文本
        inputElement.select();

        const closeDialog = () => {
            if (document.body.contains(dialogOverlay)) {
                document.body.removeChild(dialogOverlay);
            }
        };

        // 取消按钮
        cancelBtn.onclick = closeDialog;

        // 确定按钮
        confirmBtn.onclick = () => {
            const newTitle = inputElement.value.trim();
            if (newTitle) {
                this.renameSession(sessionId, newTitle);
            } else {
                this.showNotification('⚠️ 会话名称不能为空');
            }
            closeDialog();
        };

        // Enter 键确定
        inputElement.onkeydown = (e) => {
            if (e.key === 'Enter') {
                confirmBtn.click();
            } else if (e.key === 'Escape') {
                closeDialog();
            }
        };

        // ESC 键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * 初始化聊天组件
     */
    async init() {
        try {
            // 防止重复初始化
            if (this.initialized) {
                console.log('⚠️ AI聊天组件已初始化，跳过重复初始化');
                return;
            }

            // 初始化 IndexedDB (支持更大容量和更稳定的存储)
            if (window.indexedDBManager) {
                const indexedDBReady = await window.indexedDBManager.init();
                if (indexedDBReady) {
                    console.log('✓ IndexedDB 已初始化');
                    // 初始化完成后，异步加载会话
                    this.loadSessions().catch(e => console.error('❌ 异步加载会话出错:', e));
                } else {
                    console.log('⚠️ IndexedDB 初始化失败，将使用 localStorage');
                }
            }


            this.renderChatUI();
            this.renderSessionTabs();
            this.bindEvents();
            this.initialized = true;
            
            // 使用 setTimeout 确保 DOM 已完全加载和渲染
            setTimeout(() => {
            // 加载当前会话的消息
            const current = this.getCurrentSession();
                
                const messagesContainer = document.getElementById('chatMessages');
                
                if (!messagesContainer) {
                    return;
                }
                
            if (current && current.messages && current.messages.length > 0) {
                    console.log(`✓ 加载 ${current.messages.length} 条消息`);
                this.messages = current.messages;
                    
                    // 清空容器（可能有初始的欢迎消息）
                    messagesContainer.innerHTML = '';
                    
                    // 逐个显示消息
                    this.messages.forEach(msg => {
                        this.addMessageToDOM(msg.role, msg.content);
                    });
                    console.log('✓ 消息已显示');
            } else {
                    console.log('ℹ️ 没有保存的消息，显示欢迎信息');
                    messagesContainer.innerHTML = '';
                this.addMessage('assistant', this.getWelcomeMessage());
            }
            }, 200);
            
        } catch (error) {
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
     * 渲染会话标签页
     */
    renderSessionTabs() {
        const tabsContainer = document.querySelector('.chat-session-tabs');
        if (!tabsContainer) return;

        let tabsHTML = '';
        
        // 渲染每个会话的标签
        this.sessionOrder.forEach(sessionId => {
            const session = this.sessions[sessionId];
            if (!session) return;

            const isActive = sessionId === this.currentSessionId;
            const shortTitle = session.title.length > 15 ? session.title.substring(0, 15) + '...' : session.title;

            tabsHTML += `
                <div class="chat-tab ${isActive ? 'active' : ''}" 
                     data-session-id="${sessionId}"
                     onclick="window.aiChat && window.aiChat.switchSession('${sessionId}')"
                     oncontextmenu="event.preventDefault(); window.aiChat && window.aiChat.showSessionContextMenu('${sessionId}', event)"
                     style="
                        padding: 8px 12px;
                        background: ${isActive ? 'var(--accent)' : 'var(--bg-secondary)'};
                        color: ${isActive ? 'white' : 'var(--text-primary)'};
                        border-radius: 4px;
                        cursor: pointer;
                        margin-right: 5px;
                        white-space: nowrap;
                        border: 1px solid ${isActive ? 'var(--accent)' : 'var(--border-color)'};
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        transition: all 0.2s;
                     ">
                    <span class="session-title" title="${session.title}">${shortTitle}</span>
                    <button onclick="event.stopPropagation(); window.aiChat && window.aiChat.deleteSession('${sessionId}')"
                            style="
                                background: none;
                                border: none;
                                color: inherit;
                                cursor: pointer;
                                font-size: 14px;
                                padding: 0;
                            " title="删除会话">✕</button>
                </div>
            `;
        });

        // 添加新建会话按钮
        tabsHTML += `
            <button class="chat-new-tab"
                    onclick="window.aiChat && window.aiChat.createNewSession()"
                    style="
                        padding: 8px 12px;
                        background: var(--bg-secondary);
                        color: var(--text-primary);
                        border: 1px dashed var(--border-color);
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: bold;
                    ">+</button>
        `;

        tabsContainer.innerHTML = tabsHTML;
    }

    /**
     * 渲染聊天界面
     */
    renderChatUI() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            return;
        }

        // 仅在第一次初始化时创建结构（检查 ai-chat-container 是否存在）
        if (container.querySelector('.ai-chat-container')) {
            console.log('ℹ️ AI聊天UI已存在，跳过重复渲染');
            return;
        }

        container.innerHTML = `
            <div class="ai-chat-container" style="
                display: flex;
                flex-direction: column;
                height: 100%;
                width: 100%;
            ">
                <!-- 会话标签页 -->
                <div class="chat-session-tabs" style="
                    display: flex;
                    gap: 5px;
                    padding: 10px;
                    border-bottom: 1px solid var(--border-color);
                    overflow-x: auto;
                    background: var(--bg-primary);
                "></div>

                <!-- 消息显示区域 -->
                <div id="chatMessages" class="chat-messages" style="
                    flex: 1;
                    overflow-y: auto;
                    padding: 15px;
                    background: var(--bg-primary);
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                ">
                </div>

                <!-- 输入区域 (优化版) -->
                <div class="chat-input-container-v2" style="
                    border-top: 1px solid var(--border-color);
                    padding: 10px;
                    background: var(--bg-secondary);
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                ">
                    <!-- 快速操作按钮 -->
                    <div class="chat-quick-actions" style="
                        display: flex;
                        gap: 5px;
                        margin-bottom: 10px;
                        flex-wrap: wrap;
                    ">
                        <button class="quick-action-btn" onclick="window.aiChat && window.aiChat.continueLastConversation()" title="继续上次对话 (Cmd+Shift+C)">
                            ⬆️
                        </button>
                        <button class="quick-action-btn" onclick="window.aiChat && window.aiChat.insertQuickPrompt('解释这段代码')" title="解释代码">
                            💡
                        </button>
                        <button class="quick-action-btn" onclick="window.aiChat && window.aiChat.insertQuickPrompt('优化这段代码')" title="优化代码">
                            ⚡
                        </button>
                        <button class="quick-action-btn" onclick="window.aiChat && window.aiChat.insertQuickPrompt('找出这段代码的bug')" title="查找Bug">
                            🐛
                        </button>
                        <button class="quick-action-btn" onclick="window.aiChat && window.aiChat.insertQuickPrompt('为这段代码添加注释')" title="添加注释">
                            📝
                        </button>
                        <button class="quick-action-btn" onclick="window.aiChat && window.aiChat.insertQuickPrompt('将这段代码重构为更好的结构')" title="重构">
                            🔄
                        </button>
                    </div>

                    <!-- 拖拽提示区域 (优化版) -->
                    <div id="dropZone" class="drop-zone-v2" style="
                        display: none;
                        border: 2px dashed var(--border-color);
                        border-radius: 4px;
                        padding: 12px;
                        text-align: center;
                        background: var(--bg-primary);
                        color: var(--text-secondary);
                        font-size: 12px;
                        cursor: pointer;
                        transition: all 0.2s;
                        margin: 0 0 8px 0;
                    ">
                        📎 拖拽文件到这里
                    </div>

                    <!-- 附件列表区域 (紧凑卡片式) -->
                    <div id="attachmentsList" class="attachments-list-v2">
                    </div>

                    <!-- 输入框 + 工具栏 (新布局) -->
                    <div class="chat-input-row">
                        <textarea 
                            id="chatInput" 
                            class="chat-input-v2" 
                            placeholder="输入消息... (Shift+Enter 换行，Enter 发送)"
                            rows="3"
                        ></textarea>
                        
                        <!-- 工具栏图标组 (右侧) -->
                        <div class="input-toolbar-icons">
                            <!-- 附件按钮 -->
                            <button class="toolbar-icon-btn" 
                                    id="attachFileBtn"
                                    title="添加文件 (Cmd+Shift+A)"
                                    onclick="window.aiChat?.addAttachmentFromFile()">
                                📎
                            </button>
                            
                            <!-- 图片按钮 -->
                            <button class="toolbar-icon-btn" 
                                    id="attachImageBtn"
                                    title="添加图片 (Cmd+Shift+I)"
                                    onclick="window.aiChat?.addAttachmentFromImage()">
                                🖼️
                            </button>
                            
                            <!-- 附件计数徽章 -->
                            <span class="attachment-badge" id="attachmentBadge">
                                <span class="badge-count">0</span>
                            </span>
                            
                            <!-- 发送按钮 -->
                            <button id="chatSendBtn" class="chat-send-btn-v2" 
                                    onclick="window.aiChat?.sendMessage()">
                                📤
                        </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        console.log('✓ UI 结构创建完成');
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                // MVP-3.3 Phase 3: Ctrl+R 打开历史搜索
                if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                    e.preventDefault();
                    this.openHistorySearch();
                    return;
                }

                // MVP-3.3: 箭头键导航建议
                if (this.currentSuggestions.length > 0) {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        this.selectNextSuggestion();
                        return;
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        this.selectPreviousSuggestion();
                        return;
                    } else if (e.key === 'Enter' && this.suggestionsSelectedIndex >= 0) {
                        e.preventDefault();
                        const selectedCmd = this.currentSuggestions[this.suggestionsSelectedIndex];
                        if (selectedCmd) {
                            this.insertCommand(selectedCmd.name);
                        }
                        return;
                    } else if (e.key === 'Escape') {
                        this.hideCommandSuggestions();
                        return;
                    }
                }

                // MVP-3.3 Phase 3: 历史搜索中的导航
                if (this.historySearchVisible) {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        this.selectNextHistoryResult();
                        return;
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        this.selectPreviousHistoryResult();
                        return;
                    } else if (e.key === 'Enter' && this.historySearchIndex >= 0) {
                        e.preventDefault();
                        const selected = this.historySearchResults[this.historySearchIndex];
                        if (selected) {
                            this.selectHistoryItem(selected);
                        }
                        return;
                    } else if (e.key === 'Escape') {
                        this.closeHistorySearch();
                        return;
                    }
                }

                // 原有的 Enter 处理
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // 添加命令自动补全
            chatInput.addEventListener('input', (e) => {
                this.handleCommandAutocomplete(chatInput);
            });

            // 快捷键处理 (Phase 1.5)
            chatInput.addEventListener('keydown', (e) => {
                // Cmd/Ctrl + Shift + A: 快速添加文件
                if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'a') {
                    e.preventDefault();
                    this.addAttachmentFromFile();
                    return;
                }

                // Cmd/Ctrl + Shift + I: 快速添加图片
                if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'i') {
                    e.preventDefault();
                    this.addAttachmentFromImage();
                    return;
                }

                // Backspace: 删除最后一个附件 (仅当输入框为空时)
                if (e.key === 'Backspace' && chatInput === document.activeElement) {
                    if (window.attachmentManager && chatInput.value === '') {
                        const attachments = window.attachmentManager.getAttachments();
                        if (attachments.length > 0) {
                            const lastAttachment = attachments[attachments.length - 1];
                            this.removeAttachment(lastAttachment.id);
                            e.preventDefault();
                        }
                    }
                }
            });

            // 暴露 inputElement 供外部使用（例如文件管理器的右键菜单）
            this.inputElement = chatInput;
        }

        // 绑定拖拽事件
        this.bindDragDropEvents();
    }

    /**
     * 绑定拖拽事件 (优化版 v2)
     */
    bindDragDropEvents() {
        const chatContainer = document.querySelector('.ai-chat-container');
        const dropZone = document.getElementById('dropZone');

        if (!chatContainer || !dropZone) return;

        let dragCounter = 0;

        const handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-active');
            // 显示拖拽提示
            if (dropZone.style.display === 'none') {
                dropZone.style.display = 'block';
            }
        };

        const handleDragEnter = (e) => {
            e.preventDefault();
            dragCounter++;
        };

        const handleDragLeave = (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) {
                dropZone.classList.remove('drag-active');
                // 延迟隐藏，避免闪烁
                setTimeout(() => {
                    if (!dropZone.classList.contains('drag-active')) {
                        dropZone.style.display = 'none';
                    }
                }, 100);
            }
        };

        const handleDrop = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            dragCounter = 0;
            dropZone.classList.remove('drag-active');
            dropZone.style.display = 'none';

            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                await this.handleDroppedFiles(files);
            }
        };

        // 在聊天容器上添加拖拽事件
        chatContainer.addEventListener('dragover', handleDragOver);
        chatContainer.addEventListener('dragenter', handleDragEnter);
        chatContainer.addEventListener('dragleave', handleDragLeave);
        chatContainer.addEventListener('drop', handleDrop);

        // 在 dropZone 上也添加事件处理
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragenter', handleDragEnter);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
        
        // 点击 dropZone 打开文件选择
        dropZone.addEventListener('click', () => {
            this.addAttachmentFromFile();
        });
    }

    /**
     * 处理拖拽的文件
     */
    async handleDroppedFiles(files) {
        if (!window.attachmentManager) {
            console.warn('⚠️ 附件管理器未初始化');
            return;
        }

        let successCount = 0;

        for (let file of files) {
            try {
                // 注意：拖拽的文件对象在浏览器环境中同样没有 path 属性
                // 但它可能在 Electron 中有扩展的 path 属性
                // 我们尝试使用文件的 path 属性，如果没有就传递 null
                const filePath = file.path || null;
                
                const attachment = await window.attachmentManager.addAttachment(file, filePath);
                if (attachment) {
                    successCount++;
                }
            } catch (error) {
            }
        }

        this.updateAttachmentsList();
    }

    /**
     * 添加文件附件 - 使用 Electron 文件对话框
     */
    async addAttachmentFromFile() {
        if (!window.attachmentManager) {
            return;
        }

        const attachments = await window.attachmentManager.addAttachmentFromDialog('all');
        
        if (attachments.length > 0) {
            this.updateAttachmentsList();
            this.showNotification(`✅ 已添加 ${attachments.length} 个文件`);
        }
    }

    /**
     * 从图片选择器添加附件 - 使用 Electron 文件对话框
     */
    async addAttachmentFromImage() {
        if (!window.attachmentManager) {
            return;
        }

        const attachments = await window.attachmentManager.addAttachmentFromDialog('image');
        
        if (attachments.length > 0) {
            this.updateAttachmentsList();
            this.showNotification(`✅ 已添加 ${attachments.length} 个图片`);
        }
    }

    /**
     * 更新附件列表显示 (优化版 v2)
     */
    updateAttachmentsList() {
        if (!window.attachmentManager) return;

        const attachmentsList = document.getElementById('attachmentsList');
        const attachmentBadge = document.getElementById('attachmentBadge');
        const attachments = window.attachmentManager.getAttachments();

        if (!attachmentsList) return;

        const count = attachments.length;

        // 更新徽章
        if (attachmentBadge) {
            const badgeCount = attachmentBadge.querySelector('.badge-count');
            if (badgeCount) {
                badgeCount.textContent = count;
            }
            if (count > 0) {
                attachmentBadge.classList.add('active');
            } else {
                attachmentBadge.classList.remove('active');
            }
        }

        // 更新列表
        if (count === 0) {
            attachmentsList.innerHTML = '';
        } else {
            // 生成紧凑附件卡片
            attachmentsList.innerHTML = attachments.map(att => `
                <div class="attachment-card-v2" 
                     title="${att.name} - ${AttachmentManager.formatFileSize(att.size)}">
                    <span class="attachment-icon-v2">
                        ${this.getAttachmentIcon(att.type)}
                    </span>
                    <span class="attachment-name-v2">
                        ${att.name}
                    </span>
                    <span class="attachment-size-v2">
                        (${AttachmentManager.formatFileSize(att.size)})
                    </span>
                    <button class="attachment-remove-v2"
                            onclick="window.aiChat?.removeAttachment('${att.id}')">
                        ✕
                    </button>
                </div>
            `).join('');
        }
    }

    /**
     * 获取附件图标
     */
    getAttachmentIcon(type) {
        switch(type) {
            case 'image': return '🖼️';
            case 'text': return '📝';
            default: return '📄';
        }
    }

    /**
     * 删除附件
     */
    removeAttachment(attachmentId) {
        if (!window.attachmentManager) return;
        
        const attachment = window.attachmentManager.getAttachmentInfo(attachmentId);
        if (attachment) {
            window.attachmentManager.removeAttachment(attachmentId);
            this.updateAttachmentsList();
        }
    }

    /**
     * 选择下一个建议 (↓)
     */
    selectNextSuggestion() {
        if (this.currentSuggestions.length === 0) return;
        
        this.suggestionsSelectedIndex = (this.suggestionsSelectedIndex + 1) % this.currentSuggestions.length;
        this.updateSuggestionsHighlight();
    }

    /**
     * 选择上一个建议 (↑)
     */
    selectPreviousSuggestion() {
        if (this.currentSuggestions.length === 0) return;
        
        this.suggestionsSelectedIndex = this.suggestionsSelectedIndex <= 0 
            ? this.currentSuggestions.length - 1 
            : this.suggestionsSelectedIndex - 1;
        this.updateSuggestionsHighlight();
    }

    /**
     * 更新建议列表的高亮状态
     */
    updateSuggestionsHighlight() {
        const items = document.querySelectorAll('#commandSuggestions > div[data-index]');
        items.forEach((item, index) => {
            if (index === this.suggestionsSelectedIndex) {
                item.style.background = 'var(--accent)';
                item.style.color = 'white';
                item.querySelector('span:first-child').style.color = 'white';
                item.querySelector('span:last-child').style.color = 'rgba(255,255,255,0.8)';
            } else {
                item.style.background = 'transparent';
                item.style.color = 'var(--text-primary)';
                item.querySelector('span:first-child').style.color = 'var(--accent)';
                item.querySelector('span:last-child').style.color = 'var(--text-secondary)';
            }
        });
    }

    /**
     * 处理命令自动补全
     */
    handleCommandAutocomplete(input) {
        const value = input.value;
        const cursorPos = input.selectionStart;
        
        // 检查光标前是否为斜杠命令
        const beforeCursor = value.substring(0, cursorPos);
        const lastSlashIndex = beforeCursor.lastIndexOf('/');
        
        if (lastSlashIndex === -1) {
            this.hideCommandSuggestions();
            return;
        }

        const inputAfterSlash = beforeCursor.substring(lastSlashIndex);
        
        // MVP-3.3 Phase 2: 识别当前参数位置
        const paramInfo = this.commandParser?.identifyParameterPosition(inputAfterSlash);
        
        if (!paramInfo || paramInfo.paramIndex < 0) {
            // 仍然在命令名阶段，显示命令建议
            const prefix = inputAfterSlash.substring(1).toLowerCase();
            
            if (prefix.length === 0) {
                this.hideCommandSuggestions();
                return;
            }

            const commands = this.commandRegistry?.getAll() || [];
            const matches = commands.filter(cmd => cmd.name.startsWith(prefix));

            if (matches.length > 0) {
                this.showCommandSuggestions(matches, 'command');
            } else {
                this.hideCommandSuggestions();
            }
        } else {
            // MVP-3.3 Phase 2: 在参数阶段，显示参数建议
            const command = paramInfo.command;
            const paramIndex = paramInfo.paramIndex;
            const partial = paramInfo.partialParam;
            
            const cmd = this.commandRegistry?.getCommand(command);
            if (!cmd || !cmd.paramDefinitions || cmd.paramDefinitions.length === 0) {
                this.hideCommandSuggestions();
                return;
            }
            
            // 获取该参数位置的定义
            if (paramIndex >= cmd.paramDefinitions.length) {
                this.hideCommandSuggestions();
                return;
            }
            
            const paramDef = cmd.paramDefinitions[paramIndex];
            if (!paramDef || !paramDef.values || paramDef.values.length === 0) {
                this.hideCommandSuggestions();
                return;
            }
            
            // 获取匹配的参数值
            const matches = this.commandParser?.getParameterSuggestions(
                command,
                paramIndex,
                partial,
                paramDef.values
            ) || [];
            
            if (matches.length > 0) {
                this.showCommandSuggestions(matches, 'parameter', {
                    command: command,
                    paramIndex: paramIndex,
                    paramName: paramDef.name
                });
            } else {
                this.hideCommandSuggestions();
            }
        }
    }

    /**
     * 显示命令建议 (支持命令和参数)
     * MVP-3.3 Phase 2: 支持参数建议
     */
    showCommandSuggestions(matches, type = 'command', context = {}) {
        this.hideCommandSuggestions();

        // MVP-3.3: 保存当前建议列表和重置选中索引
        this.currentSuggestions = matches.slice(0, 10);
        this.suggestionsSelectedIndex = -1;
        this.suggestionsType = type;  // 记录建议类型
        this.suggestionsContext = context;  // 保存上下文信息

        const suggestions = document.createElement('div');
        suggestions.id = 'commandSuggestions';
        suggestions.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 0;
            right: 0;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-bottom: none;
            border-radius: 4px 4px 0 0;
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            box-shadow: 0 -2px 8px rgba(0,0,0,0.15);
        `;

        // MVP-3.3 Phase 2: 根据建议类型显示不同的格式
        if (type === 'command') {
            // 显示命令建议
            this.currentSuggestions.forEach((cmd, index) => {
                const item = document.createElement('div');
                item.setAttribute('data-index', index);
                item.style.cssText = `
                    padding: 8px 12px;
                    cursor: pointer;
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: background 0.2s;
                    font-size: 13px;
                `;
                
                item.innerHTML = `
                    <span style="font-weight: bold; color: var(--accent);">/${cmd.name}</span>
                    <span style="color: var(--text-secondary); font-size: 12px; margin-left: 10px;">${cmd.description}</span>
                `;

                item.onmouseover = () => {
                    this.suggestionsSelectedIndex = index;
                    this.updateSuggestionsHighlight();
                };

                item.onclick = () => this.insertCommand(cmd.name);
                suggestions.appendChild(item);
            });
        } else if (type === 'parameter') {
            // 显示参数建议
            const paramName = context.paramName || '参数';
            const header = document.createElement('div');
            header.style.cssText = `
                padding: 6px 12px;
                background: var(--bg-primary);
                color: var(--text-secondary);
                font-size: 11px;
                border-bottom: 1px solid var(--border-color);
                font-weight: bold;
                text-transform: uppercase;
            `;
            header.textContent = `📌 ${paramName}:`;
            suggestions.appendChild(header);

            this.currentSuggestions.forEach((value, index) => {
                const item = document.createElement('div');
                item.setAttribute('data-index', index);
                item.style.cssText = `
                    padding: 8px 12px;
                    cursor: pointer;
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    transition: background 0.2s;
                    font-size: 13px;
                `;
                
                item.innerHTML = `
                    <span style="font-weight: bold; color: var(--accent);">${value}</span>
                `;

                item.onmouseover = () => {
                    this.suggestionsSelectedIndex = index;
                    this.updateSuggestionsHighlight();
                };

                item.onclick = () => this.insertParameter(value, context);
                suggestions.appendChild(item);
            });
        }

        const wrapper = document.querySelector('.chat-input-wrapper');
        if (wrapper) {
            wrapper.style.position = 'relative';
            wrapper.appendChild(suggestions);
        }
    }

    /**
     * 隐藏命令建议
     */
    hideCommandSuggestions() {
        const suggestions = document.getElementById('commandSuggestions');
        if (suggestions) suggestions.remove();
        
        // MVP-3.3: 重置状态
        this.suggestionsSelectedIndex = -1;
        this.currentSuggestions = [];
    }

    /**
     * 插入命令
     */
    insertCommand(cmdName) {
        const input = document.getElementById('chatInput');
        if (!input) return;

        const value = input.value;
        const cursorPos = input.selectionStart;
        const beforeCursor = value.substring(0, cursorPos);
        const lastSlashIndex = beforeCursor.lastIndexOf('/');

        if (lastSlashIndex !== -1) {
            const before = value.substring(0, lastSlashIndex);
            const after = value.substring(cursorPos);
            input.value = `${before}/${cmdName} ${after}`;
            
            const newPos = `${before}/${cmdName} `.length;
            input.setSelectionRange(newPos, newPos);
            input.focus();
            
            this.hideCommandSuggestions();
        }
    }

    /**
     * MVP-3.3 Phase 2: 插入参数值
     */
    insertParameter(paramValue, context) {
        const input = document.getElementById('chatInput');
        if (!input) return;

        const value = input.value;
        const cursorPos = input.selectionStart;
        const beforeCursor = value.substring(0, cursorPos);
        
        // 找到最后一个斜杠
        const lastSlashIndex = beforeCursor.lastIndexOf('/');
        if (lastSlashIndex === -1) return;

        const inputAfterSlash = beforeCursor.substring(lastSlashIndex);
        const paramInfo = this.commandParser?.identifyParameterPosition(inputAfterSlash);
        
        if (!paramInfo) return;

        // 获取命令和参数部分
        const beforeCommand = value.substring(0, lastSlashIndex);
        const after = value.substring(cursorPos);
        
        // 重建命令部分（替换当前参数）
        const parts = inputAfterSlash.substring(1).split(/\s+/);
        
        if (paramInfo.paramIndex < 0) {
            // 参数索引无效
            return;
        }

        // 重建命令：保留命令名和前面的参数，替换当前参数
        const newParts = parts.slice(0, paramInfo.paramIndex + 1);
        newParts[paramInfo.paramIndex] = paramValue;
        
        const newCommand = '/' + newParts.join(' ');
        input.value = beforeCommand + newCommand + ' ' + after;
        
        const newPos = (beforeCommand + newCommand + ' ').length;
        input.setSelectionRange(newPos, newPos);
        input.focus();
        
        this.hideCommandSuggestions();
        
        // 触发自动补全，显示下一个参数（如果有的话）
        setTimeout(() => this.handleCommandAutocomplete(input), 50);
    }

    /**
     * 刷新消息显示 - 在切换会话时使用
     */
    refreshMessagesDisplay() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) {
            return;
        }

        
        // 清空容器
        messagesContainer.innerHTML = '';
        
        // 重新添加所有消息
        if (this.messages.length > 0) {
            this.messages.forEach((msg, index) => {
                this.addMessageToDOM(msg.role, msg.content);
            });
        } else {
            // 没有消息时显示欢迎信息
            console.log('ℹ️ 没有消息，显示欢迎信息');
            this.addMessageToDOM('assistant', this.getWelcomeMessage());
        }
        
        // 滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * 添加消息到 DOM
     */
    addMessageToDOM(role, content) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        // 检查是否需要使用 Markdown 渲染
        let renderedContent = content;
        if (window.markdownRenderer && window.markdownRenderer.isMarkdown(content)) {
            renderedContent = window.markdownRenderer.render(content);
            messageDiv.innerHTML = `
                <div class="message-content markdown-content">
                    ${renderedContent}
                </div>
            `;
        } else {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${this.escapeHtml(content)}</div>
            </div>
        `;
        }
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * 添加消息到聊天窗口并保存
     */
    addMessage(role, content) {
        this.addMessageToDOM(role, content);
        
        // 添加到消息列表
        this.messages.push({ role, content });
        
        // 保存到当前会话
        const current = this.getCurrentSession();
        if (current) {
            current.messages = this.messages;
            current.updatedAt = Date.now();
            // 异步保存，但不阻塞 UI
            this.saveSessions().catch(e => console.error('❌ 保存会话出错:', e));
        }
    }

    /**
     * 发送消息
     */
    async sendMessage() {
        const chatInput = document.getElementById('chatInput');
        const chatSendBtn = document.getElementById('chatSendBtn');
        
        if (!chatInput || this.isProcessing) return;

        const message = chatInput.value.trim();
        if (!message) return;

        // Phase 3: 检查是否为斜杠命令
        if (this.commandParser && this.commandExecutor) {
            const parsed = this.commandParser.parse(message);
            
            if (parsed.isCommand) {
                
                // 添加用户消息到聊天框
                this.addMessage('user', message);
        chatInput.value = '';
                chatInput.style.height = 'auto';

                // 执行命令
                this.isProcessing = true;
                if (chatSendBtn) {
                    chatSendBtn.disabled = true;
                    chatSendBtn.innerHTML = '<span class="loading-spinner">⏳</span> 执行中...';
                }

                try {
                    const result = await this.commandExecutor.execute(parsed.command, parsed.args);
                    
                    // 显示命令执行结果（使用系统消息样式）
                    this.addMessage('system', result.message);
                    
                } catch (error) {
                    this.addMessage('system', `❌ 命令执行出错: ${error.message}`);
                } finally {
                    this.isProcessing = false;
                    if (chatSendBtn) {
                        chatSendBtn.disabled = false;
                        chatSendBtn.innerHTML = '<span class="send-icon">📤</span><span class="send-text">发送</span>';
                    }
                    chatInput.focus();
                }
                return;
            }
        }

        // 正常的 AI 消息发送
        this.addMessage('user', message);
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // 禁用发送按钮，显示加载状态
        this.isProcessing = true;
        if (chatSendBtn) {
            chatSendBtn.disabled = true;
            chatSendBtn.innerHTML = '<span class="loading-spinner">⏳</span> 思考中...';
        }

        try {
            // Phase 3: 获取并处理附件
            const attachments = window.attachmentManager?.getAttachments() || [];
            let processedAttachments = [];
            let finalMessage = message;

            if (attachments.length > 0) {
                
                // 处理附件
                if (typeof AttachmentProcessor !== 'undefined') {
                    const processor = new AttachmentProcessor();
                    const processed = await processor.processMultiple(attachments);
                    
                    if (processed.successful.length > 0) {
                        processedAttachments = processed.successful;
                        console.log(`✓ 成功处理 ${processed.successful.length} 个附件`);
                    }
                    
                    if (processed.failed.length > 0) {
                        console.warn(`⚠️ ${processed.failed.length} 个附件处理失败:`, processed.failed);
                    }
                } else {
                    console.warn('⚠️ AttachmentProcessor 未加载');
                }

                // 构建包含附件的消息 (作为字符串，因为 Claude CLI 期望字符串)
                if (processedAttachments.length > 0) {
                    // 对于图片，需要包含文件路径供 Claude CLI 处理
                    // Claude CLI 会自动识别和处理图片文件
                    const attachmentInfo = processedAttachments.map(att => {
                        // 获取 Claude 能访问的路径
                        const accessiblePath = window.attachmentManager?.getAccessiblePath?.(att.path) || att.path;
                        
                        // 对于图片类型，直接包含文件路径
                        if (att.type === 'image') {
                            return `\n文件: ${accessiblePath}`;
                        } else {
                            return `【${att.type.toUpperCase()}】${att.name} (${att.formattedSize}): ${accessiblePath}`;
                        }
                    }).join('\n');
                    
                    // 将附件信息添加到消息中（作为文本）
                    // Claude CLI 会识别文件路径并自动处理
                    finalMessage = `${message}${attachmentInfo}`;
                }
            }

            // 发送到Claude API (必须是字符串)
            if (window.electronAPI && window.electronAPI.claude && window.electronAPI.claude.sendMessage) {
                const result = await window.electronAPI.claude.sendMessage(finalMessage);
                
                if (result && result.success) {
                    console.log('✓ 收到 AI 回复');
                    this.addMessage('assistant', result.response);
                    
                    // 清除附件
                    if (attachments.length > 0) {
                        window.attachmentManager.clearAttachments();
                        this.updateAttachmentsList();
                        console.log('✓ 附件已清除');
                    }
                } else if (result && result.error) {
                    this.addMessage('assistant', `❌ 抱歉，出现错误：${result.error}`);
                } else {
                    console.log('✓ 收到 AI 回复');
                    this.addMessage('assistant', result || '✓ 已处理您的请求');
                    
                    // 清除附件
                    if (attachments.length > 0) {
                        window.attachmentManager.clearAttachments();
                        this.updateAttachmentsList();
                        console.log('✓ 附件已清除');
                    }
                }
            } else {
                console.warn('⚠️ electronAPI.claude.sendMessage 未定义');
                console.log('可用的 API:', Object.keys(window.electronAPI || {}));
                this.addMessage('assistant', '❌ AI服务暂时不可用，请检查Claude CLI是否正确配置。');
            }
        } catch (error) {
            this.addMessage('assistant', `❌ 发送失败：${error.message}`);
        } finally {
            // 恢复发送按钮
            this.isProcessing = false;
            if (chatSendBtn) {
                chatSendBtn.disabled = false;
                chatSendBtn.innerHTML = '<span class="send-icon">📤</span><span class="send-text">发送</span>';
            }
            chatInput.focus();
        }
    }

    /**
     * 继续上次对话
     */
    continueLastConversation() {
        if (!window.chatHistoryManager) {
            this.showNotification('❌ 聊天历史管理器未初始化');
            return;
        }

        try {
            const lastConv = window.chatHistoryManager.getLastConversation();
            if (lastConv) {
                this.messages = lastConv.messages || [];
                // 刷新聊天窗口
                this.renderChatUI();
                this.bindEvents();
                this.showNotification('✓ 已恢复上次对话');
            } else {
                this.showNotification('⚠️ 没有历史对话');
            }
        } catch (error) {
            this.showNotification('❌ 恢复失败');
        }
    }

    /**
     * 切换会话列表显示
     */
    toggleSessionList() {
        const sessionListContainer = document.getElementById('session-list-panel');
        
        if (!sessionListContainer) {
            this.showNotification('❌ 会话列表面板未找到');
            return;
        }

        this.sessionListVisible = !this.sessionListVisible;

        if (this.sessionListVisible) {
            // 显示会话列表
            sessionListContainer.style.display = 'block';
            
            // 渲染当前会话列表
            this.renderCurrentSessionsList();
        } else {
            // 隐藏会话列表
            sessionListContainer.style.display = 'none';
        }
    }

    /**
     * 渲染当前会话列表
     */
    renderCurrentSessionsList() {
        const container = document.getElementById('session-list-content');
        if (!container) {
            return;
        }


        let html = `
            <div style="padding: 10px; height: 100%; display: flex; flex-direction: column;">
                <div style="margin-bottom: 10px; font-weight: bold; font-size: 14px;">
                    📋 会话管理 (${Object.keys(this.sessions).length})
                </div>
        `;

        // 遍历所有会话
        this.sessionOrder.forEach(sessionId => {
            const session = this.sessions[sessionId];
            if (!session) return;

            const isActive = sessionId === this.currentSessionId;
            const messageCount = session.messages ? session.messages.length : 0;
            const createdDate = new Date(session.createdAt).toLocaleDateString('zh-CN');

            html += `
                <div class="session-item" style="
                    padding: 10px;
                    margin-bottom: 8px;
                    background: ${isActive ? 'var(--accent)' : 'var(--bg-primary)'};
                    color: ${isActive ? 'white' : 'var(--text-primary)'};
                    border-radius: 4px;
                    border: 1px solid ${isActive ? 'var(--accent)' : 'var(--border-color)'};
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                " onclick="window.aiChat && window.aiChat.switchSession('${sessionId}')"
                   onmouseover="this.style.opacity='0.8'"
                   onmouseout="this.style.opacity='1'">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; margin-bottom: 4px;">
                            ${session.title}
                            ${isActive ? ' ✓' : ''}
                        </div>
                        <div style="font-size: 12px; opacity: 0.8;">
                            💬 ${messageCount} 条消息 | 📅 ${createdDate}
                        </div>
                    </div>
                    <button onclick="event.stopPropagation(); window.aiChat && window.aiChat.deleteSession('${sessionId}')"
                            style="
                                background: none;
                                border: none;
                                color: inherit;
                                cursor: pointer;
                                font-size: 16px;
                                padding: 0;
                                margin-left: 8px;
                            " title="删除">✕</button>
                </div>
            `;
        });

        html += `
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * 处理会话选中
     */
    onSessionSelected(session) {
        if (!session) {
            // 新建对话
            this.createNewSession();
        } else {
            // 加载选中的会话
            this.switchSession(session.id);
        }
    }

    /**
     * 插入快速提示
     */
    insertQuickPrompt(prompt) {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.value = prompt;
            chatInput.focus();
        }
    }

    /**
     * 显示通知
     */
    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${message.includes('❌') ? '#ef4444' : message.includes('⚠️') ? '#f59e0b' : '#4ade80'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10001;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * MVP-3.3 Phase 3: 打开历史搜索对话框
     */
    openHistorySearch() {
        const input = document.getElementById('chatInput');
        if (!input) return;

        this.historySearchVisible = true;
        this.historySearchQuery = '';
        this.historySearchResults = [];
        this.historySearchIndex = -1;

        this.showHistorySearchDialog();
        
        // 聚焦搜索框
        setTimeout(() => {
            const searchInput = document.getElementById('historySearchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }, 100);
    }

    /**
     * MVP-3.3 Phase 3: 关闭历史搜索对话框
     */
    closeHistorySearch() {
        this.historySearchVisible = false;
        const dialog = document.getElementById('historySearchDialog');
        if (dialog) {
            dialog.remove();
        }
        
        // 返回焦点到输入框
        const input = document.getElementById('chatInput');
        if (input) {
            input.focus();
        }
    }

    /**
     * MVP-3.3 Phase 3: 显示历史搜索对话框 (Day 2: 优化版本)
     */
    showHistorySearchDialog() {
        // 关闭任何存在的对话框
        const existing = document.getElementById('historySearchDialog');
        if (existing) {
            existing.remove();
        }

        const container = document.querySelector('.chat-container');
        if (!container) return;

        // 检测操作系统以显示正确的快捷键
        const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
        const shortcutKey = isMac ? 'Cmd+R' : 'Ctrl+R';

        const dialog = document.createElement('div');
        dialog.id = 'historySearchDialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 20px;
            width: 600px;
            max-height: 500px;
            z-index: 10000;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            display: flex;
            flex-direction: column;
            animation: slideIn 0.3s ease;
        `;

        dialog.innerHTML = `
            <style>
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -45%);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%);
                    }
                }
            </style>
            
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            ">
                <div>
                    <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">
                        🔍 命令历史搜索
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary);">
                        提示: ↑↓ 导航，Enter 选择，Esc 关闭 (${shortcutKey} 打开)
                    </div>
                </div>
            </div>
            
            <div style="
                position: relative;
                margin-bottom: 15px;
            ">
                <input 
                    id="historySearchInput"
                    type="text" 
                    placeholder="输入命令关键词搜索..."
                    style="
                        width: 100%;
                        padding: 10px 36px 10px 12px;
                        border: 1px solid var(--border-color);
                        border-radius: 4px;
                        background: var(--bg-primary);
                        color: var(--text-primary);
                        font-size: 14px;
                        outline: none;
                        box-sizing: border-box;
                    "
                />
                <button 
                    id="clearSearchBtn"
                    style="
                        position: absolute;
                        right: 10px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: none;
                        border: none;
                        cursor: pointer;
                        color: var(--text-secondary);
                        font-size: 14px;
                        padding: 4px 8px;
                        opacity: 0;
                        transition: opacity 0.2s;
                    "
                    title="清空搜索"
                >✕</button>
            </div>
            
            <div id="historySearchResultsHeader" style="
                padding: 8px 12px;
                font-size: 12px;
                color: var(--text-secondary);
                border-bottom: 1px solid var(--border-color);
                margin-bottom: 8px;
            ">
                最近命令 (0 条)
            </div>
            
            <div id="historySearchResults" style="
                flex: 1;
                overflow-y: auto;
                border-radius: 4px;
                background: var(--bg-primary);
            "></div>
        `;

        document.body.appendChild(dialog);

        // 绑定搜索输入事件
        const searchInput = document.getElementById('historySearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.historySearchQuery = e.target.value;
                this.updateHistorySearchResults();
                
                // 显示/隐藏清空按钮
                const clearBtn = document.getElementById('clearSearchBtn');
                if (clearBtn) {
                    clearBtn.style.opacity = e.target.value ? '1' : '0';
                    clearBtn.style.pointerEvents = e.target.value ? 'auto' : 'none';
                }
            });
        }

        // 绑定清空按钮
        const clearBtn = document.getElementById('clearSearchBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                searchInput.value = '';
                this.historySearchQuery = '';
                this.updateHistorySearchResults();
                clearBtn.style.opacity = '0';
                clearBtn.style.pointerEvents = 'none';
                searchInput.focus();
            });
        }

        // 初始化搜索结果
        this.updateHistorySearchResults();
    }

    /**
     * MVP-3.3 Phase 3: 更新历史搜索结果 (Day 2: 改进版本)
     */
    updateHistorySearchResults() {
        if (!this.commandExecutor) {
            return;
        }

        // 获取搜索结果
        let results = [];
        if (this.historySearchQuery.trim()) {
            results = this.commandExecutor.searchHistory(this.historySearchQuery);
        } else {
            // 如果查询为空，显示最近的 20 条
            results = this.commandExecutor.getHistory().slice(-20).reverse();
        }

        this.historySearchResults = results;
        this.historySearchIndex = -1;  // 重置选中索引

        // 更新结果计数显示
        const headerElement = document.getElementById('historySearchResultsHeader');
        if (headerElement) {
            const headerText = this.historySearchQuery.trim()
                ? `搜索结果 (${results.length} 条)`
                : `最近命令 (${Math.min(results.length, 20)} 条)`;
            headerElement.textContent = headerText;
        }

        // 更新显示
        const resultsContainer = document.getElementById('historySearchResults');
        if (!resultsContainer) return;

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div style="
                    padding: 30px 20px;
                    text-align: center;
                    color: var(--text-secondary);
                ">
                    <div style="font-size: 32px; margin-bottom: 8px;">📭</div>
                    <div style="font-weight: 500; margin-bottom: 4px;">没有搜索结果</div>
                    <div style="font-size: 12px; opacity: 0.7;">
                        ${this.historySearchQuery.trim() 
                            ? '尝试其他关键词' 
                            : '还没有执行过命令'}
                    </div>
                </div>
            `;
            return;
        }

        let html = '';
        results.slice(0, 15).forEach((item, index) => {  // Day 2: 最多显示 15 条
            const timestamp = new Date(item.timestamp);
            const timeStr = this.formatTimeAgo(timestamp);
            const isSuccess = item.result?.success;
            const statusIcon = isSuccess ? '✓' : '✕';
            const statusColor = isSuccess ? '#10b981' : '#ef4444';
            
            // 格式化命令显示（包含参数）
            const commandDisplay = item.args && item.args.length > 0
                ? `/${item.command} ${item.args.join(' ')}`
                : `/${item.command}`;

            html += `
                <div 
                    data-index="${index}"
                    style="
                        padding: 12px 12px;
                        border-bottom: 1px solid var(--border-color);
                        cursor: pointer;
                        transition: background 0.2s;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    "
                    onmouseover="this.style.background = 'var(--accent)'; this.style.color = 'white';"
                    onmouseout="this.style.background = 'transparent'; this.style.color = 'var(--text-primary)';"
                    onclick="window.aiChat && window.aiChat.selectHistoryItem(window.aiChat.historySearchResults[${index}])"
                >
                    <div style="flex: 1; min-width: 0;">
                        <div style="
                            font-family: monospace; 
                            font-size: 13px; 
                            margin-bottom: 4px;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        ">
                            ${commandDisplay}
                        </div>
                        <div style="font-size: 12px; opacity: 0.7;">
                            ${timeStr}
                        </div>
                    </div>
                    <div style="
                        color: ${statusColor};
                        font-size: 14px;
                        margin-left: 10px;
                        flex-shrink: 0;
                    ">
                        ${statusIcon}
                    </div>
                </div>
            `;
        });

        resultsContainer.innerHTML = html;
    }

    /**
     * MVP-3.3 Phase 3: 格式化时间为相对时间（几分钟前等）
     */
    formatTimeAgo(date) {
        const now = new Date();
        const secondsAgo = Math.floor((now - date) / 1000);

        if (secondsAgo < 60) return '刚刚';
        if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}分钟前`;
        if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}小时前`;
        if (secondsAgo < 604800) return `${Math.floor(secondsAgo / 86400)}天前`;
        
        return date.toLocaleDateString();
    }

    /**
     * MVP-3.3 Phase 3: 选择下一个搜索结果
     */
    selectNextHistoryResult() {
        if (this.historySearchResults.length === 0) return;
        
        this.historySearchIndex = (this.historySearchIndex + 1) % this.historySearchResults.length;
        this.updateHistoryResultsHighlight();
    }

    /**
     * MVP-3.3 Phase 3: 选择上一个搜索结果
     */
    selectPreviousHistoryResult() {
        if (this.historySearchResults.length === 0) return;
        
        this.historySearchIndex = this.historySearchIndex <= 0 
            ? this.historySearchResults.length - 1 
            : this.historySearchIndex - 1;
        this.updateHistoryResultsHighlight();
    }

    /**
     * MVP-3.3 Phase 3: 更新搜索结果的高亮状态
     */
    updateHistoryResultsHighlight() {
        const items = document.querySelectorAll('#historySearchResults > div[data-index]');
        items.forEach((item, index) => {
            if (index === this.historySearchIndex) {
                item.style.background = 'var(--accent)';
                item.style.color = 'white';
            } else {
                item.style.background = 'transparent';
                item.style.color = 'var(--text-primary)';
            }
        });
    }

    /**
     * MVP-3.3 Phase 3: 选择历史项
     */
    selectHistoryItem(historyItem) {
        if (!historyItem) return;

        const input = document.getElementById('chatInput');
        if (!input) return;

        // 重新构建命令字符串
        let commandStr = `/${historyItem.command}`;
        if (historyItem.args && historyItem.args.length > 0) {
            commandStr += ' ' + historyItem.args.join(' ');
        }

        // 填充到输入框
        input.value = commandStr + ' ';
        
        // 关闭搜索对话框
        this.closeHistorySearch();
        
        // 聚焦输入框
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
        
        console.log(`✓ 选中历史项: ${commandStr}`);
    }

    /**
     * HTML 转义
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIChatComponent;
}
