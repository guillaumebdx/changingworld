# DESIGN.md : Changing World, atelier éditorial

Référence : `/design/changing-world-design` (maquettes Claude Design). Ce document en extrait les principes, les tokens et les composants. Le HTML des maquettes n'est jamais copié : chaque écran est reconstruit en composants React stylés avec Tailwind et les tokens ci-dessous.

## 1. Principes

- **Papier et encre.** Le fond est un papier chaud (`#F2ECE1`), jamais blanc. Les cartes sont un papier plus clair (`#FBF7EF`), le rail de navigation un papier plus sombre (`#E8DFCF`). L'encre est un noir tiré vers le brun (`#1E1A15`).
- **Les chiffres sont le sujet.** Un chiffre clé se pose en Fraunces, grand, avec son année en mono au-dessus et son unité à côté. Les gains sont verts, les pertes terre de Sienne.
- **Trois voix typographiques.** Fraunces pour la voix (questions, titres, chiffres), Archivo pour l'interface, IBM Plex Mono en capitales espacées pour les métadonnées et les étiquettes.
- **Filets plutôt que boîtes.** Les sections sont séparées par des filets fins (`1px #D8CDB9`), les blocs importants par un filet d'encre de 2 px. Aucune ombre portée, aucun dégradé décoratif, rayons de 2 px.
- **Teintes de cartographie imprimée.** Huit catégories, huit couleurs qui diffèrent aussi par la clarté. Une pastille carrée de 9 px porte la couleur à côté du nom.
- **Chaleur et sobriété.** Pas d'emojis, pas d'icônes étincelles, pas de tuiles KPI génériques, pas de modales. Les états vides, de chargement et d'erreur sont rédigés en français naturel, à la deuxième personne du pluriel.

## 2. Tokens

Déclarés dans `apps/admin/src/styles/theme.css` (Tailwind v4, bloc `@theme`). Noms de classes Tailwind entre parenthèses.

### Couleurs

| Token | Hex | Usage |
|---|---|---|
| `papier` | `#F2ECE1` | fond général |
| `surface` | `#FBF7EF` | cartes, champs, boutons secondaires |
| `rail` | `#E8DFCF` | rail de navigation, étiquettes neutres |
| `blanc` | `#FFFFFF` | champ actif |
| `encre` | `#1E1A15` | texte, filets forts, bouton principal |
| `encre-80` | `#2E2820` | texte courant des indices et commentaires |
| `encre-70` | `#514940` | texte secondaire, étiquettes de champ |
| `encre-50` | `#6F6559` | légendes |
| `encre-30` | `#8A8075` | métadonnées discrètes |
| `filet` | `#D8CDB9` | filets fins |
| `filet-fort` | `#C4B79E` | bordures de champ, filets structurants |
| `filet-mute` | `#B5A894` | bordures de boutons tertiaires |
| `juste` | `#1D5B45` | bonne réponse, gains, bandeau juste |
| `juste-fond` | `#E3EDE6` | fond de l'étiquette « validée » |
| `juste-texte` | `#16452F` | texte de l'étiquette « validée » |
| `faux` | `#8A2E1C` | bandeau faux |
| `faux-vif` | `#A8432C` | pertes, accents, Démographie |
| `faux-fond` | `#F7E2DC` | fond de la réponse fausse |
| `faux-texte` | `#7A2817` | texte de la réponse fausse |
| `indice` | `#8A6516` | bordures des indices, pointillés « demander un indice » |
| `indice-texte` | `#725310` | étiquettes INDICE n, boutons « à affiner » |
| `indice-fond` | `#F7EFDC` | étiquettes SURPRENANT / À AFFINER, commentaire interne |
| `indice-fond-ia` | `#FCF6E8` | champ en cours de génération |
| `indice-bordure-interne` | `#C9AE6E` | bordure du commentaire interne |
| `squelette` | `#E4D6B4` | barres de chargement |

Catégories (couleur stockée en base, injectée en style inline) : Démographie `#A8432C`, Économie `#1D5B45`, Santé `#A3344F`, Technologie `#2A4A80`, Transport `#8A6516`, Urbanisation `#4D4669`, Agriculture `#5F6B22`, Éducation `#1E6274`.

### Typographie

