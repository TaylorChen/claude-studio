# Changelog

All notable changes to CLAUDE-STUDIO will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.3.0] - 2025-11-10

### 🎯 Phase 5 Complete - UI/UX Enhancement & Chinese Localization

#### ✨ Added

**标签页右键菜单系统 (Tab Context Menu System)**
- ✅ 单击标签页切换文件
- ✅ 右键菜单显示 10+ 个操作
- ✅ VS Code 风格菜单设计
- ✅ 菜单操作包括:
  - 关闭、关闭其他、关闭右侧、关闭全部
  - 复制路径、复制相对路径
  - 固定标签、重新打开
  - 在 Finder 中显示、在文件树中定位
  - 分割窗口 (上下左右四个方向)

**中文本地化 (Chinese Localization)**
- ✅ 文件树菜单完整中文翻译 (13 个菜单项)
- ✅ 菜单项分类:
  - Claude 对话相关 (4 项)
  - 附件相关 (3 项)
  - 路径相关 (4 项)
  - Finder 相关 (2 项)
- ✅ 所有功能保持完整
- ✅ 所有外观保持不变

#### 🔧 Technical Details
- 修改文件:
  - `src/renderer/app.js` (+95 行代码)
  - `src/modules/files/FileManager.js` (+20 行代码)
- 新增组件:
  - `src/components/TabContextMenu.js` (300+ 行)
- 样式更新:
  - `src/ui/styles/main.css` (100+ 行)

#### 🎯 Phase 4 Complete - Checkpoints (代码版本控制)

#### ✨ Added

**检查点管理系统 (Checkpoint Management System)**
- **CheckpointManager** - 完整的版本控制系统
  - ✅ 自动创建检查点 (编辑时)
  - ✅ 手动创建检查点 (支持添加描述)
  - ✅ 检查点历史记录 (最多 50 个,可配置)
  - ✅ 回退到任意检查点
  - ✅ 差异对比 (additions/deletions/changes)
  - ✅ 分支管理 (创建、切换、合并分支)
  - ✅ 检查点导出/导入 (JSON 格式)
  - ✅ 双重持久化 (IndexedDB + localStorage)

**检查点面板 UI (Checkpoint Panel Component)**
- ✅ 可视化时间线视图
- ✅ 文件过滤 (当前文件/所有文件)
- ✅ 一键恢复功能
- ✅ Diff 统计信息显示
- ✅ 检查点删除和管理
- ✅ 分支切换器
- ✅ 检查点统计信息
- ✅ 完整的 UI 样式和交互

**存储系统扩展**
- ✅ IndexedDB 支持检查点存储
- ✅ saveCheckpoints() 和 loadCheckpoints() 方法
- ✅ 自动降级到 localStorage

#### 📝 Technical Details
- 新增文件:
  - `src/modules/editor/CheckpointManager.js` (600+ 行)
  - `src/components/CheckpointPanelComponent.js` (850+ 行)
  - Checkpoint CSS 样式 (400+ 行)
- 更新文件:
  - `src/modules/storage/IndexedDBManager.js` (+95 行)
  - `index.html` (+18 行)
  - `DEVELOPMENT-STATUS.md`
  - `package.json` (version 2.3.0)

#### 🎉 Milestones
- ✅ Phase 4 完全实现
- ✅ MVP-4.1 (基础检查点) 完成
- ✅ MVP-4.2 (检查点增强) 完成
- ✅ 代码历史记录和回退功能生产就绪

---

## [2.2.0] - 2025-11-10

### 🚀 Major Update - Attachments, Search & Context Integration

#### ✨ Added

**文件附件系统 (File Attachment System)**
- 拖拽上传文件和图片到聊天
- 附件按钮快速添加文件 (Cmd+Shift+A) 和图片 (Cmd+Shift+I)
- 支持多文件同时添加
- 智能路径处理和访问验证
- 右键菜单快速添加为附件
  - "Add as Attachment" - 添加到当前会话
  - "Add as Attachment (New Chat)" - 创建新会话并添加
  - "Add as Image Attachment" - 标记为图片类型
- Claude 能够识别和分析图片内容
- 文件类型验证和大小限制

**高级搜索功能 (Advanced Search)**
- 全局搜索 (Cmd+Shift+F)
- 当前文件搜索
- 项目范围搜索
- 正则表达式支持
- 搜索结果点击跳转
- 面包屑导航显示当前打开文件路径

