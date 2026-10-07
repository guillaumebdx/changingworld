import { Hono } from 'hono';
import type { Deps } from '../deps.js';
import { questionsPubliques } from '../services/questions.js';
import { taxonomieComplete } from './taxonomie.js';

/** Routes publiques en lecture seule pour la future app joueur. */
export function routesPubliques({ db }: Deps) {
  const app = new Hono();
  app.get('/questions', (c) => c.json({ questions: questionsPubliques(db) }));
  app.get('/taxonomie', (c) => c.json(taxonomieComplete(db)));
  return app;
}
