import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { GENRES, getBookGenre } from '../../../core/bible/genres.ts';
import {
  chapterPassageOf,
  formatPassage,
  passageRange,
  toPassageOsisId,
  versePassage,
  type Passage,
} from '../../../core/bible/passage.ts';
import { formatVerseIndexRange, formatVerseRef } from '../../../core/bible/reference-format.ts';
import type { VerseIndex } from '../../../core/bible/verse-ref.ts';
import type { Versification } from '../../../core/bible/versification.ts';
import { linkKindId } from '../../../core/datasets/link-kinds.ts';
import { elementAt } from '../../../core/lib/array.ts';
import {
  CloseIcon,
  CopiedIcon,
  CopyIcon,
  ExpandIcon,
  NextIcon,
  PreviousIcon,
} from '../../../shared/ui/icons.tsx';
import type { Translation } from '../../../translations/translation.ts';
import { verseTextOrNote } from '../../../translations/verse-text.ts';
import {
  collectConnections,
  landingNote,
  type Connection,
  type LandingNote,
} from '../connections.ts';
import type { LinkFilter } from '../link-filter.ts';
import { canCopy, copyQuote, quotePassage, type PassageQuote } from '../passage-quote.ts';
import { GENRE_COLORS, GENRE_HEX } from '../palette.ts';
import { verseNotes } from '../verse-notes.ts';
import type { VizData } from '../viz-data.ts';
import { useLocalization, type Localization } from '../../../i18n/use-locale.tsx';
import { MiniArcs } from './MiniArcs.tsx';
import { OriginalWordsSection } from './OriginalWordsSection.tsx';
import styles from './PassageCard.module.css';

interface PassageCardProps {
  readonly data: VizData;
  readonly passage: Passage;
  readonly filter: LinkFilter;
  /** Links that open the passage elsewhere, e.g. in another visualization. */
  readonly actions?: ReactNode;
  readonly onSelect: (passage: Passage) => void;
  readonly onClose: () => void;
  /**
   * A connection is pointed at (mouse) or focused (keyboard), or no longer is: the visualization
   * can show that one link, and the whole passage it points to.
   */
  readonly onPreview?: (connection: Connection | null) => void;
  /** A passage's address on the published site, for copied quotes. */
  readonly shareUrl: (passage: Passage) => string;
}

/** What the list under the chips shows. */
type Mode = 'out' | 'in' | 'verses' | 'words';

const INITIAL_ITEMS = 24;
/** How long the copy button shows that it copied. */
const COPIED_FEEDBACK_MS = 1600;
/** A linked passage longer than this shows its first verses, and how many more there are. */
const MAX_PASSAGE_VERSES = 12;

/**
 * Copies a verse or passage, in full, with its reference and link, e.g. to quote it in a
 * discussion. It shows on hover (on touch screens, always, dimmed), and not at all where the page
 * can't use the clipboard.
 */
function CopyQuoteButton({
  reference,
  quote,
}: {
  readonly reference: string;
  readonly quote: () => PassageQuote;
}) {
  const { t } = useLocalization();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setCopied(false);
    }, COPIED_FEEDBACK_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [copied]);
  if (!canCopy()) {
    return null;
  }
  return (
    <>
      <button
        type="button"
        className={styles.copy}
        data-copied={copied}
        aria-label={t('panel.copy')(reference)}
        title={t('panel.copy.title')}
        onClick={() => {
          void copyQuote(quote()).then(
            () => {
              setCopied(true);
            },
            () => undefined,
          );
        }}
      >
        {copied ? <CopiedIcon /> : <CopyIcon />}
      </button>
      <span className={styles.visuallyHidden} role="status">
        {copied ? t('panel.copied')(reference) : ''}
      </span>
    </>
  );
}

function neighbor(passage: Passage, step: -1 | 1, versification: Versification): Passage | null {
  const range = passageRange(passage, versification);
  const verse = step < 0 ? range.start - 1 : range.end + 1;
  if (!versification.isValidIndex(verse)) {
    return null;
  }
  return passage.kind === 'verse' ? versePassage(verse) : chapterPassageOf(verse, versification);
}

/**
 * The text a connection leads to, in full: a verse, or a passage's verses with their numbers (up
 * to `MAX_PASSAGE_VERSES`; a very long passage says how much more there is).
 */
