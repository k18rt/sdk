import { LitElement, html, css } from 'lit'
import { appConfigStore } from '../core/app-config-store.js'

const DEFAULT_GRID = '530070000600195000098000060800060003400803001700020006060000280000419005000080079'

export class SudokuApp extends LitElement {
  static properties = {
    _cells: { state: true },
    _selected: { state: true }, // [i, j] or null
    _noteMode: { state: true },
    _history: { state: true },
    _isComplete: { state: true },
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      width: 100%;
      max-width: 500px;
      margin: 0 auto;
      font-family: inherit;
      user-select: none;
    }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 8px;
    }

    .tool-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--terracotta-300, #E38A77);
      background: white;
      color: var(--terracotta-800, #7B3A33);
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tool-btn:hover {
      background: var(--terracotta-100, #F7E7DE);
      border-color: var(--terracotta-500, #C15A4F);
    }

    .tool-btn.active {
      background: var(--terracotta-600, #A44A3F);
      color: white;
      border-color: var(--terracotta-600, #A44A3F);
    }

    .grid-container {
      display: grid;
      grid-template-columns: repeat(9, 1fr);
      grid-template-rows: repeat(9, 1fr);
      width: 100%;
      aspect-ratio: 1;
      background: var(--terracotta-900, #5D2C28);
      border: 3px solid var(--terracotta-900, #5D2C28);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(93, 44, 40, 0.15);
    }

    .cell {
      position: relative;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: clamp(1.1rem, 4vw, 1.6rem);
      font-weight: 700;
      color: var(--terracotta-900, #5D2C28);
      cursor: pointer;
      box-sizing: border-box;
      border-right: 1px solid #e0d8d5;
      border-bottom: 1px solid #e0d8d5;
      transition: background 0.15s ease;
    }

    .cell.border-right-thick {
      border-right: 2px solid var(--terracotta-900, #5D2C28);
    }

    .cell.border-bottom-thick {
      border-bottom: 2px solid var(--terracotta-900, #5D2C28);
    }

    .cell.given {
      background: #f8f4f2;
      color: #2b2b2b;
      font-weight: 800;
    }

    .cell.selected {
      background: var(--terracotta-200, #EFB8A1) !important;
    }

    .cell.highlight {
      background: #fbf0ec;
    }

    .cell.same-num {
      background: #f4d8cd;
    }

    .cell.conflict {
      background: #fcdbd9 !important;
      color: var(--danger, #C23A2B) !important;
    }

    .annots-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
      width: 100%;
      height: 100%;
      padding: 2px;
      box-sizing: border-box;
    }

    .annot-num {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: clamp(0.55rem, 1.8vw, 0.75rem);
      font-weight: 600;
      color: var(--muted, #6B6B6B);
    }

    .numpad {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      width: 100%;
    }

    .num-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      font-size: 1.25rem;
      font-weight: 700;
      border-radius: 10px;
      border: 1px solid var(--terracotta-300, #E38A77);
      background: white;
      color: var(--terracotta-900, #5D2C28);
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      transition: all 0.15s ease;
    }

    .num-btn:hover {
      background: var(--terracotta-600, #A44A3F);
      color: white;
      border-color: var(--terracotta-600, #A44A3F);
    }

    .num-btn.erase {
      grid-column: span 1;
      background: #f0e6e3;
      color: var(--danger, #C23A2B);
    }

    .win-banner {
      width: 100%;
      padding: 12px;
      background: #e8f5e9;
      border: 1px solid #a5d6a7;
      color: #2e7d32;
      border-radius: 8px;
      text-align: center;
      font-weight: 700;
      font-size: 1rem;
    }
  `

  constructor() {
    super()
    this._selected = null
    this._noteMode = false
    this._history = []
    this._isComplete = false
    this._cells = this._parseGrid(DEFAULT_GRID)

    this._onKeyDown = this._onKeyDown.bind(this)
    this._onImportGridChange = this._onImportGridChange.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('keydown', this._onKeyDown)
    appConfigStore.addEventListener('import-grid-change', this._onImportGridChange)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('keydown', this._onKeyDown)
    appConfigStore.removeEventListener('import-grid-change', this._onImportGridChange)
  }

  _onImportGridChange(e) {
    const gridStr = e.detail.importGrid
    if (gridStr) {
      this.loadGrid(gridStr)
    }
  }

  loadGrid(gridStr) {
    this._cells = this._parseGrid(gridStr)
    this._selected = null
    this._history = []
    this._updateState()
  }

  _parseGrid(str) {
    const cells = []
    const cleanStr = str.replace(/[^0-9.]/g, '')
    for (let i = 0; i < 9; i++) {
      const row = []
      for (let j = 0; j < 9; j++) {
        const idx = i * 9 + j
        const char = cleanStr[idx] || '0'
        const num = parseInt(char, 10) || 0
        row.push({
          i,
          j,
          found: num,
          given: num > 0,
          annots: new Set(),
          conflict: false,
        })
      }
      cells.push(row)
    }
    return this._checkConflicts(cells)
  }

  _checkConflicts(cells) {
    // Reset conflicts
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        cells[i][j].conflict = false
      }
    }

    // Check rows, cols, blocks
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const val = cells[i][j].found
        if (val === 0) continue

        // Row
        for (let c = 0; c < 9; c++) {
          if (c !== j && cells[i][c].found === val) {
            cells[i][j].conflict = true
            cells[i][c].conflict = true
          }
        }
        // Col
        for (let r = 0; r < 9; r++) {
          if (r !== i && cells[r][j].found === val) {
            cells[i][j].conflict = true
            cells[r][j].conflict = true
          }
        }
        // Block
        const bi = Math.floor(i / 3) * 3
        const bj = Math.floor(j / 3) * 3
        for (let r = bi; r < bi + 3; r++) {
          for (let c = bj; c < bj + 3; c++) {
            if ((r !== i || c !== j) && cells[r][c].found === val) {
              cells[i][j].conflict = true
              cells[r][c].conflict = true
            }
          }
        }
      }
    }
    return cells
  }

  _updateState() {
    this._cells = this._checkConflicts([...this._cells.map(r => [...r])])
    this._checkCompletion()
  }

  _checkCompletion() {
    let complete = true
    let conflict = false
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (this._cells[i][j].found === 0) complete = false
        if (this._cells[i][j].conflict) conflict = true
      }
    }
    this._isComplete = complete && !conflict
  }

  _selectCell(i, j) {
    this._selected = [i, j]
  }

  _inputNumber(num) {
    if (!this._selected) return
    const [i, j] = this._selected
    const cell = this._cells[i][j]
    if (cell.given) return

    // Save history state
    this._saveHistory()

    if (this._noteMode) {
      if (num === 0) {
        cell.annots.clear()
      } else {
        if (cell.annots.has(num)) {
          cell.annots.delete(num)
        } else {
          cell.annots.add(num)
        }
      }
    } else {
      if (cell.found === num) {
        cell.found = 0
      } else {
        cell.found = num
      }
    }
    this._updateState()
  }

  _saveHistory() {
    const snapshot = this._cells.map(r =>
      r.map(c => ({
        found: c.found,
        annots: new Set(c.annots),
      }))
    )
    this._history = [...this._history, snapshot]
  }

  _undo() {
    if (this._history.length === 0) return
    const last = this._history[this._history.length - 1]
    this._history = this._history.slice(0, -1)

    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        this._cells[i][j].found = last[i][j].found
        this._cells[i][j].annots = new Set(last[i][j].annots)
      }
    }
    this._updateState()
  }

  _reset() {
    this._history = []
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (!this._cells[i][j].given) {
          this._cells[i][j].found = 0
          this._cells[i][j].annots.clear()
        }
      }
    }
    this._updateState()
  }

  _onKeyDown(e) {
    if (!this._selected) return

    const [i, j] = this._selected
    if (e.key >= '1' && e.key <= '9') {
      this._inputNumber(parseInt(e.key, 10))
    } else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
      this._inputNumber(0)
    } else if (e.key === 'n' || e.key === 'N') {
      this._noteMode = !this._noteMode
    } else if (e.key === 'ArrowUp' && i > 0) {
      this._selected = [i - 1, j]
    } else if (e.key === 'ArrowDown' && i < 8) {
      this._selected = [i + 1, j]
    } else if (e.key === 'ArrowLeft' && j > 0) {
      this._selected = [i, j - 1]
    } else if (e.key === 'ArrowRight' && j < 8) {
      this._selected = [i, j + 1]
    }
  }

  render() {
    const selVal = this._selected
      ? this._cells[this._selected[0]][this._selected[1]].found
      : 0

    return html`
      <div class="toolbar">
        <button class="tool-btn" @click=${this._reset}>
          🔄 Réinitialiser
        </button>
        <button
          class="tool-btn ${this._noteMode ? 'active' : ''}"
          @click=${() => (this._noteMode = !this._noteMode)}
        >
          ✏️ Notes ${this._noteMode ? '(ON)' : '(OFF)'}
        </button>
        <button
          class="tool-btn"
          ?disabled=${this._history.length === 0}
          @click=${this._undo}
        >
          ↩️ Annuler
        </button>
      </div>

      ${this._isComplete
        ? html`<div class="win-banner">🎉 Bravo ! La grille est complétée avec succès !</div>`
        : ''}

      <div class="grid-container">
        ${this._cells.map((row, i) =>
          row.map((cell, j) => {
            const isSelected = this._selected && this._selected[0] === i && this._selected[1] === j
            const isHighlight =
              this._selected &&
              (this._selected[0] === i ||
                this._selected[1] === j ||
                (Math.floor(this._selected[0] / 3) === Math.floor(i / 3) &&
                  Math.floor(this._selected[1] / 3) === Math.floor(j / 3)))
            const isSameNum = selVal > 0 && cell.found === selVal && !isSelected

            const classes = [
              'cell',
              j % 3 === 2 && j !== 8 ? 'border-right-thick' : '',
              i % 3 === 2 && i !== 8 ? 'border-bottom-thick' : '',
              cell.given ? 'given' : '',
              isSelected ? 'selected' : '',
              isHighlight && !isSelected ? 'highlight' : '',
              isSameNum ? 'same-num' : '',
              cell.conflict ? 'conflict' : '',
            ].filter(Boolean).join(' ')

            return html`
              <div
                class="${classes}"
                @click=${() => this._selectCell(i, j)}
              >
                ${cell.found > 0
                  ? cell.found
                  : cell.annots.size > 0
                  ? html`
                      <div class="annots-grid">
                        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(
                          n => html`
                            <span class="annot-num">
                              ${cell.annots.has(n) ? n : ''}
                            </span>
                          `
                        )}
                      </div>
                    `
                  : ''}
              </div>
            `
          })
        )}
      </div>

      <div class="numpad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(
          num => html`
            <button
              class="num-btn"
              @click=${() => this._inputNumber(num)}
            >
              ${num}
            </button>
          `
        )}
        <button
          class="num-btn erase"
          @click=${() => this._inputNumber(0)}
        >
          ⌫ Effacer
        </button>
      </div>
    `
  }
}

customElements.define('sudoku-app', SudokuApp)
