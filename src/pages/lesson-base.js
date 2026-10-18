/**
 * lesson-base.js
 * Classe de base partagée entre decouverte-page.js et singleton-cache-page.js
 *
 * Dans React, les deux pages avaient un code quasi-identique :
 *   - Mêmes icônes SVG (MessageCircleMore, Microscope, Origami, SquareStack…)
 *   - Même composant <Steps prev next setState>
 *   - Même composant <PrCard card setState>
 *   - Même layout à deux états : 0 = liste de cartes, 1-6 = contenu d'une carte
 *   - Même barre de navigation (.pr-menu)
 *
 * En Lit, on factorise tout ça dans LessonBasePage (LitElement + mixins).
 * Chaque page enfant déclare :
 *   - get pageTitle()       → titre de la page (ex. "Découverte du Sudoku")
 *   - get pageSubtitle()    → sous-titre
 *   - get menuLabel()       → label de retour dans .pr-menu (ex. "Découverte")
 *   - get cards()           → tableau de définitions de cartes { key, title, description, icon, content }
 *
 * Équivalences React → Lit :
 *   useState(0)              → _state (propriété réactive @state)
 *   setState(n)              → this._state = n
 *   ButtonIcon               → méthode _bi(type, svg, height, callback)
 *   Icons React              → méthodes SVG _iconXxx()
 *   Styles inline (<style>)  → <style> dans render() (pas de Shadow DOM)
 */

import { LitElement, html } from 'lit'
import { AppConfigMixin } from '../core/app-config-store.js'
import { GlobalStoreMixin } from '../core/global-store.js'

// Combine les deux mixins en une base commune
const Base = AppConfigMixin(GlobalStoreMixin(LitElement))

export class LessonBasePage extends Base {
  static properties = {
    _state: { state: true }, // équivalent useState(0)
  }

  constructor() {
    super()
    this._state = 0
  }

  createRenderRoot() { return this }

  // ── À surcharger dans les sous-classes ───────────────────────────────────
  get pageTitle()    { return '' }
  get pageSubtitle() { return '' }
  get menuLabel()    { return '' }
  get cards()        { return [] }

  // ── Styles partagés ───────────────────────────────────────────────────────
  // Équivalent de PriseEnMainStyles / SingletonCacheStyles
  _sharedStyles() {
    return html`
      <style>
        .pr-card { padding: 1rem; gap: 0rem; align-items: center; cursor: pointer; }
        .no-padding { padding: 0; }
        .pr-menu {
          display: flex; justify-content: space-between; align-items: center;
          gap: 1.5rem; padding: 0 1.5rem; height: 60px;
          background-color: var(--terracotta-050);
          border: 2px solid var(--terracotta-500);
          border-radius: var(--radius-lg); margin-bottom: 0.5rem;
          width: 100%; box-sizing: border-box;
        }
        .pr-menu-title {
          font-weight: 600; color: var(--terracotta-500); cursor: pointer;
          padding: 0.5rem 1rem; border-radius: 6px;
          transition: scale 0.2s; transform: scale(1);
        }
        .pr-menu-title:hover { transform: scale(1.05); }
        .pr-menu-icons {
          display: flex; gap: 2rem; align-items: center;
          margin-left: auto; padding-right: 1rem;
        }
        .pr-content { width: 100%; padding: 0 5px 0 20px; }
        .pr-content p, .pr-content ul, .pr-content li { text-align: left; }
        .exemples ul { padding-top: 2px; padding-inline-start: 15px; padding-bottom: 10px; margin-bottom: 0; }
        .exemples ul ul { padding-inline-start: 15px; list-style-type: none; text-indent: -10px; }
        .exemples ul ul ul { padding-bottom: 0; line-height: 1.2rem; }
      </style>
    `
  }

  // ── ButtonIcon helper ─────────────────────────────────────────────────────
  // Équivalent de <ButtonIcon type height callback icon />
  // Génère directement un <span class="bi ..."> sans passer par le custom element
  // (plus simple ici car on est dans un contexte no-Shadow-DOM)
  _bi(type, svgTemplate, height, callback) {
    const isActive   = type === 'active'
    const isSelected = type === 'selected'
    const isDisabled = type === 'disabled'
    const cls = [
      'bi',
      isActive   ? 'bi-active'   : '',
      isSelected ? 'bi-selected' : '',
      isDisabled ? 'bi-disabled' : '',
    ].filter(Boolean).join(' ')
    return html`
      <span
        class=${cls}
        style="height:${height}px; display:inline-block; vertical-align:middle;"
        @click=${(isActive && callback) ? callback : undefined}
      >${svgTemplate}</span>
    `
  }

  // ── Icônes SVG (identiques dans decouverte.js et singleton-cache.js) ──────

