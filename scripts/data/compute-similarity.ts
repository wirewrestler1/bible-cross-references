/**
 * Computes text-similarity links from every verse of the deuterocanon to the verses of the
 * whole canon, from the World English Bible, and writes them as a row file beside the curated
 * list:
 *
 *   node scripts/data/compute-similarity.ts [--min-score 0.3] [--per-verse 5] [--sample 50]
 *
 * Deterministic and offline: the one input is the pinned WEB archive, and the output is
 * committed as `data/computed/deuterocanon-similarity.tsv`, so the app's build never runs this.
 *
 * Method: every verse becomes a bag of stemmed words (lowercased, punctuation stripped, stop
 * words dropped, Porter-stemmed), weighted by TF-IDF over all 37,128 verses; proper nouns —
 * capitalised words not at the start of a sentence — are added as terms of their own, so two
 * verses that share a rare name are drawn together. For each deuterocanonical verse the cosine
 * against every other verse is taken through an inverted index, and the best few above a
 * threshold are kept, less any pair the curated list, OpenBible.info or the Swedish apparatus
 * already has. The weight written is `round(score × 10)`, so the app's threshold slider means
 * the same thing across kinds.
 *
 * A computed link says the words are alike, not that the passages are related; the app draws
 * these apart from the others for that reason.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { BOOKS, isDeuterocanonical, type BookId } from '../../src/core/bible/books.ts';
import { toOsisId, type VerseIndex } from '../../src/core/bible/verse-ref.ts';
import { CANONICAL_VERSIFICATION } from '../../src/core/bible/versification.ts';
import { importCuratedCrossReferences } from './importers/curated.ts';
import { importEbibleVerseLines } from './importers/ebible-vpl.ts';
import { importOpenBibleCrossReferences } from './importers/openbible.ts';
import { importSwe1917CrossReferences } from './importers/swe1917.ts';
import { COMPUTED_FILE, CURATED_FILE } from './datasets.ts';
import { extractZipTextEntry, readFileIfExists } from './lib/files.ts';
import { rawFilePath, REPO_ROOT } from './lib/paths.ts';
import { expectMember, findSource, readSources } from './lib/sources.ts';
import { stem } from './lib/porter-stemmer.ts';
import { STOP_WORDS } from './lib/stop-words.ts';

const { values: options } = parseArgs({
  options: {
    'min-score': { type: 'string', default: '0.3' },
    'per-verse': { type: 'string', default: '5' },
    sample: { type: 'string', default: '0' },
  },
});
const MIN_SCORE = Number(options['min-score']);
const PER_VERSE = Number(options['per-verse']);
const SAMPLE = Number(options.sample);

const sources = await readSources();
const versification = CANONICAL_VERSIFICATION;

async function readRaw(id: string): Promise<{ text: string; archive: Buffer }> {
  const source = findSource(sources, id);
  const archive = await readFileIfExists(rawFilePath(source.fileName));
  if (!archive) {
    throw new Error(`${source.fileName} is not in data/raw. Run \`npm run data:fetch\` first.`);
  }
  const text =
    source.member === undefined ? '' : extractZipTextEntry(archive, expectMember(source));
  return { text, archive };
}

const provenance = { url: '', sha256: '', retrievedAt: '2026-10-19' };
const web = importEbibleVerseLines((await readRaw('web')).text, 'web', {
  ...provenance,
  snapshotDate: null,
});

/** Links the other sources already have, as `from:target`, so the computed set adds to them. */
const known = new Set<string>();
for (const file of [
  importOpenBibleCrossReferences(
    extractZipTextEntry((await readRaw('openbible')).archive, 'cross_references.txt'),
    provenance,
  ),
  importSwe1917CrossReferences((await readRaw('swe1917')).archive, provenance),
  importCuratedCrossReferences(
    (await readFileIfExists(resolve(REPO_ROOT, CURATED_FILE)))?.toString('utf8') ?? '',
    provenance,
  ),
]) {
  for (let verse = 0; verse < versification.verseCount; verse += 1) {
    for (
      let id = file.links.offsets[verse] ?? 0;
      id < (file.links.offsets[verse + 1] ?? 0);
      id += 1
    ) {
      for (
        let target = file.links.targetStart[id] ?? 0;
        target <= (file.links.targetEnd[id] ?? -1);
        target += 1
      ) {
        known.add(`${String(verse)}:${String(target)}`);
      }
    }
  }
}

