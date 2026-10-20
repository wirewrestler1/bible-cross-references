# Computed similarity links

`deuterocanon-similarity.tsv` is written by `scripts/data/compute-similarity.ts` and committed,
so the app's build never runs the script. Same shape as the curated list: a header with the
edition's date, then `From Verse<TAB>To Verse<TAB>Weight`, every source a verse of the
deuterocanon and every target a single verse anywhere in the canon.

Method: each verse of the World English Bible becomes a bag of Porter-stemmed words with the
stop words dropped, weighted by TF-IDF over all 37,128 verses, with its proper nouns (capitalised
words not at the start of a sentence) as extra terms counted double. For each deuterocanonical
verse the cosine against every other verse is taken, and the best five scoring at least 0.5 are
kept, less any pair OpenBible.info, the Swedish apparatus or the curated list already has. The
weight is the score times ten; 0.5 was chosen by reading samples, below which most pairs shared
one word and nothing else. Expect verse-by-verse parallels between Greek and Hebrew Daniel, the
refrains of the Song of the Three, and the prayers that reuse earlier prayers.

A computed link says the words are alike, not that the passages are related, and the app draws
these apart from the other kinds. To recompute after changing the method or the inputs:

```bash
node scripts/data/compute-similarity.ts
```

License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) — the output of a
script over a public-domain text.
