import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  changementStatutSchema,
  contenuQuestionSchema,
  controlesBloquants,
  creationQuestionSchema,
  miseAJourQuestionSchema,
  normaliser,
  regenerationChampSchema,
  verifierQuestion,
  type QuestionGeneree,
} from '@changing-world/shared';
import type { Deps } from '../deps.js';
import { schema } from '../db/index.js';
import { conflit, hasard, introuvable, lireCorps, lireId } from '../http.js';
import { genererQuestion, preparerContexte, regenererChamp, relireQuestion, ErreurGeneration } from '../ia/generation.js';
import {
  ajouterHistorique,
  compteurs,
  contenuDepuisLigne,
  listerHistorique,
  maintenantIso,
  prochainNumero,
  questionAffichee,
  toutesLesQuestionsAffichees,
} from '../services/questions.js';
import { lireReglages } from '../services/reglages.js';
import { verifierLien } from '../services/lien.js';

const { questions, categories, sousCategories, formats, questionHistorique } = schema;

/** Choisit catégorie, sous-catégorie et format quand Bernard laisse « au hasard ». */
function resoudreChoix(
  deps: Deps,
  choix: { categorie_id?: number | null; sous_categorie_id?: number | null; format_id?: number | null },
) {
  const { db } = deps;
  let sousCat = choix.sous_categorie_id
    ? db.select().from(sousCategories).where(eq(sousCategories.id, choix.sous_categorie_id)).get()
    : undefined;
  if (choix.sous_categorie_id && !sousCat) throw introuvable('Sous-catégorie');

  if (!sousCat) {
    const stats = compteurs(db).parSousCategorie.filter((s) => (choix.categorie_id ? s.categorie_id === choix.categorie_id : true));
    if (stats.length === 0) throw conflit('Aucune sous-catégorie disponible. Créez-en une dans Réglages.');
    // On privilégie les sous-catégories les plus loin de leur cible.
    const avecDeficit = stats.map((s) => ({ s, deficit: s.cible == null ? 0 : Math.max(0, s.cible - s.total) }));
    const maxDeficit = Math.max(...avecDeficit.map((x) => x.deficit));
    const candidats = avecDeficit.filter((x) => x.deficit === maxDeficit).map((x) => x.s);
    const choisi = hasard(candidats)!;
    sousCat = db.select().from(sousCategories).where(eq(sousCategories.id, choisi.id)).get();
  }
  if (!sousCat) throw introuvable('Sous-catégorie');

  const categorie = db.select().from(categories).where(eq(categories.id, sousCat.categorie_id)).get();
  if (!categorie) throw introuvable('Catégorie');

  let format = choix.format_id ? db.select().from(formats).where(eq(formats.id, choix.format_id)).get() : undefined;
  if (choix.format_id && !format) throw introuvable('Format');
  if (!format) {
    const actifs = db.select().from(formats).where(eq(formats.actif, true)).all();
    format = hasard(actifs);
    if (!format) throw conflit('Aucun format actif. Activez-en un dans Réglages.');
  }
  return { categorie, sousCat, format };
}

