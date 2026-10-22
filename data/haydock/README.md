# Haydock's commentary references

`deuterocanon-cross-references.tsv` is written by `scripts/data/haydock-notes.ts` and committed,
so the app's build never touches the network. Same shape as the curated list: a header with the
date it was read, then `From Verse<TAB>To Verse<TAB>Weight`, every source a verse of Wisdom,
Baruch, 1 Maccabees or 2 Maccabees, every target a verse or a range anywhere in the canon, every
weight 4.

Source: the "Ver. N." notes of _Haydock's Catholic Bible Commentary_ (George Leo Haydock, 1859
edition; public domain), as published chapter by chapter at <https://haydockcommentary.com/>.
Each note names the passages it compares in the Douay-Rheims' words and numbering ("Proverbs
viii. 22.", "3 Kings ix. 10.", "chap. vi. 25.", "ver. 16"); the script reads those and places
them in this app's numbering: Douay book names to this app's ids, the Psalms from the Vulgate's
numbering to the Hebrew with their titles allowed for, the Greek parts of Daniel to Greek Daniel.
References into Tobit, Judith and Sirach are dropped (the Vulgate's text or numbering differs
from the Greek), as are references into the chapters where the Vulgate's verse numbering is
known to differ from the English Bible's. Fifteen chapters of the four source books are
numbered a verse or two apart from the Greek — the Douay splits one of its verses, merges two,
or adds a connective line of its own, and prints the Letter of Jeremiah's opening line
unnumbered — and were aligned by hand against the World English Bible, verse against verse
(`DOUAY_RENUMBERING` in `scripts/data/importers/haydock-notes.ts`); any other chapter whose Douay
verse count differs from the app's would be skipped whole. The script reports what it left out.

A note's reference says the commentator thought of the passage beside the verse — a parallel, a
quotation, sometimes only an illustration — which is why these weigh 4, the app's default floor,
and are drawn a little dimmer than the Treasury's. To refresh:

```bash
node scripts/data/haydock-notes.ts
```

License: the references are facts drawn from a public-domain work; the file is offered under
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
