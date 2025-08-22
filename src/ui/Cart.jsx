import React from "react";
import { Button } from "./Button.jsx";

export function Cart({
  cart,
  fmt,
  onInc,
  onDec,
  onClear,
  total,
  onPlace,
  onTestPrint,
}) {
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
        <strong>Cart</strong>
        <Button onClick={onClear}>Clear</Button>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {Array.from(cart.entries()).map(([key, it]) => (
          <div
            key={key}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 8,
              alignItems: "center",
              borderBottom: "1px dashed #273142",
              padding: "8px 0",
            }}
          >
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Button onClick={() => onDec(key)}>-</Button>
              <span>{it.qty}</span>
              <Button onClick={() => onInc(key)}>+</Button>
            </div>
            <div>
              <div>
                <strong>{it.name}</strong>{" "}
                <span
                  style={{
                    padding: ".2rem .45rem",
                    borderRadius: 8,
                    background: "#172131",
                    color: "#9fb0c6",
                    fontSize: ".75rem",
                  }}
                >
                  {it.size}
                </span>
              </div>
              <div style={{ color: "#9fb0c6" }}>{fmt(it.price)} each</div>
            </div>
            <div>{fmt(it.price * it.qty)}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          paddingTop: 10,
          borderTop: "1px solid #243146",
          fontWeight: 700,
        }}
      >
        <span>Total</span>
        <span>{total}</span>
      </div>
      <div style={{ display: "flex", gap: 8, paddingTop: 10 }}>
        <Button variant="primary" onClick={onPlace}>
          Place Order (P)
        </Button>
        <Button variant="warn" onClick={onTestPrint}>
          Print Test
        </Button>
      </div>
    </>
  );
}
