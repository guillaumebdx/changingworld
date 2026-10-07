import { desc, eq, sql } from 'drizzle-orm';
import type { ContenuQuestion, EntreeHistorique, QuestionAffichee, QuestionPublique, Statut } from '@changing-world/shared';
import type { Db } from '../db/index.js';
import { schema } from '../db/index.js';

const { questions, categories, sousCategories, formats, promptVersions, prompts, questionHistorique } = schema;

export type LigneQuestion = typeof questions.$inferSelect;

export function maintenantIso(): string {
  return new Date().toISOString();
}

export function prochainNumero(db: Db): number {
  const ligne = db.select({ max: sql<number | null>`max(${questions.numero})` }).from(questions).get();
  return (ligne?.max ?? 0) + 1;
}

export function contenuDepuisLigne(q: LigneQuestion): ContenuQuestion {
  return {
    question: q.question,
    reponse_a: q.reponse_a,
    reponse_b: q.reponse_b,
    reponse_c: q.reponse_c,
    bonne_reponse: q.bonne_reponse,
    indice_1: q.indice_1,
    indice_2: q.indice_2,
    indice_3: q.indice_3,
    commentaire: q.commentaire,
    source_nom: q.source_nom,
    source_lien: q.source_lien,
    fait: q.fait,
    chiffres: q.chiffres,
    calculs: q.calculs,
    resultat: q.resultat,
    impact: q.impact,
  };
}

/** Enregistre un instantané de la question dans l'historique. */
export function ajouterHistorique(db: Db, questionId: number, auteur: 'ia' | 'bernard'): void {
  const q = db.select().from(questions).where(eq(questions.id, questionId)).get();
  if (!q) return;
  const snapshot = { ...contenuDepuisLigne(q), statut: q.statut, commentaire_interne: q.commentaire_interne };
  db.insert(questionHistorique).values({ question_id: questionId, snapshot, auteur }).run();
}

export function listerHistorique(db: Db, questionId: number): EntreeHistorique[] {
  return db
    .select()
    .from(questionHistorique)
    .where(eq(questionHistorique.question_id, questionId))
    .orderBy(desc(questionHistorique.created_at), desc(questionHistorique.id))
    .all()
    .map((h) => ({
      id: h.id,
      question_id: h.question_id,
      snapshot: h.snapshot as EntreeHistorique['snapshot'],
      auteur: h.auteur,
      created_at: h.created_at,
    }));
}

const selectionAffichee = {
  q: questions,
  categorie_nom: categories.nom,
  categorie_couleur: categories.couleur,
  sous_categorie_nom: sousCategories.nom,
  format_nom: formats.nom,
  format_code: formats.code,
  prompt_version_numero: promptVersions.version,
  prompt_nom: prompts.nom,
};

function versAffichee(l: {
  q: LigneQuestion;
  categorie_nom: string;
  categorie_couleur: string;
  sous_categorie_nom: string;
  format_nom: string;
  format_code: string;
  prompt_version_numero: number | null;
  prompt_nom: string | null;
}): QuestionAffichee {
  return {
    ...l.q,
    categorie_nom: l.categorie_nom,
    categorie_couleur: l.categorie_couleur,
    sous_categorie_nom: l.sous_categorie_nom,
    format_nom: l.format_nom,
    format_code: l.format_code,
    prompt_version_numero: l.prompt_version_numero,
    prompt_nom: l.prompt_nom,
  };
}

function requeteAffichee(db: Db) {
  return db
    .select(selectionAffichee)
    .from(questions)
    .innerJoin(categories, eq(questions.categorie_id, categories.id))
    .innerJoin(sousCategories, eq(questions.sous_categorie_id, sousCategories.id))
    .innerJoin(formats, eq(questions.format_id, formats.id))
    .leftJoin(promptVersions, eq(questions.prompt_version_id, promptVersions.id))
    .leftJoin(prompts, eq(promptVersions.prompt_id, prompts.id));
}

export function questionAffichee(db: Db, id: number): QuestionAffichee | null {
  const l = requeteAffichee(db).where(eq(questions.id, id)).get();
  return l ? versAffichee(l) : null;
}

export function toutesLesQuestionsAffichees(db: Db): QuestionAffichee[] {
  return requeteAffichee(db).orderBy(desc(questions.numero)).all().map(versAffichee);
}

export function questionsPubliques(db: Db): QuestionPublique[] {
  return db
    .select({
      q: questions,
      categorie_id: categories.id,
      categorie_nom: categories.nom,
      categorie_couleur: categories.couleur,
      sous_categorie_id: sousCategories.id,
      sous_categorie_nom: sousCategories.nom,
      format_id: formats.id,
      format_code: formats.code,
      format_nom: formats.nom,
    })
    .from(questions)
    .innerJoin(categories, eq(questions.categorie_id, categories.id))
    .innerJoin(sousCategories, eq(questions.sous_categorie_id, sousCategories.id))
    .innerJoin(formats, eq(questions.format_id, formats.id))
    .where(eq(questions.statut, 'validee'))
    .orderBy(questions.numero)
    .all()
    .map((l) => ({
      id: l.q.id,
      numero: l.q.numero,
      question: l.q.question,
      reponse_a: l.q.reponse_a,
      reponse_b: l.q.reponse_b,
      reponse_c: l.q.reponse_c,
      bonne_reponse: l.q.bonne_reponse,
      indice_1: l.q.indice_1,
      indice_2: l.q.indice_2,
      indice_3: l.q.indice_3,
      commentaire: l.q.commentaire,
      source_nom: l.q.source_nom,
      source_lien: l.q.source_lien,
      impact: l.q.impact,
      categorie: { id: l.categorie_id, nom: l.categorie_nom, couleur: l.categorie_couleur },
      sous_categorie: { id: l.sous_categorie_id, nom: l.sous_categorie_nom },
      format: { id: l.format_id, code: l.format_code, nom: l.format_nom },
    }));
}

export interface Compteurs {
  parStatut: Record<Statut, number>;
  total: number;
  parSousCategorie: {
    id: number;
    nom: string;
    categorie_id: number;
    categorie_nom: string;
    categorie_couleur: string;
    cible: number | null;
    total: number;
    validees: number;
    en_cours: number;
  }[];
}

export function compteurs(db: Db): Compteurs {
  const parStatut: Record<Statut, number> = { brouillon_ia: 0, a_affiner: 0, validee: 0, non_retenue: 0 };
  const lignes = db.select({ statut: questions.statut, n: sql<number>`count(*)` }).from(questions).groupBy(questions.statut).all();
  let total = 0;
  for (const l of lignes) {
    parStatut[l.statut] = l.n;
    total += l.n;
  }
  const parSousCategorie = db
    .select({
      id: sousCategories.id,
      nom: sousCategories.nom,
      categorie_id: categories.id,
      categorie_nom: categories.nom,
      categorie_couleur: categories.couleur,
      cible: sousCategories.nb_questions_cible,
      total: sql<number>`count(${questions.id})`,
      validees: sql<number>`coalesce(sum(case when ${questions.statut} = 'validee' then 1 else 0 end), 0)`,
      en_cours: sql<number>`coalesce(sum(case when ${questions.statut} in ('brouillon_ia', 'a_affiner') then 1 else 0 end), 0)`,
    })
    .from(sousCategories)
    .innerJoin(categories, eq(sousCategories.categorie_id, categories.id))
    .leftJoin(questions, eq(questions.sous_categorie_id, sousCategories.id))
    .groupBy(sousCategories.id)
    .orderBy(categories.ordre, sousCategories.ordre, sousCategories.nom)
    .all();
  return { parStatut, total, parSousCategorie };
}
