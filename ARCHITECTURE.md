# Claude Studio - 架构设计文档

## 🎯 设计目标

基于对 Cursor IDE 和现代低代码平台的分析，Claude Studio 的核心目标是：

1. **AI-First**：让 AI 成为编程的第一生产力，而不是辅助工具
2. **零学习成本**：通过自然语言交互，降低编程门槛
3. **专业级体验**：提供完整的 IDE 功能，满足专业开发者需求
4. **高效协作**：人与 AI 的高效协作模式

---

## 📊 Cursor IDE 核心功能分析

### 1. **主要特性**
- ✅ 代码编辑器（Monaco Editor）
- ✅ AI 内联编辑（Cmd+K）
- ✅ AI 聊天面板（Cmd+L）
- ✅ 智能代码补全（Tab）
- ✅ 文件管理（侧边栏）
- ✅ 集成终端
- ✅ Git 集成
- ✅ 命令面板（Cmd+Shift+P）
- ✅ 快速文件切换（Cmd+P）

### 2. **AI 交互模式**

#### A. 内联编辑模式（Cmd+K）
```
用户在编辑器中选中代码 → 按 Cmd+K → 输入指令 → AI 生成建议 → 用户选择接受/拒绝
```

**优势**：
- 不打断编辑流程
- 精准定位修改范围
- 即时预览效果

#### B. 聊天模式（Cmd+L）
```
用户描述需求 → AI 理解上下文 → 生成代码/解释 → 用户确认应用
```

**优势**：
- 适合复杂需求讨论
- 可以多轮对话
- 保留对话历史

#### C. 代码补全模式（Tab）
```
用户输入代码 → AI 预测下一步 → 用户按 Tab 接受
```

**优势**：
- 无感知辅助
- 提高编码速度
- 学习用户习惯

### 3. **低代码平台的启发**

参考 Bolt.new、v0.dev 等平台：

- **即时反馈**：实时预览生成的代码效果
- **组件化思维**：将复杂功能拆分为可复用组件
- **声明式编程**：描述"要什么"而非"怎么做"
- **模板系统**：预设常用场景模板

---

## 🏗️ Claude Studio 新架构

### 1. **整体架构**

```
┌─────────────────────────────────────────────────────┐
│                   Electron 主进程                     │
│  ┌────────────┬─────────────┬──────────────────┐   │
│  │ 窗口管理    │  IPC 通信    │  系统集成        │   │
│  └────────────┴─────────────┴──────────────────┘   │
└─────────────────────────────────────────────────────┘
                        ↕ IPC
┌─────────────────────────────────────────────────────┐
│                   渲染进程（UI）                      │
│  ┌──────────────────────────────────────────────┐  │
│  │          应用层（App Layer）                  │  │
│  │  ┌────────┬────────┬────────┬─────────────┐ │  │
│  │  │ 编辑器  │ AI面板  │ 文件树  │   终端      │ │  │
│  │  └────────┴────────┴────────┴─────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │        服务层（Service Layer）                │  │
│  │  ┌────────┬────────┬────────┬─────────────┐ │  │
│  │  │ Claude │ 文件系统│  Git   │   配置管理  │ │  │
│  │  └────────┴────────┴────────┴─────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │         工具层（Utils Layer）                 │  │
│  │  ┌────────┬────────┬────────┬─────────────┐ │  │
│  │  │ 快捷键  │ 主题    │ 存储    │   事件总线  │ │  │
│  │  └────────┴────────┴────────┴─────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 2. **模块设计**

#### A. 编辑器模块（Editor Module）

```javascript
// src/modules/editor/EditorManager.js
class EditorManager {
  constructor() {
    this.monaco = null;
    this.activeEditor = null;
    this.editors = new Map(); // 多标签页支持
  }

  // 创建编辑器实例
  createEditor(container, options) {}

  // 获取当前选中的代码
  getSelection() {}

  // 应用 AI 建议
  applyAISuggestion(range, newText) {}

  // 显示内联编辑框
  showInlineEditor(position) {}
}
```

#### B. AI 交互模块（AI Module）

```javascript
// src/modules/ai/AIService.js
class AIService {
  constructor() {
    this.claudeAPI = new ClaudeAPI();
    this.context = new ContextManager();
  }

  // 内联编辑
  async inlineEdit(selection, instruction) {
    const context = await this.context.gather();
    return await this.claudeAPI.edit(selection, instruction, context);
  }

  // 聊天对话
  async chat(message, conversationId) {
    return await this.claudeAPI.chat(message, conversationId);
  }

  // 代码补全
  async autocomplete(prefix, suffix) {
    return await this.claudeAPI.complete(prefix, suffix);
  }

  // 代码解释
  async explain(code) {
    return await this.claudeAPI.explain(code);
  }
}
```

#### C. 文件管理模块（File Module）

```javascript
// src/modules/files/FileManager.js
class FileManager {
  constructor() {
    this.currentProject = null;
    this.fileTree = null;
    this.watcher = null;
  }

  // 打开项目
  async openProject(path) {}

  // 文件树渲染
  renderTree(data) {}

  // 文件搜索
  async search(query) {}

  // 快速打开
  showQuickOpen() {}

  // 监听文件变化
  watchFiles() {}
}
```

#### D. 终端模块（Terminal Module）

```javascript
// src/modules/terminal/TerminalManager.js
class TerminalManager {
  constructor() {
    this.xterm = null;
    this.pty = null;
  }

  // 创建终端
  create(container) {}

