# Changing World : atelier éditorial

Admin et API du jeu éducatif **Changing World**. L'atelier sert à produire la base de questions avec l'aide de l'IA : génération en streaming, relecture, contrôles automatiques, validation, export Excel. L'app joueur (Expo) consommera `GET /api/public/questions` et `GET /api/public/taxonomie`.

## Installation et lancement

```bash
npm install
npm run db:seed
npm run dev
```

Puis ouvrez http://localhost:5173. Le mot de passe est celui de `ADMIN_PASSWORD` dans votre `.env` (copiez `.env.example` vers `.env` ; sans fichier, le mot de passe de développement est `changez-moi`).

Sans `OPENAI_API_KEY`, l'atelier tourne en **mode démo** : les générations sont factices mais tout le reste fonctionne. Avec une clé, renseignez aussi `OPENAI_MODEL` (modifiable ensuite dans Réglages).

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | API Hono sur le port 3001 et admin Vite sur le port 5173 |
| `npm run db:seed` | applique les migrations et charge `/seed` (relançable sans risque) |
| `npm run db:migrate` | applique seulement les migrations |
| `npm run typecheck` | TypeScript strict sur les trois workspaces |
| `npm run lint` | ESLint |
| `npm test` | Vitest : règles partagées et API |
| `npm run build` | construit l'admin dans `apps/admin/dist`, servie par l'API si présente |
| `npm run capture` | captures d'écran Playwright dans `captures/` (dev lancé, `npx playwright install chromium` fait une fois) |

## Organisation

- `packages/shared` : types, schémas Zod, barème et score, état de jeu, validation, construction du prompt. Réutilisable par l'app mobile.
- `apps/api` : Hono, SQLite (better-sqlite3) et Drizzle, authentification par cookie signé, génération OpenAI en streaming derrière une interface (faux client en démo), export xlsx.
- `apps/admin` : React, Vite, React Router, TanStack Query, Tailwind v4 avec les tokens du design.
- `seed/` : taxonomie, formats, questions de référence.
- `design/` : maquettes, référence visuelle seulement.

Documents : `DESIGN.md` (principes, tokens, composants), `DECISIONS.md` (choix et limites), `CLAUDE.md` (contexte pour l'assistant), `deploy/DEPLOIEMENT.md` (mise en production : nginx, systemd, mises à jour).

## API

Routes publiques (lecture seule) :

- `GET /api/public/questions` : questions validées, sans champs internes
- `GET /api/public/taxonomie`

Routes d'administration (`/api/admin/*`, session requise) : questions (liste, création, génération et régénération en SSE, enregistrement, statut, historique, restauration, relecture critique), taxonomie, formats, prompts et versions, réglages, export xlsx, vérification de lien.
