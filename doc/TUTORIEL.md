# Tutoriel — Let's Play Sudoku (Lit)

Guide complet pour comprendre le projet et poursuivre son développement.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Structure du projet](#2-structure-du-projet)
3. [Démarrage rapide](#3-démarrage-rapide)
4. [Le moteur Sudoku](#4-le-moteur-sudoku)
   - 4.1 Types de données
   - 4.2 grids.js — la base de grilles
   - 4.3 sudoku-generator.js — parsing et génération
   - 4.4 resolve.js — résolution et heuristiques
5. [Le système de store](#5-le-système-de-store)
   - 5.1 globalStore — navigation
   - 5.2 appConfigStore — config de grille
   - 5.3 Les Mixins
6. [Architecture des composants](#6-architecture-des-composants)
   - 6.1 Arbre de composants
   - 6.2 index.html + main.js — point d'entrée
   - 6.3 page-layout — le shell
   - 6.4 sudoku-app — le moteur de jeu
   - 6.5 Les composants utilitaires
7. [Les pages](#7-les-pages)
   - 7.1 home-page
   - 7.2 plan-page
   - 7.3 grilles-page
   - 7.4 don-page (Stripe)
   - 7.5 Lesson pages : decouverte + singleton-cache
   - 7.6 lesson-base.js — la classe de base partagée
8. [Conventions clés](#8-conventions-clés)
9. [Tests avec Vitest](#9-tests-avec-vitest)
10. [Script de maintenance build-grids.js](#10-script-de-maintenance-build-gridsjs)
11. [Recettes de développement](#11-recettes-de-développement)
    - 11.1 Ajouter une page
    - 11.2 Ajouter une leçon
    - 11.3 Ajouter une heuristique
    - 11.4 Ajouter une grille dans la base

---

## 1. Vue d'ensemble

L'application est un **jeu de Sudoku pédagogique** avec des pages de cours intégrées. Elle a été migrée de React vers **LitElement** (Web Components natifs). Le stack est :

| Couche | Techno |
|---|---|
| Composants UI | LitElement 3 (Web Components) |
| Bundler | Vite 5 |
| Tests | Vitest |
| Styles | CSS custom properties (pas de framework) |
| Paiement | Stripe (page don) |
| Modules | ES Modules (`"type": "module"`) |

**Ce que l'app fait :**
- Jouer au Sudoku (grilles pré-enregistrées ou générées à la volée)
- Afficher des aides visuelles basées sur des techniques de résolution (heuristiques)
- Enseigner les techniques via des pages de cours interactives (leçons)
- Accepter des dons via Stripe

**Ce que la migration React → Lit a changé :**
- `useState` → propriétés réactives `static properties = { _x: { state: true } }`
- `useContext` → singletons `globalStore` / `appConfigStore`
- `useEffect` → `connectedCallback` / `updated(changedProps)`
- JSX → `html\`\`` de Lit
- `ReactDOM.render` → balise HTML `<page-layout>` dans index.html

---

## 2. Structure du projet

```
sudoku-lit/
├── index.html                    ← Point d'entrée HTML (1 balise : <page-layout>)
├── package.json                  ← "type": "module", Vite, Lit, Stripe
├── vite.config.js
│
└── src/
    ├── main.js                   ← Entrée JS : importe les CSS et page-layout
    │
    ├── styles/
    │   ├── main.css              ← Reset, variables CSS (--terracotta-xxx, --radius-lg…)
    │   └── app.css               ← Styles partagés des pages
    │
    ├── store/                    ← État global (remplace React Context)
    │   ├── global-store.js       ← Navigation entre pages
    │   └── app-config-store.js   ← Grille à charger depuis une leçon
    │
    ├── components/               ← Composants "infrastructure"
    │   ├── page-layout.js        ← Shell : header + resizable-panel + page courante
    │   ├── sudoku-app.js         ← Le jeu Sudoku complet (grille + heuristiques)
    │   ├── sudoku-header.js      ← Header avec breadcrumb et navigation
    │   ├── resizable-panel.js    ← Panneau redimensionnable (drag)
    │   ├── back-interceptor.js   ← Interception bouton retour navigateur
    │   └── ui-elements.js        ← Petits composants (boutons, icônes…)
    │
    ├── pages/                    ← Composants de page (montés par page-layout)
    │   ├── home-page.js
    │   ├── plan-page.js
    │   ├── grilles-page.js
    │   ├── don-page.js
    │   ├── lesson-base.js        ← Classe de base partagée par les leçons
    │   ├── decouverte-page.js    ← Leçon 1 : Découverte du Sudoku
    │   └── singleton-cache-page.js ← Leçon 2 : Le singleton caché
    │
    └── sudoku/                   ← Moteur Sudoku (pur JS, sans UI)
        ├── grids.js              ← Base de 96 grilles avec solutions et niveaux
        ├── sudoku-generator.js   ← Parsing texte, génération aléatoire
        ├── resolve.js            ← Moteur de résolution + heuristiques
        ├── resolve.test.js       ← Tests Vitest
        └── build-grids.js       ← Script maintenance (Node, hors app)
```

---

## 3. Démarrage rapide

```bash
# Installation
npm install

# Dev (http://localhost:5173)
npm run dev

# Build de production
npm run build

# Tests unitaires
npx vitest run

# Tests en mode watch
npx vitest

# Maintenance des grilles (Node)
node src/sudoku/build-grids.js
```

**Variables d'environnement** à créer dans `.env.local` si nécessaire :
```
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```
(utilisé dans don-page.js pour initialiser Stripe)

---

## 4. Le moteur Sudoku

Le moteur (`src/sudoku/`) est **indépendant de l'UI**. Il manipule deux types d'objets.

### 4.1 Types de données

**Puzzle** `number[9][9]`
```js
// Grille brute : 0 = case vide, 1-9 = chiffre
[[5,3,0, 0,7,0, 0,0,0],
 [6,0,0, 1,9,5, 0,0,0],
 ...]
```

**Cell** `{ i, j, given, found, annots }`
```js
{
  i: 0,          // ligne (0-8)
  j: 0,          // colonne (0-8)
  given: true,   // true = fait partie de l'énoncé (immuable)
  found: 5,      // chiffre placé (0 = vide)
  annots: Set    // annotations (voir ci-dessous)
}
```

**Annotations** dans `cell.annots` (Set d'entiers) :
```
 n  ∈ [1,9]    → candidat possible (annoté positivement)
-n  ∈ [-9,-1]  → candidat éliminé (annoté négativement)
10+n           → annotation positive posée manuellement par l'utilisateur
-10-n          → annotation négative posée manuellement par l'utilisateur
```

**Move** `string` de 4 caractères `[+-?][i][j][n]`
```
'+034' → placer le chiffre 4 en ligne 0, colonne 3
'-034' → éliminer le candidat 4 en ligne 0, colonne 3
'?034' → toggle annotation manuelle (mode utilisateur)
```

**Grid** `Cell[9][9]` — la grille jouable complète.

---

### 4.2 grids.js — la base de grilles

Fichier de données pur. Exporte une `Map<puzzleKey, { name, sol, win }>` :

```js
import { GRIDS } from './grids.js'

// Chaque entrée :
// key  = chaîne de 81 chiffres (puzzle)
// name = "01" à "96" + "Hard"
// sol  = chaîne de 81 chiffres (solution pré-calculée)
// win  = combinaisons d'heuristiques suffisantes, séparées par " | "
//        ex. "⊗ | ○ ∞ | □ ∞ | ○ □ ✕"
```

**Symboles des heuristiques dans `win` :**

| Symbole | Heuristique | Description |
|---|---|---|
| ○ | selfSufficientSingle | Candidat unique (naked single) |
| □ | exclusiveSingle | Singleton caché (hidden single) |
| ∞ | selfSufficientSubset | Naked subset (paire/triple nue) |
| ✕ | exclusiveIntersection | Pointing pair / box-line reduction |
| ↺ | falsifiedBySingleDigitChain | Nishio / chaîne mono-chiffre |
| ⊗ | falsifiedByChain | Chaîne de contradiction générale |
| ⇄ | consensusElimination | Élimination par consensus |

---

### 4.3 sudoku-generator.js — parsing et génération

```js
import {
  gridFromPuzzle,
  gridFromText,
  gridAndSolutionFromText,
  gridAndSolutionWithDifficulty,
  areGridsEqual,
} from './sudoku-generator.js'
```

**`gridFromPuzzle(puzzle)`** — convertit un `number[9][9]` en `Cell[9][9]`.

**`gridFromText(text)`** — parse 81 chiffres en texte libre, valide, retourne `{ grid, puzzle, error }`.
```js
const { grid, puzzle, error } = gridFromText('530070000 600195000 ...')
if (error) console.error(error)
```

**`gridAndSolutionFromText(text, unique=true)`** — pareil + calcule la solution.
```js
const { grid, solution, error } = gridAndSolutionFromText(puzzleText)
// solution = number[9][9] complet, ou null si pas unique
```
Optimisation : si le puzzle est dans `GRIDS`, la solution est retournée instantanément depuis le cache sans backtracking.

**`gridAndSolutionWithDifficulty(difficulty)`** — génère une grille aléatoire.
```js
const { grid, solution } = gridAndSolutionWithDifficulty(50) // 50 cases vides
```
La difficulté est le nombre de cases vidées. Garantit l'unicité de la solution.

**`areGridsEqual(a, b)`** — compare deux grilles case à case (found + annots).

---

### 4.4 resolve.js — résolution et heuristiques

C'est le module le plus complexe. Il exporte plusieurs familles de fonctions.

#### Remplissage

**`fillAnnotations(cases)`** — calcule et remplit toutes les annotations manquantes.
À appeler après chaque modification pour maintenir la cohérence.
```js
fillAnnotations(cases) // modifie cases en place
```

**`fillCase(cases, move, fromUser=false)`** — applique un Move à la grille.
```js
fillCase(cases, '+034')  // place 4 en (0,3), met à jour les voisins
fillCase(cases, '-034')  // élimine le candidat 4 en (0,3)
fillCase(cases, '+034', true)  // saisie utilisateur (toggle si même chiffre)
```

#### Validité

**`gridIsValid(cases)`** — retourne `false` si un conflit existe ou une case est insoluble.

**`gridIsComplete(cases)`** — retourne `true` si toutes les cases ont un `found > 0`.

**`candidateIsValid(cases, i, j, num)`** — teste si `num` peut aller en `(i,j)`.

#### Déductions

**`deductionMoves(cases, hs, keep)`** — retourne la liste des moves déductibles.
```js
const hs = { selfSufficientSingle: true, exclusiveSingle: true }
const moves = deductionMoves(cases, hs)
// moves = ['+445', '-032', '+657', ...] triés
```
Le paramètre `hs` active/désactive chaque heuristique. `keep` est le cache optionnel.

**`simpleFill(cases, hs, move, keep)`** — applique itérativement les déductions.
```js
const { isValid, flow, steps, moves, cases: casesResult } = simpleFill(cases, hs)
// isValid : la grille est-elle restée cohérente ?
// flow    : nombre total de moves effectués
// steps   : [[move1, move2], [move3], ...] — mouvements par passe
// moves   : steps.flat() — liste plate pratique
// cases   : grille après résolution
```

**`deductions(cases, hs, keep, shouldStop)`** — générateur. Émet les résultats heuristique par heuristique. Utilisé par `sudoku-app` pour l'affichage progressif.

#### Cache

**`GridStateCache`** — mémoïse les résultats de `simpleFill` pour éviter de recalculer les mêmes positions.
```js
const keep = new GridStateCache()
// Passer keep à simpleFill, deductionMoves, etc.
// keep.success() → statistiques
```

#### Heuristiques individuelles

Chaque heuristique a une fonction dédiée si on a besoin de l'appeler isolément :
```js
// Naked subsets
const { selfSufficientSubsets, flagged, map } = selfSufficientSubsets(cases)

// Nishio
const isFalsified = isFalsifiedBySingleDigitChain(cases, i, j, n, keep)
```

#### Méthodes de prototype ajoutées

`resolve.js` ajoute deux méthodes non-énumérables sur les prototypes :
```js
// Sur Object.prototype (utilisable sur toute Cell)
cell.caseUnitsMap(cases, (unit, type, index) => { /* unit = 9 cases */ })

// Sur Array.prototype (utilisable sur toute Grid)
cases.gridUnitsMap((unit, { type, index }) => { /* parcourt les 27 unités */ })
```
Ces méthodes évitent la répétition du code de parcours bloc/ligne/colonne.

---

## 5. Le système de store

Remplace React Context. Deux singletons basés sur `EventTarget`.

### 5.1 globalStore — navigation

```js
import { globalStore } from '../store/global-store.js'

// Lire l'état
globalStore.currentPath      // ['home', 'plan']
globalStore.currentPathNames // ['home', 'Parcours']
globalStore.currentTag       // 'plan-page'
globalStore.isHomePage       // false

// Naviguer
globalStore.addPage('plan')          // pousse une page
globalStore.removeLastPage()         // revient en arrière

// Écouter les changements
globalStore.addEventListener('change', (e) => {
  console.log(e.detail.tag) // tag du nouveau composant
})
```

**Pages enregistrées** dans `PAGE_COMPONENTS` (global-store.js) :

| Clé | Tag HTML | Label |
|---|---|---|
| `home` | `home-page` | home |
| `don` | `don-page` | Don |
| `plan` | `plan-page` | Parcours |
| `grilles` | `grilles-page` | Grilles |
| `plan1` | `decouverte-page` | Découverte |
| `plan2` | `singleton-cache-page` | Singleton caché |

Pour ajouter une page, il faut l'inscrire dans ce dictionnaire.

### 5.2 appConfigStore — config de grille

Transmet une grille depuis une leçon vers le composant `sudoku-app` :
```js
import { appConfigStore } from '../store/app-config-store.js'

// Dans une leçon : charger une grille dans le jeu
appConfigStore.setImportGrid('530070000600195000...')

// sudoku-app écoute 'import-grid-change' et charge la grille
```

### 5.3 Les Mixins

Pour qu'un composant réagisse automatiquement aux changements de store :

```js
import { GlobalStoreMixin } from '../store/global-store.js'
import { AppConfigMixin } from '../store/app-config-store.js'
import { LitElement } from 'lit'

// Un seul store
class MyPage extends GlobalStoreMixin(LitElement) {
  // this.globalStore disponible
  // requestUpdate() appelé automatiquement à chaque changement
}

// Les deux stores
class MyLesson extends AppConfigMixin(GlobalStoreMixin(LitElement)) {
  // this.globalStore + this.appConfigStore disponibles
}
```

Les mixins s'occupent de `addEventListener` dans `connectedCallback` et `removeEventListener` dans `disconnectedCallback`.

---

## 6. Architecture des composants

### 6.1 Arbre de composants

```
<page-layout>                    ← GlobalStoreMixin : réagit aux changements de page
  <sudoku-header>                ← Breadcrumb, navigation retour
  <resizable-panel>              ← Panneau drag-to-resize
    <sudoku-app>                 ← Le jeu Sudoku complet
  </resizable-panel>
  <home-page>                    ← Page courante (selon globalStore.currentTag)
  | <plan-page>
  | <grilles-page>
  |   <grid-controls>
  | <don-page>
  | <decouverte-page>            ← extends LessonBasePage
  | <singleton-cache-page>       ← extends LessonBasePage
```

### 6.2 index.html + main.js — point d'entrée

`index.html` ne contient qu'une balise :
```html
<page-layout></page-layout>
<script type="module" src="/src/main.js"></script>
```

`main.js` importe les CSS globaux et `page-layout.js`. Tous les autres imports sont transitifs : `page-layout` importe les pages, qui importent les stores, etc.

### 6.3 page-layout — le shell

`PageLayout` est le composant racine. Il :
1. Mixe `GlobalStoreMixin` → se re-rend quand la page change
2. N'a **pas de Shadow DOM** (`createRenderRoot() { return this }`) pour que les styles globaux s'appliquent
3. Affiche `sudoku-app` dans un `resizable-panel` flottant à droite
4. Affiche la page courante via `_renderCurrentPage(tag)` (switch sur le tag)

```js
// Ajouter une page ici si on en crée une nouvelle
_renderCurrentPage(tag) {
  switch (tag) {
    case 'ma-nouvelle-page': return html`<ma-nouvelle-page></ma-nouvelle-page>`
    // ...
  }
}
```

### 6.4 sudoku-app — le moteur de jeu

C'est le composant le plus complexe. Il gère :
- La grille active (`_cases`, `_solution`)
- L'historique undo/redo (`_history`, `_future`)
- Les annotations et leur affichage
- Les 7 heuristiques (toggles `_showXxx`)
- L'itération automatique (`_runIteration`, `_onActivity`)
- Le redimensionnement (`_cellSize`, `resizable-panel`)
- L'import de grille via texte (`_showImportModal`) et via leçon (`appConfigStore`)

**Propriétés réactives importantes :**
```js
_cases          // Cell[9][9] — grille courante
_solution       // number[9][9] — solution de référence
_selected       // [i,j] — case sélectionnée
_deductionsMap  // Map — résultat des heuristiques actives
_flow           // number — compteur de déductions auto
_keep           // GridStateCache — cache de mémoïsation
```

**Cycle de vie :**
```
connectedCallback  → écoute appConfigStore
firstUpdated       → récupère le gridRef, écoute resizable-panel
updated(changed)   → déclenche _runIteration si _onActivity === 3
disconnectedCallback → nettoie les listeners et timeouts
```

### 6.5 Les composants utilitaires

**`back-interceptor.js`** — `BackInterceptorController` : Reactive Controller (pattern Lit) qui intercepte `popstate` pour appeler `globalStore.removeLastPage()`.

**`resizable-panel.js`** — Panneau redimensionnable par drag sur les bords. Émet un événement `resize` avec `{ width, height }`.

**`sudoku-header.js`** — Header avec logo, breadcrumb (chemin de pages), et bouton retour. S'abonne à `globalStore` pour afficher le chemin courant.

**`ui-elements.js`** — Petits composants réutilisables (boutons, spinners...).

**`grid-controls.js`** — Composant de sélection de grille (`<grid-controls>`). Utilisé dans `grilles-page`.

---

## 7. Les pages

Toutes les pages partagent ces conventions :
- **Pas de Shadow DOM** : `createRenderRoot() { return this }`
- Styles inlinés dans `render()` via `<style>` (ou classes de `app.css`)
- Navigation via `this.globalStore.addPage('clé')`

### 7.1 home-page

Page d'accueil. Boutons de difficulté → navigate vers `grilles`. Logo SVG. Liens vers `plan`.

```js
_handlePlayClick(difficulty) {
  this.globalStore.addPage('grilles')
  // sudoku-app reçoit la difficulté via appConfigStore (ou prop)
}
```

### 7.2 plan-page

Affiche le parcours pédagogique : 3 phases, 12 semaines, avec des items cliquables.

Les items avec la syntaxe `[texte > page]` dans les données `sudokuPlan` génèrent automatiquement des liens de navigation :
```js
_renderItem(item) {
  // '[Découverte > plan1]' → <a @click=${...}>Découverte</a>
}
```

### 7.3 grilles-page

Wrapper simple autour de `<grid-controls>`. Ce composant affiche la liste des grilles issues de `GRIDS` et permet de les charger dans `sudoku-app` via `appConfigStore.setImportGrid(key)`.

### 7.4 don-page (Stripe)

Intégration Stripe Checkout :
```js
// Stripe est chargé une fois au niveau module
import { loadStripe } from '@stripe/stripe-js'
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)

// Au clic
async _handleStripeClick() {
  const stripe = await stripePromise
  const response = await fetch('http://localhost:4242/create-checkout-session', {
    method: 'POST'
  })
  const session = await response.json()
  await stripe.redirectToCheckout({ sessionId: session.id })
}
```

Nécessite un backend Stripe sur `localhost:4242` (hors du projet Lit).

### 7.5 Lesson pages : decouverte + singleton-cache

Les deux pages de leçon ont la même structure. Elles héritent de `LessonBasePage` et surchargent 4 getters + une méthode de rendu.

### 7.6 lesson-base.js — la classe de base partagée

La classe `LessonBasePage` factorise tout le code commun des leçons.

**Structure d'une leçon** (2 états) :

```
_state === 0  → Vue menu : grille de cartes cliquables
_state > 0    → Vue contenu : barre de navigation + contenu de la carte _state
```

**Interface à implémenter dans une sous-classe :**
```js
class MaLecon extends LessonBasePage {
  get pageTitle()    { return 'Titre de la leçon' }
  get pageSubtitle() { return 'Sous-titre' }
  get menuLabel()    { return 'Label du menu' }
  get cards() {
    return [
      {
        key: 1,
        title: 'Première section',
        description: 'Description courte',
        icon: this._iconOrigami(),       // méthode SVG héritée
        content: this._contentSection1() // méthode de rendu locale
      },
      // ... jusqu'à 6 cartes max
    ]
  }
  _contentSection1() {
    return html`<p>Contenu HTML de la section 1...</p>`
  }
}
```

**Méthodes utilitaires héritées de LessonBasePage :**

```js
// Bouton d'icône cliquable (remplace <ButtonIcon>)
this._bi(type, svgHtml, height, callback)

// Charger une grille dans sudoku-app
this._gridBtn(gridKey)  // retourne un bouton avec le puzzle 81-chiffres

// Lien de navigation vers une page
this._linkTo('texte', 'plan2')

// Boutons précédent/suivant
this._steps(prevCard, nextCard)

// Carte du menu
this._prCard(card)
```

**Icônes SVG héritées :**
```js
this._iconMessageCircleMore()
this._iconMicroscope()
this._iconOrigami()
this._iconSquareStack()
this._iconExperiment()
this._iconMagic()
this._iconStepBack()
this._iconStepForward()
this._iconGrid()
```

---

## 8. Conventions clés

### Pas de Shadow DOM sur les pages

Toutes les pages et `page-layout` désactivent le Shadow DOM :
```js
createRenderRoot() { return this }
```
Raison : les styles de `main.css` et `app.css` doivent s'appliquer directement.
`sudoku-app` conserve son Shadow DOM (`static styles = css\`...\``).

### ES Modules purs

Tous les fichiers utilisent `import`/`export`. Pas de `require`. Le `package.json` a `"type": "module"`.

### Nommage des propriétés réactives

Les propriétés internes (état) sont préfixées par `_` :
```js
static properties = {
  _maValeur: { state: true }
}
```
Les propriétés publiques (attributs) n'ont pas de préfixe :
```js
static properties = {
  initialWidth: { type: Number }
}
```

### Format des Moves

Toujours 4 caractères : `[+-?][0-8][0-8][1-9]`.
Les moves sont des chaînes, jamais des objets.

### Isolation du moteur

`src/sudoku/` ne dépend d'aucun composant Lit. Il est testable indépendamment, réutilisable, et peut tourner dans Node.js (build-grids.js).

---

## 9. Tests avec Vitest

```bash
npx vitest run    # une passe
npx vitest        # mode watch
```

Les tests sont dans `src/sudoku/resolve.test.js`. Ils couvrent :
- `gridAndSolutionFromText` — unicité de solution
- `gridIsValid` — détection de conflits
- `deductionMoves` — selfSufficientSingle
- `GridStateCache` — mémoïsation et reconstruction
- `simpleFill` — sans et avec cache

**Pattern d'un test :**
```js
import { describe, it, expect } from 'vitest'
import { gridAndSolutionFromText } from './sudoku-generator.js'
import { deductionMoves } from './resolve.js'

const PUZZLE = '530070000 600195000 098000060 800060003 400803001 700020006 060000280 000419005 000080079'

describe('deductionMoves — selfSufficientSingle', () => {
  it('devrait retourner 4 moves', () => {
    const { grid: cases } = gridAndSolutionFromText(PUZZLE)
    const moves = deductionMoves(cases, { selfSufficientSingle: true })
    expect(moves).toEqual(['+445', '+657', '+684', '+773'])
  })
})
```

**Attention : isolation des tests.** Chaque `it` doit créer ses propres données (appel à `gridAndSolutionFromText`). Ne pas partager des `cases` mutables entre tests.

Pour ajouter des tests à `resolve.test.js`, s'inspirer des suites existantes. Pour tester `sudoku-generator.js`, importer depuis `./sudoku-generator.js` (chemin relatif au fichier test).

---

## 10. Script de maintenance build-grids.js

Ce script Node.js tourne hors de l'application, uniquement pour maintenir `grids.js`.

```bash
node src/sudoku/build-grids.js
```

**Ce qu'il fait :**

**Étape 1** — Calcule les solutions manquantes. Pour chaque grille avec `sol:""`, lance le backtracking et affiche la ligne complète à copier dans `grids.js`.

**Étape 2** — Découvre les nouvelles combinaisons gagnantes. Pour chaque grille, teste toutes les combinaisons de 7 heuristiques (127 combinaisons) et signale celles qui résolvent la grille mais ne sont pas encore dans `win`.

**Optimisation** : les combinaisons déjà connues (et leurs supersets et subsets) sont skippées grâce à la représentation en masques de bits. En pratique, ~95% des tests sont évités.

**Sortie console** :
```
01 400000805...: known: ⊗ | ○ ∞ | □ ∞ | ○ □ ✕ | □ ✕ ↺ | □ ✕ ⇄
12 060501090...: known: ⊗ | ○ ∞ ⇄ | □ ∞ ⇄     NEW: ○ ∞ ✕ ⇄
```

---

## 11. Recettes de développement

### 11.1 Ajouter une page

**1. Créer le composant** `src/pages/ma-page.js` :
```js
import { LitElement, html } from 'lit'
import { GlobalStoreMixin } from '../store/global-store.js'

class MaPage extends GlobalStoreMixin(LitElement) {
  createRenderRoot() { return this }

  render() {
    return html`
      <div class="pg-container">
        <h1>Ma page</h1>
        <button @click=${() => this.globalStore.addPage('plan')}>
          Voir le parcours
        </button>
      </div>
    `
  }
}
customElements.define('ma-page', MaPage)
```

**2. Enregistrer la page dans `global-store.js`** :
```js
const PAGE_COMPONENTS = {
  // ...existant...
  maPage: { name: 'Ma Page', tag: 'ma-page' },
}
```

**3. Ajouter le cas dans `page-layout.js`** :
```js
// Dans _renderCurrentPage :
case 'ma-page': return html`<ma-page></ma-page>`

// Dans les imports en haut du fichier :
import '../pages/ma-page.js'
```

**4. Naviguer vers la page depuis n'importe quel composant** :
```js
this.globalStore.addPage('maPage')
```

---

### 11.2 Ajouter une leçon

**1. Créer le fichier** `src/pages/ma-lecon-page.js` :
```js
import { LessonBasePage } from './lesson-base.js'
import { html } from 'lit'

class MaLeconPage extends LessonBasePage {
  get pageTitle()    { return 'Titre de ma leçon' }
  get pageSubtitle() { return 'Sous-titre optionnel' }
  get menuLabel()    { return 'Ma Leçon' }

  get cards() {
    return [
      {
        key: 1,
        title: 'Introduction',
        description: 'Une courte description de la section',
        icon: this._iconMicroscope(),
        content: this._contentIntro(),
      },
      {
        key: 2,
        title: 'Pratique',
        description: 'Essayez par vous-même',
        icon: this._iconGrid(),
        content: this._contentPratique(),
      },
    ]
  }

  _contentIntro() {
    return html`
      <div class="pr-content">
        <p>Voici la théorie...</p>
      </div>
    `
  }

  _contentPratique() {
    return html`
      <div class="pr-content">
        <p>Chargez cette grille dans le jeu :</p>
        ${this._gridBtn('530070000600195000098000060800060003400803001700020006060000280000419005000080079')}
      </div>
    `
  }
}
customElements.define('ma-lecon-page', MaLeconPage)
```

**2. Enregistrer dans `global-store.js`** :
```js
plan3: { name: 'Ma Leçon', tag: 'ma-lecon-page' },
```

**3. Ajouter dans `page-layout.js`** (import + switch).

**4. Référencer dans `plan-page.js`** en ajoutant un item dans `sudokuPlan` :
```js
{ text: '[Ma Leçon > plan3]', ... }
```

---

### 11.3 Ajouter une heuristique

Exemple fictif : `hiddenSubset` (sous-ensemble caché).

**Étape 1 — Implémenter dans `resolve.js`** :
```js
// Ajouter la fonction de détection
function hiddenSubsets(cases) {
  const result = new Map()
  // ... logique ...
  return result
}

// Ajouter dans le générateur deductions()
function* deductions(initialCases, hs = ..., keep = null, shouldStop = ...) {
  const { ..., hiddenSubset } = hs
  // ...
  if (hiddenSubset) {
    yield* mergeMaps(hiddenSubsets(cases), 'hiddenSubset')
  }
  // ...
}
```

**Étape 2 — Ajouter le symbole dans `build-grids.js`** :
```js
const heuristicNames = {
  // ...
  hiddenSubset: '⊞',  // choisir un symbole unicode unique
}
const symbolToBit = {
  // ...
  '⊞': 6,  // bit suivant disponible
}
const allHeuristics = [
  // ...
  'hiddenSubset',
]
```

**Étape 3 — Exposer dans `sudoku-app.js`** :
```js
// Ajouter la propriété réactive
static properties = {
  // ...
  _showHiddenSubset: { state: true },
}

// Initialiser dans constructor()
this._showHiddenSubset = false

// Ajouter le bouton dans render()
${FillButton({
  isOn: this._showHiddenSubset,
  setOn: this._heuristicButton(() => { this._showHiddenSubset = !this._showHiddenSubset }),
  title: 'Afficher les sous-ensembles cachés',
  icon: MonIconeSvg({ size: 24 }),
})}

// L'inclure dans l'objet hs passé à deductionMoves / simpleFill
get _activeHeuristics() {
  return {
    selfSufficientSingle: this._showSelfSufficientSingle,
    // ...
    hiddenSubset: this._showHiddenSubset,
  }
}
```

**Étape 4 — Ajouter un test dans `resolve.test.js`** :
```js
describe('deductionMoves — hiddenSubset', () => {
  it('devrait détecter un sous-ensemble caché', () => {
    const { grid: cases } = gridAndSolutionFromText(PUZZLE)
    const moves = deductionMoves(cases, { hiddenSubset: true })
    expect(moves.length).toBeGreaterThan(0)
  })
})
```

---

### 11.4 Ajouter une grille dans la base

**1. Ajouter l'entrée dans `grids.js`** (sol vide pour l'instant) :
```js
["123456789000000000000000000000000000000000000000000000000000000000000000000000000",
 {name:"97", sol:"", win:""}],
```

**2. Calculer la solution et les heuristiques** :
```bash
node src/sudoku/build-grids.js
```
La console affiche la ligne complète avec `sol` et `win` à copier dans `grids.js`.

**3. Copier la ligne** dans `grids.js` et remplacer l'entrée provisoire.

---

## Glossaire

| Terme | Définition |
|---|---|
| **Puzzle** | `number[9][9]` — grille brute avec 0 pour les cases vides |
| **Grid** | `Cell[9][9]` — grille jouable avec annotations |
| **Cell** | `{ i, j, given, found, annots }` — une case avec son état complet |
| **Move** | Chaîne 4 car. `[+-?][i][j][n]` — action sur une case |
| **Annotation** | Entier dans `cell.annots` : positif = candidat, négatif = éliminé |
| **Heuristique** | Technique de résolution logique (naked single, hidden single…) |
| **Flow** | Nombre de moves appliqués lors d'une résolution automatique |
| **Steps** | `Array<Array<Move>>` — moves groupés par passe de résolution |
| **Keep** | `GridStateCache` — cache de mémoïsation pour éviter les recalculs |
| **Store** | Singleton `EventTarget` remplaçant React Context |
| **Mixin** | Fonction `(Base) => class extends Base` injectant des fonctionnalités dans un LitElement |
| **Shadow DOM** | Encapsulation CSS des Web Components. Désactivé sur les pages pour permettre les styles globaux |
