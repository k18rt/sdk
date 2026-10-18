/**
 * @fileoverview Moteur de résolution de Sudoku — resolve.js
 *
 * Ce module contient l'ensemble de la logique de résolution du Sudoku,
 * indépendante de toute couche d'interface (React ou Lit).
 * Il est consommé directement par sudoku-app.js (le composant Lit principal).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ARCHITECTURE GÉNÉRALE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Une grille est un tableau 9×9 de Cases.
 * Une Case (cell) est un objet  { i, j, given, found, annots }
 *   i, j    : coordonnées (0–8)
 *   given   : true si le chiffre fait partie de l'énoncé (non modifiable)
 *   found   : chiffre placé (0 = vide)
 *   annots  : Set<number> d'entiers
 *     n  ∈ [1,9]    → le chiffre n est explicitement marqué « possible » par l'utilisateur
 *    -n  ∈ [-9,-1]  → le chiffre n est marqué « impossible » (éliminé)
 *   10+n             → annotation positive posée manuellement (override)
 *  -10-n             → annotation négative posée manuellement (override)
 *
 * Un Move est une chaîne de 4 caractères : [+-?][i][j][n]
 *   '+'  → placer le chiffre n en (i,j)
 *   '-'  → annoter n comme impossible en (i,j)
 *   '?'  → toggle annotation positive (mode utilisateur)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HEURISTIQUES (techniques de résolution)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  selfSufficientSingle       (naked single / candidat unique)
 *    Une case n'a plus qu'un seul candidat possible → on le place.
 *
 *  exclusiveSingle            (hidden single / singleton caché)
 *    Dans une unité (ligne/colonne/bloc), un chiffre n'a qu'une seule
 *    case possible → on le place.
 *
 *  selfSufficientSubset       (naked subset / paire nue, triple nu…)
 *    N cases dans une unité ne contiennent que N candidats → ces candidats
 *    sont éliminés des autres cases de l'unité.
 *
 *  exclusiveIntersection      (pointing pair/triple, box-line reduction)
 *    Dans un bloc, si un candidat n'apparaît que dans une seule ligne (ou
 *    colonne), il peut être éliminé du reste de cette ligne (ou colonne).
 *
 *  falsifiedBySingleDigitChain (Digit Forcing Chain / Nishio)
 *    Si poser le chiffre n en (i,j) mène à une contradiction en ne
 *    propageant que les déductions sur ce même chiffre, alors -n est vrai.
 *
 *  consensusElimination       (consensus / intersection des hypothèses)
 *    Pour chaque case, on teste toutes les hypothèses possibles.
 *    Si un chiffre n'est jamais présent quelle que soit l'hypothèse retenue,
 *    il peut être éliminé.
 *
 *  falsifiedByChain           (chaîne de contradiction générale)
 *    Si placer (ou éliminer) un candidat mène à une contradiction via
 *    n'importe quelle combinaison des autres heuristiques, c'est faux.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EXPORTS
 * ─────────────────────────────────────────────────────────────────────────────
 *  deepCopyCases, generateGridKey, GridStateCache
 *  gridIsValid, gridIsComplete, candidateIsValid, caseIsValid
 *  selfSufficientSubsets, isFalsifiedBySingleDigitChain
 *  falsifiedsBySingleDigitChain
 *  findShortestContradictionChainForMove, findShortestContradictionChainForSteps
 *  deductions, deductionMovesFromMap, deductionMoves
 *  fillCase, fillAnnotations, simpleFill
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MIGRATION CommonJS → ES Module (changements par rapport à l'original)
 * ─────────────────────────────────────────────────────────────────────────────
 *  - `module.exports = { ... }`  remplacé par `export { ... }` en fin de fichier
 *  - `simpleFill` retourne désormais aussi `moves` (= steps.flat()) en plus de
 *    `steps` pour la compatibilité avec les tests et les consommateurs existants
 *  - Les prototypes Object/Array sont étendus en tête de fichier (avant utilisation)
 *
 * @module resolve
 */

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 0 — EXTENSIONS DE PROTOTYPE (doivent être au-dessus de toute utilisation)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * caseUnitsMap — parcourt les trois unités (bloc, ligne, colonne) de la case.
 *
 * Ajoutée comme méthode NON-ÉNUMÉRABLE sur Object.prototype pour pouvoir
 * écrire `cell.caseUnitsMap(cases, callback)` depuis n'importe quelle case.
 *
 * Le callback reçoit (unit, type, index) :
 *   unit  : tableau de 9 cases de la grille
 *   type  : "block" | "row" | "col"
 *   index : numéro de l'unité (0–8)
 *
 * Retourne un tableau plat de toutes les valeurs non vides retournées par callback.
 */
if (!Object.prototype.hasOwnProperty.call(Object.prototype, 'caseUnitsMap')) {
  Object.defineProperty(Object.prototype, 'caseUnitsMap', {
    value: function (cases, callback) {
      return _caseUnitsMap(cases, this.i, this.j, callback)
    },
    writable: true,
    configurable: true,
    enumerable: false,
  })
}

/**
 * gridUnitsMap — parcourt toutes les unités (blocs, lignes, colonnes) de la grille.
 *
 * Ajoutée comme méthode NON-ÉNUMÉRABLE sur Array.prototype pour pouvoir
 * écrire `cases.gridUnitsMap(callback)` directement sur la grille 9×9.
 *
 * Le callback reçoit (unit, { type, index }) :
 *   unit  : tableau de 9 cases
 *   type  : "row" | "col" | "block"
 *   index : numéro de l'unité (0–8)
 *
 * Retourne un tableau plat de toutes les valeurs non vides retournées par callback.
 */
