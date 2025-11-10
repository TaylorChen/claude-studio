/**
 * Markdown 渲染器 - 将 Markdown 文本渲染为 HTML
 * 支持代码高亮、表格、列表等常见 Markdown 特性
 */
class MarkdownRenderer {
    constructor() {
        // 检查 markdown-it 是否已加载
        if (!window.markdownit) {
            console.warn('⚠️ markdown-it 库未加载，使用降级处理');
            this.md = null;
            this.fallbackMode = true;
            return;
        }

        // 初始化 markdown-it
        this.md = window.markdownit({
            html: true,
            linkify: true,
            typographer: true,
            highlight: (str, lang) => {
                if (lang && window.hljs && window.hljs.getLanguage(lang)) {
                    try {
                        return window.hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
                    } catch (e) {
                        console.warn('⚠️ 代码高亮出错:', e);
                        return this.escapeHtml(str);
                    }
                }
                return this.escapeHtml(str);
            }
        });

        this.fallbackMode = false;
        console.log('✓ Markdown 渲染器初始化完成');
    }

    /**
     * 将 Markdown 文本转换为 HTML
     * @param {string} markdown - Markdown 文本
     * @returns {string} HTML 字符串
     */
    render(markdown) {
        try {
            if (!markdown) return '';
            
            // 降级模式：如果 markdown-it 未加载
            if (this.fallbackMode || !this.md) {
                console.warn('⚠️ 使用纯文本模式渲染');
                return this.renderFallback(markdown);
            }
            
            // 使用 markdown-it 渲染
            let html = this.md.render(markdown);
            
            // 后处理：添加样式类和优化
            html = this.postProcess(html);
            
            return html;
        } catch (error) {
            console.error('Markdown 渲染失败:', error);
            return this.renderFallback(markdown);
        }
    }

    /**
     * 降级渲染模式 - 简单的文本格式化
     */
    renderFallback(markdown) {
        let html = this.escapeHtml(markdown);
        
        // 基本的格式化
        html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
        html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
        html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        html = html.replace(/\n/g, '<br>');
        
        return `<div class="markdown-fallback">${html}</div>`;
    }

    /**
     * 后处理 HTML - 添加样式和优化
     */
    postProcess(html) {
        // 为表格添加样式类
        html = html.replace(/<table>/g, '<table class="markdown-table">');
        
        // 为代码块添加样式类
        html = html.replace(/<pre><code>/g, '<pre class="markdown-code"><code>');
        html = html.replace(/<pre class="hljs"><code>/g, '<pre class="markdown-code hljs"><code>');
        
        // 为链接添加样式
        html = html.replace(/<a href="/g, '<a class="markdown-link" href="');
        html = html.replace(/<a href='/g, '<a class="markdown-link" href=\'');
        
        // 为标题添加样式
        html = html.replace(/<h1>/g, '<h1 class="markdown-h1">');
        html = html.replace(/<h2>/g, '<h2 class="markdown-h2">');
        html = html.replace(/<h3>/g, '<h3 class="markdown-h3">');
        html = html.replace(/<h4>/g, '<h4 class="markdown-h4">');
        html = html.replace(/<h5>/g, '<h5 class="markdown-h5">');
        html = html.replace(/<h6>/g, '<h6 class="markdown-h6">');
        
        // 为列表添加样式
        html = html.replace(/<ul>/g, '<ul class="markdown-list">');
        html = html.replace(/<ol>/g, '<ol class="markdown-list-ordered">');
        
        // 为块引用添加样式
        html = html.replace(/<blockquote>/g, '<blockquote class="markdown-blockquote">');
        
        return html;
    }

    /**
     * 转义 HTML 特殊字符
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * 检测文本是否包含 Markdown 语法
     */
    isMarkdown(text) {
        if (!text) return false;
        
        // 检查常见 Markdown 语法
        const markdownPatterns = [
            /^#+\s/m,           // 标题
            /\*\*.*?\*\*/,       // 粗体
            /\*\*.*?\*\*/,       // 粗体
            /`.*?`/,             // 代码
            /```[\s\S]*?```/,    // 代码块
            /\[.*?\]\(.*?\)/,    // 链接
            /^[\*\-\+]\s/m,      // 无序列表
            /^>\s/m,             // 块引用
            /\|.*?\|.*?\|/,      // 表格
            /^---+$/m,           // 分隔线
        ];
        
        return markdownPatterns.some(pattern => pattern.test(text));
    }
}

// 全局实例化
window.markdownRenderer = new MarkdownRenderer();