function ConnectionText({
  translation,
  versification,
  start,
  end,
}: {
  readonly translation: Translation;
  readonly versification: Versification;
  readonly start: VerseIndex;
  readonly end: VerseIndex;
}) {
  const { t, books, n } = useLocalization();
  // The text is in the translation's language, which is not always the interface's: saying so
  // is what lets a screen reader pronounce it, and a right-to-left text lay itself out.
  const lang = translation.manifest.language;
  const dir = translation.manifest.direction;
  if (start === end) {
    return (
      <span className={styles.snippet} lang={lang} dir={dir}>
        {verseTextOrNote(translation, start, verseNotes(t))}
      </span>
    );
  }
  const first = versification.refAt(start);
  const last = Math.min(end, start + MAX_PASSAGE_VERSES - 1);
  const verses = Array.from({ length: last - start + 1 }, (_, offset) => start + offset);
  const more = end - last;
  return (
    <span className={styles.snippet} lang={lang} dir={dir}>
      {verses.map((verse) => {
        const ref = versification.refAt(verse);
        const mark =
          ref.book !== first.book
            ? formatVerseRef(ref, books)
            : ref.chapter !== first.chapter
              ? `${String(ref.chapter)}:${String(ref.verse)}`
              : String(ref.verse);
        return (
          <Fragment key={verse}>
            <sup className={styles.verseMark}>{mark}</sup>
            {verseTextOrNote(translation, verse, verseNotes(t))}{' '}
          </Fragment>
        );
      })}
      {more > 0 && (
        <span className={styles.moreVerses}>{t('panel.moreVerses')(n(more), more)}</span>
      )}
    </span>
  );
}

/**
 * Puts a connection's landing note into words: where in the passage this link meets it. The
 * note itself is data (see `landingNote`), so that the sentence can be built in the reader's
 * own language here rather than in the code that works out the connections.
 */
function describeLandingNote(
  note: LandingNote,
  versification: Versification,
  { t, books, n }: Localization,
): string {
  switch (note.kind) {
    case 'range':
      return t('note.toRange')(formatVerseIndexRange(versification, books, note.start, note.end));
    case 'from-verse':
      return t('note.fromVerse')(n(note.verse));
    case 'to-verse':
      return t('note.toVerse')(n(note.verse));
  }
}

/** The surer links first; among equals, canonical order. */
function byWeight(a: Connection, b: Connection): number {
  return b.link.votes - a.link.votes || a.otherStart - b.otherStart || a.here - b.here;
}

/**
 * The focused passage as a card: its own links drawn small at the top, the reference as a
 * headline with the text under it, then chips that choose what the list below holds — where it
 * points, what points at it, a chapter's verses, a verse's original words — with a spectrum of
 * the genres it reaches that narrows the list to one. Every link is a button that travels there,
 * so nothing depends on hover.
 */
export function PassageCard({
  data,
  passage,
  filter,
  actions,
  onSelect,
  onClose,
  onPreview,
  shareUrl,
}: PassageCardProps) {
  const { t, books, n, genreName } = useLocalization();
  const { versification, crossReferences, verseGenres } = data;
  const connections = useMemo(
    () =>
      collectConnections(
        crossReferences.index,
        passageRange(passage, versification),
        filter,
        verseGenres,
      ),
    [crossReferences.index, passage, versification, filter, verseGenres],
  );
  const range = passageRange(passage, versification);
  const book = versification.bookAt(range.start);
  const genre = getBookGenre(book.id);
  const previous = neighbor(passage, -1, versification);
  const next = neighbor(passage, 1, versification);
  const isVerse = passage.kind === 'verse';
  const reference = formatPassage(passage, versification, books);
  const ref = versification.refAt(range.start);
  const position = isVerse
    ? t('card.position')(n(ref.verse), n(versification.verseCountOf(book.id, ref.chapter) ?? 0))
    : t('card.position')(n(ref.chapter), n(versification.chapterCountOf(book.id)));
  const all = [...connections.outgoing, ...connections.incoming];

  return (
    <div className={styles.card}>
      <MiniArcs
        connections={all}
        here={range}
        verseCount={versification.verseCount}
        verseGenres={verseGenres}
        label={t('card.miniArcs')(reference)}
      />
      <header className={styles.header}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>
            <span
              className={styles.key}
              style={{ background: GENRE_COLORS[genre.id], color: GENRE_COLORS[genre.id] }}
            />
            {genreName(genre.id)}
            <span className={styles.position}>{position}</span>
          </p>
          <h2 className={styles.title}>{reference}</h2>
        </div>
        <div className={styles.nav}>
          <button
            type="button"
            className={styles.iconButton}
            disabled={!previous}
            aria-label={t(isVerse ? 'panel.previousVerse' : 'panel.previousChapter')}
            onClick={() => {
              if (previous) onSelect(previous);
            }}
          >
            <PreviousIcon />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            disabled={!next}
            aria-label={t(isVerse ? 'panel.nextVerse' : 'panel.nextChapter')}
            onClick={() => {
              if (next) onSelect(next);
            }}
          >
            <NextIcon />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={t('panel.close')}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
      </header>
      {/* Keyed by passage: following a link starts the new passage's card at the top, on its
          own first chip. */}
      <CardBody
        key={toPassageOsisId(passage, versification)}
        data={data}
        passage={passage}
        reference={reference}
        connections={connections}
        actions={actions}
        onSelect={onSelect}
        onPreview={onPreview}
        shareUrl={shareUrl}
      />
    </div>
  );
}

