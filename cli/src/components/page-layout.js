/**
 * page-layout.js
 * Remplace PageLayout + Layout de index.js
 *
 * En React, Layout englobait :
 *   <GlobalContextProvider>
 *     <BackInterceptor />
 *     <PageLayout />        ← contient Header + AppConfigProvider + Resizable + App + MainComponent
 *   </GlobalContextProvider>
 *
 * En Lit :
 *   - GlobalContextProvider → globalStore (singleton, importé directement)
 *   - AppConfigProvider     → appConfigStore (singleton)
 *   - BackInterceptor       → BackInterceptorController (reactive controller)
 *   - PageLayout            → ce composant
 *
 * Le composant écoute le globalStore pour savoir quelle page afficher
 * et met à jour le DOM dynamiquement (équivalent du re-rendu React).
 */

import { LitElement, html, css } from 'lit'
import { GlobalStoreMixin }          from '../core/global-store.js'
import { BackInterceptorController } from './back-interceptor.js'
import './sudoku-header.js'
import './resizable-panel.js'
import '../sudoku-app/sudoku-app.js'

// ── Pages ────────────────────────────────────────────────────────────────────
import '../pages/home-page.js'
import '../pages/don-page.js'
import '../pages/plan-page.js'
import '../pages/grilles-page.js'
import '../pages/decouverte-page.js'
import '../pages/singleton-cache-page.js'

export class PageLayout extends GlobalStoreMixin(LitElement) {
  // ── Reactive controller : remplace <BackInterceptor /> ───────────────────
  #backInterceptor = new BackInterceptorController(this)

  // Pas de Shadow DOM : les styles globaux (main.css, app.css) doivent s'appliquer
  createRenderRoot() { return this }

  // ── Gestionnaire de redimensionnement ────────────────────────────────────
  _onPanelResize(e) {
    // Transfère l'événement aux enfants intéressés (sudoku-app en particulier)
    const app = this.querySelector('sudoku-app')
    if (app) app._handleResizePanelResize(e)
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  render() {
    // Détermine le tag du composant page courant (ex. 'plan-page')
    const pageTag = this.globalStore.currentTag

    return html`
      <div style="display:flex; flex-direction:column; min-height:100vh;">

        <!-- En-tête – remplace <Header /> -->
        <sudoku-header></sudoku-header>

        <!-- Contenu principal -->
        <main style="flex:1; padding:5px 5px 0 5px; gap:0; margin:0;">

          <!-- Panneau redimensionnable flottant à droite – remplace <Resizable> -->
          <div style="float:right; margin:0 0 5px 15px;">
            <resizable-panel
              initial-width="470"
              initial-height="690"
              style="
                background: var(--terracotta-250);
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              "
              @resize=${this._onPanelResize}
            >
              <!-- Remplace <App /> -->
              <sudoku-app></sudoku-app>
            </resizable-panel>
          </div>

          <!-- Composant de la page courante (équivalent de <MainComponent />) -->
          <!-- Le tag est mis à jour réactivement quand globalStore change     -->
          ${this._renderCurrentPage(pageTag)}

          <div style="clear:both;"></div>
        </main>

        <!-- Pied de page -->
        <footer style="padding:0; text-align:center; color:var(--muted);">
          <p>© 2025 Let's play Sudoku — Progresser en s'amusant.
             Dernière mise à jour : septembre 2025.</p>
        </footer>
      </div>
    `
  }

  /**
   * Affiche dynamiquement le composant de la page courante.
   * Remplace : const MainComponent = GlobalCurrentComponent(); return <MainComponent />
   *
   * Avec Lit, on ne peut pas créer un tag dynamique directement dans html``.
   * On utilise donc un élément <div> conteneur et on met à jour son innerHTML,
   * ou plus élégamment, on utilise unsafeHTML / un map fixe de templates.
   */
  _renderCurrentPage(tag) {
    // Map fixe : tag → template Lit
    // (unsafeHTML n'est pas nécessaire grâce à ce switch)
    switch (tag) {
      case 'home-page':            return html`<home-page></home-page>`
      case 'don-page':             return html`<don-page></don-page>`
      case 'plan-page':            return html`<plan-page></plan-page>`
      case 'grilles-page':         return html`<grilles-page></grilles-page>`
      case 'decouverte-page':      return html`<decouverte-page></decouverte-page>`
      case 'singleton-cache-page': return html`<singleton-cache-page></singleton-cache-page>`
      default:                     return html`<home-page></home-page>`
    }
  }
}

customElements.define('page-layout', PageLayout)
