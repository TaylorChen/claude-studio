# Changelog

All notable changes to CLAUDE-STUDIO will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
