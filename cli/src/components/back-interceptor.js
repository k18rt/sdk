/**
 * back-interceptor.js
 * Remplace le composant React <BackInterceptor /> de AppConfig.js
 *
 * En React c'était un composant sans rendu qui utilisait useEffect.
 * En Lit, le pattern idiomatic pour une logique "sans rendu" est
 * un Reactive Controller (https://lit.dev/docs/composition/controllers/).
 *
 * Usage dans un LitElement :
 *   import { BackInterceptorController } from './back-interceptor.js'
 *
 *   class PageLayout extends LitElement {
 *     #backInterceptor = new BackInterceptorController(this)
 *   }
 *
 * Le controller gère seul son cycle de vie (host.addController).
 */

import { globalStore } from '../core/global-store.js'

export class BackInterceptorController {
  #host        // l'élément Lit qui l'héberge
  #handler     // référence stable pour removeEventListener

  constructor(host) {
    this.#host = host
    host.addController(this)
  }

  // ── Cycle de vie du Controller ────────────────────────────────────────────

  /**
   * Appelé quand l'élément hôte est connecté au DOM.
   * Équivalent du useEffect(() => { … }, [globalCurrentPathNames]) de React.
   */
  hostConnected() {
    this.#setupHistoryEntry()
    this.#handler = (e) => this.#handlePopState(e)
    window.addEventListener('popstate', this.#handler)

    // Se re-synchronise quand le store change (chemin de navigation)
    this._onStoreChange = () => this.#setupHistoryEntry()
    globalStore.addEventListener('change', this._onStoreChange)
  }

  /** Équivalent du cleanup du useEffect */
  hostDisconnected() {
    window.removeEventListener('popstate', this.#handler)
    globalStore.removeEventListener('change', this._onStoreChange)
  }

  // ── Logique de navigation ─────────────────────────────────────────────────

  #url() {
    const cleanUrl = `${location.origin}${location.pathname}`
    if (globalStore.isHomePage) return cleanUrl
    const link = globalStore.currentPathNames.slice(1).join('')
    return link ? `${cleanUrl}?${link}` : cleanUrl
  }

  #setupHistoryEntry() {
    const link = globalStore.isHomePage
      ? ''
      : globalStore.currentPathNames.slice(1).join('')
    window.history.pushState({ sudukuGuarded: link }, '', this.#url())
  }

  #handlePopState() {
    // Retire l'écouteur le temps de traiter l'événement (évite la récursion)
    window.removeEventListener('popstate', this.#handler)

    if (globalStore.isHomePage) {
      // Sur la home : on laisse naviguer mais on remet un état pour la prochaine fois
      window.history.pushState(
        { sudukuGuarded: globalStore.currentPathNames.join('') },
        '',
        this.#url()
      )
    } else {
      // Pas sur la home : on remonte d'un niveau et on annule le retour navigateur
      globalStore.removeLastPage()
      window.history.pushState(
        { sudukuGuarded: globalStore.currentPathNames.join('') },
        '',
        this.#url()
      )
    }

    // Réinstalle l'écouteur
    window.addEventListener('popstate', this.#handler)
  }
}