if (!Array.prototype.gridUnitsMap) {
  Object.defineProperty(Array.prototype, 'gridUnitsMap', {
    value: function (callback) {
      return _gridUnitsMap(this, callback)
    },
    writable: true,
    configurable: true,
    enumerable: false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — UTILITAIRES INTERNES
// ─────────────────────────────────────────────────────────────────────────────

/** Chiffres 1–9 (constante partagée pour éviter la création répétée de tableaux) */
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

/**
 * Accumule les résultats non vides dans un tableau cible.
 * @param {Array}         results - Tableau cible (modifié en place)
 * @param {*}             r       - Valeur à ajouter (tableau, scalaire ou falsy)
 */
function addResult(results, r) {
  if (Array.isArray(r)) { if (r.length) results.push(...r) }
  else if (r) results.push(r)
}

/**
 * Parcourt les trois unités (bloc, ligne, colonne) de la case (i, j)
 * et applique le callback sur chacune.
 * Implémentation réelle de caseUnitsMap.
 * @param {Array<Array>} cases
 * @param {number}       i
 * @param {number}       j
 * @param {function}     callback
 * @returns {Array}
 */
function _caseUnitsMap(cases, i, j, callback) {
  const results = []
  const bi = Math.floor(i / 3), bj = Math.floor(j / 3)
  const block = []
  for (let di = 0; di < 3; ++di)
    for (let dj = 0; dj < 3; ++dj)
      block.push(cases[bi * 3 + di][bj * 3 + dj])
  addResult(results, callback(block, 'block', bi * 3 + bj))
  addResult(results, callback(cases[i], 'row', i))
  const col = Array.from({ length: 9 }, (_, ii) => cases[ii][j])
  addResult(results, callback(col, 'col', j))
  return results
}

/**
 * Parcourt toutes les unités (blocs, lignes, colonnes) de la grille entière.
 * Implémentation réelle de gridUnitsMap.
 * @param {Array<Array>} cases
 * @param {function}     callback
 * @returns {Array}
 */
function _gridUnitsMap(cases, callback) {
  const results = []
  for (let bi = 0; bi < 3; ++bi)
    for (let bj = 0; bj < 3; ++bj) {
      const block = []
      for (let di = 0; di < 3; ++di)
        for (let dj = 0; dj < 3; ++dj)
          block.push(cases[bi * 3 + di][bj * 3 + dj])
      addResult(results, callback(block, { type: 'block', index: bi * 3 + bj }))
    }
  for (let i = 0; i < 9; ++i)
    addResult(results, callback(cases[i], { type: 'row', index: i }))
  for (let j = 0; j < 9; ++j) {
    const col = Array.from({ length: 9 }, (_, ii) => cases[ii][j])
    addResult(results, callback(col, { type: 'col', index: j }))
  }
  return results
}

/**
 * Ajoute un objet dans une Map<key, Array<obj>>, en créant le tableau si besoin.
 * @param {Map}    map - Map cible
 * @param {string} move - Clé Move (ex. '+034') ; on utilise move.slice(1) comme clé
 * @param {*}      obj  - Objet à pousser dans le tableau
 */
function addToMap(map, move, obj) {
  const k = move.slice(1)
  if (map.has(k)) map.get(k).push(obj)
  else map.set(k, [obj])
}

/**
 * Inverse le signe d'un Move : '+' ↔ '-'.
 * '+034' → '-034', '-034' → '+034'
 * @param {string} move
 * @returns {string}
 */
function moveInverted(move) {
  return (move[0] === '+' ? '-' : '+') + move.slice(1)
}

/**
 * Génère toutes les combinaisons de taille k parmi les éléments de arr.
 * Algorithme récursif par inclusion/exclusion du premier élément.
 * @param {Array}  arr
 * @param {number} k
 * @returns {Array<Array>}
 */
function combinations(arr, k) {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [first, ...rest] = arr
  const withFirst = combinations(rest, k - 1).map(comb => [first, ...comb])
  const withoutFirst = combinations(rest, k)
  return withFirst.concat(withoutFirst)
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — COPIE PROFONDE & CLÉ D'ÉTAT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Effectue une copie profonde d'une grille de cases.
 * Chaque case est un nouvel objet ; les Set<annots> sont recréés.
 * Indispensable pour tester des hypothèses sans modifier la grille d'origine.
 * @param {Array<Array>} cases - Grille 9×9 source
 * @returns {Array<Array>}     - Nouvelle grille indépendante
 */
function deepCopyCases(cases) {
  return cases.map(row =>
    row.map(cell => ({
      i:      cell.i,
      j:      cell.j,
      given:  cell.given,
      found:  cell.found,
      annots: new Set(cell.annots),
    }))
  )
}

/**
 * Génère une clé unique décrivant l'état courant d'une grille pour un jeu
 * d'heuristiques donné. Utilisée par GridStateCache pour éviter de recalculer
 * des positions déjà rencontrées.
 *
 * La clé `stateKey` encode :
 *   - les 6 heuristiques (bits 0/1) + les limitedAnnots éventuels
 *   - pour chaque case non donnée : soit found, soit les négatifs actuels
 *
 * La clé `diffKey` (calculée seulement si `targetCases` est fourni) encode
 * uniquement ce qui a changé entre `grid` et `targetCases` pour les cases
 * initialement vides et non trouvées.
 *
 * @param {Array<Array>}      grid         - Grille de départ
 * @param {object}            heuristics   - Jeu d'heuristiques activées
 * @param {Array<Array>|null} [targetCases=null] - Grille cible (pour diffKey)
 * @returns {{ foundCount: number, stateKey: string, diffKey: string }}
 */
function generateGridKey(grid, heuristics, targetCases = null) {
  let foundCount = 0
  const order = [
    'selfSufficientSingle', 'exclusiveSingle', 'selfSufficientSubset',
    'falsifiedBySingleDigitChain', 'consensusElimination', 'falsifiedByChain',
  ]
  let stateKey = order.map(h => heuristics[h] ? '1' : '0').join('')
  if (heuristics.limitedAnnots) {
    stateKey += `[${Array.from(heuristics.limitedAnnots).sort().join('')}]`
  }
  stateKey += ':'
  let diffKey = ''
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = grid[row][col]
      if (cell.given) continue
      if (cell.found) {
        foundCount++
        stateKey += cell.found
        continue
      }
      const negs = DIGITS.filter(n => cell.annots.has(-n))
      stateKey += `[${negs.join('')}]`
      if (targetCases) {
        const targetCell = targetCases[row][col]
        if (targetCell.found) {
          diffKey += targetCell.found
        } else {
          let moreNegs = ''
          for (const n of DIGITS) {
            if (targetCell.annots.has(-n) && !cell.annots.has(-n)) moreNegs += n
          }
          diffKey += moreNegs.length ? `[${moreNegs}]` : '='
        }
      }
    }
  }
  return { foundCount, stateKey, diffKey }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — CACHE D'ÉTATS (GridStateCache + CachedResult)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GridStateCache — mémoïsation des résultats de résolution pour éviter de
 * recalculer des positions déjà explorées.
 *
 * Organisation interne :
 *   cache : Map<foundCount, Map<stateKey, cacheValue>>
 *
 * cacheValue est une chaîne compacte :
 *   `${isValid?1:0}${flow}:${steps}:${diffKey}`
 *
 * L'accès est en O(1) grâce à la double clé (foundCount + stateKey).
 */
class GridStateCache {
  constructor() {
    this.cache = new Map()
    this._successCount = 0
    this._previousSuccessCount = 0
  }

  /**
   * Récupère un résultat mémoïsé depuis le cache.
   * Retourne null si aucune entrée ne correspond à (grid, heuristics).
   * Incrémente le compteur de succès à chaque hit.
   * @param {Array<Array>} grid
   * @param {object}       heuristics
   * @returns {CachedResult|null}
   */
  get(grid, heuristics) {
    const { foundCount, stateKey } = generateGridKey(grid, heuristics)
    const cached = this.cache.get(foundCount)?.get(stateKey)
    if (!cached) return null
    this._successCount++
    return new CachedResult(cached, grid)
  }

  /**
   * Retourne des statistiques sur le cache :
   *   fromLast  : hits depuis le dernier appel à success()
   *   fromBegin : hits depuis la création du cache
   *   size      : nombre total d'entrées dans le cache
   * @returns {{ fromLast: number, fromBegin: number, size: number }}
   */
  success() {
    const fromLast = this._successCount - this._previousSuccessCount
    this._previousSuccessCount = this._successCount
    const size = Array.from(this.cache.keys())
      .map(k => this.cache.get(k).size)
      .reduce((a, b) => a + b, 0)
    return { fromLast, fromBegin: this._successCount, size }
  }

  /**
   * Stocke le résultat de l'application de `heuristics` sur `grid` dans le cache.
   *
   * `result` doit contenir :
   *   { isValid, flow, steps, cases }
   *   où `steps` est un tableau de tableaux de moves ([['+034', ...], ...])
   *   et `cases` est la grille résultante.
   *
   * Si `cleanBelow` est true, toutes les entrées avec moins de cases trouvées
   * sont supprimées (libère de la mémoire après un fill).
   *
   * @param {Array<Array>} grid
   * @param {object}       heuristics
   * @param {object}       result       - { isValid, flow, steps, cases }
   * @param {boolean}      [cleanBelow=false]
   */
  set(grid, heuristics, result, cleanBelow = false) {
    const { isValid, flow, steps, moves, cases } = result
    // Compatibilité : accepte soit steps (Array<Array<Move>>) soit moves (Array<Move> plat).
    // simpleFill retourne les deux ; un appelant externe peut n'en fournir qu'un.
    const effectiveSteps = steps ?? (moves ? [moves] : [])
    const { foundCount, stateKey, diffKey } = generateGridKey(
      grid, heuristics, isValid ? cases : null
    )
    if (!this.cache.has(foundCount)) this.cache.set(foundCount, new Map())
    const cacheValue = `${isValid ? 1 : 0}${flow}:${effectiveSteps.map(s => s.join('')).join('|')}:${diffKey}`
    this.cache.get(foundCount).set(stateKey, cacheValue)
    if (cleanBelow) {
      for (let i = 0; i < foundCount; i++) this.cache.delete(i)
    }
  }
}

/**
 * CachedResult — objet lazy retourné par GridStateCache.get().
 *
 * Les propriétés `steps` et `cases` sont calculées à la demande (lazy) pour
 * éviter de parser la chaîne de cache inutilement.
 *
 * La propriété `moves` est un raccourci vers steps.flat() (liste plate de tous
 * les moves en un seul tableau, compatible avec les anciens appelants).
 */
class CachedResult {
  /**
   * @param {string}       cached       - Chaîne brute issue du cache
   * @param {Array<Array>} originalGrid - Grille d'origine (pour reconstruire cases)
   */
  constructor(cached, originalGrid) {
    this._cached = cached
    this._originalGrid = deepCopyCases(originalGrid)
    const validFlow = cached.split(':')[0]
    this.isValid = validFlow[0] === '1'
    this.flow    = parseInt(validFlow.slice(1))
    this._steps  = undefined
    this._cases  = undefined
  }

  /**
   * Tableau des étapes de résolution : `Array<Array<Move>>`.
   * Chaque étape est un tableau de moves appliqués en une passe.
   * Parsé lazily depuis la chaîne de cache.
   * @type {Array<Array<string>>}
   */
  get steps() {
    if (this._steps === undefined) {
      const stepsStr = this._cached.split(':')[1] || ''
      this._steps = stepsStr.split('|').map(s => s.match(/([+-]\d{3})/g) || [])
    }
    return this._steps
  }

  /**
   * Liste plate de tous les moves (steps.flat()).
   * Raccourci pratique pour les consommateurs qui veulent une liste simple.
   * @type {Array<string>}
   */
  get moves() {
    return this.steps.flat()
  }

  /**
   * Grille résultante après application des steps.
   * Reconstruite lazily à partir de la grille d'origine et de la diffKey.
   * @type {Array<Array>}
   */
  get cases() {
    if (this._cases === undefined) {
      this._cases = this._originalGrid
      const casesStr = this._cached.split(':')[2] || ''
      if (!casesStr) return this._cases
      const parts = casesStr.match(/=|\d|\[\d*\]/g)
      if (!parts) return this._cases
      let row = 0, col = -1
      for (const part of parts) {
        if (++col === 9) { col = 0; row++ }
        while (row < 9 && this._cases[row][col].found) {
          if (++col === 9) { col = 0; row++ }
        }
        if (row === 9) break
        const cell = this._cases[row][col]
        if (part === '=') continue
        if (part.startsWith('[') && part.endsWith(']')) {
          const annots = part.slice(1, -1).split('').map(Number)
          for (const n of annots) {
            cell.annots.add(-n)
            cell.annots.delete(n)
            cell.annots.delete(10 + n)
          }
        } else {
          cell.found = parseInt(part)
        }
      }
    }
    return this._cases
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — VALIDITÉ (candidateIsValid, caseIsValid, gridIsValid, gridIsComplete)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie si le chiffre `num` est en conflit dans les unités de la case (i,j).
 * Implémentation interne : ne vérifie que les conflits de voisinage.
 * @param {Array<Array>} cases
 * @param {object}       cell  - La case elle-même (pour la méthode caseUnitsMap)
 * @param {number}       i
 * @param {number}       j
 * @param {number}       num
 * @returns {boolean} true si le chiffre est valide (pas en conflit)
 */
function l_candidateIsValid(cases, cell, i, j, num) {
  let valid = true
  cell.caseUnitsMap(cases, (unit) => {
    if (!valid) return
    if (unit.some(c => (c.i !== i || c.j !== j) && c.found === num)) valid = false
  })
  return valid
}

/**
 * Vérifie si le chiffre `num` peut être placé en (i,j) sans créer de conflit.
 *
 * Règles :
 *   - Si la case est donnée (given), elle est toujours considérée valide.
 *   - Si la case est vide et a 9 annotations négatives, elle est invalide.
 *   - Si num ≤ 0, retourne true (pas de vérification de conflit).
 *   - Sinon, vérifie l'absence de `num` dans les 20 voisins (ligne/colonne/bloc).
 *
 * @param {Array<Array>} cases
 * @param {number}       i
 * @param {number}       j
 * @param {number}       num  - Chiffre à vérifier (0 = case vide, <0 = annot neg)
 * @returns {boolean}
 */
function candidateIsValid(cases, i, j, num) {
  const cell = cases[i][j]
  if (cell.given) return true
  const annots = [...cell.annots].filter(n => -9 <= n && n <= 9)
  if (cell.found === 0 && annots.length === 9 && annots.every(n => n < 0)) return false
  if (num === 0 || num < 0) return true
  return l_candidateIsValid(cases, cell, i, j, num)
}

/**
 * Vérifie si une case est dans un état valide :
 *   - Si elle a un found : le found ne doit pas être en conflit.
 *   - Sinon : toutes ses annotations positives doivent être sans conflit.
 * @param {Array<Array>} cases
 * @param {object}       cell
 * @param {boolean}      [log=false] - Active les logs de débogage
 * @returns {boolean}
 */
function caseIsValid(cases, cell, log = false) {
  if (cell.found) return candidateIsValid(cases, cell.i, cell.j, cell.found)
  const annots = [...cell.annots].filter(n => -9 <= n && n <= 9)
  const valid = annots.every(n => candidateIsValid(cases, cell.i, cell.j, n))
  if (log)
    console.log(`${cell.i} ${cell.j} caseIsValid: ${valid} ${[...cell.annots]} ${annots.map(n => candidateIsValid(cases, cell.i, cell.j, n))}`)
  return valid
}

/**
 * Vérifie si toutes les cases de la grille sont dans un état valide.
 * Retourne false dès qu'une case est invalide (court-circuit via Array.every).
 * @param {Array<Array>} cases
 * @param {boolean}      [log=false]
 * @returns {boolean}
 */
function gridIsValid(cases, log = false) {
  return cases.every(row => row.every(cell => caseIsValid(cases, cell, log)))
}

/**
 * Vérifie si la grille est entièrement remplie (toutes les cases ont found > 0).
 * Ne vérifie pas la validité.
 * @param {Array<Array>} cases
 * @returns {boolean}
 */
function gridIsComplete(cases) {
  return cases.every(row => row.every(cell => cell.found > 0))
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — REMPLISSAGE (fillCase, fillAnnotations)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applique un Move à la grille (modification en place).
 *
 * Formats de move : [+-?][i][j][n]
 *   '+'  → pose le chiffre n en (i,j) et met à jour les annotations des voisins
 *   '-'  → marque n comme impossible en (i,j)
 *   '?'  → toggle annotation positive (uniquement si fromUser=true)
 *
 * Gestion du fromUser :
 *   - Si fromUser=true, la saisie utilisateur peut annuler un found existant
 *     en retapant le même chiffre, ou toggler une annotation '?'.
 *   - Si fromUser=false (résolution automatique), les moves sont irréversibles.
 *
 * @param {Array<Array>} cases
 * @param {string}       move      - Move à appliquer (4 caractères)
 * @param {boolean}      [fromUser=false]
 * @throws {Error} Si le move n'est pas valide
 */
function fillCase(cases, move, fromUser = false) {
  if (move.length !== 4 || !move.match(/^[+-?][0-9][0-9][1-9]$/)) {
    throw new Error(`move invalide: ${move}`)
  }
  const c = cases[parseInt(move[1])][parseInt(move[2])]
  const n = parseInt(move[3])
  if (c.given) return

  const l_calcAnnot = (cases, c, i, j, n) => {
    const v = l_candidateIsValid(cases, c, i, j, n) ? n : -n
    if (!c.annots.has(v)) { c.annots.delete(-v); c.annots.add(v) }
  }

  if (move[0] === '+') {
    // ── Pose d'un chiffre ──────────────────────────────────────────────────
    const old = c.found
    if (old && (fromUser || old !== n)) {
      // Libère l'ancien chiffre dans les voisins
      c.found = 0
      c.caseUnitsMap(cases, (unit) => {
        unit.forEach(cc => {
          if ((cc.i !== c.i || cc.j !== c.j) && !cc.found && cc.annots.has(-old) &&
              l_candidateIsValid(cases, cc, cc.i, cc.j, old)) {
            cc.annots.delete(-old); cc.annots.delete(-10 - old)
          }
        })
      })
    }
    if (old !== n) {
      // Pose le nouveau chiffre et bloque-le dans les voisins
      c.found = n
      c.caseUnitsMap(cases, (unit) => {
        unit.forEach(cc => {
          if ((cc.i !== c.i || cc.j !== c.j) && !cc.found && !cc.annots.has(-n)) {
            cc.annots.delete(n); cc.annots.delete(10 + n); cc.annots.add(-n)
          }
        })
      })
    } else if (fromUser) {
      // Annule la saisie (même chiffre → toggle off)
      c.found = 0
      for (let m = 1; m <= 9; ++m) {
        if (c.annots.has(10 + m) || c.annots.has(-10 - m)) continue
        l_calcAnnot(cases, c, c.i, c.j, m)
      }
    }
  } else if (move[0] === '?' && fromUser) {
    // ── Toggle annotation positive (utilisateur) ──────────────────────────
    if (!c.annots.has(10 + n)) {
      c.annots.add(10 + n); c.annots.add(n)
      c.annots.delete(-n); c.annots.delete(-10 - n)
    } else {
      c.annots.delete(10 + n); l_calcAnnot(cases, c, c.i, c.j, n)
    }
  } else if (move[0] === '-') {
    // ── Annotation négative ───────────────────────────────────────────────
    if (fromUser) {
      if (!c.annots.has(-10 - n)) {
        c.annots.add(-10 - n); c.annots.add(-n)
        c.annots.delete(n); c.annots.delete(10 + n)
      } else {
        c.annots.delete(-10 - n); l_calcAnnot(cases, c, c.i, c.j, n)
      }
    } else {
      c.annots.add(-n); c.annots.delete(n); c.annots.delete(10 + n)
    }
  }
}

/**
 * Complète toutes les annotations manquantes dans la grille.
 *
 * Pour chaque case vide, pour chaque chiffre 1–9 qui n'est pas encore annoté
 * (ni positif ni négatif), calcule s'il crée un conflit et pose l'annotation
 * correspondante (+n ou -n).
 *
 * Modifie la grille en place et la retourne également.
 * À appeler après tout changement de grille pour maintenir les annotations
 * cohérentes avec l'état courant.
 *
 * @param {Array<Array>} cases
 * @returns {Array<Array>} La même grille (modifiée)
 */
function fillAnnotations(cases) {
  return cases.map((row, i) =>
    row.map((cell, j) => {
      if (cell.found !== 0) return cell
      for (let n = 1; n <= 9; ++n) {
        if (cell.annots.has(n) || cell.annots.has(-n)) continue
        cell.annots.add(candidateIsValid(cases, i, j, n) ? n : -n)
      }
      return cell
    })
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — HEURISTIQUES INDIVIDUELLES
// ─────────────────────────────────────────────────────────────────────────────

// ── 6.1  SelfSufficientSingle (naked single / candidat unique) ──────────────

/**
 * Teste si la case (i,j) a exactement un seul candidat possible.
 *
 * Condition : la case est vide ET a exactement 8 annotations négatives
 * (donc un seul chiffre n'est pas négatif). Ce chiffre est retourné si
 * il ne crée pas de conflit dans les unités.
 *
 * Alias : naked single, candidat unique, singleton nu.
 *
 * @param {Array<Array>}   cases
 * @param {number}         i
 * @param {number}         j
 * @param {Set<number>|null} [limitedAnnots=null] - Si fourni, n'examine que ces chiffres
 * @returns {number} Le candidat unique (1–9), ou 0 si non applicable
 */
function isSelfSufficientSingle(cases, i, j, limitedAnnots = null) {
  const cell = cases[i][j]
  if (cell.found !== 0) return 0
  let negatives = 0
  for (const n of cell.annots) { if (-9 <= n && n <= -1) negatives++ }
  if (negatives === 8) {
    const allDigits = limitedAnnots ? limitedAnnots : DIGITS
    for (const digit of allDigits) {
      if (!cell.annots.has(-digit)) {
        return candidateIsValid(cases, i, j, digit) ? digit : 0
      }
    }
  }
  return 0
}

/**
 * Applique isSelfSufficientSingle à toutes les cases de la grille.
 * @param {Array<Array>}     cases
 * @param {Set<number>|null} [limitedAnnots=null]
 * @returns {Map<string, Array>} Map des moves détectés
 */
function selfSufficientSingles(cases, limitedAnnots = null) {
  const result = new Map()
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const num = isSelfSufficientSingle(cases, i, j, limitedAnnots)
      if (num) {
        const m = `+${i}${j}${num}`
        addToMap(result, m, { h: 'SelfSufficientSingle', m })
      }
    }
  }
  return result
}

// ── 6.2  ExclusiveSingle (hidden single / singleton caché) ──────────────────

/**
 * Teste si le chiffre `n` en (i,j) est l'unique case possible dans au moins
 * une de ses unités (ligne, colonne ou bloc).
 *
 * Conditions :
 *   - La case est vide.
 *   - Le chiffre n n'est pas marqué négatif sur la case.
 *   - Le chiffre n ne crée pas de conflit.
 *   - Dans au moins une unité de (i,j), tous les autres emplacements sont
 *     soit remplis par un autre chiffre, soit ont n en annotation négative.
 *
 * Alias : hidden single, singleton caché, exclusive single.
 *
 * @param {Array<Array>} cases
 * @param {number}       i
 * @param {number}       j
 * @param {number}       n
 * @returns {string[]|false} Liste des types d'unités concernées, ou false
 */
function isExclusiveSingle(cases, i, j, n) {
  const cell = cases[i][j]
  if (cell.found !== 0 || !candidateIsValid(cases, i, j, n) || cell.annots.has(-n)) return false
  const digitIsNotPossible = (c, n) =>
    (c.found > 0 && c.found !== n) || (c.found === 0 && c.annots.has(-n))
  const types = cases[i][j].caseUnitsMap(cases, (unit, type) => {
    let negs = 0
    for (const c of unit) {
      if (c.i === i && c.j === j) continue
      if (digitIsNotPossible(c, n)) negs++
    }
    return negs === 8 ? type : false
  })
  return types.length > 0 ? types : false
}

/**
 * Applique isExclusiveSingle à toutes les cases/chiffres de la grille.
 * @param {Array<Array>}     cases
 * @param {Set<number>|null} [limitedAnnots=null]
 * @returns {Map<string, Array>}
 */
function exclusiveSingles(cases, limitedAnnots = null) {
  const result = new Map()
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const allDigits = limitedAnnots ? limitedAnnots : DIGITS
      for (const n of allDigits) {
        const types = isExclusiveSingle(cases, i, j, n)
        if (types) {
          const m = `+${i}${j}${n}`
          addToMap(result, m, { h: 'ExclusiveSingle', m, types })
        }
      }
    }
  }
  return result
}

// ── 6.3  SelfSufficientSubset (naked subset / paire nue, triple nu…) ────────

/**
 * Recherche les sous-ensembles « nus » dans une unité (naked subset).
 *
 * Principe : si N cases dans une unité ne contiennent au total que N candidats
 * possibles, alors ces N candidats ne peuvent apparaître ailleurs dans l'unité.
 * On peut donc les éliminer des autres cases.
 *
 * Exemples : paire nue (N=2), triple nu (N=3), quadruplet nu (N=4).
 *
 * @param {Array}  unit   - 9 cases de la grille
 * @param {string} type   - "block" | "row" | "col"
 * @param {number} index  - Index de l'unité (0–8)
 * @param {object} result - Accumulateur { selfSufficientSubsets, flagged }
 * @returns {object}      - result enrichi
 */
function selfSufficientSubsetsInUnit(unit, type, index, result) {
  const cells = unit
    .map((c, idx) => {
      if (c.found) return null
      const nonnegs = []
      for (let n = 1; n <= 9; n++) if (!c.annots.has(-n)) nonnegs.push(n)
      return nonnegs.length ? { idx, i: c.i, j: c.j, nonnegs } : null
    })
    .filter(Boolean)

  for (let n = 1; n <= cells.length - 1; ++n) {
    for (const combo of combinations(cells, n)) {
      const nonnegsUnion = new Set()
      combo.forEach(c => c.nonnegs.forEach(p => nonnegsUnion.add(p)))
      if (nonnegsUnion.size !== n) continue
      const good = { type, index, combo, nonnegsUnion, flagged: [] }
      result.selfSufficientSubsets.push(good)
      for (let i = 0; i < 9; ++i) {
        const c = unit[i]
        if (c.found || combo.some(c => c.idx === i)) continue
        for (const num of nonnegsUnion) {
          if (!c.annots.has(-num)) {
            let flag = result.flagged.find(f => f.i === c.i && f.j === c.j && f.n === num)
            if (flag) flag.combos.push(combo)
            else result.flagged.push(flag = { i: c.i, j: c.j, n: num, combos: [combo] })
            good.flagged.push(flag)
          }
        }
      }
    }
  }
  return result
}

/**
 * Applique selfSufficientSubsetsInUnit à chaque unité de la grille.
 * Retourne l'analyse complète et une Map des moves à effectuer.
 *
 * @param {Array<Array>} cases
 * @returns {{ selfSufficientSubsets: Array, flagged: Array, map: Map }}
 */
function selfSufficientSubsets(cases) {
  const map = new Map()
  let result = { selfSufficientSubsets: [], flagged: [], map }
  cases.gridUnitsMap((unit, type, index) => {
    result = selfSufficientSubsetsInUnit(unit, type, index, result)
  })
  for (const flag of result.flagged) {
    const m = `-${flag.i}${flag.j}${flag.n}`
    addToMap(map, m, { h: 'SelfSufficientSubset:flag', m })
  }
  for (const subset of result.selfSufficientSubsets) {
    if (subset.flagged.length > 0) {
      for (const cell of subset.combo) {
        addToMap(map, ` ${cell.i}${cell.j}0`, { h: 'SelfSufficientSubset' })
      }
    }
  }
  return result
}

// ── 6.4  ExclusiveIntersection (pointing pair/triple, box-line reduction) ────

/**
 * Détecte les intersections exclusives entre blocs et lignes/colonnes.
 *
 * Principe (pointing pair/triple) :
 *   Si dans un bloc, un candidat n n'apparaît que dans une seule ligne (ou
 *   colonne), alors n peut être éliminé de la ligne (ou colonne) en dehors
 *   du bloc.
 *
 * Principe (box-line reduction) :
 *   Si dans une ligne (ou colonne), un candidat n n'apparaît que dans un seul
 *   bloc, alors n peut être éliminé du reste du bloc.
 *
 * Implémentation via deux matrices LB[n][r][b] et CB[n][B][c] qui comptent
 * les occurrences de n dans chaque tranche ligne×bloc et bloc×colonne.
 *
 * @param {Array<Array>} cases
 * @returns {Map<string, Array>} Map des moves d'élimination détectés
 */
function unitsIntersection(cases) {
  const result = new Map()
  const LB = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => Array(3).fill(0)))
  const CB = Array.from({ length: 9 }, () => Array.from({ length: 3 }, () => Array(9).fill(0)))
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = cases[r][c]
      for (let n = 1; n <= 9; n++) {
        if (!cell.found && !cell.annots.has(-n)) {
          LB[n - 1][r][Math.floor(c / 3)]++
          CB[n - 1][Math.floor(r / 3)][c]++
        }
      }
    }
  }
  function goodIntersection(a, b, c) {
    return a && !b && !c ? 0 : !a && b && !c ? 1 : !a && !b && c ? 2 : -1
  }
  function eliminateParts(r1, c1, r2, c2, type, n) {
    function eliminatePart(r, c, type, n) {
      for (let i = 0; i < 3; i++) {
        const cell = type === 'col' ? cases[r][c * 3 + i] : cases[r * 3 + i][c]
        if (!cell.found && !cell.annots.has(-n)) {
          const m = `-${cell.i}${cell.j}${n}`
          addToMap(result, m, { h: 'ExclusiveIntersection', m })
        }
      }
    }
    eliminatePart(r1, c1, type, n)
    eliminatePart(r2, c2, type, n)
  }
  for (let n = 0; n < 9; n++) {
    for (let b = 0; b < 3; b++) {
      for (let i = 0; i < 3; i++) {
        const u = 3 * b + i
        const cc = goodIntersection(LB[n][u][0], LB[n][u][1], LB[n][u][2])
        const ll = goodIntersection(CB[n][0][u], CB[n][1][u], CB[n][2][u])
        if (cc !== -1) eliminateParts(3 * b + (i === 0 ? 1 : 0), cc, 3 * b + (i === 2 ? 1 : 2), cc, 'col', n + 1)
        if (ll !== -1) eliminateParts(ll, 3 * b + (i === 0 ? 1 : 0), ll, 3 * b + (i === 2 ? 1 : 2), 'row', n + 1)
        const l = goodIntersection(LB[n][3 * b][i], LB[n][3 * b + 1][i], LB[n][3 * b + 2][i])
        const cv = goodIntersection(CB[n][i][3 * b], CB[n][i][3 * b + 1], CB[n][i][3 * b + 2])
        if (l !== -1) eliminateParts(3 * b + l, (i === 0 ? 1 : 0), 3 * b + l, (i === 2 ? 1 : 2), 'col', n + 1)
        if (cv !== -1) eliminateParts((i === 0 ? 1 : 0), 3 * b + cv, (i === 2 ? 1 : 2), 3 * b + cv, 'row', n + 1)
      }
    }
  }
  return result
}

