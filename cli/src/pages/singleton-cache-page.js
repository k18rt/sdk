/**
 * singleton-cache-page.js  —  remplace singleton-cache.js (plan/singleton-cache)
 *
 * Identique en structure à decouverte-page.js mais avec un contenu pédagogique
 * différent (technique du singleton caché).
 *
 * Étend LessonBasePage → mêmes équivalences React → Lit que DecouvertePage.
 * Seuls get pageTitle/pageSubtitle/menuLabel/cards et _renderCardContent() diffèrent.
 */

import { LessonBasePage } from './lesson-base.js'
import { html } from 'lit'

export class SingletonCachePage extends LessonBasePage {
  // ── Métadonnées de la page ─────────────────────────────────────────────
  get pageTitle()    { return 'Le chiffre caché' }
  get pageSubtitle() { return 'Retrouver un chiffre isolé dans une unité' }
  get menuLabel()    { return 'Singleton caché' }

  // ── Définition des cartes ──────────────────────────────────────────────
  get cards() {
    return [
      { key: 1, title: 'Ça sert à quoi',        description: 'Un singleton caché',         icon: this._iconMessageCircleMore() },
      { key: 2, title: 'Comment ça marche',      description: 'Et c\'est très simple !',    icon: this._iconMicroscope()        },
      { key: 3, title: 'Pratique',               description: 'Remplir une première grille', icon: this._iconOrigami()          },
      { key: 4, title: 'Exemples',               description: 'Des cas concrets',           icon: this._iconSquareStack()       },
      { key: 5, title: 'Expérimentation',        description: 'Je me lance !',              icon: this._iconExperiment()        },
      { key: 6, title: 'Et maintenant ?',        description: 'Pour aller plus loin',       icon: this._iconMagic()             },
    ]
  }

  // ── Dispatch du contenu ────────────────────────────────────────────────
  _renderCardContent(card) {
    switch (card.key) {
      case 1: return this._contentQuoi()
      case 2: return this._contentRegles()
      case 3: return this._contentPratique()
      case 4: return this._contentExemples()
      case 5: return this._contentExperimentation()
      case 6: return this._contentPlus()
      default: return html``
    }
  }

  // ── Sections de contenu ────────────────────────────────────────────────

  _contentQuoi() {
    return html`
      <div>
        <h2>Qu'est-ce qu'un singleton caché ?</h2>
        <p>Un <strong>singleton caché</strong> (ou chiffre caché) est une technique de résolution du Sudoku.</p>
        <p>Elle se produit quand un chiffre ne peut être placé qu'à un seul endroit dans une ligne, une colonne ou un bloc — même si cette case contient plusieurs candidats possibles.</p>
        <p>Contrairement au singleton nu (seule case possible d'une unité), le singleton caché nécessite d'analyser la distribution d'un chiffre dans une unité entière.</p>
      </div>
    `
  }

  _contentRegles() {
    return html`
      <div>
        <h2>Comment ça marche ?</h2>
        <p>Pour chaque chiffre de 1 à 9, examine chaque unité (ligne, colonne, bloc) :</p>
        <div style="text-align:left;">
          <h3>Méthode :</h3>
          <ul>
            <li><strong>Étape 1</strong><br/>Choisir un chiffre (ex. le 7) et une unité (ex. le bloc central).</li>
            <li><strong>Étape 2</strong><br/>Repérer les cases vides de cette unité où le 7 peut encore aller (candidats).</li>
            <li><strong>Étape 3</strong><br/>Si une seule case peut accueillir le 7, alors c'est la solution !</li>
          </ul>
        </div>
        <p>C'est un <strong>singleton caché</strong> : la case a peut-être plusieurs candidats, mais le chiffre en question n'a qu'une seule case possible dans son unité.</p>
      </div>
    `
  }

  _contentPratique() {
    return html`
      <div>
        <h2>En pratique</h2>
        <p>Charge cette grille ${this._gridBtn('100050000400700023000020000004365897065807004800000060531000970002078031900001040')} pour t'exercer.</p>
        <p>Dans le premier bloc (cases 1-3 × 1-3), cherche quels chiffres manquent.</p>
        <p>Regarde le chiffre 2 : dans ce bloc, dans combien de cases peut-il aller ?</p>
        <p>Si tu ne le vois pas encore clairement, essaie de noter en petit (annotations) dans chaque case vide les chiffres qui peuvent y aller — puis cherche un chiffre qui n'apparaît qu'une seule fois.</p>
        <p>Le bouton annotation <strong>+</strong> en haut te permet d'activer ce mode.</p>
      </div>
    `
  }

