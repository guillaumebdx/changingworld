# Changing World : contexte pour Claude Code

## Le projet

Changing World est un jeu éducatif mobile (esprit Gapminder / Factfulness) : une question chiffrée, trois réponses, jusqu'à trois indices, un commentaire et une source. Ce dépôt contient **l'admin éditoriale** et **l'API**. L'app joueur (Expo) viendra plus tard et consommera `GET /api/public/*`.

L'admin a un seul utilisateur : **Bernard**, responsable éditorial, non technique, sur desktop. Il génère des questions avec l'IA, les relit, les corrige et les valide. Sa crainte principale est la fiabilité : l'outil doit l'aider à **vérifier**, pas seulement à générer. Toute l'interface est en français.

## Commandes

```bash
npm install            # installe tout le monorepo
npm run db:seed        # applique les migrations et charge /seed (idempotent)
npm run dev            # API (3001) + admin Vite (5173) ensemble
npm run typecheck      # tsc dans chaque workspace
npm run lint           # ESLint à la racine
npm test               # Vitest : shared (unitaires) + api (intégration)
npm run capture        # captures Playwright de l'admin (dev lancé, Chromium installé)
npm run db:generate -w apps/api   # régénère une migration Drizzle après un changement de schéma
```

Variables d'environnement : voir `.env.example`. Sans `OPENAI_API_KEY`, l'API bascule sur un **faux client IA** (mode démo).

## Structure

```
packages/shared   types, schémas Zod, score, état de jeu, validation, prompt, parsing JSON partiel (réutilisable par Expo)
apps/api          Hono + SQLite (better-sqlite3) + Drizzle ; auth cookie ; IA derrière une interface ; export xlsx
apps/admin        React + Vite + React Router + TanStack Query + Tailwind v4 (tokens dans src/styles/theme.css)
seed/             taxonomie, formats et questions de référence de Bernard
design/           maquettes Claude Design : RÉFÉRENCE VISUELLE SEULEMENT, ne jamais copier leur HTML
```

Points d'entrée : `apps/api/src/index.ts` (serveur), `apps/api/src/app.ts` (routes), `apps/api/src/seed.ts`, `apps/admin/src/App.tsx`, `apps/admin/src/pages/Editeur.tsx`.

## Conventions

- TypeScript strict partout, ESM, imports de types explicites (`import type`).
- **Nommage en français** dans le code métier (fonctions, variables, routes, messages). Les identifiants de colonnes suivent le modèle de données du cahier des charges (`bonne_reponse`, `source_lien`…).
- La logique de jeu (score, état d'une partie, vue joueur) vit dans `shared/etatJeu.ts` et `shared/score.ts` : le composant `QuestionCard` ne calcule rien, il affiche. Il doit rester portable vers React Native.
- Les contrôles de validation vivent dans `shared/validation.ts` et s'exécutent à la fois côté admin (liste « Points à vérifier ») et côté API (refus du statut `validee` si un contrôle bloquant échoue).
- Les prompts ne se modifient jamais en place : chaque enregistrement crée une `prompt_version`, une seule est active par prompt. Une question garde `prompt_version_id`.
- Chaque génération, régénération ou enregistrement crée une entrée dans `question_historique`.
- Les Structured Outputs OpenAI utilisent un JSON schema strict dérivé de `questionGenereeSchema` (`versJsonSchemaStrict`). L'ordre des clés du schéma est l'ordre de génération : faits d'abord, question ensuite.
- Le streaming passe par SSE (`hono/streaming`) ; le serveur découpe le JSON partiel en événements `champ` (`shared/jsonPartiel.ts`).
- Pas de lib de composants, pas de shadcn, pas d'Inter, pas d'emojis ni d'icônes étincelles, pas de modales, pas d'ombres. Rayons 2 px. Voir `DESIGN.md`.
- Les textes d'interface (vides, chargement, erreurs) sont rédigés en français naturel, au vouvoiement.

## Règles éditoriales (résumé, détail dans le prompt système)

1. Question compréhensible sans connaissance préalable, fondée sur une donnée solide, chiffrée et sourcée (Maddison, Our World in Data, Banque mondiale, ONU, OCDE, revues scientifiques).
2. Trois réponses sur l'échelle du format ; mauvaises réponses plausibles ; bonne réponse pas toujours à la même place.
3. Indices strictement gradués, du plus vague au plus précis ; aucun ne donne la réponse ; l'indice 3 permet de trouver.
4. Commentaire en 2 à 4 phrases : le chiffre et le pourquoi c'est surprenant.
5. `resultat` doit correspondre exactement à la réponse désignée par `bonne_reponse` (seule source de vérité).
6. Ton sobre et précis, pas d'emojis ni de superlatifs.

## Pièges connus

- `bonne_reponse` est la seule source de vérité ; `resultat` est un champ de travail. La question de Bernard sur l'espérance de vie est volontairement incohérente (a = 33 ans, resultat = 40 ans) et sert de test.
- Le paquet `shared` est consommé en TypeScript source (pas de build) : Vite, tsx et Vitest le compilent à la volée.
- better-sqlite3 est un module natif : après un changement de version de Node, relancer `npm rebuild better-sqlite3`.
- Les modèles de raisonnement OpenAI (`o*`, `gpt-5*`) refusent `temperature` : le client l'omet automatiquement.
