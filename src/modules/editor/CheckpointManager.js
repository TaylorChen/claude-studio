/**
 * CheckpointManager - 检查点管理器
 * 负责记录代码编辑历史、创建检查点、回退代码
 * MVP-4.1 & MVP-4.2 实施
 */

class CheckpointManager {
  constructor() {
    this.checkpoints = [];  // 所有检查点
    this.currentBranch = 'main';  // 当前分支
    this.branches = { main: [] };  // 分支管理
    this.maxCheckpoints = 50;  // 最多保存50个检查点
    this.autoSaveEnabled = true;  // 是否自动创建检查点
    this.initialized = false;
  }

  /**
   * 初始化检查点管理器
   */
  async init() {
    try {
      await this.loadCheckpoints();
      this.initialized = true;
      console.log('✓ 检查点管理器已初始化');
    } catch (error) {
      console.error('❌ 检查点管理器初始化失败:', error);
      this.checkpoints = [];
      this.initialized = true;
    }
  }

  /**
   * 创建检查点
   * @param {Object} options - 检查点选项
   * @param {string} options.filePath - 文件路径
   * @param {string} options.content - 文件内容
   * @param {string} options.language - 语言类型
   * @param {string} options.changeType - 变更类型 (edit, ai-edit, manual, save)
   * @param {string} options.description - 检查点描述
   * @param {boolean} options.manual - 是否手动创建
   * @returns {Object} 创建的检查点对象
   */
  createCheckpoint(options) {
    const {
      filePath,
      content,
      language = 'plaintext',
      changeType = 'edit',
      description = '',
      manual = false
    } = options;

    if (!filePath || content === undefined) {
      console.warn('⚠️ 创建检查点失败: 缺少必要参数');
      return null;
    }

    // 如果自动保存已禁用且不是手动创建,则跳过
    if (!this.autoSaveEnabled && !manual) {
      return null;
    }

    const checkpoint = {
      id: this.generateId(),
      filePath,
      content,
      language,
      changeType,
      description: description || this.generateDescription(changeType),
      timestamp: Date.now(),
      branch: this.currentBranch,
      manual,
      metadata: {
        lines: content.split('\n').length,
        size: content.length,
        hash: this.hashContent(content)
      }
    };

    // 添加到当前分支
    if (!this.branches[this.currentBranch]) {
      this.branches[this.currentBranch] = [];
    }
    this.branches[this.currentBranch].push(checkpoint);

    // 添加到总列表
    this.checkpoints.unshift(checkpoint);

    // 限制检查点数量
    if (this.checkpoints.length > this.maxCheckpoints) {
      const removed = this.checkpoints.pop();
      // 同时从分支中移除
      const branchCheckpoints = this.branches[removed.branch];
      if (branchCheckpoints) {
        const index = branchCheckpoints.findIndex(cp => cp.id === removed.id);
        if (index >= 0) {
          branchCheckpoints.splice(index, 1);
        }
      }
    }

    // 持久化
    this.saveCheckpoints().catch(err => {
      console.error('❌ 保存检查点失败:', err);
    });

    console.log(`✓ 创建检查点: ${checkpoint.description} (${filePath})`);
    return checkpoint;
  }

  /**
   * 获取文件的所有检查点
   * @param {string} filePath - 文件路径
   * @returns {Array} 检查点数组
   */
  getCheckpointsForFile(filePath) {
    return this.checkpoints.filter(cp => cp.filePath === filePath);
  }

  /**
   * 获取特定检查点
   * @param {string} checkpointId - 检查点 ID
   * @returns {Object|null} 检查点对象
   */
  getCheckpoint(checkpointId) {
    return this.checkpoints.find(cp => cp.id === checkpointId);
  }

  /**
   * 回退到指定检查点
   * @param {string} checkpointId - 检查点 ID
   * @returns {Object|null} { success, content, checkpoint }
   */
  restoreCheckpoint(checkpointId) {
    const checkpoint = this.getCheckpoint(checkpointId);
    if (!checkpoint) {
      console.warn('⚠️ 检查点不存在:', checkpointId);
      return null;
    }

    console.log(`↺ 恢复检查点: ${checkpoint.description}`);
    return {
      success: true,
      content: checkpoint.content,
      checkpoint
    };
  }

  /**
   * 删除检查点
   * @param {string} checkpointId - 检查点 ID
   * @returns {boolean} 是否成功删除
   */
  deleteCheckpoint(checkpointId) {
    const index = this.checkpoints.findIndex(cp => cp.id === checkpointId);
    if (index < 0) {
      return false;
    }

    const checkpoint = this.checkpoints[index];
    
    // 从总列表删除
    this.checkpoints.splice(index, 1);

    // 从分支删除
    const branchCheckpoints = this.branches[checkpoint.branch];
    if (branchCheckpoints) {
      const branchIndex = branchCheckpoints.findIndex(cp => cp.id === checkpointId);
      if (branchIndex >= 0) {
        branchCheckpoints.splice(branchIndex, 1);
      }
    }

    this.saveCheckpoints().catch(err => {
      console.error('❌ 保存检查点失败:', err);
    });

    return true;
  }

