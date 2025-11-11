/**
 * 提示模板库管理器
 * 管理和组织系统提示的模板库
 * MVP-2.2 实施
 */

class PromptTemplateLibrary {
  constructor() {
    this.templates = [];
    this.categories = [];
    this.favorites = [];
    this.downloads = {};
    this.init();
  }

  /**
   * 初始化模板库
   */
  init() {
    this.loadTemplates();
    this.loadFavorites();
  }

  /**
   * 获取所有内置模板分类
   */
  getBuiltInCategories() {
    return [
      { id: 'programming', name: '编程开发', icon: '💻', color: '#007acc' },
      { id: 'writing', name: '创意写作', icon: '✍️', color: '#d946ef' },
      { id: 'analysis', name: '数据分析', icon: '📊', color: '#16a34a' },
      { id: 'education', name: '教育学习', icon: '🎓', color: '#f59e0b' },
      { id: 'business', name: '商业管理', icon: '💼', color: '#3b82f6' },
      { id: 'translation', name: '翻译转录', icon: '🌐', color: '#ec4899' },
      { id: 'content', name: '内容创建', icon: '📝', color: '#8b5cf6' },
      { id: 'customer', name: '客服支持', icon: '🤝', color: '#06b6d4' }
    ];
  }

  /**
   * 获取所有内置模板
   */
  getBuiltInTemplates() {
    return [
      // 编程开发
      {
        id: 'template_code_python',
        name: 'Python 专家',
        category: 'programming',
        description: '专精 Python 开发，关注最佳实践和性能',
        rating: 4.8,
        downloads: 1230,
        content: `You are an expert Python developer. Your responsibilities:
- Write clean, Pythonic code following PEP 8 standards
- Provide detailed explanations of code logic
- Suggest performance optimizations
- Help with debugging and testing
- Recommend appropriate libraries and frameworks`
      },
      {
        id: 'template_code_fullstack',
        name: 'Full-Stack 开发者',
        category: 'programming',
        description: '前后端全栈开发，精通现代技术栈',
        rating: 4.7,
        downloads: 890,
        content: `You are a full-stack web developer. You:
- Understand both frontend and backend architectures
- Help with database design and optimization
- Provide complete application solutions
- Suggest scalable architecture patterns
- Review code across the entire stack`
      },
      
      // 创意写作
      {
        id: 'template_write_novelist',
        name: '小说创作助手',
        category: 'writing',
        description: '专业小说写作，角色和故事创发',
        rating: 4.9,
        downloads: 2100,
        content: `You are a professional novelist and creative writing coach. Your role:
- Help develop compelling characters and storylines
- Provide constructive feedback on writing
- Suggest narrative techniques and structures
- Assist with worldbuilding and setting
- Maintain consistency in tone and voice`
      },
      {
        id: 'template_write_copywriter',
        name: '文案策划师',
        category: 'writing',
        description: '广告和营销文案专家',
        rating: 4.6,
        downloads: 1550,
        content: `You are an expert copywriter and marketing strategist. You:
- Create compelling marketing copy
- Understand consumer psychology
- Craft persuasive headlines and calls-to-action
- Analyze competitor messaging
- Optimize content for conversions`
      },
      
      // 数据分析
      {
        id: 'template_analysis_data',
        name: '数据科学家',
        category: 'analysis',
        description: '数据分析和机器学习专家',
        rating: 4.7,
        downloads: 980,
        content: `You are a professional data scientist. Your expertise includes:
- Statistical analysis and hypothesis testing
- Data visualization best practices
- Machine learning model selection
- Explaining complex results simply
- Recommending data-driven decisions`
      },
      
      // 教育学习
      {
        id: 'template_education_tutor',
        name: '个性化导师',
        category: 'education',
        description: '针对性教学，适应学生学习风格',
        rating: 4.8,
        downloads: 1680,
        content: `You are a personalized tutor adapting to each student's learning style. You:
- Assess understanding through questions
- Explain concepts at appropriate levels
- Use analogies and real-world examples
- Provide practice problems with solutions
- Build confidence progressively`
      },
      
      // 商业管理
      {
        id: 'template_business_consultant',
        name: '商业顾问',
        category: 'business',
        description: '战略规划和商业分析',
        rating: 4.6,
        downloads: 1120,
        content: `You are a strategic business consultant. You:
- Analyze business challenges systematically
- Identify growth opportunities
- Evaluate market trends
- Recommend strategic initiatives
- Focus on ROI and scalability`
      },
      
      // 翻译转录
      {
        id: 'template_translation_expert',
        name: '翻译专家',
        category: 'translation',
        description: '准确的多语言翻译',
        rating: 4.7,
        downloads: 1340,
        content: `You are a professional translator. You:
- Provide accurate translations
- Maintain tone and style
- Handle cultural nuances
- Preserve formatting and context
- Flag ambiguous phrases for clarification`
      },
      
      // 内容创建
      {
        id: 'template_content_blogger',
        name: '博客内容创作者',
        category: 'content',
        description: '吸引人的博客和文章写作',
        rating: 4.5,
        downloads: 890,
        content: `You are a professional blog writer and content creator. You:
- Research topics thoroughly
- Create engaging, scannable content
- Optimize for SEO
- Use storytelling techniques
- Adapt tone for target audience`
      },
      
      // 客服支持
      {
        id: 'template_customer_service',
        name: '客户服务代表',
        category: 'customer',
        description: '友好专业的客户支持',
        rating: 4.8,
        downloads: 1560,
        content: `You are a professional customer service representative. You:
- Handle inquiries with empathy
- Provide clear, helpful solutions
- Maintain professional tone
- Resolve conflicts peacefully
- Document interactions properly`
      }
    ];
  }

