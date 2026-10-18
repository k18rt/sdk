/*** app-config-store.js
 *
 * Utiliser pour importer une grille dans sudoku-app depuis une page.
 *
 * Les composants qui souhaitent réagir aux changements écoutent l'événement
 * 'import-grid-change' sur appConfigStore.
 *
 * Usage :
 *   import { appConfigStore, AppConfigMixin } from './app-config-store.js'
 *
 * Remplace AppConfigContext + AppConfigProvider de AppConfig.js
 *
 * Équivalent React :
 *   const [importGrid, setImportGrid] = useState("")
 *   → appConfigStore.importGrid / appConfigStore.setImportGrid(value)
 */

class AppConfigStore extends EventTarget {
  #importGrid = ''

  get importGrid() {
    return this.#importGrid
  }

  setImportGrid(value) {
    if (this.#importGrid === value) return
    this.#importGrid = value
    this.dispatchEvent(new CustomEvent('import-grid-change', {
      detail: { importGrid: value }
    }))
  }
}

export const appConfigStore = new AppConfigStore()

/**
 * AppConfigMixin(Base)
 * Injecte l'abonnement au store de config dans un LitElement.
 *
 * Usage :
 *   class MyElement extends AppConfigMixin(LitElement) {
 *     // this.appConfigStore disponible
 *   }
 */
export const AppConfigMixin = (Base) => class extends Base {
  get appConfigStore() { return appConfigStore }

  #onConfigChange = () => this.requestUpdate()

  connectedCallback() {
    super.connectedCallback()
    appConfigStore.addEventListener('import-grid-change', this.#onConfigChange)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    appConfigStore.removeEventListener('import-grid-change', this.#onConfigChange)
  }
}
