
import { IDB } from "../core/idb.js";
import { EventBus } from "../core/eventBus.js";

const nowISO = () => new Date().toISOString();
const uid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class OfflineDataStore extends EventBus {
  constructor({ dbName = "litepos-r18", version = 1 } = {}) {
    super();
    this.idb = new IDB(dbName, version);
    this.online = navigator.onLine;

 
    window.addEventListener("online", () => {
      this.online = true;
      this.emit("online");
      this.flushOutbox();
    });
    window.addEventListener("offline", () => {
      this.online = false;
      this.emit("offline");
    });
  }

  async init() {
    await this.idb.open();
  }

 
  async readThrough({ store, key /*, remoteUrl*/ }) {
    return (await this.idb.get(store, key)) || null;
  }


  async write({ store, value, op = "upsert", remoteUrl, method = "PUT" }) {
    const record = { ...value, updatedAt: nowISO() };

    if (op === "delete") await this.idb.del(store, record.id);
    else await this.idb.put(store, record);

    this.emit("change", { store, op, value: record });


    await this.idb.put("outbox", {
      id: uid(),
      store,
      op,
      payload: record,
      remoteUrl,
      method,
      createdAt: Date.now(),
      tries: 0,
    });

    if (this.online) this.flushOutbox();
    return record;
  }

  async runTransaction(stores, fn) {
    return this.idb.transaction(stores, fn);
  }

  async flushOutbox() {
    const jobs = (await this.idb.getAll("outbox", "by_createdAt")) || [];
    for (const job of jobs) {
      try {
        if (!this.online) break;
        await this._push(job);
        await this.idb.del("outbox", job.id);
      } catch (err) {
        // basic backoff, cap at ~30s
        const tries = (job.tries || 0) + 1;
        job.tries = tries;
        await this.idb.put("outbox", job);
        this.emit("sync:error", { job, error: String(err?.message || err) });
        await sleep(Math.min(30000, 400 * 2 ** (tries - 1)));
      }
    }
  }

 
  async _push(job) {
    const { remoteUrl, method, payload, op } = job;
    if (!remoteUrl) return;

    const res = await fetch(remoteUrl, {
      method: method || (op === "delete" ? "DELETE" : "PUT"),
      headers: { "Content-Type": "application/json" },
      body: op === "delete" ? undefined : JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("push failed " + res.status);
  }
}
