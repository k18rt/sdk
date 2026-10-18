/**
 * pages/index.js
 * Composants de pages – placeholders à remplacer par vos vraies implémentations.
 *
 * En React, ces pages étaient importées dans AppConfig.js :
 *   import HomePage     from '../page/home'
 *   import DonPage      from '../page/don'
 *   …
 *
 * Chaque composant de page reçoit automatiquement le contexte global
 * via GlobalStoreMixin si besoin.
 */

import { LitElement, html, css } from 'lit'
import { GlobalStoreMixin } from '../../store/global-store.js'
import '../../components/grid-controls.js'
import '../../components/ui-elements.js'

// ── Styles partagés ───────────────────────────────────────────────────────
// Note : pas de Shadow DOM sur les pages → createRenderRoot() { return this }
// Les classes .pg-container, .pg-header, .pg-cards… viennent de main.css

// ── Page d'accueil ─────────────────────────────────────────────────────────
export class HomePage extends GlobalStoreMixin(LitElement) {
  createRenderRoot() { return this }

  render() {
    return html`
      <div class="pg-container">
        <div class="pg-header">
          <h1>Bienvenue sur Let's play Sudoku</h1>
          <p>Progressez en vous amusant grâce aux outils d'aide et d'apprentissage.</p>
        </div>
        <div class="pg-cards">
          <div class="pg-card">
            <span class="icon">🎯</span>
            <h2>Jouer</h2>
            <p>Choisissez une grille et commencez à jouer directement dans le panneau à droite.</p>
            <grid-controls></grid-controls>
          </div>
          <div class="pg-card">
            <span class="icon">📚</span>
            <h2>Apprendre</h2>
            <p>Découvrez les techniques de résolution et progressez pas à pas.</p>
            <button class="grid-button" @click=${() => this.globalStore.addPage('plan')}>
              Voir le parcours
            </button>
          </div>
        </div>
      </div>
    `
  }
}
customElements.define('home-page', HomePage)

// ── Page Don ───────────────────────────────────────────────────────────────
export class DonPage extends LitElement {
  createRenderRoot() { return this }
  render() {
    return html`
      <div class="pg-container">
        <div class="pg-header">
          <h1>Faire un don</h1>
          <p>Soutenez le développement de Let's play Sudoku.</p>
        </div>
        <!-- Intégrez ici votre formulaire de don (ex. PayPal, Stripe…) -->
        <p>Merci pour votre soutien !</p>
      </div>
    `
  }
}
customElements.define('don-page', DonPage)

// ── Page Parcours ──────────────────────────────────────────────────────────
export class PlanPage extends GlobalStoreMixin(LitElement) {
  createRenderRoot() { return this }
  render() {
    return html`
      <div class="pg-container">
        <div class="pg-header">
          <h1>Parcours d'apprentissage</h1>
          <p>Maîtrisez le sudoku étape par étape.</p>
        </div>
        <div class="pg-cards">
          <div class="pg-card">
            <h3>Niveau 1</h3>
            <h2>Découverte</h2>
            <p>Les bases : lignes, colonnes et blocs.</p>
            <button class="grid-button" @click=${() => this.globalStore.addPage('plan1')}>
              Commencer
            </button>
          </div>
          <div class="pg-card">
            <h3>Niveau 2</h3>
            <h2>Singleton caché</h2>
            <p>Repérer les chiffres uniques dans une unité.</p>
            <button class="grid-button" @click=${() => this.globalStore.addPage('plan2')}>
              Commencer
            </button>
          </div>
        </div>
      </div>
    `
  }
}
customElements.define('plan-page', PlanPage)

// ── Page Grilles ───────────────────────────────────────────────────────────
export class GrillesPage extends LitElement {
  createRenderRoot() { return this }
  render() {
    return html`
      <div class="pg-container">
        <div class="pg-header">
          <h1>Bibliothèque de grilles</h1>
          <p>Choisissez une grille parmi notre sélection.</p>
        </div>
        <grid-controls></grid-controls>
      </div>
    `
  }
}
customElements.define('grilles-page', GrillesPage)

// ── Page Découverte ────────────────────────────────────────────────────────
export class DecouvertePage extends LitElement {
  createRenderRoot() { return this }
  render() {
    return html`
      <div class="pg-container pg-multi-containers">
        <div class="pg-header">
          <h1>Découverte</h1>
          <p>Comprendre la structure d'une grille de sudoku.</p>
        </div>
        <!-- Contenu pédagogique de la page Découverte -->
        <p>
          Un sudoku est une grille 9×9 divisée en 9 blocs 3×3.
          Chaque ligne, colonne et bloc doit contenir les chiffres 1 à 9 exactement une fois.
        </p>
        <p>
          Consultez aussi la page
          <link-to-page text="Singleton caché" page="plan2"></link-to-page>
          pour aller plus loin.
        </p>
      </div>
    `
  }
}
customElements.define('decouverte-page', DecouvertePage)

// ── Page Singleton caché ────────────────────────────────────────────────────
export class SingletonCachePage extends LitElement {
  createRenderRoot() { return this }
  render() {
    return html`
      <div class="pg-container pg-multi-containers">
        <div class="pg-header">
          <h1>Singleton caché</h1>
          <p>Quand un chiffre n'a qu'une seule case possible dans une unité.</p>
        </div>
        <!-- Contenu pédagogique de la page Singleton caché -->
        <p>
          Si dans une ligne (ou colonne, ou bloc) un chiffre ne peut aller
          que dans une seule case, alors cette case contient obligatoirement ce chiffre.
        </p>
        <p>
          Revenir à
          <link-to-page text="Découverte" page="plan1"></link-to-page>.
        </p>
      </div>
    `
  }
}
customElements.define('singleton-cache-page', SingletonCachePage)
