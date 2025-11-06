/**
 * 编辑器管理模块
 * 负责 Monaco Editor 的创建、管理和操作
 */

const store = require('../../store');

class EditorManager {
  constructor() {
    this.monaco = null;  // Monaco Editor API
    this.editor = null;  // 主编辑器实例
    this.models = new Map();  // 文件模型缓存: path -> model
    this.viewStates = new Map();  // 视图状态缓存: path -> viewState
    this.decorations = [];  // 装饰器（高亮、下划线等）
  }

  /**
   * 初始化 Monaco Editor
   * @param {HTMLElement} container - 容器元素
   * @returns {Promise<void>}
   */
  async init(container) {
    // 加载 Monaco Editor（从 node_modules）
    const loader = require('monaco-editor/esm/vs/editor/editor.api');
    this.monaco = loader;

    // 创建编辑器实例
    this.editor = this.monaco.editor.create(container, {
      theme: 'vs-dark',
      fontSize: 14,
      fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
      lineNumbers: 'on',
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,  // 自动调整大小
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      wordWrap: 'off',
      tabSize: 2,
      insertSpaces: true,
      formatOnPaste: true,
      formatOnType: true
    });

    // 监听内容变化
    this.editor.onDidChangeModelContent(() => {
      const activeFile = store.getState('editor.activeFile');
      if (activeFile) {
        this.markFileDirty(activeFile);
      }
    });

    // 监听光标位置变化
    this.editor.onDidChangeCursorPosition((e) => {
      store.setState('editor.cursorPosition', {
        line: e.position.lineNumber,
        column: e.position.column
      });
    });

    // 监听选择变化
    this.editor.onDidChangeCursorSelection((e) => {
      const selection = this.editor.getSelection();
      if (!selection.isEmpty()) {
        store.setState('editor.selection', {
          startLine: selection.startLineNumber,
          startColumn: selection.startColumn,
          endLine: selection.endLineNumber,
          endColumn: selection.endColumn,
          text: this.editor.getModel().getValueInRange(selection)
        });
      } else {
        store.setState('editor.selection', null);
      }
    });

  }

  /**
   * 打开文件
   * @param {string} filePath - 文件路径
   * @param {string} content - 文件内容
   * @param {string} language - 语言（js, ts, html, css 等）
   */
  openFile(filePath, content, language) {
    // 保存当前文件的视图状态
    const currentFile = store.getState('editor.activeFile');
    if (currentFile && this.editor.getModel()) {
      this.viewStates.set(currentFile, this.editor.saveViewState());
    }

    // 检查模型是否已存在
    let model = this.models.get(filePath);
    if (!model) {
      // 创建新模型
      const uri = this.monaco.Uri.file(filePath);
      model = this.monaco.editor.createModel(content, language, uri);
      this.models.set(filePath, model);
    }

    // 设置模型
    this.editor.setModel(model);

    // 恢复视图状态（光标位置、滚动位置等）
    const viewState = this.viewStates.get(filePath);
    if (viewState) {
      this.editor.restoreViewState(viewState);
    }

    // 更新状态
    store.batch(() => {
      store.setState('editor.activeFile', filePath);
      this.addToOpenFiles(filePath, content, language);
    });

    // 聚焦编辑器
    this.editor.focus();
  }

  /**
   * 关闭文件
   * @param {string} filePath - 文件路径
   */
  closeFile(filePath) {
    const model = this.models.get(filePath);
    if (model) {
      model.dispose();
      this.models.delete(filePath);
    }
    this.viewStates.delete(filePath);

    // 从打开文件列表中移除
    const openFiles = store.getState('editor.openFiles');
    const newOpenFiles = openFiles.filter(f => f.path !== filePath);
    store.setState('editor.openFiles', newOpenFiles);

    // 如果是当前文件，切换到其他文件
    if (store.getState('editor.activeFile') === filePath) {
      if (newOpenFiles.length > 0) {
        const nextFile = newOpenFiles[newOpenFiles.length - 1];
        this.openFile(nextFile.path, nextFile.content, nextFile.language);
      } else {
        this.editor.setModel(null);
        store.setState('editor.activeFile', null);
      }
    }
  }

  /**
   * 保存当前文件
   * @returns {Promise<string>} 文件内容
   */
  async save() {
    const content = this.editor.getValue();
    const activeFile = store.getState('editor.activeFile');
    
    if (activeFile) {
      // 调用主进程保存文件
      const result = await window.electronAPI.writeFile(activeFile, content);
      if (result.success) {
        this.markFileClean(activeFile);
      }
      return content;
    }
  }

  /**
   * 获取当前选中的文本
   * @returns {string}
   */
  getSelection() {
    const selection = this.editor.getSelection();
    if (selection && !selection.isEmpty()) {
      return this.editor.getModel().getValueInRange(selection);
    }
    return '';
  }

