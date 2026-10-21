# Open cross-reference sources for the deuterocanon: research notes

Date: 2026-10-19. Time-boxed survey (about 2 h) of openly licensed, machine-readable sources that carry
cross-references into or out of the deuterocanonical books (Tobit, Judith, Greek Esther, Wisdom, Sirach,
Baruch + Letter of Jeremiah, Greek Daniel additions, 1-4 Maccabees, 1 Esdras, Prayer of Manasseh, Psalm 151).
Adoptable = (1) redistributable with attribution (PD / CC0 / CC BY / CC BY-SA), (2) covers at least some
deuterocanonical books, (3) parseable (not scans). Bible text is already decided (WEB, eBible.org, PD) and
is out of scope here.

## Summary / bottom line

No complete, English-language, open compilation of deuterocanon cross-references exists; OpenBible.info,
TSK, STEPBible, Theographic, scrollmapper and the KJVA/DRC/Vulgate/LXX SWORD modules all stop at the 66 books
(or carry no reference apparatus inside the Apocrypha). The one real, adoptable find is a CrossWire module
that nobody on the candidate list pointed at: **Swe1917** (Swedish Bible 1917 + Apocrypha, public domain),
whose OSIS text carries ~11,800 `type="crossReference"` note targets, of which **~3,000 unique verse-level
pairs touch the deuterocanon** (about 1,380 deuterocanonical source verses in Tob, Jdt, Greek Esther, Wis,
Sir, Bar, PrAzar, Sus, Bel, 1-2 Macc, PrMan, plus 106 canonical verses pointing into the deuterocanon).
Cross-references are language-independent, so this is directly reusable with English text. Two further
public-domain French modules (FreVulgGlaire with Vigouroux's notes; FreCrampon 1923) carry scripture
citations embedded in commentary footnotes inside the deuterocanon (approx. 1,680 and 470 chapter-level
pairs touching the deuterocanon); they are usable as a secondary, lower-precision layer after parsing. For
NT -> deuterocanon allusions, no open dataset exists, but four public web checklists (Akin's NA27-derived
list of ~330 pairs, bombaxo's NA27+UBS4 merge, ScriptureCatholic's 74, CatholicStand's 27) are usable for
hand curation.

All downloads were made to the session scratch directory and treated as untrusted data; nothing was
executed from them. Counts below come from inflating the raw SWORD zText blocks with a small Python script
and grepping the OSIS.

## Candidate verdicts

### 1. CrossWire SWORD modules (https://crosswire.org/sword/modules/ ; raw zips at

`https://crosswire.org/ftpmirror/pub/sword/packages/rawzip/<Name>.zip`; all 428 `.conf` files swept via
`.../pub/sword/raw/mods.d.tar.gz`)

| Module                                                                                              | License (conf)                                                                             | Deuterocanon xref coverage (verified by grep)                                                                                                                                                                                                                                                                                                                                                   | Parseable                                                                                                                                                                      | Verdict                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| KJVA (KJV 1769 + Apocrypha)                                                                         | GPL / Crown text                                                                           | 6,960 `<note type="study">`, all in OT/NT; 0 notes/references inside the 15 Apocrypha books; 0 `crossReference` notes anywhere                                                                                                                                                                                                                                                                  | yes                                                                                                                                                                            | reject (no xrefs)                                                                                                                                                                                                                          |
| DRC (Douay-Rheims Challoner)                                                                        | Public Domain                                                                              | 0 notes, 0 references in the whole module (Challoner's annotations were not encoded)                                                                                                                                                                                                                                                                                                            | yes                                                                                                                                                                            | reject                                                                                                                                                                                                                                     |
| Vulgate (ccel.org text)                                                                             | Public Domain                                                                              | 7 notes, 6 `annotateRef` references (all Greek-Esther placement notes); nothing else                                                                                                                                                                                                                                                                                                            | yes                                                                                                                                                                            | reject                                                                                                                                                                                                                                     |
| VulgClementine / VulgConte / VulgHetzenauer / VulgSistine                                           | Public Domain                                                                              | 0 notes, 0 references                                                                                                                                                                                                                                                                                                                                                                           | yes                                                                                                                                                                            | reject                                                                                                                                                                                                                                     |
| LXX (Rahlfs, CCAT morph)                                                                            | Copyrighted; free non-commercial                                                           | 0 notes/references; license also fails (NC)                                                                                                                                                                                                                                                                                                                                                     | -                                                                                                                                                                              | reject                                                                                                                                                                                                                                     |
| AB (Apostles' Bible) / ABP (Apostolic Bible Polyglot)                                               | Copyrighted, distribution granted to CrossWire only                                        | 1 and 0 notes; no references                                                                                                                                                                                                                                                                                                                                                                    | -                                                                                                                                                                              | reject (license + no data)                                                                                                                                                                                                                 |
| DutSVVA (Statenvertaling + Apocrypha, 2021)                                                         | Public Domain                                                                              | 48,469 `<reference>` tags, **all in the 66 books**; the 15 Apocrypha blocks contain 0 notes/refs; exactly 1 reference into Maccabees (`MacHab.1.16`, from a Gen note)                                                                                                                                                                                                                           | yes                                                                                                                                                                            | reject (nothing inside deuterocanon)                                                                                                                                                                                                       |
| CPDV (Catholic Public Domain Version, v2.1)                                                         | Public Domain                                                                              | 4,374 `<reference osisRef>`; 4,283 are same-chapter note anchors (`annotateRef` = the verse the Conte/Challoner footnote belongs to), not cross-references                                                                                                                                                                                                                                      | yes                                                                                                                                                                            | reject (anchors only)                                                                                                                                                                                                                      |
| **Swe1917 (Swedish Bible 1917; Apocrypha added 2019, v2.0.1)**                                      | **Public Domain** (conf; 1917/1921 Swedish state translations; text from Projekt Runeberg) | **5,966 `<note type="crossReference">` with `osisRef` (11,760 targets). Deuterocanonical source verses with refs: Sir 558, Wis 211, 1Macc 184, 2Macc 149, Tob 82, Bar 65, Jdt 53, EsthGr 37, PrAzar 25, Sus 8, PrMan 7, Bel 5; 106 canonical verses point into the deuterocanon. Not covered: 3-4 Macc, 1-2 Esd, Ps 151, EpJer (Baruch has 6 chapters in this module, so EpJer may be Bar 6).** | yes: OSIS `osisRef` with standard book ids; source verse = chapter `osisID` + the `subType="x-origin"` verse number inside each note (the zText blocks have no `<verse>` tags) | **adopt** (primary). Provenance of the reference apparatus (1917 Bible's own parallel references vs. the EFS 1927 printing named in `TextSource`) is not stated in the conf; Runeberg says its notes/refs are incomplete for some chapters |
| FreVulgGlaire (Glaire's Vulgate tr., notes by Vigouroux; +PrMan, 1-2 Esd, Ps 151, EpLao; v3.0 2026) | Public Domain (conf); transcription from fr.wikisource                                     | 12,174 `<reference osisRef>` inside `<note>` commentary; 1,418 located in deuterocanonical chapters (Sir 472, 1Macc 245, Wis 224, 2Macc 174, 2Esd 137, Bar 66, Tob 58, Jdt 42) and 821 targeting the deuterocanon; ~1,680 unique chapter-level pairs                                                                                                                                            | yes, but references are citations inside prose notes; note text starts with "Sir. 3,1 :" so verse can be recovered                                                             | adopt as secondary layer (commentary citations, not a parallel-passage apparatus)                                                                                                                                                          |
| FreCrampon (Bible Crampon 1923, v3.4)                                                               | Public Domain (conf); transcription from fr.wikisource                                     | 4,989 `<reference osisRef>` in notes; 790 in deuterocanonical chapters (Bar 377, Wis 130, Sir 122, 1Macc 60, 2Macc 59, Tob 27, Jdt 15), 173 targeting the deuterocanon; ~470 chapter-level pairs                                                                                                                                                                                                | yes (same caveat: notes begin with verse number "12.")                                                                                                                         | adopt as secondary layer                                                                                                                                                                                                                   |
| GerMenge (Menge-Bibel 1939 + Apocrypha)                                                             | Public Domain in Germany (author d. 1939); US status uncertain (possible URAA restoration) | 1,049 refs; only 30 located in deuterocanon (1Macc 17, Jdt 7, Sir 3, 2Macc 3), 15 targeting it                                                                                                                                                                                                                                                                                                  | yes                                                                                                                                                                            | reject (too few; US license doubt)                                                                                                                                                                                                         |
| FreLXXGiguet (French LXX 1872)                                                                      | Public Domain                                                                              | 419 refs, 13 in deuterocanon                                                                                                                                                                                                                                                                                                                                                                    | yes                                                                                                                                                                            | reject (too few)                                                                                                                                                                                                                           |
| SpaPlatense (Straubinger)                                                                           | Public Domain                                                                              | 13,094 `annotateRef` references but **none carry `osisRef`** (text like "7." / "1 ss."); citations such as "Véase Eclesiástico 4, 1" are free text inside notes                                                                                                                                                                                                                                 | poor                                                                                                                                                                           | reject (would need NLP parsing)                                                                                                                                                                                                            |
| NlCanisius1939, FinBiblia, FinPR, Wycliffe, GerTextbibel, DutSVV                                    | PD / CC BY-SA                                                                              | 0-55 refs total, none in deuterocanon                                                                                                                                                                                                                                                                                                                                                           | -                                                                                                                                                                              | reject                                                                                                                                                                                                                                     |
| TSK (CrossWire commentary module, ThML)                                                             | Public Domain                                                                              | 0 `<reference>` tags in the zCom text; KJV versification (66 books); mentions of "Tobit/Ecclesiasticus/Maccabees" as references: none (only "Manasseh", "wisdom" as words)                                                                                                                                                                                                                      | yes                                                                                                                                                                            | reject (66 books only; confirms the premise)                                                                                                                                                                                               |

Other `.conf` hits with deuterocanon-capable versification plus `OSISScripref` were all either copyrighted
(bela, burcbcm, finrk, hunruf, hunuj, ktuvb, linvb, porcap, russynodallio, sloojacano, vielccmn, czeb21) or
had no references inside the Apocrypha.

### 2. KJV 1611 marginal cross-references for the Apocrypha

- Literatura Bautista "Exhaustive listing of the marginal notes of the 1611 edition"
  (https://en.literaturabautista.com/exhaustive-listing-marginal-notes-1611-edition-king-james-bible):
  states "We did not include the cross-references from the margins" and "The notes of the Apocrypha were
  also not included." Confirmed. Reject.
- Wikisource "Bible (King James Version, 1611)" (https://en.wikisource.org/wiki/Bible_(King_James_Version,_1611)):
  marginal notes are preserved in the transcription (CC BY-SA for the transcription; text PD in the US), but
  of the Apocrypha only "The rest of Esther" exists; Tobit, Judith, Wisdom, Ecclesiasticus, 1-2 Maccabees are
  red links. Reject (not transcribed).
- kingjamesbibleonline.org 1611 pages: could not be fetched (Cloudflare challenge, HTTP 403); site is
  proprietary in any case. Not verified. Reject.
- Secondary counts only: Scrivener, _The Authorized Edition of the English Bible (1611)_ (1884, PD; scans
  on archive.org: `authorizedbible00scriuoft`, `authorizededitio00scri`) counts 1,018 marginal notes in the
  Apocrypha and ~113 margin references from OT/NT into the Apocrypha (figure repeated in a 2008
  online-literature.com forum thread, which could not be fetched: 403). No machine-readable list found.
  Only route: OCR/hand-transcribe from a 1611 facsimile. Reject for now.

### 3. Zefania XML (SourceForge zefania-sharp)

- Folder `Bibles/GER/Lutherbibel/Luther 1912 - mit Apokryphen/` contains one file,
  `SF_2006-12-20_GER_LUTH1912AP_(LUTHER 1912 - MIT APOKRYPHEN).zip` (1.6 MB, 2014-04-23). Every download
  URL (sourceforge.net/.../download, downloads.sourceforge.net, master/phoenixnap/cfhcable mirrors) returned
  either a 2-byte "no" or a Cloudflare "Just a moment" page to curl, so the file could not be inspected.
  Elberfelder, Schlachter, Menge folders exist but none is labelled "mit Apokryphen". Zefania files carry no
  license statement in the listing; the Luther 1912 text is PD but the origin of any `<XREF>` data is
  undocumented. Verdict: **unverified**; worth one manual browser download later to grep `<XREF` inside
  `bnumber >= 67`. (seven1m/open-bibles on GitHub has a `deu-luther1912.osis.xml` but it is not described as
  including the Apocrypha.)

### 4. OpenBible.info

- `data/raw/openbible-cross-references.zip` -> `cross_references.txt` (CC BY, 2026-09-21 header). Book ids
  present (from and to columns): exactly the 66 canonical books; **zero** Tob/Jdt/Wis/Sir/Bar/Macc/Esd ids.
  Confirmed.
- https://www.openbible.info/labs/cross-references/ : ~340k refs, CC BY 4.0, sourced mostly from TSK; no
  mention of Apocrypha. Other labs datasets (Topical Bible, Geocoding, Twitter search) do not carry
  deuterocanon references. Reject for deuterocanon.

### 5. Nestle-Aland "Loci citati vel allegati" and derived checklists

NA27/NA28 appendix text is copyrighted (Deutsche Bibelgesellschaft) and not adoptable as data. Public
secondary lists are usable as checklists for hand curation; see the section at the end.

### 6. STEPBible-Data, OpenScriptures, scrollmapper/bible_databases, Theographic

- STEPBible-Data (https://github.com/STEPBible/STEPBible-Data): CC BY 4.0. Datasets are lexicons, tagged
  OT/NT, proper names (TIPNR), versification (TVTMS). No cross-reference dataset. TBESG lexicon and TVTMS use
  Apocrypha book codes, but no verse-to-verse links. Reject (nothing to adopt; the versification table may
  help later with Greek-Esther/Daniel numbering).
- OpenScriptures: aspirational "linked data" project; no cross-reference dataset found. Reject.
- scrollmapper/bible_databases (MIT for the repo): its `cross_references` table is the OpenBible.info data
  (66 books). Reject.
- Theographic Bible Metadata (robertrouse, CC BY-SA 4.0): 66 books, 31,102 verses; links verses to people,
  places, events, not verse-to-verse. Reject.

### 7. Wikidata / Wikisource

- Wikisource: see item 2 (KJV 1611 Apocrypha not transcribed). fr.wikisource hosts the Crampon 1923 and
  Glaire/Vigouroux transcriptions that CrossWire used (item 1), under CC BY-SA for the transcription layer.
- Wikidata: has items for books (e.g. Q201410 "deuterocanonical books") but no verse-level cross-reference
  property was found; not examined in depth. Reject.
- Brenton with margins: no transcription with references found. Not verified further.

### 8. Other

- WEB itself (eBible.org `eng-web_usfm.zip`, PD): carries a small `\x` apparatus. Deuterocanon: 1 Esdras 19,
  Tobit 1, Wisdom 1, Sirach 1, 2 Esdras 1 (23 entries, e.g. `1Es 1:1 -> 2 Kings 23:21; 2 Chronicles 35:1`).
  Free to use since the text is adopted anyway; trivial coverage.
- Douay-Rheims Challoner, Project Gutenberg #1581 (PD): Challoner's notes are present as prose; across the
  whole Bible only ~124 note lines contain a citation pattern (e.g. "Gen. 49.5", "Num. 14."), a handful in
  Tobias/Judith/Machabees. Reject (not an apparatus).
- CPDV website (sacredbible.org): no cross-references; module version has note anchors only (item 1).
- Haydock Catholic Bible Commentary (1859, PD): transcriptions exist only as `.doc` files on ccbiblestudy.org
  (Tobit, Judith, Sirach, Baruch, 1-2 Maccabees) with no provenance or license statement; haydock1859.tripod.com
  is dead. Citations are embedded in prose. Reject for now.
- Cambridge Bible for Schools and Colleges (Wisdom 1909, 1 Macc 1897, Ecclesiasticus 1912) and the Speaker's
  Commentary on the Apocrypha (Wace, 1888; archive.org `holybibleaccordi01cook` / `holybibleaccordi02wace`):
  PD but scans/OCR only (PTSEM copies quote 16-18 % OCR error rate). Reject (not parseable).
- Bible Hub, Blue Letter Bible, NET Bible notes, Orthodox Study Bible, NABRE/NJB references, Logos
  "Uncanonical and Apocryphal Scriptures" (6,558 refs): proprietary. Reject.
- Backups for the TEXT (out of scope, noted only): CPDV (PD), Brenton 1851 (PD), Douay-Rheims Challoner (PD,
  PG #1581 / CrossWire DRC), KJV 1611 Apocrypha (PD in the US; UVA etext / CrossWire KJVA).

## Checklists for hand curation (NT -> deuterocanon allusions)

| List                                                                                          | URL                                                                                           | Size / basis                                                                                                                                                                                              | Notes                                                                 |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| James Akin, "Deuterocanonical References in the New Testament"                                | https://jimmyakin.com/?p=8996 (older copy: http://www.cin.org/users/james/files/deutero3.htm) | ~330 pairs, transcribed from NA27 pp. 800-804, in NT order with a second index by deuterocanonical book                                                                                                   | Author calls them "proposed" references; good master checklist        |
| bombaxo / biblicalia, "New Testament Allusions to Apocrypha and Pseudepigrapha"               | https://www.bombaxo.com/new-testament-allusions-to-apocrypha-and-pseudepigrapha/              | NA27 Appendix IV merged with UBS4 "Index of Allusions"; roughly 400 entries incl. pseudepigrapha (Sir ~101, Wis ~92, 1-4 Macc, Tob, Jdt, Bar, EpJer, Sus, Bel, 1 Esd, 2 Esd); each entry quotes NRSV text | Best for judging strength of each allusion; page is long (246k chars) |
| ScriptureCatholic, "Deuterocanonical books in the New Testament"                              | http://www.scripturecatholic.com/deuterocanonical-books-new-testament/                        | 74 pairs grouped by NT book, with one-line rationale                                                                                                                                                      | Site is "All rights reserved"; use pairs as facts only                |
| Rory Fox, CatholicStand, "Did the Deuterocanonical Books Influence the New Testament?" (2023) | https://catholicstand.com/did-the-deuterocanonical-books-influence-the-new-testament/         | 27-28 pairs (Tob 4, Jdt 3, Macc 2, Wis 7, Sir 7, Bar 4) with parallel wording                                                                                                                             | Short, conservative list                                              |

Wikipedia "Deuterocanonical books" was checked: it has no NT-allusion table (only Heb 11:35 -> 2 Macc and
Jude 14-15 -> 1 Enoch in prose). The catholic.com Q&A pages give only a few examples (Sir 28:2 / Mt 6:14-15;
Wis 7:26 / Heb 1:3; Wis 9:13 / Rom 11:34).

## Recommendation

1. Adopt **CrossWire Swe1917** as the primary deuterocanon cross-reference source. Download
   `rawzip/Swe1917.zip`, inflate the zText blocks, walk `<chapter osisID>` + `<note type="crossReference">`
   (verse from the `x-origin` reference, targets from `osisRef`), and map NRSVA-style ids (EsthGr, PrAzar, Sus,
   Bel, PrMan) onto the WEB's book set. Expect ~3,000 pairs touching the deuterocanon plus ~8,800 pairs in the
   66 books that can be merged (deduplicated) with OpenBible.info. Record license as "Public Domain (CrossWire
   Swe1917 v2.0.1, Swedish Bible 1917/Apocrypha 1921, Projekt Runeberg)". Open question to note in
   sources.json: the apparatus's exact print origin is not documented in the module conf.
2. Optionally add a second, lower-confidence layer from **FreVulgGlaire** (Vigouroux notes) and
   **FreCrampon** commentary citations, tagged as "commentary citation" rather than "parallel passage";
   these add 1-2 Esdras and Prayer of Manasseh coverage that Swe1917 lacks.
3. Hand-curate NT -> deuterocanon allusions from the four checklists above (start with Akin's ~330, grade
   with bombaxo's NRSV parallels), and store them as a separate, attributed dataset with a "hand-curated
   from NA27-derived public lists" note.
4. Fold in the WEB's own 23 deuterocanon `\x` entries for free.
5. Revisit later: the Zefania Luther 1912 "mit Apokryphen" file (one manual download to check for `<XREF>`
   inside the Apocrypha), and a transcription of the 1611 Apocrypha margins if a volunteer source appears.

## Follow-up, 2026-10-21

A second pass, asked for because the deuterocanon still had far fewer links than the 66 books.
Verdicts:

- **United Bible Societies Parallel Passages** (CC BY-SA 4.0, GitHub `ubsicap/ubs-open-license`):
  downloaded and grepped; no deuterocanonical book codes at all. Reject.
- **NuBerea intertextuality** (Hugging Face, CC BY 4.0 tables, gated): its card names a
  "Deuterocanonical" citation arm of ~2,100 rows without naming the books. Not fetched (sign-up);
  worth a look by hand.
- **Synodal Bible parallel passages (Russian, 19th century, public domain apparatus).** No
  machine-readable copy found. azbyka.ru renders them per verse through a websocket, not in the
  page; bible-center.ru renders them inline (e.g. Sir 24:3 → Gen 1:2, Prov 2:6, Wis 7:25,
  Heb 1:3) beside the copyrighted Brussels Bible commentary, and says nothing about the
  apparatus' provenance or its reuse. Russian Wikisource's Synodal text has no parallels. Not
  scraped; a request for the data and its provenance has been drafted for both sites.
- **Charles, _Apocrypha and Pseudepigrapha_ (1913):** archive.org and HathiTrust were unreachable
  from the build machine; English Wikisource has transcribed only the front matter of volume I;
  CCEL's landing page lists no Apocrypha sections. Deferred until a plain-text copy can be had.
- **Lopukhin's Explanatory Bible (azbyka.ru, public domain):** static HTML, but the notes on
  Sirach 24 carry two references in a chapter; too sparse to be worth a parser yet.
- **Haydock's Catholic Bible Commentary (1859, public domain), haydockcommentary.com:** one page
  per chapter, Douay text and "Ver. N." notes with references in a regular form. **Adopted** for
  Wisdom, Baruch and 1–2 Maccabees (Vulgate numbering agrees with the Greek there), 440 links;
  see `data/haydock/README.md`. Tobit, Judith and Sirach are left out (different text or
  numbering); 2 Maccabees 6 has no page on the site; fifteen chapters were skipped for a
  one-verse disagreement in their counts and could be mapped by hand later.
- **UBS/DBG Nestle-Aland index, Orthodox Study Bible, NABRE, Jerusalem Bible:** copyrighted;
  permission letters drafted (not sent from here).
