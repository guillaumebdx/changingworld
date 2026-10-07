import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { categorieInputSchema, sousCategorieInputSchema } from '@changing-world/shared';
import type { Deps } from '../deps.js';
import type { Db } from '../db/index.js';
import { schema } from '../db/index.js';
import { conflit, introuvable, lireCorps, lireId } from '../http.js';

const { categories, sousCategories, questions } = schema;

export function taxonomieComplete(db: Db) {
  const cats = db.select().from(categories).orderBy(categories.ordre, categories.nom).all();
  const sous = db.select().from(sousCategories).orderBy(sousCategories.ordre, sousCategories.nom).all();
  return {
    categories: cats.map((c) => ({ ...c, sous_categories: sous.filter((s) => s.categorie_id === c.id) })),
  };
}

function nbQuestions(db: Db, ou: ReturnType<typeof eq>): number {
  return db.select({ n: sql<number>`count(*)` }).from(questions).where(ou).get()?.n ?? 0;
}

export function routesTaxonomie({ db }: Deps) {
  const app = new Hono();

  app.get('/taxonomie', (c) => c.json(taxonomieComplete(db)));

  app.post('/categories', async (c) => {
    const corps = await lireCorps(c, categorieInputSchema);
    if (db.select().from(categories).where(eq(categories.nom, corps.nom)).get()) {
      throw conflit('Une catégorie porte déjà ce nom.');
    }
    const ordre = corps.ordre ?? (db.select({ m: sql<number | null>`max(${categories.ordre})` }).from(categories).get()?.m ?? 0) + 1;
    const insere = db.insert(categories).values({ nom: corps.nom, couleur: corps.couleur, ordre }).returning().get();
    return c.json({ categorie: insere }, 201);
  });

  app.put('/categories/:id', async (c) => {
    const id = lireId(c);
    if (!db.select().from(categories).where(eq(categories.id, id)).get()) throw introuvable('Catégorie');
    const corps = await lireCorps(c, categorieInputSchema.partial());
    db.update(categories).set(corps).where(eq(categories.id, id)).run();
    return c.json({ categorie: db.select().from(categories).where(eq(categories.id, id)).get() });
  });

  app.delete('/categories/:id', (c) => {
    const id = lireId(c);
    if (!db.select().from(categories).where(eq(categories.id, id)).get()) throw introuvable('Catégorie');
    const n = nbQuestions(db, eq(questions.categorie_id, id));
    if (n > 0) throw conflit(`Impossible de supprimer : ${n} question${n > 1 ? 's' : ''} utilise${n > 1 ? 'nt' : ''} cette catégorie.`);
    db.delete(categories).where(eq(categories.id, id)).run();
    return c.json({ ok: true });
  });

  app.post('/sous-categories', async (c) => {
    const corps = await lireCorps(c, sousCategorieInputSchema);
    if (!db.select().from(categories).where(eq(categories.id, corps.categorie_id)).get()) throw introuvable('Catégorie');
    const ordre =
      corps.ordre ??
      (db
        .select({ m: sql<number | null>`max(${sousCategories.ordre})` })
        .from(sousCategories)
        .where(eq(sousCategories.categorie_id, corps.categorie_id))
        .get()?.m ?? 0) + 1;
    const insere = db
      .insert(sousCategories)
      .values({ categorie_id: corps.categorie_id, nom: corps.nom, nb_questions_cible: corps.nb_questions_cible ?? null, ordre })
      .returning()
      .get();
    return c.json({ sous_categorie: insere }, 201);
  });

  app.put('/sous-categories/:id', async (c) => {
    const id = lireId(c);
    if (!db.select().from(sousCategories).where(eq(sousCategories.id, id)).get()) throw introuvable('Sous-catégorie');
    const corps = await lireCorps(c, sousCategorieInputSchema.partial());
    db.update(sousCategories).set(corps).where(eq(sousCategories.id, id)).run();
    return c.json({ sous_categorie: db.select().from(sousCategories).where(eq(sousCategories.id, id)).get() });
  });

  app.delete('/sous-categories/:id', (c) => {
    const id = lireId(c);
    if (!db.select().from(sousCategories).where(eq(sousCategories.id, id)).get()) throw introuvable('Sous-catégorie');
    const n = nbQuestions(db, eq(questions.sous_categorie_id, id));
    if (n > 0) throw conflit(`Impossible de supprimer : ${n} question${n > 1 ? 's' : ''} utilise${n > 1 ? 'nt' : ''} cette sous-catégorie.`);
    db.delete(sousCategories).where(eq(sousCategories.id, id)).run();
    return c.json({ ok: true });
  });

  return app;
}