// ── 6.5  FalsifiedBySingleDigitChain (Nishio / Digit Forcing Chain) ──────────

/**
 * Teste si poser le chiffre `n` en (i,j) mène à une contradiction en ne
 * propageant que les déductions impliquant ce même chiffre.
 *
 * La chaîne se limite aux selfSufficientSingles et exclusiveSingles sur n.
 * Si la grille devient invalide, n est impossible en (i,j) → move '-ijn'.
 *
 * Alias : Nishio, Digit Forcing Chain (DFC), chaîne mono-chiffre.
 *
 * @param {Array<Array>}     cases
 * @param {number}           i
 * @param {number}           j
 * @param {number}           n     - Candidat à tester
 * @param {GridStateCache|null} [keep=null]
 * @returns {boolean} true si falsifié (n impossible en (i,j))
 */
function isFalsifiedBySingleDigitChain(cases, i, j, n, keep = null) {
  const cell = cases[i][j]
  if (cell.found || cell.annots.has(-n)) return false
  const move = `+${i}${j}${n}`
  const hs = { selfSufficientSingle: true, exclusiveSingle: true, limitedAnnots: new Set([n]) }
  return !simpleFill(cases, hs, move, keep).isValid
}

/**
 * Applique isFalsifiedBySingleDigitChain à toutes les cases/chiffres.
 * @param {Array<Array>}     cases
 * @param {GridStateCache|null} [keep=null]
 * @returns {Map<string, Array>}
 */
