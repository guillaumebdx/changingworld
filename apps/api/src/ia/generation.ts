import { and, desc, eq, isNull } from 'drizzle-orm';
import type { z } from 'zod';
import {
  construirePrompt,
  extraireChampsPartiels,
  questionGenereeSchema,
  relectureSchema,
  versJsonSchemaStrict,
  type ChampRegenerable,
  type ContenuQuestion,
  type ExempleQuestion,
  type QuestionGeneree,
  type Relecture,
  type Reglages,
} from '@changing-world/shared';
import type { Db } from '../db/index.js';
import { schema } from '../db/index.js';
import type { ClientIA } from './client.js';
import { PROMPT_FORMAT_GENERIQUE, PROMPT_RELECTURE } from './promptsInitiaux.js';

const { categories, sousCategories, formats, prompts, promptVersions, questions } = schema;

export class ErreurGeneration extends Error {}

export interface ContexteGeneration {
  categorie: { id: number; nom: string };
  sousCategorie: { id: number; nom: string };
  format: { id: number; nom: string; gabarit: string | null; reponses: string | null; ressort: string | null };
  /** Version active du prompt de format (null si le format n'a pas encore de prompt). */
  promptVersionId: number | null;
  systeme: string;
  utilisateur: string;
}

export interface ParamsContexte {
  categorie_id: number;
  sous_categorie_id: number;
  format_id: number;
  consigne?: string | null;
  /** Brouillons non enregistrés (écran Prompts, bouton Tester). */
  contenu_systeme?: string;
  contenu_format?: string;
}

export function versionActive(db: Db, promptId: number) {
  return db
    .select()
    .from(promptVersions)
    .where(and(eq(promptVersions.prompt_id, promptId), eq(promptVersions.active, true)))
    .get();
}

export function promptSysteme(db: Db) {
  const p = db.select().from(prompts).where(isNull(prompts.format_id)).get();
  if (!p) return null;
  return { prompt: p, version: versionActive(db, p.id) ?? null };
}

export function promptDuFormat(db: Db, formatId: number) {
  const p = db.select().from(prompts).where(eq(prompts.format_id, formatId)).get();
  if (!p) return null;
  return { prompt: p, version: versionActive(db, p.id) ?? null };
}

/** Rassemble catégorie, format, prompts actifs, exemples et questions existantes, puis construit le prompt. */
export function preparerContexte(db: Db, params: ParamsContexte): ContexteGeneration {
  const categorie = db.select().from(categories).where(eq(categories.id, params.categorie_id)).get();
  const sousCategorie = db.select().from(sousCategories).where(eq(sousCategories.id, params.sous_categorie_id)).get();
  const format = db.select().from(formats).where(eq(formats.id, params.format_id)).get();
  if (!categorie || !sousCategorie || !format) {
    throw new ErreurGeneration('Catégorie, sous-catégorie ou format introuvable.');
  }

  const systeme = promptSysteme(db);
  const texteSysteme = params.contenu_systeme ?? systeme?.version?.contenu;
  if (!texteSysteme) throw new ErreurGeneration("Aucun prompt système actif. Créez-en un dans l'écran Prompts.");

  const pf = promptDuFormat(db, format.id);
  const texteFormat = params.contenu_format ?? pf?.version?.contenu ?? PROMPT_FORMAT_GENERIQUE;

  const exemplesMemeFormat = db
    .select()
    .from(questions)
    .where(and(eq(questions.statut, 'validee'), eq(questions.format_id, format.id)))
    .orderBy(desc(questions.updated_at))
    .limit(5)
    .all();
  const exemplesBruts =
    exemplesMemeFormat.length > 0
      ? exemplesMemeFormat
      : db.select().from(questions).where(eq(questions.statut, 'validee')).orderBy(desc(questions.updated_at)).limit(5).all();
  const exemples: ExempleQuestion[] = exemplesBruts.map((q) => ({
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
    resultat: q.resultat,
  }));

  const existantes = db
    .select({ question: questions.question })
    .from(questions)
    .where(eq(questions.sous_categorie_id, sousCategorie.id))
    .all()
    .map((q) => q.question)
    .filter((q) => q.trim().length > 0);

  const construit = construirePrompt(texteSysteme, texteFormat, {
    categorie: categorie.nom,
    sous_categorie: sousCategorie.nom,
    format,
    consigne: params.consigne ?? null,
    exemples,
    questions_existantes: existantes,
  });

  return {
    categorie: { id: categorie.id, nom: categorie.nom },
    sousCategorie: { id: sousCategorie.id, nom: sousCategorie.nom },
    format: { id: format.id, nom: format.nom, gabarit: format.gabarit, reponses: format.reponses, ressort: format.ressort },
    promptVersionId: params.contenu_format == null ? (pf?.version?.id ?? null) : null,
    systeme: construit.systeme,
    utilisateur: construit.utilisateur,
  };
}

