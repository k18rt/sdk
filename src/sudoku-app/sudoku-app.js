import { html, svg } from 'lit';
import { GridSelection } from './grid-selection.js';
import { styleMap } from 'lit/directives/style-map.js';
import { ref } from 'lit/directives/ref.js';
import { cssStyle, StatefulElement } from './lit-state.js';
import { SudokuGrid, TopButtonRow, FillButton, AnnotHole, HelpOverlay, ImportModal, PaintBucketMinusIcon, PaintBucketPlusIcon, CellHypothesisIcon, UnitHypothesisIcon, NakedSetsIcon, ExclusiveIntersectionIcon, SimpleContradictionIcon, ContradictionIcon, DoubleFlowIcon } from "./sudoku-ui.js";
import { deepCopyCases, GridStateCache, candidateIsValid, deductions, deductionMovesFromMap, fillCase, simpleFill, gridIsComplete } from "./resolve.js";
import { isFalsifiedBySingleDigitChain, selfSufficientSubsets } from "./resolve.js";
import { areGridsEqual, gridAndSolutionWithDifficulty, gridAndSolutionFromText } from "./grid/sudoku-generator.js";
import confetti from "canvas-confetti";
function renderApp() {
  // State
  const [solution, setSolution] = this.state(0, null);
  const [cases, setCases] = this.state(1, null);
  const [selected, setSelected] = this.state(2, []); // ["i,j"]
  const [highlighted, setHighlighted] = this.state(3, []); // [n]
  const [annotateMode, setAnnotateMode] = this.state(4, "+");
  const [message, setMessage] = this.state(5, '');
  const [keep, setKeep] = this.state(6, new GridStateCache());
  const [history, setHistory] = this.state(7, []);
  const [future, setFuture] = this.state(8, []);
  const [flow, setFlow] = this.state(9, 0);
  const [difficulty, setDifficulty] = this.state('difficulty', 'moyen'); // 'facile', 'moyen', 'difficile'
  const [showHelp, setShowHelp] = this.state(11, false);
  const [helpOverlay, setHelpOverlay] = this.state(12, true);
  const [showPositiveAnnot, setShowPositiveAnnot] = this.state(13, false);
  const [showNegativeAnnot, setShowNegativeAnnot] = this.state(14, false);
  const [showSelfSufficientSingle, setShowSelfSufficientSingle] = this.state(15, false);
  const [showSelfSufficientSubset, setShowSelfSufficientSubset] = this.state(16, false);
  const [showExclusiveSingle, setShowExclusiveSingle] = this.state(17, false);
  const [showExclusiveIntersection, setShowExclusiveIntersection] = this.state(18, false);
  const [showSimpleContradictions, setShowSimpleContradictions] = this.state(19, false);
  const [showConsensusElimination, setShowConsensusElimination] = this.state(20, false);
  const [showContradiction, setShowContradiction] = this.state(21, false);
  const [deductionsMap, setDeductionsMap] = this.state(22, new Map());
  const [onActivity, setOnActivity] = this.state(23, 0); // 0: repos; 1: activité; 2: newGame; 3: itération
  const [showImportModal, setShowImportModal] = this.state(24, false);
  const [importText, setImportText] = this.state(25, '');
  const difficultyMap = {
    'facile': 40,
    'moyen': 50,
    'difficile': 58,
    'expert': 62
  };
  const handleOn_async = this.callback(26, async () => {
    console.log(`handleOn_async ${onActivity}`);
    if (onActivity !== 0) {
      setMessage('...');
      return false;
    } else {
      setOnActivity(1);
      setMessage('');
      await new Promise(r => setTimeout(r, 50));
      return true;
    }
  }, [onActivity]);
  const handleMid = this.callback(27, () => {
    setDeductionsMap(new Map());
    setOnActivity(3);
    if (message === '...') setMessage('');
  }, [message, onActivity]);
  const handleOff = this.callback(28, () => {
    setOnActivity(0);
    if (message === '...') setMessage('');
  }, [message, onActivity]);
  this.effect(29, () => {
    // Lance l'itération sur setOnActivity(3)
    if (onActivity !== 3) return;
    const hs = flow === 0 ? {
      selfSufficientSingle: showSelfSufficientSingle,
      exclusiveSingle: showExclusiveSingle,
      selfSufficientSubset: showSelfSufficientSubset,
      exclusiveIntersection: showExclusiveIntersection,
      falsifiedBySingleDigitChain: showSimpleContradictions,
      consensusElimination: showConsensusElimination,
      falsifiedByChain: showContradiction
    } : {}; // {selfSufficientSingle: showSelfSufficientSingle, exclusiveSingle: showExclusiveSingle}
    const iterator = deductions(cases, hs, keep, () => false);
    let lastResult = new Map();
    let timeoutId = null;
    const processNext = () => {
      const {
        value,
        done
      } = iterator.next();
      if (done || !value) {
        clearTimeout(timeoutId);
        timeoutId = null;
        handleOff();
        console.log(`Itération terminée ${JSON.stringify(value)} ${done}`);
        const {
          fromLast,
          fromBegin,
          size
        } = keep.success();
        console.log(`keep size ${size} success ${fromLast}/${fromBegin} deductionMap (${lastResult.size})\n` + Array.from(lastResult.entries()).map(([k, v]) => `  ${k}: ${v.length} ${v.slice(0, 2).map(item => {
          const {
            steps,
            ...rest
          } = item;
          return JSON.stringify(rest);
        }).join('')}`).join('\n'));
        return;
      }
      //else console.log(`Itération ${JSON.stringify(value)} ${value.result.size} ${done}`)
      setDeductionsMap(lastResult = value.result);
      timeoutId = setTimeout(processNext, 10);
    }; // 50ms de délai entre chaque itération
    processNext();
    // Nettoyage quand le composant est démonté
    return () => {
      console.log('Itération END');
      clearTimeout(timeoutId);
      timeoutId = null;
      handleOff();
    };
  }, [onActivity]);

  // Pour importer une grille
  const {
    importGrid,
    setImportGrid
  } = this.appConfig(); // Changement de grille depuis l'extérieur (AppConfig)
  this.effect(30, () => {
    (async () => {
      if (importGrid && (await handleOn_async())) {
        l_importSudokuFromText(importGrid);
        setImportGrid(""); // reset après import
        handleMid();
      }
    })();
  }, [importGrid, setImportGrid]); // ne s’exécute que si importGrid change
  async function handleImportSudoku_async() {
    if (!(await handleOn_async())) return;
    l_importSudokuFromText(importText);
    setShowImportModal(false);
    setImportText('');
    handleMid();
  }
  function l_importSudokuFromText(text) {
    const {
      grid,
      solution,
      error
    } = gridAndSolutionFromText(text);
    // Fermer la modal et réinitialiser le texte
    if (error) {
      setMessage(error);
      return;
    }
    setSolution(solution);
    setCases(grid);
    setHistory([deepCopyCases(grid)]);
    setFuture([]);
    setSelected([]);
    setHighlighted([]);
    setMessage('Sudoku importé avec succès !');
    setKeep(new GridStateCache());
    setFlow(0);
  }

  // Responsive cell size
  const gridRef = this.ref(31, null);
  const [cellSize, setCellSize] = this.state(32, 50);
  const {
    width,
    height
  } = this.panelSize;
  const helpPanelWidth = 340; // largeur max du panneau d'aide
  const minRightMargin = 24; // espace minimal à droite
  this.effect(33, () => {
    if (gridRef.current && width && height) {
      // Largeur = 2 bords (20) + border (10) + 9 cellules
      // Hauteur = 2 bords (20) + border (10) + 9 cellules + bas (190) + 20 ???
      const gridWidth = width - 20 - 10;
      const gridHeight = height - 20 - 10 - 190 - 20;
      const grid = Math.min(gridWidth, gridHeight);
      const newCellSize = window.innerWidth <= 800
        ? Math.max(20, Math.floor((gridWidth - 2) / 9))
        : Math.max(Math.floor(grid / 9), 50);
      if (newCellSize !== cellSize) {
        setCellSize(newCellSize);
        // Calcul overlay possible ?
        const gridWidth = Math.max(Math.floor(grid), cellSize * 9);
        if (width - gridWidth >= helpPanelWidth + minRightMargin) setHelpOverlay(true);else setHelpOverlay(false);
      }
    }
  }, [width, height, cellSize, helpOverlay]);
  this.effect(34, () => {
    // recalcul overlay à chaque ouverture d'aide
    if (showHelp && gridRef.current) {
      const w = window.innerWidth;
      const gridWidth = gridRef.current.offsetWidth;
      if (w - gridWidth >= helpPanelWidth + minRightMargin) setHelpOverlay(true);else setHelpOverlay(false);
    }
  }, [showHelp, cellSize]);
  function subsetsCounts(cases) {
    const nakedSubsets = selfSufficientSubsets(cases);
    let combosCount = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // de 0 à 9
    if (!nakedSubsets) return;
    console.log('subsetsCounts', nakedSubsets);
    for (const subset of nakedSubsets.selfSufficientSubsets) {
      //if (subset.combo.length === 1) console.log(`{combo: ${JSON.stringify(combo)}}`)
      if (subset.flagged.length) combosCount[subset.combo.length]++;
    }
    return combosCount;
  }
  function nbSubsetNotSingle(cases) {
    const counts = subsetsCounts(cases);
    let nb = 0;
    for (let n = 0; n < counts.length; ++n) {
      if (n === 1 && counts[1]) nb += 10;else nb += counts[n];
    }
    return nb;
  }
  function nbFalseInCases(cases) {
    let nbFalse = 0;
    cases.map(row => row.map(cell => {
      for (let n = 1; n <= 9; ++n) {
        if (!cell.annots.has(-n) && isFalsifiedBySingleDigitChain(cases, cell.i, cell.j, n)) nbFalse++;
      }
    }));
    return nbFalse;
  }

  // Nouvelle grille
  function l_newGame() {
    console.log(' newGame begin');
    let sol,
      newCases = null,
      nbSubset,
      nbFalse;
    const diff = difficulty;
    const nb = true ? 1 : diff === 'facile' ? 200 : diff === 'moyen' ? 100 : diff === 'difficile' ? 5 : 1;
    for (let i = 0; i < (!cases ? 1 : nb); ++i) {
      const {
        grid: gridCases,
        solution
      } = gridAndSolutionWithDifficulty(difficultyMap[difficulty]);
      const {
        isValid,
        flow,
        cases: currentCases
      } = simpleFill(gridCases);
      if (gridIsComplete(currentCases)) {
        i--;
        continue;
      }
      const currentNbSubset = nbSubsetNotSingle(currentCases);
      const currentNbFalse = nbFalseInCases(currentCases);
      console.log(` newGame i:${i} ${currentNbSubset} ${currentNbFalse} (${currentNbSubset + currentNbFalse})`);
      if (!newCases || 0 < currentNbSubset && currentNbSubset <= nbSubset && 0 < currentNbFalse && currentNbFalse <= nbFalse) {
        sol = solution;
        newCases = currentCases;
        nbSubset = currentNbSubset || 10;
        nbFalse = currentNbFalse || 10;
      }
      if (nbSubset && nbFalse && nbSubset + nbFalse < 3) {
        break;
      }
    }
    console.log(` newGame end nbSubset: ${nbSubset} nbFalse: ${nbFalse} (${nbSubset + nbFalse})`);
    setSolution(sol);
    setCases(newCases);
    setHistory([deepCopyCases(newCases)]);
    setFuture([]);
    setSelected([]);
    setHighlighted([]);
    setMessage('');
    setKeep(new GridStateCache());
    setFlow(0);
  }
  this.effect(35, () => {
    l_newGame();
  }, []); // Grille par défaut au départ

  async function handleNewGame_async() {
    if (!(await handleOn_async())) return;
    setOnActivity(2);
    await new Promise(r => setTimeout(r, 50));
    console.log(' handleNewGame begin');
    l_newGame();
    console.log(' handleNewGame end');
    handleMid();
  }

  // Fonction d'importation de sudoku
  function handleAbortImportSudoku() {
    setShowImportModal(false);
    setImportText('');
    setMessage('');
  }

  const gesture = this.selectionGesture ??= new GridSelection((key, toggle) => {
    setSelected(previous => toggle && previous.includes(key)
      ? previous.filter(cell => cell !== key)
      : previous.includes(key) ? previous : [...previous, key]);
  });
  function handleCellPointerDown(i, j, event) {
    if (!event.isPrimary || (gesture.active && gesture.active.id !== event.pointerId)) return;
    handleCellClick(i, j, event);
    if (cases[i][j].given) return;
    gesture.start(event, event.currentTarget.closest('.grid-container'), `${i}${j}`);
  }

  // Clic simple et MAJ+clic conservent leur comportement de sélection :
  // - Clic sur case non sélectionnée : sélectionne uniquement cette case
  // - Clic sans MAJ : sélectionne uniquement cette case, même déjà sélectionnée
  // - Shift+clic sur case non sélectionnée : ajoute à la sélection
  // - Shift+clic sur case sélectionnée : la retire
  function arraysEqual(a, b) {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  function handleCellClick(i, j, e) {
    // Preserve native mouse clicks, including double-clicks on annotations.
    // Touch selection takes priority over scrolling inside the grid.
    if (e.pointerType !== 'mouse') e.preventDefault();
    const isModifier = e.shiftKey || e.ctrlKey || e.metaKey;
    const isTwoFingerTap = e.touches && e.touches.length === 2 || e.button === 2;
    const toogle = isModifier || isTwoFingerTap; // vs selection unique
    if (cases[i][j].given) {
      const n = cases[i][j].found;
      const included = highlighted.includes(n);
      setHighlighted(!toogle ? arraysEqual(highlighted, [n]) ? [] : [n] : highlighted.includes(n) ? highlighted.filter(m => m !== n) : [...highlighted, n]);
    } else {
      const cell = `${i}${j}`;
      const included = selected.includes(cell);
      setSelected(!toogle ? [cell] : selected.includes(cell) ? selected.filter(c => c !== cell) : [...selected, cell]);
    }
    console.log(`handleCellClick ${i}${j}`);
  }

  // Handler pour clic sur une annotation
  async function handleAnnotClick(what, i, j, n, e) {
    // what = [{h, m?=[+-]ijv, ...]
    if (e) e.preventDefault();
    if (!what.length) return;
    e.stopPropagation();
    const h = what[0];
    if (!h.steps) return;
    const steps = h.steps;
    console.log(' handleAnnotClick', {
      i,
      j,
      n
    }, steps, steps.flat());
  }

  // Vérifier
  function handleVerify() {
    if (!solution) setMessage('Aucune solution connue !');else if (areGridsEqual(cases.map(row => row.map(cell => cell.found)), solution)) {
      confetti({
        // Nombre de confettis, Angle de dispersion, Point de départ (0.6 = un peu en dessous du milieu de la page)
        particleCount: 200,
        spread: 100,
        origin: {
          y: 0.6
        }
      });
      setMessage('Bravo ! Sudoku résolu !');
    } else setMessage('Ce n\'est pas la bonne solution.');
  }
  function casesGrid(cases) {
    return cases.map(row => row.map(cell => cell.found));
  }

  // Flow: remplir toutes les cases qui n'ont qu'une annotation non rouge, avec animation

  // Pour une ligne, colonne ou bloc, on regarde les cellules non remplies, avec annotations complètes.
  // Si on trouve un ensemble de taille n de telles cellules et que le nombre de positifs de tout l'ensemble est n :
  // Alors pour toutes les autres cellules, on peut mettre à -n les annotations pour chacun des positifs n trouvés.
  // Si l'annot n'y est pas ou est positive on met une croix rouge sur l'annot.
  // Inversement, si pour un ensemble de chiffres dont les annots sont complétées (en + ou -)sur toutes les cellules de la ligne, colonne ou bloc,
  // si le nombre de ces chiffres est égale au nombre de cellules où ils sont positifs,
  // Alors pour toutes ces cellules, on peut supprimer toutes les autres hypothèses, c'est-à-dire mettre à -h ces hypothèses.
  // Si elle est absente ou positive, on met une croix rouge sur l'annot.
  async function handleFlow_async() {
    if (flow) return;
    setFlow(1);
    await handleOn_async();
    console.log('handleFlow begin');
    const toFill = deductionMovesFromMap(deductionsMap);
    if (toFill.length === 0) {
      console.log('handleFlow end 0');
      handleMid();
      return;
    }
    // Animation: remplir une case toutes les 1s
    console.log('handleFlow toFill', `${toFill.length} moves: ${toFill.join(' ')}`);
    //let localCases = cases
    function animateFill(idx) {
      if (idx >= toFill.length) {
        console.log('handleFlow pre-end');
        setFlow(0);
        console.log('handleFlow end');
        handleMid();
        return;
      }
      fillCase(cases, toFill[idx]);
      updateHistory();
      setTimeout(() => animateFill(idx + 1), 10);
    }
    animateFill(0);
  }

  // Répétition du flow s'il doit continuer
  this.effect(36, () => {
    //console.log('=== useEffect flow', flow)
    //const timer = setTimeout(() => handleFlow(), 250)
    //return () => clearTimeout(timer)
  }, [flow]);
  function updateHistory() {
    if (!cases) return;
    if (!history || history.length === 0) {
      setHistory([deepCopyCases(cases)]);
      setFuture([]);
      return;
    }
    if (areGridsEqual(history[history.length - 1], cases)) return;
    setHistory(h => [...h, deepCopyCases(cases)]);
    setFuture([]);
  }

  // handleErase - Si Delete (suppr), efface la case ET les annotations, Si Backspace, efface seulement la case (found)
  async function handleErase_async({
    onlyFound = false
  } = {}) {
    if (!(await handleOn_async())) return;
    selected.forEach(sel => {
      const i = parseInt(sel[0]);
      const j = parseInt(sel[1]);
      const cell = cases[i][j];
      if (!cell.given) {
        cell.found = 0;
        if (!onlyFound) cell.annots.clear();
      }
    });
    updateHistory();
    handleMid();
  }
  async function handleInput_async(num) {
    if (!(await handleOn_async())) return;
    console.log('handleInput', num, selected);
    selected.forEach(sel => fillCase(cases, `${annotateMode}${sel}${num}`, true));
    updateHistory();
    handleMid();
  }

  // Double-clic sur une annotation unique ou flowable : remplir la case
  async function handleAnnotDoubleClick(what, i, j, n, e) {
    // what = [{h, m?=[+-]ijv, ...]
    if (e) e.preventDefault();
    if (gesture.suppressDoubleClick) return;
    if (!(await handleOn_async())) return;
    for (const w of what) {
      if (w.m) {
        console.log(' handleAnnotDoubleClick', w);
        fillCase(cases, w.m);
        updateHistory();
        break;
      }
    }
    handleMid();
  }

  // Saisie clavier: undo/redo annotateMode, chiffre erase
  async function handleKeyDown_async(e) {
    if (!e) return;
    if (showImportModal) return;
    e.preventDefault();
    console.log(`=== onKeyDown ${e.key} history ${history.length} future ${future.length} ${selected.length} selected ${selected}`);
    if ((e.key === 'Escape' || e.key === 'ArrowLeft') && history.length > 1) {
      if (await handleOn_async()) {
        const present = history[history.length - 1];
        const prev = history[history.length - 2];
        setFuture(f => [present, ...f]);
        setCases(deepCopyCases(prev));
        setHistory(h => h.slice(0, -1));
        handleMid();
      }
    } else if (e.key === 'ArrowRight' && future.length > 0) {
      if (await handleOn_async()) {
        const next = future[0];
        setHistory(h => [...h, next]);
        setCases(deepCopyCases(next));
        setFuture(f => f.slice(1));
        handleMid();
      }
    } else if (e.key === '+') setAnnotateMode('?');else if (e.key === '-') setAnnotateMode('-');else if (e.key === '=') setAnnotateMode('+');else if (selected.length === 0) return;else if ('1' <= e.key && e.key <= '9') await handleInput_async(Number(e.key));else if (e.key === 'Backspace') await handleErase_async({
      onlyFound: true
    });else if (e.key === 'Delete') await handleErase_async();
  }
  const [inputKey, setInputKey] = this.state(37, null);
  this.effect(38, () => {
    //console.log('=== useEffect addEventListener')
    window.addEventListener('keydown', setInputKey);
    return () => {
      //console.log('=== useEffect removeEventListener');
      window.removeEventListener('keydown', setInputKey);
    };
  }, []); // Dépendance vide pour n'ajouter l'event listener qu'une fois
  this.effect(39, () => {
    (async () => {
      //console.log('=== useEffect inputKey on', inputKey)
      if (inputKey && !inputKey.repeat) {
        await handleKeyDown_async(inputKey);
        setInputKey(null);
      }
    })();
  }, [inputKey]);
  this.effect(40, () => {
    //console.log('=== useEffect selected', JSON.stringify(selected))
  }, [selected]);

  // Affichage grille + annotations
  // nakedSubsets = {selfSufficientSubsets: [good], flagged: [flag]}
  // good = {type, index, combo, nonnegsUnion, flagged: [flag]}
  // flag = { i, j, n, combos: [combo] }
  // combo = [{ idx, i, j, nonnegs }]
  function renderCell(i, j, deductionMap) {
    const cell = cases[i][j];
    const isGiven = cell.given;
    const isSelected = selected.includes(`${i}${j}`);
    const highlight = highlighted.includes(cell.found);
    const hasConflict = !candidateIsValid(cases, i, j, cell.found);
    const caseDeductions = new Map();
    for (const [key, value] of deductionMap.entries()) {
      if (key.startsWith(`${i}${j}`)) caseDeductions.set(key, value);
    }
    const deductionsFor = (i, j, n, h_or_hs) => {
      if (hasConflict) return [];
      const k = `${i}${j}${n}`;
      const arr = caseDeductions.get(k);
      return !arr ? [] : h_or_hs === 'all' ? arr : arr.filter(d => Array.isArray(h_or_hs) ? h_or_hs.some(h => d.h.startsWith(h)) : d.h.startsWith(h_or_hs));
    };
    const inCombos = deductionsFor(i, j, 0, 'SelfSufficientSubset');
    const isPartOfCombo = inCombos.length > 0;
    const cellCombo = inCombos.length > 1 ? ' combo-2' : inCombos.length === 1 ? ' combo-1' : '';
    return html`<div data-cell=${`${i}${j}`} class=${`cell${isGiven ? ' given' : ''}${isSelected && !isGiven ? ' selected' : ''}${highlight ? ' highlight' : ''}${hasConflict ? ' conflict' : ''}${cellCombo}`} style=${styleMap(cssStyle({
      width: cellSize,
      height: cellSize,
      fontSize: cellSize * 0.45
    }))} @pointerdown=${e => handleCellPointerDown(i, j, e)} tabindex=${0}>${cell.found !== 0 ? html`<span class=${isGiven ? 'given' : 'user'}>${cell.found}</span>` : cell.annots.size > 0 ? html`<div class=${"annotations"}>${[0, 1, 2].map(rowIdx => html`<div class=${"annot-row"}>${[1, 2, 3].map(colIdx => {
      const n = rowIdx * 3 + colIdx;
      const combo = isPartOfCombo ? ' annot-in-combo' : '';
      const annotConflict = cell.annots.has(n) && !candidateIsValid(cases, i, j, n);
      const conflict = annotConflict ? ' annot-conflict' : '';
      const annotHighlight = highlighted.includes(n);
      const highlight = annotHighlight ? ' annot-highlight' : '';
      const annotSelfSufficientSingles = deductionsFor(i, j, n, 'SelfSufficientSingle');
      const annotIsSelfSufficientSingle = annotSelfSufficientSingles.length > 0;
      const found = annotIsSelfSufficientSingle ? ' annot-found' : '';
      const annotIsFlagged = deductionsFor(i, j, n, 'SelfSufficientSubset:flag').length > 0;
      const flag = annotIsFlagged ? ' annot-flag' : '';
      const annotExclusiveSingles = deductionsFor(i, j, n, 'ExclusiveSingle');
      const annotIsExclusiveSingle = annotExclusiveSingles.length > 0;
      const annotExclusiveSingleType = !annotIsExclusiveSingle ? '' : annotExclusiveSingles[0].types[0];
      const alone = annotIsExclusiveSingle ? ' annot-alone-' + annotExclusiveSingleType : '';
      const annotExclusiveInters = deductionsFor(i, j, n, 'ExclusiveIntersection');
      const annotIsExclusiveInter = annotExclusiveInters.length > 0;
      const inter = annotIsExclusiveInter ? ' annot-inter-neg' : '';
      const isPositive = cell.annots.has(n);
      const annotFalsifiedBySingleDigitChains = !isPositive ? [] : deductionsFor(i, j, n, 'FalsifiedBySingleDigitChain');
      const annotIsFalsifiedBySingleDigitChain = annotFalsifiedBySingleDigitChains.length > 0;
      const digitChain = annotIsFalsifiedBySingleDigitChain ? ' annot-digit-chain' : '';
      const hForChain = ['FalsifiedByChain:shortest', 'FalsifiedByChain']; // FalsifiedByChain2|...|7:+|-
      const h = hForChain[0];
      const annotFalsifiedByChains = !isPositive ? [] : deductionsFor(i, j, n, hForChain);
      const annotIsFalsifiedByChain = annotFalsifiedByChains.length > 0;
      //if (annotIsFalsifiedByChain) console.log(' annotFalsifiedByChain', annotFalsifiedByChains[0].m, annotFalsifiedByChains)
      const chain = annotIsFalsifiedByChain ? ' annot-chain-' + (annotFalsifiedByChains[0].m[0] === '+' ? 'pos' : 'neg') : '';
      const annotConsensusEliminations = deductionsFor(i, j, n, 'ConsensusElimination');
      const annotIsConsensusElimination = annotConsensusEliminations.length > 0;
      const consensus = annotIsConsensusElimination ? ' annot-consensus-' + (annotConsensusEliminations[0].m[0] === '+' ? 'pos' : 'neg') : '';
      const more = deductionsFor(i, j, n, 'all');
      const isNegative = cell.annots.has(-n);
      const negOpacity = !isNegative ? 0 : cell.annots.has(-10 - n) ? 1 : showNegativeAnnot ? 0.2 : 0;
      const posOpacity = !isPositive ? 0 : cell.annots.has(10 + n) ? 1 : showPositiveAnnot || more.length > 0 ? 0.7 : 0;
      if (isPositive) {
        return html`<span class=${`annot clickable${highlight}${conflict} ${consensus}${chain}${digitChain}${combo}${inter}${flag}${alone}${found}`} style=${styleMap(cssStyle({
          opacity: posOpacity,
          cursor: 'pointer'
        }))} @click=${e => handleAnnotClick(more, i, j, n, e)} @dblclick=${e => handleAnnotDoubleClick(more, i, j, n, e)}>${n}</span>`;
      }
      if (isNegative) {
        return html`<span class=${"annot annot-crosss"} style=${styleMap(cssStyle({
          opacity: negOpacity
        }))}>${AnnotHole({
          children: []
        })}</span>`;
      }
      // Sinon : annotation non posée
      /*return (
        <span
          key={n}
          className={`annot${conflict} ${consensus}${chain}${digitChain}${combo}${inter}${flag}${alone}${found}`}
          onClick={e => handleAnnotClick(more, i, j, n, e)}
          onDoubleClick={ (e) => handleAnnotDoubleClick(more, i, j, n, e) }
        ><span style={{opacity: isPartOfCombo || annotIsFlagged ? 0.4 : 0.2}}>{isPartOfCombo || annotIsFlagged ? n : '.'}</span></span>
      )*/
    })}</div>`)}</div>` : null}</div>`;
  }
  if (!cases) return null;
  const handleHeuristiqueButton = setter => async () => {
    if (await handleOn_async()) {
      setter(prev => !prev);
      handleMid();
    }
  };
  return html`<div class=${"sudoku-app"} style=${styleMap(cssStyle({
    width: '100%',
    display: 'block'
  }))}>${html`<div style=${styleMap(cssStyle({
    width: cellSize * 9,
    minWidth: 270,
    margin: '0 auto',
    padding: 10
  }))}>${html`<div class=${"grid-container"} ${ref(el => gridRef.current = el)} style=${styleMap(cssStyle({
    minWidth: cellSize * 9,
    minHeight: cellSize * 9
  }))} @mousedown=${e => e.preventDefault()}
    @lostpointercapture=${e => gesture.end(e)}
    @contextmenu=${e => e.preventDefault()}>${SudokuGrid({
    cellSize: cellSize,
    renderCell: renderCell,
    deductionMap: deductionsMap,
    children: []
  })}</div>`}${html`<div id=${"activity-viewer"} class=${`activity-viewer ${onActivity ? '' : 'is-off'}`}>${html`<div class=${"slider"}>${html`<div class=${"segment"}></div>`}</div>`}</div>`}${html`<div style=${styleMap(cssStyle({
    height: 30,
    textAlign: 'center',
    color: message.startsWith('Bravo') ? 'green' : 'red',
    fontWeight: 'bold',
    fontSize: 20,
    marginTop: 0,
    marginBottom: 0
  }))}>${message}</div>`}${TopButtonRow({
    cellSize: cellSize,
    difficulty: difficulty,
    setDifficulty: setDifficulty,
    handleNewGame: handleNewGame_async,
    handleImportGame: () => setShowImportModal(true),
    handleVerify: handleVerify,
    annotateMode: annotateMode,
    setAnnotateMode: setAnnotateMode,
    handleErase: handleErase_async,
    style: {
      width: '100%'
    },
    loading: onActivity === 2,
    children: []
  })}${html`<div class=${"fill-row"} style=${styleMap(cssStyle({
    display: 'flex',
    marginTop: 6,
    marginBottom: 6,
    width: '100%'
  }))}>${html`<button @click=${() => setShowHelp(s => !s)} class=${"fill-btn"} style=${styleMap(cssStyle({
    fontSize: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 10px 0px 10px'
  }))} title=${"Aide Sudoku"}>${html`<span style=${styleMap(cssStyle({
    display: 'content',
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: '26px',
    fontWeight: 'bold',
    fontFamily: 'Arial'
  }))}>${"\u24D8"}</span>`}</button>`}${FillButton({
    isOn: showNegativeAnnot,
    setOn: setShowNegativeAnnot,
    title: "Afficher les annotations négatives",
    icon: PaintBucketMinusIcon({
      size: 26,
      children: []
    }),
    children: []
  })}${FillButton({
    isOn: showPositiveAnnot,
    setOn: setShowPositiveAnnot,
    title: "Afficher les annotations positives",
    icon: PaintBucketPlusIcon({
      size: 26,
      children: []
    }),
    children: []
  })}${FillButton({
    isOn: showSelfSufficientSingle,
    setOn: handleHeuristiqueButton(setShowSelfSufficientSingle),
    title: "Afficher les cases autosuffisantes",
    icon: CellHypothesisIcon({
      size: 20,
      children: []
    }),
    children: []
  })}${FillButton({
    isOn: showExclusiveSingle,
    setOn: handleHeuristiqueButton(setShowExclusiveSingle),
    title: "Afficher les singletons cachés",
    icon: UnitHypothesisIcon({
      size: 20,
      children: []
    }),
    children: []
  })}${FillButton({
    isOn: showSelfSufficientSubset,
    setOn: handleHeuristiqueButton(setShowSelfSufficientSubset),
    title: "Afficher les sous-ensembles autosuffisants",
    icon: NakedSetsIcon({
      size: 26,
      children: []
    }),
    children: []
  })}${FillButton({
    isOn: showExclusiveIntersection,
    setOn: handleHeuristiqueButton(setShowExclusiveIntersection),
    title: "Afficher les intersections exclusives",
    icon: ExclusiveIntersectionIcon({
      size: 35,
      children: []
    }),
    children: []
  })}${FillButton({
    isOn: showSimpleContradictions,
    setOn: handleHeuristiqueButton(setShowSimpleContradictions),
    title: "Afficher les hypothèses sur un chiffre menant à une contradiction",
    icon: SimpleContradictionIcon({
      size: 24,
      children: []
    }),
    children: []
  })}${FillButton({
    isOn: showConsensusElimination,
    setOn: handleHeuristiqueButton(setShowConsensusElimination),
    title: "Afficher les éliminations par concensus",
    icon: DoubleFlowIcon({
      size: 30,
      children: []
    }),
    children: []
  })}${FillButton({
    isOn: showContradiction,
    setOn: handleHeuristiqueButton(setShowContradiction),
    title: "Afficher l'hypothèse la plus simple menant à une contradiction",
    icon: ContradictionIcon({
      size: 24,
      children: []
    }),
    children: []
  })}${html`<button @click=${handleFlow_async} style=${styleMap(cssStyle({
    flex: 1
  }))} class=${"fill-btn"}>${"Flow"}</button>`}</div>`}${html`<div class=${"numpad-row"} style=${styleMap(cssStyle({
    display: 'flex',
    marginTop: 6,
    width: '100%'
  }))}>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => html`<button style=${styleMap(cssStyle({
    flex: 1,
    fontSize: 18
  }))} @click=${() => handleInput_async(n)}>${n}</button>`)}</div>`}</div>`}${HelpOverlay({
    visible: showHelp,
    onClose: () => setShowHelp(false),
    children: []
  })}${showImportModal ? ImportModal({
    handleAbortImportSudoku: handleAbortImportSudoku,
    handleImportSudoku: handleImportSudoku_async,
    importText: importText,
    setImportText: setImportText,
    currentGrid: cases ? cases.map(row => row.map(cell => cell.found || 0)) : null,
    children: []
  }) : null}</div>`;
}
export class SudokuApp extends StatefulElement {
  render() { return this.renderState(renderApp); }
  disconnectedCallback() {
    this.selectionGesture?.cancel();
    super.disconnectedCallback();
  }
}
customElements.define('sudoku-app', SudokuApp);
