/**
 * grilles-page.js  —  remplace grilles.js
 *
 * Équivalences React → Lit :
 *   useGlobalContext()   → GlobalStoreMixin (non utilisé ici, conservé pour cohérence)
 *   <GridControls />     → <grid-controls> (composant Lit déjà traduit)
 */

import { LitElement, html } from 'lit'
import '../components/grid-controls.js'

export class GrillesPage extends LitElement {
  createRenderRoot() { return this }

  render() {
    return html`
      <div class="pg-container">
        <header class="pg-header">
          <h1>Aire de jeu</h1>
          <p>
            L'important n'est pas ce qu'il y a, ie les hypothèses que vous avez posées,
            mais ce qu'il reste, ie ce qui n'a pas été éliminé.
          </p>
        </header>
        <div style="width:100%; max-width:100%; padding:0 15px;">
          <grid-controls style="width:100%;"></grid-controls>
        </div>
      </div>
    `
  }
}

customElements.define('grilles-page', GrillesPage)
