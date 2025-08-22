// src/App.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useOnline } from "./hooks/useOnline.js";
import { useEvent } from "./hooks/useEvent.js";
import { OfflineDataStore } from "./data/offlineDataStore.js";
import { PrintJobManager } from "./print/printJobManager.js";
import { SyncEngine } from "./sync/syncEngine.js";
import { Button } from "./ui/Button.jsx";
import { Catalog } from "./ui/Catalog.jsx";
import { Cart } from "./ui/Cart.jsx";
import { OrdersBoard } from "./ui/OrdersBoard.jsx";

const S = {
  page: {
    background: "#0b0f14",
    minHeight: "100vh",
    color: "#e6edf3",
    fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial",
  },
  header: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    background: "linear-gradient(180deg,#0f1520,#0b0f14)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 320px",
    gap: 10,
    padding: 10,
  },
  card: {
    background: "#121821",
    border: "1px solid #1c2533",
    borderRadius: 14,
    boxShadow: "0 4px 24px rgba(0,0,0,.25)",
  },
};

export default function App() {
  const online = useOnline();

  // singletons
  const [store] = useState(() => new OfflineDataStore({}));
  const [printer, setPrinter] = useState(null);
  const [sync, setSync] = useState(null);

  // state
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [cats, setCats] = useState([]);
  const [cart, setCart] = useState(new Map());
  const [ordersByStatus, setOrdersByStatus] = useState({
    pending: [],
    preparing: [],
    ready: [],
    completed: [],
  });
  const [syncState, setSyncState] = useState("idle");


  useEffect(() => {
    (async () => {
      await store.init();
      setPrinter(new PrintJobManager(store.idb));
      await seed(); 
      refreshProducts(); 
    })();
  }, [store]);

  // data readers
  const refreshProducts = useCallback(async () => {
    const ps = (await store.idb.getAll("products")) || [];
    setProducts(ps);
    setCats([...new Set(ps.map((p) => p.category).filter(Boolean))].sort());
  }, [store]);

  const refreshOrders = useCallback(async () => {
    const statuses = ["pending", "preparing", "ready", "completed"];
    const next = { pending: [], preparing: [], ready: [], completed: [] };
    for (const st of statuses)
      next[st] = (await store.idb.getAll("orders", "by_status", st)) || [];
    setOrdersByStatus(next);
  }, [store]);

  useEffect(() => {
    refreshProducts();
    refreshOrders();
  }, [refreshProducts, refreshOrders]);

  // event hooks
  useEvent(store, "change", () => {
    refreshProducts();
    refreshOrders();
  });
  useEvent(store, "sync:error", () => setSyncState("error"));
  useEvent(sync, "status", ({ state }) => setSyncState(state));

 
  useEffect(() => {
    const query = q.trim().toLowerCase();
    setFiltered(
      products.filter(
        (p) =>
          (!cat || p.category === cat) &&
          (!query || p.name.toLowerCase().includes(query))
      )
    );
  }, [q, cat, products]);

  // cart helpers
  const addToCart = useCallback((p, size = "R") => {
    setCart((old) => {
      const next = new Map(old);
      const key = p.id + "|" + size;
      const item = next.get(key) || {
        productId: p.id,
        name: p.name,
        size,
        price: p.price,
        qty: 0,
      };
      item.qty += 1;
      next.set(key, item);
      return next;
    });
  }, []);

  const updateQty = (key, delta) =>
    setCart((old) => {
      const next = new Map(old);
      const it = next.get(key);
      if (!it) return old;
      it.qty += delta;
      if (it.qty <= 0) next.delete(key);
      else next.set(key, it);
      return next;
    });

  const total = useMemo(() => {
    let t = 0;
    cart.forEach((it) => (t += it.price * it.qty));
    return t;
  }, [cart]);

  // place order
  const placeOrder = useCallback(async () => {
    if (!cart.size) return;
    const items = Array.from(cart.values());
    const total = items.reduce((s, it) => s + it.price * it.qty, 0);
    const order = {
      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
      status: "pending",
      items,
      total,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rev: Math.random().toString(36).slice(2),
      dirty: true,
    };
    setOrdersByStatus((old) => ({ ...old, pending: [order, ...old.pending] }));
    setCart(new Map());
    await store.write({
      store: "orders",
      value: order,
      remoteUrl: `/api/orders/${order.id}`,
      method: "PUT",
    });
  }, [cart, store]);

  // move order through statuses
  const moveOrder = useCallback(
    async (order, status) => {
      const updated = {
        ...order,
        status,
        updatedAt: new Date().toISOString(),
        rev: Math.random().toString(36).slice(2),
        dirty: true,
      };
      setOrdersByStatus((old) => {
        const next = { pending: [], preparing: [], ready: [], completed: [] };
        Object.keys(old).forEach(
          (k) => (next[k] = old[k].filter((o) => o.id !== order.id))
        );
        next[status] = [updated, ...next[status]];
        return next;
      });
      await store.write({
        store: "orders",
        value: updated,
        remoteUrl: `/api/orders/${order.id}`,
        method: "PUT",
      });
      if (status === "completed" && printer) {
        await printer.enqueue({
          dest: "receipt",
          payload: {
            orderId: order.id,
            items: order.items,
            total: order.total,
          },
        });
      }
    },
    [store, printer]
  );

  // seed demo data
  const seed = async () => {
    const existing = await store.idb.getAll("products");
    if (existing.length) return;
    await store.idb.transaction(["products"], async ({ products }) => {
      const cats = ["Burgers", "Beverages", "Desserts", "Sides", "Combos"];
      for (let i = 1; i <= 1000; i++) {
        products.put({
          id: "p_" + i.toString(36) + Date.now().toString(36).slice(-4),
          sku: "SKU" + i,
          name: `Item ${i}`,
          price: +(Math.random() * 200 + 20).toFixed(2),
          category: cats[i % cats.length],
          updatedAt: new Date().toISOString(),
        });
      }
    });
    await refreshProducts();
  };

  // shortcuts
  const searchRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key.toLowerCase() === "p") {
        placeOrder();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [placeOrder]);

  const fmt = (n) => `₹${n.toFixed(2)}`;

  return (
    <div style={S.page}>
      <header style={S.header}>
        <strong>Anshul's POS</strong>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.currentTarget.value)}
            placeholder="Search ( / )"
            style={{
              background: "#0e131b",
              color: "#e6edf3",
              border: "1px solid #1d2a3a",
              borderRadius: 10,
              padding: ".5rem .6rem",
            }}
          />
          <select
            value={cat}
            onChange={(e) => setCat(e.currentTarget.value)}
            style={{
              background: "#0e131b",
              color: "#e6edf3",
              border: "1px solid #1d2a3a",
              borderRadius: 10,
              padding: ".5rem .6rem",
            }}
          >
            <option value="">All</option>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <span
            style={{
              padding: ".3rem .55rem",
              borderRadius: 999,
              background: "#1a2230",
              color: "#9fb0c6",
              border: "1px solid #243146",
            }}
          >
            {online ? "Online" : "Offline"}
          </span>

          <span
            style={{
              padding: ".3rem .55rem",
              borderRadius: 999,
              background: "#1a2230",
              color: "#9fb0c6",
              border: "1px solid #243146",
            }}
          >
            Sync: {syncState}
          </span>

        </div>
      </header>

      <main style={S.grid}>
        <section style={S.card}>
          <Catalog
            products={filtered}
            onAdd={(p, size) => addToCart(p, size)}
          />
        </section>
        <aside
          style={{
            ...S.card,
            padding: 10,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Cart
            cart={cart}
            fmt={fmt}
            onInc={(k) => updateQty(k, +1)}
            onDec={(k) => updateQty(k, -1)}
            onClear={() => setCart(new Map())}
            total={fmt(total)}
            onPlace={placeOrder}
            onTestPrint={async () => {
              if (printer) {
                await printer.enqueue({
                  dest: "receipt",
                  payload: {
                    orderId: "demo",
                    items: [{ qty: 1, name: "Demo", price: 50, size: "R" }],
                    total: 50,
                  },
                });
              }
            }}
          />
        </aside>
      </main>

      <section style={{ ...S.card, margin: 10 }}>
        <OrdersBoard ordersByStatus={ordersByStatus} onDrop={moveOrder} />
      </section>
    </div>
  );
}
