/**
 * @fileoverview Générateur et parseur de grilles Sudoku — sudoku-generator.js
 *
 * Ce module fournit les fonctions permettant de créer, valider, résoudre et
 * comparer des grilles Sudoku. Il est consommé par resolve.js, sudoku-app.js,
 * grid-controls.js, et build-grids.js.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TYPES FONDAMENTAUX
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Puzzle : number[9][9]
 *   Grille brute de 81 entiers 0–9. 0 = case vide.
 *   S'il ne contient aucun 0, c'est une solution complète.
 *
 * Cell : { i, j, given, found, annots }
 *   Représentation riche d'une case utilisée par le moteur resolve.js.
 *     i      : numéro de ligne (0–8)
 *     j      : numéro de colonne (0–8)
 *     given  : true si la valeur fait partie de l'énoncé (non modifiable en jeu)
 *     found  : chiffre placé (0 = vide)
 *     annots : Set<number> — annotations calculées par fillAnnotations (resolve.js)
 *                n  ∈ [1,9]   → annotation positive : n est un candidat possible
 *               -n  ∈ [-9,-1] → annotation négative : n est éliminé
 *
 * Grid : Cell[9][9]
 *   La grille jouable, consommée par l'interface et par resolve.js.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CACHE DES SOLUTIONS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * GRIDS (importé depuis grids.js) est une Map<puzzleKey, { name, sol, win }>
 * contenant les solutions pré-calculées. Quand gridAndSolutionFromText est
 * appelée avec une clé présente dans GRIDS, la solution est retournée
 * directement sans recalcul par backtracking.
 * Ce cache est maintenu par le script build-grids.js.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MIGRATION CommonJS → ES Module
 * ─────────────────────────────────────────────────────────────────────────────
 *  - `const { GRIDS } = require('./grids.js')` → `import { GRIDS } from './grids.js'`
 *  - `module.exports = { ... }` → `export { ... }` en fin de fichier
 *  - Les fonctions internes `_isValid`, `countSolutions` et `gridFromPuzzle`
 *    (déclarées après module.exports dans l'original CommonJS, ce qui fonctionnait
 *    grâce au hoisting des déclarations de fonctions) sont remontées avant les
 *    fonctions qui les appellent — comportement strictement identique.
 *
 * @module sudoku-generator
 */

import { GRIDS } from './grids.js'

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — FONCTIONS INTERNES DE BAS NIVEAU
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie si le chiffre `num` peut être légalement placé en (row, col)
 * dans le puzzle, en respectant les trois contraintes du Sudoku :
 *   - unicité sur la ligne `row`
 *   - unicité sur la colonne `col`
 *   - unicité dans le bloc 3×3 contenant (row, col)
 *
 * Suppose que board[row][col] vaut 0 avant l'appel (la case est vide).
 * Utilisé par generateSolution, makePuzzle et countSolutions.
 *
 * @param {number[][]} board - Puzzle 9×9
 * @param {number}     row   - Ligne (0–8)
 * @param {number}     col   - Colonne (0–8)
 * @param {number}     num   - Chiffre à tester (1–9)
 * @returns {boolean} true si le placement est légal
 */
function _isValid(board, row, col, num) {
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num || board[x][col] === num) return false
  }
  const startRow = row - row % 3
  const startCol = col - col % 3
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      if (board[i + startRow][j + startCol] === num) return false
  return true
}

/**
 * Convertit une chaîne de 81 chiffres en Puzzle (number[9][9]).
 * Aucune validation — à appeler uniquement après nettoyage du texte.
 *
 * @param {string} cleanText - Chaîne de exactement 81 chiffres
 * @returns {number[][]}
 */
const l_puzzleFromText = (cleanText) => {
  const puzzle = []
  for (let i = 0; i < 9; i++) {
    const row = []
    for (let j = 0; j < 9; j++) {
      row.push(parseInt(cleanText[i * 9 + j], 10))
    }
    puzzle.push(row)
  }
  return puzzle
}

/**
 * Crée une Grid (Cell[9][9]) depuis un Puzzle (number[9][9]).
 *
 * Chaque case reçoit :
 *   - given  = true si val !== 0 (chiffre de l'énoncé, non modifiable en jeu)
 *   - found  = val (0 pour les cases vides)
 *   - annots = Set vide (sera rempli plus tard par fillAnnotations dans resolve.js)
 *
 * @param {number[][]} puzzle
 * @returns {Cell[][]}
 */
