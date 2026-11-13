// Only the horizontal control owns gestures: Sudoku selection stays independent.
export class PanelSlider {
  constructor(host) {
    this.host = host;
    this.position = 0;
    this.media = matchMedia('(max-width: 1000px)');
    this.change = () => { this.drag = null; this.position = this.position >= .5 ? 1 : 0; this.paint(); };
    this.resize = new ResizeObserver(() => this.paint());
    host.addController(this);
  }
  hostConnected() { this.media.addEventListener('change', this.change); }
  hostDisconnected() {
    this.media.removeEventListener('change', this.change);
    this.drag = null;
    this.resize.disconnect();
  }
  hostUpdated() {
    const viewport = this.host.querySelector('.panel-viewport');
    if (viewport) this.resize.observe(viewport);
    const bar = this.host.querySelector('.panel-slider-bar');
    if (bar) this.resize.observe(bar);
    this.paint();
  }
  paint() {
    const viewport = this.host.querySelector('.panel-viewport');
    if (!viewport) return;
    const bar = this.host.querySelector('.panel-slider-bar');
    bar.querySelector('.panel-slider-thumb').style.transform = `translate3d(${this.position * 100}%, 0, 0)`;
    bar.classList.toggle('dragging', !!this.drag?.moved);
    bar.classList.toggle('pressed', !!this.drag);
    viewport.style.setProperty('--slide', this.position);
    viewport.classList.toggle('dragging', !!this.drag?.moved);
    this.host.querySelector('.site-panel').inert = this.media.matches && this.position === 1;
    this.host.querySelector('.game-panel').inert = this.media.matches && this.position === 0;
    this.host.querySelector('.panel-slider-bar').setAttribute('aria-label', this.position < .5 ? 'Afficher le jeu' : 'Afficher le site');
  }
  start(e) {
    if (!this.media.matches || e.button !== 0 || !e.isPrimary) return;
    this.suppressClick = false;
    this.drag = { id:e.pointerId, x:e.clientX, position:this.position, width:Math.max(1, e.currentTarget.clientWidth / 2 - 2), moved:false };
    e.currentTarget.setPointerCapture(e.pointerId);
    this.paint();
  }
  move(e) {
    if (!this.drag || this.drag.id !== e.pointerId) return;
    const dx = e.clientX - this.drag.x;
    if (!this.drag.moved && Math.abs(dx) < 4) return;
    this.drag.moved = true;
    e.preventDefault();
    this.position = Math.max(0, Math.min(1, this.drag.position + dx / this.drag.width));
    this.paint();
  }
  finish(e) {
    if (!this.drag || this.drag.id !== e.pointerId) return;
    // Cancelling touchstart blocks the browser's edge-navigation gesture and
    // its synthetic click. Handle a stationary touch explicitly on release.
    const touchTap = e.pointerType === 'touch' && e.type === 'pointerup' && !this.drag.moved;
    this.suppressClick = this.drag.moved || touchTap;
    this.drag = null;
    this.position = touchTap ? (this.position < .5 ? 1 : 0) : (this.position >= .5 ? 1 : 0);
    this.paint();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }
  toggle() {
    if (this.suppressClick) { this.suppressClick = false; return; }
    this.position = this.position < .5 ? 1 : 0;
    this.paint();
  }
  key(e) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    this.position = ['ArrowRight', 'End'].includes(e.key) ? 1 : 0;
    this.paint();
  }
}
