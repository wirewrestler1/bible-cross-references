import { LINK_KIND_IDS, type LinkKindId } from '../../../core/datasets/link-kinds.ts';
import { useLocalization } from '../../../i18n/use-locale.tsx';
import { FiltersIcon, ResetIcon } from '../../../shared/ui/icons.tsx';
import {
  describeThreshold,
  isDefaultFilter,
  VOTE_THRESHOLDS,
  type LinkFilter,
} from '../link-filter.ts';
import styles from './controls.module.css';
import { MenuButton } from './MenuButton.tsx';

interface FiltersMenuProps {
  readonly filter: LinkFilter;
  readonly defaults: LinkFilter;
  readonly onChange: (filter: LinkFilter) => void;
  /** Links currently shown, and in the whole dataset, so filtering is never hidden. */
  readonly shownLinks: number;
  readonly totalLinks: number;
}

/** Low-key link filters: a button that opens a small popover. */
export function FiltersMenu({
  filter,
  defaults,
  onChange,
  shownLinks,
  totalLinks,
}: FiltersMenuProps) {
  const { t, n } = useLocalization();
  const isDefault = isDefaultFilter(filter, defaults);
  // The minimum is included, hence ≥ (e.g. "≥ 4" keeps links with 4 votes).
  const threshold = describeThreshold(filter.minVotes);
  const thresholdText =
    threshold.kind === 'all'
      ? t('filter.allLinks')
      : threshold.kind === 'no-downvoted'
        ? t('filter.noDownvoted')
        : t('filter.atLeastVotes')(n(threshold.votes));
  const thresholdLabel = (minVotes: number) =>
    minVotes === -Infinity
      ? t('menu.filters.votes.all')
      : t('menu.filters.votes.atLeast')(minVotes);
  const hiddenClauses =
    (filter.hiddenGenres.size > 0 ? t('menu.filters.hiddenGenres')(filter.hiddenGenres.size) : '') +
    (filter.hiddenKinds.size > 0 ? t('menu.filters.hiddenKinds')(filter.hiddenKinds.size) : '');
  const toggleKind = (kind: LinkKindId) => {
    const hiddenKinds = new Set(filter.hiddenKinds);
    if (!hiddenKinds.delete(kind)) {
      hiddenKinds.add(kind);
    }
    onChange({ ...filter, hiddenKinds });
  };
  return (
    <MenuButton
      label={t('menu.filters')}
      changedLabel={t('menu.filtersChanged')}
      icon={FiltersIcon}
      indicator={!isDefault}
    >
      <label className={styles.field}>
        {t('menu.filters.votes')}
        <select
          className={styles.select}
          value={String(filter.minVotes)}
          onChange={(event) => {
            onChange({ ...filter, minVotes: Number(event.target.value) });
          }}
        >
          {VOTE_THRESHOLDS.map((minVotes) => (
            <option key={minVotes} value={String(minVotes)}>
              {thresholdLabel(minVotes)}
            </option>
          ))}
        </select>
      </label>
      <fieldset className={styles.field}>
        <legend>{t('menu.filters.kinds')}</legend>
        {LINK_KIND_IDS.map((kind) => (
          <label key={kind} className={styles.choice} title={t(`kind.${kind}.note`)}>
            <input
              type="checkbox"
              checked={!filter.hiddenKinds.has(kind)}
              onChange={() => {
                toggleKind(kind);
              }}
            />
            {t(`kind.${kind}`)}
            <span className={styles.choiceNote}>{t(`kind.${kind}.note`)}</span>
          </label>
        ))}
      </fieldset>
      <p className={styles.hint}>
        {t('menu.filters.note')(n(shownLinks), n(totalLinks), thresholdText, hiddenClauses)}
      </p>
      <p className={styles.hint}>{t('menu.filters.tip')}</p>
      <button
        type="button"
        className={styles.button}
        disabled={isDefault}
        onClick={() => {
          onChange(defaults);
        }}
      >
        <ResetIcon />
        {t('menu.filters.reset')}
      </button>
    </MenuButton>
  );
}
