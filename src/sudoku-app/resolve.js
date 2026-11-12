// resolve.js

// Types pour la documentation
/**
 * @typedef  {Object     } Cell
 * @property {boolean    } given
 * @property {boolean    } found
 * @property {number     } value
 * @property {Set<number>} annots - annotations positives ou négatives
 *
 * @typedef  {Object  } Grid
 * @property {Cell[][]} cells - grille 9x9
 *
 * @typedef  {Object          } Heuristics
 * @property {boolean         } selfSufficientSingle
 * @property {boolean         } exclusiveSingle
 * @property {boolean         } selfSufficientSubset
 * @property {boolean         } falsifiedBySingleDigitChain
 * @property {boolean         } consensusElimination
 * @property {boolean         } falsifiedByChain
 * @property {Set<number>|null} limitedAnnots
 */

function deepCopyCases(cases) {
  return cases.map(row => row.map(cell => ({
    i: cell.i,
    j: cell.j,
    given: cell.given,
    found: cell.found,
    annots: new Set(cell.annots) })))}

// Heuristiques - Techniques de résolution

function addToMap(map, move, obj) {
  const k = move.slice(1)
  if (map.has(k)) map.get(k).push(obj)
  else map.set(k, [obj]) }

function moveInverted(move) {
  return (move[0] === '+' ? '-' : '+') + move.slice(1) }

function combinations(arr, k) {
  // Génère toutes les combinaisons de taille k parmi arr
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [first, ...rest] = arr
  const withFirst = combinations(rest, k - 1).map(comb => [first, ...comb])
  const withoutFirst = combinations(rest, k)
  return withFirst.concat(withoutFirst) }

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

/**
 * Génère une clé unique pour identifier l'état de la grille
 * On a une grille à laquelle on applique hs, ce qui conduit à targetCases
 * On calcule foundCount le nombre de found de grid
 * Puis la clé stateKey qui représente la grille = heuristics[limitedAnnots] et pour tout (i,j) not given=>found|[négatifs]
 * Si targetCases est donné, on calcule diffKey = les changements entre grid et targetCases
 * diffKey ne contient que les cases de grid qui ne sont ni given, ni found et dont on a gardé les negs dans k
 * si la case n'a pas changé, on met =, si elle a été trouvée, on met le found,
 * sinon on met entre crochets les negs de la case qui n'étaient pas dans grid (les nouveaux negs trouvés)
 * @param {Grid       } grid
 * @param {Heuristics } heuristics
 * @param {Grid | null} targetCases - État cible pour la comparaison
 * @returns {{count: number, stateKey: string, diffKey: string}}
 */
function generateGridKey(grid, heuristics, targetCases = null) {
  let foundCount = 0
  // Construction de la clé d'état des heuristiques
  const order = [
    'selfSufficientSingle','exclusiveSingle','selfSufficientSubset',
    'falsifiedBySingleDigitChain','consensusElimination','falsifiedByChain' ]
  let stateKey = order.map(h => heuristics[h] ? '1' : '0').join('')
  if (heuristics.limitedAnnots) {
    stateKey += `[${Array.from(heuristics.limitedAnnots).sort().join('')}]` }
  stateKey += ':'
  let diffKey = ''
  for (let row = 0; row < 9; row++) for (let col = 0; col < 9; col++) {
    const cell = grid[row][col]
    if (cell.given) continue
    if (cell.found) {
      foundCount++
      stateKey += cell.found
      continue }
    const negs = DIGITS.filter(n => cell.annots.has(-n))
    stateKey += `[${negs.join('')}]`
    // Construction de la clé de différence si targetCases fourni et la case initiale n'est ni given ni found
    if (targetCases) {
      const targetCell = targetCases[row][col]
      if (targetCell.found) diffKey += targetCell.found
      else { // Annotations qui ont été éliminées
        let moreNegs = ''
        for (const n of DIGITS) {
          if (targetCell.annots.has(-n) && !cell.annots.has(-n)) moreNegs += n }
        diffKey += moreNegs.length ? `[${moreNegs}]` : '=' }
      }}
  return { foundCount, stateKey, diffKey } }

/**
 * Classe pour gérer le cache des états de grille
 */
class GridStateCache {
  constructor() { this.cache = new Map(); this._successCount = 0; this._previousSuccessCount = 0 }
  /**
   * Récupère un état depuis le cache
   * @param {Grid      } grid
   * @param {Heuristics} heuristics
   * @returns {CachedResult|null}
   */
  get(grid, heuristics) {
    const { foundCount, stateKey } = generateGridKey(grid, heuristics)
    const cached = this.cache.get(foundCount)?.get(stateKey)
    if (!cached) return null
    this._successCount++
    return new CachedResult(cached, grid) }
  success() {
    const fromLast = this._successCount - this._previousSuccessCount
    this._previousSuccessCount = this._successCount
    const size = Array.from(this.cache.keys()).map(k => this.cache.get(k).size).reduce((a, b) => a + b, 0)
    return {fromLast, fromBegin: this._successCount, size } }
  /**
   * Stocke un état dans le cache
   * dans result, cases sont les cases obtenues, en appliquant flow steps, isValid si le résultat est valide
   * @param {Grid      } grid
   * @param {Heuristics} heuristics
   * @param {Object    } result     // {isValid, flow, steps, cases}, c'est le résultat de l'application de hs sur grid
   * @param {boolean   } cleanBelow // permet de supprimer toutes les grilles avec moins de found
   */
  set(grid, heuristics, result, cleanBelow = false) {
    const {isValid, flow, steps, cases} = result
    const { foundCount, stateKey, diffKey } = generateGridKey(grid, heuristics, isValid ? cases : null)
    if (!this.cache.has(foundCount)) this.cache.set(foundCount, new Map())
    const cacheValue = `${isValid?1:0}${flow}:${steps.map(s => s.join('')).join('|')}:${diffKey}` // Si non valide, diffKey est vide
    this.cache.get(foundCount).set(stateKey, cacheValue)
    if (cleanBelow) { // Nettoie les entrées avec moins de cases trouvées
      for (let i = 0; i < foundCount; i++) this.cache.delete(i) }}}
