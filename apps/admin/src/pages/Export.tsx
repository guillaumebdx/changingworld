import { useCompteurs } from '../api/hooks';
import { EnTetePage, TitreSection } from '../components/ui/EnTetePage';

const COLONNES = [
  'numero',
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
  'statut',
  'commentaire_interne',
  'categorie',
  'sous_categorie',
  'fait',
  'chiffres',
  'calculs',
  'resultat',
  'type',
  'impact',
];

export default function Export() {
  const compteurs = useCompteurs();
  return (
    <>
      <EnTetePage titre="Export" sousTitre="Toutes les questions, dans un classeur Excel" />
      <div className="max-w-[760px]">
        <p className="mt-0 text-[15px] leading-relaxed text-encre-80">
          Le classeur reprend les colonnes de votre fichier d’origine, dans le même ordre, précédées du numéro de la question. Tous les
          statuts sont inclus : filtrez dans Excel sur la colonne <span className="font-mono text-[12px]">statut</span> si vous ne voulez que
          les questions validées.
        </p>
        <a
          href="/api/admin/export.xlsx"
          download
          className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-fin border-[1.5px] border-encre bg-encre px-6 py-3 text-[14px] font-semibold text-papier no-underline hover:bg-encre-80"
        >
          Exporter en Excel (.xlsx)
          {compteurs.data ? <span className="font-mono text-[10px] font-normal opacity-80">· {compteurs.data.total} questions</span> : null}
        </a>

        <div className="mt-10">
          <TitreSection droite={`${COLONNES.length} colonnes`}>Colonnes du classeur</TitreSection>
          <div className="flex flex-wrap gap-1.5 border-t-2 border-encre pt-3">
            {COLONNES.map((c) => (
              <span key={c} className="border border-filet-fort bg-rail px-2 py-1 font-mono text-[10px] text-encre-80">
                {c}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-encre-50">
            La colonne <span className="font-mono">type</span> contient le nom du format de la question.
          </p>
        </div>
      </div>
    </>
  );
}
