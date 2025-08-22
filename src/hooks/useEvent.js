import { useEffect } from "react";
export function useEvent(bus, type, fn) {
  useEffect(() => {
    if (!bus || !type || !fn) return;
    return bus.on(type, (e) => fn(e.detail));
  }, [bus, type, fn]);
}
