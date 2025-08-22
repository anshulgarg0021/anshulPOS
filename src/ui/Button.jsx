import React from "react";
export function Button({ variant, style, ...props }) {
  const bg =
    variant === "primary"
      ? "#4fc08d"
      : variant === "warn"
      ? "#f7b500"
      : "#1a2230";
  const color =
    variant === "primary"
      ? "#062718"
      : variant === "warn"
      ? "#241a00"
      : "#e6edf3";
  return (
    <button
      {...props}
      style={{
        background: bg,
        color,
        border: "1px solid #253143",
        borderRadius: 10,
        padding: ".5rem .7rem",
        cursor: "pointer",
        ...(style || {}),
      }}
    />
  );
}