/** The terms of a verse: stemmed words, plus its proper nouns as terms of their own. */
function termsOf(text: string): string[] {
  const terms: string[] = [];
  // Sentence starts: the first word, and any word after a full stop, question or exclamation
  // mark (with any closing quote between), is capitalised for grammar rather than as a name.
  let sentenceStart = true;
  for (const raw of text.split(/\s+/)) {
    const word = raw.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
    if (word === '') {
      continue;
    }
    const lower = word.toLowerCase().replace(/[’']/g, '');
    const isName = !sentenceStart && /^\p{Lu}/u.test(word) && !STOP_WORDS.has(lower);
    sentenceStart = /[.!?]["”’]?$/.test(raw);
    if (STOP_WORDS.has(lower) || lower.length < 2) {
      continue;
    }
    terms.push(stem(lower));
    if (isName) {
      terms.push(`#${lower}`);
    }
  }
  return terms;
}

interface Vector {
  readonly terms: string[];
  readonly weights: Float64Array;
}

const verseTerms: string[][] = web.verses.map(termsOf);
const documentFrequency = new Map<string, number>();
for (const terms of verseTerms) {
  for (const term of new Set(terms)) {
    documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
  }
}
const verseCount = web.verses.length;
const idf = (term: string) => Math.log(verseCount / (1 + (documentFrequency.get(term) ?? 0)));

const vectors: Vector[] = verseTerms.map((terms) => {
  const counts = new Map<string, number>();
  for (const term of terms) {
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  const entries = [...counts]
    .map(([term, count]): [string, number] => [
      term,
      // A name counts double: two verses that share a rare name are about the same thing.
      (1 + Math.log(count)) * idf(term) * (term.startsWith('#') ? 2 : 1),
    ])
    .filter(([, weight]) => weight > 0);
  const norm = Math.sqrt(entries.reduce((total, [, weight]) => total + weight * weight, 0));
  return {
    terms: entries.map(([term]) => term),
    weights: Float64Array.from(entries.map(([, weight]) => weight / (norm || 1))),
  };
});

/** Inverted index: for each term, the verses holding it and their normalised weights. */
const postings = new Map<string, { verses: number[]; weights: number[] }>();
vectors.forEach((vector, verse) => {
  vector.terms.forEach((term, position) => {
    const list = postings.get(term) ?? { verses: [], weights: [] };
    list.verses.push(verse);
    list.weights.push(vector.weights[position] ?? 0);
    postings.set(term, list);
  });
});

interface Candidate {
  readonly from: VerseIndex;
  readonly to: VerseIndex;
  readonly score: number;
}

const rows: Candidate[] = [];
const scores = new Float64Array(verseCount);
const touched: number[] = [];
const perBook = new Map<BookId, number>();
const histogram = new Map<number, number>();

for (let from = 0; from < verseCount; from += 1) {
  const book = versification.bookAt(from).id;
  if (!isDeuterocanonical(book) || web.verses[from] === '') {
    continue;
  }
  const vector = vectors[from];
  if (!vector) {
    continue;
  }
  touched.length = 0;
  vector.terms.forEach((term, position) => {
    const list = postings.get(term);
    if (!list) {
      return;
    }
    const weight = vector.weights[position] ?? 0;
    list.verses.forEach((other, i) => {
      if (scores[other] === 0) {
        touched.push(other);
      }
      scores[other] = (scores[other] ?? 0) + weight * (list.weights[i] ?? 0);
    });
  });
  const best = touched
    .filter((other) => other !== from && (scores[other] ?? 0) >= MIN_SCORE)
    .filter((other) => !known.has(`${String(from)}:${String(other)}`))
    .map((other) => ({ from, to: other, score: scores[other] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.to - b.to)
    .slice(0, PER_VERSE);
  for (const candidate of best) {
    rows.push(candidate);
    perBook.set(book, (perBook.get(book) ?? 0) + 1);
    const bucket = Math.round(candidate.score * 10);
    histogram.set(bucket, (histogram.get(bucket) ?? 0) + 1);
  }
  for (const other of touched) {
    scores[other] = 0;
  }
}

rows.sort((a, b) => a.from - b.from || b.score - a.score || a.to - b.to);
const lines = rows.map(
  (row) =>
    `${toOsisId(versification.refAt(row.from))}\t${toOsisId(versification.refAt(row.to))}\t${String(Math.round(row.score * 10))}`,
);
writeFileSync(
  resolve(REPO_ROOT, COMPUTED_FILE),
  `From Verse\tTo Verse\tWeight\t# CC0 2026-10-19 computed by scripts/data/compute-similarity.ts (TF-IDF cosine, min ${String(MIN_SCORE)}, top ${String(PER_VERSE)} per verse)\n${lines.join('\n')}\n`,
);

console.log(`${String(rows.length)} links written to ${COMPUTED_FILE}`);
console.log('links per book:');
for (const book of BOOKS) {
  const count = perBook.get(book.id);
  if (count !== undefined) {
    console.log(`  ${book.id.padEnd(7)} ${String(count)}`);
  }
}
console.log('score histogram (×10):');
for (const bucket of [...histogram.keys()].sort((a, b) => a - b)) {
  console.log(`  ${String(bucket).padStart(2)} ${String(histogram.get(bucket))}`);
}
if (SAMPLE > 0) {
  // A fixed-seed shuffle, so the same sample comes back for the same data.
  let seed = 12345;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const picked = [...rows].sort(() => random() - 0.5).slice(0, SAMPLE);
  for (const row of picked) {
    const quote = (verse: number) => (web.verses[verse] ?? '').slice(0, 90);
    console.log(
      `\n${toOsisId(versification.refAt(row.from))} (${row.score.toFixed(2)}) ${quote(row.from)}\n  → ${toOsisId(versification.refAt(row.to))} ${quote(row.to)}`,
    );
  }
}
