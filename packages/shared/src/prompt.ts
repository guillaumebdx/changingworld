import type { ChampsJoueur, Format } from './types.js';

export const VARIABLES_PROMPT = [
  { nom: 'categorie', description: 'Nom de la catégorie choisie' },
  { nom: 'sous_categorie', description: 'Nom de la sous-catégorie choisie' },
  { nom: 'format_nom', description: 'Nom du format de question' },
  { nom: 'format_gabarit', description: 'Gabarit de la question pour ce format' },
  { nom: 'format_reponses', description: "Description de l'échelle des trois réponses" },
  { nom: 'format_ressort', description: 'Le ressort cognitif du format' },
  { nom: 'consigne', description: 'Consigne libre saisie au moment de la génération' },
  { nom: 'exemples', description: 'Jusqu’à 5 questions validées du même format, en exemple' },
  { nom: 'questions_existantes', description: 'Intitulés déjà présents dans la sous-catégorie, à ne pas refaire' },
] as const;

export type NomVariable = (typeof VARIABLES_PROMPT)[number]['nom'];

export type VariablesPrompt = Record<NomVariable, string>;

/** Remplace chaque {{variable}} par sa valeur. Les variables inconnues sont laissées telles quelles. */
export function injecterVariables(gabarit: string, variables: Partial<VariablesPrompt>): string {
  return gabarit.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (tout, nom: string) => {
    if (nom in variables) {
      const valeur = variables[nom as NomVariable];
      return valeur == null ? '' : valeur;
    }
    return tout;
  });
}

/** Liste les variables utilisées dans un gabarit. */
export function variablesUtilisees(gabarit: string): string[] {
  const trouvees = new Set<string>();
  for (const m of gabarit.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)) trouvees.add(m[1]!);
  return [...trouvees];
}

export interface ExempleQuestion extends ChampsJoueur {
  fait?: string | null;
  resultat?: string | null;
  format_nom?: string;
}

/** Met en forme les exemples few-shot en texte lisible par le modèle. */
export function formaterExemples(exemples: ExempleQuestion[]): string {
  if (exemples.length === 0) return 'Aucun exemple validé pour le moment.';
  return exemples
    .map((e, i) => {
      const lignes = [
        `Exemple ${i + 1}${e.format_nom ? ` (${e.format_nom})` : ''}`,
        e.fait ? `Fait : ${e.fait}` : null,
        `Question : ${e.question}`,
        `A. ${e.reponse_a}`,
        `B. ${e.reponse_b}`,
        `C. ${e.reponse_c}`,
        `Bonne réponse : ${e.bonne_reponse.toUpperCase()}`,
        `Indice 1 : ${e.indice_1}`,
        `Indice 2 : ${e.indice_2}`,
        `Indice 3 : ${e.indice_3}`,
        `Commentaire : ${e.commentaire}`,
        `Source : ${e.source_nom} (${e.source_lien})`,
      ];
      return lignes.filter(Boolean).join('\n');
    })
    .join('\n\n');
}

export function formaterQuestionsExistantes(intitules: string[]): string {
  if (intitules.length === 0) return 'Aucune question existante dans cette sous-catégorie.';
  return intitules.map((q) => `- ${q}`).join('\n');
}

export interface EntreesPrompt {
  categorie: string;
  sous_categorie: string;
  format: Pick<Format, 'nom' | 'gabarit' | 'reponses' | 'ressort'>;
  consigne?: string | null;
  exemples: ExempleQuestion[];
  questions_existantes: string[];
}

export function construireVariables(e: EntreesPrompt): VariablesPrompt {
  return {
    categorie: e.categorie,
    sous_categorie: e.sous_categorie,
    format_nom: e.format.nom,
    format_gabarit: e.format.gabarit ?? '',
    format_reponses: e.format.reponses ?? '',
    format_ressort: e.format.ressort ?? '',
    consigne: e.consigne?.trim() ? e.consigne.trim() : 'Aucune consigne particulière.',
    exemples: formaterExemples(e.exemples),
    questions_existantes: formaterQuestionsExistantes(e.questions_existantes),
  };
}

export interface PromptConstruit {
  systeme: string;
  utilisateur: string;
  variables: VariablesPrompt;
}

/**
 * Prompt final = prompt système commun + prompt du format + variables injectées.
 * Le prompt système devient le message « system », le prompt de format le message « user ».
 */
export function construirePrompt(promptSysteme: string, promptFormat: string, entrees: EntreesPrompt): PromptConstruit {
  const variables = construireVariables(entrees);
  return {
    systeme: injecterVariables(promptSysteme, variables),
    utilisateur: injecterVariables(promptFormat, variables),
    variables,
  };
}