class CachedResult {
  constructor(cached, originalGrid) {
    this._cached = cached
    this._originalGrid = deepCopyCases(originalGrid)
    const validFlow = cached.split(':')[0]
    this.isValid = validFlow[0] === '1'
    this.flow = parseInt(validFlow.slice(1))
    this._steps = undefined
    this._cases = undefined }
  get steps() {
    if (this._steps === undefined) {
      const stepsStr = this._cached.split(':')[1] || ''
      this._steps = stepsStr.split('|').map(s => s.match(/([+-]\d{3})/g) || []) }
    return this._steps }
  get cases() {
    if (this._cases === undefined) {
      this._cases = this._originalGrid
      const casesStr = this._cached.split(':')[2] || ''
      if (!casesStr) return this._cases
      const parts = casesStr.match(/=|\d|\[\d*\]/g)
      if (!parts) return this._cases
      let row = 0, col = -1
      for (const part of parts) {
        // Avance jusqu'à la prochaine case not found
        if (++col === 9) { col = 0; row++ }
        while (row < 9 && (this._cases[row][col].found)) {
          if (++col === 9) { col = 0; row++ }}
        if (row === 9) break
        const cell = this._cases[row][col]
        if (part === '=') continue
        if (part.startsWith('[') && part.endsWith(']')) {
          // Annotations négatives trouvées
          const annots = part.slice(1, -1).split('').map(Number)
          for (const n of annots) {
            cell.annots.add(-n)
            cell.annots.delete(n)
            cell.annots.delete(10+n) }}
        else cell.found = parseInt(part) }}
    return this._cases }}

////////// Heuristique: SelfSufficientSingle //////////

/**
 * Renvoie si une case n'a qu'une hypothèse possible
 *   - la case ne doit pas être remplie
 *   - il faut que ses annotations contiennent 8 négatifs,
 *   - alors le neuvième chiffre (celui qui n'est pas en négatif ie absent ou positif) est proposé pour remplir la case,
 *   - à condition que ce neuvième chiffre ne lève pas un conflit.
 * Autre appelation : candidat unique, singleton nu, naked single
 * @param {Array<Array>} cases         - Grille 9x9 de cases
 * @param {number}       i             - Ligne de la case
 * @param {number}       j             - Colonne de la case
 * @param {Set<number>}  limitedAnnots - Si on se limite à certains chiffres
 * @returns {number}                   - Le candidat unique, ou 0 sinon
 */
function isSelfSufficientSingle(cases, i, j, limitedAnnots=null) {
  const cell = cases[i][j]
  if (cell.found !== 0) return 0
  let negatives = 0;
  for (const n of cell.annots) { if (-9<=n && n<=-1) negatives++ }
  if (negatives === 8) {
    const allDigits = limitedAnnots ? limitedAnnots : [1,2,3,4,5,6,7,8,9]
    for (const digit of allDigits) {
      if (!cell.annots.has(-digit)) {
        return candidateIsValid(cases, i, j, digit) ? digit : 0 }}}
  return 0 }

function selfSufficientSingles(cases, limitedAnnots=null) {
  const result = new Map()
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const num = isSelfSufficientSingle(cases, i, j, limitedAnnots)
      if (num) {
        const m = `+${i}${j}${num}`
        addToMap(result, m, {h: 'SelfSufficientSingle', m}) }}}
  return result }

////////// Heuristique: SelfSufficientSubset //////////

/**
 * Recherche les chiffres à éliminer dans chaque unité (ligne, colonne ou bloc) selon la règle "naked subset".
 * Si n cases dans une unité (bloc, ligne ou colonne) ne contiennent que n candidats possibles,
 * alors ces n candidats peuvent être éliminés des autres cases de l'unité.
 * Autre appelation : paire nue, triple nue, sous-ensemble nu, naked subset
 * @param {Array} unit    - Tableau de 9 cases {i, j, given, found, annots}
 * @param {string} type   - Type d'unité ('block', 'col', 'row')
 * @param {number} index  - Index dans l'unité
 * @param {object} result - Objet contenant les résultats {selfSufficientSubsets, flagged}
 * @returns {object}      - result auquel on a rajouté les résultats trouvés pour cette unité
 *   selfSufficientSubsets sont toutes les combinaisons de cells autosuffisantes sous la forme:
 *   combo = [{idx,i,j,nonnegs:Set}]
 *   flag = {i, j, n, combos:[combo]}
 *   subset = {type, index, combo, nonnegsUnion:Set, flagged:[flag]}
 *     avec les flagged spécifique au combo (éventuellement aucun)
 *     mais pour tout flag de subset.flagged, flag.combos contient subset.combo
 *   flagged est un tableau de flag pour chaque annotation non neg que l'on peut neg
 *     avec le ou les combos qui permettent cette élimination
 */
function selfSufficientSubsetsInUnit(unit, type, index, result) {
  // les cells sont les cases non remplies avec au moins une annotation non négative {idx, i, j, nonnegs}
  let cells = unit
    .map((c, idx) => {
      if (c.found) return null
      // nonnegs : Tous les chiffres de 1 à 9 SAUF ceux marqués négativement dans annots
      const nonnegs = []
      for (let n = 1; n <= 9; n++) if (!c.annots.has(-n)) nonnegs.push(n)
      return nonnegs.length ? { idx, i: c.i, j: c.j, nonnegs } : null })
    .filter(Boolean)
  // on regarde toutes les combinaisons avec au moins 1 cell et au plus cells.length-1 cells
  for (let n = 1; n <= cells.length-1; ++n) {
    const combos = combinations(cells, n)
    for (const combo of combos) {
      const nonnegsUnion = new Set()
      combo.forEach(c => c.nonnegs.forEach(p => nonnegsUnion.add(p)))
      if (nonnegsUnion.size !== n) continue
      let good = {type, index, combo, nonnegsUnion, flagged: []}
      result.selfSufficientSubsets.push(good)
      for (let i = 0; i < 9; ++i) {
        const c = unit[i]
        // si la case est remplie ou dans le combo, on passe
        if (c.found || combo.some(c => c.idx === i)) continue
        // pour une case qui n'est pas dans le combo, on flag tous les non négatifs
        for (const num of nonnegsUnion) {
          if (!c.annots.has(-num)) {
            let flag = result.flagged.find(f => f.i === c.i && f.j === c.j && f.n === num)
            if (flag) flag.combos.push(combo)
            else result.flagged.push(flag = { i: c.i, j: c.j, n: num, combos: [combo] })
            good.flagged.push(flag) }}}}}
  return result }

/**
 * Applique selfSufficientSubsetsInUnit à chaque bloc, ligne ou colonne d'une grille.
 * @param {Array<Array>} cases - Grille 9x9 de cases {i,j,given,found,annots}
 * @returns false | {selfSufficientSubsets, flagged} - Les combos qui marchent et les annoations à négatifier
 */
