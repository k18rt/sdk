import { html, svg } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { ref } from 'lit/directives/ref.js';
import { cssStyle, uiState } from './lit-state.js';
export function SudokuGrid({
  cellSize,
  renderCell,
  deductionMap
}) {
  let ci = -1;
  let cj = -1;
  return html`<div class=${"sudoku-grid"} style=${styleMap(cssStyle({
    width: cellSize * 9,
    height: cellSize * 9,
    border: '5px solid black',
    margin: '0 auto',
    position: 'relative',
    background: 'white',
    boxSizing: 'content-box'
  }))}>${[...Array(9)].map((_, i) => html`<div class=${"row"} style=${styleMap(cssStyle({
    display: 'flex'
  }))}>${[...Array(9)].map((_, j) => renderCell(i, j, deductionMap))}</div>`)}${[1, 2].map(n => [html`<div class=${"thick-line h"} style=${styleMap(cssStyle({
    top: n * 3 * cellSize - 2,
    left: 0,
    width: cellSize * 9,
    height: 4
  }))}></div>`, html`<div class=${"thick-line v"} style=${styleMap(cssStyle({
    left: n * 3 * cellSize - 2,
    top: 0,
    width: 4,
    height: cellSize * 9
  }))}></div>`])}</div>`;
}
export function NewGridButton({
  newGame,
  difficulty,
  setDifficulty,
  loading
}) {
  // Empêche le clic sur le select de déclencher le onClick du bouton parent
  function handleSelectClick(e) {
    e.stopPropagation();
  }
  return html`<button class=${"sudoku-btn"} @click=${newGame} ?disabled=${loading} style=${styleMap(cssStyle({
    flex: 2,
    fontSize: 20,
    padding: '0 10px',
    lineHeight: 1,
    position: 'relative'
  }))}>${html`<div style=${styleMap(cssStyle({
    padding: '0 0px 0px 0'
  }))}>${html`<span class=${"spinner"} style=${styleMap(cssStyle({
    display: loading ? 'inherit' : 'none'
  }))}></span>`}${html`<span style=${styleMap(cssStyle({
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column"
  }))}>${html`<span style=${styleMap(cssStyle({
    lineHeight: 1,
    fontWeight: 500,
    marginTop: 6,
    marginBottom: -6,
    flexShrink: 0
  }))}>${"\u293A"}</span>`}${html`<span style=${styleMap(cssStyle({
    lineHeight: 1,
    fontWeight: 500,
    marginTop: -6,
    marginBottom: 6,
    flexShrink: 0
  }))}>${"\u293B"}</span>`}</span>`}</div>`}${html`<select .value=${difficulty} @change=${e => setDifficulty(e.target.value)} @click=${handleSelectClick} style=${styleMap(cssStyle({
    position: 'absolute',
    right: 4,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 13,
    color: '#888',
    fontWeight: 700,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    padding: '1px 4px',
    margin: 0,
    width: 38,
    textAlign: 'right',
    cursor: 'pointer',
    borderRadius: 4,
    transition: 'border 0.2s',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none'
  }))} title=${"Difficult\xE9"} @mouseover=${e => e.target.style.border = '1px solid #aaa'} @mouseout=${e => e.target.style.border = 'none'}>${html`<option .value=${"facile"}>${"\u25CF"}</option>`}${html`<option .value=${"moyen"}>${"\u25CF\u25CF"}</option>`}${html`<option .value=${"difficile"}>${"\u25CF\u25CF\u25CF"}</option>`}${html`<option .value=${"expert"}>${"\u25CF\u25CF\u25CF\u25CF"}</option>`}</select>`}</button>`;
}
export function TopButtonRow({
  cellSize,
  difficulty,
  setDifficulty,
  handleNewGame,
  handleImportGame,
  handleVerify,
  annotateMode,
  setAnnotateMode,
  handleErase,
  style,
  loading
}) {
  return html`<div class=${"button-row"} style=${styleMap(cssStyle({
    width: '100%',
    display: 'flex',
    gap: 10,
    ...style
  }))}>${html`<div style=${styleMap(cssStyle({
    flex: 2,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    margin: 0
  }))}>${html`<div class=${"newgame-panel"} style=${styleMap(cssStyle({
    margin: 0,
    width: '100%'
  }))}>${html`<div class=${"newgame-title"}>${"Grille"}</div>`}${html`<div class=${"newgame-choices"}>${NewGridButton({
    newGame: handleNewGame,
    difficulty: difficulty,
    setDifficulty: setDifficulty,
    loading: loading,
    children: []
  })}${html`<button class=${"sudoku-btn"} @click=${handleImportGame} style=${styleMap(cssStyle({
    flex: 1,
    fontSize: 18,
    fontWeight: 500,
    color: '#1976d2'
  }))} title=${"Importer une grille"}>${"\uD83D\uDCCB"}</button>`}${html`<button class=${"sudoku-btn"} @click=${handleVerify} style=${styleMap(cssStyle({
    flex: 1,
    fontSize: 22,
    fontWeight: 700,
    color: '#388e3c'
  }))} title=${"V\xE9rifier la grille"}>${"\u2713"}</button>`}</div>`}</div>`}</div>`}${html`<div style=${styleMap(cssStyle({
    flex: 2,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    margin: 0
  }))}>${html`<div class=${"annotation-mode-panel"} style=${styleMap(cssStyle({
    margin: 0,
    width: '100%'
  }))}>${html`<div class=${"annotation-title"}>${"Saisir"}</div>`}${html`<div class=${"annotation-choices"}>${html`<button class=${`sudoku-btn${annotateMode === "+" ? " active" : ""}`} @click=${() => setAnnotateMode("+")}>${"="}</button>`}${html`<button class=${`sudoku-btn${annotateMode === "?" ? " active" : ""}`} @click=${() => setAnnotateMode("?")}>${"+"}</button>`}${html`<button class=${`sudoku-btn${annotateMode === "-" ? " active" : ""}`} @click=${() => setAnnotateMode("-")}>${"-"}</button>`}${html`<button @click=${handleErase} class=${"sudoku-btn"} style=${styleMap(cssStyle({
    marginLeft: 8,
    color: '#b71c1c',
    border: '1px solid #f8d7da'
  }))}>${"\xD7"}</button>`}</div>`}</div>`}</div>`}</div>`;
}
export function FillButton({
  isOn,
  setOn,
  title,
  icon
}) {
  return html`<button class=${`fill-btn${isOn ? " active" : ""}`} @click=${() => setOn(!isOn)} style=${styleMap(cssStyle({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 0',
    backgroundColor: isOn ? '#fafbfc' : 'rgba(25, 118, 210, 0.1)'
  }))} title=${title}>${icon}</button>`;
}
/*
            <UnitHypothesisIcon
              size={20}
              color={showExclusiveSingle ? '#1976d2' : '#666'}
              filled={showExclusiveSingle}
            />
*/
/////// Annot Hole ///////

