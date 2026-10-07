import { describe, expect, it } from 'vitest';
import { construirePrompt, injecterVariables, variablesUtilisees, formaterExemples } from '../src/prompt.js';
import { extraireChampsPartiels } from '../src/jsonPartiel.js';
import { ORDRE_GENERATION, questionGenereeSchema, versJsonSchemaStrict } from '../src/schemas.js';

describe('injecterVariables', () => {
  it('remplace les variables connues et laisse les inconnues', () => {
    const texte = injecterVariables('Catégorie : {{categorie}} › {{ sous_categorie }} ({{inconnue}})', {
      categorie: 'Démographie',
      sous_categorie: 'Migrations',
    });
    expect(texte).toBe('Catégorie : Démographie › Migrations ({{inconnue}})');
  });

  it('liste les variables utilisées', () => {
    expect(variablesUtilisees('{{a}} {{ b }} {{a}}')).toEqual(['a', 'b']);
  });
});

describe('construirePrompt', () => {
  it('injecte toutes les variables dans le système et le format', () => {
    const prompt = construirePrompt(
      'Système. Exemples :\n{{exemples}}\nExistantes :\n{{questions_existantes}}',
      'Format {{format_nom}} : {{format_gabarit}} / {{format_reponses}} / {{format_ressort}}. {{categorie}} › {{sous_categorie}}. Consigne : {{consigne}}',
      {
        categorie: 'Santé',
        sous_categorie: 'Vaccination',
        format: { nom: 'Datation', gabarit: 'À quelle époque X ?', reponses: '3 siècles', ressort: 'Plus ancien que prévu' },
        consigne: 'sur la variole',
        exemples: [
          {
            question: 'Q1 ?',
            reponse_a: 'a',
            reponse_b: 'b',
            reponse_c: 'c',
            bonne_reponse: 'b',
            indice_1: 'i1',
            indice_2: 'i2',
            indice_3: 'i3',
            commentaire: 'com',
            source_nom: 'OMS',
            source_lien: 'https://who.int',
          },
        ],
        questions_existantes: ['Quand le premier vaccin ?'],
      },
    );
    expect(prompt.utilisateur).toBe(
      'Format Datation : À quelle époque X ? / 3 siècles / Plus ancien que prévu. Santé › Vaccination. Consigne : sur la variole',
    );
    expect(prompt.systeme).toContain('Exemple 1');
    expect(prompt.systeme).toContain('Bonne réponse : B');
    expect(prompt.systeme).toContain('- Quand le premier vaccin ?');
    expect(prompt.variables.consigne).toBe('sur la variole');
  });

  it('remplace une consigne vide par une mention explicite', () => {
    const prompt = construirePrompt('', '{{consigne}}', {
      categorie: 'A',
      sous_categorie: 'B',
      format: { nom: 'F', gabarit: null, reponses: null, ressort: null },
      consigne: '   ',
      exemples: [],
      questions_existantes: [],
    });
    expect(prompt.utilisateur).toBe('Aucune consigne particulière.');
    expect(formaterExemples([])).toContain('Aucun exemple');
  });
});

describe('schéma de génération', () => {
  it('impose l’ordre : faits avant la question', () => {
    expect(ORDRE_GENERATION.slice(0, 5)).toEqual(['fait', 'chiffres', 'calculs', 'resultat', 'question']);
    expect(ORDRE_GENERATION.indexOf('bonne_reponse')).toBeLessThan(ORDRE_GENERATION.indexOf('indice_1'));
    expect(ORDRE_GENERATION.indexOf('indice_3')).toBeLessThan(ORDRE_GENERATION.indexOf('commentaire'));
  });

  it('produit un JSON schema strict', () => {
    const schema = versJsonSchemaStrict(questionGenereeSchema) as {
      type: string;
      required: string[];
      additionalProperties: boolean;
      properties: Record<string, { type?: string; enum?: string[] }>;
    };
    expect(schema.type).toBe('object');
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(ORDRE_GENERATION);
    expect(schema.properties.bonne_reponse?.enum).toEqual(['a', 'b', 'c']);
  });
});

describe('extraireChampsPartiels', () => {
  it('lit les champs terminés et le champ en cours', () => {
    const flux = '{"fait": "Le monde change", "chiffres": "En 1800, 1 \\"milliard\\"", "calculs": "en co';
    expect(extraireChampsPartiels(flux)).toEqual({
      fait: 'Le monde change',
      chiffres: 'En 1800, 1 "milliard"',
      calculs: 'en co',
    });
  });

  it('tolère un échappement coupé en fin de flux', () => {
    expect(extraireChampsPartiels('{"a": "ligne\\')).toEqual({ a: 'ligne' });
    expect(extraireChampsPartiels('{"a": "ligne\\n suite"}')).toEqual({ a: 'ligne\n suite' });
  });
});