function selfSufficientSubsets(cases) {
  // Utilise .gridUnitsMap pour appliquer selfSufficientSubsetsInUnit et enrichir le résultat
  const map = new Map()
  let result = {selfSufficientSubsets: [], flagged: [], map}
  cases.gridUnitsMap((unit, type, index) => {
    result = selfSufficientSubsetsInUnit(unit, type, index, result) })
  //console.log(`selfSufficientSubsets: ${result.selfSufficientSubsets.length} combos trouvés, ${result.flagged.length} annotations à négatifier`)
  for (const flag of result.flagged) { // flag = {i, j, n, combos:[combo]}, combo = [{idx,i,j,nonnegs:Set}]
    const m = `-${flag.i}${flag.j}${flag.n}`
    addToMap(map, m, {h: 'SelfSufficientSubset:flag', m})}
  for (const subset of result.selfSufficientSubsets) { // les cells des subsets qui flag au moins une fois
    if (subset.flagged.length > 0) {
      for (const cell of subset.combo) {
        addToMap(map, ` ${cell.i}${cell.j}0`, {h: 'SelfSufficientSubset'}) }}}
  return result }

////////// Heuristique: ExclusiveSingle //////////

/**
 * Renvoie true si l'annotation 'n' (posée ou absente mais pas neg) d'une case (i,j) non répondue et qui ne provoque pas de conflit,
 * est unique pour au moins une unité (bloc, ligne ou colonne) de la case (i,j)
 * Autre appelation : candidat caché, singleton caché, hidden single, exclusive single
 * @param {Array<Array>} cases - Grille 9x9 de cases
 * @param {number}       i     - Ligne de la case
 * @param {number}       j     - Colonne de la case
 * @param {number}       n     - Candidat à tester
 * @returns {boolean}
 */
function isExclusiveSingle(cases, i, j, n) {
  const cell = cases[i][j]
  if (cell.found !== 0 || !candidateIsValid(cases, i, j, n) || cell.annots.has(-n)) return false
  function digitIsNotPossible(c, n) {
    return (c.found > 0 && c.found !== n) || (c.found === 0 && c.annots.has(-n)) }
  const types = cases[i][j].caseUnitsMap(cases, (unit, type, index) => {
    let negs = 0
    for (const c of unit) {
      if (c.i === i && c.j === j) continue
      if (digitIsNotPossible(c, n)) negs++ }
    return negs === 8 ? type : false })
  // nb est ['block', 'col'...] autant de fois qu'il y a d'unités pour laquelle l'annotation est unique dans l'unité
  //if (nb.length > 0) console.log(`${i} ${j} ${n} est seule ${nb}`)
  return types.length > 0 ? types : false }

// Remarque: si plus d'un exclusive single sur une case, la grille n'est pas valide
function exclusiveSingles(cases, limitedAnnots=null) {
  const result = new Map()
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const allDigits = limitedAnnots ? limitedAnnots : [1,2,3,4,5,6,7,8,9]
      for (let n of allDigits) {
        const types = isExclusiveSingle(cases, i, j, n)
        if (types) {
          const m = `+${i}${j}${n}`
          addToMap(result, m, {h: 'ExclusiveSingle', m, types}) }}}}
  return result }

////////// Heuristique: unitsIntersection //////////

function unitsIntersection(cases) {
  const result = new Map()
  const LB = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => Array(3).fill(0)))
  const CB = Array.from({ length: 9 }, () => Array.from({ length: 3 }, () => Array(9).fill(0)))
  for (let r = 0; r < 9; r++) {                                 // 0,0 0 1 2
    for (let c = 0; c < 9; c++) {                               // 0,1 0 1 2
      const cell = cases[r][c]                                  // 0,2 0 1 2
      for (let n = 1; n <= 9; n++) {                            // 1,0 0 1 2
        if (!cell.found && !cell.annots.has(-n)) { // n est candidat           // 1,1 0 1 2
          LB[n-1][r][Math.floor(c/3)]++                         // 1,2 0 1 2
          CB[n-1][Math.floor(r/3)][c]++ }}}}
  function goodIntersection(a, b, c) { return a && !b && !c ? 0 : !a && b && !c ? 1 : !a && !b && c ? 2 : -1 }
  function eliminateParts(r1, c1, r2, c2, type, n) { // type: col | row
    function eliminatePart(r, c, type, n) {
      for (let i = 0; i < 3; i++) {
        const cell = type=='col' ? cases[r][c*3+i] : cases[r*3+i][c]
        if (!cell.found && !cell.annots.has(-n)) {
          const m = `-${cell.i}${cell.j}${n}`
          addToMap(result, m, {h: 'ExclusiveIntersection', m}) }}}
    eliminatePart(r1, c1, type, n)
    eliminatePart(r2, c2, type, n) }
  for (let n = 0; n < 9; n++) {
    for (let b = 0; b < 3; b++) {
      for (let i = 0; i < 3; i++) {
        const u = 3*b+i
        const cc = goodIntersection(LB[n][u][0], LB[n][u][1], LB[n][u][2])
        const ll = goodIntersection(CB[n][0][u], CB[n][1][u], CB[n][2][u])
        if (cc !== -1) eliminateParts(3*b+(i==0?1:0), cc, 3*b+(i==2?1:2), cc, 'col', n+1) // elimine ligne 3*b, 3*b+1, 3*b+2 sauf 3*b+i, colonne cc (3*cc+0, 3*cc+1, 3*cc+2)
        if (ll !== -1) eliminateParts(ll, 3*b+(i==0?1:0), ll, 3*b+(i==2?1:2), 'row', n+1) // elimine ligne ll (3*ll+0, 3*ll+1, 3*ll+2), colonne 3*b, 3*b+1, 3*b+2 sauf 3*b+i
        const l = goodIntersection(LB[n][3*b][i], LB[n][3*b+1][i], LB[n][3*b+2][i])
        const c = goodIntersection(CB[n][i][3*b], CB[n][i][3*b+1], CB[n][i][3*b+2])
        if (l !== -1) eliminateParts(3*b+l, (i==0?1:0), 3*b+l, (i==2?1:2), 'col', n+1)   // elimine ligne   3*b+l, colonne 0, 1, 2 sauf i
        if (c !== -1) eliminateParts((i==0?1:0), 3*b+c, (i==2?1:2), 3*b+c, 'row', n+1)   // elimine colonne 3*b+l, ligne   0, 1, 2 sauf i
        }}}
  return result }

////////// Heuristique: FalsifiedBySingleDigitChain //////////

/**
 * Vérifie si un candidat n mène à une contradiction par une chaîne de déductions limitée à ce même candidat
 * Le candidat doit être non negatif sur la case et la case non trouvée
 * La chaine se limite aux selfSufficientSingles en n et aux exclusiveSingles en n
 * autres noms : Nishio, Digit Forcing Chain (DFC), chaîne de forçage mono-chiffre, ou “contradiction sur un seul chiffre"
 * @param {Array<Array>} cases - Grille 9x9 de cases {i,j,given,found,annots}
 * @param {number}       i     - Ligne de la case
 * @param {number}       j     - Colonne de la case
 * @param {number}       n     - Candidat à tester
 * @returns {boolean | object} - false si valid, sinon {isValid:false, flow}
 */
