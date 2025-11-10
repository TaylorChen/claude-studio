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
        
        console.log('📊 IndexedDBManager 初始化:', this.isSupported ? '✓ 支持' : '✗ 不支持');
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
                console.error('❌ IndexedDB 打开失败:', request.error);
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
                console.error('❌ 保存会话失败:', request.error);
                resolve(false);
            };

            request.onsuccess = () => {
                console.log('✓ 会话已保存到 IndexedDB');
                resolve(true);
            };

            transaction.onerror = () => {
                console.error('❌ 事务失败:', transaction.error);
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
                console.error('❌ 加载会话失败:', request.error);
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
                console.error('❌ 导出失败:', request.error);
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
                console.error('❌ 清空失败:', request.error);
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
            console.error('❌ 迁移失败:', error);
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
                    console.error('❌ 保存检查点失败:', addRequest.error);
                    resolve(false);
                };

                addRequest.onsuccess = () => {
                    console.log('✓ 检查点已保存到 IndexedDB');
                    resolve(true);
                };
            };

            deleteRequest.onerror = () => {
                console.error('❌ 删除旧检查点失败:', deleteRequest.error);
                resolve(false);
            };

            transaction.onerror = () => {
                console.error('❌ 事务失败:', transaction.error);
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
                console.error('❌ 加载检查点失败:', request.error);
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
}

// 导出全局实例
window.indexedDBManager = new IndexedDBManager();