  /**
   * 清空所有检查点
   * @param {string} filePath - 可选,仅清空指定文件的检查点
   */
  clearCheckpoints(filePath = null) {
    if (filePath) {
      // 清空指定文件的检查点
      this.checkpoints = this.checkpoints.filter(cp => cp.filePath !== filePath);
      // 同时从分支中移除
      Object.keys(this.branches).forEach(branch => {
        this.branches[branch] = this.branches[branch].filter(cp => cp.filePath !== filePath);
      });
    } else {
      // 清空所有检查点
      this.checkpoints = [];
      this.branches = { main: [] };
      this.currentBranch = 'main';
    }

    this.saveCheckpoints().catch(err => {
      console.error('❌ 保存检查点失败:', err);
    });
  }

  /**
   * 比较两个检查点的差异
   * @param {string} checkpointId1 - 检查点1 ID
   * @param {string} checkpointId2 - 检查点2 ID (可选,默认为当前内容)
   * @returns {Object} { additions, deletions, changes }
   */
  compareCheckpoints(checkpointId1, checkpointId2 = null) {
    const cp1 = this.getCheckpoint(checkpointId1);
    if (!cp1) {
      return null;
    }

    let content2;
    if (checkpointId2) {
      const cp2 = this.getCheckpoint(checkpointId2);
      if (!cp2) {
        return null;
      }
      content2 = cp2.content;
    } else {
      // 与当前编辑器内容比较
      if (window.editorManager && window.editorManager.editor) {
        content2 = window.editorManager.editor.getValue();
      } else {
        return null;
      }
    }

    return this.diffContent(cp1.content, content2);
  }

  /**
   * 计算内容差异
   * @param {string} content1 - 内容1
   * @param {string} content2 - 内容2
   * @returns {Object} 差异信息
   */
  diffContent(content1, content2) {
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');

    let additions = 0;
    let deletions = 0;
    let changes = 0;

    const maxLength = Math.max(lines1.length, lines2.length);
    for (let i = 0; i < maxLength; i++) {
      const line1 = lines1[i];
      const line2 = lines2[i];

      if (line1 === undefined) {
        additions++;
      } else if (line2 === undefined) {
        deletions++;
      } else if (line1 !== line2) {
        changes++;
      }
    }

    return {
      additions,
      deletions,
      changes,
      total: additions + deletions + changes
    };
  }

  /**
   * 创建新分支
   * @param {string} branchName - 分支名称
   * @param {string} fromBranch - 从哪个分支创建 (默认当前分支)
   * @returns {boolean} 是否成功创建
   */
  createBranch(branchName, fromBranch = null) {
    if (this.branches[branchName]) {
      console.warn('⚠️ 分支已存在:', branchName);
      return false;
    }

    const sourceBranch = fromBranch || this.currentBranch;
    if (!this.branches[sourceBranch]) {
      console.warn('⚠️ 源分支不存在:', sourceBranch);
      return false;
    }

    // 复制源分支的检查点
    this.branches[branchName] = [...this.branches[sourceBranch]];
    console.log(`✓ 创建分支: ${branchName} (从 ${sourceBranch})`);
    return true;
  }

  /**
   * 切换分支
   * @param {string} branchName - 分支名称
   * @returns {boolean} 是否成功切换
   */
  switchBranch(branchName) {
    if (!this.branches[branchName]) {
      console.warn('⚠️ 分支不存在:', branchName);
      return false;
    }

    this.currentBranch = branchName;
    console.log(`✓ 切换到分支: ${branchName}`);
    return true;
  }

  /**
   * 获取所有分支
   * @returns {Array} 分支名称数组
   */
  getBranches() {
    return Object.keys(this.branches);
  }

  /**
   * 获取分支的检查点
   * @param {string} branchName - 分支名称
   * @returns {Array} 检查点数组
   */
  getBranchCheckpoints(branchName) {
    return this.branches[branchName] || [];
  }

  /**
   * 加载检查点
   */
  async loadCheckpoints() {
    try {
      // 尝试从 IndexedDB 加载
      if (window.indexedDBManager && window.indexedDBManager.isSupported) {
        const data = await window.indexedDBManager.loadCheckpoints();
        if (data) {
          this.checkpoints = data.checkpoints || [];
          this.branches = data.branches || { main: [] };
          this.currentBranch = data.currentBranch || 'main';
          console.log(`✓ 从 IndexedDB 加载了 ${this.checkpoints.length} 个检查点`);
          return;
        }
      }

      // 降级到 localStorage
      const data = localStorage.getItem('claude_checkpoints');
      if (data) {
        const parsed = JSON.parse(data);
        this.checkpoints = parsed.checkpoints || [];
        this.branches = parsed.branches || { main: [] };
        this.currentBranch = parsed.currentBranch || 'main';
        console.log(`✓ 从 localStorage 加载了 ${this.checkpoints.length} 个检查点`);
      }
    } catch (error) {
      console.error('❌ 加载检查点失败:', error);
      throw error;
    }
  }

