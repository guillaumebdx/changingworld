# Changing World : admin éditorial (build one shot)

Tu vas construire en une seule passe l'interface d'administration de **Changing World**, un jeu éducatif mobile. Cette admin sert à **produire la base de questions avec l'aide de l'IA**. L'app mobile joueur viendra plus tard (Expo), elle consommera l'API de ce projet.

## Règle de travail

1. **Avant de coder** : lis `/design` et `/seed`. Si tu as des questions, pose-les **en un seul bloc, uniquement sur des choix techniques** (hébergement, versions, librairies). Tout ce qui touche au produit, à l'éditorial ou au design est déjà tranché ci-dessous : ne pose pas de question dessus, prends la décision la plus raisonnable et note-la dans `DECISIONS.md`.
2. Passe en mode plan, puis exécute **jusqu'au bout sans t'arrêter** : je veux une app qui tourne avec `npm run dev`.
3. Termine par la checklist "Définition de fini" en bas.

## Contexte produit

- But : faire prendre conscience de l'ampleur des transformations du monde (esprit Gapminder / Factfulness). Chaque question crée un petit choc entre l'intuition du joueur et la réalité chiffrée.
- **L'admin a un seul utilisateur** : Bernard, responsable éditorial, non technique, sur **desktop**. Il génère des questions avec l'IA, les relit, les corrige, puis les valide. Toute question validée est immédiatement disponible pour l'app.
- Sa principale crainte : **la fiabilité**. L'IA néglige des "détails" essentiels (gradation des indices, formulation de la question, exactitude des chiffres). L'outil doit l'aider à vérifier, pas seulement à générer.
- Toute l'interface est **en français**.

## Mécanique de jeu (pour l'aperçu joueur et l'API)

- Une question, 3 réponses (A, B, C), une seule bonne.
- Jusqu'à 3 indices successifs : indice 1 vague, indice 2 intermédiaire, indice 3 plus précis. Chaque indice doit réellement rapprocher de la réponse sans la donner.
- Barème par défaut (modifiable dans Réglages) :

| Indices utilisés | Bonne réponse | Mauvaise réponse |
|---|---|---|
| 0 | +10 | -5 |
| 1 | +6 | -3 |
| 2 | +4 | -2 |
| 3 | +2 | -1 |

- Le joueur ne peut pas passer une question : il doit répondre, mais il choisit quand (avant ou après chaque indice).
- Après la réponse : bonne réponse révélée, points, commentaire, source.

## Stack (imposée)

- Monorepo npm workspaces, TypeScript strict partout.
- `apps/admin` : **React + Vite**, React Router, TanStack Query. CSS : Tailwind configuré avec les tokens du design (pas de shadcn, pas de lib de composants).
- `apps/api` : Node + **Hono**, **SQLite** via better-sqlite3 + **Drizzle ORM** (migrations versionnées).
- `packages/shared` : types, schémas **Zod**, fonction de score et règles de validation, réutilisables plus tard par l'app Expo.
- OpenAI via le SDK officiel, **côté serveur uniquement** : la clé ne doit jamais atteindre le navigateur.
- `npm run dev` lance l'API et l'admin ensemble. `npm run db:seed` charge les données de `/seed`.
- Si tu proposes de changer un élément de la stack, pose la question avant.

## Authentification (MVP)

- Un seul mot de passe dans `ADMIN_PASSWORD` (.env).
- `POST /api/auth/login` compare en temps constant, puis pose un cookie de session signé (`SESSION_SECRET`), httpOnly, SameSite=Lax, Secure en production, 30 jours.
- Limite à 5 tentatives par minute et par IP. Bouton de déconnexion.
- Toutes les routes `/api/admin/*` exigent la session.
- Routes publiques en lecture seule pour la future app : `GET /api/public/questions` (validées seulement, sans les champs internes) et `GET /api/public/taxonomie`.

## Modèle de données

