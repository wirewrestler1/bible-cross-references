import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SearchIcon } from '../../../shared/ui/icons.tsx';
import { PHONE_QUERY, useMediaQuery } from '../../../shared/lib/use-media-query.ts';
import { useLocalization } from '../../../i18n/use-locale.tsx';
import { useBottomSheet } from '../use-bottom-sheet.ts';
import controls from './controls.module.css';
import styles from './VizPage.module.css';

interface VizPageProps {
  /** The site's name, a link home, provided by the host app. */
  readonly masthead?: ReactNode;
  /** The switch between visualizations: beside the name on wide screens, in the bar on phones. */
  readonly viewSwitch?: ReactNode;
  /** The reference search: in the header on wide screens, a sheet opened from the bar on phones. */
  readonly search?: ReactNode;
  /** The translation picker and the view's own controls: in the header at every width. */
  readonly tools?: ReactNode;
  /** The filters and the guide: in the header on wide screens, in the bar on phones. */
  readonly menus?: ReactNode;
  /** The details panel: a side column on wide screens, a bottom sheet on phones; omit or pass
   * `null` / `false` for none. */
  readonly panel?: ReactNode;
  /** Closes the panel; on phones, pulling its sheet down from its lowest point calls it. */
  readonly onPanelClose?: () => void;
  /** Data attribution and inspiration: a faint line at the end of the header on a wide screen;
   * on a phone it lives in the guide, which the host gives it too. */
  readonly credits: ReactNode;
  /** The visualization itself. */
  readonly children: ReactNode;
}

/**
 * The shared frame of every visualization page.
 *
 * On wide screens: the name, the switch and every control float along the top as pills of
 * glass, the stage fills the rest, and the details are a card beside it with a margin round it.
 * On phones: a slim header with the name and the view's tools, the stage with the details as a
 * sheet that rests at three heights, and a bar along the bottom — where a thumb is — with the
 * views, the search, the filters and the guide. There is no footer: its links live in the
 * guide, and the data's credit is a faint line in the stage's corner on a wide screen.
 */
export function VizPage({
  masthead,
  viewSwitch,
  search,
  tools,
  menus,
  panel,
  onPanelClose,
  credits,
  children,
}: VizPageProps) {
  const { t } = useLocalization();
  const phone = useMediaQuery(PHONE_QUERY);
  const hasPanel = panel !== undefined && panel !== null && panel !== false;
  const { position, setPosition, containerRef, sheetRef, spaceRef, peekRef, halfRef, scrimRef } =
    useBottomSheet(hasPanel, onPanelClose);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // The search sheet opens with its box focused, so the keyboard comes up with it.
  useEffect(() => {
    if (searchOpen) {
      searchRef.current?.querySelector('input')?.focus();
    }
  }, [searchOpen]);
  if (searchOpen && !phone) {
    setSearchOpen(false); // Widened past a phone: the box is in the header again.
  }

  const full = position === 'full';
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.masthead}>
          {masthead}
          {!phone && viewSwitch}
        </div>
        <div className={styles.controls}>
          {!phone && search}
          {tools}
          {!phone && menus}
        </div>
        {!phone && <p className={styles.credits}>{credits}</p>}
      </header>
      <div ref={containerRef} className={styles.body} data-sheet={hasPanel ? position : undefined}>
        <main className={styles.stage}>{children}</main>
        {hasPanel && (
          <>
            {/* Phones: the room kept for the sheet, so the visualization lays out above it; and
                the two heights it rests at, measured from the stylesheet. */}
            <div ref={spaceRef} className={styles.sheetSpace} aria-hidden="true" />
            <div ref={peekRef} className={styles.sheetPeek} aria-hidden="true" />
            <div ref={halfRef} className={styles.sheetHalf} aria-hidden="true" />
            <div
              ref={scrimRef}
              className={styles.sheetScrim}
              aria-hidden="true"
              onClick={() => {
                setPosition('half');
              }}
            />
            <aside ref={sheetRef} className={styles.panel} aria-label={t('panel.details')}>
              <button
                type="button"
                className={styles.sheetHandle}
                aria-label={full ? t('panel.collapse') : t('panel.expand')}
                aria-expanded={full}
                onClick={() => {
                  setPosition(full ? 'half' : 'full');
                }}
              />
              {panel}
            </aside>
          </>
        )}
      </div>
      {phone && (
        <>
          {searchOpen && (
            <>
              <div
                className={controls.menuScrim}
                onClick={() => {
                  setSearchOpen(false);
                }}
              />
              <div
                ref={searchRef}
                role="dialog"
                aria-label={t('search.label')}
                className={controls.searchSheet}
                onBlur={(event) => {
                  // Focus leaving the sheet closes it: a found reference blurs the box itself, a
                  // tap elsewhere takes the focus with it. A reference that could not be read
                  // keeps the focus, and the sheet, so the message can be read.
                  if (!(
                    event.relatedTarget instanceof Node &&
                    event.currentTarget.contains(event.relatedTarget)
                  )) {
                    setSearchOpen(false);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setSearchOpen(false);
                  }
                }}
              >
                {search}
              </div>
            </>
          )}
          <nav className={controls.bar} aria-label={t('bar.label')}>
            {viewSwitch}
            {search !== undefined && (
              <button
                type="button"
                className={`${controls.button} ${controls.menuButton}`}
                aria-label={t('search.short')}
                aria-expanded={searchOpen}
                onClick={() => {
                  setSearchOpen((open) => !open);
                }}
              >
                <SearchIcon />
                <span className={controls.menuLabel}>{t('search.short')}</span>
              </button>
            )}
            {menus}
          </nav>
        </>
      )}
    </div>
  );
}
