
export class PrintJobManager {
  constructor(idb) {
    this.idb = idb;
    this.running = false;
    // dumb templates; tweak strings as needed
    this.templates = {
      receipt: (p) =>
        [
          `RECEIPT`,
          `Order: ${p.orderId}`,
          ...p.items.map(
            (i) =>
              `${i.qty} x ${i.name}${i.size ? ` (${i.size})` : ""} - ₹${(
                i.qty * i.price
              ).toFixed(2)}`
          ),
          `TOTAL: ₹${p.total.toFixed(2)}`,
        ].join("\n"),
      kitchen: (p) =>
        [
          `KITCHEN TICKET`,
          `Order: ${p.orderId}`,
          ...p.items.map(
            (i) => `${i.qty} x ${i.name}${i.size ? ` (${i.size})` : ""}`
          ),
          `Notes: ${p.notes || "-"}`,
        ].join("\n"),
      bar: (p) =>
        [
          `BAR TICKET`,
          `Order: ${p.orderId}`,
          ...p.items.map((i) => `${i.qty} x ${i.name}`),
        ].join("\n"),
    };
  }

  async enqueue({ dest = "receipt", priority = 5, payload }) {
    const job = {
      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
      dest, // 'receipt' | 'kitchen' | 'bar'
      status: "queued", // queued | done | failed
      priority, // 1=highest
      tries: 0,
      payload,
      createdAt: Date.now(),
      nextAt: Date.now(), // when it may be retried
    };
    await this.idb.put("printJobs", job);
    if (!this.running) this.process(); 
    return job;
  }

  async process() {
    this.running = true;
    while (true) {
      // get only jobs whose nextAt has passed; sort by priority then FIFO
      let jobs = await this.idb.getAll("printJobs", "by_status", "queued");
      const now = Date.now();
      jobs = (jobs || [])
        .filter((j) => (j.nextAt || 0) <= now)
        .sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);

      if (!jobs.length) {
        this.running = false;
        return;
      }

      const job = jobs[0];
      try {
        await this._print(job);
        job.status = "done";
        await this.idb.put("printJobs", job);
      } catch (err) {
        // simple exponential backoff with cap; max 3 tries
        job.tries = (job.tries || 0) + 1;
        if (job.tries > 3) {
          job.status = "failed";
        } else {
          const backoff = Math.min(10000, 400 * Math.pow(2, job.tries - 1));
          job.nextAt = Date.now() + backoff;
        }
        await this.idb.put("printJobs", job);
      }
    }
  }

  async _print(job) {
    const tpl = this.templates[job.dest] || this.templates.receipt;
    const text = tpl(job.payload);

    // For demo: print in a tiny popup; replace with ESC/POS transport later
    const win = window.open("", "PRINT", "height=480,width=360");
    if (!win) throw new Error("popup blocked");
    win.document.write(
      `<pre style="font:14px/1.4 monospace;white-space:pre-wrap;padding:8px">${text}</pre>`
    );
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }
}
