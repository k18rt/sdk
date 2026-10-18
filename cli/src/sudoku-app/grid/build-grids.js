/**
 * @fileoverview Script de maintenance des grilles — build-grids.js
 *
 * Ce script Node.js s'exécute hors navigateur (côté build/maintenance uniquement).
 * Il ne fait partie ni du bundle Vite ni de l'application Lit.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RÔLE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. Compléter les solutions manquantes dans grids.js.
 *    Pour chaque grille dont le champ `sol` est vide, calcule la solution
 *    unique par backtracking (gridAndSolutionFromText) et affiche dans la
 *    console la ligne complète à copier-coller dans grids.js.
 *
 * 2. Découvrir de nouvelles combinaisons d'heuristiques gagnantes.
 *    Pour chaque grille, teste toutes les combinaisons possibles parmi les
 *    7 heuristiques (2^7 − 1 = 127 combinaisons, triées par taille croissante)
 *    et identifie celles qui résolvent complètement la grille mais ne sont pas
 *    encore répertoriées dans le champ `win`.
 *    Les combinaisons déjà connues (et leurs supersets / subsets) sont skippées
 *    pour éviter les tests redondants.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SYMBOLES D'HEURISTIQUES (champ `win` dans grids.js)
 * ─────────────────────────────────────────────────────────────────────────────
 *   ○  selfSufficientSingle        candidat unique (naked single)
 *   □  exclusiveSingle             singleton caché (hidden single)
 *   ∞  selfSufficientSubset        naked subset (paire/triple nu)
 *   ✕  exclusiveIntersection       pointing pair / box-line reduction
 *   ↺  falsifiedBySingleDigitChain  Nishio / chaîne mono-chiffre
 *   ⊗  falsifiedByChain            chaîne de contradiction générale
 *   ⇄  consensusElimination        élimination par consensus
 *
 * Le champ `win` est une chaîne de combinaisons séparées par " | ".
 * Chaque combinaison liste les symboles des heuristiques activées.
 * Exemples : "⊗" (chaîne seule suffit), "○ ∞ | □ ∞" (deux alternatives).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MIGRATION CommonJS → ES Module
 * ─────────────────────────────────────────────────────────────────────────────
 *  - `require(...)` remplacé par `import ... from '...'`
 *  - `.cjs` renommé `.js`
 *  - Pour l'exécuter : `node src/sudoku/build-grids.js`
 *    (nécessite `"type": "module"` dans package.json ou Node ≥ 18 avec flag ESM)
 *  - Sinon strictement identique à l'original build-grids.cjs
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UTILISATION
 * ─────────────────────────────────────────────────────────────────────────────
 *   node src/sudoku/build-grids.js
 *
 * Sortie console : lignes à copier dans grids.js + rapport des nouvelles
 * combinaisons découvertes par grille.
 *
 * @module build-grids
 */

import { GRIDS }                                from './grids.js'
import { gridFromText, gridAndSolutionFromText } from './sudoku-generator.js'
import { gridIsComplete, simpleFill }            from './resolve.js'

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — CALCUL DES SOLUTIONS MANQUANTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map de travail : toutes les grilles avec leur solution garantie.
 *
 * Construction :
 *   - Les grilles dont `sol` est déjà renseigné sont copiées telles quelles.
 *   - Les grilles avec `sol` vide sont résolues par gridAndSolutionFromText
 *     (backtracking). La ligne complète est affichée dans la console pour
 *     mise à jour manuelle de grids.js.
 *
 * @type {Map<string, { name: string, sol: string, win: string }>}
 */
const gs = new Map()

