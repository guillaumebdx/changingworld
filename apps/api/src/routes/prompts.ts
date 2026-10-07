import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { desc, eq, isNull, sql } from 'drizzle-orm';
import { nouvellePromptVersionSchema, testPromptSchema, VARIABLES_PROMPT } from '@changing-world/shared';
import type { Deps } from '../deps.js';
import { schema } from '../db/index.js';
import { conflit, hasard, introuvable, lireCorps, lireId } from '../http.js';
import { ErreurGeneration, genererQuestion, preparerContexte } from '../ia/generation.js';
import { activerVersion, ajouterVersion, assurerPromptDuFormat } from '../services/prompts.js';
import { PROMPT_FORMAT_GENERIQUE, PROMPTS_FORMATS_INITIAUX } from '../ia/promptsInitiaux.js';
import { lireReglages } from '../services/reglages.js';
import { compteurs } from '../services/questions.js';

const { prompts, promptVersions, formats, questions, sousCategories } = schema;

export function routesPrompts(deps: Deps) {
  const { db, env, ia } = deps;
  const app = new Hono();

  app.get('/', (c) => {
    // Rattrape les formats activés sans prompt (bases créées avant cette règle).
    for (const f of db.select().from(formats).where(eq(formats.actif, true)).all()) {
      assurerPromptDuFormat(db, f, PROMPTS_FORMATS_INITIAUX, PROMPT_FORMAT_GENERIQUE);
    }
    const liste = db
      .select({ p: prompts, format_nom: formats.nom, format_code: formats.code, format_actif: formats.actif })
      .from(prompts)
      .leftJoin(formats, eq(prompts.format_id, formats.id))
      .orderBy(sql`${prompts.format_id} is not null`, formats.actif, prompts.id)
      .all()
      .map((l) => {
        const versions = db
          .select()
          .from(promptVersions)
          .where(eq(promptVersions.prompt_id, l.p.id))
          .orderBy(desc(promptVersions.version))
          .all();
        const active = versions.find((v) => v.active) ?? null;
        const nbQuestions = l.p.format_id
          ? (db.select({ n: sql<number>`count(*)` }).from(questions).where(eq(questions.format_id, l.p.format_id)).get()?.n ?? 0)
          : (db.select({ n: sql<number>`count(*)` }).from(questions).get()?.n ?? 0);
        return {
          ...l.p,
          format_nom: l.format_nom,
          format_code: l.format_code,
          format_actif: l.format_actif,
          version_active: active ? { id: active.id, version: active.version, created_at: active.created_at } : null,
          nb_versions: versions.length,
          derniere_modification: versions[0]?.created_at ?? l.p.created_at,
          nb_questions: nbQuestions,
        };
      });
    return c.json({ prompts: liste, variables: VARIABLES_PROMPT });
  });

  app.get('/:id', (c) => {
    const id = lireId(c);
    const p = db.select().from(prompts).where(eq(prompts.id, id)).get();
    if (!p) throw introuvable('Prompt');
    const versions = db
      .select()
      .from(promptVersions)
      .where(eq(promptVersions.prompt_id, id))
      .orderBy(desc(promptVersions.version))
      .all()
      .map((v) => ({
        ...v,
        nb_questions_generees: db.select({ n: sql<number>`count(*)` }).from(questions).where(eq(questions.prompt_version_id, v.id)).get()?.n ?? 0,
      }));
    const format = p.format_id ? db.select().from(formats).where(eq(formats.id, p.format_id)).get() : null;
    return c.json({ prompt: p, format: format ?? null, versions, variables: VARIABLES_PROMPT });
  });

  app.post('/:id/versions', async (c) => {
    const id = lireId(c);
    if (!db.select().from(prompts).where(eq(prompts.id, id)).get()) throw introuvable('Prompt');
    const corps = await lireCorps(c, nouvellePromptVersionSchema);
    const version = ajouterVersion(db, id, corps.contenu, corps.note_de_version?.trim() || null);
    return c.json({ version }, 201);
  });

  app.post('/:id/versions/:vid/activer', (c) => {
    const id = lireId(c);
    const vid = lireId(c, 'vid');
    if (!activerVersion(db, id, vid)) throw introuvable('Version');
    return c.json({ ok: true });
  });

  /** Teste un prompt (enregistré ou brouillon) : génère une question sans rien enregistrer. */
  app.post('/tester', async (c) => {
    const corps = await lireCorps(c, testPromptSchema);
    let formatId = corps.format_id ?? null;
    if (!formatId) {
      const actifs = db.select().from(formats).where(eq(formats.actif, true)).all();
      formatId = hasard(actifs)?.id ?? null;
    }
    if (!formatId) throw conflit('Aucun format actif.');
    let sousCatId = corps.sous_categorie_id ?? null;
    if (!sousCatId) {
      const candidates = compteurs(db).parSousCategorie.filter((s) => (corps.categorie_id ? s.categorie_id === corps.categorie_id : true));
      sousCatId = hasard(candidates)?.id ?? null;
    }
    if (!sousCatId) throw conflit('Aucune sous-catégorie disponible.');
    const sousCat = db.select().from(sousCategories).where(eq(sousCategories.id, sousCatId)).get();
    if (!sousCat) throw introuvable('Sous-catégorie');

    let ctx;
    try {
      ctx = preparerContexte(db, {
        categorie_id: sousCat.categorie_id,
        sous_categorie_id: sousCat.id,
        format_id: formatId,
        consigne: corps.consigne,
        contenu_systeme: corps.contenu_systeme,
        contenu_format: corps.contenu_format,
      });
    } catch (e) {
      if (e instanceof ErreurGeneration) return c.json({ erreur: e.message }, 409);
      throw e;
    }
    const reglages = lireReglages(db, env);
    return streamSSE(c, async (stream) => {
      const controleur = new AbortController();
      stream.onAbort(() => controleur.abort());
      await stream.writeSSE({
        event: 'contexte',
        data: JSON.stringify({ categorie: ctx.categorie.nom, sous_categorie: ctx.sousCategorie.nom, format: ctx.format.nom }),
      });
      for await (const ev of genererQuestion(ia, ctx, reglages, controleur.signal)) {
        if (ev.type === 'champ') {
          await stream.writeSSE({ event: 'champ', data: JSON.stringify({ champ: ev.champ, valeur: ev.valeur }) });
        } else if (ev.type === 'erreur') {
          await stream.writeSSE({ event: 'erreur', data: JSON.stringify({ message: ev.message }) });
        } else {
          await stream.writeSSE({ event: 'fin', data: JSON.stringify({ contenu: ev.donnees }) });
        }
      }
    });
  });

  /** Le prompt système, pour accès direct. */
  app.get('/systeme/actif', (c) => {
    const p = db.select().from(prompts).where(isNull(prompts.format_id)).get();
    if (!p) throw introuvable('Prompt système');
    return c.json({ prompt: p });
  });

  return app;
}