function falsifiedsBySingleDigitChain(cases, keep) {
  const result = new Map()
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      for (let n = 1; n <= 9; n++) {
        if (isFalsifiedBySingleDigitChain(cases, i, j, n, keep)) {
          const m = `-${i}${j}${n}`
          addToMap(result, m, { h: 'FalsifiedBySingleDigitChain', m })
        }
      }
    }
  }
  return result
}

// ── 6.6  FalsifiedByChain (chaîne de contradiction générale) ─────────────────

/**
 * Teste si poser (n>0) ou éliminer (n<0) le candidat en (i,j) mène à une
 * contradiction via les heuristiques `hs`.
 *
 * Si oui, l'opération inverse est vraie : c'est une déduction.
 *
 * @param {Array<Array>}     cases
 * @param {number}           i
 * @param {number}           j
 * @param {number}           n   - Positif = test fill, négatif = test annotNeg
 * @param {object}           [hs]
 * @param {GridStateCache|null} [keep=null]
 * @returns {false|object}   false si valide, ou le résultat de simpleFill si falsifié
 */
function isFalsifiedByChain(
  cases, i, j, n,
  hs = { selfSufficientSingle: true, exclusiveSingle: true },
  keep = null
) {
  const cell = cases[i][j]
  const m = Math.abs(n)
  if (cell.found || cell.annots.has(-m)) return false
  const move = `${n > 0 ? '+' : '-'}${i}${j}${m}`
  const r = simpleFill(cases, hs, move, keep)
  return r.isValid ? false : r
}

