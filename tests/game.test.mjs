import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gridAndSolutionFromText, areGridsEqual, gridAndSolutionWithDifficulty} from '../src/sudoku-app/grid/sudoku-generator.js';
import {deepCopyCases, fillCase, gridIsValid, simpleFill, gridIsComplete, deductions, GridStateCache, fillAnnotations} from '../src/sudoku-app/resolve.js';
const puzzle = '530070000 600195000 098000060 800060003 400803001 700020006 060000280 000419005 000080079';
test('import, saisie, copie historique et résolution', () => {
 const {grid,solution,error} = gridAndSolutionFromText(puzzle);
 assert.ok(!error); assert.ok(solution); assert.ok(gridIsValid(grid));
 const snapshot = deepCopyCases(grid);
 fillCase(grid,'+024',true);
 assert.equal(grid[0][2].found,4); assert.equal(snapshot[0][2].found,0);
 const {cases} = simpleFill(deepCopyCases(snapshot));
 assert.ok(gridIsComplete(cases)); assert.ok(areGridsEqual(cases.map(r=>r.map(c=>c.found)),solution));
});
test('génération aux quatre difficultés', () => {
 for (const level of [40,50,58,62]) {
  const {grid,solution} = gridAndSolutionWithDifficulty(level);
  assert.equal(grid.length,9); assert.ok(solution); assert.ok(gridIsValid(grid));
 }
});
test('calcul de déductions sur une grille importée', () => {
 const {grid} = gridAndSolutionFromText(puzzle);
 const iterator = deductions(grid,{selfSufficientSingle:true},new GridStateCache(),()=>false);
 let result; for (const step of iterator) result = step.result;
 assert.ok(result instanceof Map); assert.ok(result.size > 0);
});

test('un coup hypothétique sur cache chaud conserve ses étapes sans modifier le cache', () => {
 const {grid} = gridAndSolutionFromText(puzzle);
 const hs = {selfSufficientSingle:true, exclusiveSingle:true};
 const move = '+024';
 const afterMove = deepCopyCases(grid);
 fillAnnotations(afterMove); fillCase(afterMove,move); fillAnnotations(afterMove);
 const keep = new GridStateCache();
 const baseline = simpleFill(afterMove,hs);
 keep.set(afterMove,hs,baseline);
 const result = simpleFill(grid,hs,move,keep);
 assert.equal(result.flow,baseline.flow+1);
 assert.deepEqual(result.steps[0],[move]);
 assert.deepEqual(result.steps.slice(1),baseline.steps);
 const cached = keep.get(afterMove,hs);
 assert.equal(cached.flow,baseline.flow);
 assert.deepEqual(cached.steps,baseline.steps);
});

test('les sept aides produisent des coups cohérents avec la solution, y compris avec cache chaud', {timeout:60000}, () => {
 const {grid,solution} = gridAndSolutionFromText(puzzle);
 const keep = new GridStateCache();
 for (const name of ['selfSufficientSingle','exclusiveSingle','selfSufficientSubset','exclusiveIntersection','falsifiedBySingleDigitChain','consensusElimination','falsifiedByChain']) {
  let result = new Map();
  for (const step of deductions(deepCopyCases(grid),{[name]:true},keep,()=>false)) result = step.result;
  assert.ok(result.size>0,name);
  for (const ds of result.values()) {
   const move = ds.find(d=>d.m)?.m;
   if (!move) continue;
   const expected = solution[Number(move[1])][Number(move[2])];
   if (move[0]==='+') assert.equal(Number(move[3]),expected,name+' '+move);
   if (move[0]==='-') assert.notEqual(Number(move[3]),expected,name+' '+move);
  }
 }
});
