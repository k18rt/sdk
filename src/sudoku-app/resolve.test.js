/**
 * @fileoverview Tests unitaires pour resolve.js — resolve.test.js
 *
 * Framework : Vitest (cohérent avec Vite utilisé pour le projet Lit)
 * Pour lancer les tests : `npx vitest run` ou `npx vitest`
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MIGRATION CommonJS → ES Module (changements par rapport à resolve_test.js)
 * ─────────────────────────────────────────────────────────────────────────────
 *  - `import { describe, it, expect }` depuis 'vitest' (pas de globals Jest)
 *  - Imports depuis './resolve' et './sudoku-generator' en ES modules
 *  - `moves` est maintenant une propriété directe de simpleFill() :
 *      const { isValid, flow, steps, moves, cases } = simpleFill(cases, hs)
 *    avec moves = steps.flat() (liste plate de tous les moves)
 *  - `keep.set(grid, hs, result)` accepte désormais `result.moves` (flat)
 *    en plus de `result.steps` (imbriqué) — compatibilité assurée dans resolve.js
 *  - Les describe/it imbriqués dont les variables dépendent du describe parent
 *    ont été refactorisés : la préparation de données est dans chaque describe,
 *    pas en dehors (évite les problèmes d'ordre d'exécution avec Vitest)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STRUCTURE DES TESTS
 * ─────────────────────────────────────────────────────────────────────────────
 *  1. gridAndSolutionFromText   — unicité de solution
 *  2. gridIsValid               — validité de grille
 *  3. deductionMoves            — heuristique selfSufficientSingle
 *  4. GridStateCache            — get/set/stateKey/cache size
 *  5. simpleFill                — sans cache
 *  6. simpleFill with keep      — avec cache
 *  7. keep-get-set              — persistance et reconstruction depuis le cache
 *
 * @module resolve.test
 */

import { describe, it, expect } from 'vitest'
import { gridAndSolutionFromText } from './sudoku-generator.js'
import {
  deepCopyCases,
  generateGridKey,
  GridStateCache,
  gridIsValid,
  deductionMoves,
  fillAnnotations,
  fillCase,
  simpleFill,
} from './resolve.js'

// ─────────────────────────────────────────────────────────────────────────────
// DONNÉES DE TEST PARTAGÉES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Grilles de test utilisées dans les suites ci-dessous.
 *
 * Format : chaîne de 81 caractères (espaces ignorés), 0 = case vide.
 *   'valid'    → grille avec solution unique, solvable par heuristiques de base
 *   'valid2'   → grille nécessitant selfSufficientSubset pour progresser
 *   'one line' → grille avec plusieurs solutions (ligne 3 incomplète)
 */
const puzzles = new Map([
  ['valid',    '530070000 600195000 098000060 800060003 400803001 700020006 060000280 000419005 000080079'],
  ['valid2',   '042630007 073005064 800947321 000402105 204000600 009003472 400000210 001006049 008104706'],
  ['one line', '000000000 000000000 000000000 123456780 000000000 000000000 000000000 000000000 000000000'],
])

/**
 * Noms des heuristiques disponibles dans l'ordre d'application.
 * Utilisé pour la génération dynamique de tests sur chaque heuristique.
 */
const heuristics = [
  'selfSufficientSingle',
  'exclusiveSingle',
  'selfSufficientSubset',
  'falsifiedBySingleDigitChain',
  'consensusElimination',
  'falsifiedByChain',
]

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — gridAndSolutionFromText : unicité de solution
// ─────────────────────────────────────────────────────────────────────────────