export function AnnotHole({
  size = 4,
  fill = "#222",
  stroke = "#888",
  strokeWidth = 1
} = {}) {
  return html`<svg width=${size} height=${size} viewBox=${`0 0 ${size} ${size}`}>${svg`<circle cx=${size / 2} cy=${size / 2} r=${(size - strokeWidth) / 2} fill=${fill} stroke=${stroke} stroke-width=${strokeWidth}></circle>`}</svg>`;
}
const AnnotHole2 = ({
  size = 4,
  stroke = "#bbb",
  strokeWidth = 1
} = {}) => html`<svg width=${size} height=${size} viewBox=${`0 0 ${size} ${size}`}>${html`<defs>${html`<radialGradient id=${"hole3d"} cx=${"50%"} cy=${"50%"} r=${"50%"}>${html`<stop offset=${"0%"} stop-color=${"#222"}></stop>`}${html`<stop offset=${"60%"} stop-color=${"#444"}></stop>`}${html`<stop offset=${"100%"} stop-color=${"#bbb"}></stop>`}</radialGradient>`}</defs>`}${svg`<circle cx=${size / 2} cy=${size / 2} r=${(size - strokeWidth) / 2} fill=${"url(#hole3d)"} stroke=${stroke} stroke-width=${strokeWidth}></circle>`}</svg>`;
export function AnnotCross({
  size = 6,
  stroke = "#888",
  strokeWidth = 1
} = {}) {
  return html`<svg width=${size} height=${size} viewBox=${`0 0 ${size} ${size}`}>${svg`<line x1=${strokeWidth} y1=${strokeWidth} x2=${size - strokeWidth} y2=${size - strokeWidth} stroke=${stroke} stroke-width=${strokeWidth}></line>`}${svg`<line x1=${size - strokeWidth} y1=${strokeWidth} x2=${strokeWidth} y2=${size - strokeWidth} stroke=${stroke} stroke-width=${strokeWidth}></line>`}</svg>`;
}

