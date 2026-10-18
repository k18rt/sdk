/**
 * sudoku-header.js
 * Remplace le composant React <Header> de Header.js + AppIcon de Header.js
 *
 * Équivalences React → Lit :
 *   useGlobalContext()          → GlobalStoreMixin + this.globalStore
 *   useState / useEffect        → propriétés réactives @state / connectedCallback
 *   JSX                         → html`` de Lit
 *   styles en <style> inline    → static styles (Shadow DOM) + css``
 *   composants enfants React    → éléments HTML natifs + templates Lit
 *
 * Note sur le Shadow DOM :
 *   Le header utilise des variables CSS définies dans main.css (:root / body).
 *   Avec Shadow DOM, les variables CSS custom (--terracotta-*) TRAVERSENT
 *   la frontière du shadow, donc elles restent accessibles. ✓
 *   Les classes globales (.header, .home-button…) elles, doivent être
 *   redéclarées dans static styles (ce qui est fait ici).
 */

import { LitElement, html, css } from 'lit'
import { GlobalStoreMixin } from '../core/global-store.js'

export class SudokuHeader extends GlobalStoreMixin(LitElement) {
  // Pas de propriétés déclarées : tout vient du globalStore (via le mixin)

  static styles = css`
    :host { display: block; }

    .header {
      padding: 1rem 2rem;
      border-bottom: 1px solid #eee;
      display: flex;
      flex-direction: row;
      align-items: end;
      gap: 1rem;
      background: linear-gradient(135deg, var(--terracotta-500), var(--terracotta-300));
      border-radius: var(--radius-lg);
      margin: 0 5px;
      position: relative;
      overflow: hidden;
      box-shadow: var(--shadow);
      color: white;
      text-align: center;
      transition: all 0.3s ease-in-out;
    }
    .header h1 {
      margin: 0;
      font-size: clamp(28px, 4.5vw, 36px);
      letter-spacing: -0.02em;
      color: antiquewhite;
      text-shadow:
        -1px -1px 0 var(--terracotta-500),
         1px -1px 0 var(--terracotta-500),
        -1px  1px 0 var(--terracotta-500),
         1px  1px 0 var(--terracotta-500);
      line-height: 1.1;
    }
    .header p { margin: 0; opacity: .95; font-weight: 500; }

    .home-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .home-icon {
      transition: transform 0.2s ease;
      transform: scale(1);
    }
    .home-icon:hover { transform: scale(1.1); }

    .page-title {
      transition: transform 0.2s ease;
      transform: scale(1);
      padding: 0;
    }
    button.page-title:hover {
      transform: scale(1.05);
      background: rgba(255,255,255,0.1);
    }

    .app-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: lighter;
      opacity: 0.9;
    }

    .h-choice-button {
      padding: 8px 20px;
      border-radius: 13px;
      background: inherit;
      border: 2px groove #0003;
      color: antiquewhite;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.9rem;
      font-weight: normal;
    }
    .h-choice-button:hover {
      transform: scale(1.05);
      color: white;
    }

    .separator { margin: 0 1rem; }
  `

  // ── Templates partiels ────────────────────────────────────────────────────

  /** SVG maison – identique à HomeIcon dans React */
  _homeIcon() {
    return html`
      <svg class="home-icon" width="20" height="20" viewBox="0 0 24 24"
           fill="none" stroke="white" stroke-width="1.5"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 10L12 1l11 9" stroke-width="1.7"/>
        <path d="M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/>
        <path d="M10 21v-8h4v8"/>
      </svg>
    `
  }

