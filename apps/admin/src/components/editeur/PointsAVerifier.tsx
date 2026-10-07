import type { Controle, EtatLien, NiveauControle } from '@changing-world/shared';
import { TitreSection } from '../ui/EnTetePage';
import { PointsEnCours } from '../ui/Bouton';

const COULEUR: Record<NiveauControle, string> = {
  bloquant: 'bg-faux-vif',
  avertissement: 'bg-indice',
  info: 'bg-encre-30',
};

const LIBELLE: Record<NiveauControle, string> = {
  bloquant: 'bloquant',
  avertissement: 'à vérifier',
  info: 'remarque',
};

interface Props {
  controles: Controle[];
  etatLien: EtatLien;
  detailLien?: string;
  lienRenseigne: boolean;
  onVerifierLien: () => void;
  generationEnCours?: boolean;
}

export function PointsAVerifier({ controles, etatLien, detailLien, lienRenseigne, onVerifierLien, generationEnCours = false }: Props) {
  const nbBloquants = controles.filter((c) => c.niveau === 'bloquant').length;
  return (
    <section aria-labelledby="points-a-verifier">
      <TitreSection
        droite={
          nbBloquants > 0 ? `${nbBloquants} bloquant${nbBloquants > 1 ? 's' : ''}` : controles.length > 0 ? `${controles.length} point${controles.length > 1 ? 's' : ''}` : 'rien à signaler'
        }
      >
        <span id="points-a-verifier">Points à vérifier</span>
      </TitreSection>
      <div className="border-t-2 border-encre">
        {generationEnCours ? (
          <p className="m-0 py-3 text-[13px] leading-relaxed text-encre-50">Les contrôles reprendront dès que la génération sera terminée.</p>
        ) : controles.length === 0 ? (
          <p className="m-0 py-3 text-[13px] leading-relaxed text-encre-50">
            Les contrôles automatiques ne relèvent rien. Ils ne remplacent pas une relecture attentive des chiffres.
          </p>
        ) : (
          <ul className="m-0 list-none p-0">
            {controles.map((c) => (
              <li key={c.code} className="flex items-start gap-2.5 border-b border-filet py-2.5">
                <span className={`mt-[6px] h-[7px] w-[7px] flex-none ${COULEUR[c.niveau]}`} aria-hidden="true" />
                <span className="min-w-0 flex-1 text-[13px] leading-[1.45] text-encre-80">{c.message}</span>
                <span className={`etiquette-xs flex-none pt-[3px] ${c.niveau === 'bloquant' ? 'text-faux-vif' : 'text-encre-30'}`}>{LIBELLE[c.niveau]}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between gap-2 border-t border-filet-fort py-2.5">
          <span className="etiquette-xs flex items-center gap-2 text-encre-50">
            Lien source
            {!lienRenseigne ? (
              <span className="text-encre-30">non renseigné</span>
            ) : etatLien === 'en_cours' ? (
              <PointsEnCours />
            ) : etatLien === 'ok' ? (
              <span className="text-juste">répond{detailLien ? ` (${detailLien})` : ''}</span>
            ) : etatLien === 'ko' ? (
              <span className="text-faux-vif">ne répond pas{detailLien ? ` (${detailLien})` : ''}</span>
            ) : (
              <span className="text-encre-30">non vérifié</span>
            )}
          </span>
          <button
            type="button"
            disabled={!lienRenseigne || etatLien === 'en_cours'}
            onClick={onVerifierLien}
            className="etiquette-xs text-indice-texte underline decoration-indice/50 underline-offset-[3px] disabled:opacity-50"
          >
            {etatLien === 'inconnu' ? 'Vérifier le lien' : 'Revérifier'}
          </button>
        </div>
      </div>
    </section>
  );
}
