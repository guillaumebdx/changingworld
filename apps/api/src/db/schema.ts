import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const maintenant = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nom: text('nom').notNull().unique(),
  couleur: text('couleur').notNull(),
  ordre: integer('ordre').notNull().default(0),
});

export const sousCategories = sqliteTable(
  'sous_categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    categorie_id: integer('categorie_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    nom: text('nom').notNull(),
    nb_questions_cible: integer('nb_questions_cible'),
    ordre: integer('ordre').notNull().default(0),
  },
  (t) => [index('idx_sous_categories_categorie').on(t.categorie_id)],
);

export const formats = sqliteTable('formats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  nom: text('nom').notNull(),
  gabarit: text('gabarit'),
  exemple: text('exemple'),
  reponses: text('reponses'),
  ressort: text('ressort'),
  actif: integer('actif', { mode: 'boolean' }).notNull().default(true),
});

export const prompts = sqliteTable('prompts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** null = prompt système commun */
  format_id: integer('format_id').references(() => formats.id, { onDelete: 'cascade' }),
  nom: text('nom').notNull(),
  created_at: text('created_at').notNull().default(maintenant),
});

export const promptVersions = sqliteTable(
  'prompt_versions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    prompt_id: integer('prompt_id')
      .notNull()
      .references(() => prompts.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    contenu: text('contenu').notNull(),
    note_de_version: text('note_de_version'),
    active: integer('active', { mode: 'boolean' }).notNull().default(false),
    created_at: text('created_at').notNull().default(maintenant),
  },
  (t) => [index('idx_prompt_versions_prompt').on(t.prompt_id)],
);

export const questions = sqliteTable(
  'questions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    numero: integer('numero').notNull().unique(),
    created_at: text('created_at').notNull().default(maintenant),
    updated_at: text('updated_at').notNull().default(maintenant),
    categorie_id: integer('categorie_id')
      .notNull()
      .references(() => categories.id),
    sous_categorie_id: integer('sous_categorie_id')
      .notNull()
      .references(() => sousCategories.id),
    format_id: integer('format_id')
      .notNull()
      .references(() => formats.id),
    impact: text('impact', { enum: ['INTERESSANT', 'SURPRENANT', 'CHOC'] }).notNull().default('INTERESSANT'),
    question: text('question').notNull().default(''),
    reponse_a: text('reponse_a').notNull().default(''),
    reponse_b: text('reponse_b').notNull().default(''),
    reponse_c: text('reponse_c').notNull().default(''),
    bonne_reponse: text('bonne_reponse', { enum: ['a', 'b', 'c'] }).notNull().default('a'),
    indice_1: text('indice_1').notNull().default(''),
    indice_2: text('indice_2').notNull().default(''),
    indice_3: text('indice_3').notNull().default(''),
    commentaire: text('commentaire').notNull().default(''),
    source_nom: text('source_nom').notNull().default(''),
    source_lien: text('source_lien').notNull().default(''),
    fait: text('fait').notNull().default(''),
    chiffres: text('chiffres').notNull().default(''),
    calculs: text('calculs').notNull().default(''),
    resultat: text('resultat').notNull().default(''),
    statut: text('statut', { enum: ['brouillon_ia', 'a_affiner', 'validee', 'non_retenue'] })
      .notNull()
      .default('brouillon_ia'),
    date_examen: text('date_examen'),
    commentaire_interne: text('commentaire_interne'),
    prompt_version_id: integer('prompt_version_id').references(() => promptVersions.id),
    modele_ia: text('modele_ia'),
  },
  (t) => [
    index('idx_questions_statut').on(t.statut),
    index('idx_questions_sous_categorie').on(t.sous_categorie_id),
    index('idx_questions_format').on(t.format_id),
  ],
);

export const questionHistorique = sqliteTable(
  'question_historique',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    question_id: integer('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    snapshot: text('snapshot', { mode: 'json' }).notNull(),
    auteur: text('auteur', { enum: ['ia', 'bernard'] }).notNull(),
    created_at: text('created_at').notNull().default(maintenant),
  },
  (t) => [index('idx_historique_question').on(t.question_id)],
);

export const reglages = sqliteTable('reglages', {
  cle: text('cle').primaryKey(),
  valeur: text('valeur').notNull(),
});