/**
 * Recherche la chaîne de contradiction la plus courte partant du move `initialMove`.
 *
 * Algorithme BFS : explore les moves de déduction à partir de la grille
 * modifiée par initialMove, jusqu'à trouver une contradiction.
 *
 * @param {Array<Array>} initialCases
 * @param {object}       hs           - Heuristiques pour les déductions
 * @param {string}       initialMove  - Move de départ à tester
 * @param {number}       [maxMoves=Infinity]
 * @returns {string[]|null} Suite de moves menant à la contradiction, ou null
 */
function findShortestContradictionChainForMove(initialCases, hs, initialMove, maxMoves = Infinity) {
  if (!gridIsValid(initialCases)) return []
  const queue   = []
  const visited = new Set()
  const movesKey = (moves) => moves.sort().join('')

  function oneStep(cases, move, moves) {
    const newMoves = [...moves, move]
    const newKey   = movesKey(newMoves)
    if (visited.has(newKey)) return null
    visited.add(newKey)
    const newCases = deepCopyCases(cases)
    fillCase(newCases, move)
    fillAnnotations(newCases)
    const valid = gridIsValid(newCases)
    const r = { valid, cases: newCases, moves: newMoves }
    if (valid && newMoves.length < maxMoves) queue.push(r)
    return r
  }

  const step = oneStep(initialCases, initialMove, [])
  if (step && !step.valid) return step.moves

  while (queue.length > 0) {
    const { cases, moves } = queue.shift()
    const toFill = deductionMoves(cases, hs).filter(m => !visited.has(movesKey([...moves, m])))
    for (const m of toFill) {
      const step = oneStep(cases, m, moves)
      if (step && !step.valid) return step.moves
    }
  }
  return null
}

