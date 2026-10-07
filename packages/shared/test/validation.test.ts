import { describe, expect, it } from 'vitest';
import { verifierQuestion, controlesBloquants } from '../src/validation.js';
import { extraireNombres, normaliser, similarite } from '../src/texte.js';
import type { ContenuQuestion } from '../src/types.js';

/** La question de Bernard sur l'espérance de vie, importée telle quelle. */
const esperanceDeVie: ContenuQuestion = {
  question: "Quelle était approximativement l'espérance de vie à la naissance en Europe de l'Ouest en 1830 ?",
  reponse_a: 'Environ 33 ans',
  reponse_b: 'Environ 42 ans',
  reponse_c: 'Environ 50 ans',
  bonne_reponse: 'a',
  indice_1:
    "La mortalité infantile était extrêmement élevée au XIXe siècle — un enfant sur trois n'atteignait pas l'âge de 5 ans.",
  indice_2: 'La révolution industrielle imposait des conditions de travail très dures, y compris pour les enfants dès 6 ou 7 ans.',
  indice_3:
    "Si l'on exclut la mortalité infantile, un adulte ayant survécu jusqu'à 20 ans pouvait espérer atteindre la soixantaine — mais peu y parvenaient.",
  commentaire: "L'espérance de vie a très peu progressé entre l'Antiquité (25-30 ans) et 1830 (33 ans), même en Europe de l'Ouest.",
  source_nom: 'OCDE',
  source_lien: 'https://www.oecd.org/content/dam/oecd/en/publications/reports/2014/10/how-was-life.pdf',
  fait: "L'espérance de vie était beaucoup plus faible au début du XIXe siècle",
  chiffres: "Au Royaume-Uni, l'espérance de vie à la naissance était d'environ 40 ans vers 1820",
  calculs: '',
  resultat: 'Environ 40 ans',
  impact: 'CHOC',
};

const population: ContenuQuestion = {
  question: "A partir de l'an 1, combien de temps a-t-il fallu pour que la population mondiale triple ?",
  reponse_a: '600 ans',
  reponse_b: '1200 ans',
  reponse_c: '1800 ans',
  bonne_reponse: 'c',
  indice_1: "En l'an 1, la population mondiale était estimée à environ 225 millions d'habitants.",
  indice_2: 'Pendant des siècles, famines, épidémies et guerres ont maintenu la croissance à un niveau quasi nul.',
  indice_3: "C'est seulement aux alentours de 1800 que la population mondiale a franchi le cap des 450 millions.",
  commentaire: "En l'an 1, la population mondiale est estimée à 225 millions. En 1700, elle est estimée à 603 millions.",
  source_nom: 'Maddison Project Database',
  source_lien: 'https://www.rug.nl/ggdc/historicaldevelopment/maddison/',
  fait: 'Croissance très lente',
  chiffres: '225 M, 603 M, 1,041 Md',
  calculs: '',
  resultat: '1800',
  impact: 'SURPRENANT',
};

describe('verifierQuestion', () => {
  it('signale l’incohérence resultat / bonne réponse de la question sur l’espérance de vie', () => {
    const controles = verifierQuestion(esperanceDeVie);
    const alerte = controles.find((c) => c.code === 'resultat_incoherent');
    expect(alerte).toBeDefined();
    expect(alerte?.niveau).toBe('avertissement');
    expect(alerte?.message).toContain('Environ 40 ans');
    expect(alerte?.message).toContain('Environ 33 ans');
    expect(controlesBloquants(controles)).toHaveLength(0);
  });

  it('accepte un résultat numérique nu qui correspond à la bonne réponse', () => {
    const controles = verifierQuestion(population);
    expect(controles.find((c) => c.code === 'resultat_incoherent')).toBeUndefined();
    expect(controlesBloquants(controles)).toHaveLength(0);
  });

  it('bloque quand des champs joueur manquent', () => {
    const controles = verifierQuestion({ ...population, indice_2: '', commentaire: '  ' });
    const bloquants = controlesBloquants(controles);
    expect(bloquants).toHaveLength(1);
    expect(bloquants[0]?.message).toContain("l'indice 2");
    expect(bloquants[0]?.message).toContain('le commentaire');
  });

  it('bloque quand deux réponses sont identiques', () => {
    const controles = verifierQuestion({ ...population, reponse_b: '1800 ans ' });
    expect(controles.some((c) => c.code === 'reponses_identiques' && c.niveau === 'bloquant')).toBe(true);
  });

  it('avertit quand un indice contient le texte exact de la bonne réponse', () => {
    const controles = verifierQuestion({ ...population, indice_2: 'Il a fallu 1800 ans, pas moins.' });
    expect(controles.some((c) => c.code === 'indice_2_donne_reponse')).toBe(true);
    // Un indice qui cite une date voisine sans le texte exact ne déclenche rien
    expect(verifierQuestion(population).some((c) => c.code.endsWith('donne_reponse'))).toBe(false);
  });

  it('avertit quand la gradation des indices est inversée', () => {
    const controles = verifierQuestion({
      ...population,
      indice_1: 'En 1700, 603 millions ; en 1820, 1 041 millions ; le triplement est atteint vers 1720 selon Maddison.',
      indice_2: 'La croissance fut lente.',
      indice_3: 'Lente.',
    });
    expect(controles.some((c) => c.code === 'gradation_indices')).toBe(true);
  });

  it('avertit sur un lien invalide ou qui ne répond pas', () => {
    expect(verifierQuestion({ ...population, source_lien: 'rug.nl/maddison' }).some((c) => c.code === 'lien_invalide')).toBe(true);
    expect(
      verifierQuestion(population, { etatLien: 'ko', detailLien: 'HTTP 404' }).some((c) => c.code === 'lien_ne_repond_pas'),
    ).toBe(true);
    expect(verifierQuestion(population, { etatLien: 'ok' }).some((c) => c.code.startsWith('lien'))).toBe(false);
  });

  it('détecte un doublon probable et ignore la question courante', () => {
    const existants = [
      { id: 1, numero: 1, question: population.question },
      { id: 2, numero: 2, question: 'À quelle époque le premier brevet de pompe à vapeur ?' },
    ];
    const avec = verifierQuestion(
      { ...population, question: "À partir de l'an 1, combien de temps a-t-il fallu pour que la population mondiale triple ?" },
      { intitulesExistants: existants, idCourant: 99 },
    );
    expect(avec.find((c) => c.code === 'doublon_probable')?.message).toContain('question 1');
    const sans = verifierQuestion(population, { intitulesExistants: existants, idCourant: 1 });
    expect(sans.some((c) => c.code === 'doublon_probable')).toBe(false);
  });

  it('range les bloquants en premier', () => {
    const controles = verifierQuestion({ ...esperanceDeVie, reponse_a: '' });
    expect(controles[0]?.niveau).toBe('bloquant');
  });
});

describe('texte', () => {
  it('normalise accents, casse et ponctuation', () => {
    expect(normaliser('Environ 33 ans !')).toBe('environ 33 ans');
    expect(normaliser("L'ÉPOQUE médiévale")).toBe('l epoque medievale');
  });

  it('extrait les nombres français', () => {
    expect(extraireNombres('1 800 ans et 1,041 milliard, soit 7500 langues')).toEqual([1800, 1.041, 7500]);
  });

  it('mesure la similarité de deux intitulés', () => {
    expect(similarite('Combien de langues il y a 2000 ans ?', 'Combien de langues il y a 2000 ans ?')).toBe(1);
    expect(similarite('Combien de langues il y a 2000 ans ?', "L'espérance de vie en Europe en 1830 ?")).toBeLessThan(0.4);
  });
});