**多会话支持增强 (Enhanced Multi-Session)**
- IndexedDB 持久化存储
- 会话自动恢复
- 会话重命名功能
- 新增会话按钮 (+)

**斜杠命令系统 (Slash Commands)**
- `/help` - 显示可用命令
- `/clear` - 清空当前对话
- `/model` - 检查或切换模型
- `/exit` - 关闭聊天会话
- 命令自动补全
- 命令历史搜索 (Cmd+R)
- 方向键导航建议

**模型选择系统 (Model Selection)**
- 模型列表统一管理
- 模型验证和超时改进
- 最新 Claude 模型支持 (Opus 4.1)

**Markdown 和代码高亮**
- AI 响应 Markdown 格式化
- 代码块语法高亮
- 本地库加载 (markdown-it, highlight.js)

#### 🔧 Changed

**代码质量**
- 移除所有调试日志
- 优化代码性能
- 改进错误处理

**模块重构**
- AttachmentManager - 附件管理
- FileValidator - 文件验证
- MessageBuilder - 消息构建
- AttachmentProcessor - 附件处理
- CommandParser/Registry/Executor - 命令系统
- SearchComponent - 搜索功能

**IPC API 扩展**
- 新增 `select-attachment-files` - 文件选择对话框
- 改进 `read-file` - 文件读取
- 模型管理 API 改进

#### 🐛 Fixed

**附件系统**
- 修复文件路径访问限制
- 修复 Claude CLI 沙箱问题
- 支持相对路径自动转换

**搜索功能**
- 修复当前文件搜索
- 修复项目搜索回退
- 改进搜索结果优先级

**会话管理**
- 修复 IndexedDB 异步加载
- 修复会话持久化问题
- 修复会话切换内容更新

**UI 修复**
- 修复面包屑导航显示
- 修复附件 UI 样式
- 修复搜索面板布局

#### 📊 Statistics

- 新增文件: 7 个 (Attachments, Search, Commands modules)
- 修改文件: 15+ 个
- 新增代码: ~1500 行
- 新增功能: 40+
- 删除临时文档: 100+ 个
- 改进的测试覆盖

#### 🎯 User Experience

**直观的文件管理**
- 右键菜单一键添加附件
- 拖拽支持更自然
- 智能路径处理

**强大的搜索**
- 快速定位文件
- 结果点击即跳转
- 面包屑导航辅助定位

**便利的命令系统**
- 自动补全提升效率
- 历史搜索快速回溯
- 内置帮助文档

---

## [2.1.1] - 2025-11-08

### 🎨 UI/UX Improvements

#### ✨ Added

**Cursor-Style Layout**
- 三面板布局（侧边栏、编辑器、AI 助手）
- 所有面板支持拖拽调整宽度
- 终端面板支持垂直分割（编辑器上方、终端下方）
- 面板宽度和高度自动保存和恢复
- 平滑的调整动画和视觉反馈

**Terminal 功能完善**
- 集成 xterm.js 终端模拟器
- node-pty 后端支持真实 shell 进程
- 自动检测系统 shell（zsh/bash/PowerShell）
- 终端大小自动适配容器
- 支持终端输入输出交互
- 终端面板可拖拽调整高度

#### 🔧 Changed

**面板调整优化**
- 修复 AI 面板只能缩小不能放大的问题
- 修复侧边栏在 AI 面板打开时被隐藏的问题
- 使用 `flex-basis` 替代 `width` 确保 flexbox 布局正确
- 添加强制重绘机制确保视觉更新
- 优化面板最小/最大宽度限制

**模块加载优化**
- 解决 Monaco Editor 和 xterm.js 的 AMD 冲突
- 使用 define 拦截器转换 UMD 模块为全局变量
- 优化脚本加载顺序和时机
- 移除所有调试日志，提升性能

#### 🐛 Fixed

**布局修复**
- 修复 AI 面板调整宽度不生效的问题
- 修复侧边栏被压缩消失的问题
- 修复终端面板高度调整问题
- 修复 flexbox 渲染延迟问题

**Terminal 修复**
- 修复 node-pty 编译问题（提供预编译版本回退）
- 修复 xterm.js AMD 模块冲突
- 修复 FitAddon 构造函数调用错误
- 修复终端大小自动适配问题

#### 📊 Statistics