/**
 * Parmi tous les moves contenus dans `steps`, cherche le plus petit sous-ensemble
 * qui mène à une contradiction.
 *
 * @param {Array<Array>} initialCases
 * @param {object}       hs
 * @param {Array<Array>} steps      - Tableau de tableaux de moves
 * @param {number}       [maxMoves=Infinity]
 * @returns {string[]|null}
 */
function findShortestContradictionChainForSteps(initialCases, hs, steps, maxMoves = Infinity) {
  const moves = filterUselessMoves(steps.flat())
  return moves
  // Recherche des sous-ensembles minimaux (code commenté dans l'original — conservé)
  // const minimalSubsets = []
  // ...
}

/**
 * Applique isFalsifiedByChain à toutes les cases/candidats.
 * Si `findShortest` est true, cherche en plus la chaîne minimale.
 *
 * @param {Array<Array>}     cases
 * @param {object}           [hs]
 * @param {boolean}          [findShortest=false]
 * @param {GridStateCache|null} [keep=null]
 * @returns {Map<string, Array>}
 */
function falsifiedsByChain(
  cases,
  hs = { selfSufficientSingle: true, exclusiveSingle: true },
  findShortest = false,
  keep = null
) {
  const result = new Map()
  if (!gridIsValid(cases)) return result
  const falseCandidates = []
  const hsCount = Object.keys(hs).length
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const cell = cases[i][j]
      if (cell.found !== 0) continue
      for (let n = 1; n <= 9; n++) {
        if (cell.annots.has(-n)) continue
        const moves = new Map([[n, `+${i}${j}${n}`], [-n, `-${i}${j}${n}`]])
        for (const [key, move] of moves) {
          const r = isFalsifiedByChain(cases, i, j, key, hs, keep)
          if (r) {
            if (findShortest) falseCandidates.push({ move, flow: r.flow, steps: r.steps })
            const m = moveInverted(move)
            addToMap(result, m, { h: `FalsifiedByChain${hsCount}:${move[0]}`, m, steps: r.steps })
          }
        }
      }
    }
  }
  if (findShortest && falseCandidates.length) {
    falseCandidates.sort((a, b) => a.steps.length - b.steps.length || a.flow - b.flow)
    let bestMove = null, bestChain = null
    for (const { move, steps } of falseCandidates) {
      const chain = findShortestContradictionChainForSteps(
        cases, hs, steps, bestChain ? bestChain.length - 1 : Infinity
      )
      if (chain && (!bestChain || chain.length < bestChain.length)) {
        bestMove  = move
        bestChain = chain
        if (bestChain.length === 1) break
      }
    }
    if (bestChain) {
      const m = moveInverted(bestMove)
      addToMap(result, m, { h: 'FalsifiedByChain:shortest', m, chain: bestChain })
    }
  }
  return result
}

// ── 6.7  ConsensusElimination ─────────────────────────────────────────────────

/**
 * Heuristique de consensus : pour chaque groupe de moves possibles, on teste
 * chacun via simpleFill. Si pour toutes les hypothèses valides, un chiffre n
 * n'est jamais possible dans une case donnée, on peut l'éliminer.
 *
 * Implémentation interne pour un groupe de moves donné.
 *
 * @param {Array<Array>}     initialCases
 * @param {string[]}         moves       - Groupe de moves à tester en hypothèses
 * @param {object}           hs          - Heuristiques utilisées dans simpleFill
 * @param {Set<string>}      falsifieds  - Moves déjà connus comme faux (mis à jour)
 * @param {Map}              result      - Accumulateur des déductions
 * @param {GridStateCache|null} [keep=null]
 * @returns {Map}
 */
