/**
 * The Porter stemmer (M. F. Porter, "An algorithm for suffix stripping", 1980), as the
 * reference implementation defines it, so that `walked`, `walking` and `walks` are one term
 * and `generously` is `gener`. Used only by `compute-similarity.ts`, where the point is that two
 * verses using one word in two forms count as sharing it.
 */

const CONSONANT = '[^aeiou]';
const VOWEL = '[aeiouy]';
const C = `${CONSONANT}[^aeiouy]*`;
const V = `${VOWEL}[aeiou]*`;

const MGR0 = new RegExp(`^(${C})?${V}${C}`);
const MEQ1 = new RegExp(`^(${C})?${V}${C}(${V})?$`);
const MGR1 = new RegExp(`^(${C})?${V}${C}${V}${C}`);
const HAS_VOWEL = new RegExp(`^(${C})?${VOWEL}`);

const STEP_2: ReadonlyMap<string, string> = new Map([
  ['ational', 'ate'],
  ['tional', 'tion'],
  ['enci', 'ence'],
  ['anci', 'ance'],
  ['izer', 'ize'],
  ['bli', 'ble'],
  ['alli', 'al'],
  ['entli', 'ent'],
  ['eli', 'e'],
  ['ousli', 'ous'],
  ['ization', 'ize'],
  ['ation', 'ate'],
  ['ator', 'ate'],
  ['alism', 'al'],
  ['iveness', 'ive'],
  ['fulness', 'ful'],
  ['ousness', 'ous'],
  ['aliti', 'al'],
  ['iviti', 'ive'],
  ['biliti', 'ble'],
  ['logi', 'log'],
]);

const STEP_3: ReadonlyMap<string, string> = new Map([
  ['icate', 'ic'],
  ['ative', ''],
  ['alize', 'al'],
  ['iciti', 'ic'],
  ['ical', 'ic'],
  ['ful', ''],
  ['ness', ''],
]);

const STEP_2_PATTERN =
  /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;
const STEP_3_PATTERN = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
const STEP_4_PATTERN =
  /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;
const STEP_4_ION = /^(.+?)(s|t)(ion)$/;

export function stem(word: string): string {
  if (word.length < 3) {
    return word;
  }
  let w = word;
  if (w.startsWith('y')) {
    w = `Y${w.slice(1)}`;
  }

  // Step 1a: plurals.
  if (/^(.+?)(ss|i)es$/.test(w)) {
    w = w.replace(/^(.+?)(ss|i)es$/, '$1$2');
  } else if (/^(.+?)([^s])s$/.test(w)) {
    w = w.replace(/^(.+?)([^s])s$/, '$1$2');
  }

  // Step 1b: -ed and -ing.
  let match = /^(.+?)eed$/.exec(w);
  if (match) {
    if (MGR0.test(match[1] ?? '')) {
      w = w.slice(0, -1);
    }
  } else {
    match = /^(.+?)(ed|ing)$/.exec(w);
    if (match && HAS_VOWEL.test(match[1] ?? '')) {
      w = match[1] ?? '';
      if (/(at|bl|iz)$/.test(w)) {
        w = `${w}e`;
      } else if (/([^aeiouylsz])\1$/.test(w)) {
        w = w.slice(0, -1);
      } else if (new RegExp(`^${C}${VOWEL}[^aeiouwxy]$`).test(w)) {
        w = `${w}e`;
      }
    }
  }

  // Step 1c: y → i after a vowel.
  match = /^(.+?)y$/.exec(w);
  if (match && HAS_VOWEL.test(match[1] ?? '')) {
    w = `${match[1] ?? ''}i`;
  }

  // Step 2.
  match = STEP_2_PATTERN.exec(w);
  if (match && MGR0.test(match[1] ?? '')) {
    w = `${match[1] ?? ''}${STEP_2.get(match[2] ?? '') ?? ''}`;
  }

  // Step 3.
  match = STEP_3_PATTERN.exec(w);
  if (match && MGR0.test(match[1] ?? '')) {
    w = `${match[1] ?? ''}${STEP_3.get(match[2] ?? '') ?? ''}`;
  }

  // Step 4.
  match = STEP_4_PATTERN.exec(w);
  if (match) {
    if (MGR1.test(match[1] ?? '')) {
      w = match[1] ?? '';
    }
  } else {
    match = STEP_4_ION.exec(w);
    if (match && MGR1.test(`${match[1] ?? ''}${match[2] ?? ''}`)) {
      w = `${match[1] ?? ''}${match[2] ?? ''}`;
    }
  }

  // Step 5a: a final e.
  match = /^(.+?)e$/.exec(w);
  if (match) {
    const base = match[1] ?? '';
    if (
      MGR1.test(base) ||
      (MEQ1.test(base) && !new RegExp(`^${C}${VOWEL}[^aeiouwxy]$`).test(base))
    ) {
      w = base;
    }
  }

  // Step 5b: a doubled l.
  if (w.endsWith('ll') && MGR1.test(w)) {
    w = w.slice(0, -1);
  }

  if (w.startsWith('Y')) {
    w = `y${w.slice(1)}`;
  }
  return w;
}
