import React from "react";

const S = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
    gap: 8,
    padding: 8,
    maxHeight: 420,
    overflow: "auto",
  },
  item: {
    background: "#0f1622",
    border: "1px solid #1e2a3c",
    borderRadius: 12,
    padding: 10,
  },
};

export function Catalog({ products, onAdd }) {
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
        <strong>Catalog</strong>
        <div style={{ color: "#9fb0c6" }}>Filtered: {products.length}</div>
      </div>
      <div style={S.grid}>
        {products.map((p) => (
          <div key={p.id} style={S.item}>
            <h4 style={{ margin: 0 }}>{p.name}</h4>
            <div style={{ color: "#9fb0c6", fontSize: ".85rem" }}>
              {p.category || "—"}
            </div>
            <div style={{ color: "#9bd2b6", fontWeight: 700 }}>
              ₹{p.price.toFixed(2)}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select onChange={(e) => (p._size = e.currentTarget.value)}>
                <option value="R">R</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
              </select>
              <button
                onClick={() => onAdd(p, p._size || "R")}
                style={{
                  background: "#1a2230",
                  color: "#e6edf3",
                  border: "1px solid #253143",
                  borderRadius: 10,
                  padding: ".5rem .7rem",
                  cursor: "pointer",
                }}
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