describe('gridAndSolutionFromText — unicité de solution', () => {
  /**
   * Vérifie que la grille 'valid' a bien une solution unique.
   * gridAndSolutionFromText(text, true) force la vérification d'unicité.
   */
  it('devrait retourner LA solution unique pour la grille valide', () => {
    const { grid: cases, solution } = gridAndSolutionFromText(puzzles.get('valid'))
    expect(solution).not.toBeNull()
  })

  /**
   * Vérifie qu'une grille avec plusieurs solutions retourne null (mode strict).
   * La grille 'one line' n'a pas de solution unique → solution === null.
   */
  it('devrait retourner null pour une grille à solutions multiples (mode strict)', () => {
    const { grid: cases, solution } = gridAndSolutionFromText(puzzles.get('one line'))
    expect(solution).toBeNull()
  })

  /**
   * Vérifie qu'on peut obtenir la première solution même si elle n'est pas unique
   * en passant false comme second argument (désactive la vérification d'unicité).
   */
  it('devrait retourner la première solution même non unique (mode permissif)', () => {
    const { grid: cases, solution } = gridAndSolutionFromText(puzzles.get('one line'), false)
    expect(solution).not.toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — gridIsValid : détection de conflits
// ─────────────────────────────────────────────────────────────────────────────

describe('gridIsValid — détection de conflits', () => {
  /**
   * La grille 'valid' chargée depuis le texte doit être valide telle quelle.
   */
  it('devrait retourner true pour une grille valide', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    expect(gridIsValid(cases)).toBe(true)
  })

  /**
   * En plaçant manuellement un chiffre conflictuel (5 en [8][0] alors que 5
   * existe déjà dans la même ligne ou colonne), la grille doit être invalide.
   */
  it('devrait retourner false pour une grille invalide (conflit sur found)', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    cases[8][0].found = 5   // Injection manuelle d'un conflit
    expect(gridIsValid(cases)).toBe(false)
  })

  /**
   * Une case sans aucun candidat possible (9 annotations négatives, aucun found)
   * rend la grille invalide car la case est insoluble.
   */
  it('devrait retourner false pour une grille invalide (aucun candidat possible)', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    cases[8][0].found = 0   // Assure que found est vide
    ;[1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(n => cases[8][0].annots.add(-n))
    expect(gridIsValid(cases)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — deductionMoves : heuristique selfSufficientSingle
// ─────────────────────────────────────────────────────────────────────────────

describe('deductionMoves — selfSufficientSingle (candidat unique)', () => {
  /**
   * Avec uniquement l'heuristique selfSufficientSingle, seules les cases
   * n'ayant qu'un seul candidat possible (8 annotations négatives) sont détectées.
   *
   * Moves attendus pour 'valid' : +445, +657, +684, +773
   *   +445 → chiffre 5 en ligne 4, colonne 4
   *   +657 → chiffre 7 en ligne 6, colonne 5
   *   +684 → chiffre 4 en ligne 6, colonne 8
   *   +773 → chiffre 3 en ligne 7, colonne 7
   */
  it('devrait retourner les 4 moves de candidat unique', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    const moves = deductionMoves(cases, { selfSufficientSingle: true })
    const expectedMoves = ['+445', '+657', '+684', '+773']
    expect(moves).toEqual(expectedMoves)
  })

  /**
   * Après application des 4 moves, les cases correspondantes doivent être remplies.
   * Les autres cases restent inchangées.
   */
  it('devrait produire la grille correcte après application des moves', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    const moves = deductionMoves(cases, { selfSufficientSingle: true })
    const casesCopy = deepCopyCases(cases)
    for (const move of moves) fillCase(casesCopy, move)

    const casesEnd = casesCopy.map(row => row.map(cell => cell.found || 0).join('')).join('')

    // Grille de référence : état initial + les 4 cases remplies
    let expectedEnd = cases.map(row => row.map(cell => cell.found || 0).join('')).join('')
    expectedEnd = expectedEnd.split('')
    expectedEnd[4 * 9 + 4] = '5'   // +445
    expectedEnd[6 * 9 + 5] = '7'   // +657
    expectedEnd[6 * 9 + 8] = '4'   // +684
    expectedEnd[7 * 9 + 7] = '3'   // +773
    expectedEnd = expectedEnd.join('')

    expect(casesEnd).toEqual(expectedEnd)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — GridStateCache : mémoïsation des états
// ─────────────────────────────────────────────────────────────────────────────

describe('GridStateCache — mémoïsation', () => {
  /**
   * Vérifie que deductionMoves avec consensusElimination retourne 102 moves
   * sur la grille 'valid' (avec ou sans cache, même résultat).
   * Vérifie ensuite les métriques internes du cache après utilisation.
   */
  it('devrait retourner 102 moves (sans cache)', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    const casesCopy = deepCopyCases(cases)
    fillAnnotations(casesCopy)
    const hs = { consensusElimination: true }
    const moves0 = deductionMoves(casesCopy, hs, null)
    expect(moves0.length).toBe(102)
  })

  it('devrait retourner 102 moves (avec cache)', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    const casesCopy = deepCopyCases(cases)
    fillAnnotations(casesCopy)
    const hs = { consensusElimination: true }
    const keep = new GridStateCache()
    const moves1 = deductionMoves(casesCopy, hs, keep)
    expect(moves1.length).toBe(102)
  })

  /**
   * Après deux appels à deductionMoves avec le cache, le cache doit contenir
   * exactement 391 entrées et avoir une entrée pour foundCount = 1.
   */
  it('devrait contenir 391 entrées dans le cache après utilisation', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    const casesCopy = deepCopyCases(cases)
    fillAnnotations(casesCopy)
    const hs = { consensusElimination: true }
    const keep = new GridStateCache()
    deductionMoves(casesCopy, hs, keep)
    const { size } = keep.success()
    expect(size).toBe(391)
  })

  it('devrait avoir une entrée pour foundCount = 1', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    const casesCopy = deepCopyCases(cases)
    fillAnnotations(casesCopy)
    const hs = { consensusElimination: true }
    const keep = new GridStateCache()
    deductionMoves(casesCopy, hs, keep)
    expect(keep.cache.has(1)).toBe(true)
  })

  it('devrait avoir 133 entrées pour foundCount = 1', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    const casesCopy = deepCopyCases(cases)
    fillAnnotations(casesCopy)
    const hs = { consensusElimination: true }
    const keep = new GridStateCache()
    deductionMoves(casesCopy, hs, keep)
    expect(keep.cache.get(1).size).toBe(133)
  })

  /**
   * generateGridKey doit retourner foundCount=1 après avoir rempli la case +445.
   * Vérifie aussi le format exact de la stateKey générée.
   */
  it('devrait retourner foundCount = 1 après fillCase(+445)', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    const casesCopy = deepCopyCases(cases)
    fillAnnotations(casesCopy)
    fillCase(casesCopy, '+445')
    fillAnnotations(casesCopy)
    const hs3 = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const { foundCount } = generateGridKey(casesCopy, hs3)
    expect(foundCount).toBe(1)
  })

  it('devrait générer la stateKey attendue après +445', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    const casesCopy = deepCopyCases(cases)
    fillAnnotations(casesCopy)
    fillCase(casesCopy, '+445')
    fillAnnotations(casesCopy)
    const hs3 = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const { stateKey } = generateGridKey(casesCopy, hs3)
    const expectedStateKey =
      '111000:[356789][1345789][13579][23567][35678][135679][135689][135689][12569]' +
      '[156789][13569][3456789][1456789][1256789][1356789][2689][135689][346789][34678]' +
      '[1234568][235689][12368][13678][13456789][134578]5[1234568][1345678][2346789][24678]' +
      '[12345678][2356789][12367][123678][245678][268][124689][12456789][12345689][12356789]' +
      '[1456789][134569][145689][1245789][12456789][456789][36789][6789][14789][1345789][25789]'
    expect(stateKey).toBe(expectedStateKey)
  })

  /**
   * Après avoir rempli +445 et reconstruit les annotations, le cache doit
   * retourner un résultat pour (casesCopy, hs3) si la position a été mémorisée.
   */
  it('devrait trouver une entrée dans le cache pour (casesCopy, hs3)', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    const casesCopy = deepCopyCases(cases)
    fillAnnotations(casesCopy)
    const hs = { consensusElimination: true }
    const hs3 = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const keep = new GridStateCache()
    deductionMoves(casesCopy, hs, keep)     // Remplit le cache
    fillCase(casesCopy, '+445')
    fillAnnotations(casesCopy)
    const cached = keep.get(casesCopy, hs3)
    expect(cached).not.toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — simpleFill : résolution itérative sans cache
// ─────────────────────────────────────────────────────────────────────────────

describe('simpleFill — résolution itérative sans cache', () => {
  /**
   * Sur la grille 'valid2' avec les 3 premières heuristiques activées,
   * simpleFill doit :
   *   - rester valide (isValid = true)
   *   - appliquer exactement 6 moves (flow = 6)
   *   - retourner une liste de 6 moves d'annotation négative
   *
   * Les 6 moves sont des éliminations de candidats (préfixe '-') :
   *   -005 → éliminer le 5 en [0][0]
   *   -501 → éliminer le 1 en [5][0]
   *   -809 → éliminer le 9 en [8][0]
   *   etc.
   */
  it('devrait retourner isValid = true', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid2'))
    const hs = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const { isValid } = simpleFill(cases, hs)
    expect(isValid).toBe(true)
  })

  it('devrait retourner flow = 6', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid2'))
    const hs = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const { flow } = simpleFill(cases, hs)
    expect(flow).toBe(6)
  })

  it('devrait retourner les 6 moves attendus', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid2'))
    const hs = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const { moves } = simpleFill(cases, hs)
    const expectedMoves = ['-005', '-501', '-809', '-813', '-815', '-845']
    expect(moves).toEqual(expectedMoves)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 — simpleFill avec keep : résolution mémoïsée
// ─────────────────────────────────────────────────────────────────────────────

describe('simpleFill — avec GridStateCache (keep)', () => {
  /**
   * Même résultats qu'en Suite 5, mais avec un cache activé.
   * Vérifie que la mémoïsation ne modifie pas le comportement fonctionnel.
   */
  it('devrait retourner isValid = true avec cache', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid2'))
    const hs = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const keep = new GridStateCache()
    const { isValid } = simpleFill(cases, hs, null, keep)
    expect(isValid).toBe(true)
  })

  it('devrait retourner flow = 6 avec cache', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid2'))
    const hs = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const keep = new GridStateCache()
    const { flow } = simpleFill(cases, hs, null, keep)
    expect(flow).toBe(6)
  })

  it('devrait retourner les 6 moves attendus avec cache', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid2'))
    const hs = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const keep = new GridStateCache()
    const { moves } = simpleFill(cases, hs, null, keep)
    const expectedMoves = ['-005', '-501', '-809', '-813', '-815', '-845']
    expect(moves).toEqual(expectedMoves)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7 — keep.get / keep.set : persistance et reconstruction
// ─────────────────────────────────────────────────────────────────────────────

describe('GridStateCache — get/set et reconstruction des cases', () => {
  /**
   * Ce bloc prépare un scénario complet :
   *   1. Appel à simpleFill pour obtenir {isValid, flow, steps, moves, cases}
   *   2. Stockage manuel dans le cache via keep.set pour cases0 et cases1
   *   3. Relecture via keep.get et vérification que les données sont identiques
   *
   * Note : keep.set accepte soit `steps` (imbriqué) soit `moves` (plat),
   * permettant une utilisation souple des deux formes retournées par simpleFill.
   */

  it('casesEnd (retour de simpleFill) doit être égal à la grille après application manuelle des moves', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid2'))
    const hs = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const { isValid, flow, steps, moves, cases: casesEnd } = simpleFill(cases, hs)

    // Reconstruction manuelle de la grille finale
    const casesManual = deepCopyCases(cases)
    fillAnnotations(casesManual)
    for (const move of moves) fillCase(casesManual, move)
    fillAnnotations(casesManual)

    expect(casesEnd).toEqual(casesManual)
  })

  it('cached0.isValid doit correspondre au résultat original', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid2'))
    const hs = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const keep = new GridStateCache()
    const cases0 = deepCopyCases(cases)
    const result = simpleFill(cases, hs)
    keep.set(cases0, hs, result)
    const cached0 = keep.get(cases0, hs)
    expect(cached0.isValid).toEqual(result.isValid)
  })

  it('cached0.flow doit correspondre au résultat original', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid2'))
    const hs = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const keep = new GridStateCache()
    const cases0 = deepCopyCases(cases)
    const result = simpleFill(cases, hs)
    keep.set(cases0, hs, result)
    const cached0 = keep.get(cases0, hs)
    expect(cached0.flow).toEqual(result.flow)
  })

  it('cached0.moves doit correspondre aux moves originaux', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid2'))
    const hs = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const keep = new GridStateCache()
    const cases0 = deepCopyCases(cases)
    const result = simpleFill(cases, hs)
    keep.set(cases0, hs, result)
    const cached0 = keep.get(cases0, hs)
    expect(cached0.moves).toEqual(result.moves)
  })

  it('cached0.cases doit reconstruire la grille finale identique', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid2'))
    const hs = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const keep = new GridStateCache()
    const cases0 = deepCopyCases(cases)
    const result = simpleFill(cases, hs)
    keep.set(cases0, hs, result)

    // Grille finale de référence (reconstruite manuellement)
    const casesRef = deepCopyCases(cases)
    fillAnnotations(casesRef)
    for (const move of result.moves) fillCase(casesRef, move)
    fillAnnotations(casesRef)

    const cached0 = keep.get(cases0, hs)
    expect(cached0.cases).toEqual(casesRef)
  })

  /**
   * Après fillAnnotations sur cases (qui le modifie en place), la stateKey change.
   * Stocker depuis cases1 (post-fillAnnotations) doit aussi permettre la relecture.
   */
  it('cached1.cases (depuis cases post-fillAnnotations) doit reconstruire la grille finale', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid2'))
    const hs = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const keep = new GridStateCache()
    const cases0 = deepCopyCases(cases)
    const result = simpleFill(cases, hs)
    fillAnnotations(cases)          // Modifie cases en place → cases1
    const cases1 = deepCopyCases(cases)
    keep.set(cases0, hs, result)
    keep.set(cases1, hs, result)

    // Grille finale de référence
    for (const move of result.moves) fillCase(cases, move)
    fillAnnotations(cases)

    const cached1 = keep.get(cases1, hs)
    expect(cached1.cases).toEqual(cases)
  })
})
