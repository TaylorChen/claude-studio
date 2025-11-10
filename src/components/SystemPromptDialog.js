/**
 * 系统提示设置对话框
 * 提供系统提示的配置和管理界面
 * MVP-2.1 实施
 */

class SystemPromptDialog {
  constructor(promptManager) {
    this.promptManager = promptManager;
    this.isOpen = false;
    this.currentTab = 'preset'; // 'preset', 'custom', 'editor'
  }

  /**
   * 打开提示设置对话框
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
    const dialog = document.getElementById('system-prompt-dialog');
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
    dialog.id = 'system-prompt-dialog';
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
    content.className = 'system-prompt-modal';
    content.style.cssText = `
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      width: 90%;
      max-width: 800px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease;
    `;

    // 头部
    content.innerHTML = `
      <div class="prompt-dialog-header" style="padding: 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0; font-size: 18px;">🎯 系统提示设置</h2>
        <button class="prompt-dialog-close" style="background: none; border: none; color: var(--text-primary); cursor: pointer; font-size: 24px;">×</button>
      </div>

      <!-- 标签页 -->
      <div class="prompt-tabs" style="display: flex; gap: 0; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary);">
        <button class="prompt-tab active" data-tab="preset" style="flex: 1; padding: 12px; background: transparent; border: none; color: var(--text-primary); cursor: pointer; border-bottom: 2px solid var(--accent);">
          📚 预设模式
        </button>
        <button class="prompt-tab" data-tab="custom" style="flex: 1; padding: 12px; background: transparent; border: none; color: var(--text-secondary); cursor: pointer;">
          💾 自定义
        </button>
        <button class="prompt-tab" data-tab="editor" style="flex: 1; padding: 12px; background: transparent; border: none; color: var(--text-secondary); cursor: pointer;">
          ✏️ 编辑器
        </button>
      </div>

      <!-- 内容区域 -->
      <div class="prompt-content" style="flex: 1; overflow-y: auto; padding: 20px;">
        <div id="preset-tab" class="prompt-tab-content" style="display: block;">
          ${this.renderPresetTab()}
        </div>
        <div id="custom-tab" class="prompt-tab-content" style="display: none;">
          ${this.renderCustomTab()}
        </div>
        <div id="editor-tab" class="prompt-tab-content" style="display: none;">
          ${this.renderEditorTab()}
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="prompt-dialog-footer" style="padding: 15px 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 10px;">
        <button class="prompt-btn-cancel" style="padding: 8px 20px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px; cursor: pointer;">
          取消
        </button>
        <button class="prompt-btn-save" style="padding: 8px 20px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer;">
          保存设置
        </button>
      </div>
    `;

    document.body.appendChild(dialog);
    dialog.appendChild(content);
  }

  /**
   * 渲染预设标签页
   */
  renderPresetTab() {
    const presets = this.promptManager.getPresetPrompts();
    const currentPrompt = this.promptManager.getCurrentPrompt();

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
        ${presets.map(preset => `
          <div class="preset-card ${currentPrompt?.id === preset.id ? 'active' : ''}" 
               data-preset-id="${preset.id}"
               style="
                 padding: 15px;
                 border: 2px solid ${currentPrompt?.id === preset.id ? 'var(--accent)' : 'var(--border-color)'};
                 border-radius: 6px;
                 background: var(--bg-secondary);
                 cursor: pointer;
                 transition: all 0.2s;
               ">
            <div style="font-weight: 500; margin-bottom: 8px;">${preset.name}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 10px;">
              ${preset.description}
            </div>
            <div style="font-size: 11px; color: var(--text-dim);">
              ${this.promptManager.getPromptSummary(preset.content, 80)}
            </div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 20px; padding: 15px; background: var(--bg-secondary); border-radius: 6px;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px;">当前选择的提示：</h4>
        <div id="preset-current-info" style="padding: 10px; background: var(--bg-primary); border-radius: 4px; font-size: 12px; color: var(--text-secondary);">
          ${this.promptManager.getCurrentPrompt().name}
        </div>
      </div>
    `;
  }

  /**
   * 渲染自定义标签页
   */
  renderCustomTab() {
    const customPrompts = this.promptManager.getCustomPrompts();

    if (customPrompts.length === 0) {
      return `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
          <p style="font-size: 14px; margin-bottom: 20px;">📭 还没有自定义提示</p>
          <p style="font-size: 12px; color: var(--text-dim);">
            点击"编辑器"标签页创建你的自定义提示
          </p>
        </div>
      `;
    }

    return `
      <div style="display: grid; gap: 10px;">
        ${customPrompts.map((prompt, index) => `
          <div class="custom-prompt-item" 
               data-prompt-id="${prompt.id}"
               style="
                 padding: 15px;
                 border: 1px solid var(--border-color);
                 border-radius: 6px;
                 background: var(--bg-secondary);
                 display: flex;
                 justify-content: space-between;
                 align-items: center;
               ">
            <div style="flex: 1;">
              <div style="font-weight: 500; margin-bottom: 5px;">${prompt.name}</div>
              <div style="font-size: 12px; color: var(--text-secondary);">
                ${this.promptManager.getPromptSummary(prompt.content, 100)}
              </div>
              <div style="font-size: 11px; color: var(--text-dim); margin-top: 5px;">
                创建于: ${new Date(prompt.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
            <div style="display: flex; gap: 8px; margin-left: 15px;">
              <button class="custom-use-btn" data-prompt-id="${prompt.id}" style="padding: 6px 12px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                使用
              </button>
              <button class="custom-delete-btn" data-prompt-id="${prompt.id}" style="padding: 6px 12px; background: var(--error); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                删除
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * 渲染编辑器标签页
   */
  renderEditorTab() {
    const currentPrompt = this.promptManager.getCurrentPrompt();

    return `
      <div style="display: flex; flex-direction: column; gap: 15px; height: 100%;">
        <div>
          <label style="display: block; margin-bottom: 8px; font-size: 14px;">提示名称：</label>
          <input type="text" 
                 id="prompt-name-input" 
                 value="${currentPrompt?.name || ''}"
                 placeholder="输入提示名称"
                 style="
                   width: 100%;
                   padding: 8px 12px;
                   background: var(--bg-secondary);
                   border: 1px solid var(--border-color);
                   color: var(--text-primary);
                   border-radius: 4px;
                   font-size: 13px;
                   box-sizing: border-box;
                 ">
        </div>

        <div style="flex: 1; display: flex; flex-direction: column;">
          <label style="display: block; margin-bottom: 8px; font-size: 14px;">
            提示内容：(字数限制: 5000)
          </label>
          <textarea id="prompt-content-input" 
                    placeholder="输入你的自定义系统提示..."
                    style="
                      flex: 1;
                      padding: 12px;
                      background: var(--bg-secondary);
                      border: 1px solid var(--border-color);
                      color: var(--text-primary);
                      border-radius: 4px;
                      font-size: 13px;
                      font-family: 'Monaco', 'Courier New', monospace;
                      resize: none;
                      box-sizing: border-box;
                    ">${currentPrompt?.content || ''}</textarea>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button class="editor-clear-btn" style="padding: 8px 16px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px; cursor: pointer; font-size: 12px;">
            清空
          </button>
          <button class="editor-save-as-btn" style="padding: 8px 16px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            保存为自定义提示
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 绑定事件处理器
   */
  attachEvents() {
    // 关闭按钮
    const closeBtn = document.querySelector('.prompt-dialog-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // 取消按钮
    const cancelBtn = document.querySelector('.prompt-btn-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }

    // 标签页切换
    document.querySelectorAll('.prompt-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // 预设卡片点击
    document.querySelectorAll('.preset-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const presetId = card.dataset.presetId;
        this.selectPreset(presetId);
      });
    });

    // 自定义提示操作
    document.querySelectorAll('.custom-use-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const promptId = btn.dataset.promptId;
        this.useCustomPrompt(promptId);
      });
    });

    document.querySelectorAll('.custom-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const promptId = btn.dataset.promptId;
        if (confirm('确定要删除这个提示吗？')) {
          this.deleteCustomPrompt(promptId);
        }
      });
    });

    // 编辑器操作
    const clearBtn = document.querySelector('.editor-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const contentInput = document.getElementById('prompt-content-input');
        if (contentInput) contentInput.value = '';
      });
    }

    const saveAsBtn = document.querySelector('.editor-save-as-btn');
    if (saveAsBtn) {
      saveAsBtn.addEventListener('click', () => this.saveAsCustom());
    }

    // 保存设置按钮
    const saveBtn = document.querySelector('.prompt-btn-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveSettings());
    }

    // 背景点击关闭
    const dialog = document.getElementById('system-prompt-dialog');
    if (dialog) {
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          this.close();
        }
      });
    }
  }

  /**
   * 切换标签页
   */
  switchTab(tabName) {
    // 隐藏所有标签内容
    document.querySelectorAll('.prompt-tab-content').forEach(content => {
      content.style.display = 'none';
    });

    // 移除所有标签的 active 类
    document.querySelectorAll('.prompt-tab').forEach(tab => {
      tab.classList.remove('active');
      tab.style.color = 'var(--text-secondary)';
      tab.style.borderBottom = 'none';
    });

    // 显示选中标签
    const content = document.getElementById(`${tabName}-tab`);
    if (content) content.style.display = 'block';

    // 标记选中的标签
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
      activeTab.style.color = 'var(--text-primary)';
      activeTab.style.borderBottom = '2px solid var(--accent)';
    }

    this.currentTab = tabName;
  }

  /**
   * 选择预设提示
   */
  selectPreset(presetId) {
    try {
      this.promptManager.switchToPreset(presetId);
      this.showNotification('✓ 已切换到预设提示');
      
      // 更新 UI
      document.querySelectorAll('.preset-card').forEach(card => {
        card.style.borderColor = card.dataset.presetId === presetId ? 'var(--accent)' : 'var(--border-color)';
        card.classList.toggle('active', card.dataset.presetId === presetId);
      });

      const currentInfo = document.getElementById('preset-current-info');
      if (currentInfo) {
        currentInfo.textContent = this.promptManager.getCurrentPrompt().name;
      }
    } catch (error) {
      this.showNotification('❌ ' + error.message);
    }
  }

  /**
   * 使用自定义提示
   */
  useCustomPrompt(promptId) {
    try {
      this.promptManager.switchToCustom(promptId);
      this.showNotification('✓ 已切换到自定义提示');
    } catch (error) {
      this.showNotification('❌ ' + error.message);
    }
  }

  /**
   * 删除自定义提示
   */
  deleteCustomPrompt(promptId) {
    try {
      this.promptManager.deleteCustomPrompt(promptId);
      this.showNotification('✓ 提示已删除');
      
      // 重新渲染自定义标签页
      const customTab = document.getElementById('custom-tab');
      if (customTab) {
        customTab.innerHTML = this.renderCustomTab();
        this.attachCustomTabEvents();
      }
    } catch (error) {
      this.showNotification('❌ ' + error.message);
    }
  }

  /**
   * 保存为自定义提示
   */
  saveAsCustom() {
    const nameInput = document.getElementById('prompt-name-input');
    const contentInput = document.getElementById('prompt-content-input');

    if (!nameInput || !contentInput) return;

    const name = nameInput.value.trim();
    const content = contentInput.value.trim();

    // 验证
    const validation = this.promptManager.validatePrompt(content);
    if (!validation.valid) {
      this.showNotification('❌ ' + validation.error);
      return;
    }

    if (!name) {
      this.showNotification('❌ 提示名称不能为空');
      return;
    }

    try {
      const prompt = this.promptManager.createCustomPrompt(name, content);
      this.showNotification('✓ 已保存为自定义提示');
      
      // 切换到自定义标签页
      setTimeout(() => this.switchTab('custom'), 500);
    } catch (error) {
      this.showNotification('❌ ' + error.message);
    }
  }

  /**
   * 保存设置
   */
  saveSettings() {
    this.promptManager.savePrompts();
    this.showNotification('✓ 设置已保存');
    setTimeout(() => this.close(), 500);
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

  /**
   * 附加自定义标签事件
   */
  attachCustomTabEvents() {
    document.querySelectorAll('.custom-use-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const promptId = btn.dataset.promptId;
        this.useCustomPrompt(promptId);
      });
    });

    document.querySelectorAll('.custom-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const promptId = btn.dataset.promptId;
        if (confirm('确定要删除这个提示吗？')) {
          this.deleteCustomPrompt(promptId);
        }
      });
    });
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SystemPromptDialog;
}

