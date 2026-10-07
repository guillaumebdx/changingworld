import OpenAI from 'openai';

export interface ParamsGeneration {
  /** Message système. */
  systeme: string;
  /** Message utilisateur. */
  utilisateur: string;
  /** JSON schema strict attendu en sortie. */
  schema: Record<string, unknown>;
  nomSchema: string;
  modele: string;
  temperature: number;
}

/**
 * Interface unique vers le modèle de langage. Le reste de l'API ne connaît que cette interface :
 * on peut la remplacer par un faux client en démo ou en test.
 */
export interface ClientIA {
  readonly nom: 'openai' | 'demo';
  /** Génère un objet JSON conforme au schéma, renvoyé sous forme de texte en streaming. */
  genererJson(params: ParamsGeneration, signal?: AbortSignal): AsyncIterable<string>;
}

/** Les modèles de raisonnement d'OpenAI refusent le paramètre temperature. */
function accepteTemperature(modele: string): boolean {
  return !/^(o\d|gpt-5)/i.test(modele);
}

export class ClientOpenAI implements ClientIA {
  readonly nom = 'openai' as const;
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async *genererJson(params: ParamsGeneration, signal?: AbortSignal): AsyncIterable<string> {
    const flux = await this.client.chat.completions.create(
      {
        model: params.modele,
        ...(accepteTemperature(params.modele) ? { temperature: params.temperature } : {}),
        stream: true,
        messages: [
          { role: 'system', content: params.systeme },
          { role: 'user', content: params.utilisateur },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: params.nomSchema, strict: true, schema: params.schema },
        },
      },
      { signal },
    );
    for await (const morceau of flux) {
      const delta = morceau.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}

export function creerClientIA(apiKey: string | null): ClientIA {
  if (apiKey) return new ClientOpenAI(apiKey);
  return new ClientDemo();
}

/* ------------------------------------------------------------------ */
/* Faux client : réponses factices mais plausibles, pour la démo       */
/* ------------------------------------------------------------------ */

interface ProprieteSchema {
  type?: string;
  enum?: string[];
  description?: string;
  properties?: Record<string, ProprieteSchema>;
  items?: ProprieteSchema;
}

const QUESTIONS_DEMO = [
  {
    fait: "L'alphabétisation mondiale est passée d'une minorité à une large majorité en deux siècles.",
    chiffres:
      "Vers 1820, environ 12 % des adultes dans le monde savaient lire (Our World in Data, d'après van Zanden et al.). En 2020, la part dépasse 86 %.",
    calculs: 'Lecture directe de la série : 12 % en 1820 contre 86 % en 2020.',
    resultat: 'Environ 12 %',
    question: 'Quelle part de la population mondiale adulte savait lire vers 1820 ?',
    reponse_a: 'Environ 12 %',
    reponse_b: 'Environ 30 %',
    reponse_c: 'Environ 50 %',
    bonne_reponse: 'a',
    indice_1: "À cette époque, l'école obligatoire n'existe encore dans presque aucun pays.",
    indice_2: 'Même en Europe de l’Ouest, région la plus avancée, à peine la moitié des adultes savent lire.',
    indice_3: 'En Asie et en Afrique, qui regroupent la grande majorité de la population mondiale, le taux reste inférieur à 10 %.',
    commentaire:
      "Vers 1820, à peine un adulte sur huit savait lire dans le monde. L'école de masse, lancée en Prusse puis en France et aux États-Unis au XIXe siècle, a changé la donne : en 2020, plus de 86 % des adultes sont alphabétisés. Le basculement s'est joué surtout au XXe siècle.",
    source_nom: 'Our World in Data',
    source_lien: 'https://ourworldindata.org/literacy',
    impact: 'SURPRENANT',
  },
  {
    fait: 'La mortalité infantile a été divisée par plus de dix en un siècle et demi.',
    chiffres:
      "Vers 1850, en Europe, environ 25 % des enfants mouraient avant cinq ans (Gapminder, Our World in Data). En 2020, le chiffre est de 0,4 % en Europe et de 3,7 % dans le monde.",
    calculs: '25 % vers 1850 contre 3,7 % dans le monde en 2020 : division par environ 7 à l’échelle mondiale, par 60 en Europe.',
    resultat: 'Un enfant sur quatre',
    question: 'Vers 1850, en Europe, quelle part des enfants mourait avant l’âge de cinq ans ?',
    reponse_a: 'Un enfant sur quarante',
    reponse_b: 'Un enfant sur dix',
    reponse_c: 'Un enfant sur quatre',
    bonne_reponse: 'c',
    indice_1: 'Les familles de l’époque comptaient souvent six à huit naissances.',
    indice_2: 'Les maladies infectieuses, l’eau souillée et la malnutrition frappaient d’abord les plus jeunes.',
    indice_3: 'Dans beaucoup de villes européennes, un quart des bébés n’atteignaient pas leur cinquième anniversaire.',
    commentaire:
      "Vers 1850, environ un enfant européen sur quatre mourait avant cinq ans. Eau potable, vaccins et antibiotiques ont ramené ce chiffre à moins de 0,5 % en Europe en 2020. À l'échelle mondiale, la mortalité des moins de cinq ans est tombée à 3,7 %.",
    source_nom: 'Our World in Data',
    source_lien: 'https://ourworldindata.org/child-mortality',
    impact: 'CHOC',
  },
  {
    fait: 'La première ligne de chemin de fer à vapeur ouverte au public date du premier quart du XIXe siècle.',
    chiffres:
      "La ligne Stockton et Darlington (Angleterre) ouvre en 1825 ; la ligne Liverpool et Manchester, première ligne interurbaine entièrement à vapeur, en 1830.",
    calculs: 'Aucun : datation directe.',
    resultat: 'Années 1820',
    question: 'À quelle décennie ouvre la première ligne de chemin de fer à vapeur transportant des voyageurs ?',
    reponse_a: 'Années 1790',
    reponse_b: 'Années 1820',
    reponse_c: 'Années 1850',
    bonne_reponse: 'b',
    indice_1: 'Cela se passe en Angleterre, dans une région minière du nord-est.',
    indice_2: 'La machine à vapeur de Watt a déjà cinquante ans, mais elle sert surtout à pomper et à filer.',
    indice_3: 'La locomotive de George Stephenson tire les premiers wagons de voyageurs cinq ans avant la ligne Liverpool-Manchester (1830).',
    commentaire:
      'La ligne Stockton-Darlington ouvre en 1825, et Liverpool-Manchester en 1830. En vingt ans, le réseau britannique dépasse 10 000 km. Le train abaisse le temps de trajet Londres-Manchester de quatre jours à moins de dix heures.',
    source_nom: 'Our World in Data',
    source_lien: 'https://ourworldindata.org/grapher/length-of-railway-lines',
    impact: 'INTERESSANT',
  },
];

const REMARQUES_DEMO = [
  {
    gravite: 'important',
    sujet: 'Chiffre principal',
    detail:
      "Vérifiez la valeur et l'année du chiffre clé dans la source citée : les séries historiques varient selon les auteurs, précisez laquelle est utilisée.",
  },
  {
    gravite: 'mineur',
    sujet: 'Indice 3',
    detail: "L'indice 3 pourrait être plus déductif : donnez un repère chiffré voisin plutôt qu'une description qualitative.",
  },
  {
    gravite: 'mineur',
    sujet: 'Commentaire',
    detail: 'Le commentaire gagnerait à dire en une phrase pourquoi le chiffre surprend aujourd’hui.',
  },
];

/** Faux client utilisé quand OPENAI_API_KEY est absente : l'app reste utilisable en démo. */
export class ClientDemo implements ClientIA {
  readonly nom = 'demo' as const;
  private compteur = 0;

