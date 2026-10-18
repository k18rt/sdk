/**
 * main.js
 * Point d'entrée de l'application – remplace index.js de React.
 *
 * En React, index.js faisait :
 *   ReactDOM.createRoot(document.getElementById('root')).render(<Layout />)
 *
 * En Lit, il suffit de :
 *   1. Importer les composants (ils s'enregistrent via customElements.define)
 *   2. S'assurer que <page-layout> est dans le HTML (fait dans index.html)
 *
 * Aucun bootstrap manuel requis : les Web Components s'activent dès
 * que leur tag apparaît dans le DOM.
 */

// Styles globaux (identiques aux imports CSS de React)
import '../styles/main.css'
import '../styles/app.css'

// Composant racine – déclenche l'import en cascade de tous les sous-composants
import '../components/page-layout.js'

// Note : page-layout.js importe déjà :
//   sudoku-header, resizable-panel, sudoku-app
//   et tous les composants de pages (home-page, don-page, …)
// Ces imports sont donc transitifs et ne nécessitent pas d'être répétés ici.
