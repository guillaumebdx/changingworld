import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { lireEnv, RACINE, verifierEnv } from './env.js';
import { ouvrirBase } from './db/index.js';
import { creerClientIA } from './ia/client.js';
import { LimiteurTentatives } from './auth.js';
import { creerApp } from './app.js';

const env = lireEnv();
const erreurs = verifierEnv(env);
if (erreurs.length > 0) {
  console.error('Configuration incomplète :\n- ' + erreurs.join('\n- '));
  process.exit(1);
}

const db = ouvrirBase(env.DATABASE_PATH);
const ia = creerClientIA(env.OPENAI_API_KEY);
const app = creerApp({ db, env, ia, limiteur: new LimiteurTentatives() });

// En production, l'API sert aussi l'admin construite par Vite.
const dossierAdmin = resolve(RACINE, 'apps/admin/dist');
if (existsSync(dossierAdmin)) {
  const racineRelative = relative(process.cwd(), dossierAdmin).split('\\').join('/');
  app.use('/*', serveStatic({ root: racineRelative }));
  const index = serveStatic({ root: racineRelative, path: 'index.html' });
  app.use('*', async (c, next) => {
    if (c.req.path.startsWith('/api/') || c.req.method !== 'GET') return next();
    return index(c, next);
  });
}

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`API Changing World à l'écoute sur http://localhost:${info.port}`);
  console.log(`Base SQLite : ${env.DATABASE_PATH}`);
  console.log(
    ia.nom === 'demo'
      ? 'IA : mode démo (OPENAI_API_KEY absente), les générations sont factices.'
      : `IA : OpenAI, modèle par défaut ${env.OPENAI_MODEL}.`,
  );
});
