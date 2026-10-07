import { Hono } from 'hono';
import { z } from 'zod';
import { adresseClient, comparerEnTempsConstant, fermerSession, ouvrirSession, sessionValide } from '../auth.js';
import type { Deps } from '../deps.js';
import { lireCorps } from '../http.js';

const connexionSchema = z.object({ mot_de_passe: z.string().max(500) });

export function routesAuth({ env, limiteur, ia }: Deps) {
  const app = new Hono();

  app.post('/login', async (c) => {
    const ip = adresseClient(c);
    if (!limiteur.autoriser(ip)) {
      return c.json({ erreur: 'Trop de tentatives. Patientez une minute avant de réessayer.' }, 429);
    }
    const { mot_de_passe } = await lireCorps(c, connexionSchema);
    if (!env.ADMIN_PASSWORD || !comparerEnTempsConstant(mot_de_passe, env.ADMIN_PASSWORD)) {
      return c.json({ erreur: 'Mot de passe incorrect.' }, 401);
    }
    limiteur.reinitialiser(ip);
    await ouvrirSession(c, env);
    return c.json({ ok: true });
  });

  app.post('/logout', (c) => {
    fermerSession(c);
    return c.json({ ok: true });
  });

  app.get('/session', async (c) => {
    const connecte = await sessionValide(c, env);
    return c.json({ connecte, demo: ia.nom === 'demo' });
  });

  return app;
}
