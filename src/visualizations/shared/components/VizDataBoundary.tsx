import { Suspense, use, useEffect, useState, type ReactNode } from 'react';
import { CANONICAL_VERSIFICATION } from '../../../core/bible/versification.ts';
import { DatasetUnavailableError } from '../../../shared/lib/fetch-dataset.ts';
import { useLocalization } from '../../../i18n/use-locale.tsx';
import { hasArrived, prefersReducedMotion } from '../../../shared/lib/arrival.ts';
import { ErrorBoundary } from '../../../shared/ui/ErrorBoundary.tsx';
import { RetryIcon } from '../../../shared/ui/icons.tsx';
import { resetTranslations, vizCoreLoader, type VizCore } from '../viz-data.ts';
import styles from './controls.module.css';
import { LoadingArcs, RAMP_MS } from './LoadingArcs.tsx';

interface VizDataBoundaryProps {
  readonly children: (core: VizCore) => ReactNode;
}

function Loaded({ children }: VizDataBoundaryProps) {
  return children(use(vizCoreLoader.load()));
}

/**
 * How many links the dataset holds, for the waiting screen: what the last data build recorded
 * (see `vite/link-count.ts`), since the file itself has not arrived yet.
 */
const LINK_COUNT = import.meta.env.LINK_COUNT;

/**
 * On a visit's arrival the loading screen stays at least this long, whether or not the data
 * is quicker (it usually is, from the cache): time for its spectrum to fill and stand a moment.
 */
export const HOLD_MS = RAMP_MS + 600;
/** Then it fades out over the arriving page for this long. */
export const LEAVE_MS = 700;

/**
 * Loads the shared data with Suspense and shows a retryable error if it fails. The text of a
 * translation loads inside (see `Explorer`), and a failure there lands in this boundary too, so
 * retrying forgets both.
 *
 * The loading screen is part of the arrival (see `Explorer`): on a visit's first open it is
 * held until its picture is full, and leaves with a fade over the page; a return in the same
 * visit, or a reader who prefers reduced motion, gets the page as soon as the data is here.
 */
export function VizDataBoundary({ children }: VizDataBoundaryProps) {
  const { t, n } = useLocalization();
  const [held, setHeld] = useState(() => !hasArrived() && !prefersReducedMotion());
  const [ready, setReady] = useState(false);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!held) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setHeld(false);
    }, HOLD_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [held]);
  useEffect(() => {
    // Settled either way: a failure mounts the page too, where `use()` throws it to the boundary.
    let current = true;
    const settled = () => {
      if (current) setReady(true);
    };
    vizCoreLoader.load().then(settled, settled);
    return () => {
      current = false;
    };
  }, []);
  const page = ready && !held;
  const leaving = page && !gone;
  useEffect(() => {
    if (!leaving) {
      return undefined;
    }
    const timer = setTimeout(
      () => {
        setGone(true);
      },
      prefersReducedMotion() ? 0 : LEAVE_MS,
    );
    return () => {
      clearTimeout(timer);
    };
  }, [leaving]);
  const label = t('loading.data')(n(CANONICAL_VERSIFICATION.verseCount), n(LINK_COUNT));
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div role="alert" style={{ padding: 'var(--space-6)' }}>
          {/* A `DatasetUnavailableError` carries a developer's sentence — it names the file
              and says to run `npm run data` — which is the wrong thing to show a reader, and
              in the wrong language. Anything else is a real fault worth reading verbatim. */}
          <p>
            {error instanceof DatasetUnavailableError
              ? t('error.datasetUnavailable')
              : error.message}
          </p>
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              vizCoreLoader.reset();
              resetTranslations();
              reset();
            }}
          >
            <RetryIcon />
            {t('error.retry')}
          </button>
        </div>
      )}
    >
      {page && (
        <Suspense fallback={<LoadingArcs label={label} />}>
          <Loaded>{children}</Loaded>
        </Suspense>
      )}
      {!gone && <LoadingArcs label={label} leaving={leaving} />}
    </ErrorBoundary>
  );
}
