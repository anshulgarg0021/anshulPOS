// src/core/idb.js
export class IDB {
  constructor(name, version = 1) {
    this.name = name;
    this.version = version;
    this.db = null;
  }

  async open() {
    if (this.db) return this.db;
    this.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(this.name, this.version);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('products')) {
          const s = db.createObjectStore('products', { keyPath: 'id' });
          s.createIndex('by_name', 'name');
          s.createIndex('by_category', 'category');
          s.createIndex('by_updatedAt', 'updatedAt');
          s.createIndex('by_sku', 'sku', { unique: false });
        }
        if (!db.objectStoreNames.contains('orders')) {
          const s = db.createObjectStore('orders', { keyPath: 'id' });
          s.createIndex('by_status', 'status');
          s.createIndex('by_dirty', 'dirty');
          s.createIndex('by_updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('printJobs')) {
          const s = db.createObjectStore('printJobs', { keyPath: 'id' });
          s.createIndex('by_status', 'status');
          s.createIndex('by_priority', 'priority');
        }
        if (!db.objectStoreNames.contains('outbox')) {
          const s = db.createObjectStore('outbox', { keyPath: 'id' });
          s.createIndex('by_createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
    return this.db;
  }

  async _tx(stores, mode) {
    const db = await this.open();
    return db.transaction(stores, mode);
  }

  async get(store, key) {
    const tx = await this._tx([store], 'readonly');
    return tx.objectStore(store).get(key);
  }

  async put(store, val) {
    const tx = await this._tx([store], 'readwrite');
    const r = tx.objectStore(store).put(val);
    await new Promise((res, rej) => {
      tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
    });
    return r;
  }

  async del(store, key) {
    const tx = await this._tx([store], 'readwrite');
    tx.objectStore(store).delete(key);
    await new Promise((res, rej) => {
      tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
    });
  }

  async getAll(store, index = null, query = null) {
    const tx = await this._tx([store], 'readonly');
    const s = tx.objectStore(store);
    const src = index ? s.index(index) : s;
    return new Promise((resolve, reject) => {
      const req = src.getAll(query ?? null);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async iterate(store, index, range, cb) {
    const tx = await this._tx([store], 'readonly');
    const src = index ? tx.objectStore(store).index(index) : tx.objectStore(store);
    return new Promise((resolve, reject) => {
      const req = src.openCursor(range ?? null);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) return resolve();
        cb(cur.value, cur);
        cur.continue();
      };
    });
  }

  async transaction(stores, fn) {
    const tx = await this._tx(stores, 'readwrite');
    const api = stores.reduce((a, s) => { a[s] = tx.objectStore(s); return a; }, {});
    try {
      const out = await fn(api, tx);
      return await new Promise((res, rej) => {
        tx.oncomplete = () => res(out);
        tx.onerror = () => rej(tx.error);
        tx.onabort = () => rej(tx.error || new Error('tx aborted'));
      });
    } catch (e) {
      tx.abort();
      throw e;
    }
  }
}