function CardBody({
  data,
  passage,
  reference,
  connections,
  actions,
  onSelect,
  onPreview,
  shareUrl,
}: {
  readonly data: VizData;
  readonly passage: Passage;
  readonly reference: string;
  readonly connections: {
    readonly outgoing: readonly Connection[];
    readonly incoming: readonly Connection[];
  };
  readonly actions: ReactNode;
  readonly onSelect: (passage: Passage) => void;
  readonly onPreview: ((connection: Connection | null) => void) | undefined;
  readonly shareUrl: (passage: Passage) => string;
}) {
  const localization = useLocalization();
  const { t, books, n, genreName } = localization;
  const { versification, translation, verseGenres } = data;
  const isVerse = passage.kind === 'verse';
  const range = passageRange(passage, versification);
  const [mode, setMode] = useState<Mode>(() =>
    !isVerse
      ? 'verses'
      : connections.outgoing.length === 0 && connections.incoming.length > 0
        ? 'in'
        : 'out',
  );
  const [genreFilter, setGenreFilter] = useState<number | null>(null);
  const [limit, setLimit] = useState(INITIAL_ITEMS);

  const direction =
    mode === 'in' ? connections.incoming : mode === 'out' ? connections.outgoing : null;
  // The spectrum: the genres the chosen direction reaches, in proportion.
  const counts = new Array<number>(GENRES.length).fill(0);
  for (const connection of direction ?? []) {
    const genre = elementAt(verseGenres, connection.otherStart);
    counts[genre] = (counts[genre] ?? 0) + 1;
  }
  const present = GENRES.filter((genre) => (counts[genre.ordinal] ?? 0) > 0);
  const listed = (direction ?? [])
    .filter(
      (connection) =>
        genreFilter === null || elementAt(verseGenres, connection.otherStart) === genreFilter,
    )
    .toSorted(byWeight);
  const visible = listed.slice(0, limit);

  const chips: readonly { readonly mode: Mode; readonly label: string }[] = [
    ...(isVerse
      ? []
      : [
          {
            mode: 'verses' as const,
            label: t('card.verses')(n(range.end - range.start + 1), range.end - range.start + 1),
          },
        ]),
    {
      mode: 'out',
      label: t('card.out')(n(connections.outgoing.length), connections.outgoing.length),
    },
    {
      mode: 'in',
      label: t('card.in')(n(connections.incoming.length), connections.incoming.length),
    },
    ...(isVerse ? [{ mode: 'words' as const, label: t('card.words') }] : []),
  ];

  return (
    <div className={styles.scroll}>
      {isVerse && (
        <div className={styles.quotable}>
          <p
            className={styles.text}
            lang={translation.manifest.language}
            dir={translation.manifest.direction}
          >
            {verseTextOrNote(translation, passage.verse, verseNotes(t))}
          </p>
          <CopyQuoteButton
            reference={reference}
            quote={() =>
              quotePassage({
                translation,
                versification,
                names: books,
                start: passage.verse,
                end: passage.verse,
                url: shareUrl(passage),
              })
            }
          />
        </div>
      )}
      {actions && <div className={styles.actions}>{actions}</div>}

      <div className={styles.chips} role="tablist" aria-label={t('card.chips')}>
        {chips.map((chip) => (
          <button
            key={chip.mode}
            type="button"
            role="tab"
            className={styles.chip}
            aria-selected={mode === chip.mode}
            onClick={() => {
              setMode(chip.mode);
              setGenreFilter(null);
              setLimit(INITIAL_ITEMS);
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {direction !== null && present.length > 0 && (
        <div className={styles.spectrum} role="group" aria-label={t('card.genres')}>
          {present.map((genre) => (
            <button
              key={genre.id}
              type="button"
              className={styles.band}
              style={{
                flexGrow: counts[genre.ordinal] ?? 0,
                background: elementAt(GENRE_HEX, genre.ordinal),
                color: elementAt(GENRE_HEX, genre.ordinal),
              }}
              aria-pressed={genreFilter === genre.ordinal}
              aria-label={t('card.genre')(genreName(genre.id), n(counts[genre.ordinal] ?? 0))}
              title={t('card.genre')(genreName(genre.id), n(counts[genre.ordinal] ?? 0))}
              onClick={() => {
                setGenreFilter((current) => (current === genre.ordinal ? null : genre.ordinal));
                setLimit(INITIAL_ITEMS);
              }}
            />
          ))}
        </div>
      )}

      {mode === 'verses' && (
        <ChapterVerses
          start={range.start}
          end={range.end}
          translation={translation}
          connections={[...connections.outgoing, ...connections.incoming]}
          onSelect={onSelect}
        />
      )}

      {direction !== null && (
        <div className={styles.list}>
          {listed.length === 0 && <p className={styles.muted}>{t('card.none')}</p>}
          {visible.map((connection) => {
            const note = landingNote(connection, versification, !isVerse);
            const other = formatVerseIndexRange(
              versification,
              books,
              connection.otherStart,
              connection.otherEnd,
            );
            const color = elementAt(GENRE_HEX, elementAt(verseGenres, connection.otherStart));
            const kind = linkKindId(connection.link.kind);
            return (
              <div
                key={`${String(connection.link.id)}-${connection.direction}`}
                className={styles.row}
                onPointerEnter={(event) => {
                  if (event.pointerType === 'mouse') onPreview?.(connection);
                }}
                onPointerLeave={() => {
                  onPreview?.(null);
                }}
              >
                <button
                  type="button"
                  className={styles.rowButton}
                  onClick={() => {
                    onSelect(versePassage(connection.otherStart));
                  }}
                  onFocus={() => {
                    onPreview?.(connection);
                  }}
                  onBlur={() => {
                    onPreview?.(null);
                  }}
                >
                  <span
                    className={styles.dot}
                    style={{ background: color, color }}
                    aria-hidden="true"
                  />
                  <span className={styles.rowMain}>
                    <span className={styles.rowHead}>
                      <strong className={styles.rowRef}>{other}</strong>
                      {note !== null && (
                        <span className={styles.note}>
                          {describeLandingNote(note, versification, localization)}
                        </span>
                      )}
                      <span className={styles.kind} data-kind={kind} title={t(`kind.${kind}.note`)}>
                        {t(`kind.${kind}`)}
                      </span>
                    </span>
                    <ConnectionText
                      translation={translation}
                      versification={versification}
                      start={connection.otherStart}
                      end={connection.otherEnd}
                    />
                  </span>
                </button>
                <CopyQuoteButton
                  reference={other}
                  quote={() =>
                    quotePassage({
                      translation,
                      versification,
                      names: books,
                      start: connection.otherStart,
                      end: connection.otherEnd,
                      url: shareUrl(versePassage(connection.otherStart)),
                    })
                  }
                />
              </div>
            );
          })}
          {listed.length > limit && (
            <button
              type="button"
              className={styles.more}
              onClick={() => {
                setLimit(listed.length);
              }}
            >
              {t('panel.showAll')(n(listed.length))}
              <ExpandIcon />
            </button>
          )}
        </div>
      )}

      {mode === 'words' && isVerse && (
        <OriginalWordsSection verse={passage.verse} data={data} onSelect={onSelect} />
      )}
    </div>
  );
}

/** A chapter's verses, each with how many links it has: a skyline of the chapter. */
function ChapterVerses({
  start,
  end,
  translation,
  connections,
  onSelect,
}: {
  readonly start: VerseIndex;
  readonly end: VerseIndex;
  readonly translation: Translation;
  readonly connections: readonly Connection[];
  readonly onSelect: (passage: Passage) => void;
}) {
  const { t, n } = useLocalization();
  const counts = new Map<VerseIndex, number>();
  for (const connection of connections) {
    counts.set(connection.here, (counts.get(connection.here) ?? 0) + 1);
  }
  const most = Math.max(1, ...counts.values());
  const verses = Array.from({ length: end - start + 1 }, (_, offset) => start + offset);
  return (
    <div className={styles.list}>
      {verses.map((verse, offset) => {
        const count = counts.get(verse) ?? 0;
        return (
          <button
            key={verse}
            type="button"
            className={styles.verseRow}
            onClick={() => {
              onSelect(versePassage(verse));
            }}
          >
            <span className={styles.verseNumber}>{offset + 1}</span>
            <span className={styles.snippet}>
              {verseTextOrNote(translation, verse, verseNotes(t))}
            </span>
            <span className={styles.countCell}>
              <span className={styles.count}>{n(count)}</span>
              <span
                className={styles.countBar}
                style={{ inlineSize: `${String(Math.round((count / most) * 100))}%` }}
                aria-hidden="true"
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