  _contentExemples() {
    return html`
      <div class="exemples">
        <h2>Exemples</h2>
        <p>Dans cette grille ${this._gridBtn('178603240459812637236047080781400350560138970390205010020380000013700000040001763')}, cherchons des singletons cachés.</p>
        <p>Voici quelques exemples :</p>
        <ul>
          <li><strong>Case (8, 4)</strong> : ligne, colonne et bloc
            <ul>
              <li>- Pour remplir cette case, on commence par la colonne 4 : elle ne peut contenir qu'un 5 ou un 9.</li>
              <li>- Puis regardons la ligne 8 : un 5 est déjà là, donc ce ne peut être que 9.</li>
              <li>- La case doit donc contenir un <strong>9</strong>.</li>
            </ul>
          </li>
          <li><strong>Case (8, 5)</strong> : ligne et bloc
            <ul>
              <li>- Pour remplir la case d'à côté, remarquons que la colonne 4 ne peut contenir qu'un 5 ou un 9.</li>
              <li>- Mais on vient de remplir le 5 sur la même ligne.</li>
              <li>- La case doit donc contenir un <strong>9</strong>.</li>
            </ul>
          </li>
          <li><strong>Case (9, 1)</strong> : ligne et bloc
            <ul>
              <li>- Sur la ligne 9, il reste à placer les chiffres 2 et 8.</li>
              <li>- Le 2 est déjà dans le bloc.</li>
              <li>- La case doit donc contenir un <strong>8</strong>.</li>
            </ul>
          </li>
        </ul>
        <p>Finit la grille avec ces astuces !</p>
      </div>
    `
  }

  _contentExperimentation() {
    return html`
      <div>
        <h2>À toi de jouer</h2>
        <p>Voici quelques grilles pour t'entraîner. Elles peuvent toutes être résolues pas-à-pas, en recherchant chaque case qui n'a qu'une seule possibilité, en combinant les contraintes sur sa ligne, sa colonne, et son bloc.</p>
        <ul>
          <li><strong>Grille 1</strong> ${this._gridBtn('205081370169070084037500219976105438503090007402706900301657842720049065054012093')}<br/>
            Commence par exemple par la case (9, 7). Dans le dernier bloc, il ne reste que les chiffres 1 et 7 à placer. Mais sur la 9ème ligne, le 1 est déjà présent.</li>
          <li><strong>Grille 2</strong> ${this._gridBtn('530070000600195000098000060800060003400803001700020006060000280000419005000080079')}<br/>
            Au début, tu peux regarder la case du centre, puis dans le dernier bloc, la case de la dernière colonne et toutes les cases de ce bloc...</li>
        </ul>
        <p>Peut-être as-tu trouvé la dernière grille un peu difficile. Mais tu as exercé ton œil et tu vas vite découvrir des astuces qui rendent les choses beaucoup plus simples !</p>
      </div>
    `
  }

  _contentPlus() {
    return html`
      <div>
        <h2>Observation</h2>
        <p>Dans trois cases non remplies d'une unité, on place exactement trois chiffres. Quand on a un singleton isolé, ça veut dire qu'on place un chiffre dans une case et qu'on va alors placer les deux autres dans les deux cases restantes. On voit là une réduction du problème en deux sous-problèmes plus simples à résoudre. Comment peut-on généraliser ce découpage pour simplifier le problème ? C'est ce que nous allons découvrir dans le module suivant.</p>
        <p>As-tu remarqué que lorsque tu te trompes de chiffre sur une case, d'autres cases peuvent elles aussi devenir rouges ?</p>
        <p>Sais-tu pourquoi ?</p>
        <p>Reprenons la grille de départ ${this._gridBtn('845017962263985407709426385186539724950842106304600859598160273630798041071253698')}. Remplis alors la case vide du premier bloc avec un 2.</p>
        <p>La case devient rouge, mais aussi celle trois cases plus bas : bloc 4, ligne 6, colonne 2.</p>
        <p>En effet, <b>la case n'a plus de solution</b>. Et cela pour trois raisons (une seule suffirait) :</p>
        <ul>
          <li><strong>Sur la colonne 2</strong><br/>le seul chiffre manquant est le 1. Mais il est déjà présent dans le bloc 4.</li>
          <li><strong>Sur la ligne 6</strong><br/>il manque les chiffres 1, 2 et 7. Mais comme déjà vu, le 1 est dans le bloc, et les chiffres 2 et 7 sont dans la colonne 2.</li>
          <li><strong>Enfin, pour le bloc 4</strong><br/>deux chiffres sont manquants : le 2 et le 7. Mais ils sont tous les deux en colonne 2.</li>
        </ul>
        <p>Nous pouvons tirer deux enseignements de cet exemple.</p>
        <p>Le premier, c'est que si en remplissant une case avec un chiffre donné, cela a pour conséquence qu'une autre case n'a plus de solution, alors l'hypothèse est fausse et la première case ne peut pas contenir ce chiffre.</p>
        <p>D'autre part, on voit qu'une décision sur une case peut avoir des conséquences sur d'autres cases. C'est en fait quasiment toujours le cas et nous allons explorer cela au cours des prochains modules !</p>
        <p>Prêt pour le ${this._linkTo('prochain chapitre', 'plan2')} ?</p>
      </div>
    `
  }
}

customElements.define('singleton-cache-page', SingletonCachePage)
