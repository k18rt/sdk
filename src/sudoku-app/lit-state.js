import { LitElement } from 'lit';
import { appConfigStore } from '../core/app-config-store.js';

// Stateful render helpers keep the source game's transitions and effect ordering.
// Rendering, event bindings and DOM updates are all performed by Lit.
let activeHost;
export const uiState = (key, initial) => activeHost.state(key, initial);
export class StatefulElement extends LitElement {
  constructor() {
    super();
    this.slots = new Map();
    this.pendingEffects = [];
    this.panelSize = {width:470, height:690};
    this.onConfig = () => this.requestUpdate();
    this.onResize = () => this.measurePanel();
    this.panelObserver = new ResizeObserver(() => this.measurePanel());
    this.setImportGrid = value => appConfigStore.setImportGrid(value);
  }
  createRenderRoot() { return this; }
  connectedCallback() {
    super.connectedCallback();
    appConfigStore.addEventListener('import-grid-change', this.onConfig);
    window.addEventListener('resize', this.onResize);
  }
  firstUpdated() {
    this.panel = this.closest('resizable-panel');
    this.panel?.addEventListener('resize', this.onResize);
    if (this.panel) this.panelObserver.observe(this.panel);
    this.measurePanel();
    this.requestUpdate();
  }
  measurePanel() {
    if (!this.panel) return;
    const {width, height} = this.panel.getBoundingClientRect();
    if (this.panelSize.width !== width || this.panelSize.height !== height) {
      this.panelSize = {width, height}; this.requestUpdate();
    }
  }
  state(key, initial) {
    if (!this.slots.has(key)) {
      const slot = {value: typeof initial === 'function' ? initial() : initial};
      slot.set = next => {
        if (!this.isConnected) return;
        const value = typeof next === 'function' ? next(slot.value) : next;
        if (!Object.is(value, slot.value)) { slot.value = value; this.requestUpdate(); }
      };
      this.slots.set(key, slot);
    }
    const slot = this.slots.get(key);
    return [slot.value, slot.set];
  }
  ref(key, initial) {
    if (!this.slots.has(key)) this.slots.set(key, {current:initial});
    return this.slots.get(key);
  }
  callback(key, fn, deps) {
    let slot = this.slots.get(key);
    if (!slot || !same(slot.deps, deps)) this.slots.set(key, slot = {fn, deps});
    return slot.fn;
  }
  effect(key, fn, deps) {
    let slot = this.slots.get(key);
    if (!slot) this.slots.set(key, slot = {});
    if (!slot.ran || !same(slot.deps, deps)) {
      slot.deps = deps; slot.ran = true;
      this.pendingEffects.push(() => { slot.cleanup?.(); slot.cleanup = fn(); });
    }
  }
  appConfig() { return {importGrid:appConfigStore.importGrid, setImportGrid:this.setImportGrid}; }
  renderState(fn) { activeHost = this; try { return fn.call(this); } finally { activeHost = null; } }
  updated() {
    const effects = this.pendingEffects.splice(0);
    for (const run of effects) run();
    const select = this.querySelector('select[title="Difficulté"]');
    if (select) select.value = this.slots.get('difficulty').value;
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    appConfigStore.removeEventListener('import-grid-change', this.onConfig);
    this.panel?.removeEventListener('resize', this.onResize);
    window.removeEventListener('resize', this.onResize);
    this.panelObserver.disconnect();
    for (const slot of this.slots.values()) if (slot.ran) {slot.cleanup?.(); slot.ran = false;}
  }
}
const same = (a,b) => a && b && a.length === b.length && a.every((v,i)=>Object.is(v,b[i]));
const unitless = new Set(['opacity','zIndex','fontWeight','lineHeight','flex','flexGrow','flexShrink','order','scale','strokeWidth']);
export function cssStyle(style = {}) {
  return Object.fromEntries(Object.entries(style).map(([key,value]) => [key, typeof value === 'number' && value !== 0 && !unitless.has(key) ? value+'px' : value]));
}
