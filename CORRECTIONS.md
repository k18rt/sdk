# Correction locale de w26

Base : master 310a2b89e776e17e69161883d940560a4eea780e. La branche expérimentale v27 n’est pas intégrée.
Référence : sources React fournies par l’utilisateur et site https://k18rt.fr/sudoku/.

Le jeu utilise maintenant des templates Lit et les transitions complètes du jeu React : initialisation, sélection, chiffres, annotations, effacement, historique clavier, import/export, aides et déductions. Aucun runtime React n’est ajouté. Le petit composant de base lit-state.js conserve les états et exécute/nettoie les effets après les mises à jour Lit. Le moteur et les grilles proviennent des sources React, avec exports ESM. L’icône Aire de jeu retrouve sa classe icon et son SVG original. Le rendu du jeu est en light DOM pour bénéficier des styles d’origine.

## Lancement

Node >=22.12 requis (Vite 7).
Depuis le dossier _ : npm install, puis npm run dev.
Compilation : npm run build. Tests ajoutés : npm test.

## Vérifications effectuées

- Compilation de production réussie.
- Cinq tests Node réussis : import/saisie/copie indépendante d’historique/résolution ; génération aux quatre difficultés ; déductions.
- Navigateur : 81 cellules, saisie, effacement, annulation et rétablissement clavier, import d’une grille connue, navigation Aire de jeu et chargement de Grille 1.
- Accueil et icônes contrôlés visuellement ; aucune erreur console observée.

Limites : pas de comparaison automatisée pixel par pixel ni de test sur appareil physique/Safari. Les aides ont été comparées sur une grille déterministe ; cela ne constitue pas une preuve sur toutes les grilles. Les parcours pédagogiques ne sont pas exhaustivement testés. Le fichier resolve.test.js hérité de la traduction n’a pas été exécuté ; les tests ajoutés ciblent le moteur réellement repris de React.

Aucun commit, push, publication ou changement dans le dossier React d’origine.

## Vérification mobile et aides complexes

Formats CSS testés : 320 × 640, 390 × 700/844, 768 × 700. Le redimensionnement fourni par le navigateur de test ne modifiait pas réellement innerWidth ; les tests ont donc utilisé une iframe aux dimensions explicites (tests/mobile.html). Les largeurs de document et de viewport concordent à 320, 390 et 768 px : aucun débordement horizontal.

Corrections supplémentaires :

- Panneau du jeu fluide sur petit écran, taille réelle des cellules et séparateurs recalculée selon sa largeur par ResizeObserver. Suppression du redimensionnement CSS du seul cadre, qui désalignait les séparateurs des cellules dans React comme dans Lit.
- Commandes réparties sur plusieurs lignes ; grille et pavé numérique accessibles par défilement vertical.
- Titre et bouton de don séparés sur mobile ; cartes et accueil adaptés à la largeur disponible.
- Aide disponible même sans place pour un panneau latéral, défilable et munie d’un bouton de fermeture. Ouverture et fermeture vérifiées à 320 px.
- Import mobile dimensionné avec border-box et hauteur défilable.
- Correction du cache moteur : simpleFill créait une exception en modifiant le getter steps d’un CachedResult. Un résultat indépendant conserve désormais le coup ajouté et laisse le cache intact.
- Retrait du relais de redimensionnement obsolète, qui appelait une méthode supprimée du jeu ; l’observation directe du panneau remplace ce relais.

Comparaison DOM React/Lit sur la même grille importée (530070000 … 000080079), cellules, valeurs, classes et opacités des annotations :

| Aide | Marquages | Parité |
|---|---:|---|
| Cases autosuffisantes | 4 | Oui |
| Singletons cachés | 12 | Oui |
| Sous-ensembles autosuffisants | 67 | Oui |
| Intersections exclusives | 29 | Oui |
| Contradictions sur un chiffre | 31 | Oui |
| Consensus | 37 (cache neuf des deux côtés) | Oui |
| Chaînes générales | 151 | Oui |

Les résultats du consensus dépendent de l’historique du cache dans la référence : une comparaison initiale utilisait des historiques différents ; elle a été refaite après réimport pour égaliser les conditions. Après correction, aucun nouveau blocage de cache n’a été rencontré.

Application par double-clic d’une annotation et puis Flow : état des grilles identique dans React et Lit (37 cases remplies après cette séquence). Les tests Node vérifient aussi que les coups des sept aides concordent avec la solution connue sur un cache partagé et que le cache chaud reste intact après ajout d’un coup hypothétique.

La capture sudoku-mobile-corrige.png présente le rendu à 390 px avec annotations positives et aide des cases autosuffisantes activées.
