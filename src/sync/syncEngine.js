import { EventBus } from "../core/eventBus.js";
import { nowISO } from "../core/utils.js";

export class SyncEngine extends EventBus {
  constructor(store, baseUrl = "/api") {
    super();
    this.store = store;
    this.baseUrl = baseUrl;
    this.syncing = false;
  }
  async lastSyncGet(key) {
    return (await this.store.idb.get("meta", key))?.value || 0;
  }
  async lastSyncSet(key, ts) {
    await this.store.idb.put("meta", { key, value: ts });
  }
  async syncAll() {
    if (this.syncing) return;
    this.syncing = true;
    this.emit("status", { state: "running" });
    try {
      await this._sync("products");
      await this._sync("orders");
      await this.store.flushOutbox();
      this.emit("status", { state: "idle" });
    } catch (e) {
      this.emit("status", { state: "error", error: e.message });
    } finally {
      this.syncing = false;
    }
  }
  async _sync(name) {
    if (name === "orders") {
      const dirty = await this.store.idb.getAll("orders", "by_dirty", true);
      for (const o of dirty) {
        await this.store.write({
          store: "orders",
          value: o,
          remoteUrl: `${this.baseUrl}/orders/${o.id}`,
          method: "PUT",
        });
        o.dirty = false;
        await this.store.idb.put("orders", o);
      }
    }
    const since = await this.lastSyncGet("since:" + name);
    let page = 0,
      changed = 0;
    while (true) {
      const url = `${this.baseUrl}/${name}?since=${since}&limit=200&offset=${
        page * 200
      }`;
      const res = await fetch(url).then((r) =>
        r.ok ? r.json() : { items: [] }
      );
      const items = res.items || [];
      if (!items.length) break;
      await this.store.idb.transaction([name], async (api) => {
        for (const it of items)
          api[name].put({ ...it, updatedAt: it.updatedAt || nowISO() });
      });
      page++;
      changed += items.length;
    }
    await this.lastSyncSet("since:" + name, Date.now());
    if (changed)
      this.store.emit("change", { store: name, op: "sync", count: changed });
  }
}