- 修改文件: 5 个（index.html, app.js, main.css, main.js, preload.js）
- 新增代码: ~500 行
- 修复 Bug: 8 个
- 优化项: 10+
- 删除临时文件: 18 个

---

## [2.1.0] - 2025-11-07

### 🚀 Major Update - Advanced AI Features

#### ✨ Added

**对话历史管理 (Chat History Management)**
- 自动保存所有对话到本地存储
- 对话历史列表显示（标题、时间、消息数）
- 实时搜索对话功能
- 恢复历史对话到聊天面板
- 导出对话（支持 JSON 和 Markdown 格式）
- 导出所有对话功能
- 导入对话功能
- 删除单个或清空所有对话
- 对话统计信息（总数、消息数、时间范围）
- 新增"对话历史"按钮（📚）到 AI 面板

**智能错误诊断 (Error Diagnostics)**
- 自动监听编辑器中的语法错误
- AI 分析错误原因并提供修复建议
- 智能缓存机制（避免重复分析）
- 防抖优化（1秒延迟触发）
- 非侵入式错误提示（右下角滑入）
- 一键应用修复功能
- Diff 预览（查看修改前后对比）
- 自动消失（10秒后）或手动关闭

**工作区状态记忆 (Workspace State Memory)**
- 自动保存打开的文件和标签页
- 恢复 UI 布局（侧边栏/AI 面板宽度）
- 自动保存机制（每30秒 + 窗口关闭时）
- 文件系统持久化（~/Library/Application Support/claude-studio/workspace-state.json）
- 手动管理界面（保存/恢复/清除）
- 空状态保护机制（防止意外覆盖）
- 状态信息预览（保存时间、标签数量）
- 应用重启后自动恢复工作环境

**Anthropic API 支持**
- 自定义 API 端点配置
- 环境变量支持（ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN）
- Claude CLI 集成（使用 `claude --print` 非交互式模式）
- 启动脚本（start-with-anthropic.sh）
- 专用启动命令（npm run dev:anthropic）

**新增模块**
- `ChatHistoryManager.js` - 对话历史持久化管理
- `ErrorDiagnostics.js` - AI 错误诊断和修复
- `WorkspaceState.js` - 工作区状态管理（内联于 app.js）

**IPC API 扩展**
- 15 个新的历史管理 IPC 处理器
- `history:new`, `history:addMessage`, `history:save`
- `history:getAll`, `history:getById`, `history:restore`
- `history:delete`, `history:search`, `history:export`
- `history:exportAll`, `history:import`, `history:clearAll`
- `history:getStats`
- 3 个工作区状态 IPC 处理器
- `workspace:saveState`, `workspace:loadState`, `workspace:clearState`

**UI 改进**
- 对话历史对话框（宽度 700px，最大高度 80vh）
- 搜索框、导出、导入、清空按钮
- 美化的历史记录列表项
- 错误修复提示 UI（`.error-fix-hint`）
- 滑入动画效果（`@keyframes slideInRight`）

#### 🔧 Technical Improvements

**性能优化**
- 错误诊断防抖处理（避免频繁触发 AI）
- 错误修复建议缓存（1分钟内不重复分析）
- 对话历史懒加载
- 异步文件操作

**代码质量**
- 新增 2000+ 行高质量代码
- 完善的错误处理和降级策略
- 清晰的代码注释和文档
- 模块化设计和关注点分离
- async/await 异步处理优化

**文档更新**
- 更新 `README.md` - 包含所有新功能说明
- 更新 `CHANGELOG.md` - 完整的版本历史
- `ARCHITECTURE.md` - 系统架构文档
- `CONTRIBUTING.md` - 贡献指南

#### 🎯 User Experience

**智能化**
- 对话自动保存，无需手动操作
- 错误自动检测，无需手动触发
- 工作区状态自动保存（每30秒）
- 应用重启自动恢复工作环境
- 智能标题生成（基于首条消息）
- 上下文关联（记录文件路径、语言）
- 空状态保护（防止意外清除数据）

**交互优化**
- Toast 提示所有操作结果
- 确认对话框防止误操作（删除、清空）
- 加载状态指示和进度反馈
- 平滑动画效果（淡入淡出、滑入）
- 警告提示（保存空状态时）

#### 📊 Statistics

