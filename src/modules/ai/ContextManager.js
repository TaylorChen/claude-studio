/**
 * Context Manager - 上下文管理
 * 管理编辑器上下文、文件关系和项目结构
 */

class ContextManager {
  constructor(editor, fileManager) {
    this.editor = editor;
    this.fileManager = fileManager;
    this.recentFiles = [];
    this.maxRecentFiles = 10;
  }

  /**
   * 获取当前编辑器上下文
   */
  getCurrentContext() {
    if (!this.editor || !this.editor.editor) {
      return null;
    }

    const model = this.editor.editor.getModel();
    if (!model) {
      return null;
    }

    const selection = this.editor.editor.getSelection();
    const position = this.editor.editor.getPosition();

    return {
      // 文件信息
      filePath: this.editor.activeFile || 'untitled',
      language: model.getLanguageId(),
      
      // 内容
      content: model.getValue(),
      lineCount: model.getLineCount(),
      
      // 选中内容
      selection: selection ? model.getValueInRange(selection) : '',
      hasSelection: selection && !selection.isEmpty(),
      selectionRange: selection,
      
      // 光标位置
      cursorPosition: position,
      cursorLine: position ? position.lineNumber : 0,
      cursorColumn: position ? position.column : 0,
      
      // 当前行内容
      currentLine: position ? model.getLineContent(position.lineNumber) : '',
      
      // 光标前后的文本
      textBeforeCursor: this.getTextBeforeCursor(model, position),
      textAfterCursor: this.getTextAfterCursor(model, position),
      
      // 周围代码（上下 5 行）
      surroundingCode: this.getSurroundingCode(model, position, 5)
    };
  }

  /**
   * 获取光标前的文本
   */
  getTextBeforeCursor(model, position) {
    if (!position) return '';

    const lineContent = model.getLineContent(position.lineNumber);
    return lineContent.substring(0, position.column - 1);
  }

  /**
   * 获取光标后的文本
   */
  getTextAfterCursor(model, position) {
    if (!position) return '';

    const lineContent = model.getLineContent(position.lineNumber);
    return lineContent.substring(position.column - 1);
  }

  /**
   * 获取周围代码
   */
  getSurroundingCode(model, position, lines = 5) {
    if (!position) return '';

    const startLine = Math.max(1, position.lineNumber - lines);
    const endLine = Math.min(model.getLineCount(), position.lineNumber + lines);

    const codeLines = [];
    for (let i = startLine; i <= endLine; i++) {
      const prefix = i === position.lineNumber ? '> ' : '  ';
      codeLines.push(`${prefix}${i}: ${model.getLineContent(i)}`);
    }

    return codeLines.join('\n');
  }

  /**
   * 构建 AI 提示词
   */
  buildPrompt(userMessage, context, options = {}) {
    if (!context) {
      return userMessage;
    }

    const parts = [];

    // 添加系统提示
    if (options.systemPrompt) {
      parts.push(options.systemPrompt);
      parts.push('---');
    }

    // 添加文件信息
    if (context.filePath && context.filePath !== 'untitled') {
      parts.push(`文件: ${context.filePath}`);
      parts.push(`语言: ${context.language}`);
      parts.push(`总行数: ${context.lineCount}`);
      parts.push('');
    }

    // 添加选中代码
    if (context.hasSelection && context.selection) {
      parts.push('选中的代码:');
      parts.push('```' + context.language);
      parts.push(context.selection);
      parts.push('```');
      parts.push('');
    }

    // 添加周围代码（如果没有选中）
    if (!context.hasSelection && context.surroundingCode) {
      parts.push('当前位置的代码 (光标行用 > 标记):');
      parts.push('```' + context.language);
      parts.push(context.surroundingCode);
      parts.push('```');
      parts.push('');
    }

    // 添加当前行
    if (context.currentLine && !context.hasSelection) {
      parts.push(`当前行 (${context.cursorLine}): ${context.currentLine}`);
      parts.push(`光标位置: 第 ${context.cursorColumn} 列`);
      parts.push('');
    }

    // 添加用户消息
    parts.push('用户问题:');
    parts.push(userMessage);

    return parts.join('\n');
  }

