import { useEffect, useState } from 'react';
import { formatPassage, versePassage, type Passage } from '../../../core/bible/passage.ts';
import type { VerseIndex } from '../../../core/bible/verse-ref.ts';
import { verseTextOrNote } from '../../../translations/verse-text.ts';
import type { OriginalWordsDataset } from '../../../words/load-original-words.ts';
import { originalWordsIfLoaded, originalWordsLoader, resetOriginalWords } from '../viz-data.ts';
import { useLocalization } from '../../../i18n/use-locale.tsx';
import { verseNotes } from '../verse-notes.ts';
import type { VizData } from '../viz-data.ts';
import styles from './PassageCard.module.css';

/** How many of a verse's words to show before the rest are a tap away. */
const INITIAL_WORDS = 8;

/**
 * The words are the one part of the app that is not downloaded until it is wanted: a reader who
 * never opens a verse's words never pays for it. `null` until it arrives; a failed download
 * leaves the card exactly as it was.
 */
function useOriginalWords(): OriginalWordsDataset | null {
  const [words, setWords] = useState<OriginalWordsDataset | null>(originalWordsIfLoaded);
  useEffect(() => {
    if (words) {
      return undefined;
    }
    let current = true;
    originalWordsLoader.load().then(
      (loaded) => {
        if (current) {
          setWords(loaded);
        }
      },
      () => {
        // A download that failed should not settle the question for the whole visit: forgetting
        // it means the next verse the reader opens asks again.
        resetOriginalWords();
      },
    );
    return () => {
      current = false;
    };
  }, [words]);
  return words;
}

/**
 * The dictionary words of a verse as pills — rarest first, since a word used in three places
 * says something about those places and one used in a hundred says much less — and, under
 * them, every verse that uses the open one. A different kind of link from a cross-reference:
 * somebody's judgement that two passages belong together, against the plain fact that they
 * share a word.
 */
export function OriginalWordsSection({
  verse,
  data,
  onSelect,
}: {
  readonly verse: VerseIndex;
  readonly data: VizData;
  readonly onSelect: (passage: Passage) => void;
}) {
  const { t, books, n } = useLocalization();
  const words = useOriginalWords();
  const [expanded, setExpanded] = useState(false);
  const [openWord, setOpenWord] = useState<number | null>(null);
  const { versification, translation } = data;

  if (!words) {
    return null;
  }
  const inVerse = words.index.wordsOf(verse);
  if (inVerse.length === 0) {
    return null;
  }
  const hebrew = versification.bookAt(verse).testament === 'OT';
  const language = t(hebrew ? 'language.hebrew' : 'language.greek');
  const visible = expanded ? inVerse : inVerse.slice(0, INITIAL_WORDS);
  const open = inVerse.find((word) => word.index === openWord);

  return (
    <div className={styles.words} aria-label={t('words.heading')(language)}>
      <div className={styles.pills}>
        {visible.map((word) => (
          <button
            key={word.strongs}
            type="button"
            className={styles.pill}
            aria-expanded={openWord === word.index}
            onClick={() => {
              setOpenWord(openWord === word.index ? null : word.index);
            }}
          >
            <span className={styles.pillHead}>
              <strong lang={hebrew ? 'he' : 'el'}>{word.lemma}</strong>
              <span className={styles.wordSound}>{word.transliteration}</span>
              <span className={styles.count}>{n(word.verseCount)}</span>
            </span>
            <span className={styles.gloss}>{word.gloss}</span>
          </button>
        ))}
        {!expanded && inVerse.length > INITIAL_WORDS && (
          <button
            type="button"
            className={styles.more}
            onClick={() => {
              setExpanded(true);
            }}
          >
            {t('words.showMore')(n(inVerse.length - INITIAL_WORDS))}
          </button>
        )}
      </div>
      {open !== undefined && (
        <div className={styles.wordVerses}>
          {words.index.versesOf(open.index).map((other) => (
            <button
              key={other}
              type="button"
              className={`${styles.rowButton} ${styles.wordVerse}`}
              aria-current={other === verse ? 'true' : undefined}
              onClick={() => {
                onSelect(versePassage(other));
              }}
            >
              <span className={styles.rowMain}>
                <span className={styles.rowHead}>
                  <strong className={styles.rowRef}>
                    {formatPassage(versePassage(other), versification, books)}
                  </strong>
                </span>
                <span className={styles.snippet}>
                  {verseTextOrNote(translation, other, verseNotes(t))}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      {/* The credit is a condition of using the data, so it stays with the words. */}
      <p className={styles.credit}>
        {t('words.creditLabel')}{' '}
        <a href={words.manifest.homepage} target="_blank" rel="noreferrer">
          STEP Bible
        </a>{' '}
        (
        <a href={words.manifest.license.url} target="_blank" rel="noreferrer">
          {words.manifest.license.name}
        </a>
        ){t('words.credit')(n(words.maxVerses))}
      </p>
    </div>
  );
}
