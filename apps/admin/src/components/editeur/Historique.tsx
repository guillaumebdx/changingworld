import type { EntreeHistorique } from '@changing-world/shared';
import { formaterDateHeure, formaterRelatif } from '../../utils/dates';
import { TitreSection } from '../ui/EnTetePage';

interface Props {
  entrees: EntreeHistorique[];
  onRestaurer: (id: number) => void;
  enCours: boolean;
}

function resume(e: EntreeHistorique): string {
  const q = e.snapshot.question?.trim();
  if (!q) return 'Question vide à cette étape';
  return q.length > 88 ? `${q.slice(0, 88)}…` : q;
}

export function Historique({ entrees, onRestaurer, enCours }: Props) {
  return (
    <section aria-labelledby="historique">
      <TitreSection droite={`${entrees.length} version${entrees.length > 1 ? 's' : ''}`}>
        <span id="historique">Historique des versions</span>
      </TitreSection>
      <div className="border-t-2 border-encre">
        {entrees.length === 0 ? (
          <p className="m-0 py-3 text-[13px] text-encre-50">Aucune version enregistrée pour l’instant.</p>
        ) : (
          <ol className="m-0 list-none p-0">
            {entrees.map((e, i) => (
              <li key={e.id} className="flex items-baseline gap-3 border-b border-filet py-2.5">
                <span className={`w-[52px] flex-none font-mono text-[11px] uppercase tracking-[0.12em] ${e.auteur === 'ia' ? 'text-indice-texte' : 'text-juste-texte'}`}>
                  {e.auteur === 'ia' ? 'IA' : 'Bernard'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-encre-80" title={e.snapshot.question}>
                    {resume(e)}
                  </div>
                  <div className="etiquette-xs mt-0.5 text-encre-30" title={formaterDateHeure(e.created_at)}>
                    {formaterRelatif(e.created_at)}
                    {e.snapshot.statut ? ` · ${e.snapshot.statut.replace('_', ' ')}` : ''}
                  </div>
                </div>
                {i === 0 ? (
                  <span className="etiquette-xs flex-none text-encre-30">actuelle</span>
                ) : (
                  <button
                    type="button"
                    disabled={enCours}
                    onClick={() => onRestaurer(e.id)}
                    className="etiquette-xs flex-none text-indice-texte underline decoration-indice/50 underline-offset-[3px] disabled:opacity-50"
                  >
                    Restaurer
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