function isFalsifiedBySingleDigitChain(cases, i, j, n, keep=null) {
  let cell = cases[i][j]
  if (cell.found || cell.annots.has(-n)) return false
  const move = `+${i}${j}${n}`
  const hs = {selfSufficientSingle: true, exclusiveSingle: true, limitedAnnots: new Set([n])}
  return !simpleFill(cases, hs, move, keep).isValid }

function falsifiedsBySingleDigitChain(cases, keep) {
  const result = new Map()
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      for (let n = 1; n <= 9; n++) {
        if (isFalsifiedBySingleDigitChain(cases, i, j, n, keep)) {
          const m = `-${i}${j}${n}`
          addToMap(result, m, {h: 'FalsifiedBySingleDigitChain', m}) }}}}
  return result }

////////// Heuristique: FalsifiedByChain //////////

/**
 * Vérifie si un candidat n = m ou n = -m (m>0) mène à une contradiction en utilisant une chaîne de déductions limitée aux heuristiques
 * La case ne doit pas être trouvée et ne dois pas contenir -m = -abs(n)
 * Si n =  m, on teste si fill de m conduit à une contradiction
 * Si n = -m, on teste si annotNeg de m mène à une contradiction
 * @param {Array<Array>} cases - Grille 9x9 de cases {i,j,given,found,annots}
 * @param {number}       i     - Ligne de la case
 * @param {number}       j     - Colonne de la case
 * @param {number}       n     - Candidat à tester
 * @param {object}       hs    - heuristiques autorisées
 * @returns {boolean | object} - false si valid, sinon {isValid:false, flow}
 */
function isFalsifiedByChain(cases, i, j, n, hs={selfSufficientSingle: true, exclusiveSingle: true}, keep=null) {
  let cell = cases[i][j]
  const m = Math.abs(n)
  if (cell.found || cell.annots.has(-m)) return false
  const move = `${(n>0?'+':'-')}${i}${j}${m}`
  const r = simpleFill(cases, hs, move, keep)
  return r.isValid ? false : r }

/**
 * Trouve le nombre minimum de coups pour atteindre une contradiction
 * @param {object[][]} initialCases - grille de départ
 * @param {object}     initialMove  - le coup à jouer move: [+-]ijv
 * @param {number}     maxMoves     - le nombre maximum de coups à jouer
 * @returns {object[] | null}       - le tableau des moves menant à une contradiction ou null
 */
function findShortestContradictionChainForMove(initialCases, hs, initialMove, maxMoves=Infinity) {
  if (!gridIsValid(initialCases)) return []
  const queue = []          // --- File d'attente pour le BFS ---
  const visited = new Set() // --- Ensemble pour mémoriser les combinaisons de mouvements déjà visitées ---
  function movesKey(moves) { return moves.sort().join('') } // Attention, sort trie sur place donc modifie moves
  function oneStep(cases, move, moves, visited, queue) {
    const newMoves = [...moves, move]
    const newKey = movesKey(newMoves)
    if (visited.has(newKey)) return null
    visited.add(newKey)
    const newCases = deepCopyCases(cases)
    fillCase(newCases, move)
    fillAnnotations(newCases)
    const valid = gridIsValid(newCases)
    const r = {valid, cases: newCases, moves: newMoves}
    if (valid && queue && newMoves.length < maxMoves) queue.push(r)
    return r }
  const step = oneStep(initialCases, initialMove, [], visited, queue)
  if (step && !step.valid) return step.moves
  while (queue.length > 0) {
    const { cases, moves } = queue.shift()
    const toFill = deductionMoves(cases, hs).filter(m => !visited.has(movesKey([...moves,m])))
    for (const m of toFill) {
      const step = oneStep(cases, m, moves, visited, queue)
      if (step && !step.valid) return step.moves }}
  return null }

/**
 * Trouve le nombre minimum de coups pour atteindre une contradiction
 * parmi tous les moves des steps
 * @param {object[][]} initialCases - grille de départ
 * @param {object}     hs           - heuristiques autorisées
 * @param {object[]}   steps        - les étapes [[move]] qui conduisent à false
 * @param {number}     maxMoves     - le nombre maximum de moves autorisés
 * @returns {object[] | null}       - le tableau des moves menant à une contradiction ou null
 */
function findShortestContradictionChainForSteps(initialCases, hs, steps, maxMoves=Infinity) {
  // prendre tous les moves des steps et supprimer les inutiles
  //console.log('findShortestContradictionChainForSteps', steps)
  const moves = filterUselessMoves(steps.flat())
  return moves
  // rechercher tous les sous-ensembles de moves qui conduisent à une contradiction, ordonnés par taille
  // On ne teste que les sous-ensembles qui ne contiennent pas déjà un sous-ensemble menant à une contradiction
  const minimalSubsets = []
  // Fonction utilitaire pour vérifier si un (sur-)ensemble contient tous les éléments d'un autre ensemble
  function containsAll(superset, subset) {
    return subset.every(sub => superset.includes(sub) )}
  // Parcourir les tailles de sous-ensembles de 1 à maxMoves
  for (let size = 1; size <= Math.min(moves.length, maxMoves); size++) {
    const subsets = combinations(moves, size)
    for (const subset of subsets) {
      // Vérifier si ce sous-ensemble contient déjà un sous-ensemble menant à une contradiction
      const hasSmallerContradiction = minimalSubsets.some(
        minSubset => minSubset.length < subset.length && containsAll(subset, minSubset) )
      if (!hasSmallerContradiction) {
        const testCases = deepCopyCases(initialCases)
        // Appliquer tous les mouvements du sous-ensemble
        for (const move of subset) fillCase(testCases, move)
        // Vérifier la validité
        fillAnnotations(testCases, '-')
        if (!gridIsValid(testCases)) {
          minimalSubsets.push(subset)
          return subset }}}}
  console.log('findShortestContradictionChainForSteps', minimalSubsets.length)
  return minimalSubsets.length > 0 ? minimalSubsets[0] : null }

