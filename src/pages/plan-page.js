/**
 * plan-page.js  —  remplace plan.js + plan.css
 *
 * Équivalences React → Lit :
 *   PlanPageStyles (<style>)     → <style> dans render() (pas de Shadow DOM)
 *   plan.css import              → inliné dans le <style> du render()
 *   useGlobalContext()            → GlobalStoreMixin → this.globalStore
 *   globalAddPage(page)           → this.globalStore.addPage(page)
 *
 *   <Pill />                     → méthode _pill(status)
 *   <WeekCard />                 → méthode _weekCard(week)
 *   <PhaseSection />             → méthode _phaseSection(phase)
 *   renderItem(item)             → méthode _renderItem(item)
 *
 * Pas de Shadow DOM :
 *   createRenderRoot() { return this }
 *   → les classes .pg-cards, .pg-card, .pg-container viennent de main.css
 */

import { LitElement, html } from 'lit'
import { GlobalStoreMixin } from '../core/global-store.js'

// ── Données du plan (identiques à React) ──────────────────────────────────
const sudokuPlan = [
  {
    key: 'phase1',
    phaseTitle: 'Phase 1 : Prise en main & méthodes de base',
    duration: 'Semaines 1–3',
    resume: 'Prise en main & méthodes de base',
    weeks: [
      {
        key: '1', title: 'Découverte', page: 'plan1',
        contents: [
          { title: 'Objectifs', items: ['Découvrir le jeu et ses règles', 'Apprendre une première technique'] },
          { title: 'Activités', items: ['Remplir sa première grille', 'Suivre un exemple', 'Pratiquer !'] },
        ],
      },
      {
        key: '2', title: 'Singleton caché', page: 'plan2',
        contents: [
          { title: 'Objectifs', items: ['Apprendre les annotations (candidats) proprement', 'Repérer les uniques par ligne/colonne/bloc', 'Stratégie : du plus certain au plus probable'] },
          { title: 'Activités', items: ['3 grilles faciles avec annotations', 'Corriger 1 grille en comparant avec solution'] },
        ],
      },
      {
        key: '3', title: 'Semaine 3 : Révision Guidée',
        contents: [
          { title: 'Objectifs', items: ['Consolider les règles et la gestion des candidats', 'Résoudre 2–3 grilles faciles sans aide'] },
          { title: 'Activités', items: ['Auto-évaluation + correction d\'erreurs fréquentes'] },
        ],
      },
    ],
  },
  {
    key: 'phase2',
    phaseTitle: 'Phase 2 : Développement',
    duration: 'Semaines 4–7',
    resume: 'Premières heuristiques',
    weeks: [
      { key: '4', title: 'Semaine 4 : Paires Nues & Cachées', contents: [{ title: 'Objectifs', items: ['Maîtriser paires nues / paires cachées', 'Nettoyage des candidats ciblé'] }, { title: 'Activités', items: ['Exercices dédiés + 2 grilles moyennes'] }] },
      { key: '5', title: 'Semaine 5 : Triples & Pointing', contents: [{ title: 'Objectifs', items: ['Triples (nus/cachés), Pointing pairs/box-line'] }, { title: 'Activités', items: ['2–3 grilles moyennes, analyse post-résolution'] }] },
      { key: '6', title: 'Semaine 6 : X-Wing & Basics rapides', contents: [{ title: 'Objectifs', items: ['Comprendre X-Wing (ligne/colonne)', 'Automatiser les basiques (full house, singles)'] }, { title: 'Activités', items: ['1 grille guidée + 2 grilles libres'] }] },
      { key: '7', title: 'Semaine 7 : Autonomie Intermédiaire', contents: [{ title: 'Objectifs', items: ['Résoudre des grilles intermédiaires sans aide', 'Optimiser l\'ordre des techniques'] }, { title: 'Activités', items: ['3 grilles, mesure du temps, récap des erreurs'] }] },
    ],
  },
  {
    key: 'phase3',
    phaseTitle: 'Phase 3 : Approfondissement',
    duration: 'Semaines 8–12',
    resume: 'Des techniques plus avancées',
    weeks: [
      { key: '8',  title: 'Semaine 8 : Swordfish, XY‑Wing',        contents: [{ title: 'Objectifs', items: ['Introduire Swordfish & XY‑Wing', 'Identifier les schémas rapidement'] }, { title: 'Activités', items: ['Grilles ciblées (difficiles)'] }] },
      { key: '9',  title: 'Semaine 9 : Stratégies combinées',       contents: [{ title: 'Objectifs', items: ['Chaîner techniques intermédiaires + avancées'] }, { title: 'Activités', items: ['2 grilles complexes + 1 en conditions réelles'] }] },
      { key: '10', title: 'Semaine 10 : Vitesse & Hygiène d\'erreur',contents: [{ title: 'Objectifs', items: ['Améliorer le timing, réduire les retours arrière'] }, { title: 'Activités', items: ['Chronométrage + revue détaillée'] }] },
      { key: '11', title: 'Semaine 11 : Difficile continu',         contents: [{ title: 'Objectifs', items: ['Autonomie sur grilles « difficiles »'] }, { title: 'Activités', items: ['Suite de grilles + tracking de performance'] }] },
      { key: '12', title: 'Semaine 12 : Projet final',              contents: [{ title: 'Objectifs', items: ['Créer une grille OU défi chronométré public'] }, { title: 'Activités', items: ['Publication/partage + bilan personnel'] }] },
    ],
  },
]

