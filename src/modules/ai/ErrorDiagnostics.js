/**
 * ErrorDiagnostics - AI 错误诊断和修复
 * 监听编辑器错误，使用 AI 分析并提供修复建议
 */

class ErrorDiagnostics {
  constructor(editor, claudeService, contextManager) {
    this.editor = editor;
    this.claudeService = claudeService;
    this.contextManager = contextManager;
    this.errorCache = new Map();
    this.isAnalyzing = false;
    this.analyzeDebounceTimeout = null;
  }

  /**
   * 初始化错误监听
   */
  init() {
    if (!window.monaco) {
      console.error('Monaco 未加载');
      return;
    }

    // 监听编辑器标记变化（错误、警告）
    this.disposable = window.monaco.editor.onDidChangeMarkers((uris) => {
      this.onMarkersChanged(uris);
    });
  }

  /**
   * 标记变化时触发
   */
  onMarkersChanged(uris) {
    // 防抖处理，避免频繁触发
    if (this.analyzeDebounceTimeout) {
      clearTimeout(this.analyzeDebounceTimeout);
    }

    this.analyzeDebounceTimeout = setTimeout(() => {
      uris.forEach(uri => {
        const model = window.monaco.editor.getModel(uri);
        if (model) {
          const markers = window.monaco.editor.getModelMarkers({ resource: uri });
          this.analyzeMarkers(model, markers);
        }
      });
    }, 1000); // 1秒后分析
  }

