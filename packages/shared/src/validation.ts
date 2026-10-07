import type { ContenuQuestion, Lettre } from './types.js';
import { compterPhrases, estUrlValide, extraireNombres, normaliser, similarite } from './texte.js';
import { texteReponse } from './etatJeu.js';

export type NiveauControle = 'bloquant' | 'avertissement' | 'info';

export interface Controle {
  code: string;
  niveau: NiveauControle;
  message: string;
  /** Champ concerné, pour mettre en évidence dans l'éditeur. */
  champ?: keyof ContenuQuestion | 'source' | 'indices' | 'reponses';
}

export type EtatLien = 'inconnu' | 'en_cours' | 'ok' | 'ko';

export interface ContexteValidation {
  /** Les intitulés des autres questions, pour détecter les doublons. */
  intitulesExistants?: { id: number; numero: number; question: string }[];
  /** L'identifiant de la question en cours, exclu de la recherche de doublons. */
  idCourant?: number | null;
  /** Résultat de la vérification serveur du lien source. */
  etatLien?: EtatLien;
  detailLien?: string;
}

export const SEUIL_DOUBLON = 0.62;

const CHAMPS_JOUEUR_OBLIGATOIRES: { champ: keyof ContenuQuestion; libelle: string }[] = [
  { champ: 'question', libelle: 'la question' },
  { champ: 'reponse_a', libelle: 'la réponse A' },
  { champ: 'reponse_b', libelle: 'la réponse B' },
  { champ: 'reponse_c', libelle: 'la réponse C' },
  { champ: 'indice_1', libelle: "l'indice 1" },
  { champ: 'indice_2', libelle: "l'indice 2" },
  { champ: 'indice_3', libelle: "l'indice 3" },
  { champ: 'commentaire', libelle: 'le commentaire' },
  { champ: 'source_nom', libelle: 'le nom de la source' },
  { champ: 'source_lien', libelle: 'le lien source' },
];

/** Score grossier de précision d'un indice : chiffres, noms propres, longueur. */
export function precisionIndice(texte: string): number {
  const nombres = extraireNombres(texte).length;
  const majuscules = (texte.match(/(?<=\s|^)[A-ZÀ-Ý][a-zà-ÿ]{2,}/g) ?? []).length;
  const longueur = texte.trim().length;
  return nombres * 3 + majuscules * 1 + longueur / 60;
}