  /** Equivalent du ternaire home ? <…> : <…> dans le JSX original */
  _headerContent() {
    const path = this.globalStore.currentPathNames
    const isHome = this.globalStore.isHomePage

    if (isHome) {
      return html`
        <div style="position:relative; width:100%; text-align:center;">
          <h1 style="margin:0; display:flex; align-items:center; gap:8px; justify-content:center;">
            Let's play Sudoku
          </h1>
          <div style="position:absolute; right:0; top:53%; transform:translateY(-45%);">
            <button class="h-choice-button" @click=${() => this.globalStore.addPage('don')}>
              Faire un don
            </button>
          </div>
        </div>
      `
    }

    // Navigation en fil d'Ariane
    return html`
      <div style="display:flex; align-items:center; padding-bottom:1px;">
        <!-- Bouton maison -->
        <button
          class="home-button"
          title="Retour à l'accueil"
          @click=${() => this._goHome(path.length - 1)}
        >
          ${this._homeIcon()}
        </button>

        <!-- Miettes de pain : path.slice(1) -->
        ${path.slice(1).map((item, index, array) => html`
          <span class="separator">›</span>
          ${index < array.length - 1
            ? html`
                <button
                  class="page-title"
                  style="background:none; border:none; color:white; cursor:pointer; font:inherit;"
                  @click=${() => this._goHome(array.length - 1 - index)}
                >${item}</button>
              `
            : html`<span class="page-title">${item}</span>`
          }
        `)}
      </div>
      <h2 class="app-title">Let's play Sudoku</h2>
    `
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  /** Remonte de n niveaux dans l'historique interne */
  _goHome(n) {
    for (let i = 0; i < n; i++) {
      this.globalStore.removeLastPage()
    }
  }

  // ── Rendu principal ───────────────────────────────────────────────────────

  render() {
    const isHome = this.globalStore.isHomePage
    return html`
      <header
        class="header"
        style=${isHome ? 'justify-content:center;' : 'justify-content:space-between;'}
      >
        ${this._headerContent()}
      </header>
    `
  }
}

customElements.define('sudoku-header', SudokuHeader)

// ── AppIcon ───────────────────────────────────────────────────────────────
/**
 * Composant <app-icon> – remplace AppIcon de Header.js
 * Attributs : width (défaut 32), height (défaut 32)
 */
export class AppIcon extends LitElement {
  static properties = {
    width:  { type: Number },
    height: { type: Number },
  }

  constructor() {
    super()
    this.width  = 32
    this.height = 32
  }

  static styles = css`:host { display: inline-block; }`

  render() {
    return html`
      <svg
        width=${this.width}
        height=${this.height}
        viewBox="0 0 256 256"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="256" height="256" rx="32" fill="#E2725B"/>
        <rect x="36" y="36" width="56" height="56" rx="8" fill="white" opacity="0.6"/>
        <rect x="100" y="36" width="56" height="56" rx="8" fill="white" opacity="0.0"/>
        <circle cx="128" cy="64" r="23" fill="none" stroke="white" stroke-width="10" opacity="0.7"/>
        <rect x="164" y="36" width="56" height="56" rx="8" fill="white" opacity="0.1"/>
        <rect x="184" y="56" width="16" height="16" rx="2" fill="white" opacity="0.5"/>
        <rect x="36" y="100" width="56" height="56" rx="8" fill="white" opacity="0.0"/>
        <circle cx="64" cy="128" r="28" fill="white" opacity="0.1"/>
        <circle cx="64" cy="128" r="8" fill="white" opacity="0.5"/>
        <rect x="100" y="100" width="56" height="56" rx="8" fill="white" opacity="0.0"/>
        <circle cx="128" cy="128" r="28" fill="white" opacity="0.2"/>
        <rect x="164" y="100" width="56" height="56" rx="8" fill="white" opacity="0.4"/>
        <rect x="36" y="164" width="56" height="56" rx="8" fill="white" opacity="0.4"/>
        <rect x="56" y="184" width="16" height="16" rx="2" fill="#E2725B" opacity="1.0"/>
        <rect x="100" y="164" width="56" height="56" rx="8" fill="white" opacity="0.7"/>
        <rect x="112" y="176" width="32" height="32" rx="4" fill="#E2725B" opacity="1.0"/>
        <rect x="164" y="164" width="56" height="56" rx="8" fill="white" opacity="0.0"/>
        <circle cx="192" cy="192" r="28" fill="white" opacity="0.3"/>
        <circle cx="192" cy="192" r="8" fill="#E2725B" opacity="1.0"/>
      </svg>
    `
  }
}

customElements.define('app-icon', AppIcon)
