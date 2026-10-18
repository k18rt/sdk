/**
 * sudoku-ui.js
 * Composants UI pour Sudoku - placeholder
 */

import { LitElement, html, css } from 'lit'

// Composants de base
export class SudokuGrid extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
  `
  
  render() {
    return html`<div>Grille Sudoku</div>`
  }
}

export class TopButtonRow extends LitElement {
  render() {
    return html`<div>Boutons supérieurs</div>`
  }
}

export class FillButton extends LitElement {
  render() {
    return html`<button>Remplir</button>`
  }
}

export class AnnotHole extends LitElement {
  render() {
    return html`<div>Annotation</div>`
  }
}

export class HelpOverlay extends LitElement {
  render() {
    return html`<div>Aide</div>`
  }
}

export class ImportModal extends LitElement {
  render() {
    return html`<div>Importation</div>`
  }
}

// Icônes
export class PaintBucketMinusIcon extends LitElement {
  render() {
    return html`<span>🪣-</span>`
  }
}

export class PaintBucketPlusIcon extends LitElement {
  render() {
    return html`<span>🪣+</span>`
  }
}

export class CellHypothesisIcon extends LitElement {
  render() {
    return html`<span>🔍</span>`
  }
}

export class UnitHypothesisIcon extends LitElement {
  render() {
    return html`<span>📍</span>`
  }
}

export class NakedSetsIcon extends LitElement {
  render() {
    return html`<span>👥</span>`
  }
}

export class ExclusiveIntersectionIcon extends LitElement {
  render() {
    return html`<span>⚡</span>`
  }
}

export class SimpleContradictionIcon extends LitElement {
  render() {
    return html`<span>❌</span>`
  }
}

export class ContradictionIcon extends LitElement {
  render() {
    return html`<span>⚠️</span>`
  }
}

export class DoubleFlowIcon extends LitElement {
  render() {
    return html`<span>🔄</span>`
  }
}

// Enregistrement des éléments
customElements.define('sudoku-grid', SudokuGrid)
customElements.define('top-button-row', TopButtonRow)
customElements.define('fill-button', FillButton)
customElements.define('annot-hole', AnnotHole)
customElements.define('help-overlay', HelpOverlay)
customElements.define('import-modal', ImportModal)
customElements.define('paint-bucket-minus-icon', PaintBucketMinusIcon)
customElements.define('paint-bucket-plus-icon', PaintBucketPlusIcon)
customElements.define('cell-hypothesis-icon', CellHypothesisIcon)
customElements.define('unit-hypothesis-icon', UnitHypothesisIcon)
customElements.define('naked-sets-icon', NakedSetsIcon)
customElements.define('exclusive-intersection-icon', ExclusiveIntersectionIcon)
customElements.define('simple-contradiction-icon', SimpleContradictionIcon)
customElements.define('contradiction-icon', ContradictionIcon)
customElements.define('double-flow-icon', DoubleFlowIcon)
