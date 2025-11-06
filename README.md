# CLAUDE-STUDIO

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
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
- **Multi-Tab Support** - Work on multiple files with seamless tab switching
- **Syntax Highlighting** - Support for 100+ programming languages
- **IntelliSense** - Intelligent code completion and suggestions

### 🤖 **AI-Powered**
- **AI Chat Panel** - Integrated Claude AI assistance (`Cmd+Shift+L`)
- **Inline Editing** - AI-powered code suggestions (`Cmd+K`)
- **Smart Completion** - Context-aware code completion

### 📁 **File Management**
- **Project Explorer** - Hierarchical file tree navigation
- **Quick File Search** - Instant file access (`Cmd+P`)
- **File Operations** - Create, edit, and delete files

### 🛠️ **Developer Tools**
- **Integrated Terminal** - Built-in terminal with xterm.js
- **Customizable Panels** - Resizable sidebar and AI panel
- **Keyboard Shortcuts** - Complete keyboard navigation

---

## 🚀 Installation

### Prerequisites

- **Node.js** 16.x or higher
- **npm** 7.x or higher

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

---

## 💻 Usage

### Development

```bash
# Start with DevTools
npm run dev
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

| Shortcut | Action |
|----------|--------|
| `Cmd+O` | Open project |
| `Cmd+P` | Quick file search |
| `Cmd+S` | Save file |
| `Cmd+W` | Close tab |
| `Cmd+Shift+L` | Toggle AI panel |
| `Cmd+Tab` | Switch to next tab |
| `` Cmd+` `` | Toggle terminal |

---

## 🏗️ Architecture

### Technology Stack

| Component | Technology |
|-----------|-----------|
| **Framework** | Electron 27.0 |
| **Editor** | Monaco Editor 0.44 |
| **Terminal** | xterm.js 5.3 |
| **AI** | Claude API |

### Project Structure

```
claude-studio/
├── src/
│   ├── main.js              # Electron main process
│   ├── preload.js           # Context bridge
│   ├── renderer/
│   │   └── app.js           # Renderer entry point
│   ├── modules/
│   │   ├── ai/              # AI service
│   │   ├── editor/          # Editor manager
│   │   ├── files/           # File operations
│   │   └── terminal/        # Terminal integration
│   ├── components/          # UI components
│   └── ui/styles/           # Stylesheets
├── index.html               # Main HTML
└── package.json
```

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 🔧 Configuration

### AI Setup

To enable AI features:

1. Get your Claude API key from [Anthropic](https://console.anthropic.com/)
2. Configure in Settings panel (⚙️)
3. Start using AI with `Cmd+Shift+L`

### Terminal Configuration

The terminal uses your system's default shell:
- **macOS/Linux**: `/bin/bash` or `/bin/zsh`
- **Windows**: `cmd.exe` or PowerShell

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

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.

---

## 🐛 Known Issues

1. **macOS Dev Mode**: Menu bar shows "Electron" instead of "CLAUDE-STUDIO" (fixed in production build)
2. **Windows Terminal**: Requires Python and Visual Studio Build Tools for `node-pty`
3. **Large Projects**: Performance optimization needed for 10,000+ files

For more issues, check the [Issues](https://github.com/TaylorChen/claude-studio/issues) page.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** - Microsoft's code editor
- **[Electron](https://www.electronjs.org/)** - Cross-platform desktop framework
- **[xterm.js](https://xtermjs.org/)** - Terminal emulator
- **[Anthropic](https://www.anthropic.com/)** - Claude AI
- **[VS Code](https://code.visualstudio.com/)** - Design inspiration

---

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/TaylorChen/claude-studio/issues)
- **Discussions**: [GitHub Discussions](https://github.com/TaylorChen/claude-studio/discussions)

---

<div align="center">

**Made with ❤️ by the Claude Studio Team**

⭐ Star us on GitHub if you find this project useful!

[Report Bug](https://github.com/TaylorChen/claude-studio/issues) • [Request Feature](https://github.com/TaylorChen/claude-studio/issues)

</div>
