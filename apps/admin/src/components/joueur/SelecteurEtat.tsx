import type { NbIndices } from '@changing-world/shared';

export interface EtatApercu {
  indices: NbIndices;
  verdict: 'juste' | 'faux' | null;
}

export const ETAT_APERCU_INITIAL: EtatApercu = { indices: 0, verdict: null };

interface Option {
  libelle: string;
  actif: (e: EtatApercu) => boolean;
  appliquer: (e: EtatApercu) => EtatApercu;
}

const OPTIONS: Option[] = [
  { libelle: 'Question', actif: (e) => e.verdict === null && e.indices === 0, appliquer: () => ({ indices: 0, verdict: null }) },
  { libelle: 'Indice 1', actif: (e) => e.verdict === null && e.indices === 1, appliquer: () => ({ indices: 1, verdict: null }) },
  { libelle: 'Indice 2', actif: (e) => e.verdict === null && e.indices === 2, appliquer: () => ({ indices: 2, verdict: null }) },
  { libelle: 'Indice 3', actif: (e) => e.verdict === null && e.indices === 3, appliquer: () => ({ indices: 3, verdict: null }) },
  { libelle: 'Juste', actif: (e) => e.verdict === 'juste', appliquer: (e) => ({ ...e, verdict: 'juste' }) },
  { libelle: 'Faux', actif: (e) => e.verdict === 'faux', appliquer: (e) => ({ ...e, verdict: 'faux' }) },
];

export function SelecteurEtat({ etat, onChange }: { etat: EtatApercu; onChange: (e: EtatApercu) => void }) {
  return (
    <div className="flex gap-1" role="tablist" aria-label="État de l’aperçu">
      {OPTIONS.map((o) => {
        const actif = o.actif(etat);
        return (
          <button
            key={o.libelle}
            type="button"
            role="tab"
            aria-selected={actif}
            onClick={() => onChange(o.appliquer(etat))}
            className={`min-h-[40px] min-w-0 flex-1 rounded-fin border px-1 py-[7px] font-mono text-[11px] uppercase tracking-[0.06em] ${
              actif ? 'border-encre bg-encre font-semibold text-papier' : 'border-filet-fort bg-surface text-encre-70 hover:border-encre-50'
            }`}
          >
            {o.libelle}
          </button>
        );
      })}
    </div>
  );
}