// Icône pour les hypothèses de case (un chiffre dans un carré)
export function CellHypothesisIcon({
  size = 20
}) {
  return html`<span class=${"annot annot-found"} style=${styleMap(cssStyle({
    width: `${size}px`,
    height: `${size}px`
  }))}></span>`;
}

// Icône pour les hypothèses d'unité (trois chiffres alignés)
export function UnitHypothesisIcon({
  size = 20
}) {
  return html`<span class=${"annot annot-alone-block"} style=${styleMap(cssStyle({
    width: `${size}px`,
    height: `${size}px`
  }))}></span>`;
}

// Icône pour les naked sets (plusieurs chiffres groupés)
export function NakedSetsIcon({
  size = 20
}) {
  return html`<div style=${styleMap(cssStyle({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${size}px`,
    height: `${size}px`
  }))}>${html`<div style=${styleMap(cssStyle({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }))}>${html`<div style=${styleMap(cssStyle({
    width: `${size / 2}px`
  }))}></div>`}${html`<div class=${"annot annot-found"} style=${styleMap(cssStyle({
    width: `${size / 2}px`,
    height: `${size / 2}px`
  }))}></div>`}</div>`}${html`<div style=${styleMap(cssStyle({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }))}>${html`<div class=${"annot annot-found"} style=${styleMap(cssStyle({
    width: `${size / 2}px`,
    height: `${size / 2}px`
  }))}></div>`}${html`<div style=${styleMap(cssStyle({
    width: `${size / 2}px`
  }))}></div>`}</div>`}</div>`;
}
export function ExclusiveIntersectionIcon({
  size = 20
}) {
  return html`<div style=${styleMap(cssStyle({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${size}px`,
    height: `${size / 2}px`,
    gap: `1px`
  }))}>${html`<div class=${"annot annot-alone-block"} style=${styleMap(cssStyle({
    width: `${size / 3}px`,
    height: `${1.2 * size / 9}px`
  }))}></div>`}${html`<div class=${"annot annot-alone-block"} style=${styleMap(cssStyle({
    width: `${size / 3}px`,
    height: `${1.2 * size / 9}px`
  }))}></div>`}${html`<div style=${styleMap(cssStyle({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: `1px`
  }))}>${html`<div class=${"annot annot-alone-block"} style=${styleMap(cssStyle({
    width: `${size / 3}px`,
    height: `${1.2 * size / 9}px`
  }))}></div>`}${html`<div class=${"annot annot-alone-block"} style=${styleMap(cssStyle({
    width: `${size / 3}px`,
    height: `${1.2 * size / 9}px`
  }))}></div>`}${html`<div class=${"annot annot-alone-block"} style=${styleMap(cssStyle({
    width: `${size / 3}px`,
    height: `${1.2 * size / 9}px`
  }))}></div>`}</div>`}</div>`;
}
export function SimpleContradictionIcon({
  size = 20
}) {
  return (//<span className="annot annot-digit-chain" style={{width: `${size}px`, height: `${size}px`}}></span>
    //<polygon fill="#b71c1c" points="65,5 20,60 45,55 35,95 80,40 55,40 65,5" />
    //<polygon stroke="#b71c1c" strokeWidth="5" fill="none" points="65,5 20,60 47,55 35,95 80,40 53,45 65,5" />
    html`<svg width=${size} height=${size} viewBox=${"0 0 100 100"}>${svg`<polygon stroke=${"#b71c1c"} stroke-width=${"4"} fill=${"none"} points=${"70,5 20,60 47,55 30,95 80,40 53,45 70,5"}></polygon>`}</svg>`
  );
}
export function ContradictionIcon({
  size = 20
}) {
  return html`<svg width=${size} height=${size} viewBox=${"0 0 100 100"}>${svg`<polygon stroke=${"#b71c1c"} stroke-width=${"3"} fill=${"#b71c1c"} points=${"70,5 20,60 47,55 30,95 80,40 53,45 70,5"}></polygon>`}</svg>`;
}
export function DoubleFlowIcon({
  size = 20
}) {
  return html`<svg width=${size} height=${size} viewBox=${"0 0 100 100"}>${html`<defs>${html`<marker id=${"arrowhead-blue"} marker-width=${"10"} marker-height=${"7"} ref-x=${"8"} ref-y=${"3.5"} orient=${"auto"}>${svg`<polygon points=${"0 0, 10 3.5, 0 7"} fill=${"#3498db"}></polygon>`}</marker>`}${html`<marker id=${"arrowhead-green"} marker-width=${"10"} marker-height=${"7"} ref-x=${"8"} ref-y=${"3.5"} orient=${"auto"}>${svg`<polygon points=${"0 0, 10 3.5, 0 7"} fill=${"#2ecc71"}></polygon>`}</marker>`}</defs>`}${svg`<path d=${"M 7 48 C 25 0, 65 30, 90 48"} stroke=${"#3498db"} stroke-width=${"3"} fill=${"none"} marker-end=${"url(#arrowhead-blue)"}></path>`}${svg`<path d=${"M 10 52 C 75 100, 65 90, 95 55"} stroke=${"#2ecc71"} stroke-width=${"3"} fill=${"none"} marker-end=${"url(#arrowhead-green)"}></path>`}</svg>`;
}

// Icône SVG pot de peinture -
export function PaintBucketMinusIcon({
  size = 30,
  color = "#1976d2"
}) {
  return html`<svg width=${size} height=${size} viewBox=${"0 0 160 160"} preserveAspectRatio=${"xMidYMid meet"}>${svg`<g transform=${"translate(0.000000,160.000000) scale(0.100000,-0.100000)"} fill=${"#000000"} stroke=${"none"}>${svg`<path d=${"M405 1511 c-105 -26 -182 -128 -201 -269 -5 -43 -3 -53 15 -71 42 -42 75 -18 85 61 13 99 84 188 151 188 24 0 67 -25 97 -57 l28 -29 -226 -224 c-124 -124 -232 -237 -240 -252 -8 -15 -14 -44 -14 -65 0 -36 11 -49 223 -260 217 -218 223 -223 263 -223 27 0 53 8 75 23 99 67 506 392 521 415 10 15 18 45 18 67 0 38 -8 47 -317 357 -289 290 -322 320 -367 333 -54 16 -65 17 -111 6z m455 -456 l205 -205 -408 0 c-224 0 -407 3 -407 7 0 9 392 403 400 403 3 0 97 -92 210 -205z"}></path>`}${svg`<path d=${"M1294 575 c-16 -7 -37 -21 -46 -31 -55 -62 -109 -259 -89 -325 24 -79 88 -129 166 -129 97 0 165 61 173 154 5 64 -18 159 -58 242 -41 84 -89 113 -146 89z"} fill=${"white"}></path>`}${svg`<rect x=${"1200"} y=${"200"} width=${"400"} height=${"100"} fill=${color}></rect>`}</g>`}</svg>`;
}

// Icône SVG pot de peinture +
export function PaintBucketPlusIcon({
  size = 30,
  color = "#1976d2"
}) {
  return html`<svg width=${size} height=${size} viewBox=${"0 0 160 160"} preserveAspectRatio=${"xMidYMid meet"}>${svg`<g transform=${"translate(0.000000,160.000000) scale(0.100000,-0.100000)"} fill=${"#000000"} stroke=${"none"}>${svg`<path d=${"M405 1511 c-105 -26 -182 -128 -201 -269 -5 -43 -3 -53 15 -71 42 -42 75 -18 85 61 13 99 84 188 151 188 24 0 67 -25 97 -57 l28 -29 -226 -224 c-124 -124 -232 -237 -240 -252 -8 -15 -14 -44 -14 -65 0 -36 11 -49 223 -260 217 -218 223 -223 263 -223 27 0 53 8 75 23 99 67 506 392 521 415 10 15 18 45 18 67 0 38 -8 47 -317 357 -289 290 -322 320 -367 333 -54 16 -65 17 -111 6z m455 -456 l205 -205 -408 0 c-224 0 -407 3 -407 7 0 9 392 403 400 403 3 0 97 -92 210 -205z"}></path>`}${svg`<path d=${"M1294 575 c-16 -7 -37 -21 -46 -31 -55 -62 -109 -259 -89 -325 24 -79 88 -129 166 -129 97 0 165 61 173 154 5 64 -18 159 -58 242 -41 84 -89 113 -146 89z"} fill=${"white"}></path>`}${svg`<rect x=${"1350"} y=${"50"} width=${"100"} height=${"400"} fill=${color}></rect>`}${svg`<rect x=${"1200"} y=${"200"} width=${"400"} height=${"100"} fill=${color}></rect>`}</g>`}</svg>`;
}
export function HelpOverlay({
  visible,
  onClose
}) {
  if (!visible) return null;
  return html`<div class="sudoku-help" role="dialog" aria-label="Aide Sudoku" style=${styleMap(cssStyle({
    position: 'fixed',
    top: 0,
    right: 0,
    height: '100vh',
    background: '#fff',
    borderLeft: '2px solid #bbb',
    boxShadow: '-2px 0 8px #0001',
    zIndex: 1000,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: 340
  }))}><button class="sudoku-help-close" aria-label="Fermer l’aide" @click=${onClose}>×</button>${html`<div style=${styleMap(cssStyle({
    fontSize: 40,
    fontWeight: 'bold',
    width: 48,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  }))}>${"\u24D8"}</div>`}${html`<div style=${styleMap(cssStyle({
    textAlign: 'left',
    fontSize: 16,
    lineHeight: 1.6,
    width: '100%',
    maxWidth: 300
  }))}>${html`<b>${"Raccourcis clavier"}</b>`}${html`<ul style=${styleMap(cssStyle({
    margin: '8px 0 12px 18px',
    padding: 0,
    listStyle: 'none'
  }))}>${html`<li style=${styleMap(cssStyle({
    margin: 0
  }))}>${html`<b>${"="}</b>`}${" : solution"}</li>`}${html`<li style=${styleMap(cssStyle({
    margin: '12px 0 0 0',
    fontWeight: 'bold'
  }))}>${"Annotation"}</li>`}${html`<li style=${styleMap(cssStyle({
    margin: 0
  }))}>${html`<b>${"+"}</b>`}${" : positive (hypoth\xE8se)"}</li>`}${html`<li style=${styleMap(cssStyle({
    margin: 0
  }))}>${html`<b>${"-"}</b>`}${" : n\xE9gative (certainement pas lui)"}</li>`}${html`<li style=${styleMap(cssStyle({
    margin: '14px 0 0 0',
    fontWeight: 'bold'
  }))}>${"S\xE9lection"}</li>`}${html`<li style=${styleMap(cssStyle({
    margin: 0
  }))}>${"simple : clic sur la case"}</li>`}${html`<li style=${styleMap(cssStyle({
    margin: 0
  }))}>${"multiple : maintenir le clic et glisser (trackpad : double-tap maintenu), ou glisser le doigt sur mobile ; Maj ajoute ou retire les cases traversées"}</li>`}${html`<li style=${styleMap(cssStyle({
    margin: '14px 0 0 0',
    fontWeight: 'bold'
  }))}>${"Navigation"}</li>`}${html`<li style=${styleMap(cssStyle({
    margin: 0
  }))}>${html`<b style=${styleMap(cssStyle({
    display: 'inline-block',
    transform: 'scaleX(-1)'
  }))}>${"\u279C"}</b>`}${" : annuler (undo)"}</li>`}${html`<li style=${styleMap(cssStyle({
    margin: 0
  }))}>${html`<b>${"\u279C"}</b>`}${" : r\xE9tablir (redo)"}</li>`}</ul>`}${html`<div style=${styleMap(cssStyle({
    marginTop: 18,
    marginLeft: 0,
    fontSize: 15
  }))}>${html`<div style=${styleMap(cssStyle({
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: 6,
    fontWeight: 'bold'
  }))}>${"Signification"}</div>`}${html`<div style=${styleMap(cssStyle({
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: 6
  }))}>${html`<span class=${"annot annot-found"} style=${styleMap(cssStyle({
    marginRight: 8,
    width: 40,
    height: 24,
    fontSize: 16
  }))}>${"5"}</span>`}${html`<span>${"Annotation dans un cercle : seule hypoth\xE8se possible dans la case"}</span>`}</div>`}${html`<div style=${styleMap(cssStyle({
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: 6
  }))}>${html`<span class=${"annot annot-alone-block"} style=${styleMap(cssStyle({
    marginRight: 8,
    width: 45,
    height: 24,
    fontSize: 16
  }))}>${"5"}</span>`}${html`<span>${"Annotation dans un carr\xE9 : seule hypoth\xE8se possible dans une ligne, colonne ou bloc"}</span>`}</div>`}${html`<div style=${styleMap(cssStyle({
    marginTop: 12,
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'left'
  }))}>${" Double-click sur une annotation signal\xE9e pour appliquer le chiffre dans la case. "}</div>`}</div>`}</div>`}</div>`;
}
export function ImportModal({
  handleAbortImportSudoku,
  handleImportSudoku,
  importText,
  setImportText,
  currentGrid
}) {
  const [copied, setCopied] = uiState('importCopied', false);

  // Convertir la grille actuelle en format texte
  const gridText = currentGrid ? currentGrid.map(row => row.join('')).join('\n') : '';
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(gridText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Réinitialiser après 2 secondes
  };
  return html`<div class="sudoku-import" style=${styleMap(cssStyle({
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001
  }))}>${html`<div style=${styleMap(cssStyle({
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    position: 'relative' // Pour positionner la croix de fermeture
  }))}>${html`<button @click=${handleAbortImportSudoku} style=${styleMap(cssStyle({
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#666',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'background-color 0.2s'
  }))} @mouseover=${e => e.currentTarget.style.backgroundColor = '#f5f5f5'} @mouseout=${e => e.currentTarget.style.backgroundColor = 'transparent'}>${" \xD7 "}</button>`}${html`<h2 style=${styleMap(cssStyle({
    marginTop: 0,
    marginBottom: '12px',
    fontSize: '18px',
    fontWeight: 'bold'
  }))}>${" Importer un Sudoku "}</h2>`}${html`<p style=${styleMap(cssStyle({
    marginBottom: '16px',
    color: '#666',
    fontSize: '14px',
    lineHeight: '1.4'
  }))}>${" Collez ici votre grille de Sudoku sous forme de 9 lignes de 9 chiffres chacune. Utilisez 0 pour les cases vides. "}</p>`}${html`<textarea .value=${importText} @input=${e => setImportText(e.target.value)} placeholder=${"530070000 600195000 098000060 800060003 400803001 700020006 060000280 000419005 000080079"} style=${styleMap(cssStyle({
    width: '100%',
    height: '11rem',
    padding: '12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'monospace',
    resize: 'vertical',
    boxSizing: 'border-box'
  }))} class=${"custom-textarea"}></textarea>`}${html`<div style=${styleMap(cssStyle({
    display: 'flex',
    justifyContent: 'flex-end'
  }))}>${html`<button @click=${handleImportSudoku} ?disabled=${!importText.trim()} style=${styleMap(cssStyle({
    marginTop: '5px',
    padding: '8px 16px',
    backgroundColor: '#f0f0f0',
    border: `1px solid ${'#ccc'}`,
    color: '#333',
    borderRadius: '4px',
    cursor: importText.trim() ? 'pointer' : 'not-allowed',
    fontSize: '14px',
    fontWeight: '500',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  }))} @mouseover=${e => importText.trim() && (e.currentTarget.style.backgroundColor = '#e0e0e0')} @mouseout=${e => importText.trim() && (e.currentTarget.style.backgroundColor = '#f0f0f0')}>${html`<svg width=${"16"} height=${"16"} viewBox=${"0 0 24 24"} fill=${"none"} stroke=${"currentColor"} stroke-width=${"2"} stroke-linecap=${"round"} stroke-linejoin=${"round"}>${svg`<path d=${"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}></path>`}${svg`<polyline points=${"7 10 12 15 17 10"}></polyline>`}${svg`<line x1=${"12"} y1=${"15"} x2=${"12"} y2=${"3"}></line>`}</svg>`}${" Importer la grille "}</button>`}</div>`}${html`<div style=${styleMap(cssStyle({
    marginTop: '24px',
    marginBottom: '5px',
    borderTop: '1px solid #eee',
    paddingTop: '16px'
  }))}>${html`<h2 style=${styleMap(cssStyle({
    marginTop: 0,
    marginBottom: '12px',
    fontSize: '18px',
    fontWeight: 'bold'
  }))}>${" Exporter la grille actuelle "}</h2>`}${html`<p style=${styleMap(cssStyle({
    marginBottom: '12px',
    color: '#666',
    fontSize: '14px',
    lineHeight: '1.4'
  }))}>${" Copiez cette grille pour la r\xE9utiliser plus tard : "}</p>`}${html`<textarea .value=${gridText} ?readonly=${true} style=${styleMap(cssStyle({
    width: '100%',
    height: '11rem',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'monospace',
    backgroundColor: '#f9f9f9',
    resize: 'none',
    boxSizing: 'border-box'
  }))} @click=${e => e.target.select()}></textarea>`}${html`<button @click=${handleCopyToClipboard} ?disabled=${copied} style=${styleMap(cssStyle({
    marginTop: '5px',
    padding: '8px 16px',
    backgroundColor: copied ? '#e8f5e9' : '#f0f0f0',
    border: `1px solid ${copied ? '#4caf50' : '#ccc'}`,
    borderRadius: '4px',
    color: copied ? '#2e7d32' : '#333',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  }))} @mouseover=${e => !copied && (e.currentTarget.style.backgroundColor = '#e0e0e0')} @mouseout=${e => !copied && (e.currentTarget.style.backgroundColor = '#f0f0f0')}>${copied ? [html`<svg width=${"16"} height=${"16"} viewBox=${"0 0 24 24"} fill=${"none"} stroke=${"currentColor"} stroke-width=${"2"} stroke-linecap=${"round"} stroke-linejoin=${"round"}>${svg`<path d=${"M20 6L9 17l-5-5"}></path>`}</svg>`, " Copi\xE9 ! "] : [html`<svg width=${"16"} height=${"16"} viewBox=${"0 0 24 24"} fill=${"none"} stroke=${"currentColor"} stroke-width=${"2"} stroke-linecap=${"round"} stroke-linejoin=${"round"}>${svg`<rect x=${"9"} y=${"9"} width=${"13"} height=${"13"} rx=${"2"} ry=${"2"}></rect>`}${svg`<path d=${"M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"}></path>`}</svg>`, " Copier dans le presse-papier "]}</button>`}</div>`}</div>`}</div>`;
}
