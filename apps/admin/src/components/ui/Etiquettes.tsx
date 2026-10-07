import type { Impact, Statut } from '@changing-world/shared';
import { LIBELLES_IMPACT, LIBELLES_STATUT } from '@changing-world/shared';

const STYLE_STATUT: Record<Statut, string> = {
  brouillon_ia: 'bg-rail border-filet-fort text-encre-70',
  validee: 'bg-juste-fond border-juste text-juste-texte',
  a_affiner: 'bg-indice-fond border-indice text-indice-texte',
  non_retenue: 'bg-transparent border-filet-mute text-encre-50 line-through',
};

export function EtiquetteStatut({ statut, taille = 'normal' }: { statut: Statut; taille?: 'normal' | 'petit' }) {
  const dims = taille === 'petit' ? 'etiquette-xs px-[7px] py-[3px]' : 'etiquette px-[9px] py-[4px]';
  return (
    <span className={`inline-block whitespace-nowrap border font-medium ${dims} ${STYLE_STATUT[statut]}`}>
      {LIBELLES_STATUT[statut]}
    </span>
  );
}

const STYLE_IMPACT: Record<Impact, string> = {
  CHOC: 'bg-encre text-papier border-encre',
  SURPRENANT: 'bg-indice-fond border-indice text-indice-texte',
  INTERESSANT: 'bg-transparent border-filet-mute text-encre-50',
};

export function EtiquetteImpact({ impact, taille = 'normal' }: { impact: Impact; taille?: 'normal' | 'petit' }) {
  const dims = taille === 'petit' ? 'etiquette-xs px-[7px] py-[3px] tracking-[0.16em]' : 'etiquette px-[10px] py-[5px] tracking-[0.16em]';
  return <span className={`inline-block whitespace-nowrap border font-medium ${dims} ${STYLE_IMPACT[impact]}`}>{LIBELLES_IMPACT[impact]}</span>;
}

export function PastilleCategorie({
  couleur,
  nom,
  sousCategorie,
  taille = 9,
  className = '',
}: {
  couleur: string;
  nom: string;
  sousCategorie?: string | null;
  taille?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-[7px] etiquette-sm text-encre ${className}`}>
      <span className="inline-block flex-none" style={{ width: taille, height: taille, background: couleur }} aria-hidden="true" />
      <span className="min-w-0">
        {nom}
        {sousCategorie ? (
          <>
            {' '}
            <span className="text-encre-30">›</span> {sousCategorie}
          </>
        ) : null}
      </span>
    </span>
  );
}

export function EtiquetteNeutre({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-block border border-filet-fort bg-rail px-2 py-1 font-mono text-[10px] text-encre-80 ${className}`}>{children}</span>;
}