  // 执行命令
  execute(command) {}

  // 分割终端
  split() {}
}
```

### 3. **UI 布局**

```
┌─────────────────────────────────────────────────────┐
│  ← →  🔍 搜索                     Cmd+P      ⚙️      │ 35px
├──────┬──────────────────────────────────────────────┤
│      │  ▼ src/main.js           ×  ▼ index.html  × │ 40px (标签栏)
│  📁  ├──────────────────────────────────────────────┤
│  🔍  │                                              │
│  🤖  │            Monaco Editor                     │
│  🔧  │          (代码编辑区域)                       │ 主区域
│  ⚡  │                                              │
│  📊  │                                              │
│      │                                              │
│  250 ├──────────────────────────────────────────────┤
│  px  │  $ npm install                               │ 200px (可拖动)
│      │  Terminal                                    │
├──────┴──────────────────────────────────────────────┤
│  ● master  ✓ 5 files  ⚠ 2 warnings    100%  UTF-8  │ 24px (状态栏)
└─────────────────────────────────────────────────────┘
```

**AI 面板**：侧边栏可切换显示（Cmd+L 触发）

```
┌──────────────────┐
│  🤖 AI Assistant  │
├──────────────────┤
│                  │
│  💬 对话历史      │
│                  │
│  [消息1]         │
│  [消息2]         │
│                  │
├──────────────────┤
│  [输入框]  [发送] │
└──────────────────┘
```

### 4. **数据流**

```
用户操作
  ↓
UI 组件（React/Vue）
  ↓
事件总线（EventEmitter）
  ↓
服务层（Service）
  ↓
IPC 通信（Electron）
  ↓
主进程/系统调用
  ↓
返回结果
  ↓
更新 UI
```

### 5. **状态管理**

使用简单的状态管理系统：

```javascript
// src/store/index.js
class Store {
  constructor() {
    this.state = {
      editor: {
        activeFile: null,
        openFiles: [],
        selection: null
      },
      ai: {
        conversations: [],
        isProcessing: false
      },
      files: {
        projectPath: null,
        tree: null
      },
      ui: {
        sidebarVisible: true,
        theme: 'dark'
      }
    };
    this.listeners = new Map();
  }

  getState(path) {
    return path.split('.').reduce((obj, key) => obj[key], this.state);
  }

  setState(path, value) {
    // 更新状态并通知监听者
    this.notify(path, value);
  }

  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, []);
    }
    this.listeners.get(path).push(callback);
  }
}
```

---

## 🔑 核心交互流程

### 1. **内联编辑流程**

```
1. 用户选中代码
2. 按 Cmd+K
3. 出现内联输入框
4. 输入指令（如"优化这段代码"）
5. AI 分析上下文（当前文件、项目结构、相关文件）
6. 生成建议，显示 diff 预览
7. 用户接受（Tab）或拒绝（Esc）
8. 应用更改到编辑器
```

### 2. **聊天辅助流程**

```
1. 用户按 Cmd+L 打开 AI 面板
2. 输入问题（如"如何实现用户登录？"）
3. AI 理解意图，生成代码示例
4. 显示代码块，带"插入到编辑器"按钮
5. 用户点击插入，代码添加到当前光标位置
6. 可以继续对话细化需求
```

### 3. **智能补全流程**

```
1. 用户输入代码
2. AI 实时分析上下文
3. 预测下一段代码（灰色显示）
4. 用户按 Tab 接受
5. 或继续输入忽略建议
```

---

## 🚀 技术栈

### 前端
- **框架**：原生 JavaScript（轻量级，无需构建）
- **编辑器**：Monaco Editor
- **终端**：xterm.js + node-pty
- **UI 组件**：自定义组件系统
- **状态管理**：简单的发布-订阅模式

### 后端（Electron 主进程）
- **运行时**：Node.js
- **框架**：Electron
- **文件系统**：fs, chokidar（文件监听）
- **进程管理**：child_process
- **AI 集成**：Claude CLI / API

### 工具库
- **代码高亮**：Monaco Editor 内置
- **Markdown 渲染**：marked.js
- **快捷键**：自定义键盘事件处理
- **Git**：simple-git

---

## 📝 开发计划

### Phase 1: 核心功能（MVP）
- [x] 项目清理
- [ ] Monaco Editor 集成
- [ ] 基础文件管理
- [ ] Claude API 集成
- [ ] 简单的 AI 聊天

### Phase 2: AI 深度集成
- [ ] 内联编辑（Cmd+K）
- [ ] 智能补全
- [ ] 上下文感知
- [ ] 代码 Diff 预览

### Phase 3: 完整 IDE 功能
- [ ] 集成终端
- [ ] Git 集成
- [ ] 调试功能
- [ ] 插件系统

### Phase 4: 用户体验优化
- [ ] 命令面板
- [ ] 快捷键自定义
- [ ] 主题系统
- [ ] 性能优化

---

## 🎨 设计原则

1. **渐进增强**：从基础功能开始，逐步添加高级特性
2. **用户优先**：每个功能都要考虑用户体验
3. **性能至上**：确保 60fps 的流畅体验
4. **可扩展性**：易于添加新功能和插件
5. **简单可靠**：代码清晰，架构简单，减少 bug

---

## 📚 参考资料

- [Cursor IDE](https://cursor.sh/)
- [VS Code Architecture](https://github.com/microsoft/vscode)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Bolt.new](https://bolt.new/)
- [v0.dev](https://v0.dev/)


