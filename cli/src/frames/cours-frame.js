import { LitElement, html, css } from 'lit'
import '../pages/decouverte-page.js'
import '../pages/singleton-cache-page.js'
import '../pages/plan-page.js'
import '../pages/home-page.js'
import { globalStore } from '../core/global-store.js'

export class CoursFrame extends LitElement {
  static properties = {
    _activePage: { state: true },
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      background: #ffffff;
      border-right: 1px solid var(--terracotta-200, #EFB8A1);
      box-sizing: border-box;
      overflow: hidden;
    }

    .frame-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      background: var(--terracotta-100, #F7E7DE);
      border-bottom: 1px solid var(--terracotta-200, #EFB8A1);
      color: var(--terracotta-900, #5D2C28);
      flex-wrap: wrap;
      gap: 10px;
    }

    .frame-title {
      font-weight: 700;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .nav-tabs {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .nav-btn {
      background: transparent;
      border: 1px solid var(--terracotta-400, #D36B5D);
      color: var(--terracotta-800, #7B3A33);
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.2s;
    }

    .nav-btn:hover {
      background: var(--terracotta-300, #E38A77);
      color: white;
    }

    .nav-btn.active {
      background: var(--terracotta-600, #A44A3F);
      color: white;
      border-color: var(--terracotta-600, #A44A3F);
    }

    .frame-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
  `

  constructor() {
    super()
    this._activePage = globalStore.currentTag || 'plan-page'
    this._onStoreChange = this._onStoreChange.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()
    globalStore.addEventListener('change', this._onStoreChange)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    globalStore.removeEventListener('change', this._onStoreChange)
  }

  _onStoreChange() {
    this._activePage = globalStore.currentTag
  }

  _setPage(pageKey) {
    globalStore.addPage(pageKey)
  }

  render() {
    return html`
      <div class="frame-header">
        <div class="frame-title">
          🎓 Cours & Leçons
        </div>
        <div class="nav-tabs">
          <button
            class="nav-btn ${this._activePage === 'home-page' ? 'active' : ''}"
            @click=${() => this._setPage('home')}
          >Accueil</button>
          <button
            class="nav-btn ${this._activePage === 'plan-page' ? 'active' : ''}"
            @click=${() => this._setPage('plan')}
          >Parcours</button>
          <button
            class="nav-btn ${this._activePage === 'decouverte-page' ? 'active' : ''}"
            @click=${() => this._setPage('plan1')}
          >Découverte</button>
          <button
            class="nav-btn ${this._activePage === 'singleton-cache-page' ? 'active' : ''}"
            @click=${() => this._setPage('plan2')}
          >Singleton caché</button>
        </div>
      </div>
      <div class="frame-content">
        ${this._renderContent()}
      </div>
    `
  }

  _renderContent() {
    switch (this._activePage) {
      case 'home-page':
        return html`<home-page></home-page>`
      case 'decouverte-page':
        return html`<decouverte-page></decouverte-page>`
      case 'singleton-cache-page':
        return html`<singleton-cache-page></singleton-cache-page>`
      case 'plan-page':
      default:
        return html`<plan-page></plan-page>`
    }
  }
}

customElements.define('cours-frame', CoursFrame)