function falsifiedsByChain(cases, hs={selfSufficientSingle: true, exclusiveSingle: true}, findShortest=false, keep=null) {
  const result = new Map()
  if (!gridIsValid(cases)) return result
  //console.log('falsifiedsByChain', hs)
  const falseCandidates = []
  const hsCount = Object.keys(hs).length
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const cell = cases[i][j]
      if (cell.found !== 0) continue
      for (let n = 1; n <= 9; n++) {
        if (cell.annots.has(-n)) continue
        // Testing both +n (fill) and -n (annotNeg)
        const moves = new Map([[n, `+${i}${j}${n}`],[-n, `-${i}${j}${n}`]]) // les moves testés
        for (const [key, move] of moves) {
          const r = isFalsifiedByChain(cases, i, j, key, hs, keep)
          if (r) {
            if (findShortest) falseCandidates.push({ move, flow: r.flow, steps: r.steps })
            const m = moveInverted(move)
            addToMap(result, m, {h: `FalsifiedByChain${hsCount}:${move[0]}`, m, steps: r.steps}) }}}}}
  if (findShortest && falseCandidates.length) {
    //console.log('falsifiedsByChain falseCandidates', falseCandidates)
    // 2. Trier par nombre de flow (du plus petit au plus grand)
    falseCandidates.sort((a, b) => a.steps.length - b.steps.length || a.flow - b.flow)
    // 3. Pour chaque candidat, chercher la chaîne la plus courte
    let bestMove = null, bestChain = null
    for (const { move, steps } of falseCandidates) {
      //console.log(`falsifiedsByChain move ${move}`, steps)
      const chain = findShortestContradictionChainForSteps(cases, hs, steps, bestChain ? bestChain.length-1 : Infinity)
      if (chain && (!bestChain || chain.length < bestChain.length)) {
        bestMove = move
        bestChain = chain
      // Si on trouve une chaîne de longueur 1, c'est le meilleur cas possible
      if (bestChain.length === 1) break }}
    //console.log('falsifiedsByChain bestChain', bestChain)
    if (bestChain) {
      const m = moveInverted(bestMove)
      addToMap(result, m, {h: 'FalsifiedByChain:shortest', m, chain: bestChain}) }}
  return result }

/**
 * Heuristique qui analyse les annotations restantes après application de chaque move
 * et déduit les annotations impossibles (à éliminer)
 * soit ms un ensemble de moves, et hs un ensemble d'heuristiques, cette heuristique fait un simpleFill sur tous les moves.
 * Pour chaque case non trouvé initialement, elle fait l'union des hypothèses restantes pour chaque move.
 * Si cette union est plus petite que les annots nonnegs de départ, elle déduit que les annots de la différences sont à éliminer.
 * @param {Array<Array>} cases - Grille 9x9 de cases
 * @param {Array}        moves - Tableau de moves à tester
 * @param {object}       hs    - heuristiques autorisées
 * @returns {Map} - Le dict des déductions
 */
function consensusEliminationsForMoves(initialCases, moves, hs, falsifieds, result, keep=null) {
  if (moves.some(m => falsifieds.has(m))) return result // si un move est déjà falsifié, on ne fait rien
  if (moves.length === 1) {
    const m = moves[0]
    //addToMap(result, m, {h: 'ConsensusElimination:alone', m, from: moves})
    }
  const cases = deepCopyCases(initialCases)
  const initialPossibles = new Map() // Pour stocker les annotations initiales
  // 1. Stocker les annotations initiales pour chaque case non trouvée
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const cell = cases[i][j]
      if (!cell.found) {
        const possibles = new Set()
        for (let n = 1; n <= 9; n++) if (!cell.annots.has(-n)) possibles.add(n)
        initialPossibles.set(`${i},${j}`, possibles) }}}
  // 2. Pour chaque case, collecter les annotations possibles après chaque move
  const afterPossibles = new Map()
  let falsifiedsLocal = 0
  for (const move of moves) {
    const {isValid, cases: moveCases} = simpleFill(cases, hs, move, keep)
    if (!isValid) {
      const m = moveInverted(move)
      addToMap(result, m, {h: 'ConsensusElimination:falsified', m, from: moves})
      falsifiedsLocal++
      falsifieds.add(move)
      continue }
    // Mettre à jour les annotations possibles pour chaque case
    if (!falsifiedsLocal) for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      const key = `${i},${j}`
      if (initialPossibles.has(key)) { // n'était pas found au départ
        const cell = moveCases[i][j]
        if (!afterPossibles.has(key)) afterPossibles.set(key, new Set())
        const possibles = afterPossibles.get(key)
        if (cell.found) possibles.add(cell.found)
        else {
          for (let n = 1; n <= 9; n++) if (!cell.annots.has(-n)) possibles.add(n) }}}}
  // 3. Comparer avec les possibles initiaux
  if (!falsifiedsLocal) for (const [key, possibles0] of initialPossibles.entries()) {
    const [i, j] = key.split(',').map(Number)
    const possibles1 = afterPossibles.get(key) || new Set()
    // Si on a moins d'annotations possibles qu'initialement
    if (possibles1.size < possibles0.size) {
      // Les annotations à éliminer sont celles qui ne sont plus possibles
      for (const n of possibles0) {
        if (!possibles1.has(n)) {
          const m = `-${i}${j}${n}`
          addToMap(result, m, {h: 'ConsensusElimination', m, from: moves})
          }}}}
  return result }

function consensusEliminations(cases, hs, keep=null) {
  // Les c, -c pour tous les possibles de chaque case
  // Dans une case, tous les possibles
  // Dans une unité, pour chaque n qui apparaît plus d'une fois, les n de chaque case
  // Si l'un d'entre eux est invalide, on en déduit que son opposé est valide.
  // Le seul qui peut faire un fill est si un -c est invalide.
  // Tous les autres cas donnent un annotNeg.
  const result = new Map()
  const ordered = [2,1,3,4,5,6,7,8,9]
  const toBeTested = new Map(ordered.map(n => [n, []]))
  const falsifieds = new Set()
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const cell = cases[i][j]
      if (cell.found) continue
      const possibles = []
      for (let n = 1; n <= 9; n++) if (!cell.annots.has(-n)) {
        const plus = `+${i}${j}${n}`
        toBeTested.get(1).push([plus, `-${i}${j}${n}`]) // les +/- de tous les candidats de toutes les cellules (testés après les 2)
        possibles.push(plus) }
      if (possibles.length > 1) toBeTested.get(possibles.length).push(possibles) }} // les candidats de chaque case (avec plus d'un candidat)
  //console.log(`consensusEliminations 1 (${keep.cache.size}) (${result.size}):\n` + Array.from(result.entries()).map(([k, v]) => `  ${k}: ${v[0].h} ${JSON.stringify(v[0].m)}`).join('\n'))
  cases.gridUnitsMap((unit) => {
    // Créer une map pour regrouper les candidats par valeur
    const moves4Possible = new Map()
    // Récupérer toutes les cases des possibles de l'unité
    for (const cell of unit) {
      if (cell.found) continue
      for (let n = 1; n <= 9; n++) {
        if (!cell.annots.has(-n)) {
          const move = `+${cell.i}${cell.j}${n}`
          if (!moves4Possible.has(n)) moves4Possible.set(n, [])
          moves4Possible.get(n).push(move) }}}
    // Pour chaque possible avec plusieurs cases dans l'unité, appliquer consensusEliminationsForMoves
    for (const moves of moves4Possible.values()) {
      if (moves.length > 1) toBeTested.get(moves.length).push(moves) }})
  for (const c of ordered) {
    for (const moves of toBeTested.get(c)) consensusEliminationsForMoves(cases, moves, hs, falsifieds, result, keep)
    if (result.size) break }
  //console.log(`consensusEliminations (${keep.cache.size}) (${result.size})`)
  //console.log(`consensusEliminations 2 (${keep.cache.size}) (${result.size}):\n` + Array.from(result.entries()).map(([k, v]) => `  ${k}: ${v[0].h} ${JSON.stringify(v[0].m)}`).join('\n'))
  //console.log(`consensusEliminationsForMoves result:${result.size}\n${Array.from(result.entries()).map(([k, v]) => `  ${k}: ${v[0].h} ${JSON.stringify(v[0].m)} ${JSON.stringify(v[0].from)}`).join('\n')}`)
  return result }