GRIDS.forEach(({ name, sol, win }, gridKey) => {
  if (sol.length) {
    // Solution déjà connue → on la conserve directement
    gs.set(gridKey, { name, sol, win })
  } else {
    // Solution manquante → on la calcule et on affiche la ligne à copier
    const { solution, error } = gridAndSolutionFromText(gridKey)
    if (error) {
      console.error(`Grid ${name} is invalid:`, error)
    } else {
      const sol = solution.flat().join('')
      console.log(`  ["${gridKey}", {name:"${name}", sol:"${sol}", win:"${win}"}],`)
      gs.set(gridKey, { name, sol, win })
    }
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — CONFIGURATION DES HEURISTIQUES ET SYMBOLES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Correspondance heuristique (nom technique) → symbole affiché dans `win`.
 * Utilisée pour générer les noms lisibles des combinaisons dans les rapports.
 * @type {Object.<string, string>}
 */
const heuristicNames = {
  selfSufficientSingle:        '○',
  exclusiveSingle:             '□',
  selfSufficientSubset:        '∞',
  exclusiveIntersection:       '✕',
  falsifiedBySingleDigitChain: '↺',
  falsifiedByChain:            '⊗',
  consensusElimination:        '⇄',
}

/**
 * Correspondance symbole → position de bit dans le masque entier de combinaison.
 *
 * Chaque heuristique occupe un bit (0–5) dans un entier de 7 bits max.
 * Représente toute combinaison comme un entier : ex. ○□ = 0b000011 = 3.
 * Utilisée pour calculer les masques des combinaisons connues (champ `win`)
 * et pour le filtrage superset/subset dans isRelatedToSuccess.
 *
 * Note : ⇄ (consensusElimination) n'a pas de bit propre dans symbolToBit car
 * il est géré séparément dans allHeuristics et n'est pas utilisé dans les
 * comparaisons de masques de win.
 *
 * @type {Object.<string, number>}
 */
const symbolToBit = {
  '○': 0,  // selfSufficientSingle
  '□': 1,  // exclusiveSingle
  '∞': 2,  // selfSufficientSubset
  '✕': 3,  // exclusiveIntersection
  '↺': 4,  // falsifiedBySingleDigitChain
  '⊗': 5,  // falsifiedByChain
}

/**
 * Liste des heuristiques à tester dans generateCombinations.
 * L'ordre définit la position des bits dans les masques (bit j = heuristics[j]).
 * @type {string[]}
 */
const allHeuristics = [
  'selfSufficientSingle',
  'exclusiveSingle',
  'selfSufficientSubset',
  'exclusiveIntersection',
  'falsifiedBySingleDigitChain',
  'falsifiedByChain',
  'consensusElimination',
]

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — GÉNÉRATION ET TRI DES COMBINAISONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Génère toutes les combinaisons non vides d'heuristiques (2^n − 1),
 * triées par nombre d'heuristiques croissant (les plus simples d'abord).
 *
 * Le tri garantit que les combinaisons minimales sont découvertes avant leurs
 * supersets, ce qui permet d'éliminer les tests redondants via isRelatedToSuccess.
 *
 * Chaque combinaison retournée est un objet :
 *   name         : symboles séparés par espace         ex. "○ ∞"
 *   originalName : noms techniques séparés par '+'     ex. "selfSufficientSingle+selfSufficientSubset"
 *   value        : objet { heuristique: true, ... }    passable directement à simpleFill
 *   mask         : entier représentant la combinaison  ex. 0b000101 = 5
 *   size         : nombre d'heuristiques actives
 *
 * @param {string[]} heuristics - Liste des noms d'heuristiques
 * @returns {Array<{ name: string, originalName: string, value: object, mask: number, size: number }>}
 */
function generateCombinations(heuristics) {
  const total        = Math.pow(2, heuristics.length)  // 2^n combinaisons dont la vide
  const combinations = []

  // Première passe : construction de toutes les combinaisons non vides
  for (let i = 1; i < total; i++) {
    const activeHeuristics = []
    for (let j = 0; j < heuristics.length; j++) {
      if (i & (1 << j)) activeHeuristics.push(heuristics[j])
    }
    combinations.push({
      mask:       i,
      size:       activeHeuristics.length,
      heuristics: activeHeuristics,
    })
  }

  // Tri par taille croissante : minimales d'abord
  combinations.sort((a, b) => a.size - b.size)

  // Deuxième passe : construction des objets finaux
  return combinations.map(({ mask, heuristics }) => {
    const combo = {}
    heuristics.forEach(h => { combo[h] = true })
    return {
      name:         heuristics.map(h => heuristicNames[h] || h).join(' '),
      originalName: heuristics.join('+'),
      value:        combo,
      mask,
      size:         heuristics.length,
    }
  })
}

/** Toutes les combinaisons possibles triées par taille croissante */
const allCombinations = generateCombinations(allHeuristics)

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — FILTRAGE PAR RELATION DE SUCCÈS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Détermine si une combinaison (masque) peut être skippée car elle est déjà
 * en relation avec au moins une combinaison connue comme suffisante.
 *
 * Une relation existe dans deux cas :
 *   - mask est un superset d'un successMask :
 *     La combinaison contient toutes les heuristiques d'un combo déjà suffisant
 *     plus d'autres → inutile de tester, elle résout forcément aussi la grille.
 *   - mask est un subset d'un successMask :
 *     La combinaison est moins puissante qu'un combo connu. Les combos
 *     intermédiaires ont déjà été explorés dans l'ordre croissant.
 *
 * Ce filtrage réduit drastiquement (~95%) le nombre de tests effectifs.
 *
 * @param {number}   mask            - Masque de la combinaison candidate
 * @param {number[]} successfulMasks - Masques des combinaisons déjà suffisantes
 * @returns {boolean} true si la combinaison peut être ignorée
 */
function isRelatedToSuccess(mask, successfulMasks) {
  return successfulMasks.some(successMask =>
    (mask & successMask) === successMask ||  // mask est un superset de successMask
    (successMask & mask) === mask            // mask est un subset de successMask
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — BOUCLE PRINCIPALE : DÉCOUVERTE DE NOUVELLES COMBINAISONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pour chaque grille de `gs`, teste toutes les combinaisons non encore liées
 * à un succès connu. Si simpleFill résout complètement la grille avec cette
 * combinaison (gridIsComplete), elle est ajoutée aux résultats et aux masques
 * de succès pour éviter de tester ses supersets.
 *
 * Affichage console (une ligne par grille) :
 *   "01 400000805...: known: ⊗ | ○ ∞ | □ ∞ | ○ □ ✕ | □ ✕ ↺ | □ ✕ ⇄"
 *   "12 060501090...: known: ⊗ | ○ ∞ ⇄ | □ ∞ ⇄     NEW: ○ ∞ ✕ ⇄"
 */
gs.forEach(({ name, sol, win }, gridKey) => {
  const knownWins = win

  // Convertit la chaîne "win" en tableau de masques de bits
  const winCombinations  = knownWins.split('|').map(s => s.trim()).filter(Boolean)
  const successfulMasks  = winCombinations.map(combo => {
    const symbols = combo.trim().split(/\s+/)
    return symbols.reduce((mask, symbol) => mask | (1 << symbolToBit[symbol]), 0)
  })

  const { grid } = gridFromText(gridKey)
  const newCombos = []

  // Test de toutes les combinaisons dans l'ordre croissant de taille
  for (const combo of allCombinations) {
    // Skip si déjà liée à un succès connu (superset ou subset)
    if (isRelatedToSuccess(combo.mask, successfulMasks)) continue

    const { isValid, flow, cases } = simpleFill(grid, combo.value)
    const ok = gridIsComplete(cases)

    if (ok) {
      newCombos.push(combo.name)
      successfulMasks.push(combo.mask)  // empêche les supersets d'être testés
    }
  }

  // Rapport par grille
  const newStr = newCombos.length ? `     NEW: ${newCombos.join(' | ')}` : ''
  console.log(`${name} ${gridKey}: known: ${knownWins}${newStr}`)
})
