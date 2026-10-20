import { useState } from 'react';
import { GENRES } from '../../../core/bible/genres.ts';
import { LINK_KIND_IDS } from '../../../core/datasets/link-kinds.ts';
import { GENRE_COLORS } from '../palette.ts';
import { useLocalization } from '../../../i18n/use-locale.tsx';
import { CloseIcon } from '../../../shared/ui/icons.tsx';
import styles from './GenreLegend.module.css';
import { GenreToggles, type GenreTogglesProps } from './GenreToggles.tsx';

/** How each kind of link is drawn: a line sample beside its name. */
export function LineKinds() {
  const { t } = useLocalization();
  return (
    <div className={styles.lines} aria-label={t('legend.kinds')}>
      <p className={styles.heading}>{t('legend.kinds')}</p>
      {LINK_KIND_IDS.map((kind) => (
        <p key={kind} className={styles.line} title={t(`kind.${kind}.note`)}>
          <span className={styles.lineSample} data-kind={kind} />
          {t(`kind.${kind}`)}
        </p>
      ))}
    </div>
  );
}

/**
 * The genre legend, folded into a strip of the genres' colours in the stage's corner — one dot
 * each, a hidden genre's dimmed — that opens into the toggles and the kinds of line.
 */
export function GenreLegend(toggles: GenreTogglesProps) {
  const { t } = useLocalization();
  const [open, setOpen] = useState(false);
  return (
    <section className={styles.legend} data-open={open} aria-label={t('genres.label')}>
      <button
        type="button"
        className={styles.toggle}
        aria-label={open ? t('genres.hide') : t('genres.show')}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        {open ? (
          <CloseIcon />
        ) : (
          <span className={styles.dots} aria-hidden="true">
            {GENRES.map((genre) => (
              <span
                key={genre.id}
                className={styles.dot}
                data-hidden={toggles.hiddenGenres.has(genre.id)}
                style={{ background: GENRE_COLORS[genre.id], color: GENRE_COLORS[genre.id] }}
              />
            ))}
          </span>
        )}
      </button>
      <GenreToggles {...toggles} />
      <LineKinds />
    </section>
  );
}