  /**
   * 分析错误标记
   */
  async analyzeMarkers(model, markers) {
    if (this.isAnalyzing) {
      return;
    }

    // 只分析错误（不分析警告）
    const errors = markers.filter(
      m => m.severity === window.monaco.MarkerSeverity.Error
    );

    if (errors.length === 0) {
      return;
    }

    this.isAnalyzing = true;

    try {
      // 分析每个错误
      for (const error of errors.slice(0, 3)) { // 最多同时分析3个错误
        await this.analyzeError(model, error);
      }
    } catch (error) {
      console.error('错误分析失败:', error);
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * 分析单个错误
   */
  async analyzeError(model, marker) {
    const cacheKey = this.getErrorCacheKey(marker);
    
    // 检查缓存
    if (this.errorCache.has(cacheKey)) {
      const cached = this.errorCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 60000) { // 1分钟内不重复分析
        return;
      }
    }

    // 获取错误周围的代码
    const codeContext = this.getCodeAroundError(model, marker);
    
    // 调用 AI 分析
    const fix = await this.suggestFix(codeContext, marker);
    
    if (fix) {
      // 缓存结果
      this.errorCache.set(cacheKey, {
        fix,
        timestamp: Date.now()
      });

      // 注册 CodeAction
      this.registerCodeAction(model, marker, fix);
    }
  }

  /**
   * 获取错误周围的代码
   */
  getCodeAroundError(model, marker) {
    const startLine = Math.max(1, marker.startLineNumber - 5);
    const endLine = Math.min(model.getLineCount(), marker.endLineNumber + 5);
    
    let code = '';
    for (let i = startLine; i <= endLine; i++) {
      const lineContent = model.getLineContent(i);
      const prefix = i === marker.startLineNumber ? '>>> ' : '    ';
      code += `${prefix}${i}: ${lineContent}\n`;
    }

    return {
      code,
      errorLine: marker.startLineNumber,
      errorColumn: marker.startColumn,
      startLine,
      endLine,
      language: model.getLanguageId()
    };
  }

  /**
   * 使用 AI 建议修复
   */
  async suggestFix(codeContext, marker) {
    try {
      const prompt = this.buildFixPrompt(codeContext, marker);
      
      // 发送到 Claude（使用主进程 API）
      const response = await window.electronAPI.claude.sendMessage(prompt, {
        conversationId: null, // 不保存到对话历史
        maxTokens: 500
      });

      // 解析响应
      return this.parseFixResponse(response, codeContext);
    } catch (error) {
      console.error('AI 修复建议失败:', error);
      return null;
    }
  }

  /**
   * 构建修复提示词
   */
  buildFixPrompt(codeContext, marker) {
    return `你是一个代码错误修复专家。请分析以下代码错误并提供修复建议。

**语言**: ${codeContext.language}
**错误信息**: ${marker.message}
**错误位置**: 第 ${codeContext.errorLine} 行

**代码上下文**:
\`\`\`${codeContext.language}
${codeContext.code}
\`\`\`

请提供:
1. 错误原因分析（1-2句话）
2. 修复后的代码（只提供需要修改的部分）

要求:
- 只返回修复后的代码，不要返回整个文件
- 保持代码风格一致
- 确保修复后代码语法正确

格式:
**原因**: [错误原因]
**修复**:
\`\`\`${codeContext.language}
[修复后的代码]
\`\`\``;
  }

  /**
   * 解析 AI 响应
   */
  parseFixResponse(response, codeContext) {
    try {
      // 提取原因
      const reasonMatch = response.match(/\*\*原因\*\*[：:]\s*(.+?)(?:\n|$)/);
      const reason = reasonMatch ? reasonMatch[1].trim() : '代码错误';

      // 提取修复代码
      const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
      const fixedCode = codeMatch ? codeMatch[1].trim() : null;

      if (!fixedCode) {
        return null;
      }

      return {
        description: reason,
        code: fixedCode,
        startLine: codeContext.startLine,
        endLine: codeContext.endLine
      };
    } catch (error) {
      console.error('解析 AI 响应失败:', error);
      return null;
    }
  }

  /**
   * 注册 CodeAction（快速修复）
   */
  registerCodeAction(model, marker, fix) {
    // Monaco CodeAction 需要全局注册
    // 这里我们创建一个自定义的 UI 提示
    this.showFixHint(marker, fix);
  }

  /**
   * 显示修复提示
   */
  showFixHint(marker, fix) {
    // 创建提示元素
    const hint = document.createElement('div');
    hint.className = 'error-fix-hint';
    hint.innerHTML = `
      <div class="error-fix-content">
        <span class="error-fix-icon">💡</span>
        <span class="error-fix-text">${fix.description}</span>
        <button class="error-fix-btn" data-action="apply">应用修复</button>
        <button class="error-fix-btn" data-action="show">查看详情</button>
        <button class="error-fix-btn" data-action="dismiss">忽略</button>
      </div>
    `;

    // 事件处理
    hint.querySelector('[data-action="apply"]').addEventListener('click', () => {
      this.applyFix(marker, fix);
      hint.remove();
    });

    hint.querySelector('[data-action="show"]').addEventListener('click', () => {
      this.showFixDetails(marker, fix);
    });

    hint.querySelector('[data-action="dismiss"]').addEventListener('click', () => {
      hint.remove();
    });

    // 添加到编辑器容器
    const editorContainer = this.editor.getDomNode();
    if (editorContainer) {
      editorContainer.appendChild(hint);

      // 自动消失
      setTimeout(() => {
        if (hint.parentNode) {
          hint.remove();
        }
      }, 10000);
    }
  }

  /**
   * 应用修复
   */
  applyFix(marker, fix) {
    const model = this.editor.getModel();
    if (!model) return;

    // 计算替换范围
    const range = new window.monaco.Range(
      marker.startLineNumber,
      marker.startColumn,
      marker.endLineNumber,
      marker.endColumn
    );

    // 执行编辑
    this.editor.executeEdits('ai-fix', [{
      range,
      text: fix.code
    }]);

    // 显示成功提示
    if (window.toast) {
      window.toast.show('✅ 已应用 AI 修复', 'success');
    }
  }

  /**
   * 显示修复详情（Diff 预览）
   */
  showFixDetails(marker, fix) {
    const model = this.editor.getModel();
    if (!model) return;

    // 获取原始代码
    const originalCode = model.getValueInRange({
      startLineNumber: marker.startLineNumber,
      startColumn: 1,
      endLineNumber: marker.endLineNumber,
      endColumn: model.getLineMaxColumn(marker.endLineNumber)
    });

    // 显示 Diff 对话框（复用现有的 showDiffPreview）
    if (window.app && window.app.showDiffPreview) {
      window.app.showDiffPreview(originalCode, fix.code, marker, fix.description);
    }
  }

  /**
   * 生成错误缓存键
   */
  getErrorCacheKey(marker) {
    return `${marker.startLineNumber}:${marker.startColumn}:${marker.message}`;
  }

  /**
   * 手动触发错误分析
   */
  async analyzeCurrentErrors() {
    const model = this.editor.getModel();
    if (!model) return;

    const markers = window.monaco.editor.getModelMarkers({ 
      resource: model.uri 
    });

    await this.analyzeMarkers(model, markers);
  }

  /**
   * 清空缓存
   */
  clearCache() {
    this.errorCache.clear();
  }

  /**
   * 销毁
   */
  dispose() {
    if (this.disposable) {
      this.disposable.dispose();
    }
    if (this.analyzeDebounceTimeout) {
      clearTimeout(this.analyzeDebounceTimeout);
    }
    this.clearCache();
  }
}

module.exports = ErrorDiagnostics;

