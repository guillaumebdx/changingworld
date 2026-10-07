import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { formatInputSchema } from '@changing-world/shared';
import type { Deps } from '../deps.js';
import { schema } from '../db/index.js';
import { conflit, introuvable, lireCorps, lireId } from '../http.js';
import { PROMPT_FORMAT_GENERIQUE, PROMPTS_FORMATS_INITIAUX } from '../ia/promptsInitiaux.js';
import { assurerPromptDuFormat } from '../services/prompts.js';

const { formats, questions, prompts } = schema;

export function routesFormats({ db }: Deps) {
  const app = new Hono();

  app.get('/', (c) => {
    const liste = db.select().from(formats).orderBy(sql`${formats.actif} desc`, formats.id).all();
    return c.json({ formats: liste });
  });

  app.post('/', async (c) => {
    const corps = await lireCorps(c, formatInputSchema);
    if (db.select().from(formats).where(eq(formats.code, corps.code)).get()) throw conflit('Un format porte déjà ce code.');
    const insere = db
      .insert(formats)
      .values({
        code: corps.code,
        nom: corps.nom,
        gabarit: corps.gabarit ?? null,
        exemple: corps.exemple ?? null,
        reponses: corps.reponses ?? null,
        ressort: corps.ressort ?? null,
        actif: corps.actif,
      })
      .returning()
      .get();
    // Chaque format reçoit un prompt v1 pour pouvoir générer immédiatement.
    assurerPromptDuFormat(db, insere, PROMPTS_FORMATS_INITIAUX, PROMPT_FORMAT_GENERIQUE);
    return c.json({ format: insere }, 201);
  });

  app.put('/:id', async (c) => {
    const id = lireId(c);
    if (!db.select().from(formats).where(eq(formats.id, id)).get()) throw introuvable('Format');
    const corps = await lireCorps(c, formatInputSchema.partial());
    if (corps.code) {
      const autre = db.select().from(formats).where(eq(formats.code, corps.code)).get();
      if (autre && autre.id !== id) throw conflit('Un autre format porte déjà ce code.');
    }
    db.update(formats).set(corps).where(eq(formats.id, id)).run();
    if (corps.nom) db.update(prompts).set({ nom: corps.nom }).where(eq(prompts.format_id, id)).run();
    const maj = db.select().from(formats).where(eq(formats.id, id)).get()!;
    // Un format qui devient actif doit avoir son prompt, visible et modifiable dans l'écran Prompts.
    if (maj.actif) assurerPromptDuFormat(db, maj, PROMPTS_FORMATS_INITIAUX, PROMPT_FORMAT_GENERIQUE);
    return c.json({ format: maj });
  });

  app.delete('/:id', (c) => {
    const id = lireId(c);
    if (!db.select().from(formats).where(eq(formats.id, id)).get()) throw introuvable('Format');
    const n = db.select({ n: sql<number>`count(*)` }).from(questions).where(eq(questions.format_id, id)).get()?.n ?? 0;
    if (n > 0) throw conflit(`Impossible de supprimer : ${n} question${n > 1 ? 's' : ''} utilise${n > 1 ? 'nt' : ''} ce format. Désactivez-le plutôt.`);
    db.delete(formats).where(eq(formats.id, id)).run();
    return c.json({ ok: true });
  });

  return app;
}