function consensusEliminationsForMoves(initialCases, moves, hs, falsifieds, result, keep = null) {
  if (moves.some(m => falsifieds.has(m))) return result
  const cases = deepCopyCases(initialCases)
  // 1. Annotations initiales pour chaque case non trouvée
  const initialPossibles = new Map()
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const cell = cases[i][j]
      if (!cell.found) {
        const possibles = new Set()
        for (let n = 1; n <= 9; n++) if (!cell.annots.has(-n)) possibles.add(n)
        initialPossibles.set(`${i},${j}`, possibles)
      }
    }
  }
  // 2. Annotations après chaque hypothèse
  const afterPossibles = new Map()
  let falsifiedsLocal = 0
  for (const move of moves) {
    const { isValid, cases: moveCases } = simpleFill(cases, hs, move, keep)
    if (!isValid) {
      const m = moveInverted(move)
      addToMap(result, m, { h: 'ConsensusElimination:falsified', m, from: moves })
      falsifiedsLocal++
      falsifieds.add(move)
      continue
    }
    if (!falsifiedsLocal) {
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          const key = `${i},${j}`
          if (initialPossibles.has(key)) {
            const cell = moveCases[i][j]
            if (!afterPossibles.has(key)) afterPossibles.set(key, new Set())
            const possibles = afterPossibles.get(key)
            if (cell.found) possibles.add(cell.found)
            else for (let n = 1; n <= 9; n++) if (!cell.annots.has(-n)) possibles.add(n)
          }
        }
      }
    }
  }
  // 3. Déductions par différence
  if (!falsifiedsLocal) {
    for (const [key, possibles0] of initialPossibles.entries()) {
      const [i, j] = key.split(',').map(Number)
      const possibles1 = afterPossibles.get(key) || new Set()
      if (possibles1.size < possibles0.size) {
        for (const n of possibles0) {
          if (!possibles1.has(n)) {
            const m = `-${i}${j}${n}`
            addToMap(result, m, { h: 'ConsensusElimination', m, from: moves })
          }
        }
      }
    }
  }
  return result
}

/**
 * Applique consensusEliminationsForMoves à tous les groupes de candidats :
 *   - Par case (tous les candidats d'une même case)
 *   - Par valeur dans une unité (toutes les cases où n peut aller dans la même unité)
 *   - Par paire +/- pour chaque candidat
 *
 * L'ordre de test est : 2, 1, 3, 4, 5, 6, 7, 8, 9 (on commence par les groupes
 * les plus informatifs et on s'arrête dès qu'une déduction est trouvée).
 *
 * @param {Array<Array>}     cases
 * @param {object}           hs    - Heuristiques pour simpleFill interne
 * @param {GridStateCache|null} [keep=null]
 * @returns {Map<string, Array>}
 */
