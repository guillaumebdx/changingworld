# DECISIONS.md

Décisions prises pendant la construction, quand le cahier des charges laissait un choix ou qu'un détail manquait. Les choix produit et éditoriaux non tranchés par le cahier des charges sont marqués **(produit)** : Bernard et Guillaume peuvent les renverser.

## Déroulé

- **Pas de mode plan interactif.** La consigne demandait de passer en mode plan puis d'exécuter sans s'arrêter ; l'exécution étant autonome, le mode plan aurait bloqué sur une approbation. Le plan a été énoncé dans la conversation, puis exécuté d'une traite.
- **Aucune question technique posée.** Les choix ci-dessous ont été jugés raisonnables et réversibles.

## Stack et versions

- **Node 24, npm 11** (machine de développement). Minimum déclaré : Node ≥ 20.12 (pour `process.loadEnvFile`).
- **Tailwind v4** (configuration CSS-first via `@theme` dans `apps/admin/src/styles/theme.css`) plutôt que v3 et `tailwind.config.js` : c'est la version courante, et les tokens restent lisibles dans un seul fichier CSS.
- **Zod 4** : `z.toJSONSchema` est intégré, ce qui évite une dépendance pour les Structured Outputs. Le schéma est durci (`additionalProperties: false`, tous les champs requis) par `versJsonSchemaStrict`.
- **SDK OpenAI 7**, API Chat Completions en streaming avec `response_format: json_schema` strict. L'API Responses aurait aussi convenu ; Chat Completions est la plus documentée pour le streaming de JSON schema.
- **Modèle par défaut `gpt-4.1-mini`** dans `.env.example` : disponible, économique, compatible Structured Outputs. Modifiable dans Réglages. Les modèles de raisonnement (`o*`, `gpt-5*`) sont acceptés : le paramètre `temperature` est alors omis.
- **Drizzle 0.45 + drizzle-kit 0.31**, migration SQL versionnée dans `apps/api/drizzle/0000_initial.sql`, appliquée au démarrage de l'API et par `npm run db:seed`.
- **ESLint 9 flat config + typescript-eslint**, règles minimales (recommended, imports de types, hooks React).
- **Vitest 4** dans `shared` et `api`.
- **exceljs** pour l'export xlsx, côté serveur, servi par `GET /api/admin/export.xlsx` (le cookie de session suffit).
- **Playwright** en dépendance de développement racine, script `scripts/capture.mjs`.
- `shared` est consommé en **source TypeScript** (pas d'étape de build) : plus simple en monorepo, Vite et tsx compilent à la volée.
- **Rechargement de l'API en dev** : `node --watch --import tsx` plutôt que `tsx watch`, qui restait muet sous `concurrently` sans terminal interactif sur Windows.
- **Ports** : API 3001, admin 5173 (proxy Vite `/api` → 3001). En production, l'API sert aussi `apps/admin/dist` si le dossier existe.

## Authentification

- Comparaison en temps constant via `crypto.timingSafeEqual` sur les empreintes SHA-256 des deux chaînes (longueur identique garantie).
- Cookie signé avec `hono/cookie` (`setSignedCookie`), valeur = horodatage d'expiration, 30 jours, httpOnly, SameSite=Lax, Secure si `NODE_ENV=production`.
- Limiteur en mémoire par IP (5 tentatives par fenêtre glissante de 60 s). Suffisant pour un seul utilisateur ; à remplacer si l'API est répartie sur plusieurs instances.
- Sans `.env`, l'API démarre en développement avec `ADMIN_PASSWORD=changez-moi` et un secret par défaut ; en production les deux sont obligatoires.

## Données et seed

- **Couleurs des catégories** : celles du README des maquettes, associées par préfixe de nom (« Technologie & Innovation » → bleu d'encre, etc.).
- **Cible par défaut de 10 questions par sous-catégorie (produit)** : le seed n'en donne pas, et la comparaison « compteur contre cible » doit être visible dès le départ. Modifiable dans Réglages.
- **Sous-catégorie « Machine à vapeur »** créée sous « Technologie & Innovation ». La question de Bernard dit « Technologie » : la catégorie est trouvée par préfixe.
- **Format des questions de Bernard** : deviné à partir de la formulation (durée, datation, ancrage, niveau, sens et ampleur). Son champ `type` (« Ordre de grandeur », « Date historique ») n'est pas conservé : l'export remplit `type` avec le nom du format.
- **Impact « INTÉRESSANT »** (avec accent) normalisé en `INTERESSANT`.
- La question sur l'espérance de vie est importée telle quelle (bonne réponse 33 ans, résultat 40 ans) : l'éditeur affiche l'alerte.
- **Seed idempotent** : les éléments existants (par nom, code ou intitulé exact) sont conservés. Relancer `npm run db:seed` n'écrase rien.
- `numero` est calculé comme `max(numero) + 1` à l'insertion (lisible, jamais réutilisé).
- Les snapshots d'historique incluent les champs éditoriaux plus `statut` et `commentaire_interne` ; la restauration ne touche qu'au contenu, pas au statut.
- `date_examen` est posée à chaque passage en `validee`, `a_affiner` ou `non_retenue`.

## Génération

- Le prompt système devient le message `system`, le prompt de format le message `user`. Les variables sont injectées dans les deux.
- `{{exemples}}` : jusqu'à 5 questions validées du même format, sinon jusqu'à 5 validées tous formats. `{{questions_existantes}}` : intitulés non vides de la sous-catégorie.
- La régénération d'un champ reçoit la question complète en contexte et ne réécrit que le(s) champ(s) cible(s). « Réponses » régénère A, B, C et `bonne_reponse` ensemble ; « Source » régénère nom et lien ensemble. Le serveur enregistre alors tout le formulaire (avec les modifications non sauvegardées de Bernard) et crée une entrée d'historique « ia ».
- Tous les formats du seed, actifs ou non, ont un prompt initial rédigé. Un format créé ou activé depuis Réglages reçoit automatiquement son prompt v1 (dédié s'il en existe un pour son code, générique sinon), et l'écran Prompts complète les manquants au chargement.
- Le bouton **Tester** de l'écran Prompts génère avec le brouillon en cours (non enregistré) du prompt édité et les versions actives des autres, sur une sous-catégorie tirée au hasard, sans rien enregistrer.
- La relecture critique utilise une température plafonnée à 0,4.
- **Mode démo** : sans clé OpenAI, `ClientDemo` renvoie une question factice (parmi trois) en streaming, et des remarques génériques pour la relecture. La valeur `modele_ia` enregistrée est alors « démo (sans clé OpenAI) ».

## Validation

- Comparaison `resultat` / bonne réponse : si les deux contiennent des nombres, on exige au moins un nombre commun ; sinon comparaison normalisée (accents, casse, ponctuation) avec inclusion dans un sens ou l'autre.
- « Un indice contient la bonne réponse » : recherche du texte exact normalisé, en mots entiers. Un indice qui cite un chiffre voisin (« vers 1800 ») n'est pas signalé.
- Gradation des indices : score grossier (nombres × 3 + noms propres + longueur / 60). Avertissement si l'indice 3 paraît nettement moins précis que les précédents ; simple remarque si l'indice 1 paraît très précis.
- Doublon : coefficient de Dice sur bigrammes de caractères des mots significatifs (mots vides retirés), seuil 0,62.
- Lien source : vérifié côté serveur (HEAD puis GET, 5 s), automatiquement à l'ouverture d'une question et sur demande. Le résultat n'est pas stocké.
- Contrôles supplémentaires non demandés mais utiles **(produit)** : commentaire hors de 2 à 4 phrases (remarque), emoji (avertissement), point d'exclamation (remarque).
- Le serveur refuse `validee` (HTTP 409) si un contrôle bloquant échoue, même si l'interface a été contournée.

## Interface

- Le sélecteur d'état de l'aperçu a six positions : Question, Indice 1, 2, 3, Juste, Faux. « Juste » et « Faux » conservent le nombre d'indices courant pour afficher les bons points. Le téléphone est aussi jouable (clic sur une réponse ou sur « demander un indice »).
- L'écran **Export** est une page à part (rail) : un paragraphe, un bouton, la liste des colonnes.
- L'export ajoute une colonne `numero` en tête des colonnes de Bernard **(produit)** : utile pour retrouver une question dans l'admin.
- Les questions en `brouillon_ia` peuvent être supprimées depuis l'éditeur ; les autres passent par « Non retenue ».
- Navigation précédente / suivante dans l'éditeur : sur la liste complète triée par numéro décroissant.
- Les filtres de la liste vivent dans l'URL (partage et retour arrière).
- Formats inactifs : visibles dans Prompts (grisés) et sélectionnables dans l'éditeur seulement si la question les utilise déjà.

## Limites connues

- Le limiteur de tentatives et l'annulation de génération sont en mémoire d'un seul processus.
- Le diff de versions de prompts est ligne à ligne (LCS), sans diff intra-ligne.
- Pas de suppression de question validée (par choix), pas de corbeille.
- La vérification de lien ne suit pas les pages qui exigent JavaScript ou bloquent les robots : un « ne répond pas » peut être un faux positif, d'où son caractère non bloquant.
