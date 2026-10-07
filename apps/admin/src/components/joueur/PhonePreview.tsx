import type { ReactNode } from 'react';

/** Cadre de téléphone (iPhone 390 pt, réduit à 356 px) autour d'un écran joueur. */
export function PhonePreview({ children, hauteur = 680, className = '' }: { children: ReactNode; hauteur?: number; className?: string }) {
  return (
    <div className={`w-full max-w-[356px] rounded-telephone bg-encre p-[9px] ${className}`} data-testid="telephone">
      <div className="flex flex-col overflow-hidden rounded-ecran bg-papier" style={{ height: hauteur }}>
        {children}
      </div>
    </div>
  );
}
