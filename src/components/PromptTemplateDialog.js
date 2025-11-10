/**
 * 提示模板库对话框
 * 展示和管理提示模板库
 * MVP-2.2 实施
 */

class PromptTemplateDialog {
  constructor(templateLibrary, promptManager) {
    this.templateLibrary = templateLibrary;
    this.promptManager = promptManager;
    this.isOpen = false;
    this.currentView = 'browse'; // 'browse', 'category', 'search', 'favorites'
    this.currentCategory = null;
    this.searchQuery = '';
  }

  /**
   * 打开模板库对话框
   */
  open() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.renderDialog();
    this.attachEvents();
  }

  /**
   * 关闭对话框
   */
  close() {
    const dialog = document.getElementById('template-library-dialog');
    if (dialog) {
      dialog.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        if (dialog.parentNode) {
          document.body.removeChild(dialog);
        }
        this.isOpen = false;
      }, 300);
    }
  }

  /**
   * 渲染对话框
   */
  renderDialog() {
    const dialog = document.createElement('div');
    dialog.id = 'template-library-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    `;

    const content = document.createElement('div');
    content.className = 'template-library-modal';
    content.style.cssText = `
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      width: 95%;
      max-width: 1000px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease;
    `;

    content.innerHTML = `
      <!-- 头部 -->
      <div class="template-header" style="padding: 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0; font-size: 18px;">📚 提示模板库</h2>
        <button class="template-dialog-close" style="background: none; border: none; color: var(--text-primary); cursor: pointer; font-size: 24px;">×</button>
      </div>

      <!-- 导航栏 -->
      <div class="template-nav" style="display: flex; gap: 10px; padding: 15px 20px; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary); flex-wrap: wrap;">
        <button class="template-nav-btn active" data-view="browse" style="padding: 8px 16px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
          🏠 浏览
        </button>
        <button class="template-nav-btn" data-view="favorites" style="padding: 8px 16px; background: transparent; border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px; cursor: pointer; font-size: 12px;">
          ⭐ 收藏 (${this.templateLibrary.favorites.length})
        </button>
        <button class="template-nav-btn" data-view="popular" style="padding: 8px 16px; background: transparent; border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px; cursor: pointer; font-size: 12px;">
          🔥 热门
        </button>
        <div style="flex: 1; display: flex; gap: 5px; margin-left: 10px;">
          <input type="text" id="template-search-input" placeholder="搜索模板..." style="flex: 1; padding: 8px 12px; background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px; font-size: 12px;">
          <button style="padding: 8px 12px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            🔍 搜索
          </button>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="template-content" style="flex: 1; overflow-y: auto; padding: 20px;">
        ${this.renderBrowseView()}
      </div>
    `;

    document.body.appendChild(dialog);
    dialog.appendChild(content);
  }

  /**
   * 渲染浏览视图
   */
  renderBrowseView() {
    const categories = this.templateLibrary.getCategoryStats();
    
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
        ${categories.map(cat => `
          <div class="category-card" data-category="${cat.id}" 
               style="
                 padding: 20px;
                 border: 2px solid var(--border-color);
                 border-radius: 8px;
                 background: var(--bg-secondary);
                 cursor: pointer;
                 transition: all 0.2s;
                 text-align: center;
               ">
            <div style="font-size: 32px; margin-bottom: 10px;">${cat.icon}</div>
            <div style="font-weight: 500; margin-bottom: 5px;">${cat.name}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 5px;">
              ${cat.count} 个模板
            </div>
            <div style="font-size: 12px; color: var(--text-dim);">
              ⭐ ${cat.avgRating}
            </div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 30px;">
        <h3 style="margin: 0 0 15px 0; font-size: 14px;">🔥 热门模板</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
          ${this.templateLibrary.getPopularTemplates(6).map(template => this.renderTemplateCard(template)).join('')}
        </div>
      </div>

      <div style="margin-top: 30px;">
        <h3 style="margin: 0 0 15px 0; font-size: 14px;">⭐ 评分最高</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
          ${this.templateLibrary.getTopRatedTemplates(6).map(template => this.renderTemplateCard(template)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 渲染模板卡片
   */
  renderTemplateCard(template) {
    const isFavorite = this.templateLibrary.isFavorite(template.id);
    return `
      <div class="template-card" data-template-id="${template.id}"
           style="
             padding: 15px;
             border: 1px solid var(--border-color);
             border-radius: 6px;
             background: var(--bg-secondary);
             cursor: pointer;
             transition: all 0.2s;
           ">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <div style="flex: 1;">
            <div style="font-weight: 500; margin-bottom: 3px;">${template.name}</div>
            <div style="font-size: 12px; color: var(--text-secondary);">
              ${template.description}
            </div>
          </div>
          <button class="favorite-btn" data-template-id="${template.id}" 
                  style="background: none; border: none; cursor: pointer; font-size: 16px; padding: 0; margin-left: 10px;">
            ${isFavorite ? '⭐' : '☆'}
          </button>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 12px; color: var(--text-secondary);">
          <div>⭐ ${template.rating} | 📥 ${template.downloads}</div>
          <div>${template.category}</div>
        </div>
        
        <button class="use-template-btn" data-template-id="${template.id}"
                style="width: 100%; padding: 8px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
          使用此模板
        </button>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  attachEvents() {
    // 关闭按钮
    const closeBtn = document.querySelector('.template-dialog-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // 导航按钮
    document.querySelectorAll('.template-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        if (view) this.switchView(view);
      });
    });

    // 分类卡片
    document.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const categoryId = card.dataset.category;
        this.showCategoryTemplates(categoryId);
      });
    });

    // 使用模板按钮
    document.querySelectorAll('.use-template-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const templateId = btn.dataset.templateId;
        this.useTemplate(templateId);
      });
    });

    // 收藏按钮
    document.querySelectorAll('.favorite-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const templateId = btn.dataset.templateId;
        this.toggleFavorite(templateId);
      });
    });

    // 搜索输入
    const searchInput = document.getElementById('template-search-input');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.search(searchInput.value);
        }
      });
    }

    // 背景点击关闭
    const dialog = document.getElementById('template-library-dialog');
    if (dialog) {
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          this.close();
        }
      });
    }
  }

  /**
   * 切换视图
   */
  switchView(view) {
    this.currentView = view;
    const contentArea = document.querySelector('.template-content');
    if (!contentArea) return;

    let content = '';
    if (view === 'browse') {
      content = this.renderBrowseView();
    } else if (view === 'favorites') {
      content = this.renderFavoritesView();
    } else if (view === 'popular') {
      content = this.renderPopularView();
    }

    contentArea.innerHTML = content;
    this.attachEvents();

    // 更新按钮状态
    document.querySelectorAll('.template-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
      if (btn.dataset.view === view) {
        btn.style.background = 'var(--accent)';
        btn.style.color = 'white';
        btn.style.borderColor = 'var(--accent)';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text-primary)';
        btn.style.borderColor = 'var(--border-color)';
      }
    });
  }

  /**
   * 渲染收藏视图
   */
  renderFavoritesView() {
    const favorites = this.templateLibrary.getFavoriteTemplates();
    
    if (favorites.length === 0) {
      return `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
          <p style="font-size: 14px;">📭 还没有收藏的模板</p>
        </div>
      `;
    }

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
        ${favorites.map(template => this.renderTemplateCard(template)).join('')}
      </div>
    `;
  }

  /**
   * 渲染热门视图
   */
  renderPopularView() {
    const templates = this.templateLibrary.getPopularTemplates(20);
    
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
        ${templates.map(template => this.renderTemplateCard(template)).join('')}
      </div>
    `;
  }

  /**
   * 显示分类中的模板
   */
  showCategoryTemplates(categoryId) {
    this.currentCategory = categoryId;
    const category = this.templateLibrary.getCategoryById(categoryId);
    const templates = this.templateLibrary.getTemplatesByCategory(categoryId);
    
    const contentArea = document.querySelector('.template-content');
    if (!contentArea) return;

    contentArea.innerHTML = `
      <h3 style="margin: 0 0 20px 0; font-size: 16px;">
        ${category.icon} ${category.name} (${templates.length} 个模板)
      </h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
        ${templates.map(template => this.renderTemplateCard(template)).join('')}
      </div>
    `;

    this.attachEvents();
  }

  /**
   * 搜索模板
   */
  search(query) {
    this.searchQuery = query;
    const results = this.templateLibrary.searchTemplates(query);
    
    const contentArea = document.querySelector('.template-content');
    if (!contentArea) return;

    if (results.length === 0) {
      contentArea.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
          <p style="font-size: 14px;">🔍 未找到相关模板</p>
          <p style="font-size: 12px;">试试其他关键词</p>
        </div>
      `;
    } else {
      contentArea.innerHTML = `
        <h3 style="margin: 0 0 20px 0; font-size: 16px;">
          搜索结果: "${query}" (${results.length} 个模板)
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
          ${results.map(template => this.renderTemplateCard(template)).join('')}
        </div>
      `;
    }

    this.attachEvents();
  }

  /**
   * 使用模板
   */
  useTemplate(templateId) {
    const template = this.templateLibrary.getTemplateDetail(templateId);
    if (!template) {
      this.showNotification('❌ 模板不存在');
      return;
    }

    try {
      // 记录下载
      this.templateLibrary.recordDownload(templateId);

      // 切换到该模板
      const customPrompt = this.promptManager.createCustomPrompt(
        template.name,
        template.content
      );

      this.promptManager.switchToCustom(customPrompt.id);
      this.showNotification('✓ 已加载模板并创建为自定义提示');
      
      // 2 秒后关闭对话框
      setTimeout(() => this.close(), 1000);
    } catch (error) {
      this.showNotification('❌ ' + error.message);
    }
  }

  /**
   * 切换收藏
   */
  toggleFavorite(templateId) {
    try {
      if (this.templateLibrary.isFavorite(templateId)) {
        this.templateLibrary.removeFromFavorites(templateId);
        this.showNotification('✓ 已取消收藏');
      } else {
        this.templateLibrary.addToFavorites(templateId);
        this.showNotification('✓ 已添加到收藏');
      }

      // 更新按钮状态
      const btn = document.querySelector(`[data-template-id="${templateId}"].favorite-btn`);
      if (btn) {
        btn.textContent = this.templateLibrary.isFavorite(templateId) ? '⭐' : '☆';
      }
    } catch (error) {
      this.showNotification('❌ ' + error.message);
    }
  }

  /**
   * 显示通知
   */
  showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${message.includes('❌') ? '#ef4444' : '#4ade80'};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10001;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PromptTemplateDialog;
}

