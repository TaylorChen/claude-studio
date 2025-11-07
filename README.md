# CLAUDE-STUDIO

<div align="center">

![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)
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
- **Syntax Highlighting** - Support for 100+ programming languages
- **IntelliSense** - Intelligent code completion and suggestions
- **Real-time Status Bar** - Line/column position, file type, cursor tracking

### 🤖 **AI-Powered Features**
- **AI Chat Panel** - Integrated Claude AI assistance (`Cmd+Shift+L`)
- **Inline Editing** - AI-powered code editing with diff preview (`Cmd+K`)
- **Smart Code Completion** - Context-aware AI suggestions with Tab acceptance
- **Session Management** - Save and restore AI chat sessions
- **Model Selection** - Switch between Claude models (Opus, Sonnet, Haiku)
- **Chat History** - Automatic conversation saving, search, and restore
- **Error Diagnostics** - AI-powered error detection and auto-fix suggestions
- **Context-Aware** - Automatically includes file context in AI requests

### 📁 **File & Project Management**
- **Project Explorer** - Hierarchical file tree with real-time updates
- **Quick File Search** - Instant file access (`Cmd+P`)
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
| `Tab` | Accept AI code suggestion |
| `Esc` | Dismiss AI suggestion |

---

## 🎯 AI Features Guide

### Chat Panel (`Cmd+Shift+L`)
- Ask questions about your code
- Get explanations and suggestions
- All conversations automatically saved
- Access chat history with 📚 button

### Inline Editing (`Cmd+K`)
1. Select code in editor
2. Press `Cmd+K`
3. Describe changes (e.g., "add error handling")
4. Review diff and apply changes

### Session Management
- Click 📋 button to view sessions
- Restore previous conversations
- Delete unwanted sessions
- Sessions persist across restarts

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
│   │   │   └── ErrorDiagnostics.js    # Error analysis & fixes
│   │   ├── files/
│   │   │   └── FileManager.js     # File operations
│   │   └── storage/
│   │       └── WorkspaceState.js  # Workspace persistence
│   ├── components/                # Reusable UI components
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

**Latest**: v2.1.0 - Chat History, Error Diagnostics, Workspace Memory

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

---

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/TaylorChen/claude-studio/issues)
- **Discussions**: [GitHub Discussions](https://github.com/TaylorChen/claude-studio/discussions)
- **Documentation**: Check the `/docs` folder for detailed guides

---

## 🗺️ Roadmap

- [ ] Git integration (status, commit, push/pull)
- [ ] Split editor view
- [ ] Extension system
- [ ] Cloud sync for workspace settings
- [ ] Team collaboration features
- [ ] More AI models support

---

<div align="center">

**Made with ❤️ by the Claude Studio Team**

⭐ Star us on GitHub if you find this project useful!

[Report Bug](https://github.com/TaylorChen/claude-studio/issues) • [Request Feature](https://github.com/TaylorChen/claude-studio/issues) • [Documentation](./ARCHITECTURE.md)

</div>
