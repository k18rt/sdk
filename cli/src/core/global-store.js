/**
 * global-store.js
 * Remplace GlobalContext + GlobalContextProvider de AppConfig.js
 *
 * Pattern : store singleton basé sur EventTarget.
 * Les composants Lit s'y abonnent dans connectedCallback / disconnectedCallback
 * et se mettent à jour via this.requestUpdate() lorsque le store émet 'change'.
 *
 * Équivalent React :
 *   useState  → propriétés privées du store
 *   setState  → méthodes du store + this.#notify()
 *   useContext / useGlobalContext → import { globalStore } from './global-store.js'
 */

const PAGE_COMPONENTS = {
  home:    { name: 'home',              tag: 'home-page'           },
  don:     { name: 'Don',               tag: 'don-page'            },
  plan:    { name: 'Parcours',          tag: 'plan-page'           },
  grilles: { name: 'Grilles',           tag: 'grilles-page'        },
  plan1:   { name: 'Découverte',        tag: 'decouverte-page'     },
  plan2:   { name: 'Singleton caché',   tag: 'singleton-cache-page'},
}

class GlobalStore extends EventTarget {
  // État interne – équivalent de useState(['home'])
  #currentPath = ['home']

  // ── Getters (lecture de l'état) ──────────────────────────────────────────

  /** Tableau des clés de page (ex. ['home', 'plan']) */
  get currentPath() {
    return [...this.#currentPath]
  }

  /** Tableau des labels affichables (ex. ['home', 'Parcours']) */
  get currentPathNames() {
    return this.#currentPath.map(p => PAGE_COMPONENTS[p]?.name ?? p)
  }

  /** true si on est sur la page d'accueil uniquement */
  get isHomePage() {
    return this.#currentPath.length === 1
  }

  /** Tag HTML du composant courant (dernière page) */
  get currentTag() {
    const key = this.#currentPath[this.#currentPath.length - 1]
    return PAGE_COMPONENTS[key]?.tag ?? 'home-page'
  }

  // ── Mutations (équivalent des setters React) ─────────────────────────────

  /** Équivalent de globalAddPage */
  addPage(page) {
    if (!PAGE_COMPONENTS[page]) return
    this.#currentPath = [...this.#currentPath, page]
    this.#notify()
  }

  /**
   * Équivalent de globalRemoveLastPage
   * @returns {boolean} true si la navigation a eu lieu
   */
  removeLastPage() {
    if (this.#currentPath.length <= 1) return false
    this.#currentPath = this.#currentPath.slice(0, -1)
    this.#notify()
    return true
  }

  // ── Notification ─────────────────────────────────────────────────────────

  #notify() {
    this.dispatchEvent(new CustomEvent('change', {
      detail: {
        path:      this.currentPath,
        pathNames: this.currentPathNames,
        isHome:    this.isHomePage,
        tag:       this.currentTag,
      }
    }))
  }
}

// Singleton exporté – tous les composants partagent la même instance
export const globalStore = new GlobalStore()

// ── Mixin utilitaire ────────────────────────────────────────────────────────
/**
 * GlobalStoreMixin(Base)
 * Injecte dans n'importe quel LitElement l'abonnement automatique au store.
 *
 * Usage :
 *   class MyElement extends GlobalStoreMixin(LitElement) { ... }
 *   // this.globalStore est disponible, requestUpdate() est appelé auto.
 */
export const GlobalStoreMixin = (Base) => class extends Base {
  get globalStore() { return globalStore }

  #onStoreChange = () => this.requestUpdate()

  connectedCallback() {
    super.connectedCallback()
    globalStore.addEventListener('change', this.#onStoreChange)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    globalStore.removeEventListener('change', this.#onStoreChange)
  }
}
