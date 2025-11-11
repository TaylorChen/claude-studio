/**
 * IndexedDB 管理器 - 提供稳定的会话存储
 * 支持容量 100MB+，比 localStorage 更可靠
 */

class IndexedDBManager {
    constructor() {
        this.dbName = 'claude_studio';
        this.dbVersion = 1;
        this.storeName = 'sessions';
        this.db = null;
        this.isSupported = !!window.indexedDB;
        
    }

    /**
     * 初始化 IndexedDB
     */
    async init() {
        if (!this.isSupported) {
            console.warn('⚠️ IndexedDB 不受支持，将使用 localStorage');
            return false;
        }

        return new Promise((resolve) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                resolve(false);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✓ IndexedDB 已连接');
                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建 sessions 对象存储
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('updatedAt', 'updatedAt', { unique: false });
                    console.log('✓ Sessions 对象存储已创建');
                }
            };
        });
    }

    /**
     * 保存会话数据
     */
    async saveSessions(data) {
        if (!this.db) {
            console.warn('⚠️ IndexedDB 未初始化');
            return false;
        }

        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            // 清空旧数据
            store.clear();

            // 保存新数据
            const sessionData = {
                id: 'claude_ai_sessions',
                sessions: data.sessions,
                sessionOrder: data.sessionOrder,
                currentSessionId: data.currentSessionId,
                savedAt: new Date().toISOString(),
                version: 1
            };

            const request = store.add(sessionData);

            request.onerror = () => {
                resolve(false);
            };

            request.onsuccess = () => {
                console.log('✓ 会话已保存到 IndexedDB');
                resolve(true);
            };

            transaction.onerror = () => {
                resolve(false);
            };
        });
    }

    /**
     * 加载会话数据
     */
    async loadSessions() {
        if (!this.db) {
            console.warn('⚠️ IndexedDB 未初始化');
            return null;
        }

        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get('claude_ai_sessions');

            request.onerror = () => {
                resolve(null);
            };

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    console.log('✓ 会话已从 IndexedDB 加载');
                    resolve({
                        sessions: result.sessions,
                        sessionOrder: result.sessionOrder,
                        currentSessionId: result.currentSessionId
                    });
                } else {
                    console.log('ℹ️ IndexedDB 中没有保存的会话');
                    resolve(null);
                }
            };
        });
    }

    /**
     * 导出所有会话（用于备份）
     */
    async exportSessions() {
        if (!this.db) return null;

        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                resolve(null);
            };
        });
    }

    /**
     * 清空所有数据
     */
    async clearAllSessions() {
        if (!this.db) return false;

        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('✓ 所有会话已清空');
                resolve(true);
            };

            request.onerror = () => {
                resolve(false);
            };
        });
    }

    /**
     * 获取存储统计信息
     */
    async getStats() {
        if (!this.db) return null;

        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const countRequest = store.count();

            countRequest.onsuccess = () => {
                resolve({
                    recordCount: countRequest.result,
                    dbName: this.dbName,
                    storeName: this.storeName
                });
            };

            countRequest.onerror = () => {
                resolve(null);
            };
        });
    }

    /**
     * 从 localStorage 迁移数据
     */
    async migrateFromLocalStorage() {
        try {
            const localData = localStorage.getItem('claude_ai_sessions');
            if (!localData) {
                console.log('ℹ️ localStorage 中没有数据需要迁移');
                return false;
            }

            const parsed = JSON.parse(localData);
            const success = await this.saveSessions(parsed);
            
            if (success) {
                console.log('✓ 数据已从 localStorage 迁移到 IndexedDB');
                // 保留 localStorage 作为备份
                console.log('✓ localStorage 保留为备份');
                return true;
            }
            
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * 检查数据一致性
     */
    async verifyConsistency() {
        const indexedDBData = await this.loadSessions();
        const localStorageData = localStorage.getItem('claude_ai_sessions');

        if (!indexedDBData && !localStorageData) {
            console.log('ℹ️ 两个存储都为空');
            return { consistent: true, storage: 'empty' };
        }

        if (indexedDBData && !localStorageData) {
            console.log('ℹ️ 只有 IndexedDB 有数据（正常）');
            return { consistent: true, storage: 'indexeddb' };
        }

        if (!indexedDBData && localStorageData) {
            console.log('⚠️ 只有 localStorage 有数据，需要迁移');
            return { consistent: false, storage: 'localstorage' };
        }

        // 两个都有数据，比较是否相同
        const localParsed = JSON.parse(localStorageData);
        const idbSessionCount = Object.keys(indexedDBData.sessions || {}).length;
        const localSessionCount = Object.keys(localParsed.sessions || {}).length;

        if (idbSessionCount === localSessionCount) {
            console.log('✓ 数据一致');
            return { consistent: true, storage: 'both', count: idbSessionCount };
        }

        console.log('⚠️ 数据不一致：IndexedDB=' + idbSessionCount + ', localStorage=' + localSessionCount);
        return { consistent: false, storage: 'both', idbCount: idbSessionCount, localCount: localSessionCount };
    }

    /**
     * 保存检查点数据 (Phase 4)
     * @param {Object} data - 检查点数据
     * @returns {Promise<boolean>} 是否成功保存
     */
    async saveCheckpoints(data) {
        if (!this.db) {
            console.warn('⚠️ IndexedDB 未初始化');
            return false;
        }

        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const checkpointData = {
                id: 'claude_checkpoints',
                checkpoints: data.checkpoints,
                branches: data.branches,
                currentBranch: data.currentBranch,
                savedAt: data.savedAt,
                version: 1
            };

            // 先删除旧数据
            const deleteRequest = store.delete('claude_checkpoints');
            
            deleteRequest.onsuccess = () => {
                // 添加新数据
                const addRequest = store.add(checkpointData);

                addRequest.onerror = () => {
                    resolve(false);
                };

                addRequest.onsuccess = () => {
                    console.log('✓ 检查点已保存到 IndexedDB');
                    resolve(true);
                };
            };

            deleteRequest.onerror = () => {
                resolve(false);
            };

            transaction.onerror = () => {
                resolve(false);
            };
        });
    }

    /**
     * 加载检查点数据 (Phase 4)
     * @returns {Promise<Object|null>} 检查点数据
     */
    async loadCheckpoints() {
        if (!this.db) {
            console.warn('⚠️ IndexedDB 未初始化');
            return null;
        }

        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get('claude_checkpoints');

            request.onerror = () => {
                resolve(null);
            };

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    console.log('✓ 检查点已从 IndexedDB 加载');
                    resolve({
                        checkpoints: result.checkpoints,
                        branches: result.branches,
                        currentBranch: result.currentBranch
                    });
                } else {
                    console.log('ℹ️ IndexedDB 中没有保存的检查点');
                    resolve(null);
                }
            };
        });
    }

    /**
     * 保存代理配置 (Phase 7)
     * @param {Object} agentConfig - 代理配置
     * @returns {Promise<boolean>}
     */
    async saveAgent(agentConfig) {
        if (!this.db) {
            console.warn('⚠️ IndexedDB 未初始化');
            return false;
        }

        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const key = `agent_${agentConfig.id}`;
            const agentData = {
                id: key,
                ...agentConfig,
                savedAt: new Date().toISOString()
            };

            // 先尝试删除，再添加（更新效果）
            const deleteRequest = store.delete(key);
            
            deleteRequest.onsuccess = () => {
                const addRequest = store.add(agentData);

                addRequest.onerror = () => {
                    resolve(false);
                };

                addRequest.onsuccess = () => {
                    console.log('✓ 代理已保存:', agentConfig.name);
                    resolve(true);
                };
            };

            transaction.onerror = () => {
                resolve(false);
            };
        });
    }

    /**
     * 加载所有代理
     * @returns {Promise<Array>}
     */
    async loadAgents() {
        if (!this.db) {
            console.warn('⚠️ IndexedDB 未初始化');
            return null;
        }

        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);

            const agents = [];
            const request = store.openCursor();

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const key = cursor.key;
                    if (key.startsWith('agent_')) {
                        agents.push(cursor.value);
                    }
                    cursor.continue();
                } else {
                    console.log(`✓ 加载了 ${agents.length} 个代理`);
                    resolve(agents);
                }
            };

            request.onerror = () => {
                resolve(null);
            };
        });
    }

    /**
     * 删除代理
     * @param {string} agentId - 代理 ID
     * @returns {Promise<boolean>}
     */
    async deleteAgent(agentId) {
        if (!this.db) {
            console.warn('⚠️ IndexedDB 未初始化');
            return false;
        }

        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const key = `agent_${agentId}`;
            const request = store.delete(key);

            request.onsuccess = () => {
                console.log('✓ 代理已删除:', agentId);
                resolve(true);
            };

            request.onerror = () => {
                resolve(false);
            };
        });
    }

    /**
     * 加载权限配置 (Phase 6)
     * @returns {Promise<Object|null>}
     */
    async loadPermissionConfig() {
        if (!this.db) {
            console.warn('⚠️ IndexedDB 未初始化');
            return null;
        }

        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get('claude_permissions');

            request.onsuccess = () => {
                if (request.result) {
                    console.log('✓ 权限配置已加载');
                    resolve(request.result);
                } else {
                    console.log('ℹ️ 没有保存的权限配置');
                    resolve(null);
                }
            };

            request.onerror = () => {
                resolve(null);
            };
        });
    }

    /**
     * 保存权限配置 (Phase 6)
     * @param {Object} config - 权限配置
     * @returns {Promise<boolean>}
     */
    async savePermissionConfig(config) {
        if (!this.db) {
            console.warn('⚠️ IndexedDB 未初始化');
            return false;
        }

        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const configData = {
                id: 'claude_permissions',
                ...config,
                savedAt: new Date().toISOString()
            };

            const deleteRequest = store.delete('claude_permissions');
            
            deleteRequest.onsuccess = () => {
                const addRequest = store.add(configData);

                addRequest.onerror = () => {
                    resolve(false);
                };

                addRequest.onsuccess = () => {
                    console.log('✓ 权限配置已保存');
                    resolve(true);
                };
            };

            transaction.onerror = () => {
                resolve(false);
            };
        });
    }
}

// 导出全局实例
window.indexedDBManager = new IndexedDBManager();

