# Changelog

All notable changes to CLAUDE-STUDIO will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
