import React from "react";
import { Button } from "./Button.jsx";

const S = {
  boards: {
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(200px,1fr))",
    gap: 8,
    padding: 8,
    maxHeight: 300,
    overflow: "auto",
  },
  column: {
    background: "#0f1622",
    border: "1px solid #1e2a3c",
    borderRadius: 12,
  },
  ticket: {
    border: "1px solid #28354a",
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    background: "#111a28",
  },
};

const NEXT = { pending: "preparing", preparing: "ready", ready: "completed" };

export function OrdersBoard({ ordersByStatus, onDrop }) {
  const statuses = ["pending", "preparing", "ready", "completed"];
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 10,
          borderBottom: "1px solid #1c2533",
        }}
      >
        <strong>Orders</strong>
        <span
          style={{
            padding: ".3rem .55rem",
            borderRadius: 999,
            background: "#1a2230",
            color: "#9fb0c6",
            border: "1px solid #243146",
          }}
        >
          Optimistic UI
        </span>
      </div>

      <div style={S.boards}>
        {statuses.map((st) => (
          <div
            key={st}
            style={S.column}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/id");
              const all = Object.values(ordersByStatus).flat();
              const order = all.find((o) => o.id === id);
              if (order) onDrop(order, st);
            }}
          >
            <h3
              style={{
                margin: 0,
                padding: 10,
                borderBottom: "1px solid #223046",
              }}
            >
              {st[0].toUpperCase() + st.slice(1)}
            </h3>

            <div style={{ padding: 8, maxHeight: 260, overflow: "auto" }}>
              {(ordersByStatus[st] || []).map((o) => (
                <div
                  key={o.id}
                  style={S.ticket}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/id", o.id)}
                >
                  <div>
                    <strong>{o.id.slice(-6)}</strong> • ₹{o.total.toFixed(2)}
                  </div>
                  <div style={{ color: "#9fb0c6" }}>
                    {o.items.map((it) => `${it.qty}×${it.name}`).join(", ")}
                  </div>

                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    {NEXT[st] && (
                      <Button onClick={() => onDrop(o, NEXT[st])}>Next</Button>
                    )}
                    {st !== "completed" && (
                      <Button onClick={() => onDrop(o, "completed")}>
                        Done
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