////////// Deductions of all heuristics //////////

// Si shouldStop est null, pas de yield, juste return result
function* deductions(initialCases, hs={selfSufficientSingle: true, exclusiveSingle: true}, keep=null, shouldStop=() => false) {
  const {selfSufficientSingle, exclusiveSingle, selfSufficientSubset, exclusiveIntersection, falsifiedBySingleDigitChain, consensusElimination, falsifiedByChain} = hs
  const result = new Map()
  const hsForChain2 = {selfSufficientSingle: true, exclusiveSingle: true}
  const hsForChain3 = {selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true}
  const hsForChain4 = {selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true, exclusiveIntersection: true}
  const hsForChain5 = {selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true, exclusiveIntersection: true, falsifiedBySingleDigitChain: true}
  const hsForChain6 = {selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true, exclusiveIntersection: true, falsifiedBySingleDigitChain: true, consensusElimination: true}
  fillAnnotations(initialCases) // on modifie initialCases s'il n'est pas à jour
  const cases = deepCopyCases(initialCases)
  //fillAnnotations(cases)
  if (shouldStop && shouldStop()) return
  function* mergeMaps(sourceMap, h) {
    if (!sourceMap || sourceMap.size === 0) return
    for (const [key, value] of sourceMap.entries()) {
      if (result.has(key)) result.get(key).push(...value)
      else result.set(key, [...value]) }
    // Émettre les nouveaux résultats
    if (shouldStop) yield { type: 'results', newResult: sourceMap, result, h }}

  // Exécuter chaque heuristique et émettre les résultats au fur et à mesure
  if (selfSufficientSingle)                    { if (shouldStop && shouldStop()) return; yield* mergeMaps(selfSufficientSingles       (cases, hs.limitedAnnots), 'selfSufficientSingle') }
  if (exclusiveSingle)                         { if (shouldStop && shouldStop()) return; yield* mergeMaps(exclusiveSingles            (cases, hs.limitedAnnots), 'exclusiveSingle') }
  if (selfSufficientSubset)                    { if (shouldStop && shouldStop()) return; yield* mergeMaps(selfSufficientSubsets       (cases).map, 'selfSufficientSubset') }
  if (exclusiveIntersection)                   { if (shouldStop && shouldStop()) return; yield* mergeMaps(unitsIntersection           (cases), 'exclusiveIntersection') }
  if (falsifiedBySingleDigitChain)             { if (shouldStop && shouldStop()) return; yield* mergeMaps(falsifiedsBySingleDigitChain(cases, keep), 'falsifiedBySingleDigitChain') }
  if (falsifiedByChain) {
    //const hsChain = [hsForChain2, hsForChain3, hsForChain4, hsForChain5]
    const hsChain = [hsForChain2, hsForChain3, hsForChain4, hsForChain5]
    let i = 0
    while (result.size===0 && i < hsChain.length) {
      if (shouldStop && shouldStop()) return
      const h = `falsifiedByChain ${Object.keys(hsChain[i]).length}`
      yield* mergeMaps(falsifiedsByChain(cases, hsChain[i++], true, keep), h) }}
  if (consensusElimination && result.size===0) { if (shouldStop && shouldStop()) return; yield* mergeMaps(consensusEliminations       (cases, hsForChain5, keep), 'consensusElimination') }
  // Émettre les résultats finaux si nécessaire
  if (!shouldStop) return result // -> {value: result, done: true}
  if (result.size > 0) yield { type: 'final', result }
  }

/**
 * Filtre les coups inutiles
 * - Garde tous les mouvements '+'
 * - Ne garde les '-' que pour les cases qui ne seront pas remplies
 * @param {Array} moves - Tableau de coups à filtrer
 * @returns {Array} Tableau de coups filtrés et triés
 */
function filterUselessMoves(moves) {
  if (!moves || moves.length === 0) return []
  const fillMoves = new Set()
  //console.log('filterUselessMoves', moves)
  moves.forEach(m => { if (m[0] === '+') fillMoves.add(m.slice(1,3)) })
  return moves
  .filter(m =>
    m[0] === '+' ||
    (m[0] === '-' && !fillMoves.has(m.slice(1,3))))
  .sort((m1, m2) => m1.slice(1).localeCompare(m2.slice(1))) }

function deductionMovesFromMap(deductionsMap) {
  // On ne retient qu'un move par clé=annot car si la grille est valide, ils sont tous identiques, quelque soit l'heuristique:
  // soit -, soit +
  // FalsifiedByChain:+ et FalsifiedByChain:- ne servent qu'au calcul de FalsifiedByChain:shortest
  if (!deductionsMap) return []
  const moves = Array.from(deductionsMap.values())
    //.map(ds => ds.find(d => d.m && d.h!=='FalsifiedByChain:+' && d.h!=='FalsifiedByChain:-')?.m)
    .map(ds => ds.find(d => d.m)?.m)
    .filter(Boolean)
  return filterUselessMoves(moves) }

function deductionMoves(cases, hs={selfSufficientSingle: true, exclusiveSingle: true}, keep=null) {
  return deductionMovesFromMap(deductions(cases, hs, keep, null).next().value) }

/////// Filling ///////

