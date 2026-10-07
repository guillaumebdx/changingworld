import type { ReactNode } from 'react';

export function EnTetePage({
  titre,
  sousTitre,
  etiquette,
  actions,
  className = '',
}: {
  titre: ReactNode;
  sousTitre?: ReactNode;
  etiquette?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`mb-[26px] flex flex-wrap items-end justify-between gap-4 border-b-2 border-encre pb-3.5 ${className}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-titre m-0 text-[27px] font-semibold leading-tight tracking-[-0.015em]">{titre}</h1>
          {etiquette}
        </div>
        {sousTitre ? <div className="etiquette mt-2 text-encre-50">{sousTitre}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function TitreSection({ children, droite, className = '' }: { children: ReactNode; droite?: ReactNode; className?: string }) {
  return (
    <div className={`mb-[11px] flex items-baseline justify-between gap-2.5 ${className}`}>
      <span className="etiquette text-encre-70">{children}</span>
      {droite ? <span className="etiquette-xs text-encre-30">{droite}</span> : null}
    </div>
  );
}