  /**
   * 构建代码编辑提示词
   */
  buildEditPrompt(instruction, context) {
    const parts = [];

    parts.push('你是一个专业的代码编辑助手。请根据用户指令修改代码。');
    parts.push('');
    parts.push('要求:');
    parts.push('1. 只返回修改后的完整代码，不要添加解释');
    parts.push('2. 保持代码风格一致');
    parts.push('3. 确保代码语法正确');
    parts.push('4. 添加必要的注释');
    parts.push('');
    parts.push('---');
    parts.push('');

    if (context.filePath && context.filePath !== 'untitled') {
      parts.push(`文件: ${context.filePath}`);
      parts.push(`语言: ${context.language}`);
      parts.push('');
    }

    parts.push('原代码:');
    parts.push('```' + context.language);
    parts.push(context.selection || context.content);
    parts.push('```');
    parts.push('');

    parts.push(`用户指令: ${instruction}`);
    parts.push('');
    parts.push('修改后的代码 (只返回代码，不要加解释):');

    return parts.join('\n');
  }

  /**
   * 构建代码补全提示词
   */
  buildCompletionPrompt(context) {
    const parts = [];

    parts.push('请提供代码补全建议。只返回补全的代码，不要解释。');
    parts.push('');

    if (context.filePath !== 'untitled') {
      parts.push(`文件: ${context.filePath}`);
    }
    parts.push(`语言: ${context.language}`);
    parts.push('');

    parts.push('光标前的代码:');
    parts.push('```' + context.language);
    parts.push(context.textBeforeCursor);
    parts.push('```');
    parts.push('');

    if (context.textAfterCursor) {
      parts.push('光标后的代码:');
      parts.push('```' + context.language);
      parts.push(context.textAfterCursor);
      parts.push('```');
      parts.push('');
    }

    parts.push('请补全光标处的代码 (只返回补全部分):');

    return parts.join('\n');
  }

  /**
   * 获取相关文件
   */
  async getRelatedFiles(currentFile) {
    if (!currentFile || !this.fileManager) {
      return [];
    }

    const relatedFiles = [];

    try {
      // 1. 获取当前文件内容
      const content = await this.readFileContent(currentFile);

      // 2. 分析 import/require 语句
      const imports = this.extractImports(content);

      // 3. 解析文件路径
      for (const importPath of imports) {
        const resolvedPath = this.resolveImportPath(currentFile, importPath);
        if (resolvedPath) {
          relatedFiles.push({
            path: resolvedPath,
            relation: 'import'
          });
        }
      }

      // 4. 添加到最近文件列表
      this.addToRecentFiles(currentFile);

      return relatedFiles;
    } catch (error) {
      console.error('获取相关文件失败:', error);
      return [];
    }
  }

  /**
   * 提取 import 语句
   */
  extractImports(content) {
    const imports = [];

    // JavaScript/TypeScript import
    const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // CommonJS require
    const requireRegex = /require\s*\(['"](.+?)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Python import
    const pythonImportRegex = /^(?:from\s+(\S+)\s+)?import\s+(.+)$/gm;
    while ((match = pythonImportRegex.exec(content)) !== null) {
      if (match[1]) {
        imports.push(match[1]);
      }
    }

    return imports;
  }

  /**
   * 解析 import 路径
   */
  resolveImportPath(currentFile, importPath) {
    // 简化版本：这里需要根据实际项目结构实现
    // 1. 相对路径解析
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const path = require('path');
      const dir = path.dirname(currentFile);
      return path.resolve(dir, importPath);
    }

    // 2. 绝对路径或模块路径
    return importPath;
  }

  /**
   * 读取文件内容
   */
  async readFileContent(filePath) {
    // 这里需要实现文件读取逻辑
    // 可以通过 electronAPI 或 fileManager 实现
    return '';
  }

  /**
   * 添加到最近文件
   */
  addToRecentFiles(filePath) {
    // 移除已存在的
    this.recentFiles = this.recentFiles.filter(f => f !== filePath);
    
    // 添加到开头
    this.recentFiles.unshift(filePath);
    
    // 限制数量
    if (this.recentFiles.length > this.maxRecentFiles) {
      this.recentFiles = this.recentFiles.slice(0, this.maxRecentFiles);
    }
  }

  /**
   * 获取最近文件
   */
  getRecentFiles() {
    return this.recentFiles;
  }

  /**
   * 提取代码块
   */
  extractCodeBlock(response) {
    // 尝试提取 markdown 代码块
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/;
    const match = response.match(codeBlockRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    }

    // 如果没有代码块标记，返回整个响应
    return response.trim();
  }
}

module.exports = ContextManager;


