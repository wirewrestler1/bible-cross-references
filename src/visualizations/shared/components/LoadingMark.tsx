import { MARK_PATHS, MARK_VIEWBOX } from '../../../shared/ui/mark-paths.ts';
import { useLocalization } from '../../../i18n/use-locale.tsx';
import styles from './LoadingMark.module.css';

interface LoadingMarkProps {
  /** What is loading: the status line under the mark, also read by screen readers. */
  readonly label: string;
}

/**
 * The waiting screen: the mark drawing itself in light, arc by arc, with the site's name under
 * it and a line saying what is on its way. It takes over from the page's static first frame,
 * which draws the same mark the same way, so the hand-off is invisible.
 */
export function LoadingMark({ label }: LoadingMarkProps) {
  const { t } = useLocalization();
  return (
    <div className={styles.loader} role="status" aria-live="polite">
      <svg className={styles.mark} viewBox={MARK_VIEWBOX} aria-hidden="true">
        {MARK_PATHS.arcs.map((d, index) => (
          <path
            key={d}
            d={d}
            pathLength={1}
            className={styles.arc}
            style={{ animationDelay: `${String(index * 0.3)}s` }}
          />
        ))}
        <path d={MARK_PATHS.baseline} className={styles.still} />
        {MARK_PATHS.cross.map((d) => (
          <path key={d} d={d} className={styles.still} />
        ))}
      </svg>
      <p className={styles.name}>{t('app.name')}</p>
      <p className={styles.label}>{label}</p>
    </div>
  );
}