  _iconMessageCircleMore() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="height:100%;width:auto;"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>`
  }
  _iconMicroscope() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="height:100%;width:auto;"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></svg>`
  }
  _iconOrigami() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="height:100%;width:auto;"><path d="M12 12V4a1 1 0 0 1 1-1h6.297a1 1 0 0 1 .651 1.759l-4.696 4.025"/><path d="m12 21-7.414-7.414A2 2 0 0 1 4 12.172V6.415a1.002 1.002 0 0 1 1.707-.707L20 20.009"/><path d="m12.214 3.381 8.414 14.966a1 1 0 0 1-.167 1.199l-1.168 1.163a1 1 0 0 1-.706.291H6.351a1 1 0 0 1-.625-.219L3.25 18.8a1 1 0 0 1 .631-1.781l4.165.027"/></svg>`
  }
  _iconSquareStack() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="height:100%;width:auto;"><path d="M4 10c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"/><path d="M10 16c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"/><rect width="8" height="8" x="14" y="14" rx="2"/></svg>`
  }
  _iconExperiment() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="height:100%;width:auto;"><path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"/><path d="M6.453 15h11.094"/><path d="M8.5 2h7"/></svg>`
  }
  _iconMagic() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="height:100%;width:auto;"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/></svg>`
  }
  _iconStepBack() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="height:100%;width:auto;"><path d="M13.971 4.285A2 2 0 0 1 17 6v12a2 2 0 0 1-3.029 1.715l-9.997-5.998a2 2 0 0 1-.003-3.432z"/></svg>`
  }
  _iconStepForward() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="height:100%;width:auto;"><path d="M10.029 4.285A2 2 0 0 0 7 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z"/></svg>`
  }
  _iconGrid() {
    return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="height:100%;width:auto;"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>`
  }

  // ── Bouton de chargement de grille ────────────────────────────────────────
  // Équivalent de <ButtonIcon type="active" icon={<GridIcon />} height={25} callback={...} />
  _gridBtn(grid) {
    return this._bi('active', this._iconGrid(), 25,
      () => this.appConfigStore.setImportGrid(grid))
  }

  // ── Link vers une autre page ───────────────────────────────────────────────
  // Équivalent de <LinkToPage text page />
  _linkTo(text, page) {
    return html`<a href="#" @click=${(e) => { e.preventDefault(); this.globalStore.removeLastPage(); this.globalStore.addPage(page) }}>${text}</a>`
  }

  // ── Steps – équivalent du composant React <Steps prev next setState> ──────
  _steps(prev, next) {
    return html`
      <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-right:1rem;">
        ${this._bi('active', this._iconStepBack(), 18, () => { this._state = prev })}
        ${this._bi(next === -1 ? 'disabled' : 'active', this._iconStepForward(), 18,
            next === -1 ? undefined : () => { this._state = next })}
      </div>
    `
  }

  // ── PrCard – équivalent du composant React <PrCard card setState> ─────────
  _prCard(card) {
    return html`
      <div class="pg-card pr-card" @click=${() => { this._state = card.key }}>
        ${this._bi('inactive', card.icon, 36)}
        <h3>${card.title}</h3>
        <p>${card.description}</p>
      </div>
    `
  }

  // ── Layout principal ──────────────────────────────────────────────────────
  // Équivalent du return dans PriseEnMainLayout / SingletonCacheLayout
  render() {
    const cards  = this.cards
    const state  = this._state
    const isMenu = state === 0
    const card   = !isMenu ? cards[state - 1] : null

    return html`
      ${this._sharedStyles()}
      <div class="pg-container ${!isMenu ? 'no-padding' : ''}">

        ${isMenu ? html`
          <!-- Vue liste de cartes -->
          <header class="pg-header">
            <h1>${this.pageTitle}</h1>
            <p>${this.pageSubtitle}</p>
          </header>
          <div class="pg-cards">
            ${cards.map(c => this._prCard(c))}
          </div>
        ` : html`
          <!-- Vue contenu d'une carte : barre de navigation + contenu -->
          <div class="pr-menu">
            <div class="pr-menu-title" @click=${() => { this._state = 0 }}>
              ${this.menuLabel}
            </div>
            <div class="pr-menu-icons">
              ${cards.map(c => this._bi(
                state === c.key ? 'selected' : 'active',
                c.icon, 26,
                () => { this._state = c.key }
              ))}
            </div>
          </div>
          <div class="pr-content">
            ${card ? this._renderCardContent(card) : html``}
            ${this._steps(state - 1, state < cards.length ? state + 1 : -1)}
          </div>
        `}

      </div>
    `
  }

  // À surcharger dans les sous-classes pour rendre le contenu spécifique
  _renderCardContent(card) {
    return html``
  }
}