export type EvenementGeneration<T> =
  | { type: 'champ'; champ: string; valeur: string }
  | { type: 'fin'; donnees: T }
  | { type: 'erreur'; message: string };

/**
 * Fait tourner une génération JSON en streaming et traduit le flux brut en événements par champ.
 * Les champs sont émis dès qu'ils changent ; à la fin, l'objet complet est validé par le schéma Zod.
 */
export async function* genererEnFlux<T>(
  ia: ClientIA,
  params: { systeme: string; utilisateur: string; schemaZod: z.ZodType<T>; nomSchema: string; reglages: Reglages },
  signal?: AbortSignal,
): AsyncGenerator<EvenementGeneration<T>> {
  let tampon = '';
  const emis: Record<string, string> = {};
  try {
    const flux = ia.genererJson(
      {
        systeme: params.systeme,
        utilisateur: params.utilisateur,
        schema: versJsonSchemaStrict(params.schemaZod),
        nomSchema: params.nomSchema,
        modele: params.reglages.modele_ia,
        temperature: params.reglages.temperature,
      },
      signal,
    );
    for await (const morceau of flux) {
      tampon += morceau;
      const champs = extraireChampsPartiels(tampon);
      for (const [champ, valeur] of Object.entries(champs)) {
        if (emis[champ] !== valeur) {
          emis[champ] = valeur;
          yield { type: 'champ', champ, valeur };
        }
      }
    }
    const brut = JSON.parse(tampon) as unknown;
    const resultat = params.schemaZod.safeParse(brut);
    if (!resultat.success) {
      yield { type: 'erreur', message: `Le modèle a renvoyé un objet incomplet : ${resultat.error.issues[0]?.message ?? 'schéma non respecté'}.` };
      return;
    }
    yield { type: 'fin', donnees: resultat.data };
  } catch (e) {
    if (signal?.aborted) return;
    const message = e instanceof Error ? e.message : String(e);
    yield { type: 'erreur', message: `La génération a échoué : ${message}` };
  }
}

export function genererQuestion(ia: ClientIA, ctx: ContexteGeneration, reglages: Reglages, signal?: AbortSignal) {
  return genererEnFlux<QuestionGeneree>(
    ia,
    { systeme: ctx.systeme, utilisateur: ctx.utilisateur, schemaZod: questionGenereeSchema, nomSchema: 'question_changing_world', reglages },
    signal,
  );
}

/* ------------------------------------------------------------------ */
/* Régénération d'un champ                                              */
/* ------------------------------------------------------------------ */

const CHAMPS_PAR_CIBLE: Record<ChampRegenerable, (keyof QuestionGeneree)[]> = {
  fait: ['fait'],
  chiffres: ['chiffres'],
  calculs: ['calculs'],
  resultat: ['resultat'],
  question: ['question'],
  reponses: ['reponse_a', 'reponse_b', 'reponse_c', 'bonne_reponse'],
  indice_1: ['indice_1'],
  indice_2: ['indice_2'],
  indice_3: ['indice_3'],
  commentaire: ['commentaire'],
  source: ['source_nom', 'source_lien'],
};

