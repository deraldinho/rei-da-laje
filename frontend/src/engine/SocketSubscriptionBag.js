export class SocketSubscriptionBag {
  constructor(socket) {
    this.socket = socket;
    this.subscriptions = [];
    this.disposed = false;
  }

  on(event, handler) {
    if (!this.socket || !event || typeof handler !== 'function' || this.disposed) return handler;
    this.socket.on(event, handler);
    this.subscriptions.push({ event, handler });
    return handler;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const { event, handler } of this.subscriptions.splice(0).reverse()) {
      try { this.socket?.off?.(event, handler); } catch (_) {}
    }
  }
}
