import { MARK_PATHS, MARK_VIEWBOX } from './mark-paths.ts';

interface MarkProps {
  readonly className?: string | undefined;
}

/** The mark, drawn in the current text colour; decorative, since the name stands beside it. */
export function Mark({ className }: MarkProps) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      {MARK_PATHS.arcs.map((d) => (
        <path key={d} d={d} />
      ))}
      <path d={MARK_PATHS.baseline} />
      {MARK_PATHS.cross.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
