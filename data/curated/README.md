# Curated cross-references

`deuterocanon-cross-references.tsv` is the hand-compiled set of links into and out of the
deuterocanonical books, in the same shape as OpenBible.info's file: a header, then one link per
row as `From Verse<TAB>To Verse<TAB>Weight`, sources a single verse and targets a verse or an
inclusive range, all in OSIS ids and this app's verse numbering (the World English Bible's for
the deuterocanon). The date in the header is the edition's date; bump it when the list changes.

The weight is a confidence, not a vote: **10** a quotation or unmistakable allusion, **5** a
probable allusion recognised in the standard indexes, **2** a thematic parallel. The app's
default threshold keeps the first two.

What it covers: New Testament quotations and allusions to the deuterocanon (the Nestle-Aland
loci allegati and the public checklists derived from it, listed in `../SOURCES-RESEARCH.md`,
were used as a checklist; no annotation was copied from any edition); the deuterocanon's own
retellings and quotations of the Old Testament (Sirach's Praise of the Fathers figure by
figure, Wisdom's history of the Exodus, Baruch's prayer beside Daniel 9, the Letter of Jeremiah
beside Jeremiah 10, 1 Esdras beside Chronicles–Ezra–Nehemiah, the Song of the Three beside
Psalm 148, 1 Maccabees 2 and 4 Maccabees 18 beside the stories they recall); and the parallels
between the deuterocanonical books (4 Maccabees expanding 2 Maccabees 6–7, 1 and 2 Maccabees
side by side, Greek Esther beside Esther). Every address was read against the WEB text before
it was committed: Sirach is numbered as the WEB numbers it, which in chapters 30–36 is the
older numbering rather than the NRSV's.

`scripts/data/importers/curated.ts` refuses an unknown verse, a weight off the scale, a
duplicate row or a link to its own verse, so a mistake is corrected here rather than dropped
at build time.

License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), © 2026 Andrew Battaglia.
The MIT license of the repository's code does not apply to this file.
