import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { exigerSession } from './auth.js';
import type { Deps } from './deps.js';
import { routesAuth } from './routes/auth.js';
import { routesExport } from './routes/export.js';
import { routesFormats } from './routes/formats.js';
import { routesPrompts } from './routes/prompts.js';
import { routesPubliques } from './routes/public.js';
import { routesOutils, routesQuestions } from './routes/questions.js';
import { routesReglages } from './routes/reglages.js';
import { routesTaxonomie } from './routes/taxonomie.js';

export function creerApp(deps: Deps) {
  const app = new Hono();

  if (!deps.env.TEST) app.use('*', logger());

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ erreur: err.message }, err.status);
    }
    console.error(err);
    return c.json({ erreur: 'Une erreur inattendue s’est produite côté serveur.' }, 500);
  });

  app.notFound((c) => c.json({ erreur: 'Cette adresse n’existe pas.' }, 404));

  app.get('/api/sante', (c) => c.json({ ok: true, ia: deps.ia.nom }));

  app.route('/api/auth', routesAuth(deps));

  const admin = new Hono();
  admin.use('*', exigerSession(deps.env));
  admin.route('/questions', routesQuestions(deps));
  admin.route('/outils', routesOutils());
  admin.route('/', routesTaxonomie(deps));
  admin.route('/formats', routesFormats(deps));
  admin.route('/prompts', routesPrompts(deps));
  admin.route('/reglages', routesReglages(deps));
  admin.route('/', routesExport(deps));
  app.route('/api/admin', admin);

  app.route('/api/public', routesPubliques(deps));

  return app;
}

export type App = ReturnType<typeof creerApp>;