  constructor(private readonly delaiMs = 12) {}

  async *genererJson(params: ParamsGeneration, signal?: AbortSignal): AsyncIterable<string> {
    const objet = this.fabriquer(params);
    const texte = JSON.stringify(objet, null, 1);
    const taille = 14;
    for (let i = 0; i < texte.length; i += taille) {
      if (signal?.aborted) return;
      if (this.delaiMs > 0) await new Promise((r) => setTimeout(r, this.delaiMs));
      yield texte.slice(i, i + taille);
    }
  }

  private fabriquer(params: ParamsGeneration): Record<string, unknown> {
    const props = (params.schema.properties ?? {}) as Record<string, ProprieteSchema>;
    const base = QUESTIONS_DEMO[this.compteur++ % QUESTIONS_DEMO.length]!;
    const consigne = extraireConsigne(params.utilisateur);
    const resultat: Record<string, unknown> = {};
    for (const [cle, def] of Object.entries(props)) {
      if (cle === 'remarques') {
        resultat[cle] = REMARQUES_DEMO;
      } else if (def.enum) {
        const valeur = (base as Record<string, unknown>)[cle];
        resultat[cle] = typeof valeur === 'string' && def.enum.includes(valeur) ? valeur : def.enum[0];
      } else if (cle in base) {
        let valeur = (base as Record<string, string>)[cle]!;
        if (consigne && cle === 'question') valeur = `${valeur} (démo, consigne : ${consigne})`;
        if (params.nomSchema.startsWith('regeneration')) valeur = varier(valeur);
        resultat[cle] = valeur;
      } else {
        resultat[cle] = `[démo] ${def.description ?? cle}`;
      }
    }
    return resultat;
  }
}

function extraireConsigne(utilisateur: string): string | null {
  const m = utilisateur.match(/Consigne(?: libre)?\s*:\s*(.+)/i);
  if (!m) return null;
  const c = m[1]!.trim();
  if (!c || /^aucune/i.test(c)) return null;
  return c.length > 60 ? `${c.slice(0, 60)}…` : c;
}

function varier(texte: string): string {
  return texte.endsWith('.') ? `${texte.slice(0, -1)}, selon les estimations les plus courantes.` : `${texte} (reformulé)`;
}
