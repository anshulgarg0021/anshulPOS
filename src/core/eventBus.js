export class EventBus extends EventTarget {
  on(type, cb) {
    this.addEventListener(type, cb);
    return () => this.removeEventListener(type, cb);
  }
  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}