export function champsDeLaCible(cible: ChampRegenerable): (keyof QuestionGeneree)[] {
  return CHAMPS_PAR_CIBLE[cible];
}

export function schemaRegeneration(cible: ChampRegenerable) {
  const cles = CHAMPS_PAR_CIBLE[cible];
  return questionGenereeSchema.pick(Object.fromEntries(cles.map((c) => [c, true])) as Record<keyof QuestionGeneree, true>);
}

export function formaterQuestionPourModele(contenu: ContenuQuestion): string {
  const lignes: string[] = [];
  const ordre: (keyof ContenuQuestion)[] = [
    'fait',
    'chiffres',
    'calculs',
    'resultat',
    'question',
    'reponse_a',
    'reponse_b',
    'reponse_c',
    'bonne_reponse',
    'indice_1',
    'indice_2',
    'indice_3',
    'commentaire',
    'source_nom',
    'source_lien',
    'impact',
  ];
  for (const cle of ordre) lignes.push(`${cle} : ${String(contenu[cle] ?? '').trim() || '(vide)'}`);
  return lignes.join('\n');
}

export function regenererChamp(
  ia: ClientIA,
  ctx: ContexteGeneration,
  contenu: ContenuQuestion,
  cible: ChampRegenerable,
  consigne: string | undefined,
  reglages: Reglages,
  signal?: AbortSignal,
) {
  const cles = CHAMPS_PAR_CIBLE[cible];
  const utilisateur = [
    ctx.utilisateur,
    '',
    '## Question en cours de rédaction',
    formaterQuestionPourModele(contenu),
    '',
    `## Tâche`,
    `Réécris uniquement ${cles.length === 1 ? `le champ ${cles[0]}` : `les champs ${cles.join(', ')}`}. Garde tout le reste cohérent avec les autres champs tels qu'ils sont, en particulier avec resultat et bonne_reponse.`,
    cible === 'reponses'
      ? 'Les trois réponses doivent rester distinctes et conformes à l’échelle du format ; bonne_reponse doit désigner la réponse qui correspond à resultat.'
      : null,
    consigne?.trim() ? `Consigne de Bernard : ${consigne.trim()}` : null,
  ]
    .filter((l) => l !== null)
    .join('\n');

  const schemaZod = schemaRegeneration(cible) as unknown as z.ZodType<Partial<QuestionGeneree>>;
  return genererEnFlux<Partial<QuestionGeneree>>(
    ia,
    { systeme: ctx.systeme, utilisateur, schemaZod, nomSchema: `regeneration_${cible}`, reglages },
    signal,
  );
}

/* ------------------------------------------------------------------ */
/* Relecture critique                                                   */
/* ------------------------------------------------------------------ */

export async function relireQuestion(
  ia: ClientIA,
  contenu: ContenuQuestion,
  contexte: { categorie: string; sous_categorie: string; format: string },
  reglages: Reglages,
): Promise<Relecture> {
  const utilisateur = [
    `Catégorie : ${contexte.categorie} › ${contexte.sous_categorie}`,
    `Format : ${contexte.format}`,
    '',
    formaterQuestionPourModele(contenu),
  ].join('\n');
  let dernier: Relecture | null = null;
  let erreur: string | null = null;
  for await (const ev of genererEnFlux<Relecture>(ia, {
    systeme: PROMPT_RELECTURE,
    utilisateur,
    schemaZod: relectureSchema,
    nomSchema: 'relecture_critique',
    reglages: { ...reglages, temperature: Math.min(reglages.temperature, 0.4) },
  })) {
    if (ev.type === 'fin') dernier = ev.donnees;
    if (ev.type === 'erreur') erreur = ev.message;
  }
  if (!dernier) throw new ErreurGeneration(erreur ?? 'La relecture n’a rien renvoyé.');
  return dernier;
}
