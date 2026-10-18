/**
 * home-page.js  —  remplace home.js
 *
 * Équivalences React → Lit :
 *   HomePageStyles (<style>)   → <style> dans render() (pas de Shadow DOM)
 *   useGlobalContext()          → GlobalStoreMixin → this.globalStore
 *   globalAddPage(page)         → this.globalStore.addPage(page)
 *   <AppIcon />                 → <app-icon> (composant Lit dans sudoku-header.js)
 *   BrainIcon / PlayIcon        → méthodes SVG _brainIcon() / _playIcon()
 */

import { LitElement, html } from 'lit'
import { GlobalStoreMixin } from '../core/global-store.js'
import '../components/sudoku-header.js'  // enregistre <app-icon>

export class HomePage extends GlobalStoreMixin(LitElement) {
  createRenderRoot() { return this }

  // Équivalent de handlePlayClick — toutes les difficultés vont vers 'grilles'
  _handlePlayClick(/* difficulty */) {
    this.globalStore.addPage('grilles')
  }

  // ── SVG icons ────────────────────────────────────────────────────────────

  _brainIcon() {
    return html`
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 26"
           fill="currentColor" stroke="var(--terracotta-400)" stroke-width="1.5">
        <path d="M12 2a7 7 0 0 0-4 12.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26A7 7 0 0 0 12 2zm-2 19h4v1a2 2 0 0 1-4 0v-1z"/>
      </svg>`
  }

  _playIcon() {
    return html`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 20"
           fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"
           width="72" height="60">
        <path d="M 2 17 A 10 10 0 0 1 9 8.2 L 9.5 10 A 8 8 0 0 0 4 17 Z"/>
        <path d="M 10.09 3.17 A 11 11 0 0 1 13.91 3.17 L 13.39 6.12 A 8 8 0 0 0 10.59 6.12 Z"
              stroke-width="1.1" stroke="var(--terracotta-400)"/>
        <path d="M 22 17 A 10 10 0 0 0 15 8.2 L 14.5 10 A 8 8 0 0 1 20 17 Z"/>
      </svg>`
  }

  render() {
    return html`
      <!-- Équivalent de HomePageStyles -->
      <style>
        .hm-card { border-radius: var(--radius-xl); align-items: center; }
        .choice-buttons {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 10px; padding: 12px 0 0 0; position: relative; bottom: 0;
        }
        .choice-buttons > *:only-child { grid-column: 1 / -1; }
        .choice-button {
          padding: 12px 24px; border-radius: 999px; font-weight: 700; font-size: 1rem;
          background: var(--terracotta-200); color: var(--terracotta-700);
          border: 1px solid var(--terracotta-300); cursor: pointer; transition: background 0.2s ease;
          text-align: center;
        }
        .choice-button:hover {
          background: var(--terracotta-300); border-color: var(--terracotta-400);
          transform: scale(1.05);
        }
      </style>

      <div class="pg-container">
        <!-- En-tête avec AppIcon -->
        <header class="pg-header" style="text-align:left; margin-bottom:2rem;">
          <div style="display:flex; align-items:flex-start; gap:24px;">
            <div style="margin-top:6px;">
              <!-- Équivalent de <AppIcon width={128} height={128} /> -->
              <app-icon width="128" height="128"></app-icon>
            </div>
            <div>
              <h1 style="margin:0 0 0.5rem 0;">
                Bienvenue dans l'univers<br/>du Sudoku !
              </h1>
              <p style="margin:0;">
                Apprends pas à pas…<br/>ou lance-toi directement dans la bataille !
              </p>
            </div>
          </div>
        </header>

        <!-- Cartes -->
        <div class="pg-cards">

          <!-- Carte Parcours d'apprentissage -->
          <div class="pg-card hm-card">
            ${this._brainIcon()}
            <h2>Parcours d'apprentissage</h2>
            <p>Un parcours progressif pour apprendre, pratiquer<br/>et devenir un pro du Sudoku.</p>
            <div class="choice-buttons">
              <span class="choice-button"
                @click=${() => this.globalStore.addPage('plan')}>
                Commencer le parcours
              </span>
            </div>
          </div>

          <!-- Carte Aire de jeu -->
          <div class="pg-card hm-card">
            <span style="scale:1.35;">${this._playIcon()}</span>
            <h2>Aire de jeu</h2>
            <p>Choisis une grille selon ton envie :<br/>facile, moyenne, difficile… ou impossible !</p>
            <div class="choice-buttons">
              <span class="choice-button" @click=${() => this._handlePlayClick('facile')   }>Chill</span>
              <span class="choice-button" @click=${() => this._handlePlayClick('moyen')    }>Corsée</span>
              <span class="choice-button" @click=${() => this._handlePlayClick('difficile')}>Épique</span>
              <span class="choice-button" @click=${() => this._handlePlayClick('mortel')   }>Mortelle</span>
            </div>
          </div>

        </div>
      </div>
    `
  }
}

customElements.define('home-page', HomePage)
