import { useEffect, useRef } from 'react';
import { LINK_KIND_IDS } from '../../core/datasets/link-kinds.ts';
import { useLocalization } from '../../i18n/use-locale.tsx';
import { GUIDE_PREFERENCE } from '../lib/preference-keys.ts';
import { useStringPreference } from '../lib/preferences.ts';
import { setGuideOpen, useGuideOpen } from './guide-state.ts';
import styles from './FirstVisitGuide.module.css';

/** A question mark in a ring, the one icon this guide needs. */
function GuideIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none">
      <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7.6 7.9a2.4 2.4 0 1 1 3.4 2.2c-.7.35-1 .8-1 1.5v.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="14.6" r=".9" fill="currentColor" />
    </svg>
  );
}

/** The header button that opens the guide. */
export function GuideButton() {
  const { t } = useLocalization();
  return (
    <button
      type="button"
      className={styles.button}
      aria-label={t('guide.open')}
      title={t('guide.open')}
      onClick={() => {
        setGuideOpen(true);
      }}
    >
      <GuideIcon />
    </button>
  );
}

/**
 * What a first-time reader needs to know, shown once on arrival and again from the "?" button:
 * what the lines are, the four kinds and how far to trust each, what the weight means, and
 * which books are new. Dismissing it is remembered, so it does not come back on its own.
 */
export function FirstVisitGuide() {
  const { t } = useLocalization();
  const [seen, setSeen] = useStringPreference(GUIDE_PREFERENCE, '');
  const open = useGuideOpen();
  const dialogRef = useRef<HTMLElement>(null);

  const dismiss = () => {
    setSeen('seen');
    setGuideOpen(false);
  };

  // On arrival, once: a reader who has dismissed it before is not shown it again.
  useEffect(() => {
    if (seen !== 'seen') {
      setGuideOpen(true);
    }
    // Only on mount: the guide is not re-opened when the preference changes under it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    // The dialog itself takes focus, not its button: a focused button is scrolled into view,
    // which on a phone opens the guide at its end instead of its beginning.
    dialogRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  });

  if (!open) {
    return null;
  }
  return (
    <div className={styles.scrim} onClick={dismiss}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        tabIndex={-1}
        className={styles.guide}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h2 id="guide-title" className={styles.title}>
          {t('guide.title')}
        </h2>
        <h3 className={styles.heading}>{t('guide.arcs.title')}</h3>
        <p className={styles.text}>{t('guide.arcs')}</p>
        <h3 className={styles.heading}>{t('guide.kinds.title')}</h3>
        <p className={styles.text}>{t('guide.kinds')}</p>
        <ul className={styles.kinds}>
          {LINK_KIND_IDS.map((kind) => (
            <li key={kind} className={styles.kind}>
              <span className={styles.sample} data-kind={kind} aria-hidden="true" />
              <span>
                <strong>{t(`kind.${kind}`)}</strong>
                <span className={styles.note}> — {t(`kind.${kind}.note`)}</span>
              </span>
            </li>
          ))}
        </ul>
        <h3 className={styles.heading}>{t('guide.weight.title')}</h3>
        <p className={styles.text}>{t('guide.weight')}</p>
        <h3 className={styles.heading}>{t('guide.canon.title')}</h3>
        <p className={styles.text}>{t('guide.canon')}</p>
        <button type="button" className={styles.done} onClick={dismiss}>
          {t('guide.done')}
        </button>
      </section>
    </div>
  );
}