  /**
   * 保存检查点
   */
  async saveCheckpoints() {
    try {
      const data = {
        checkpoints: this.checkpoints,
        branches: this.branches,
        currentBranch: this.currentBranch,
        savedAt: Date.now()
      };

      // 优先保存到 IndexedDB
      if (window.indexedDBManager && window.indexedDBManager.isSupported && window.indexedDBManager.db) {
        const success = await window.indexedDBManager.saveCheckpoints(data);
        if (success) {
          console.log('💾 检查点已保存到 IndexedDB');
          // 同时保留 localStorage 备份
          localStorage.setItem('claude_checkpoints', JSON.stringify(data));
          return;
        }
      }

      // 降级到 localStorage
      localStorage.setItem('claude_checkpoints', JSON.stringify(data));
      console.log('💾 检查点已保存到 localStorage');
    } catch (error) {
      console.error('❌ 保存检查点失败:', error);
    }
  }

  /**
   * 导出检查点历史
   * @param {string} filePath - 可选,仅导出指定文件的检查点
   * @returns {Object} 导出的数据
   */
  exportCheckpoints(filePath = null) {
    let checkpointsToExport = this.checkpoints;
    if (filePath) {
      checkpointsToExport = this.checkpoints.filter(cp => cp.filePath === filePath);
    }

    return {
      checkpoints: checkpointsToExport,
      branches: this.branches,
      currentBranch: this.currentBranch,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * 导入检查点
   * @param {Object} data - 导入的数据
   * @returns {boolean} 是否成功导入
   */
  importCheckpoints(data) {
    try {
      if (!data.checkpoints || !Array.isArray(data.checkpoints)) {
        console.warn('⚠️ 无效的检查点数据');
        return false;
      }

      // 合并检查点 (避免重复)
      const existingIds = new Set(this.checkpoints.map(cp => cp.id));
      const newCheckpoints = data.checkpoints.filter(cp => !existingIds.has(cp.id));
      
      this.checkpoints = [...newCheckpoints, ...this.checkpoints];

      // 合并分支
      if (data.branches) {
        Object.keys(data.branches).forEach(branch => {
          if (!this.branches[branch]) {
            this.branches[branch] = data.branches[branch];
          }
        });
      }

      this.saveCheckpoints().catch(err => {
        console.error('❌ 保存检查点失败:', err);
      });

      console.log(`✓ 导入了 ${newCheckpoints.length} 个检查点`);
      return true;
    } catch (error) {
      console.error('❌ 导入检查点失败:', error);
      return false;
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      totalCheckpoints: this.checkpoints.length,
      branches: this.getBranches().length,
      currentBranch: this.currentBranch,
      fileCount: new Set(this.checkpoints.map(cp => cp.filePath)).size,
      manualCheckpoints: this.checkpoints.filter(cp => cp.manual).length,
      autoCheckpoints: this.checkpoints.filter(cp => !cp.manual).length,
      oldestCheckpoint: this.checkpoints.length > 0 
        ? this.checkpoints[this.checkpoints.length - 1].timestamp 
        : null,
      newestCheckpoint: this.checkpoints.length > 0 
        ? this.checkpoints[0].timestamp 
        : null
    };
  }

  /**
   * 生成检查点 ID
   * @returns {string} 唯一ID
   */
  generateId() {
    return `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成检查点描述
   * @param {string} changeType - 变更类型
   * @returns {string} 描述文本
   */
  generateDescription(changeType) {
    const descriptions = {
      'edit': '手动编辑',
      'ai-edit': 'AI 编辑',
      'manual': '手动保存',
      'save': '文件保存',
      'auto': '自动保存'
    };
    return descriptions[changeType] || '代码变更';
  }

  /**
   * 计算内容哈希 (简单实现)
   * @param {string} content - 内容
   * @returns {string} 哈希值
   */
  hashContent(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * 启用/禁用自动保存
   * @param {boolean} enabled - 是否启用
   */
  setAutoSave(enabled) {
    this.autoSaveEnabled = enabled;
    console.log(`${enabled ? '✓ 启用' : '✕ 禁用'}自动保存检查点`);
  }

  /**
   * 设置最大检查点数量
   * @param {number} max - 最大数量
   */
  setMaxCheckpoints(max) {
    if (max < 1 || max > 200) {
      console.warn('⚠️ 最大检查点数量必须在 1-200 之间');
      return;
    }
    this.maxCheckpoints = max;
    console.log(`✓ 设置最大检查点数量: ${max}`);
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CheckpointManager;
}

