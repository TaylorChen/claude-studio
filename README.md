# CLAUDE-STUDIO

<div align="center">

![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Electron](https://img.shields.io/badge/electron-27.0.0-blue.svg)
![Monaco Editor](https://img.shields.io/badge/monaco--editor-0.44.0-blue.svg)

**An AI-First IDE powered by Claude AI**

A modern code editor designed for AI-assisted development, built with Electron and Monaco Editor.

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Contributing](#-contributing) • [License](#-license)

</div>

---

## ✨ Features

### 🎨 **Modern Editor**
- **Monaco Editor** - The same editor that powers VS Code
- **Multi-Tab Support** - Work on multiple files with keyboard shortcuts (`Cmd+Tab`, `Cmd+Shift+Tab`)
- **Smart Tab Management** - Close tabs with `Cmd+W`, automatic next tab selection
- **Tab Context Menu** - Right-click menu on tabs with 10+ operations (close, copy path, split, etc.)
- **Syntax Highlighting** - Support for 100+ programming languages
- **IntelliSense** - Intelligent code completion and suggestions
- **Real-time Status Bar** - Line/column position, file type, cursor tracking
- **Breadcrumb Navigation** - Quick path navigation in opened files

### 🤖 **AI-Powered Features**
- **AI Chat Panel** - Integrated Claude AI assistance (`Cmd+Shift+L`)
- **Inline Editing** - AI-powered code editing with diff preview (`Cmd+K`)
- **Smart Code Completion** - Context-aware AI suggestions with Tab acceptance
- **Session Management** - Save and restore AI chat sessions with IndexedDB persistence
- **Multi-Model Support** - Switch between Claude models (Opus 4.1, Sonnet 3.5, Haiku)
- **Chat History** - Automatic conversation saving, search, and restore
- **File Attachments** - Upload and analyze files, images, code with AI
- **Right-Click Integration** - Quick file context menu for attachment handling
- **Slash Commands** - `/help`, `/clear`, `/model` and more
- **Command Auto-completion** - Smart suggestions for slash commands
- **Error Diagnostics** - AI-powered error detection and auto-fix suggestions
- **Context-Aware** - Automatically includes file context in AI requests

### 📁 **File & Project Management**
- **Project Explorer** - Hierarchical file tree with real-time updates
- **Quick File Search** - Instant file access (`Cmd+P`)
- **Advanced Search** - Full-text search with regex support (`Cmd+Shift+F`)
- **Search Options** - Case-sensitive, whole-word matching, regex patterns
- **File Click Navigation** - Click search results to open in editor
- **File Operations** - Create, edit, delete files and folders
- **Workspace State Memory** - Automatically saves and restores open files and layouts
- **Project Path Tracking** - Persistent project directory

### 🛠️ **Developer Tools**
- **Integrated Terminal** - Built-in terminal with xterm.js
- **Resizable Panels** - Drag-to-resize sidebar and AI panel
- **Toast Notifications** - Non-intrusive status messages
- **Customizable Layout** - Panel visibility toggles
- **Keyboard Shortcuts** - Complete keyboard navigation
- **Git Integration** - (Planned) Version control support

### 🎯 **User Experience**
- **Auto-Save** - Work state saved every 30 seconds
- **Session Restore** - Recover your workspace on restart
- **Dark Theme** - Eye-friendly interface
- **Smooth Animations** - Polished UI transitions
- **Diff Preview** - Visual code change comparison
- **Markdown Support** - Formatted AI responses
- **Chinese Localization** - Full Chinese UI support for menus and commands

---

## 🚀 Installation

### Prerequisites

- **Node.js** 16.x or higher
- **npm** 7.x or higher
- **Claude CLI** (optional) - For AI features

### Quick Start

```bash
# Clone the repository
git clone https://github.com/TaylorChen/claude-studio.git
cd claude-studio

# Install dependencies
npm install

# Rebuild native modules (required for terminal)
npm rebuild node-pty

# Start development mode
npm run dev
```

### For Anthropic API Users

If using custom Anthropic API endpoints:

```bash
# Set environment variables
export ANTHROPIC_BASE_URL="https://your-api-endpoint"
export ANTHROPIC_AUTH_TOKEN="your-token-here"

# Start with environment
npm run dev:anthropic
```

Or use the startup script:

```bash
# Edit start-with-anthropic.sh with your credentials
./start-with-anthropic.sh
```

---

## 💻 Usage

### Development

```bash
# Start with DevTools
npm run dev

# Start with Anthropic custom endpoint
npm run dev:anthropic
```

### Build for Production

```bash
# Build for current platform
npm run build

# Output location:
# - macOS: dist/mac/CLAUDE-STUDIO.app
# - Windows: dist/win/CLAUDE-STUDIO.exe
# - Linux: dist/linux/claude-studio
```

### Keyboard Shortcuts

#### General
| Shortcut | Action |
|----------|--------|
| `Cmd+O` | Open project |
| `Cmd+P` | Quick file search |
| `Cmd+S` | Save file |
| `Cmd+Shift+L` | Toggle AI panel |
| `` Cmd+` `` | Toggle terminal |
| `Cmd+L` | Focus AI input (when AI panel open) |

#### Tab Management
| Shortcut | Action |
|----------|--------|
| `Cmd+W` | Close current tab |
| `Cmd+Tab` | Switch to next tab |
| `Cmd+Shift+Tab` | Switch to previous tab |

#### AI Features
| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Inline edit selected code |
| `Cmd+Shift+F` | Open advanced search |
| `Cmd+Shift+A` | Add file attachment |
| `Cmd+Shift+I` | Add image attachment |
| `Cmd+R` | Search command history |
| `Tab` | Accept AI code suggestion / auto-complete |
| `Esc` | Dismiss AI suggestion |
| `/` | Open slash command menu |

---

## 🎯 AI Features Guide

### Chat Panel (`Cmd+Shift+L`)
- Ask questions about your code
- Get explanations and suggestions
- All conversations automatically saved with IndexedDB
- Access chat history with 📚 button
- Support for Markdown-formatted responses

### File Attachments
- **Upload Files**: Click 📎 button or drag-and-drop files into chat
- **Add from Explorer**: Right-click files → "Add as Attachment"
- **Image Support**: Upload images for Claude to analyze
- **Multi-attachment**: Add multiple files to a single message
- **Smart Paths**: Automatic path resolution for local files
- **Context Menu**: Three attachment options:
  - "Add as Attachment" - Add to current chat
  - "Add as Attachment (New Chat)" - Create new session with attachment
  - "Add as Image Attachment" - Mark as image type for analysis

### Inline Editing (`Cmd+K`)
1. Select code in editor
2. Press `Cmd+K`
3. Describe changes (e.g., "add error handling")
4. Review diff and apply changes

### Session Management
- Click 📋 button to view sessions
- Restore previous conversations
- Delete unwanted sessions
- Rename sessions for better organization
- Sessions persist across restarts via IndexedDB
- Create new sessions with `+` button

### Model Selection
- Click ⚙️ button to switch AI models
- Available: Opus 4.1 (latest), Sonnet 3.5, Haiku
- Model selection persists across sessions

### Slash Commands
- `/help` - Show available commands
- `/clear` - Clear current conversation
- `/model` - Check or switch models
- `/exit` - Close chat session
- Auto-completion for commands with arrow keys

### Search Features
- **Current File Search**: Search in currently open file
- **Project Search**: Search across all project files
- **Result Navigation**: Click results to jump to file/location
- **Case-Sensitive**: Toggle for case-sensitive matching
- **Regex Support**: Use regular expressions for advanced patterns

### Error Diagnostics
- Automatic error detection
- AI-powered fix suggestions
- One-click apply with diff preview
- Non-intrusive notifications

### Workspace Memory
- Open files remembered on restart
- UI layout preserved
- Manual save/restore via 💾 button
- Automatic saves every 30 seconds

---

## 🏗️ Architecture

### Technology Stack

| Component | Technology |
|-----------|-----------|
| **Framework** | Electron 27.0 |
| **Editor** | Monaco Editor 0.44 |
| **Terminal** | xterm.js 5.3 |
| **AI** | Claude API / Claude CLI |
| **Process** | node-pty 1.0 |
| **Storage** | IndexedDB + localStorage |

### Project Structure

```
claude-studio/
├── src/
│   ├── main.js                    # Electron main process
│   ├── preload.js                 # Context bridge
│   ├── renderer/
│   │   └── app.js                 # Renderer entry point (all-in-one)
│   ├── modules/
│   │   ├── ai/
│   │   │   ├── ClaudeService.js   # AI service manager
│   │   │   ├── ChatHistoryManager.js  # Conversation history
│   │   │   ├── CommandParser.js   # Slash command parser
│   │   │   ├── CommandRegistry.js # Command definitions
│   │   │   ├── CommandExecutor.js # Command execution
│   │   │   └── ErrorDiagnostics.js    # Error analysis & fixes
│   │   ├── attachments/
│   │   │   ├── AttachmentManager.js    # Attachment handling
│   │   │   ├── FileValidator.js        # File validation
│   │   │   └── AttachmentProcessor.js  # Attachment processing
│   │   ├── files/
│   │   │   └── FileManager.js     # File operations
│   │   └── storage/
│   │       ├── WorkspaceState.js  # Workspace persistence
│   │       └── IndexedDBManager.js # IndexedDB operations
│   ├── components/                # Reusable UI components
│   ├── utils/
│   │   ├── MarkdownRenderer.js    # Markdown rendering
│   │   └── Shortcuts.js           # Keyboard shortcuts
│   └── ui/styles/                 # Stylesheets
├── index.html                     # Main HTML
├── package.json
└── start-with-anthropic.sh        # Custom API startup script
```

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 🔧 Configuration

### AI Setup

#### Option 1: Claude CLI (Recommended)
```bash
# Install Claude CLI
npm install -g @anthropics/claude-cli

# Login
claude login

# Start CLAUDE-STUDIO
npm run dev
```

#### Option 2: Custom API Endpoint
```bash
# Set environment variables
export ANTHROPIC_BASE_URL="https://your-endpoint"
export ANTHROPIC_AUTH_TOKEN="your-token"

# Start
npm run dev:anthropic
```

#### Option 3: API Key
Configure in Settings panel (⚙️) with your Anthropic API key.

### Terminal Configuration

The terminal uses your system's default shell:
- **macOS/Linux**: `/bin/bash` or `/bin/zsh`
- **Windows**: `cmd.exe` or PowerShell

### Workspace State

State is automatically saved to:
```
~/Library/Application Support/claude-studio/workspace-state.json
```

You can manually manage via 💾 button in top bar.

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Quick Contributing Guide

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history and updates.

**Latest**: v2.1.1 - Multi-session support, Attachments, Search, Slash Commands

---

## 🐛 Known Issues & Solutions

### macOS
1. **Menu bar shows "Electron"** - Fixed in production build only
2. **Global shortcuts not working** - Use the button alternatives

### Windows
1. **Terminal requires Build Tools** - Install Visual Studio Build Tools and Python

### Linux
1. **Permission issues** - May need `chmod +x` for scripts

For more issues, check the [Issues](https://github.com/TaylorChen/claude-studio/issues) page.

---

## 📚 Documentation

- [Architecture Guide](./ARCHITECTURE.md) - System design and components
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute
- [Changelog](./CHANGELOG.md) - Version history
- [Integration Plan](./plan.md) - Phase-based Claude CLI feature integration roadmap

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** - Microsoft's powerful code editor
- **[Electron](https://www.electronjs.org/)** - Cross-platform desktop framework
- **[xterm.js](https://xtermjs.org/)** - Terminal emulator component
- **[Anthropic](https://www.anthropic.com/)** - Claude AI platform
- **[VS Code](https://code.visualstudio.com/)** - Design inspiration
- **[node-pty](https://github.com/microsoft/node-pty)** - Terminal process management
- **[markdown-it](https://github.com/markdown-it/markdown-it)** - Markdown parser
- **[highlight.js](https://highlightjs.org/)** - Syntax highlighting

---

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/TaylorChen/claude-studio/issues)
- **Discussions**: [GitHub Discussions](https://github.com/TaylorChen/claude-studio/discussions)
- **Documentation**: Check the `/docs` folder for detailed guides

---

## 🗺️ Roadmap

### ✅ Completed Phases

**Phase 1-2: Session Management & Multi-Session Support**
- [x] Multi-session chat support with tabs
- [x] Session persistence with IndexedDB
- [x] Session history search and restore
- [x] Rename sessions functionality

**Phase 3: Slash Command System**
- [x] Command parser and registry
- [x] Built-in commands (/help, /clear, /model, /exit)
- [x] Command auto-completion
- [x] Command history search (Ctrl+R / Cmd+R)
- [x] Arrow key navigation in suggestions

**Phase 4: File Attachments & Search**
- [x] File attachment upload and management
- [x] Image attachment support
- [x] Right-click context menu for attachments
- [x] Advanced search with multiple file types
- [x] Search result navigation

### 🚀 Upcoming Phases

**Phase 5: Advanced Features**
- [ ] Checkpoints (code version control)
- [ ] Permission management system
- [ ] Sub-agents system
- [ ] Extended input options (multi-line, background tasks)

**Phase 6: Extension System**
- [ ] Hooks lifecycle system
- [ ] Plugin architecture
- [ ] Custom command support

**Phase 7: UI/UX Enhancements**
- [ ] Theme customization
- [ ] Layout preferences
- [ ] Accessibility improvements

**Other Features**
- [ ] Git integration (status, commit, push/pull)
- [ ] Split editor view
- [ ] Cloud sync for workspace settings
- [ ] Team collaboration features
- [ ] More AI models support
- [ ] Vim editing mode (optional)

---

<div align="center">

**Made with ❤️ by the Claude Studio Team**

⭐ Star us on GitHub if you find this project useful!

[Report Bug](https://github.com/TaylorChen/claude-studio/issues) • [Request Feature](https://github.com/TaylorChen/claude-studio/issues) • [Documentation](./ARCHITECTURE.md)

</div>