function gridFromPuzzle(puzzle) {
  return puzzle.map((row, i) =>
    row.map((val, j) => ({
      i,
      j,
      given:  val !== 0,
      found:  val,
      annots: new Set(),
    }))
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — COMPTAGE DES SOLUTIONS (backtracking)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compte le nombre de solutions d'un puzzle par backtracking récursif et
 * retourne la solution si elle est unique.
 *
 * L'algorithme s'arrête dès que `count` dépasse 1 pour éviter d'explorer
 * inutilement toutes les solutions d'un puzzle mal formé.
 *
 * Complexité : exponentielle dans le pire cas, mais très rapide en pratique
 * car les puzzles bien formés ont très peu de branches à explorer.
 *
 * @param {number[][]} puzzle - Puzzle 9×9 (copié en interne, non modifié)
 * @returns {{ count: number, solution: number[][]|null }}
 *   count    : 0 (aucune solution), 1 (unique), 2 (plusieurs solutions)
 *   solution : grille complète si count === 1, null sinon
 */
function countSolutions(puzzle) {
  let count    = 0
  let solution = null

  function solve(g) {
    if (count > 1) return
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (g[i][j] === 0) {
          for (let n = 1; n <= 9; n++) {
            if (_isValid(g, i, j, n)) {
              g[i][j] = n
              solve(g)
              g[i][j] = 0
              if (count > 1) return
            }
          }
          return  // aucun chiffre légal → backtrack
        }
      }
    }
    count++
    if (count === 1) solution = g.map(row => row.slice())
  }

  const p = puzzle.map(row => row.slice())  // copie défensive
  solve(p)
  return { count, solution }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — GÉNÉRATION ALÉATOIRE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Génère une grille Sudoku jouable avec sa solution, pour une difficulté donnée.
 *
 * Le paramètre `difficulty` indique le nombre de cases à vider dans la solution.
 * Plus ce nombre est élevé, moins de chiffres sont donnés, plus la grille est difficile.
 * Valeurs typiques : 40 (facile), 50 (moyen), 55+ (difficile).
 *
 * Algorithme en deux temps :
 *   1. generateSolution() remplit aléatoirement une grille vide par backtracking,
 *      en mélangeant les chiffres à chaque case pour produire des grilles variées.
 *   2. makePuzzle() retire itérativement des cases au hasard en vérifiant à chaque
 *      retrait que la solution reste unique. Si le retrait brise l'unicité, la case
 *      est remise. Limite à 81×4 tentatives pour éviter une boucle infinie dans les
 *      cas où le nombre de cases demandé est trop élevé pour ce puzzle particulier.
 *
 * @param {number} difficulty - Nombre de cases à vider (ex. 45 = moyen)
 * @returns {{ grid: Cell[][], solution: number[][] }}
 */
function gridAndSolutionWithDifficulty(difficulty) {
  /**
   * Remplit une grille vide avec une solution valide aléatoire (backtracking).
   * Les chiffres sont mélangés à chaque case pour produire des grilles variées.
   * @returns {number[][]} Grille 9×9 complète
   */
  function generateSolution() {
    const board   = Array.from({ length: 9 }, () => Array(9).fill(0))
    const shuffle = arr => arr.sort(() => Math.random() - 0.5)

    function fill(board, row = 0, col = 0) {
      if (row === 9) return true
      if (col === 9) return fill(board, row + 1, 0)
      const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
      for (const num of nums) {
        if (_isValid(board, row, col, num)) {
          board[row][col] = num
          if (fill(board, row, col + 1)) return true
          board[row][col] = 0
        }
      }
      return false
    }

    fill(board)
    return board
  }

  /**
   * Retire `emptyCount` cases d'une solution complète en préservant l'unicité.
   * Pour chaque case candidate au retrait, vérifie que le puzzle résultant a
   * toujours exactement une solution (via countSolutions). Si le retrait brise
   * l'unicité, la case est restaurée et une autre est tentée.
   *
   * @param {number[][]} solution   - Grille solution complète (copiée, non modifiée)
   * @param {number}     emptyCount - Nombre de cases à vider
   * @returns {number[][]} Puzzle avec les cases vidées
   */
  function makePuzzle(solution, emptyCount = 45) {
    const puzzle = solution.map(row => row.slice())
    let empties  = 0
    let attempts = 0
    while (empties < emptyCount && attempts < 81 * 4) {
      const i = Math.floor(Math.random() * 9)
      const j = Math.floor(Math.random() * 9)
      if (puzzle[i][j] !== 0) {
        const backup = puzzle[i][j]
        puzzle[i][j] = 0
        if (countSolutions(puzzle).count === 1) empties++
        else puzzle[i][j] = backup  // unicité brisée → on remet
        attempts++
      }
    }
    return puzzle
  }

  const solution = generateSolution()
  const puz      = makePuzzle(solution, difficulty)
  const grid     = gridFromPuzzle(puz)
  return { grid, solution }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — PARSING DEPUIS TEXTE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse, nettoie et valide un texte représentant un puzzle Sudoku, puis
 * retourne la Grid et le Puzzle correspondants.
 *
 * Format accepté : 81 caractères [0-9.] avec espaces et retours à la ligne
 * ignorés. Les points '.' sont traités comme des 0 (case vide).
 *
 * Validation en deux passes :
 *   1. Syntaxique (parsePuzzle) :
 *      - Exactement 81 chiffres après suppression des espaces
 *      - Uniquement les caractères 0–9 (après remplacement des '.')
 *   2. Sémantique (puzzleIsValid) :
 *      - Aucun des chiffres déjà placés ne crée de conflit dans sa ligne,
 *        sa colonne ou son bloc (détection des énoncés contradictoires)
 *
 * @param {string}  text          - Texte à parser
 * @param {boolean} [unique=true] - Réservé (non utilisé ici, voir gridAndSolutionFromText)
 * @returns {{ grid: Cell[][]|null, puzzle: number[][]|null, error: string|null }}
 *   En cas d'erreur, grid et puzzle sont null et error contient le message.
 */
function gridFromText(text, unique = true) {
  /**
   * Nettoie le texte et le convertit en Puzzle, ou retourne une erreur.
   * @param {string} text
   * @returns {{ puzzle: number[][]|null, error: string|null }}
   */
  function parsePuzzle(text) {
    try {
      let cleanText = text.replace(/\s/g, '')
      if (cleanText.length !== 81) {
        throw new Error(`Le texte doit contenir exactement 81 chiffres (trouvé: ${cleanText.length})`)
      }
      cleanText = cleanText.replace(/\./g, '0')
      if (!/^[0-9]{81}$/.test(cleanText)) {
        throw new Error('Le texte doit contenir uniquement des chiffres de 0 à 9')
      }
      return { puzzle: l_puzzleFromText(cleanText), error: null }
    } catch (error) {
      return { puzzle: null, error: error.message }
    }
  }

  /**
   * Vérifie qu'aucune case déjà remplie du puzzle n'est en conflit avec ses
   * voisines. Retire temporairement chaque valeur pour tester son placement
   * via _isValid, puis la remet.
   * @param {number[][]} puzzle - Modifié temporairement (restauré à l'identique)
   * @returns {boolean}
   */
  function puzzleIsValid(puzzle) {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const v = puzzle[i][j]
        if (v !== 0) {
          puzzle[i][j] = 0
          if (!_isValid(puzzle, i, j, v)) return false
          puzzle[i][j] = v
        }
      }
    }
    return true
  }

  const { puzzle, error } = parsePuzzle(text)
  if (error) return { grid: null, puzzle: null, error }
  if (!puzzleIsValid(puzzle)) return { grid: null, puzzle: null, error: "Le puzzle n'est pas valide" }
  return { grid: gridFromPuzzle(puzzle), puzzle, error: null }
}

