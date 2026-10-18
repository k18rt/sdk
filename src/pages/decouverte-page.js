/**
 * decouverte-page.js  —  remplace decouverte.js (plan/decouverte)
 *
 * Étend LessonBasePage qui fournit :
 *   - la structure (liste de cartes / vue détail)
 *   - les icônes SVG partagées
 *   - _bi(), _gridBtn(), _linkTo(), _steps(), _prCard()
 *   - _state (useState(0))
 *
 * Cette classe déclare uniquement :
 *   - get pageTitle/pageSubtitle/menuLabel
 *   - get cards()           → définitions des cartes (clé, titre, icône…)
 *   - _renderCardContent()  → contenu de chaque section (Quoi, Règles, Pratique…)
 *
 * Équivalences React → Lit :
 *   useState(0)              → this._state (hérité de LessonBasePage)
 *   useAppConfig()           → this.appConfigStore (hérité via AppConfigMixin)
 *   <ButtonIcon type="active" icon={<GridIcon/>} callback={()=>setImportGrid(g)}/>
 *                            → this._gridBtn(g)
 *   <LinkToPage text page /> → this._linkTo(text, page)
 *   composants Quoi/Regles/Pratique/Exemples/Experimentation/Plus
 *                            → méthodes _contentQuoi() … _contentPlus()
 */

import { LessonBasePage } from './lesson-base.js'
import { html } from 'lit'

export class DecouvertePage extends LessonBasePage {
  // ── Métadonnées de la page ─────────────────────────────────────────────
  get pageTitle()    { return 'Découverte du Sudoku' }
  get pageSubtitle() { return 'Comprendre les bases et s\'amuser rapidement' }
  get menuLabel()    { return 'Découverte' }

  // ── Définition des cartes ──────────────────────────────────────────────
  // Équivalent du tableau `cards` dans React, mais les icônes sont des
  // TemplateResults (html`...`) plutôt que des éléments JSX
  get cards() {
    return [
      { key: 1, title: "C'est quoi",       description: 'Comprendre le jeu',         icon: this._iconMessageCircleMore() },
      { key: 2, title: 'Les règles',        description: 'Et c\'est très simple !',   icon: this._iconMicroscope()        },
      { key: 3, title: 'Pratique',          description: 'Remplir une première grille', icon: this._iconOrigami()         },
      { key: 4, title: 'Exemples',          description: 'Des cas concrets',          icon: this._iconSquareStack()       },
      { key: 5, title: 'Expérimentation',   description: 'Je me lance !',             icon: this._iconExperiment()        },
      { key: 6, title: 'Et maintenant ?',   description: 'Pour aller plus loin',      icon: this._iconMagic()             },
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
  // Chaque méthode = un composant React (Quoi, Regles, Pratique…)

  _contentQuoi() {
    return html`
      <div>
        <h2>Qu'est-ce que le Sudoku ?</h2>
        <p>Le Sudoku est un jeu de logique qui consiste à remplir une grille de 9×9 cases
           avec des chiffres de 1 à 9, en respectant certaines règles.</p>
        <p>Sous une apparente simplicité, le Sudoku présente des défis complexes et des stratégies variées.</p>
      </div>
    `
  }

  _contentRegles() {
    return html`
      <div>
        <h2>Découvrir les règles du Sudoku</h2>
        <p>Le Sudoku est une grille de 9x9, divisée en blocs de 3x3. Le but est de remplir
           toutes les cases avec les chiffres de 1 à 9 en respectant trois règles simples.</p>
        <div style="text-align:left;">
          <h3>Les trois règles :</h3>
          <ul>
            <li><strong>Chaque ligne</strong><br/>doit contenir tous les chiffres de 1 à 9, sans répétition.</li>
            <li><strong>Chaque colonne</strong><br/>doit contenir tous les chiffres de 1 à 9, sans répétition.</li>
            <li><strong>Chaque bloc de 3×3</strong><br/>doit contenir tous les chiffres de 1 à 9, sans répétition.</li>
          </ul>
        </div>
        <p>La grille initiale se présente avec des cases déjà remplies. Elles imposent des contraintes
           qui rendent la <strong>solution unique</strong>.</p>
      </div>
    `
  }

  _contentPratique() {
    return html`
      <div>
        <h2>En pratique</h2>
        <p>Clique sur ce bouton ${this._gridBtn('845017962263985407709426385186539724950842106304600859598160273630798041071253698')} pour afficher une grille à droite.</p>
        <p>La majorité des cases sont déjà remplies. Il ne reste que 12 chiffres à placer.</p>
        <p>Tu remarques que tu peux mettre un chiffre dans la case vide du premier bloc. Sais-tu lequel ?</p>
        <p>Bien sûr, c'est le 1, car il est le seul qui est absent du bloc. Le 1 n'apparaît pas non plus sur la ligne 3. Et pas plus en colonne 2.</p>
        <p>Vas-y. Sélectionne la case vide et clique sur le chiffre 1 (ou tape au clavier). Bravo ! Tu viens de remplir ta première case.</p>
        <p>Si tu t'es trompé, la case devient rouge. Ce n'est pas grave, tu peux corriger en rentrant le bon chiffre. Tu peux aussi retaper le même chiffre que tu viens de rentrer pour annuler la saisie.</p>
        <p>Essaie maintenant de remplir la grille entièrement. Si tu mets deux fois le même chiffre dans une ligne, une colonne ou un bloc, la case devient rouge.</p>
        <p>Réussis cette mission, et découvre ta récompense !</p>
        <p>Dans cet exemple, les cases pouvaient être remplies parce que la ligne, ou la colonne, ou le bloc n'avait plus qu'une unique possibilité. Mais en fait, la case doit répondre <strong>simultanément</strong> aux contraintes de la ligne, de la colonne et du bloc. Par conséquent, il suffit qu'il n'y ait plus qu'une seule possibilité qui réponde à toutes ses contraintes pour remplir la case sans ambiguïté.</p>
        <p>Dit autrement, quand en étant sur une case, je peux compter tous les chiffres sauf un, en regardant les chiffres qui sont sur sa ligne, sa colonne ou son bloc, alors le chiffre manquant est la solution de la case.</p>
        <p>Voyons quelques exemples page suivante.</p>
      </div>
    `
  }

  _contentExemples() {
    return html`
      <div class="exemples">
        <h2>Exemples</h2>
        <p>Dans cette grille ${this._gridBtn('178603240459812637236047080781400350560138970390205010020380000013700000040001763')},
           la quasi-totalité des cases peuvent être remplies par inspection directe.</p>
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

customElements.define('decouverte-page', DecouvertePage)
