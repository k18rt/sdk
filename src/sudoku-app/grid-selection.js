// Touch, mouse and trackpad use the same press-and-sweep gesture.
export class GridSelection {
  constructor(visitCell) {
    this.visitCell = visitCell;
    this.active = null;
    this.suppressDoubleClick = false;
    this.onMove = event => this.move(event);
    this.onEnd = event => this.end(event);
  }

  start(event, root, key) {
    if (!event.isPrimary || event.button !== 0 || this.active) return;
    this.suppressDoubleClick = false;
    if (event.ctrlKey || event.metaKey) return;
    const pointer = {
      root, key, id: event.pointerId, moved: false,
      x: event.clientX, y: event.clientY, toggle: event.shiftKey,
      // The initial Shift-click already toggled the first cell.
      seen: new Set(event.shiftKey ? [key] : []),
    };
    this.begin(pointer, event.pointerType !== 'mouse');
  }

  begin(pointer, capture) {
    this.active = pointer;
    const doc = pointer.root.ownerDocument;
    doc.addEventListener('pointermove', this.onMove, {passive: false});
    doc.addEventListener('pointerup', this.onEnd);
    doc.addEventListener('pointercancel', this.onEnd);
    if (capture) pointer.root.setPointerCapture(pointer.id);
    // Defer mouse capture until movement: a normal double-click must still
    // reach an annotation's existing dblclick handler.
  }

  visitKey(key) {
    if (this.active.seen.has(key)) return;
    this.active.seen.add(key);
    this.visitCell(key, this.active.toggle);
  }

  move(event) {
    const a = this.active;
    if (!a || a.id !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - a.x, event.clientY - a.y);
    if (!a.moved && distance < 6) return;
    if (!a.moved) a.root.setPointerCapture(a.id);
    a.moved = true;
    event.preventDefault();
    this.visitKey(a.key);
    // Sample quick movements so intermediate editable cells are not skipped.
    const count = Math.max(1, Math.ceil(distance / 8));
    for (let n = 1; n <= count; n++) {
      const x = a.x + (event.clientX - a.x) * n / count;
      const y = a.y + (event.clientY - a.y) * n / count;
      const cell = a.root.ownerDocument.elementFromPoint(x, y)?.closest('.cell');
      if (cell && a.root.contains(cell) && !cell.classList.contains('given')) {
        this.visitKey(cell.dataset.cell);
      }
    }
    a.x = event.clientX;
    a.y = event.clientY;
  }

  end(event) {
    if (!this.active || this.active.id !== event.pointerId) return;
    if (event.type === 'pointerup') this.move(event);
    this.suppressDoubleClick = this.active.moved;
    this.cancel();
  }

  cancel() {
    const a = this.active;
    this.active = null;
    if (!a) return;
    const doc = a.root.ownerDocument;
    doc.removeEventListener('pointermove', this.onMove);
    doc.removeEventListener('pointerup', this.onEnd);
    doc.removeEventListener('pointercancel', this.onEnd);
    if (a.root.hasPointerCapture(a.id)) a.root.releasePointerCapture(a.id);
  }
}
