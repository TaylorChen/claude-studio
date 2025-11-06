# Contributing to CLAUDE-STUDIO

Thank you for your interest in contributing to CLAUDE-STUDIO! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher
- Git
- Basic knowledge of Electron, JavaScript, and Monaco Editor

### Development Setup

1. **Fork and clone the repository**

```bash
git clone https://github.com/TaylorChen/claude-studio.git
cd claude-studio
```

2. **Install dependencies**

```bash
npm install
```

3. **Rebuild native modules (if needed)**

```bash
npm rebuild node-pty
```

4. **Run in development mode**

```bash
npm run dev
```

---

## 📝 Development Guidelines

### Code Style

- Use **ES6+** syntax
- Use **camelCase** for variables and functions
- Use **PascalCase** for classes
- Add **JSDoc comments** for functions and classes
- Keep functions small and focused (single responsibility)

### File Organization

```
src/
├── main.js              # Electron main process
├── preload.js           # Context bridge
├── renderer/
│   └── app.js           # Renderer process entry
├── modules/             # Core modules
│   ├── ai/              # AI services
│   ├── editor/          # Editor management
│   ├── files/           # File operations
│   └── terminal/        # Terminal integration
├── components/          # UI components
├── ui/                  # UI styles
└── utils/               # Utility functions
```

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Build process or auxiliary tool changes

**Examples:**

```
feat: add auto-save functionality
fix: resolve file tree expansion bug
docs: update installation instructions
refactor: improve editor module structure
```

---

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the bug
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**:
   - OS: (e.g., macOS 13.0, Windows 11)
   - Node.js version: (e.g., v18.0.0)
   - Electron version: (e.g., v27.0.0)
6. **Screenshots**: If applicable
7. **Console Errors**: Any error messages from the console

---

## ✨ Suggesting Features

We welcome feature suggestions! Please:

1. Check if the feature has already been requested
2. Provide a clear use case
3. Describe the expected behavior
4. Consider implementation complexity
5. Be open to discussion and feedback

---

## 🔧 Pull Request Process

### Before Submitting

1. **Test your changes** - Ensure the application runs without errors
2. **Check for console errors** - No console errors in production
3. **Update documentation** - Update README or other docs if needed
4. **Follow code style** - Match the existing code style
5. **Remove debugging code** - No `console.log` statements in production code

### Submitting a PR

1. **Create a feature branch**

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes** and commit them

```bash
git commit -m "feat: add your feature"
```

3. **Push to your fork**

```bash
git push origin feature/your-feature-name
```

4. **Open a Pull Request** on GitHub

### PR Title Format

Use the same format as commit messages:

```
feat: add new feature
fix: resolve bug
docs: update documentation
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Other (please describe)

## Testing
How has this been tested?

## Screenshots (if applicable)
Add screenshots to demonstrate changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No console errors
- [ ] Tested in development mode
```

---

## 🧪 Testing

### Manual Testing

1. **Start the application**

```bash
npm run dev
```

2. **Test basic features**:
   - Open a project
   - Create/edit files
   - Use keyboard shortcuts
   - Test AI panel (if configured)
   - Check terminal functionality

3. **Test edge cases**:
   - Large files (> 10MB)
   - Many tabs open (> 20)
   - Special characters in file names
   - Network disconnection

### Build Testing

Before submitting, test the production build:

```bash
npm run build
open dist/mac/CLAUDE-STUDIO.app  # or equivalent for your OS
```

---

## 📚 Resources

### Documentation

- [Electron Documentation](https://www.electronjs.org/docs)
- [Monaco Editor API](https://microsoft.github.io/monaco-editor/api/index.html)
- [xterm.js Documentation](https://xtermjs.org/docs/)
- [Node-pty Documentation](https://github.com/microsoft/node-pty)

### Project Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [Changelog](./CHANGELOG.md)
- [Issue Tracker](https://github.com/TaylorChen/claude-studio/issues)

---

## 💬 Communication

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and discussions
- **Pull Requests**: For code contributions

---

## 📜 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- Harassment, trolling, or insulting comments
- Public or private harassment
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

---

## ❓ Questions?

If you have questions about contributing, please:

1. Check the [README](./README.md) first
2. Search existing [GitHub Issues](https://github.com/TaylorChen/claude-studio/issues)
3. Open a new issue with your question

---

## 🙏 Thank You!

Your contributions make CLAUDE-STUDIO better for everyone. We appreciate your time and effort!

---

<div align="center">

**Happy Coding! 🚀**

</div>