- 新增文件: 3 个（ChatHistoryManager, ErrorDiagnostics, WorkspaceState）
- 修改文件: 10+ 个
- 新增代码: ~2500 行
- 新增功能: 30+
- 新增 API: 18 个（15 history + 3 workspace）
- 新增快捷键: 多个（Cmd+Tab, Cmd+Shift+Tab, Cmd+W）
- 新增 UI 组件: 5 个对话框

#### 🔧 Bug Fixes

**Claude CLI 集成**
- 修复了 `claude chat` 交互式模式不稳定的问题
- 改用 `claude --print` 非交互式模式
- 修复了环境变量传递问题（localStorage 不持久化）
- 改用文件系统保存工作区状态
- 修复了 `--json` 选项不支持的问题
- 修复了会话管理超时问题

**UI 修复**
- 修复了内联编辑对话框样式错位
- 修复了按钮换行显示问题
- 修复了标签页选择器错误（.editor-tab → .tab-item）
- 优化了对话框居中和滚动

**性能优化**
- 减少 API 超时时间（10秒 → 30秒合理分配）
- 延迟自动保存启动（避免覆盖恢复的状态）
- 异步文件读写优化

---

## [2.0.0] - 2025-11-06

### 🎉 Major Release - Complete IDE Refactor

#### ✨ Added

**Editor Features**
- Monaco Editor integration (VS Code's editor)
- Multi-tab support with view state preservation
- Syntax highlighting for 100+ languages
- Code IntelliSense and auto-completion
- Keyboard shortcuts for tab management (`Cmd+W`, `Cmd+Tab`)

**File Management**
- Hierarchical file tree with folder expansion/collapse
- Project root node display with project name
- Sorted file/folder display (folders first, alphabetically)
- File operations (open, create, rename, delete)
- Quick file search (`Cmd+P`)

**AI Integration**
- AI chat panel with Claude integration (`Cmd+Shift+L`)
- Inline editing support (`Cmd+K`)
- Code completion assistance
- Chat history and context management

**Terminal**
- Integrated terminal with xterm.js
- Full shell support (bash/zsh/PowerShell)
- Terminal toggle shortcut (`` Cmd+` ``)

**UI/UX**
- Dark theme with Cursor-inspired design
- Resizable sidebar and AI panel
- Responsive layout
- Toast notifications for user feedback
- Status bar with file info

**Developer Tools**
- DevTools integration in development mode
- Git integration (planned)
- Settings panel (planned)

#### 🔧 Changed

**Architecture**
- Refactored to modular architecture
- Separate modules for Editor, Files, AI, Terminal
- Improved IPC communication between main and renderer processes
- Context bridge security implementation
- State management with custom Store

**Performance**
- Optimized file tree rendering
- Lazy loading for large projects
- Efficient tab switching with view state caching
- Memory management improvements

#### 🐛 Fixed

- Fixed AMD loader conflict between Monaco Editor and xterm.js
- Fixed file tree subdirectory expansion issues
- Fixed keyboard shortcut conflicts (changed to `Cmd+Shift+L`)
- Fixed flexbox layout issues for resizable panels
- Fixed project name display in file tree
- Fixed tab management and view state preservation

#### 🛠️ Technical Stack

- **Framework**: Electron 27.0.0
- **Editor**: Monaco Editor 0.44.0
- **Terminal**: xterm.js 5.3.0
- **Build**: electron-builder 24.0.0

---

## [1.0.0] - 2024-10-15

### 🚀 Initial Release

#### Features

- Basic file management
- Simple code editing
- Claude AI integration
- Dark theme UI
- Project browsing

---

## [Unreleased]

### Planned Features

#### v2.1.0
- Theme system (light/dark themes)
- Settings persistence
- Git visualization
- Plugin architecture
- Code search and replace

#### v2.2.0
- Remote development (SSH)
- Docker integration
- Multiple AI model support
- Collaborative editing
- Code snippets

#### v3.0.0
- Web version
- Mobile support
- Cloud sync
- Custom AI models
- Enterprise features

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Support

- **Issues**: [GitHub Issues](https://github.com/TaylorChen/claude-studio/issues)
- **Discussions**: [GitHub Discussions](https://github.com/TaylorChen/claude-studio/discussions)

---

**Legend**:
- ✨ Added: New features
- 🔧 Changed: Changes in existing functionality
- 🐛 Fixed: Bug fixes
- 🗑️ Removed: Removed features
- 🔒 Security: Security improvements
- ⚠️ Deprecated: Soon-to-be removed features