// ── Composant principal ────────────────────────────────────────────────────
export class PlanPage extends GlobalStoreMixin(LitElement) {
  createRenderRoot() { return this }

  // ── Pill – équivalent du composant React <Pill status={...} /> ────────────
  _pill(status) {
    if (!status) return html``
    const config = {
      completed:   { text: 'Complétée',  cls: 'pill-completed'   },
      'in-progress':{ text: 'En cours',  cls: 'pill-in-progress' },
      upcoming:    { text: 'À venir',    cls: 'pill-upcoming'    },
    }[status]
    if (!config) return html``
    return html`<span class="pill ${config.cls}">${config.text}</span>`
  }

  // ── renderItem – gère la syntaxe [texte > page] dans les items ───────────
  // Équivalent de renderItem() dans WeekCard React
  _renderItem(item) {
    if (typeof item !== 'string') return html`${item}`
    const match = item.match(/\[(.*?) > (.*?)\]/)
    if (!match) return html`${item}`
    const [full, text, page] = match
    const parts = item.split(full)
    return html`
      ${parts[0]}<a href="#" @click=${(e) => { e.preventDefault(); this.globalStore.addPage(page) }}>${text}</a>${parts[1]}
    `
  }

  // ── WeekCard – équivalent du composant React <WeekCard week={...} /> ──────
  _weekCard(week) {
    return html`
      <article
        class="pg-card pl-pg-card"
        style="cursor:${week.page ? 'pointer' : 'default'};"
        @click=${() => week.page && this.globalStore.addPage(week.page)}
      >
        <div class="week-card-header">
          <h3>${week.title}</h3>
          ${this._pill(week.status)}
        </div>
        ${week.contents.map(content => html`
          <div>
            <strong>${content.title}</strong>
            <ul>
              ${content.items.map(item => html`<li>${this._renderItem(item)}</li>`)}
            </ul>
          </div>
        `)}
      </article>
    `
  }

  // ── PhaseSection – équivalent du composant React <PhaseSection phase={...} />
  _phaseSection(phase) {
    return html`
      <section class="phase">
        <h2 style="margin-top:0;">${phase.phaseTitle}</h2>
        <div class="pg-cards pl-pg-cards">
          ${phase.weeks.map(week => this._weekCard(week))}
        </div>
      </section>
    `
  }

  render() {
    return html`
      <!-- plan.css + PlanPageStyles inlinés (pas de Shadow DOM) -->
      <style>
        /* plan.css */
        .phase { border-left: 6px solid var(--terracotta-400); padding: 0 0 0 18px; }
        .week-card-header { display: flex; justify-content: space-between; align-items: center; }
        .pill { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 999px; font-weight: 700; font-size: 13px; }
        .pill.pill-completed   { background: #e8f5e9; border: 1px solid #c8e6c9; color: #2e7d32; }
        .pill.pill-in-progress { background: #fff; border: 1px solid var(--terracotta-300); color: var(--terracotta-600); }
        .pill.pill-upcoming    { background: #f5f5f5; border: 1px solid #e0e0e0; color: #616161; }
        /* PlanPageStyles */
        .pl-pg-cards { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
        .pl-pg-card  { padding: 1rem; }
        .pl-pg-card strong { color: var(--terracotta-700); font-weight: 600; }
        .pl-pg-card ul { margin: 0; padding-left: 20px; color: var(--muted); line-height: 1.6; }
        .pl-pg-card ul.section a { color: var(--terracotta-600); text-decoration: none; font-weight: 600; border-bottom: 2px solid transparent; transition: border-color 0.2s; }
        .pl-pg-card ul.section a:hover { border-bottom-color: var(--terracotta-200); }
      </style>

      <div class="pg-multi-containers">
        ${sudokuPlan.map(phase => this._phaseSection(phase))}
      </div>
    `
  }
}

customElements.define('plan-page', PlanPage)
