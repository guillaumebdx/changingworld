import { z } from 'zod';
import { IMPACTS, LETTRES, STATUTS } from './types.js';

export const statutSchema = z.enum(STATUTS);
export const impactSchema = z.enum(IMPACTS);
export const lettreSchema = z.enum(LETTRES);

/**
 * Schéma de génération : l'ordre des clés est l'ordre de génération imposé au modèle.
 * Les faits d'abord (fait, chiffres, calculs, resultat), puis la question, les réponses,
 * la bonne réponse, les indices, le commentaire et la source.
 */
export const questionGenereeSchema = z.object({
  fait: z
    .string()
    .describe("L'insight : la transformation du monde que la question fait découvrir, en une phrase."),
  chiffres: z
    .string()
    .describe('Les données brutes utilisées, datées et chiffrées, avec leur provenance.'),
  calculs: z
    .string()
    .describe("Les calculs ou raisonnements qui mènent du chiffre brut au résultat. « Aucun » si la donnée est directe."),
  resultat: z
    .string()
    .describe('Le résultat final, formulé exactement comme la bonne réponse qui sera proposée au joueur.'),
  question: z.string().describe('La question posée au joueur, compréhensible sans connaissance préalable.'),
  reponse_a: z.string().describe('Réponse A, selon l’échelle du format.'),
  reponse_b: z.string().describe('Réponse B, selon l’échelle du format.'),
  reponse_c: z.string().describe('Réponse C, selon l’échelle du format.'),
  bonne_reponse: lettreSchema.describe('La lettre de la bonne réponse. Doit correspondre à resultat.'),
  indice_1: z.string().describe('Indice 1, vague : situe le contexte sans donner de date ni de chiffre décisif.'),
  indice_2: z.string().describe('Indice 2, intermédiaire : apporte une information nouvelle et plus précise.'),
  indice_3: z
    .string()
    .describe('Indice 3, précis : permet à un joueur attentif de déduire la réponse sans la donner mot pour mot.'),
  commentaire: z
    .string()
    .describe('Commentaire révélé après la réponse : explique le chiffre et pourquoi il surprend, en 2 à 4 phrases.'),
  source_nom: z.string().describe('Nom de la source de référence.'),
  source_lien: z.string().describe('URL précise et vérifiable de la source.'),
  impact: impactSchema.describe("Niveau d'étonnement attendu : INTERESSANT, SURPRENANT ou CHOC."),
});

export type QuestionGeneree = z.infer<typeof questionGenereeSchema>;

/** Les clés du schéma dans l'ordre de génération. */
export const ORDRE_GENERATION = Object.keys(questionGenereeSchema.shape) as (keyof QuestionGeneree)[];

/** Contenu éditable d'une question (ce que l'admin enregistre). */
export const contenuQuestionSchema = z.object({
  question: z.string(),
  reponse_a: z.string(),
  reponse_b: z.string(),
  reponse_c: z.string(),
  bonne_reponse: lettreSchema,
  indice_1: z.string(),
  indice_2: z.string(),
  indice_3: z.string(),
  commentaire: z.string(),
  source_nom: z.string(),
  source_lien: z.string(),
  fait: z.string(),
  chiffres: z.string(),
  calculs: z.string(),
  resultat: z.string(),
  impact: impactSchema,
});

export const miseAJourQuestionSchema = contenuQuestionSchema.extend({
  categorie_id: z.number().int().positive(),
  sous_categorie_id: z.number().int().positive(),
  format_id: z.number().int().positive(),
  commentaire_interne: z.string().nullable().optional(),
});

export type MiseAJourQuestion = z.infer<typeof miseAJourQuestionSchema>;

export const changementStatutSchema = z.object({
  statut: statutSchema,
  commentaire_interne: z.string().nullable().optional(),
});

export const creationQuestionSchema = z.object({
  categorie_id: z.number().int().positive().nullable().optional(),
  sous_categorie_id: z.number().int().positive().nullable().optional(),
  format_id: z.number().int().positive().nullable().optional(),
  consigne: z.string().max(2000).optional(),
});

