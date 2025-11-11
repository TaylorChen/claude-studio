/**
 * 初始化 Markdown 库
 * 在 HTML 中动态加载本地 node_modules 的库
 */

(function() {

    // 动态加载 markdown-it 脚本
    function loadMarkdownIt() {
        return new Promise((resolve) => {
            // 临时禁用 AMD，避免与 Monaco 冲突
            const savedDefine = window.define;
            const savedRequire = window.require;
            delete window.define;
            delete window.require;
            
            const script = document.createElement('script');
            script.src = 'node_modules/markdown-it/dist/markdown-it.min.js';
            script.onload = function() {
                console.log('✓ markdown-it 脚本已加载');
                
                // 恢复 AMD
                window.define = savedDefine;
                window.require = savedRequire;
                
                // 检查库是否可用
                if (window.markdownit) {
                    console.log('✓ window.markdownit 已可用');
                    resolve(true);
                } else {
                    console.warn('⚠️ markdown-it 脚本加载成功但 window.markdownit 不可用，将使用降级模式');
                    resolve(false);
                }
            };
            script.onerror = function() {
                // 恢复 AMD
                window.define = savedDefine;
                window.require = savedRequire;
                resolve(false);
            };
            document.body.appendChild(script);
        });
    }

    // 动态加载 highlight.js 样式
    function loadHighlightStyle() {
        return new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'node_modules/highlight.js/styles/atom-one-dark.min.css';
            link.onload = function() {
                console.log('✓ highlight.js 样式已加载');
                resolve(true);
            };
            link.onerror = function() {
                resolve(false);
            };
            document.head.appendChild(link);
        });
    }

    // 动态加载 highlight.js 脚本
    function loadHighlightJs() {
        return new Promise((resolve) => {
            // 使用 CDN 的 UMD 构建（可靠且无模块问题）
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js';
            
            script.onload = function() {
                console.log('✓ highlight.js 已从 CDN 加载');
                if (window.hljs) {
                    console.log('✓ window.hljs 已可用');
                    resolve(true);
                } else {
                    console.warn('⚠️ highlight.js 加载成功但 window.hljs 不可用');
                    resolve(false);
                }
            };
            
            script.onerror = function(e) {
                console.warn('⚠️ 无法从 CDN 加载 highlight.js，将使用降级模式');
                resolve(false);
            };
            
            // 设置超时（以防 CDN 特别慢）
            const timeout = setTimeout(() => {
                console.warn('⚠️ highlight.js CDN 加载超时，使用降级模式');
                resolve(false);
            }, 3000);
            
            script.onload = (function(originalOnload) {
                return function() {
                    clearTimeout(timeout);
                    originalOnload.call(this);
                };
            })(script.onload);
            
            script.onerror = (function(originalOnerror) {
                return function(e) {
                    clearTimeout(timeout);
                    originalOnerror.call(this, e);
                };
            })(script.onerror);
            
            document.body.appendChild(script);
        });
    }

    // 按顺序加载所有库
    async function initAll() {
        try {
            // 先加载样式
            await loadHighlightStyle();
            
            // 并行加载脚本
            const mdResult = await loadMarkdownIt();
            const hlResult = await loadHighlightJs();

            window.markdownLibrariesReady = true;
            console.log('✓ Markdown 库初始化完成', {
                markdownit: mdResult,
                hljs: hlResult
            });
        } catch (e) {
            window.markdownLibrariesReady = false;
        }
    }

    // 文档加载完后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }
})();