**categories** : id, nom, couleur (hex), ordre.
**sous_categories** : id, categorie_id, nom, nb_questions_cible (nullable), ordre.
**formats** : id, code, nom, gabarit, exemple, reponses (description de l'échelle), ressort, actif.
**prompts** : id, format_id (nullable : null = prompt système commun), nom, created_at.
**prompt_versions** : id, prompt_id, version (int), contenu, note_de_version, created_at. On ne modifie jamais une version : chaque enregistrement en crée une nouvelle. Une version est marquée active par prompt.
**questions** :
- id, numero (lisible, auto-incrémenté), created_at, updated_at
- categorie_id, sous_categorie_id, format_id
- impact : `INTERESSANT | SURPRENANT | CHOC`
- question, reponse_a, reponse_b, reponse_c, bonne_reponse (`a | b | c`, **seule source de vérité** de la bonne réponse)
- indice_1, indice_2, indice_3
- commentaire (affiché après la réponse)
- source_nom, source_lien
- Champs de travail, jamais affichés au joueur : fait (l'insight), chiffres (les données brutes), calculs, resultat
- statut : `brouillon_ia | a_affiner | validee | non_retenue`
- date_examen, commentaire_interne
- prompt_version_id (la version de prompt qui a généré la question), modele_ia
**question_historique** : id, question_id, snapshot JSON, auteur (`ia | bernard`), created_at. Une entrée à chaque génération, régénération de champ ou sauvegarde.
**reglages** : clé / valeur (barème, modèle OpenAI, température).

## Données initiales (`/seed`)

- `taxonomie.json` : 8 catégories et leurs sous-catégories. Attribue une couleur à chaque catégorie à partir de `/design/README.md`. Il manque la sous-catégorie "Machine à vapeur" (Technologie) utilisée par une question : crée-la.
- `formats.json` : 5 formats actifs et 5 formats à venir (inactifs).
- `questions-bernard.json` : 5 questions de Bernard (4 validées, 1 non retenue). Ce sont les **exemples de référence** pour le few-shot. Attention, la question sur l'espérance de vie a une incohérence : `bonne_reponse` = a (33 ans) mais `resultat` = "Environ 40 ans". Importe-la telle quelle : la validation doit la signaler dans l'interface (c'est un bon test).

## Génération IA

### Flux principal "Nouvelle question"

1. Bernard clique sur **Nouvelle question** et choisit catégorie, sous-catégorie et format (chacun peut rester sur "au hasard"), plus une consigne libre facultative ("sur la vaccination en Afrique au XXe siècle").
2. Il arrive directement sur l'éditeur. La génération démarre toute seule, en streaming : les champs se remplissent au fur et à mesure.
3. Tous les champs sont éditables. Chaque champ a un bouton **Régénérer**, avec une consigne facultative ("rends l'indice 2 moins évident").
4. La question est créée en statut `brouillon_ia`.

### Construction du prompt

- Prompt final = prompt système commun (version active) + prompt du format (version active) + variables injectées.
- Variables disponibles dans les prompts : `{{categorie}}`, `{{sous_categorie}}`, `{{format_nom}}`, `{{format_gabarit}}`, `{{format_reponses}}`, `{{format_ressort}}`, `{{consigne}}`, `{{exemples}}` (les questions validées du même format, sinon toutes les validées, au maximum 5), `{{questions_existantes}}` (les intitulés existants de la sous-catégorie, pour éviter les doublons).
- **Ordre de génération imposé** par le JSON schema : d'abord `fait`, `chiffres`, `calculs`, `resultat`, puis la question, les réponses, `bonne_reponse`, les indices, le commentaire et la source. Le modèle établit les faits avant d'écrire la question, ce qui réduit les incohérences.
- Utilise les **Structured Outputs** OpenAI (JSON schema strict dérivé du schéma Zod partagé).
- Modèle et température dans Réglages. Modèle par défaut lu dans `OPENAI_MODEL`.
- Écris des prompts initiaux de bonne qualité (1 système + 1 par format actif), en t'appuyant sur les règles éditoriales ci-dessous. Bernard les fera évoluer.

### Règles éditoriales à mettre dans le prompt système

- La question doit pouvoir se comprendre sans connaissance préalable et se baser sur une donnée solide, chiffrée et sourcée (sources de référence : Maddison Project, Our World in Data, Banque mondiale, ONU, OCDE, revues scientifiques). Si une donnée est trop discutable, il vaut mieux changer de question.
- Les 3 réponses suivent l'échelle décrite par le format. Les mauvaises réponses doivent être plausibles, et la bonne réponse ne doit pas être systématiquement au même endroit.
- Gradation stricte des indices : chacun apporte une information nouvelle, plus précise que la précédente. Aucun indice ne donne la réponse directement. L'indice 3 doit permettre à un joueur attentif de trouver.
- Le commentaire explique le chiffre et le "pourquoi c'est surprenant", en 2 à 4 phrases, avec les données clés.
- `resultat` doit correspondre exactement à la réponse désignée par `bonne_reponse`.
- Ton sobre et précis. Pas d'emojis, pas de superlatifs creux.

## Validation automatique (dans `packages/shared`)

Affiche les contrôles dans l'éditeur, sous forme d'une liste "Points à vérifier". Ils sont **non bloquants**, sauf ceux marqués (bloquant), qui empêchent le statut `validee`.

- (bloquant) Tous les champs joueur sont remplis : question, 3 réponses, bonne réponse, 3 indices, commentaire, source.
- (bloquant) Les 3 réponses sont distinctes.
- Le `resultat` ne correspond pas au texte de la bonne réponse (comparaison normalisée, et comparaison des nombres extraits quand il y en a).
- Un indice contient le texte exact de la bonne réponse.
- Les indices 1 à 3 vont du plus court ou plus vague au plus précis (heuristique simple, simple avertissement).
- Le lien source ne répond pas : vérification côté serveur (HEAD, puis GET en repli, timeout 5 s), relancée à la demande.
- Doublon probable avec une question existante (similarité des intitulés).
- Ajoute aussi un bouton **"Relecture critique IA"** : un second appel qui joue le vérificateur sceptique (chiffres plausibles ? cohérence question / réponse / commentaire ? gradation des indices ? ambiguïtés ?). Il renvoie une liste de remarques affichées à côté des contrôles, sans rien modifier.

## Écrans (voir `/design`, c'est la référence visuelle)

1. **Connexion** : un champ mot de passe, dans le style du design.
2. **Questions** : tableau filtrable (statut, catégorie, sous-catégorie, format, impact, recherche texte), avec compteurs par statut et par sous-catégorie comparés à la cible. Clic sur une ligne pour ouvrir l'éditeur.
3. **Éditeur de question** (`/design/source/Admin-Editeur.dc.html`) :
   - à gauche, le formulaire complet (champs joueur, puis section repliable "Coulisses" avec fait, chiffres, calculs, resultat), les boutons Régénérer et l'état "génération en cours" ;
   - à droite, un **téléphone simulé** qui affiche en direct ce que verra le joueur, avec un sélecteur d'état (Question / Indice 1 / Indice 2 / Indice 3 / Réponse juste / Réponse fausse) et les points correspondants au barème ;
   - la liste "Points à vérifier" ;
   - la barre d'action : **Valider**, **À affiner**, **Non retenue**, avec un commentaire interne facultatif. La date d'examen est remplie automatiquement ;
   - l'historique des versions de la question, avec restauration ;
   - les raccourcis clavier : Cmd/Ctrl+S pour enregistrer, Cmd/Ctrl+Entrée pour valider.
4. **Prompts** (`/design/source/Admin-Prompts.dc.html`) : liste par format plus le prompt système. L'éditeur montre les variables disponibles, l'historique des versions avec un diff entre deux versions, l'activation d'une version et un bouton **"Tester"** qui génère une question sans l'enregistrer.
5. **Réglages** : barème, modèle, température, taxonomie (CRUD catégories et sous-catégories, couleurs, cibles), formats (CRUD, actif ou inactif).
6. **Export** : bouton "Exporter en Excel (.xlsx)" des questions avec les mêmes colonnes que le fichier de Bernard. Il a l'habitude de travailler dans Excel.

## Design

- Lis tout `/design` (README, `source/`, `preview/`). Commence par créer `DESIGN.md` (principes, tokens, composants) et le thème Tailwind, **avant tout écran**.
- **Ne copie pas le HTML des maquettes** : reconstruis-le en composants React propres. Réutilise le même composant `PhonePreview` / `QuestionCard` dans l'éditeur, et prévois qu'il puisse être porté plus tard vers React Native (logique de score et d'état dans `shared`).
- Polices : Fraunces, Archivo, IBM Plex Mono (Google Fonts). Rayons de 2 px, bordures fines, pas d'ombres portées, pas de dégradés décoratifs.
- À éviter : le look shadcn par défaut, la police Inter, les icônes étincelles ou les emojis, les tuiles KPI génériques, les modales partout. L'outil doit être agréable et chaleureux, pas un back-office gris.
- Les états vides, de chargement et d'erreur sont soignés et rédigés en français naturel.

## Fichiers à créer

- `CLAUDE.md` : contexte du projet, commandes, conventions, règles éditoriales, rappel que `/design` est une référence visuelle seulement.
- `DESIGN.md`, `DECISIONS.md`, `README.md` (installation et lancement en 3 commandes).
- `.env.example` : `ADMIN_PASSWORD`, `SESSION_SECRET`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `DATABASE_PATH`.
- `.gitignore` incluant `.env` et le fichier SQLite.

## Tests

- Vitest dans `shared` : fonction de score (toutes les combinaisons du barème), règles de validation (dont le cas de l'espérance de vie qui doit lever l'alerte resultat / bonne réponse), construction du prompt (injection des variables).
- Un test d'API : la route admin est refusée sans session, et la route publique ne renvoie que les questions validées sans champs internes.
- Le client OpenAI est derrière une interface, avec un faux client utilisé quand `OPENAI_API_KEY` est absente : l'app reste utilisable en démo avec des réponses factices.

## Définition de fini

- [ ] `npm install && npm run db:seed && npm run dev` fonctionne sur une machine propre.
- [ ] Connexion, déconnexion et protection des routes OK.
- [ ] Créer une question avec l'IA, la modifier, régénérer un champ, la valider : elle apparaît dans `GET /api/public/questions`.
- [ ] Le téléphone simulé reflète chaque modification en direct, dans tous les états.
- [ ] Les 5 questions de Bernard sont importées, et l'incohérence sur l'espérance de vie est signalée.
- [ ] Modifier un prompt crée une version, et une question générée garde la trace de sa version.
- [ ] L'export xlsx s'ouvre dans Excel.
- [ ] `npm run typecheck`, `npm run lint` et `npm test` passent.
- [ ] Tu as fait une capture d'écran (Playwright) de l'éditeur et du téléphone simulé, et tu l'as comparée aux maquettes `/design/preview`. Corrige les écarts visibles.
- [ ] Résumé final : ce qui est fait, les décisions prises, les limites connues, les prochaines étapes suggérées.
