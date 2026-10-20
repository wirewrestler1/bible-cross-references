import { useState } from 'react';
import { LINK_KIND_IDS } from '../../../core/datasets/link-kinds.ts';
import { useLocalization } from '../../../i18n/use-locale.tsx';
import { CloseIcon, GenresIcon } from '../../../shared/ui/icons.tsx';
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
 * The genre legend as an overlay in the stage's top-left corner. On phones it collapses to an
 * icon button, like the icon-only header menus there.
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
        {open ? <CloseIcon /> : <GenresIcon />}
      </button>
      <GenreToggles {...toggles} />
      <LineKinds />
    </section>
  );
}
