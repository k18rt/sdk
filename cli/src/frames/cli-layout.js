import { LitElement, html, css } from 'lit'
import './cours-frame.js'
import './app-frame.js'

export class CliLayout extends LitElement {
  static properties = {
    _activeMobileTab: { state: true }, // 'cours' | 'app'
    _isMobile: { state: true },
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      background: var(--sand-50, #FBF7F4);
    }

    .main-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--terracotta-900, #5D2C28);
      color: white;
      padding: 10px 20px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
      z-index: 10;
    }

    .logo {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .mobile-toggle {
      display: none;
      gap: 6px;
      background: rgba(255, 255, 255, 0.15);
      padding: 4px;
      border-radius: 8px;
    }

    .mobile-toggle button {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.8);
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .mobile-toggle button.active {
      background: white;
      color: var(--terracotta-900, #5D2C28);
    }

    .frames-container {
      flex: 1;
      display: flex;
      flex-direction: row;
      height: calc(100vh - 54px);
      width: 100%;
      overflow: hidden;
    }

    .frame-wrapper {
      flex: 1;
      height: 100%;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .frame-wrapper.cours {
      flex: 1;
      max-width: 50%;
    }

    .frame-wrapper.app {
      flex: 1;
      max-width: 50%;
    }

    @media (max-width: 850px) {
      .mobile-toggle {
        display: flex;
      }

      .frames-container {
        flex-direction: column;
      }

      .frame-wrapper.cours,
      .frame-wrapper.app {
        max-width: 100%;
        width: 100%;
      }

      .frame-wrapper.hidden-mobile {
        display: none !important;
      }
    }
  `

  constructor() {
    super()
    this._activeMobileTab = 'cours'
    this._isMobile = window.innerWidth <= 850
    this._onResize = this._onResize.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('resize', this._onResize)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('resize', this._onResize)
  }

  _onResize() {
    this._isMobile = window.innerWidth <= 850
  }

  render() {
    return html`
      <header class="main-header">
        <div class="logo">
          <span>🧩</span> Let's Play Sudoku — App & Cours
        </div>

        <div class="mobile-toggle">
          <button
            class="${this._activeMobileTab === 'cours' ? 'active' : ''}"
            @click=${() => (this._activeMobileTab = 'cours')}
          >
            🎓 Cours
          </button>
          <button
            class="${this._activeMobileTab === 'app' ? 'active' : ''}"
            @click=${() => (this._activeMobileTab = 'app')}
          >
            🧩 App Sudoku
          </button>
        </div>
      </header>

      <div class="frames-container">
        <div
          class="frame-wrapper cours ${this._isMobile && this._activeMobileTab !== 'cours' ? 'hidden-mobile' : ''}"
        >
          <cours-frame></cours-frame>
        </div>

        <div
          class="frame-wrapper app ${this._isMobile && this._activeMobileTab !== 'app' ? 'hidden-mobile' : ''}"
        >
          <app-frame></app-frame>
        </div>
      </div>
    `
  }
}

customElements.define('cli-layout', CliLayout)
