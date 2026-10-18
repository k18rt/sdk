/**
 * resizable-panel.js
 * Remplace le composant React <Resizable> + ResizableContext de Resizable.js
 *
 * Différences clés avec React :
 *  - ResizableContext (useResizable) → événement 'resize' sur le composant
 *    ou lecture directe de resizablePanel.width / .height depuis l'extérieur.
 *  - Pas de Shadow DOM (mode: 'open' quand même) pour conserver les styles globaux
 *    → utilise adoptedStyleSheets ou un <slot> avec styles externes.
 *  - Le handle de redimensionnement est en bas à gauche (identique à React).
 *
 * Attributs / propriétés :
 *   initial-width  (Number, défaut 470)
 *   initial-height (Number, défaut 690)
 *   min-width      (Number, défaut 470)
 *   min-height     (Number, défaut 690)
 *
 * Événements émis :
 *   resize  → detail: { width, height }
 *
 * Usage HTML :
 *   <resizable-panel initial-width="470" initial-height="690">
 *     <!-- contenu -->
 *   </resizable-panel>
 *
 * Usage JS (lecture de la taille) :
 *   const panel = document.querySelector('resizable-panel')
 *   panel.addEventListener('resize', e => console.log(e.detail))
 */

import { LitElement, html, css } from 'lit'

export class ResizablePanel extends LitElement {
  // ── Propriétés déclarées ──────────────────────────────────────────────────
  static properties = {
    initialWidth:  { type: Number, attribute: 'initial-width'  },
    initialHeight: { type: Number, attribute: 'initial-height' },
    minWidth:      { type: Number, attribute: 'min-width'      },
    minHeight:     { type: Number, attribute: 'min-height'     },
    // État interne (équivalent useState)
    _width:        { type: Number, state: true },
    _height:       { type: Number, state: true },
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
      overflow: hidden;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .resize-handle {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 20px;
      height: 20px;
      cursor: nesw-resize;
      background-color: rgba(240,240,240,0.5);
      border-top: 1px solid #ddd;
      border-right: 1px solid #ddd;
      border-top-right-radius: 4px;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: bold;
      user-select: none;
    }
  `

  // ── Valeurs par défaut ────────────────────────────────────────────────────
  constructor() {
    super()
    this.initialWidth  = 470
    this.initialHeight = 690
    this.minWidth      = 470
    this.minHeight     = 690
    this._width        = 470
    this._height       = 690

    // État du redimensionnement (équivalent useRef)
    this._isResizing  = false
    this._startPos    = { x: 0, y: 0 }
    this._startSize   = { width: 0, height: 0 }

    // Liaisons stables pour addEventListener / removeEventListener
    this._onMouseMove = this._handleMouseMove.bind(this)
    this._onMouseUp   = this._handleMouseUp.bind(this)
  }

  // ── Cycle de vie ──────────────────────────────────────────────────────────

  /** Équivalent du premier rendu : initialise la taille à partir des props */
  firstUpdated() {
    this._width  = this.initialWidth
    this._height = this.initialHeight
  }

  /** Équivalent du cleanup du useEffect sur les events souris */
  disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener('mousemove', this._onMouseMove)
    document.removeEventListener('mouseup',   this._onMouseUp)
  }

  // ── Accesseurs publics (remplacent useResizable) ──────────────────────────

  get width()  { return this._width  }
  get height() { return this._height }

  // ── Handlers de souris ────────────────────────────────────────────────────

  _handleMouseDown(e) {
    this._isResizing = true
    this._startPos   = { x: e.clientX, y: e.clientY }
    this._startSize  = { width: this._width, height: this._height }
    e.preventDefault()
    // Attache sur document pour capturer hors du composant (même que React)
    document.addEventListener('mousemove', this._onMouseMove)
    document.addEventListener('mouseup',   this._onMouseUp)
  }

  _handleMouseMove(e) {
    if (!this._isResizing) return
    const dx = -(e.clientX - this._startPos.x)  // tiré vers la gauche = agrandit
    const dy =   e.clientY - this._startPos.y   // tiré vers le bas    = agrandit
    this._width  = Math.max(this.minWidth,  this._startSize.width  + dx)
    this._height = Math.max(this.minHeight, this._startSize.height + dy)
    // Notifie les parents / autres composants intéressés par la taille
    this.dispatchEvent(new CustomEvent('resize', {
      detail: { width: this._width, height: this._height },
      bubbles: true,
      composed: true,
    }))
  }

  _handleMouseUp() {
    this._isResizing = false
    document.removeEventListener('mousemove', this._onMouseMove)
    document.removeEventListener('mouseup',   this._onMouseUp)
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  render() {
    return html`
      <style>
        :host {
          width:  ${this._width}px;
          height: ${this._height}px;
        }
      </style>

      <!-- slot = équivalent de {children} en React -->
      <slot></slot>

      <!-- Handle de redimensionnement – identique à React -->
      <div
        class="resize-handle"
        @mousedown=${this._handleMouseDown}
        title="Redimensionner"
      >⧉</div>
    `
  }
}

customElements.define('resizable-panel', ResizablePanel)
