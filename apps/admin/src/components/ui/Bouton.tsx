import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type VarianteBouton = 'principal' | 'affiner' | 'tertiaire' | 'discret' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBouton;
  taille?: 'normal' | 'petit';
  enCours?: boolean;
  children: ReactNode;
}

const STYLES: Record<VarianteBouton, string> = {
  principal: 'bg-encre text-papier border-encre hover:bg-encre-80 disabled:bg-encre-30 disabled:border-encre-30',
  affiner: 'bg-transparent text-indice-texte border-indice hover:bg-indice-fond',
  tertiaire: 'bg-transparent text-encre-70 border-filet-mute hover:bg-surface hover:border-filet-fort',
  discret: 'bg-transparent text-encre-30 border-transparent hover:text-encre-70',
  danger: 'bg-transparent text-faux border-faux-vif hover:bg-faux-fond',
};

export function Bouton({ variante = 'tertiaire', taille = 'normal', enCours = false, className = '', children, disabled, ...reste }: Props) {
  const dims =
    variante === 'discret'
      ? 'etiquette-xs min-h-0 px-1 py-0.5'
      : taille === 'petit'
        ? 'min-h-[36px] px-3.5 py-1.5 text-[13px]'
        : 'min-h-[48px] px-5 py-3 text-[14px]';
  return (
    <button
      type="button"
      disabled={disabled || enCours}
      className={`inline-flex items-center justify-center gap-2 rounded-fin border-[1.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${STYLES[variante]} ${dims} ${className}`}
      {...reste}
    >
      {enCours ? <PointsEnCours /> : null}
      {children}
    </button>
  );
}

export function PointsEnCours() {
  return (
    <span className="inline-flex items-center gap-[3px]" aria-hidden="true">
      <span className="point-ia" style={{ animationDelay: '0s' }} />
      <span className="point-ia" style={{ animationDelay: '0.2s' }} />
      <span className="point-ia" style={{ animationDelay: '0.4s' }} />
    </span>
  );
}