/** Vérifie une question et renvoie la liste des points à vérifier. */
export function verifierQuestion(q: ContenuQuestion, ctx: ContexteValidation = {}): Controle[] {
  const controles: Controle[] = [];

  // Bloquant : champs joueur remplis
  const manquants = CHAMPS_JOUEUR_OBLIGATOIRES.filter(({ champ }) => !String(q[champ] ?? '').trim());
  if (manquants.length > 0) {
    controles.push({
      code: 'champs_manquants',
      niveau: 'bloquant',
      message:
        manquants.length === 1
          ? `Il manque ${manquants[0]!.libelle}.`
          : `Il manque ${manquants.map((m) => m.libelle).join(', ')}.`,
    });
  }
  if (!q.bonne_reponse || !['a', 'b', 'c'].includes(q.bonne_reponse)) {
    controles.push({
      code: 'bonne_reponse_manquante',
      niveau: 'bloquant',
      message: "Aucune bonne réponse n'est cochée.",
      champ: 'reponses',
    });
  }

  // Bloquant : réponses distinctes
  const reponses = [q.reponse_a, q.reponse_b, q.reponse_c].map((r) => normaliser(r ?? ''));
  const remplies = reponses.filter(Boolean);
  if (new Set(remplies).size !== remplies.length) {
    controles.push({
      code: 'reponses_identiques',
      niveau: 'bloquant',
      message: 'Deux réponses au moins sont identiques.',
      champ: 'reponses',
    });
  }

  const bonne = q.bonne_reponse && ['a', 'b', 'c'].includes(q.bonne_reponse) ? texteReponse(q, q.bonne_reponse as Lettre) : '';

  // Résultat vs bonne réponse
  if (q.resultat?.trim() && bonne.trim()) {
    const nr = normaliser(q.resultat);
    const nb = normaliser(bonne);
    const nombresR = extraireNombres(q.resultat);
    const nombresB = extraireNombres(bonne);
    let coherent: boolean;
    if (nombresR.length > 0 && nombresB.length > 0) {
      coherent = nombresR.some((n) => nombresB.includes(n));
    } else {
      coherent = nr === nb || nr.includes(nb) || nb.includes(nr);
    }
    if (!coherent) {
      controles.push({
        code: 'resultat_incoherent',
        niveau: 'avertissement',
        message: `Le résultat « ${q.resultat.trim()} » ne correspond pas à la bonne réponse ${q.bonne_reponse.toUpperCase()} « ${bonne.trim()} ».`,
        champ: 'resultat',
      });
    }
  }

  // Indice qui donne la réponse
  if (bonne.trim()) {
    const nb = normaliser(bonne);
    const indices: { champ: 'indice_1' | 'indice_2' | 'indice_3'; n: number; texte: string }[] = [
      { champ: 'indice_1', n: 1, texte: q.indice_1 ?? '' },
      { champ: 'indice_2', n: 2, texte: q.indice_2 ?? '' },
      { champ: 'indice_3', n: 3, texte: q.indice_3 ?? '' },
    ];
    for (const { champ, n, texte } of indices) {
      if (nb.length >= 2 && texte.trim() && ` ${normaliser(texte)} `.includes(` ${nb} `)) {
        controles.push({
          code: `indice_${n}_donne_reponse`,
          niveau: 'avertissement',
          message: `L'indice ${n} contient le texte exact de la bonne réponse.`,
          champ,
        });
      }
    }
  }

  // Gradation des indices
  const i1 = q.indice_1?.trim() ?? '';
  const i2 = q.indice_2?.trim() ?? '';
  const i3 = q.indice_3?.trim() ?? '';
  if (i1 && i2 && i3) {
    const p1 = precisionIndice(i1);
    const p2 = precisionIndice(i2);
    const p3 = precisionIndice(i3);
    const n1 = extraireNombres(i1).length;
    const n3 = extraireNombres(i3).length;
    // Heuristique volontairement prudente : on ne signale que les inversions nettes.
    if (p3 < p1 * 0.5 || p3 < p2 * 0.4 || (n3 === 0 && n1 >= 2)) {
      controles.push({
        code: 'gradation_indices',
        niveau: 'avertissement',
        message:
          "La gradation des indices semble inversée : l'indice 3 paraît moins précis que les précédents. Vérifiez qu'ils vont du plus vague au plus précis.",
        champ: 'indices',
      });
    } else if (p1 > p2 * 1.6 && p1 > p3 * 0.9) {
      controles.push({
        code: 'indice_1_trop_precis',
        niveau: 'info',
        message: "L'indice 1 paraît très précis pour un premier indice.",
        champ: 'indice_1',
      });
    }
  }

  // Lien source
  const lien = q.source_lien?.trim() ?? '';
  if (lien && !estUrlValide(lien)) {
    controles.push({
      code: 'lien_invalide',
      niveau: 'avertissement',
      message: "Le lien source n'est pas une URL valide (il doit commencer par http:// ou https://).",
      champ: 'source_lien',
    });
  } else if (lien && ctx.etatLien === 'ko') {
    controles.push({
      code: 'lien_ne_repond_pas',
      niveau: 'avertissement',
      message: `Le lien source ne répond pas${ctx.detailLien ? ` (${ctx.detailLien})` : ''}.`,
      champ: 'source_lien',
    });
  }

  // Doublons
  if (ctx.intitulesExistants && q.question?.trim()) {
    let meilleur: { numero: number; score: number; question: string } | null = null;
    for (const autre of ctx.intitulesExistants) {
      if (ctx.idCourant != null && autre.id === ctx.idCourant) continue;
      const s = similarite(q.question, autre.question);
      if (s >= SEUIL_DOUBLON && (!meilleur || s > meilleur.score)) {
        meilleur = { numero: autre.numero, score: s, question: autre.question };
      }
    }
    if (meilleur) {
      controles.push({
        code: 'doublon_probable',
        niveau: 'avertissement',
        message: `Doublon probable avec la question ${meilleur.numero} : « ${meilleur.question.slice(0, 90)}${meilleur.question.length > 90 ? '…' : ''} ».`,
        champ: 'question',
      });
    }
  }

  // Commentaire : 2 à 4 phrases
  if (q.commentaire?.trim()) {
    const n = compterPhrases(q.commentaire);
    if (n < 2) {
      controles.push({
        code: 'commentaire_court',
        niveau: 'info',
        message: 'Le commentaire tient en une phrase. La ligne éditoriale en demande deux à quatre.',
        champ: 'commentaire',
      });
    } else if (n > 5) {
      controles.push({
        code: 'commentaire_long',
        niveau: 'info',
        message: `Le commentaire compte ${n} phrases. La ligne éditoriale en demande deux à quatre.`,
        champ: 'commentaire',
      });
    }
  }

  // Ton : emojis, points d'exclamation
  const texteJoueur = [q.question, q.indice_1, q.indice_2, q.indice_3, q.commentaire].join(' ');
  if (/\p{Extended_Pictographic}/u.test(texteJoueur)) {
    controles.push({ code: 'emoji', niveau: 'avertissement', message: 'Un emoji s’est glissé dans un texte joueur.' });
  }
  if (/!/.test(texteJoueur)) {
    controles.push({
      code: 'exclamation',
      niveau: 'info',
      message: 'Un point d’exclamation dans un texte joueur : le ton visé est sobre.',
    });
  }

  const ordre: Record<NiveauControle, number> = { bloquant: 0, avertissement: 1, info: 2 };
  return controles.sort((a, b) => ordre[a.niveau] - ordre[b.niveau]);
}

export function controlesBloquants(controles: Controle[]): Controle[] {
  return controles.filter((c) => c.niveau === 'bloquant');
}

export function peutEtreValidee(q: ContenuQuestion): boolean {
  return controlesBloquants(verifierQuestion(q)).length === 0;
}
