/**
 * @fileoverview Tests unitaires pour resolve.js — resolve.test.js
 *
 * Framework : Vitest (cohérent avec Vite utilisé pour le projet Lit)
 * Pour lancer les tests : `npx vitest run` ou `npx vitest`
 */

import { describe, it, expect } from 'vitest'
import { gridAndSolutionFromText } from './grid/sudoku-generator.js'
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

const puzzles = new Map([
  ['valid',    '530070000 600195000 098000060 800060003 400803001 700020006 060000280 000419005 000080079'],
  ['valid2',   '042630007 073005064 800947321 000402105 204000600 009003472 400000210 001006049 008104706'],
  ['one line', '000000000 000000000 000000000 123456780 000000000 000000000 000000000 000000000 000000000'],
])

describe('gridAndSolutionFromText — unicité de solution', () => {
  it('devrait retourner LA solution unique pour la grille valide', () => {
    const { grid: cases, solution } = gridAndSolutionFromText(puzzles.get('valid'))
    expect(solution).not.toBeNull()
  })

  it('devrait retourner null pour une grille à solutions multiples (mode strict)', () => {
    const { grid: cases, solution } = gridAndSolutionFromText(puzzles.get('one line'))
    expect(solution).toBeNull()
  })

  it('devrait retourner la première solution même non unique (mode permissif)', () => {
    const { grid: cases, solution } = gridAndSolutionFromText(puzzles.get('one line'), false)
    expect(solution).not.toBeNull()
  })
})

describe('gridIsValid — détection de conflits', () => {
  it('devrait retourner true pour une grille valide', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    expect(gridIsValid(cases)).toBe(true)
  })

  it('devrait retourner false pour une grille invalide (conflit sur found)', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    cases[8][0].found = 5
    expect(gridIsValid(cases)).toBe(false)
  })

  it('devrait retourner false pour une grille invalide (aucun candidat possible)', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    cases[8][0].found = 0
    ;[1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(n => cases[8][0].annots.add(-n))
    expect(gridIsValid(cases)).toBe(false)
  })
})

describe('deductionMoves — selfSufficientSingle (candidat unique)', () => {
  it('devrait retourner les 4 moves de candidat unique', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    const moves = deductionMoves(cases, { selfSufficientSingle: true })
    const expectedMoves = ['+445', '+657', '+684', '+773']
    expect(moves).toEqual(expectedMoves)
  })

  it('devrait produire la grille correcte après application des moves', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    const moves = deductionMoves(cases, { selfSufficientSingle: true })
    const casesCopy = deepCopyCases(cases)
    for (const move of moves) fillCase(casesCopy, move)

    const casesEnd = casesCopy.map(row => row.map(cell => cell.found || 0).join('')).join('')

    let expectedEnd = cases.map(row => row.map(cell => cell.found || 0).join('')).join('')
    expectedEnd = expectedEnd.split('')
    expectedEnd[4 * 9 + 4] = '5'
    expectedEnd[6 * 9 + 5] = '7'
    expectedEnd[6 * 9 + 8] = '4'
    expectedEnd[7 * 9 + 7] = '3'
    expectedEnd = expectedEnd.join('')

    expect(casesEnd).toEqual(expectedEnd)
  })
})

describe('GridStateCache — mémoïsation', { timeout: 30000 }, () => {
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

  it('devrait trouver une entrée dans le cache pour (casesCopy, hs3)', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid'))
    const casesCopy = deepCopyCases(cases)
    fillAnnotations(casesCopy)
    const hs = { consensusElimination: true }
    const hs3 = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const keep = new GridStateCache()
    deductionMoves(casesCopy, hs, keep)
    fillCase(casesCopy, '+445')
    fillAnnotations(casesCopy)
    const cached = keep.get(casesCopy, hs3)
    expect(cached).not.toBeNull()
  })
})

describe('simpleFill — résolution itérative sans cache', () => {
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

describe('simpleFill — avec GridStateCache (keep)', () => {
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

describe('GridStateCache — get/set et reconstruction des cases', () => {
  it('casesEnd (retour de simpleFill) doit être égal à la grille après application manuelle des moves', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid2'))
    const hs = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const { isValid, flow, steps, moves, cases: casesEnd } = simpleFill(cases, hs)

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

    const casesRef = deepCopyCases(cases0)
    fillAnnotations(casesRef)
    for (const move of result.moves) fillCase(casesRef, move)
    fillAnnotations(casesRef)

    const cached0 = keep.get(cases0, hs)
    expect(cached0.cases).toEqual(casesRef)
  })

  it('cached1.cases (depuis cases post-fillAnnotations) doit reconstruire la grille finale', () => {
    const { grid: cases } = gridAndSolutionFromText(puzzles.get('valid2'))
    const hs = { selfSufficientSingle: true, exclusiveSingle: true, selfSufficientSubset: true }
    const keep = new GridStateCache()
    const cases0 = deepCopyCases(cases)
    const result = simpleFill(cases, hs)
    fillAnnotations(cases)
    const cases1 = deepCopyCases(cases)
    keep.set(cases0, hs, result)
    keep.set(cases1, hs, result)

    for (const move of result.moves) fillCase(cases, move)
    fillAnnotations(cases)

    const cached1 = keep.get(cases1, hs)
    expect(cached1.cases).toEqual(cases)
  })
})
