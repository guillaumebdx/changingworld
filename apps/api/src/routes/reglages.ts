import { Hono } from 'hono';
import { reglagesSchema } from '@changing-world/shared';
import type { Deps } from '../deps.js';
import { lireCorps } from '../http.js';
import { ecrireReglages, lireReglages } from '../services/reglages.js';

export function routesReglages({ db, env, ia }: Deps) {
  const app = new Hono();

  app.get('/', (c) => c.json({ reglages: lireReglages(db, env), ia: { mode: ia.nom, modele_env: env.OPENAI_MODEL } }));

  app.put('/', async (c) => {
    const corps = await lireCorps(c, reglagesSchema);
    ecrireReglages(db, corps);
    return c.json({ reglages: lireReglages(db, env) });
  });

  return app;
}