| Classe | Police | Usage |
|---|---|---|
| `font-titre` | Fraunces (variable, `SOFT` 30 à 40, `WONK` 1) | titres d'écran (27 à 40 px), question (19 à 28 px), chiffres (20 à 72 px) |
| `font-ui` | Archivo 400 à 700 | interface, 13 à 16 px, interligne 1,5 |
| `font-mono` | IBM Plex Mono 400 à 600 | étiquettes 10 à 12 px, capitales, espacement 0,10 à 0,18 em |

Échelle : 40 titre écran · 28 question · 20 commentaire · 16 réponse · 13 indice · 11 étiquette.

Les maquettes posent les étiquettes mono à 8 ou 9 px ; sur un écran réel c'est illisible, l'admin les monte à 10 (`etiquette-xs`), 11 (`etiquette`) et 12 px (`etiquette-sm`). Le téléphone simulé garde les tailles réduites des maquettes mobiles, puisqu'il représente un écran de 390 pt à l'échelle.

### Espacements et formes

- Échelle : 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64.
- Rayon unique `rounded-fin` (2 px). Le téléphone simulé est la seule exception (30 px extérieur, 22 px intérieur).
- Bordures : 1 px filets, 1,5 px champs et boutons, 2 px filets d'encre.
- Hauteurs minimales : champs 44 px, boutons 44 à 48 px, réponses joueur 52 à 56 px.

## 3. Composants

| Composant | Rôle |
|---|---|
| `Rail` | navigation gauche (204 px, fond `rail`), logo Fraunces, entrées avec icône trait fin, compteur mono, pied « Bernard · ligne éditoriale » et déconnexion |
| `EnTetePage` | titre Fraunces 27 px, sous-titre mono, actions à droite, filet d'encre 2 px |
| `Bouton` | variantes `principal` (encre), `affiner` (bordure ocre), `tertiaire` (bordure mute), `discret` (texte mono) |
| `Champ`, `ZoneTexte`, `Selection` | étiquette mono 9 px, contrôle 44 px, bordure `filet-fort`, focus bordure encre et fond blanc |
| `EtiquetteStatut` | BROUILLON IA (rail) · VALIDÉE (vert) · À AFFINER (ocre) · NON RETENUE (barrée) |
| `EtiquetteImpact` | CHOC (encre pleine) · SURPRENANT (ocre) · INTÉRESSANT (bordure mute) |
| `PastilleCategorie` | carré 9 px de la couleur de catégorie + nom en mono |
| `ChampGenere` | champ avec bouton Régénérer, compteur de caractères, état « L'IA rédige… » (pointillés ocre, barres squelette) |
| `PhonePreview` | cadre téléphone 356 px (encre, rayon 30) contenant `QuestionCard` |
| `QuestionCard` | écran joueur : bandeau catégorie, question, indices, réponses, demande d'indice, enjeu ; états question / indices / juste / faux. Logique dans `shared/etatJeu` pour un portage React Native |
| `SelecteurEtat` | boutons mono pour choisir l'état de l'aperçu |
| `PointsAVerifier` | liste des contrôles, bloquants en tête, pastille par niveau |
| `Historique` | lignes datées avec auteur et bouton Restaurer |
| `DiffVersions` | comparaison ligne à ligne de deux versions de prompt |
| `EtatVide`, `Chargement`, `Erreur` | messages rédigés, jamais une icône seule |

## 4. Écrans

- **Connexion** : carte centrée sur papier, logo, un champ mot de passe, bouton Entrer.
- **Questions** : filtres en ligne (statut, catégorie, sous-catégorie, format, impact, recherche), compteurs par statut sur un filet d'encre, tableau sobre, panneau de progression par sous-catégorie comparé à la cible.
- **Éditeur** : deux colonnes (formulaire 540 px minimum, aperçu 372 px). Barre d'action sur filet d'encre 2 px. Points à vérifier, relecture IA et historique sous l'aperçu.
- **Prompts** : liste des formats à gauche (ligne active avec filet intérieur d'encre), éditeur à droite avec variables en étiquettes `rail`, zone mono, barre d'action, historique des versions.
- **Réglages** : sections séparées par des filets, tableaux éditables en place.
- **Export** : un paragraphe, un bouton.
