export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const nowISO = () => new Date().toISOString();
export const uid = (p = "") =>
  p +
  Math.random().toString(36).slice(2, 10) +
  Date.now().toString(36).slice(-4);
