// Fonctions utilitaires pour la génération et la manipulation de grilles Sudoku

// Un puzzle est un number[9][9]
// S'il est complet, ie avec aucun 0, c'est une solution

import { GRIDS } from "./grids.js"

// une grille (grid) est un cases[9][9] où case est un {i, j, given, found, annots}
// i et j sont les coordonnées, given est un booléen qui indique si la case est donnée au départ
// found est le chiffre trouvé, annots est un Set de chiffres positifs ou négatifs
// une annot négative -n signifie que le chiffre n ne peut pas être dans cette case
// une annot positive n est une hypothèse, elle signifie que n est un choix possible

// Compare deux grilles : TODO revoir pour l'égalité des cases
function areGridsEqual(a, b) {
  function areCasesEqual(a, b) {
    function areSetsEqual(a, b) {
      if (a.size !== b.size) return false
      for (const v of a) { if (!b.has(v)) return false }
      return true }
    if (typeof a === 'number' && typeof b === 'number') return a === b
    return a.found === b.found && areSetsEqual(a.annots, b.annots) }
  for (let i = 0; i < 9; i++)
    for (let j = 0; j < 9; j++)
      if (!areCasesEqual(a[i][j], b[i][j])) return false
  return true }

// Retourne {grid, solution} où grid est une grille et solution est sa solution
function gridAndSolutionWithDifficulty(difficulty) {
  // Génère une grille Sudoku complète (solution)
  function generateSolution() {
    // Utilisation d'un algorithme backtracking simple
    const size = 9
    const board = Array.from({ length: size }, () => Array(size).fill(0))
    const shuffle = arr => arr.sort(() => Math.random() - 0.5)
    function fill(board, row = 0, col = 0) {
      if (row === 9) return true
      if (col === 9) return fill(board, row + 1, 0)
      const nums = shuffle([1,2,3,4,5,6,7,8,9])
      for (let num of nums) {
        if (_isValid(board, row, col, num)) {
          board[row][col] = num
          if (fill(board, row, col + 1)) return true
          board[row][col] = 0 }}
      return false }
    fill(board)
    return board }
  // Crée une énigme à partir d'une solution (cache des cases)
  function makePuzzle(solution, emptyCount = 45) {
    const puzzle = solution.map(row => row.slice())
    let empties = 0
    let attempts = 0
    while (empties < emptyCount && attempts < 81*4) { // limite pour éviter boucle infinie
      const i = Math.floor(Math.random() * 9)
      const j = Math.floor(Math.random() * 9)
      if (puzzle[i][j] !== 0) {
        const backup = puzzle[i][j]
        puzzle[i][j] = 0
        if (countSolutions(puzzle).count === 1) empties++
        else puzzle[i][j] = backup // remettre si solution non unique
        attempts++ }}
    return puzzle }
  const solution = generateSolution()
  const puz = makePuzzle(solution, difficulty)
  const grid = gridFromPuzzle(puz)
  return { grid, solution }}

// Retourne {grid, puzzle, error} où grid et puzzle sont null si error (text ou puzzle invalide)
const l_puzzleFromText = (cleanText) => { // Convertir en puzzle 9x9
  const puzzle = []
  for (let i = 0; i < 9; i++) {
    const row = []
    for (let j = 0; j < 9; j++) {
      const char = cleanText[i * 9 + j]
      row.push(parseInt(char, 10)) }
    puzzle.push(row) }
  return puzzle }
function gridFromText(text, unique=true) {
  // Fonction pour parser le texte d'importation de sudoku
  // retourne {puzzle, error} où puzzle est null si error
  function parsePuzzle(text) {
    try {
      // Nettoyer le texte : supprimer espaces, retours à la ligne, etc.
      let cleanText = text.replace(/\s/g, '')
      // Vérifier que le texte contient exactement 81 caractères
      if (cleanText.length !== 81) {
        throw new Error(`Le texte doit contenir exactement 81 chiffres (trouvé: ${cleanText.length})`) }
      // rempacer tous les . par des 0
      cleanText = cleanText.replace(/\./g, '0')
      // Vérifier que tous les caractères sont des chiffres de 0 à 9
      if (!/^[0-9]{81}$/.test(cleanText)) {
        throw new Error('Le texte doit contenir uniquement des chiffres de 0 à 9') }
      return {puzzle: l_puzzleFromText(cleanText), error: null}}
    catch (error) {
      return {puzzle: null, error: error.message} }}
  function puzzleIsValid(puzzle) {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const v = puzzle[i][j]
        if (v !== 0) {
          puzzle[i][j] = 0
          if (!_isValid(puzzle, i, j, v)) return false
          puzzle[i][j] = v }}}
    return true }
  const {puzzle, error} = parsePuzzle(text)
  if (error) return {grid: null, puzzle: null, error}
  if (!puzzleIsValid(puzzle)) return {grid: null, puzzle: null, error: `Le puzzle n'est pas valide`}
  return {grid: gridFromPuzzle(puzzle), puzzle, error: null} }

// Retourne {grid, solution, error} où grid et solution sont null si error (text invalide)
function gridAndSolutionFromText(text, unique=true) {
  const {grid, puzzle, error} = gridFromText(text)
  if (error) return {grid: null, solution: null, error}
  if (GRIDS.has(text) && GRIDS.get(text).sol.length > 0) return {grid, solution: l_puzzleFromText(GRIDS.get(text).sol), error: null}
  const {count, solution} = countSolutions(puzzle)
  if (unique && count !== 1) return {grid: null, solution: null, error: `Le puzzle n'a pas une solution unique`}
  return { grid, solution }}

// Export functions
export {
  areGridsEqual,
  gridAndSolutionWithDifficulty,
  gridFromText,
  gridAndSolutionFromText,
  gridFromPuzzle
};

// fonctions internes

// Créer une grille à partir d'un puzzle
function gridFromPuzzle(puzzle) {
  return puzzle.map((row, i) => row.map((val, j) => ({
    i, j, given: val !== 0,
    found: val, // chiffre donné ou 0
    annots: new Set() })))}

// Compte le nombre de solutions d'une grille et retourne la solution si elle est unique
// Retourne {count, solution} où count est 0, 1 ou 2 et solution est la solution si elle est unique
function countSolutions(puzzle) {
  //console.log('countSolutions puzzle', puzzle)
  let count = 0
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
              if (count > 1) return }}
          return }}}
    count++
    if (count === 1) solution = g.map(row => row.slice()) }
  const p = puzzle.map(row => row.slice())
  solve(p)
  //console.log('countSolutions solution', solution)
  return { count, solution }}

// Vérifie si un nombre peut être placé dans une case
function _isValid(board, row, col, num) {
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num || board[x][col] === num) return false }
  const startRow = row - row % 3, startCol = col - col % 3
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      if (board[i + startRow][j + startCol] === num) return false
  return true }
