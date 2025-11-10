/**
 * 会话导出/导入管理器
 * 处理会话的导出（JSON/Markdown）和导入功能
 * MVP-1.3 实施
 */

class SessionExportImportManager {
  constructor(historyManager) {
    this.historyManager = historyManager;
  }

  /**
   * 导出单个会话为 JSON
   * @param {string} sessionId - 会话 ID
   * @param {object} session - 会话对象
   * @returns {object} JSON 对象
   */
  exportSessionAsJSON(sessionId, session) {
    if (!session) {
      throw new Error('会话不存在');
    }

    return {
      id: session.id || sessionId,
      title: session.title || '未命名对话',
      timestamp: session.timestamp,
      messages: session.messages || [],
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: 'Claude Studio',
        version: '1.0'
      }
    };
  }

  /**
   * 导出单个会话为 Markdown
   * @param {string} sessionId - 会话 ID
   * @param {object} session - 会话对象
   * @returns {string} Markdown 文本
   */
  exportSessionAsMarkdown(sessionId, session) {
    if (!session) {
      throw new Error('会话不存在');
    }

    const title = session.title || '未命名对话';
    const date = new Date(session.timestamp).toLocaleString('zh-CN');
    const messages = session.messages || [];

    let markdown = `# ${this.escapeMarkdown(title)}\n\n`;
    markdown += `**导出时间**: ${new Date().toLocaleString('zh-CN')}\n`;
    markdown += `**原始对话时间**: ${date}\n`;
    markdown += `**消息总数**: ${messages.length}\n\n`;
    markdown += `---\n\n`;

    if (messages.length === 0) {
      markdown += '*暂无消息*\n';
      return markdown;
    }

    messages.forEach((msg, index) => {
      const role = (msg.role || msg.type || 'unknown').toUpperCase();
      const content = msg.content || '';

      markdown += `## ${role} (消息 ${index + 1})\n\n`;
      markdown += `${this.escapeMarkdown(content)}\n\n`;
      markdown += `---\n\n`;
    });

    return markdown;
  }

  /**
   * 导出多个会话为 JSON（压缩格式）
   * @param {array} sessions - 会话数组
   * @param {object} options - 选项
   * @returns {object} JSON 对象
   */
  exportSessionsAsJSON(sessions, options = {}) {
    const {
      includeMetadata = true,
      compress = false
    } = options;

    const exported = {
      sessions: sessions.map((session) => ({
        id: session.id,
        title: session.title || '未命名对话',
        timestamp: session.timestamp,
        messages: session.messages || [],
        messageCount: (session.messages || []).length
      })),
      summary: {
        totalSessions: sessions.length,
        totalMessages: sessions.reduce((sum, s) => sum + (s.messages || []).length, 0),
        dateRange: {
          earliest: sessions.length > 0 ? Math.min(...sessions.map(s => s.timestamp)) : null,
          latest: sessions.length > 0 ? Math.max(...sessions.map(s => s.timestamp)) : null
        }
      }
    };

    if (includeMetadata) {
      exported.metadata = {
        exportedAt: new Date().toISOString(),
        exportedBy: 'Claude Studio',
        version: '1.0'
      };
    }

    return exported;
  }

  /**
   * 导出多个会话为 Markdown（目录格式）
   * @param {array} sessions - 会话数组
   * @returns {string} Markdown 文本
   */
  exportSessionsAsMarkdown(sessions) {
    let markdown = `# Claude Studio 会话备份\n\n`;
    markdown += `**导出时间**: ${new Date().toLocaleString('zh-CN')}\n`;
    markdown += `**会话总数**: ${sessions.length}\n`;
    markdown += `**消息总数**: ${sessions.reduce((sum, s) => sum + (s.messages || []).length, 0)}\n\n`;

    // 目录
    markdown += `## 目录\n\n`;
    sessions.forEach((session, index) => {
      const title = session.title || `未命名对话 ${index + 1}`;
      const safeTitle = this.escapeMarkdown(title).replace(/\s+/g, '-');
      markdown += `- [${index + 1}. ${this.escapeMarkdown(title)}](#${safeTitle.toLowerCase()})\n`;
    });

    markdown += `\n---\n\n`;

    // 会话内容
    sessions.forEach((session, index) => {
      const title = session.title || `未命名对话 ${index + 1}`;
      const date = new Date(session.timestamp).toLocaleString('zh-CN');
      const messages = session.messages || [];

      markdown += `## ${index + 1}. ${this.escapeMarkdown(title)}\n\n`;
      markdown += `**时间**: ${date}\n`;
      markdown += `**消息数**: ${messages.length}\n\n`;

      if (messages.length === 0) {
        markdown += `*暂无消息*\n\n`;
      } else {
        messages.forEach((msg, msgIndex) => {
          const role = (msg.role || msg.type || 'unknown').toUpperCase();
          const content = msg.content || '';
          markdown += `### ${role}\n\n${this.escapeMarkdown(content)}\n\n`;
        });
      }

      markdown += `---\n\n`;
    });

    return markdown;
  }

  /**
   * 导入 JSON 会话文件
   * @param {string} jsonContent - JSON 文本
   * @returns {array} 导入的会话数组
   */
  importSessionsFromJSON(jsonContent) {
    try {
      const data = JSON.parse(jsonContent);

      if (!data.sessions) {
        throw new Error('无效的 JSON 格式：缺少 sessions 字段');
      }

      if (!Array.isArray(data.sessions)) {
        throw new Error('无效的 JSON 格式：sessions 必须是数组');
      }

      // 验证和转换会话
      const importedSessions = data.sessions.map((session) => {
        if (!session.id) {
          session.id = this.generateSessionId();
        }

        if (!session.timestamp) {
          session.timestamp = new Date().getTime();
        }

        if (!session.messages) {
          session.messages = [];
        }

        return session;
      });

      return importedSessions;
    } catch (error) {
      throw new Error(`JSON 导入失败: ${error.message}`);
    }
  }

  /**
   * 导入 Markdown 会话文件（尝试解析）
   * @param {string} markdownContent - Markdown 文本
   * @returns {array} 导入的会话数组
   */
  importSessionsFromMarkdown(markdownContent) {
    try {
      const sessions = [];
      const lines = markdownContent.split('\n');
      let currentSession = null;
      let currentMessage = null;
      let currentRole = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 检测会话标题（## 格式）
        if (line.startsWith('## ')) {
          if (currentSession) {
            if (currentMessage) {
              currentSession.messages.push({
                role: currentRole,
                content: currentMessage.trim()
              });
            }
            sessions.push(currentSession);
          }

          const title = line.replace(/^## \d+\.\s*/, '').trim();
          currentSession = {
            id: this.generateSessionId(),
            title: title || '导入的对话',
            timestamp: new Date().getTime(),
            messages: []
          };
          currentMessage = null;
          currentRole = null;
        }
        // 检测消息角色（### 格式）
        else if (line.startsWith('### ') && currentSession) {
          if (currentMessage) {
            currentSession.messages.push({
              role: currentRole,
              content: currentMessage.trim()
            });
          }
          currentRole = line.replace(/^### /, '').trim().toLowerCase();
          currentMessage = '';
        }
        // 积累消息内容
        else if (currentSession && !line.startsWith('#') && line.trim()) {
          if (currentMessage === null && currentRole) {
            currentMessage = '';
          }
          if (currentMessage !== null && currentRole) {
            currentMessage += (currentMessage ? '\n' : '') + line;
          }
        }
      }

      // 保存最后一条消息和会话
      if (currentSession) {
        if (currentMessage) {
          currentSession.messages.push({
            role: currentRole,
            content: currentMessage.trim()
          });
        }
        sessions.push(currentSession);
      }

      return sessions;
    } catch (error) {
      throw new Error(`Markdown 导入失败: ${error.message}`);
    }
  }

  /**
   * 将会话保存到文件（触发下载）
   * @param {string} filename - 文件名
   * @param {string} content - 文件内容
   * @param {string} mimeType - MIME 类型
   */
  downloadFile(filename, content, mimeType = 'text/plain') {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(`下载失败: ${error.message}`);
    }
  }

  /**
   * 从文件读取内容（使用 File API）
   * @param {File} file - 文件对象
   * @returns {Promise<string>} 文件内容
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }

  /**
   * 生成会话 ID
   * @returns {string} 新的会话 ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Markdown 转义
   * @param {string} text - 文本
   * @returns {string} 转义后的文本
   */
  escapeMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&')
      .replace(/\n/g, '  \n'); // Markdown 换行
  }

  /**
   * 导出统计信息
   * @param {array} sessions - 会话数组
   * @returns {object} 统计信息
   */
  getExportStats(sessions) {
    const stats = {
      totalSessions: sessions.length,
      totalMessages: 0,
      totalWords: 0,
      totalCharacters: 0,
      oldestSession: null,
      newestSession: null,
      averageMessagesPerSession: 0
    };

    sessions.forEach((session) => {
      const messageCount = (session.messages || []).length;
      stats.totalMessages += messageCount;

      (session.messages || []).forEach((msg) => {
        const content = msg.content || '';
        stats.totalWords += content.split(/\s+/).length;
        stats.totalCharacters += content.length;
      });

      if (!stats.oldestSession || session.timestamp < stats.oldestSession.timestamp) {
        stats.oldestSession = session;
      }

      if (!stats.newestSession || session.timestamp > stats.newestSession.timestamp) {
        stats.newestSession = session;
      }
    });

    if (stats.totalSessions > 0) {
      stats.averageMessagesPerSession = Math.round(stats.totalMessages / stats.totalSessions);
    }

    return stats;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionExportImportManager;
}