/**
 * Parse un texte Sudoku et retourne la Grid avec sa solution.
 *
 * Stratégie (ordre de priorité) :
 *   1. Parse et valide le texte via gridFromText.
 *   2. Si la clé puzzle est présente dans GRIDS (cache) et a une solution
 *      pré-calculée (sol non vide), la retourne directement sans backtracking.
 *   3. Sinon, calcule la solution par countSolutions (backtracking).
 *   4. Si `unique` est true (défaut) et que la solution n'est pas unique,
 *      retourne une erreur avec solution: null.
 *
 * Le cache GRIDS accélère considérablement les chargements en production.
 * Il est maintenu par le script build-grids.js.
 *
 * @param {string}  text          - Texte du puzzle (81 chiffres)
 * @param {boolean} [unique=true] - Si true, exige l'unicité de la solution
 * @returns {{ grid: Cell[][]|null, solution: number[][]|null, error: string|null }}
 */
function gridAndSolutionFromText(text, unique = true) {
  const { grid, puzzle, error } = gridFromText(text)
  if (error) return { grid: null, solution: null, error }

  // Accélération : solution pré-calculée dans le cache GRIDS
  if (GRIDS.has(text) && GRIDS.get(text).sol.length > 0) {
    return { grid, solution: l_puzzleFromText(GRIDS.get(text).sol), error: null }
  }

  const { count, solution } = countSolutions(puzzle)
  if (unique && count !== 1) {
    return { grid: null, solution: null, error: "Le puzzle n'a pas une solution unique" }
  }
  return { grid, solution }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — COMPARAISON
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compare deux grilles case par case.
 *
 * Deux cases sont considérées égales si :
 *   - Elles ont le même `found`, ET
 *   - Leurs `annots` (Set) sont identiques en taille et en contenu.
 *
 * Gère les deux formes : Cell[][] (objet riche) et number[][] (comparaison directe).
 *
 * TODO : revoir pour inclure l'égalité de `given` dans la comparaison stricte.
 *
 * @param {Cell[][]|number[][]} a
 * @param {Cell[][]|number[][]} b
 * @returns {boolean} true si les deux grilles sont identiques
 */
function areGridsEqual(a, b) {
  function areSetsEqual(a, b) {
    if (a.size !== b.size) return false
    for (const v of a) { if (!b.has(v)) return false }
    return true
  }
  function areCasesEqual(a, b) {
    if (typeof a === 'number' && typeof b === 'number') return a === b
    return a.found === b.found && areSetsEqual(a.annots, b.annots)
  }
  for (let i = 0; i < 9; i++)
    for (let j = 0; j < 9; j++)
      if (!areCasesEqual(a[i][j], b[i][j])) return false
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS (ES Module — remplace module.exports = { ... })
// ─────────────────────────────────────────────────────────────────────────────
export {
  areGridsEqual,
  gridAndSolutionWithDifficulty,
  gridFromText,
  gridAndSolutionFromText,
  gridFromPuzzle,
}