export function routesQuestions(deps: Deps) {
  const { db, env, ia } = deps;
  const app = new Hono();

  app.get('/', (c) => {
    const q = c.req.query();
    let liste = toutesLesQuestionsAffichees(db);
    if (q.statut) liste = liste.filter((x) => x.statut === q.statut);
    if (q.categorie_id) liste = liste.filter((x) => x.categorie_id === Number(q.categorie_id));
    if (q.sous_categorie_id) liste = liste.filter((x) => x.sous_categorie_id === Number(q.sous_categorie_id));
    if (q.format_id) liste = liste.filter((x) => x.format_id === Number(q.format_id));
    if (q.impact) liste = liste.filter((x) => x.impact === q.impact);
    if (q.q?.trim()) {
      const recherche = normaliser(q.q);
      liste = liste.filter(
        (x) =>
          String(x.numero) === q.q!.trim() ||
          normaliser(`${x.question} ${x.reponse_a} ${x.reponse_b} ${x.reponse_c} ${x.commentaire} ${x.fait}`).includes(recherche),
      );
    }
    return c.json({ questions: liste });
  });

  app.get('/compteurs', (c) => c.json(compteurs(db)));

  app.get('/intitules', (c) => {
    const lignes = db
      .select({ id: questions.id, numero: questions.numero, question: questions.question, sous_categorie_id: questions.sous_categorie_id })
      .from(questions)
      .all()
      .filter((l) => l.question.trim());
    return c.json({ intitules: lignes });
  });

  app.post('/', async (c) => {
    const corps = await lireCorps(c, creationQuestionSchema);
    const { categorie, sousCat, format } = resoudreChoix(deps, corps);
    const numero = prochainNumero(db);
    const insere = db
      .insert(questions)
      .values({
        numero,
        categorie_id: categorie.id,
        sous_categorie_id: sousCat.id,
        format_id: format.id,
        statut: 'brouillon_ia',
      })
      .returning({ id: questions.id })
      .get();
    return c.json({ question: questionAffichee(db, insere.id) }, 201);
  });

  app.get('/:id', (c) => {
    const q = questionAffichee(db, lireId(c));
    if (!q) throw introuvable('Question');
    return c.json({ question: q });
  });

  app.put('/:id', async (c) => {
    const id = lireId(c);
    const existante = db.select().from(questions).where(eq(questions.id, id)).get();
    if (!existante) throw introuvable('Question');
    const corps = await lireCorps(c, miseAJourQuestionSchema);
    const sousCat = db.select().from(sousCategories).where(eq(sousCategories.id, corps.sous_categorie_id)).get();
    if (!sousCat) throw introuvable('Sous-catégorie');
    const { commentaire_interne, ...contenu } = corps;
    db.update(questions)
      .set({
        ...contenu,
        categorie_id: sousCat.categorie_id,
        commentaire_interne: commentaire_interne === undefined ? existante.commentaire_interne : commentaire_interne,
        updated_at: maintenantIso(),
      })
      .where(eq(questions.id, id))
      .run();
    ajouterHistorique(db, id, 'bernard');
    return c.json({ question: questionAffichee(db, id) });
  });

  app.delete('/:id', (c) => {
    const id = lireId(c);
    const existante = db.select().from(questions).where(eq(questions.id, id)).get();
    if (!existante) throw introuvable('Question');
    if (existante.statut !== 'brouillon_ia') {
      throw conflit('Seuls les brouillons IA peuvent être supprimés. Passez les autres questions en « Non retenue ».');
    }
    db.delete(questions).where(eq(questions.id, id)).run();
    return c.json({ ok: true });
  });

  app.post('/:id/statut', async (c) => {
    const id = lireId(c);
    const existante = db.select().from(questions).where(eq(questions.id, id)).get();
    if (!existante) throw introuvable('Question');
    const corps = await lireCorps(c, changementStatutSchema);
    if (corps.statut === 'validee') {
      const bloquants = controlesBloquants(verifierQuestion(contenuDepuisLigne(existante)));
      if (bloquants.length > 0) {
        return c.json({ erreur: 'La question ne peut pas être validée en l’état.', controles: bloquants }, 409);
      }
    }
    db.update(questions)
      .set({
        statut: corps.statut,
        date_examen: corps.statut === 'brouillon_ia' ? null : maintenantIso(),
        commentaire_interne: corps.commentaire_interne === undefined ? existante.commentaire_interne : corps.commentaire_interne,
        updated_at: maintenantIso(),
      })
      .where(eq(questions.id, id))
      .run();
    ajouterHistorique(db, id, 'bernard');
    return c.json({ question: questionAffichee(db, id) });
  });

  app.get('/:id/historique', (c) => {
    const id = lireId(c);
    if (!db.select({ id: questions.id }).from(questions).where(eq(questions.id, id)).get()) throw introuvable('Question');
    return c.json({ historique: listerHistorique(db, id) });
  });

  app.post('/:id/restaurer/:histId', (c) => {
    const id = lireId(c);
    const histId = lireId(c, 'histId');
    const entree = db
      .select()
      .from(questionHistorique)
      .where(and(eq(questionHistorique.id, histId), eq(questionHistorique.question_id, id)))
      .get();
    if (!entree) throw introuvable("Version de l'historique");
    const snapshot = contenuQuestionSchema.partial().safeParse(entree.snapshot);
    if (!snapshot.success) throw conflit('Cette version ne peut pas être relue.');
    db.update(questions)
      .set({ ...snapshot.data, updated_at: maintenantIso() })
      .where(eq(questions.id, id))
      .run();
    ajouterHistorique(db, id, 'bernard');
    return c.json({ question: questionAffichee(db, id) });
  });

  /** Génération complète en streaming (SSE). */
  app.post('/:id/generer', async (c) => {
    const id = lireId(c);
    const existante = db.select().from(questions).where(eq(questions.id, id)).get();
    if (!existante) throw introuvable('Question');
    const corps = await lireCorps(c, z.object({ consigne: z.string().max(2000).optional() }));
    const reglages = lireReglages(db, env);
    const ctx = preparerContexte(db, {
      categorie_id: existante.categorie_id,
      sous_categorie_id: existante.sous_categorie_id,
      format_id: existante.format_id,
      consigne: corps.consigne,
    });

    return streamSSE(c, async (stream) => {
      const controleur = new AbortController();
      stream.onAbort(() => controleur.abort());
      for await (const ev of genererQuestion(ia, ctx, reglages, controleur.signal)) {
        if (ev.type === 'champ') {
          await stream.writeSSE({ event: 'champ', data: JSON.stringify({ champ: ev.champ, valeur: ev.valeur }) });
        } else if (ev.type === 'erreur') {
          await stream.writeSSE({ event: 'erreur', data: JSON.stringify({ message: ev.message }) });
        } else {
          const d = ev.donnees;
          db.update(questions)
            .set({
              ...d,
              prompt_version_id: ctx.promptVersionId,
              modele_ia: ia.nom === 'demo' ? 'démo (sans clé OpenAI)' : reglages.modele_ia,
              updated_at: maintenantIso(),
            })
            .where(eq(questions.id, id))
            .run();
          ajouterHistorique(db, id, 'ia');
          await stream.writeSSE({ event: 'fin', data: JSON.stringify({ question: questionAffichee(db, id) }) });
        }
      }
    });
  });

  /** Régénération d'un champ (ou d'un groupe de champs) en streaming. */
  app.post('/:id/regenerer', async (c) => {
    const id = lireId(c);
    const existante = db.select().from(questions).where(eq(questions.id, id)).get();
    if (!existante) throw introuvable('Question');
    const corps = await lireCorps(c, regenerationChampSchema);
    const reglages = lireReglages(db, env);
    const ctx = preparerContexte(db, {
      categorie_id: existante.categorie_id,
      sous_categorie_id: existante.sous_categorie_id,
      format_id: existante.format_id,
    });

    return streamSSE(c, async (stream) => {
      const controleur = new AbortController();
      stream.onAbort(() => controleur.abort());
      for await (const ev of regenererChamp(ia, ctx, corps.contenu, corps.champ, corps.consigne, reglages, controleur.signal)) {
        if (ev.type === 'champ') {
          await stream.writeSSE({ event: 'champ', data: JSON.stringify({ champ: ev.champ, valeur: ev.valeur }) });
        } else if (ev.type === 'erreur') {
          await stream.writeSSE({ event: 'erreur', data: JSON.stringify({ message: ev.message }) });
        } else {
          const fusion: Partial<QuestionGeneree> = { ...corps.contenu, ...ev.donnees };
          db.update(questions)
            .set({ ...fusion, updated_at: maintenantIso() })
            .where(eq(questions.id, id))
            .run();
          ajouterHistorique(db, id, 'ia');
          await stream.writeSSE({ event: 'fin', data: JSON.stringify({ champs: ev.donnees, question: questionAffichee(db, id) }) });
        }
      }
    });
  });

  /** Relecture critique : un second appel qui joue le vérificateur sceptique. */
  app.post('/:id/relecture', async (c) => {
    const id = lireId(c);
    const affichee = questionAffichee(db, id);
    if (!affichee) throw introuvable('Question');
    const contenu = await lireCorps(c, contenuQuestionSchema);
    try {
      const relecture = await relireQuestion(
        ia,
        contenu,
        { categorie: affichee.categorie_nom, sous_categorie: affichee.sous_categorie_nom, format: affichee.format_nom },
        lireReglages(db, env),
      );
      return c.json(relecture);
    } catch (e) {
      if (e instanceof ErreurGeneration) return c.json({ erreur: e.message }, 502);
      throw e;
    }
  });

  return app;
}

export function routesOutils() {
  const app = new Hono();
  app.post('/verifier-lien', async (c) => {
    const { url } = await lireCorps(c, z.object({ url: z.string().max(2000) }));
    return c.json(await verifierLien(url));
  });
  return app;
}
