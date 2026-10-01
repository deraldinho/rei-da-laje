export class LifecycleBag {
  constructor({ setIntervalFn = setInterval, clearIntervalFn = clearInterval } = {}) {
    this.setIntervalFn = setIntervalFn;
    this.clearIntervalFn = clearIntervalFn;
    this.disposers = [];
    this.disposed = false;
  }

  listen(target, event, handler, options) {
    if (!target || !event || typeof handler !== 'function' || this.disposed) return handler;
    if (typeof target.addEventListener === 'function') {
      target.addEventListener(event, handler, options);
      this.disposers.push(() => target.removeEventListener?.(event, handler, options));
    } else if (typeof target.on === 'function') {
      target.on(event, handler);
      this.disposers.push(() => target.off?.(event, handler));
    } else {
      throw new TypeError('LifecycleBag.listen requer EventTarget ou EventEmitter compatível');
    }
    return handler;
  }

  interval(fn, ms) {
    if (this.disposed) return null;
    const handle = this.setIntervalFn(fn, ms);
    this.disposers.push(() => this.clearIntervalFn(handle));
    return handle;
  }

  add(disposer) {
    if (typeof disposer === 'function' && !this.disposed) this.disposers.push(disposer);
    return disposer;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const current = this.disposers.splice(0).reverse();
    for (const dispose of current) {
      try { dispose(); } catch (_) {}
    }
  }
}
