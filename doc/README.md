# Let's play Sudoku — Migration React → LitElement

## Structure du projet

```
sudoku-lit/
├── index.html                    ← point d'entrée HTML (remplace public/index.html)
├── vite.config.js                ← config Vite (aucun plugin requis pour Lit)
├── package.json
└── src/
    ├── main.js                   ← entrée JS (remplace src/index.js)
    ├── styles/
    │   ├── main.css              ← identique (variables CSS, utilitaires)
    │   └── app.css               ← identique (classes sudoku spécifiques)
    ├── store/
    │   ├── global-store.js       ← remplace GlobalContext + GlobalContextProvider
    │   └── app-config-store.js   ← remplace AppConfigContext + AppConfigProvider
    └── components/
        ├── back-interceptor.js   ← remplace <BackInterceptor /> (Reactive Controller)
        ├── sudoku-header.js      ← remplace <Header> + <AppIcon>
        ├── resizable-panel.js    ← remplace <Resizable> + ResizableContext
        ├── grid-controls.js      ← remplace <GridControls>
        ├── sudoku-app.js         ← remplace <App> (App.js)
        ├── ui-elements.js        ← remplace ButtonIcon + LinkToPage (Some.js)
        └── page-layout.js        ← remplace PageLayout + Layout (index.js)
    └── pages/
        ├── index.js              ← tous les composants de page
        ├── home-page.js
        ├── don-page.js
        ├── plan-page.js
        ├── grilles-page.js
        ├── decouverte-page.js
        └── singleton-cache-page.js
```

## Démarrage

```bash
npm install
npm run dev
```

## Table de correspondance React → LitElement

### Gestion d'état

| React | LitElement |
|-------|-----------|
| `useState(x)` | `static properties = { _x: { state: true } }` + `this._x = x` |
| `useEffect(fn, [deps])` | `updated(changedProps)` ou `connectedCallback` |
| `useRef(null)` | propriété de classe ordinaire `this._ref` ou `@query()` |
| `useCallback(fn, [])` | méthode de classe ordinaire |

### Contexte

| React | LitElement |
|-------|-----------|
| `createContext` + `Provider` | Store singleton `class Store extends EventTarget` |
| `useContext(ctx)` | `import { store } from './store.js'` |
| Re-rendu sur changement de contexte | `store.addEventListener('change', () => this.requestUpdate())` |
| `AppConfigProvider` | `appConfigStore` (singleton) |
| `GlobalContextProvider` | `globalStore` (singleton) |

### Composants et rendu

| React | LitElement |
|-------|-----------|
| `function Comp() { return <JSX> }` | `class Comp extends LitElement { render() { return html\`...\` } }` |
| `{children}` | `<slot></slot>` |
| Props | `static properties = { prop: { type: String } }` |
| `className="foo"` | `class="foo"` |
| `onClick={handler}` | `@click=${handler}` |
| `style={{ color: 'red' }}` | `style="color:red"` ou`` style=${`color:${val}`} `` |
| Fragments `<>…</>` | `html\`...\`` (pas de wrapper requis) |

### Cycle de vie

| React Hook | LitElement |
|------------|-----------|
| `useEffect(() => fn, [])` (mount) | `connectedCallback()` |
| `useEffect(() => fn, [a,b])` | `updated(changedProps)` + `if(changedProps.has('_a'))` |
| `useEffect(() => { return cleanup }, [])` | `disconnectedCallback()` |
| `useEffect(() => { return cleanup }, [x])` | `updated()` avec gestion manuelle du cleanup |

### Logique "sans rendu" (BackInterceptor)

En React, c'était un composant qui retournait `null`. En Lit, le pattern
idiomatic est un **Reactive Controller** :

```js
// Création
this.#backInterceptor = new BackInterceptorController(this)
// Le controller gère connectedCallback/disconnectedCallback automatiquement
// via host.addController(this) dans le constructeur du controller.
```

### Shadow DOM et styles globaux

Les styles CSS globaux (`.pg-container`, `.bi-active`, etc.) ne traversent
**pas** la frontière Shadow DOM sauf pour les variables CSS custom (`--terracotta-*`).

**Stratégie adoptée** :
- Composants **avec** Shadow DOM : `SudokuHeader`, `ResizablePanel` → styles
  redéclarés dans `static styles = css\`...\``
- Composants **sans** Shadow DOM : `GridControls`, pages, `ButtonIcon`,
  `LinkToPage`, `PageLayout` → `createRenderRoot() { return this }`
  → héritent de tous les styles globaux

### Routage (navigation interne)

`globalStore` remplace entièrement le système de contexte/état React :

```js
globalStore.addPage('plan1')     // équivalent globalAddPage('plan1')
globalStore.removeLastPage()     // équivalent globalRemoveLastPage()
globalStore.currentTag           // 'plan-page', 'home-page', etc.
globalStore.currentPathNames     // ['home', 'Parcours', 'Découverte']
```

`BackInterceptorController` intercepte le bouton ← du navigateur, exactement
comme le faisait `<BackInterceptor />` en React.
