/**
 * ui-elements.js
 * Remplace Some.js (ButtonIcon + LinkToPage)
 *
 * Équivalences React → Lit :
 *   ButtonIcon  → <button-icon>
 *   LinkToPage  → <link-to-page>
 *
 * Note : ces composants utilisent createRenderRoot() { return this } pour
 * hériter des classes CSS globales (.bi, .bi-active, .bi-selected, .bi-disabled).
 */

import { LitElement, html } from 'lit'
import { globalStore } from '../store/global-store.js'

// ── ButtonIcon ──────────────────────────────────────────────────────────────
/**
 * <button-icon type="active|inactive|selected|disabled" height="24">
 *   <!-- slotted SVG icon -->
 * </button-icon>
 *
 * Props React → attributs Lit :
 *   type     → attribute "type"   (active | inactive | selected | disabled)
 *   icon     → slot default       (le SVG passe via <slot>)
 *   height   → attribute "height"
 *   callback → événement @click sur le host, géré via attribut ou écouteur
 */
export class ButtonIcon extends LitElement {
  static properties = {
    type:     { type: String },
    height:   { type: String },
    // callback n'est pas un attribut : on utilise @click sur le parent
  }

  constructor() {
    super()
    this.type   = 'inactive'
    this.height = 'auto'
  }

  // Pas de Shadow DOM : les classes .bi* sont définies dans main.css
  createRenderRoot() { return this }

  _handleClick(e) {
    // On n'agit que si le bouton est actif (même logique que React)
    if (this.type !== 'active') {
      e.stopImmediatePropagation()
    }
  }

  render() {
    const isActive   = this.type === 'active'
    const isSelected = this.type === 'selected'
    const isDisabled = this.type === 'disabled'

    const classes = [
      'bi',
      isActive   ? 'bi-active'   : '',
      isSelected ? 'bi-selected' : '',
      isDisabled ? 'bi-disabled' : '',
    ].filter(Boolean).join(' ')

    return html`
      <span
        class=${classes}
        style=${`height:${this.height}`}
        @click=${this._handleClick}
      >
        <slot></slot>
      </span>
    `
  }
}

customElements.define('button-icon', ButtonIcon)


// ── LinkToPage ──────────────────────────────────────────────────────────────
/**
 * <link-to-page text="Découverte" page="plan1"></link-to-page>
 *
 * Props React :
 *   text  → attribute "text"
 *   page  → attribute "page"  (clé dans PAGE_COMPONENTS du store)
 */
export class LinkToPage extends LitElement {
  static properties = {
    text: { type: String },
    page: { type: String },
  }

  constructor() {
    super()
    this.text = ''
    this.page = ''
  }

  createRenderRoot() { return this }

  _handleClick(e) {
    e.preventDefault()
    // Équivalent de : globalRemoveLastPage(); globalAddPage(page)
    globalStore.removeLastPage()
    globalStore.addPage(this.page)
  }

  render() {
    return html`
      <a href="#" @click=${this._handleClick}>${this.text}</a>
    `
  }
}

customElements.define('link-to-page', LinkToPage)
