import { useId, useMemo, useState, type KeyboardEvent, type SubmitEvent } from 'react';
import { passageFromReference, type Passage } from '../../../core/bible/passage.ts';
import { parseReference } from '../../../core/bible/reference-parse.ts';
import {
  suggestReferences,
  type ReferenceSuggestion,
} from '../../../core/bible/reference-suggest.ts';
import type { Versification } from '../../../core/bible/versification.ts';
import { describeReferenceError } from '../../../i18n/describe-reference-error.ts';
import { useLocalization } from '../../../i18n/use-locale.tsx';
import { SearchIcon } from '../../../shared/ui/icons.tsx';
import styles from './controls.module.css';
import suggestionStyles from './ReferenceSearch.module.css';

interface ReferenceSearchProps {
  readonly versification: Versification;
  readonly onSelect: (passage: Passage) => void;
}

/** One thing the list offers: a suggestion, or the whole chapter once its verses are listed. */
type Offer = ReferenceSuggestion | { readonly kind: 'whole-chapter'; readonly completion: string };

/**
 * "Go to" box: accepts references such as `John 3:16`, `jn 3 16`, `Ps 23` or `Gen.1.1`, and
 * offers what the typing could become as it goes — books, then the book's chapters, then the
 * chapter's verses — so a reader can tap their way there.
 */
export function ReferenceSearch({ versification, onSelect }: ReferenceSearchProps) {
  const localization = useLocalization();
  const { t, books } = localization;
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** Whether the list is shown; typing opens it, choosing a verse or Escape closes it. */
  const [listOpen, setListOpen] = useState(false);
  /** The offer the arrow keys have reached, or none. */
  const [active, setActive] = useState(-1);
  const errorId = useId();
  const listId = useId();

  const suggestions = useMemo(
    () => suggestReferences(value, versification, books),
    [value, versification, books],
  );
  const offers = useMemo((): readonly Offer[] => {
    if (!suggestions) {
      return [];
    }
    if (suggestions.stage === 'verse') {
      // The chapter itself comes first: a reader who stopped at "Genesis 2:" may want all of it.
      const [first] = suggestions.items;
      const chapterText = first?.completion.replace(/:\d+$/u, '') ?? '';
      return [{ kind: 'whole-chapter', completion: chapterText }, ...suggestions.items];
    }
    return suggestions.items;
  }, [suggestions]);
  const showList = listOpen && offers.length > 0;

  /** Reads a reference and goes there, or says why it cannot. */
  const go = (typed: string) => {
    const result = parseReference(typed, versification, books);
    if (!result.ok) {
      setError(describeReferenceError(result.error, localization));
      return;
    }
    setError(null);
    setValue('');
    setListOpen(false);
    setActive(-1);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur(); // Closes the on-screen keyboard on phones.
    }
    onSelect(passageFromReference(result.reference, versification));
  };

  const choose = (offer: Offer) => {
    if (offer.kind === 'verse' || offer.kind === 'whole-chapter') {
      go(offer.completion);
      return;
    }
    // A book or a chapter: the box moves on to the next part, and the list with it.
    setValue(offer.completion);
    setError(null);
    setActive(-1);
    setListOpen(true);
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const chosen = active >= 0 ? offers[active] : undefined;
    if (chosen) {
      choose(chosen);
      return;
    }
    go(value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (offers.length === 0) {
        return;
      }
      event.preventDefault();
      setListOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      // Counting "none" as a position: down from the last offer is none again, and up from the
      // first is none, so Enter then submits the text as typed.
      const positions = offers.length + 1;
      setActive((current) => ((current + 1 + step + positions) % positions) - 1);
      return;
    }
    if (event.key === 'Escape' && showList) {
      event.preventDefault();
      event.stopPropagation(); // The list goes first; a second Escape closes whatever holds the box.
      setListOpen(false);
      setActive(-1);
    }
  };

  const offerId = (index: number) => `${listId}-${String(index)}`;
  const stage = suggestions?.stage ?? 'book';
  return (
    <form
      role="search"
      className={`${styles.search} ${suggestionStyles.form}`}
      onSubmit={handleSubmit}
      onBlur={(event) => {
        // Focus leaving the box and its list closes the list; a tap on an offer keeps the focus
        // in the box (see `onPointerDown` below), so it does not count.
        if (!(
          event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)
        )) {
          setListOpen(false);
          setActive(-1);
        }
      }}
    >
      <div className={suggestionStyles.box}>
        <SearchIcon className={styles.searchIcon} />
        <input
          name="reference"
          type="search"
          className={styles.input}
          placeholder={t('search.placeholder')}
          aria-label={t('search.label')}
          aria-invalid={error !== null}
          aria-describedby={error === null ? undefined : errorId}
          aria-autocomplete="list"
          aria-controls={showList ? listId : undefined}
          aria-activedescendant={showList && active >= 0 ? offerId(active) : undefined}
          autoComplete="off"
          // The longest real reference is ~25 characters; this only bounds what a paste can hand
          // the parser, whose book pattern is quadratic in the length of what it is given.
          maxLength={120}
          enterKeyHint="go"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
            setActive(-1);
            setListOpen(true);
          }}
          onFocus={() => {
            setListOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>
      {error !== null && (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {showList && (
        <div
          id={listId}
          role="listbox"
          aria-label={t('search.suggestions')}
          className={suggestionStyles.list}
          data-stage={stage}
        >
          {offers.map((offer, index) => (
            <button
              key={offer.completion}
              id={offerId(index)}
              type="button"
              role="option"
              aria-selected={index === active}
              className={offer.kind === 'book' ? suggestionStyles.row : suggestionStyles.chip}
              data-kind={offer.kind}
              onPointerDown={(event) => {
                event.preventDefault(); // The box keeps the focus, and the keyboard stays up.
              }}
              onClick={() => {
                choose(offer);
              }}
            >
              {offer.kind === 'whole-chapter' ? t('search.wholeChapter') : offer.label}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
