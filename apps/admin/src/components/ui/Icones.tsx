interface Props {
  taille?: number;
  className?: string;
}

const base = (taille: number, className?: string) => ({
  width: taille,
  height: taille,
  viewBox: '0 0 16 16',
  fill: 'none',
  'aria-hidden': true,
  className,
});

export function IconeQuestions({ taille = 16, className }: Props) {
  return (
    <svg {...base(taille, className)}>
      <rect x="2.5" y="2.5" width="11" height="11" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 6.5h6M5 9.5h4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function IconeGenerer({ taille = 16, className }: Props) {
  return (
    <svg {...base(taille, className)}>
      <path d="M8 2.5 13.5 8 8 13.5 2.5 8z" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function IconePrompts({ taille = 16, className }: Props) {
  return (
    <svg {...base(taille, className)}>
      <path d="M5.5 4.5 2.5 8l3 3.5M10.5 4.5 13.5 8l-3 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconeReglages({ taille = 16, className }: Props) {
  return (
    <svg {...base(taille, className)}>
      <path d="M2.5 5.5h11M2.5 10.5h11" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6" cy="5.5" r="1.9" fill="var(--color-rail)" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10.5" cy="10.5" r="1.9" fill="var(--color-rail)" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function IconeExport({ taille = 16, className }: Props) {
  return (
    <svg {...base(taille, className)}>
      <path d="M8 2.5v8M5 7.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M2.5 11.5v2h11v-2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function IconeRegenerer({ taille = 11, className }: Props) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 12 12" fill="none" aria-hidden="true" className={className}>
      <path d="M10.5 6a4.5 4.5 0 1 1-1.6-3.45" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M10.6 1.4v2.2H8.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconeChevron({ taille = 12, className, ouvert = false }: Props & { ouvert?: boolean }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ transform: ouvert ? 'rotate(90deg)' : undefined, transition: 'transform 120ms' }}
    >
      <path d="M4 2.5 7.5 6 4 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