export const regenerationChampSchema = z.object({
  champ: z.enum([
    'fait',
    'chiffres',
    'calculs',
    'resultat',
    'question',
    'reponses',
    'indice_1',
    'indice_2',
    'indice_3',
    'commentaire',
    'source',
  ]),
  consigne: z.string().max(2000).optional(),
  contenu: contenuQuestionSchema,
});

export type ChampRegenerable = z.infer<typeof regenerationChampSchema>['champ'];

/** Schéma de sortie de la relecture critique. */
export const relectureSchema = z.object({
  remarques: z.array(
    z.object({
      gravite: z.enum(['bloquant', 'important', 'mineur']),
      sujet: z.string().describe('En trois mots : ce que la remarque vise (ex. « Indice 3 », « Chiffre 1830 »).'),
      detail: z.string().describe('La remarque, précise et actionnable, en une à trois phrases.'),
    }),
  ),
});

export type Relecture = z.infer<typeof relectureSchema>;

export const baremeSchema = z.object({
  gains: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  pertes: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});

export const reglagesSchema = z.object({
  bareme: baremeSchema,
  modele_ia: z.string().min(1),
  temperature: z.number().min(0).max(2),
});

export type Reglages = z.infer<typeof reglagesSchema>;

export const categorieInputSchema = z.object({
  nom: z.string().min(1).max(80),
  couleur: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  ordre: z.number().int().optional(),
});

export const sousCategorieInputSchema = z.object({
  categorie_id: z.number().int().positive(),
  nom: z.string().min(1).max(80),
  nb_questions_cible: z.number().int().min(0).nullable().optional(),
  ordre: z.number().int().optional(),
});

export const formatInputSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_]+$/, 'Le code ne contient que des minuscules, chiffres et tirets bas.'),
  nom: z.string().min(1).max(120),
  gabarit: z.string().nullable().optional(),
  exemple: z.string().nullable().optional(),
  reponses: z.string().nullable().optional(),
  ressort: z.string().nullable().optional(),
  actif: z.boolean(),
});

export const nouvellePromptVersionSchema = z.object({
  contenu: z.string().min(1),
  note_de_version: z.string().max(500).optional(),
});

export const testPromptSchema = z.object({
  format_id: z.number().int().positive().nullable().optional(),
  categorie_id: z.number().int().positive().nullable().optional(),
  sous_categorie_id: z.number().int().positive().nullable().optional(),
  consigne: z.string().max(2000).optional(),
  /** Contenu non enregistré du prompt système, si on teste un brouillon. */
  contenu_systeme: z.string().optional(),
  /** Contenu non enregistré du prompt de format, si on teste un brouillon. */
  contenu_format: z.string().optional(),
});

/**
 * Convertit un schéma Zod en JSON schema strict pour les Structured Outputs OpenAI :
 * tous les champs requis, aucune propriété additionnelle.
 */
export function versJsonSchemaStrict(schema: z.ZodType): Record<string, unknown> {
  const brut = z.toJSONSchema(schema, { target: 'draft-7', io: 'output' }) as Record<string, unknown>;
  delete brut.$schema;
  return durcir(brut) as Record<string, unknown>;
}

function durcir(noeud: unknown): unknown {
  if (Array.isArray(noeud)) return noeud.map(durcir);
  if (noeud && typeof noeud === 'object') {
    const objet = { ...(noeud as Record<string, unknown>) };
    if (objet.type === 'object' && objet.properties && typeof objet.properties === 'object') {
      const props = objet.properties as Record<string, unknown>;
      objet.required = Object.keys(props);
      objet.additionalProperties = false;
      objet.properties = Object.fromEntries(Object.entries(props).map(([k, v]) => [k, durcir(v)]));
    }
    if (objet.items) objet.items = durcir(objet.items);
    return objet;
  }
  return noeud;
}