function consensusEliminations(cases, hs, keep = null) {
  const result   = new Map()
  const ordered  = [2, 1, 3, 4, 5, 6, 7, 8, 9]
  const toBeTested = new Map(ordered.map(n => [n, []]))
  const falsifieds = new Set()

  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const cell = cases[i][j]
      if (cell.found) continue
      const possibles = []
      for (let n = 1; n <= 9; n++) {
        if (!cell.annots.has(-n)) {
          toBeTested.get(1).push([`+${i}${j}${n}`, `-${i}${j}${n}`])
          possibles.push(`+${i}${j}${n}`)
        }
      }
      if (possibles.length > 1) toBeTested.get(possibles.length).push(possibles)
    }
  }

  cases.gridUnitsMap((unit) => {
    const moves4Possible = new Map()
    for (const cell of unit) {
      if (cell.found) continue
      for (let n = 1; n <= 9; n++) {
        if (!cell.annots.has(-n)) {
          const move = `+${cell.i}${cell.j}${n}`
          if (!moves4Possible.has(n)) moves4Possible.set(n, [])
          moves4Possible.get(n).push(move)
        }
      }
    }
    for (const moves of moves4Possible.values()) {
      if (moves.length > 1) toBeTested.get(moves.length).push(moves)
    }
  })

  for (const c of ordered) {
    for (const moves of toBeTested.get(c)) {
      consensusEliminationsForMoves(cases, moves, hs, falsifieds, result, keep)
    }
    if (result.size) break
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — ORCHESTRATION DES HEURISTIQUES
// ─────────────────────────────────────────────────────────────────────────────

/** Configurations d'heuristiques pour les chaînes de profondeur croissante */
const hsForChain2 = { selfSufficientSingle: true, exclusiveSingle: true }
const hsForChain3 = { ...hsForChain2, selfSufficientSubset: true }
const hsForChain4 = { ...hsForChain3, exclusiveIntersection: true }
const hsForChain5 = { ...hsForChain4, falsifiedBySingleDigitChain: true }

/**
 * Générateur qui applique séquentiellement toutes les heuristiques activées
 * et émet (via yield) les résultats au fur et à mesure.
 *
 * Comportement :
 *   - Si `shouldStop` est null, fonctionne comme une fonction normale (pas de yield).
 *   - Si `shouldStop` est une fonction, yield à chaque nouvelle déduction et
 *     s'arrête si shouldStop() retourne true.
 *
 * Ordre d'application :
 *   selfSufficientSingle → exclusiveSingle → selfSufficientSubset →
 *   exclusiveIntersection → falsifiedBySingleDigitChain →
 *   falsifiedByChain (profondeur croissante) → consensusElimination
 *
 * @param {Array<Array>} initialCases
 * @param {object}       [hs] - Heuristiques à activer
 * @param {GridStateCache|null} [keep=null]
 * @param {function|null}  [shouldStop=()=>false]
 * @yields {{ type: string, newResult: Map, result: Map, h: string }}
 * @returns {Map} (quand shouldStop est null — cas non-générateur)
 */
function* deductions(
  initialCases,
  hs = { selfSufficientSingle: true, exclusiveSingle: true },
  keep = null,
  shouldStop = () => false
) {
  const {
    selfSufficientSingle, exclusiveSingle, selfSufficientSubset,
    exclusiveIntersection, falsifiedBySingleDigitChain,
    consensusElimination, falsifiedByChain,
  } = hs

  const result = new Map()
  fillAnnotations(initialCases)
  const cases = deepCopyCases(initialCases)
  if (shouldStop && shouldStop()) return

  function* mergeMaps(sourceMap, h) {
    if (!sourceMap || sourceMap.size === 0) return
    for (const [key, value] of sourceMap.entries()) {
      if (result.has(key)) result.get(key).push(...value)
      else result.set(key, [...value])
    }
    if (shouldStop) yield { type: 'results', newResult: sourceMap, result, h }
  }

  if (selfSufficientSingle) {
    if (shouldStop && shouldStop()) return
    yield* mergeMaps(selfSufficientSingles(cases, hs.limitedAnnots), 'selfSufficientSingle')
  }
  if (exclusiveSingle) {
    if (shouldStop && shouldStop()) return
    yield* mergeMaps(exclusiveSingles(cases, hs.limitedAnnots), 'exclusiveSingle')
  }
  if (selfSufficientSubset) {
    if (shouldStop && shouldStop()) return
    yield* mergeMaps(selfSufficientSubsets(cases).map, 'selfSufficientSubset')
  }
  if (exclusiveIntersection) {
    if (shouldStop && shouldStop()) return
    yield* mergeMaps(unitsIntersection(cases), 'exclusiveIntersection')
  }
  if (falsifiedBySingleDigitChain) {
    if (shouldStop && shouldStop()) return
    yield* mergeMaps(falsifiedsBySingleDigitChain(cases, keep), 'falsifiedBySingleDigitChain')
  }
  if (falsifiedByChain) {
    const hsChain = [hsForChain2, hsForChain3, hsForChain4, hsForChain5]
    let i = 0
    while (result.size === 0 && i < hsChain.length) {
      if (shouldStop && shouldStop()) return
      const h = `falsifiedByChain ${Object.keys(hsChain[i]).length}`
      yield* mergeMaps(falsifiedsByChain(cases, hsChain[i++], true, keep), h)
    }
  }
  if (consensusElimination && result.size === 0) {
    if (shouldStop && shouldStop()) return
    yield* mergeMaps(consensusEliminations(cases, hsForChain5, keep), 'consensusElimination')
  }
  if (!shouldStop) return result
  if (result.size > 0) yield { type: 'final', result }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — DÉDUCTIONS & SIMPLEFILL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filtre les moves inutiles d'un tableau :
 *   - Garde tous les '+' (fills)
 *   - Ne garde les '-' que pour les cases qui ne seront pas remplies par un '+'
 * Trie le résultat.
 *
 * @param {string[]} moves
 * @returns {string[]}
 */
function filterUselessMoves(moves) {
  if (!moves || moves.length === 0) return []
  const fillMoves = new Set()
  moves.forEach(m => { if (m[0] === '+') fillMoves.add(m.slice(1, 3)) })
  return moves
    .filter(m => m[0] === '+' || (m[0] === '-' && !fillMoves.has(m.slice(1, 3))))
    .sort((m1, m2) => m1.slice(1).localeCompare(m2.slice(1)))
}

/**
 * Convertit une Map de déductions (issue de `deductions`) en tableau de moves.
 * Ne retient qu'un move par clé (annotation) car si la grille est valide,
 * toutes les heuristiques convergent vers le même signe.
 * Filtre les FalsifiedByChain:+/- (intermediaires) et les moves inutiles.
 *
 * @param {Map|null} deductionsMap
 * @returns {string[]}
 */
function deductionMovesFromMap(deductionsMap) {
  if (!deductionsMap) return []
  const moves = Array.from(deductionsMap.values())
    .map(ds => ds.find(d => d.m)?.m)
    .filter(Boolean)
  return filterUselessMoves(moves)
}

/**
 * Calcule et retourne immédiatement (sans générateur) la liste des moves
 * déductibles depuis `cases` avec les heuristiques `hs`.
 *
 * C'est le point d'entrée le plus simple pour "que peut-on déduire maintenant ?".
 *
 * @param {Array<Array>}     cases
 * @param {object}           [hs]
 * @param {GridStateCache|null} [keep=null]
 * @returns {string[]}
 */
function deductionMoves(
  cases,
  hs = { selfSufficientSingle: true, exclusiveSingle: true },
  keep = null
) {
  return deductionMovesFromMap(deductions(cases, hs, keep, null).next().value)
}

/**
 * Applique itérativement les heuristiques jusqu'à épuisement des déductions
 * ou invalidation de la grille.
 *
 * Paramètres :
 *   initialCases : grille de départ (non modifiée)
 *   hs           : heuristiques à activer
 *   move         : move initial optionnel à appliquer avant de démarrer
 *   keep         : cache de mémoïsation (optimise les positions répétées)
 *
 * Retourne :
 *   isValid : true si la grille est restée cohérente jusqu'à la fin
 *   flow    : nombre total de moves effectués
 *   steps   : tableau de tableaux de moves ([[move_iter1...], [move_iter2...], ...])
 *   moves   : steps.flat() (liste plate de tous les moves — raccourci pratique)
 *   cases   : grille résultante
 *
 * Algorithme :
 *   1. Valide la grille initiale.
 *   2. Remplit les annotations manquantes.
 *   3. Si un move initial est fourni, l'applique et revérifie.
 *   4. Consulte le cache (keep.get) pour éviter le recalcul.
 *   5. Boucle : calcule les déductions, les applique, revérifie, met à jour le cache.
 *
 * @param {Array<Array>}     initialCases
 * @param {object}           [hs]
 * @param {string|null}      [move=null]
 * @param {GridStateCache|null} [keep=null]
 * @returns {{ isValid: boolean, flow: number, steps: string[][], moves: string[], cases: Array<Array> }}
 */
function simpleFill(
  initialCases,
  hs = { selfSufficientSingle: true, exclusiveSingle: true },
  move = null,
  keep = null
) {
  // Helper : ajoute le move initial aux stats si fourni
  const retAddingMove = (move, r) => {
    if (move) { r.flow++; r.steps = [[move], ...r.steps] }
    r.moves = r.steps.flat() // ← raccourci flat exposé aux consommateurs
    return r
  }

  if (!gridIsValid(initialCases)) {
    return { isValid: false, flow: 0, steps: [], moves: [], cases: initialCases }
  }

  let cases = deepCopyCases(initialCases)
  fillAnnotations(cases)

  if (!gridIsValid(cases)) {
    return { isValid: false, flow: 0, steps: [], moves: [], cases }
  }

  if (move) {
    fillCase(cases, move)
    let isValid = gridIsValid(cases)
    if (isValid) { fillAnnotations(cases); isValid = gridIsValid(cases) }
    if (!isValid) {
      return retAddingMove(move, { isValid: false, flow: 1, steps: [[move]], cases })
    }
  }

  if (keep) {
    const r = keep.get(cases, hs)
    if (r) return retAddingMove(move, r)
  }

  let isValid    = true
  const fromCases = deepCopyCases(cases)
  const from      = [{ from: fromCases, isValid, flow: 0, steps: [], cases: fromCases }]

  while (isValid) {
    if (keep) {
      const r = keep.get(cases, hs)
      if (r) {
        let o
        for (const f of [...from].reverse()) {
          o = { isValid: r.isValid, flow: f.flow + r.flow, steps: [...f.steps, ...r.steps], cases: r.cases }
          if (o.flow) keep.set(f.from, hs, o)
        }
        return retAddingMove(move, o)
      }
    }

    const toFill = deductionMoves(cases, hs, keep)
    if (!toFill.length) break

    for (let f = 0; f < toFill.length; ++f) fillCase(cases, toFill[f])
    isValid = gridIsValid(cases)
    if (isValid) { fillAnnotations(cases); isValid = gridIsValid(cases) }

    let o
    for (const f of [...from].reverse()) {
      f.isValid = isValid
      f.flow    += toFill.length
      f.steps.push(toFill)
      f.cases = cases
      o = { isValid, flow: f.flow, steps: f.steps, cases }
      if (!isValid && keep) keep.set(f.from, hs, o)
    }
    if (!isValid) return retAddingMove(move, o)

    if (keep) {
      const casesCopy = deepCopyCases(cases)
      from.push({ from: casesCopy, isValid, flow: 0, steps: [], cases: casesCopy })
    }
  }

  // Plus de déductions possibles et grille toujours valide
  let o
  for (const f of [...from].reverse()) {
    o = { isValid, flow: f.flow, steps: f.steps, cases }
    if (keep && f.flow) keep.set(f.from, hs, o)
  }
  return retAddingMove(move, o)
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS (ES Module — remplace module.exports = { ... })
// ─────────────────────────────────────────────────────────────────────────────
export {
  // Copie & clé d'état
  deepCopyCases,
  generateGridKey,
  // Cache
  GridStateCache,
  // Validité
  gridIsValid,
  gridIsComplete,
  candidateIsValid,
  caseIsValid,
  // Heuristiques exposées publiquement
  selfSufficientSubsets,
  isFalsifiedBySingleDigitChain,
  falsifiedsBySingleDigitChain,
  // Chaînes de contradiction
  findShortestContradictionChainForMove,
  findShortestContradictionChainForSteps,
  // Orchestration
  deductions,
  deductionMovesFromMap,
  deductionMoves,
  // Remplissage
  fillCase,
  fillAnnotations,
  simpleFill,
}