  /**
   * 搜索模板
   */
  searchTemplates(query, category = null) {
    let results = this.getBuiltInTemplates();

    if (category) {
      results = results.filter(t => t.category === category);
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.content.toLowerCase().includes(lowerQuery)
      );
    }

    return results;
  }

  /**
   * 获取分类下的模板
   */
  getTemplatesByCategory(categoryId) {
    return this.getBuiltInTemplates().filter(t => t.category === categoryId);
  }

  /**
   * 获取热门模板
   */
  getPopularTemplates(limit = 5) {
    return this.getBuiltInTemplates()
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }

  /**
   * 获取评分最高的模板
   */
  getTopRatedTemplates(limit = 5) {
    return this.getBuiltInTemplates()
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  /**
   * 添加到收藏
   */
  addToFavorites(templateId) {
    if (!this.favorites.includes(templateId)) {
      this.favorites.push(templateId);
      this.saveFavorites();
    }
  }

  /**
   * 从收藏移除
   */
  removeFromFavorites(templateId) {
    this.favorites = this.favorites.filter(id => id !== templateId);
    this.saveFavorites();
  }

  /**
   * 获取收藏的模板
   */
  getFavoriteTemplates() {
    const allTemplates = this.getBuiltInTemplates();
    return allTemplates.filter(t => this.favorites.includes(t.id));
  }

  /**
   * 检查是否收藏
   */
  isFavorite(templateId) {
    return this.favorites.includes(templateId);
  }

  /**
   * 记录下载
   */
  recordDownload(templateId) {
    if (!this.downloads[templateId]) {
      this.downloads[templateId] = 0;
    }
    this.downloads[templateId]++;
    this.saveDownloads();
  }

  /**
   * 获取模板详情
   */
  getTemplateDetail(templateId) {
    const template = this.getBuiltInTemplates().find(t => t.id === templateId);
    if (template) {
      return {
        ...template,
        isFavorite: this.isFavorite(templateId),
        category: this.getCategoryById(template.category)
      };
    }
    return null;
  }

  /**
   * 获取分类信息
   */
  getCategoryById(categoryId) {
    return this.getBuiltInCategories().find(c => c.id === categoryId);
  }

  /**
   * 获取推荐模板
   */
  getRecommendedTemplates() {
    const templates = this.getBuiltInTemplates();
    // 基于收藏和下载的推荐
    return templates
      .sort((a, b) => {
        const aScore = (b.rating * 0.4) + (b.downloads * 0.6);
        const bScore = (a.rating * 0.4) + (a.downloads * 0.6);
        return aScore - bScore;
      })
      .slice(0, 6);
  }

  /**
   * 获取分类统计
   */
  getCategoryStats() {
    const categories = this.getBuiltInCategories();
    const templates = this.getBuiltInTemplates();

    return categories.map(cat => ({
      ...cat,
      count: templates.filter(t => t.category === cat.id).length,
      avgRating: this.getAverageRatingForCategory(cat.id)
    }));
  }

  /**
   * 获取分类平均评分
   */
  getAverageRatingForCategory(categoryId) {
    const categoryTemplates = this.getTemplatesByCategory(categoryId);
    if (categoryTemplates.length === 0) return 0;
    const total = categoryTemplates.reduce((sum, t) => sum + t.rating, 0);
    return (total / categoryTemplates.length).toFixed(1);
  }

  /**
   * 导出模板为 JSON
   */
  exportTemplate(templateId) {
    const template = this.getTemplateDetail(templateId);
    if (!template) {
      throw new Error('模板不存在');
    }
    return {
      ...template,
      exportedAt: new Date().toISOString(),
      exportedBy: 'Claude Studio'
    };
  }

  /**
   * 获取库统计
   */
  getLibraryStats() {
    const templates = this.getBuiltInTemplates();
    return {
      totalTemplates: templates.length,
      totalCategories: this.getBuiltInCategories().length,
      averageRating: (templates.reduce((sum, t) => sum + t.rating, 0) / templates.length).toFixed(1),
      totalDownloads: templates.reduce((sum, t) => sum + t.downloads, 0),
      favoriteCount: this.favorites.length
    };
  }

  /**
   * 保存收藏
   */
  saveFavorites() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('claude_favorite_templates', JSON.stringify(this.favorites));
      }
    } catch (error) {
    }
  }

  /**
   * 加载收藏
   */
  loadFavorites() {
    try {
      if (typeof localStorage === 'undefined') return;
      const data = localStorage.getItem('claude_favorite_templates');
      if (data) {
        this.favorites = JSON.parse(data);
      }
    } catch (error) {
    }
  }

  /**
   * 保存下载统计
   */
  saveDownloads() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('claude_template_downloads', JSON.stringify(this.downloads));
      }
    } catch (error) {
    }
  }

  /**
   * 加载模板
   */
  loadTemplates() {
    this.templates = this.getBuiltInTemplates();
    this.categories = this.getBuiltInCategories();
  }

  /**
   * 获取模板列表的格式化显示
   */
  formatTemplatesList(templates) {
    return templates.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      rating: t.rating,
      downloads: t.downloads,
      isFavorite: this.isFavorite(t.id)
    }));
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PromptTemplateLibrary;
}