// fillCase : '+', '?', '-'
// reverseAllowed uniquement pour la saisie
function fillCase(cases, move, fromUser=false) {
  // verifier que move est une chaine de 4 caractères [+-?][0-9][0-9][1-9]
  if (move.length !== 4 || !move.match(/^[+-?][0-9][0-9][1-9]$/)) {
    console.error(`move invalide: ${move} ${move.length} ${move[0]} ${move[1]} ${move[2]} ${move[3]}`)
    throw new Error(`move invalide: ${move} ${move.length} ${move[0]} ${move[1]} ${move[2]} ${move[3]}`) }
  const c = cases[parseInt(move[1])][parseInt(move[2])]
  const n = parseInt(move[3])
  //console.log('fillCase', move, n, c.given ?'G':'')
  if (c.given) return
  const l_calcAnnot = (cases, c, i, j, n) => {
    const v = l_candidateIsValid(cases, c, i, j, n) ? n : -n // on recalcule l'annot
      if (!c.annots.has(v)) { c.annots.delete(-v); c.annots.add(v) }}
  // ajout d'un found
  if (move[0] === '+') {
    const old = c.found
    if (old && (fromUser || old!== n)) { // On rend old possible sur les unités
      c.found = 0
      c.caseUnitsMap(cases, (unit) => {
        unit.forEach(cc => {
          if ((cc.i!==c.i || cc.j!==c.j) && !cc.found && cc.annots.has(-old) && l_candidateIsValid(cases, cc, cc.i, cc.j, old)) {
            cc.annots.delete(-old); cc.annots.delete(-10-old) }})})}
    if (old !== n) { // On pose n et on supprime les annots n des autres cells des mêmes unités
      c.found = n
      c.caseUnitsMap(cases, (unit) => {
        unit.forEach(cc => {
          if ((cc.i!==c.i || cc.j!==c.j) && !cc.found && !cc.annots.has(-n)) {
            cc.annots.delete(n); cc.annots.delete(10+n); cc.annots.add(-n) }})})}
    else if (fromUser) {
      c.found = 0
      for (let m = 1; m <= 9; ++m) { // On recalcule les annots non posées par l'utilisateur
        if (c.annots.has(10+m) || c.annots.has(-10-m)) continue
        l_calcAnnot(cases, c, c.i, c.j, m) }}}
  else if (move[0] === '?' && fromUser) {
    if (!c.annots.has(10+n)) { c.annots.add(10+n); c.annots.add(n); c.annots.delete(-n); c.annots.delete(-10-n) }
    else { c.annots.delete(10+n); l_calcAnnot(cases, c, c.i, c.j, n) }}
  else if (move[0] === '-') {
    if (fromUser) {
      if (!c.annots.has(-10-n)) { c.annots.add(-10-n); c.annots.add(-n); c.annots.delete(n); c.annots.delete(10+n) }
      else { c.annots.delete(-10-n); l_calcAnnot(cases, c, c.i, c.j, n) }}
    else { c.annots.add(-n); c.annots.delete(n); c.annots.delete(10+n) }}}

// Remplit toutes les annotations non remplies en '+' ou '-'
function fillAnnotations(cases) {
  return cases.map((row, i) =>
    row.map((cell, j) => {
      if (cell.found !== 0) return cell
      for (let n = 1; n <= 9; ++n) {
        if (cell.annots.has(n) || cell.annots.has(-n)) continue
        cell.annots.add(candidateIsValid(cases, i, j, n) ? n : -n) }
      return cell }))}

/**
 * Remplit toutes les annotations négatives
 * et applique toutes les règles sélectionnées par l'utilisateur : candidat unique, etc.
 * Retourne {isValid, flow}: si la grille est valide à la fin et le nombre de coups (move) effectués
 * @param {Grid       } cases - Grille 9x9 de cases {found, annots: Set}
 * @param {Heuristics } hs
 *   {boolean} selfSufficientSingle        candidat unique sur une cellule
 *   {boolean} exclusiveSingle             candidat unique sur une unité
 *   {boolean} selfSufficientSubset        sous-ensembles suffisants
 *   {boolean} falsifiedBySingleDigitChain hypothèse fausse sur un candidat
 *   {boolean} consensusElimination        consensusElimination
 *   {boolean} falsifiedByChain            hypothèse fausse la plus courte ou simple
 *   {Set<number>|null} limitedAnnots      Set(n) quand on veut une simple contradiction
 * @param {Move | null} move
 * @param {GridStateCache | null} keep
 * @returns
 */
function simpleFill(initialCases, hs={selfSufficientSingle: true, exclusiveSingle: true}, move=null, keep=null) {
  if (!gridIsValid(initialCases)) {//console.log('simpleFill 1', initialCases);
    return {isValid:false, flow:0, steps:[], cases: initialCases}}
  let cases = deepCopyCases(initialCases)
  fillAnnotations(cases)
  if (!gridIsValid(cases)) {//console.log('simpleFill 2', cases);
    return {isValid:false, flow:0, steps:[], cases}}
  if (move) {
    fillCase(cases, move)
    let isValid = gridIsValid(cases)
    if (isValid) {
      fillAnnotations(cases)
      isValid = gridIsValid(cases) }
    if (!isValid) {//console.log('simpleFill 3', cases);
      return {isValid:false, flow:1, steps:[[move]], cases}}}
  // CachedResult exposes lazy read-only getters. Never mutate a cached result.
  const retAddingMove = (move, r) => move
    ? {isValid: r.isValid, flow: r.flow + 1, steps: [[move], ...r.steps], cases: r.cases}
    : r
  if (keep) {
    const r = keep.get(cases, hs)
    if (r) {//console.log('simpleFill 4', r);
      return retAddingMove(move, r) }}
  let isValid = true
  const fromCases = deepCopyCases(cases)
  const from = [{from:fromCases, isValid, flow:0, steps:[], cases:fromCases}]
  while (isValid) {
    if (keep) {
      const r = keep.get(cases, hs)
      if (r) {
        let o
        for (let f of [...from].reverse()) {
          o = {isValid: r.isValid, flow: f.flow + r.flow, steps: [...f.steps, ...r.steps], cases: r.cases}
          if (o.flow) keep.set(f.from, hs, o) }
        return retAddingMove(move, o) }}
    const toFill = deductionMoves(cases, hs, keep)
    if (!toFill.length) break
    for (let f = 0; f < toFill.length; ++f) fillCase(cases, toFill[f])
    isValid = gridIsValid(cases)
    if (isValid) {
      fillAnnotations(cases)
      isValid = gridIsValid(cases) }
    let o
    for (let f of [...from].reverse()) {
      f.isValid = isValid
      f.flow += toFill.length
      f.steps.push(toFill)
      f.cases = cases
      o = {isValid, flow:f.flow, steps:f.steps, cases}
      // Si isValid, on fera le keep.set plus tard
      if (!isValid && keep) keep.set(f.from, hs, o) }
    if (!isValid) return retAddingMove(move, o)
    if (keep) {
      const casesCopy = deepCopyCases(cases)
      from.push({from:casesCopy, isValid, flow: 0, steps: [], cases:casesCopy}) }}
  // si on arrive là, c'est qu'il n'y a plus de déductions et isValid=true
  let o
  for (let f of [...from].reverse()) {
    o = {isValid, flow:f.flow, steps:f.steps, cases}
    if (keep && f.flow) keep.set(f.from, hs, o) }
  //console.log('simpleFill 7', cases)
  return retAddingMove(move, o) }