  /**
   * 替换选中的文本
   * @param {string} newText - 新文本
   */
  replaceSelection(newText) {
    const selection = this.editor.getSelection();
    if (selection) {
      this.editor.executeEdits('ai-edit', [{
        range: selection,
        text: newText
      }]);
    }
  }

  /**
   * 在当前光标位置插入文本
   * @param {string} text - 要插入的文本
   */
  insertAtCursor(text) {
    const position = this.editor.getPosition();
    this.editor.executeEdits('ai-insert', [{
      range: new this.monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column
      ),
      text
    }]);
  }

  /**
   * 显示内联编辑框（Cmd+K 模式）
   * @param {Function} onSubmit - 提交回调
   */
  showInlineEdit(onSubmit) {
    const position = this.editor.getPosition();
    const selection = this.editor.getSelection();

    // 创建内联输入框
    const widget = {
      getId: () => 'inline-edit-widget',
      getDomNode: () => {
        const node = document.createElement('div');
        node.className = 'inline-edit-widget';
        node.innerHTML = `
          <input type="text" placeholder="Tell AI what to do..." class="inline-edit-input" />
          <button class="inline-edit-submit">✓</button>
          <button class="inline-edit-cancel">×</button>
        `;

        const input = node.querySelector('.inline-edit-input');
        const submit = node.querySelector('.inline-edit-submit');
        const cancel = node.querySelector('.inline-edit-cancel');

        input.focus();

        submit.onclick = () => {
          const instruction = input.value;
          if (instruction) {
            onSubmit(instruction, selection);
          }
          this.editor.removeContentWidget(widget);
        };

        cancel.onclick = () => {
          this.editor.removeContentWidget(widget);
        };

        input.onkeydown = (e) => {
          if (e.key === 'Enter') {
            submit.click();
          } else if (e.key === 'Escape') {
            cancel.click();
          }
        };

        return node;
      },
      getPosition: () => ({
        position,
        preference: [this.monaco.editor.ContentWidgetPositionPreference.ABOVE]
      })
    };

    this.editor.addContentWidget(widget);
    store.setState('ai.inlineEditMode', true);
  }

  /**
   * 显示 AI 建议的 Diff
   * @param {object} range - 范围
   * @param {string} originalText - 原始文本
   * @param {string} suggestedText - 建议文本
   */
  showAISuggestion(range, originalText, suggestedText) {
    // 高亮建议区域
    const decorations = this.editor.deltaDecorations(this.decorations, [
      {
        range,
        options: {
          className: 'ai-suggestion-highlight',
          glyphMarginClassName: 'ai-suggestion-glyph'
        }
      }
    ]);
    this.decorations = decorations;

    store.setState('ai.currentSuggestion', {
      range,
      originalText,
      suggestedText
    });
  }

  /**
   * 接受 AI 建议
   */
  acceptAISuggestion() {
    const suggestion = store.getState('ai.currentSuggestion');
    if (suggestion) {
      this.editor.executeEdits('ai-suggestion', [{
        range: suggestion.range,
        text: suggestion.suggestedText
      }]);
      this.clearAISuggestion();
    }
  }

  /**
   * 拒绝 AI 建议
   */
  rejectAISuggestion() {
    this.clearAISuggestion();
  }

  /**
   * 清除 AI 建议
   */
  clearAISuggestion() {
    this.editor.deltaDecorations(this.decorations, []);
    this.decorations = [];
    store.setState('ai.currentSuggestion', null);
  }

  /**
   * 添加到打开文件列表
   */
  addToOpenFiles(filePath, content, language) {
    const openFiles = store.getState('editor.openFiles');
    const existing = openFiles.find(f => f.path === filePath);
    if (!existing) {
      openFiles.push({
        path: filePath,
        content,
        language,
        isDirty: false
      });
      store.setState('editor.openFiles', openFiles);
    }
  }

  /**
   * 标记文件为已修改
   */
  markFileDirty(filePath) {
    const openFiles = store.getState('editor.openFiles');
    const file = openFiles.find(f => f.path === filePath);
    if (file && !file.isDirty) {
      file.isDirty = true;
      store.setState('editor.openFiles', [...openFiles]);
    }
  }

  /**
   * 标记文件为未修改
   */
  markFileClean(filePath) {
    const openFiles = store.getState('editor.openFiles');
    const file = openFiles.find(f => f.path === filePath);
    if (file && file.isDirty) {
      file.isDirty = false;
      store.setState('editor.openFiles', [...openFiles]);
    }
  }

  /**
   * 获取 Monaco Editor 实例（供外部使用）
   */
  getEditor() {
    return this.editor;
  }

  /**
   * 获取 Monaco API（供外部使用）
   */
  getMonaco() {
    return this.monaco;
  }

  /**
   * 销毁编辑器
   */
  dispose() {
    // 清理所有模型
    this.models.forEach(model => model.dispose());
    this.models.clear();
    this.viewStates.clear();
    
    // 销毁编辑器
    if (this.editor) {
      this.editor.dispose();
    }
  }
}

module.exports = EditorManager;


