export class ActiveVisualPool {
  constructor({ capacity = 48, createSlot, resetSlot, disposeSlot }) {
    this.capacity = Math.max(1, Math.floor(Number(capacity) || 48));
    this.createSlot = createSlot;
    this.resetSlot = resetSlot;
    this.disposeSlot = disposeSlot;
    this.slots = [];
    this.active = new Map();
    this._free = [];
    this._disposed = false;

    for (let index = 0; index < this.capacity; index++) {
      const slot = this.createSlot(index);
      slot.__poolOwnerId = null;
      slot.generation = Number(slot.generation) || 0;
      this.slots.push(slot);
      this._free.push(slot);
    }
  }

  get freeCount() {
    return this._free.length;
  }

  get(userId) {
    return this.active.get(String(userId)) || null;
  }

  acquire(userId) {
    const key = String(userId);
    if (this.active.has(key)) return this.active.get(key);
    const slot = this._free.pop() || null;
    if (!slot) return null;
    slot.__poolOwnerId = key;
    slot.generation = (Number(slot.generation) || 0) + 1;
    this.active.set(key, slot);
    return slot;
  }

  release(userId) {
    const key = String(userId);
    const slot = this.active.get(key) || null;
    if (!slot) return null;
    this.active.delete(key);
    this.resetSlot?.(slot);
    slot.__poolOwnerId = null;
    this._free.push(slot);
    return slot;
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.active.clear();
    this._free.length = 0;
    for (const slot of this.slots) this.disposeSlot?.(slot);
  }
}