/////// isValid pour une cell ou la grille ///////

/*******    candidateIsValid
 * Vérifie s'il y a un conflit pour un chiffre donné dans une case (i,j) non donnée au départ.
 * Quelque soit le chiffre, la case est en conflit si elle n'est pas remplie et contient 9 annots négatives.
 * Le chiffre est en conflit si on le retrouve ailleurs dans la ligne/colonne/bloc de i,j (dans une unité de i,j).
 * @param   {Array<Array>} cases - Grille 9x9 de cases {i, j, given, found, annots}
 * @param   {number}       i     - Ligne de la case
 * @param   {number}       j     - Colonne de la case
 * @param   {number}       num   - Chiffre à vérifier
 * @returns {boolean}            - Faux si le chiffre est en conflit, vrai sinon
 */
function l_candidateIsValid(cases, cell, i, j, num) {
  let valid = true
  cell.caseUnitsMap(cases, (unit) => {
    if (!valid) return
    if (unit.some(c => (c.i !== i || c.j !== j) && c.found === num)) valid = false })
  return valid }
function candidateIsValid(cases, i, j, num) {
  const cell = cases[i][j]
  if (cell.given) return true
  const annots = [...cell.annots].filter(n => -9<=n && n<=9)
  if (cell.found === 0 && annots.length === 9 && annots.every(n => n < 0)) return false
  if (num === 0) return true
  if (num < 0) return true
  return l_candidateIsValid(cases, cell, i, j, num) }

function caseIsValid(cases, cell, log=false) {
  if (cell.found) return candidateIsValid(cases, cell.i, cell.j, cell.found)
  const annots = [...cell.annots].filter(n => -9<=n && n<=9)
  const valid = annots.every(n => candidateIsValid(cases, cell.i, cell.j, n))
  if (log)
    console.log(`${cell.i} ${cell.j} caseIsValid: ${valid} ${[...cell.annots]} ${annots.map(n => candidateIsValid(cases, cell.i, cell.j, n))}`)
  return valid }

function gridIsValid(cases, log=false) {
  return cases.every(row => row.every(cell => caseIsValid(cases, cell, log))) }

function gridIsComplete(cases) {
  return cases.every(row => row.every(cell => cell.found > 0)) }

export {deepCopyCases, generateGridKey, GridStateCache, gridIsValid, gridIsComplete,
  selfSufficientSubsets, isFalsifiedBySingleDigitChain, falsifiedsBySingleDigitChain, findShortestContradictionChainForMove, findShortestContradictionChainForSteps,
  deductions, deductionMovesFromMap, deductionMoves, fillCase, fillAnnotations, simpleFill, candidateIsValid, caseIsValid}
/////// Parcourir les unités (bloc, ligne, colonne) d'une case (i,j) ou de toute la grille ///////

/**
 * caseUnitsMap: Parcours les trois unités (bloc, ligne, colonne) de la case (i,j).
 * Applique un callback sur chacune des trois unités.
 * Le callback reçoit (unit, {type, index})
 *   unit  : tableau de 9 cases
 *   type  : "block", "row" ou "col"
 *   index : numéro de bloc, ligne ou colonne (0 à 8)
 * Le résultat est un tableau plat de tous les éléments collectés (comme gridUnitsMap).
 * @param {Array<Array>} cases - Grille 9x9 de cases
 * @param {number} i
 * @param {number} j
 * @param {function} callback
 * @returns {Array}
 */
function addResult(results, r) {
  if (Array.isArray(r)) { if (r.length) results.push(...r) }
  else if (r) results.push(r) }
function _caseUnitsMap(cases, i, j, callback) {
  const results = [];
  // Bloc
  const bi = Math.floor(i/3), bj = Math.floor(j/3)
  const block = []
  for (let di = 0; di < 3; ++di) for (let dj = 0; dj < 3; ++dj)
    block.push(cases[bi*3+di][bj*3+dj])
  addResult(results, callback(block, "block", bi*3+bj))
  // Ligne
  addResult(results, callback(cases[i], "row", i))
  // Colonne
  const col = Array.from({ length: 9 }, (_, ii) => cases[ii][j])
  addResult(results, callback(col, "col", j))
  return results }

// Ajout sur une case (objet) d'une méthode non-énumérable caseUnitsMap
if (!Object.prototype.hasOwnProperty.call(Object.prototype, 'caseUnitsMap')) {
  Object.defineProperty(Object.prototype, 'caseUnitsMap', {
    value: function(cases, callback) {
      // 'this' est la case, il doit y avoir i et j
      return _caseUnitsMap(cases, this.i, this.j, callback) },
    writable: true,
    configurable: true,
    enumerable: false })}

/**
 * gridUnitsMap : Parcours toutes les unités (bloc, ligne, colonne) de la grille.
 * Applique une fonction à chaque unité (ligne, colonne, bloc) de la grille et concatène tous les résultats non vides.
 * Le callback reçoit (unit, {type, index})
 *   unit  : tableau de 9 cases (ligne, colonne ou bloc)
 *   type  : "row", "col" ou "block"
 *   index : numéro de la ligne, colonne ou bloc (0 à 8)
 * et doit retourner false/null/[] ou bien un tableau d'éléments à collecter.
 * Le résultat est un tableau plat de tous les éléments collectés.
 */
function _gridUnitsMap(cases, callback) {
  const results = []
  // Blocs
  for (let bi = 0; bi < 3; ++bi) for (let bj = 0; bj < 3; ++bj) {
    const block = []
    for (let di = 0; di < 3; ++di) for (let dj = 0; dj < 3; ++dj)
      block.push(cases[bi*3+di][bj*3+dj])
    addResult(results, callback(block, { type: "block", index: bi*3+bj }))}
  // Lignes
  for (let i = 0; i < 9; ++i) addResult(results, callback(cases[i], { type: "row", index: i }))
  // Colonnes
  for (let j = 0; j < 9; ++j) {
    const col = Array.from({ length: 9 }, (_, ii) => cases[ii][j])
    addResult(results, callback(col, { type: "col", index: j }))}
  return results }

/**
 * Ajoute gridUnitsMap et mapUnitsAndCollect comme méthodes non-énumérables sur Array.prototype,
 * pour permettre l'appel cases.gridUnitsMap(...)
 */
if (!Array.prototype.gridUnitsMap) {
  Object.defineProperty(Array.prototype, 'gridUnitsMap', {
    value: function(callback) {
      // 'this' doit être la grille 9x9
      return _gridUnitsMap(this, callback) },
    writable: true,
    configurable: true,
    enumerable: false })}
