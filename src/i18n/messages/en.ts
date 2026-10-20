import type { Emphasized } from './types.ts';

/**
 * Every word the interface says, in English.
 *
 * This file is the source of truth: `Messages` is derived from it, so a locale that misspells a
 * key, or gives a value the wrong shape, fails to compile. Values that take arguments are
 * functions rather than strings with placeholders — the compiler then checks the arguments too,
 * and each language can put the words in its own order and use as many plural forms as it needs.
 */
export const en = {
  'app.name': 'Bible Cross-References: Orthodox Canon',
  // Shown instead of the full name where the header has no room for it.
  'app.name.short': 'Cross-References',

  'view.arcs': 'Arcs',
  'view.arcs.short': 'Arcs',
  'view.arcs.open': 'See it in the arcs',
  'view.threads': 'Threads',
  'view.threads.short': 'Threads',
  'view.threads.open': 'Read the chapter',
  'view.switch': 'Visualizations',

  'search.label': 'Go to a Bible reference',
  'search.placeholder': 'Find a verse…  Sirach 24, John 3:16',
  /** The bar's button for the search, on phones. */
  'search.short': 'Search',
  /** The list under the box of what the typing could become. */
  'search.suggestions': 'Suggestions',
  /** The first offer once a chapter's verses are listed: the chapter itself. */
  'search.wholeChapter': 'Whole chapter',
  /** The bar along the bottom of a phone. */
  'bar.label': 'Main controls',

  'reference.unreadable': 'Enter a reference like “John 3:16” or “Ps 23”.',
  'reference.unknownBook': (query: string) => `Unknown book “${query}”.`,
  'reference.ambiguous': (query: string, candidates: string) =>
    `“${query}” could be ${candidates}.`,
  'reference.or': ' or ',
  // The count comes through as a number as well as a formatted string. English needs it for the
  // five books of one chapter it would otherwise mis-say — Obadiah, Philemon, 2 John, 3 John and
  // Jude — and a language that counts in more than two forms needs it for most of the Bible.
  'reference.chapters': (book: string, count: string, plural: number) =>
    plural === 1 ? `${book} has ${count} chapter.` : `${book} has ${count} chapters.`,
  'reference.verses': (reference: string, chapter: string, count: string, plural: number) =>
    plural === 1
      ? `${reference} ${chapter} has ${count} verse.`
      : `${reference} ${chapter} has ${count} verses.`,

  'menu.filtersChanged': 'Filters (changed)',
  'menu.filters': 'Filters',
  'menu.filters.votes': 'Show links',
  'menu.filters.votes.all': 'Everything, doubtful links too',
  'menu.filters.votes.atLeast': (votes: number) =>
    votes === 0
      ? 'All but links readers voted down'
      : votes === 4
        ? 'The surer links (weight 4 and up)'
        : `Weight ${String(votes)} and up`,
  // The parenthesis opens and closes inside the message: a sentence a translator cannot see the
  // end of is one they cannot punctuate, and not every language closes a clause the way English
  // does. `hidden` is the genre clause, or empty.
  'menu.filters.note': (shown: string, total: string, threshold: string, hidden: string) =>
    `Showing ${shown} of ${total} links (${threshold}${hidden}).`,
  // What the weight is, in one breath: the slider above is meaningless without it.
  'menu.filters.weight':
    'Weight is how sure a link is, from 1 to 10. Classic references are weighted by readers’ ' +
    'votes, hand-picked ones by how sure the connection is, similar wording by how alike the ' +
    'words are. It ranks the links; it doesn’t prove them right.',
  'menu.filters.hiddenGenres': (count: number) =>
    count === 1 ? ', 1 genre hidden' : `, ${String(count)} genres hidden`,
  'filter.allLinks': 'everything',
  'filter.noDownvoted': 'all but links voted down',
  'filter.atLeastVotes': (votes: string) => `weight ${votes} and up`,
  'menu.filters.hiddenKinds': (count: number) =>
    count === 1 ? ', 1 kind of link hidden' : `, ${String(count)} kinds of link hidden`,
  'menu.filters.kinds': 'Kinds of link',
  // Plain names: a reader should know what a line is without knowing where it came from.
  'kind.tsk': 'Classic references',
  'kind.tsk.note':
    'the Treasury of Scripture Knowledge’s margin notes, as readers of OpenBible.info voted on them',
  'kind.imported': 'Swedish Bible notes',
  'kind.imported.note':
    'the parallel passages printed in the Swedish Bible of 1917, which reach the deuterocanon',
  'kind.curated': 'Hand-picked',
  'kind.curated.note':
    'compiled for this app for the deuterocanon, weighted by how sure the connection is',
  'kind.computed': 'Similar wording',
  'kind.computed.note':
    'verses whose words are alike, found by comparing them; alike is not the same as related',
  'legend.kinds': 'Kinds of link',

  // The first-visit guide: what the lines are, what the weight means, which books are new.
  'guide.open': 'How to read this',
  /** Under the "?" in the bar. */
  'guide.short': 'Guide',
  'guide.title': 'How to read this',
  'guide.arcs.title': 'Every line is a link',
  'guide.arcs':
    'Each arc joins two passages that echo, quote or explain each other. Touch a book on the ' +
    'bar or a verse to see its links; follow any of them to travel there.',
  'guide.kinds.title': 'Four kinds of line',
  'guide.kinds': 'They come from different places and deserve different trust:',
  'guide.weight.title': 'Weight',
  'guide.weight':
    'Every link has a weight from 1 to 10: how sure it is. Classic references are weighted by ' +
    'readers’ votes, hand-picked links by how sure the connection is, similar wording by how ' +
    'alike the words are. The Filters button sets how sure a link has to be to show.',
  'guide.canon.title': 'The whole Orthodox Bible',
  'guide.canon':
    'The books between Malachi and Matthew — Tobit, Judith, Wisdom, Sirach, Baruch, the ' +
    'Maccabees and the rest — are the deuterocanon. The World English Bible carries them; ' +
    'the other translations here do not, and say so.',
  'guide.done': 'Got it',
  'menu.filters.tip': 'Tip: tap a genre in the legend to hide or show it.',
  'menu.filters.reset': 'Reset filters',

  'attribution.web':
    'Scripture text: World English Bible (WEB), public domain, eBible.org. With the ' +
    'deuterocanon, numbered as the Greek numbers it.',
  'attribution.bsb': 'Scripture text: Berean Standard Bible (BSB), dedicated to the public domain.',
  'attribution.kjv':
    'Scripture text: King James Version (Authorized Version), the 1769 text. Public domain in ' +
    'the United States and most of the world; in the United Kingdom, letters patent reserve ' +
    'the right to print it to the Crown’s patentees — Cambridge University Press, Oxford ' +
    'University Press and Collins.',
  'attribution.blivre':
    'Scripture text: Bíblia Livre (BLIVRE), © Diego Santos, Mario Sérgio and Marco Teles, ' +
    'February 2018 (Textus Receptus edition), https://sites.google.com/site/biblialivre/. ' +
    'Changed: whitespace was normalized; no word was altered.',
  'attribution.luther1912':
    'Scripture text: Lutherbibel 1912 (LUT), the 1912 revision of Martin Luther’s German ' +
    'translation. Public domain. Changed: the edition’s own verse numbers were taken out of ' +
    '358 verses and a corrupt token out of Judges 11:25; no word was altered.',
  'attribution.riveduta1927':
    'Scripture text: Riveduta 1927 (RIV), the Italian revision made under Giovanni Luzzi. ' +
    'Public domain. Changed: the edition’s own verse numbers were taken out of 228 verses, ' +
    'a running head out of three and a stray character out of 2 Samuel 20:26; no word was ' +
    'altered.',
  'attribution.vbl':
    'Scripture text: Versión Biblia Libre (VBL), © 2018–2020 Jonathan Gallagher y Shelly ' +
    'Barrios de Avila, with Gustavo Sanabria and Rebekah Põldaas, ' +
    'https://ebible.org/Scriptures/details.php?id=spavbl, licensed under CC BY-SA 4.0. ' +
    'Changed: a space before a colon was moved in one verse; no word was altered.',
  'license.publicDomain': 'Public domain',
  'menu.translation': 'Translation',
  // Beside a translation that carries the deuterocanonical books.
  'menu.translation.deuterocanon': 'with the deuterocanon',
  /** One line on what each Bible is, under its name in the picker. */
  'translation.note.web': 'Modern English, public domain, from eBible.org',
  'translation.note.bsb': 'Modern English, 2022, public domain',
  'translation.note.kjv': 'The 1769 text of the Authorised Version',
  'translation.note.blivre': 'Brazilian Portuguese, from the Textus Receptus',
  'translation.note.luther1912': 'German, Luther’s text as revised in 1912',
  'translation.note.riveduta1927': 'Italian, Luzzi’s revision of 1927',
  'translation.note.vbl': 'Spanish, a free modern translation',
  'menu.translation.failed': (name: string) => `${name} could not be loaded.`,
  'menu.translation.error': (message: string) => `${message} Check your connection and try again.`,
  'menu.language': 'Language',

  'genres.label': 'Genres',
  'genres.labelChanged': 'Genres (changed)',
  'genres.show': 'Show genres',
  'genres.hide': 'Hide genres',
  'genres.hideOne': (name: string) => `Hide ${name}`,
  'genres.showOne': (name: string) => `Show ${name}`,
  'testament.OT': 'Old Testament',
  'testament.NT': 'New Testament',

  'stats.label': 'Summary',
  'stats.verses': (count: string, plural: number): Emphasized => [
    { strong: count },
    plural === 1 ? ' verse' : ' verses',
  ],
  'stats.links': (shown: string, total: string | null, plural: number): Emphasized => {
    const links = plural === 1 ? 'link' : 'links';
    return total === null
      ? [{ strong: shown }, ` ${links} shown`]
      : [{ strong: shown }, ` of ${total} ${links} shown`];
  },
  'stats.connected': (share: string): Emphasized => [{ strong: share }, ' of verses connected'],
  'stats.crossTestament': (count: string, plural: number): Emphasized => [
    { strong: count },
    plural === 1 ? ' link between the testaments' : ' links between the testaments',
  ],
  'hint.zoom': 'to zoom',
  'hint.pan': 'to pan',
  'hint.focus': 'to focus',
  'hint.hold': 'hold to preview',

  'panel.details': 'Details',
  'panel.expand': 'Expand details',
  'panel.collapse': 'Collapse details',
  'panel.close': 'Close',
  // One key per unit rather than a word slotted into a sentence: languages agree in gender
  // and number, and "previous" is not the same word before "verse" as before "chapter".
  'panel.previousVerse': 'Previous verse',
  'panel.nextVerse': 'Next verse',
  'panel.previousChapter': 'Previous chapter',
  'panel.nextChapter': 'Next chapter',
  'panel.copy': (reference: string) => `Copy ${reference} with a link`,
  'panel.copy.title': 'Copy with a link',
  'panel.copied': (reference: string) => `${reference} copied`,
  'panel.omitted': (abbreviation: string) => `Omitted in the ${abbreviation}.`,
  // A deuterocanonical book in a translation that does not have it.
  'text.notInTranslation': (abbreviation: string) =>
    `Not in the ${abbreviation}. Choose a translation that includes the deuterocanon.`,
  'panel.moreVerses': (count: string, plural: number) =>
    plural === 1 ? `+ ${count} more verse` : `+ ${count} more verses`,
  'panel.showAll': (count: string) => `Show all ${count}`,

  'note.toRange': (range: string) => `to ${range}`,
  'note.fromVerse': (verse: string) => `from v. ${verse}`,
  'note.toVerse': (verse: string) => `to v. ${verse}`,

  /** The card's chips: what its list holds. */
  'card.chips': 'What to list',
  'card.out': (count: string, plural: number) =>
    plural === 1 ? `${count} points out` : `${count} point out`,
  'card.in': (count: string, plural: number) =>
    plural === 1 ? `${count} points in` : `${count} point in`,
  'card.verses': (count: string, plural: number) =>
    plural === 1 ? `${count} verse` : `${count} verses`,
  'card.words': 'Words',
  /** Where the passage sits: verse 3 of 34, chapter 24 of 51. */
  'card.position': (at: string, of: string) => `${at} of ${of}`,
  'card.genres': 'Narrow to a genre',
  'card.genre': (name: string, count: string) => `${name}: ${count}`,
  'card.miniArcs': (reference: string) => `The links of ${reference}, drawn small`,
  'card.none': 'Nothing here under the current filters.',
  'panel.connectsTo': 'Connects to',
  'panel.connectsTo.note': (count: number) => (count === 1 ? '1 genre' : `${String(count)} genres`),
  'panel.references': 'References',
  'panel.references.note': 'where this passage points',
  'panel.referencedBy': 'Referenced by',
  'panel.referencedBy.note': 'passages that point here',
  'panel.verses': 'Verses',
  'panel.verses.note': 'tap one to focus it',
  'panel.none': 'None',
  'panel.items': (plural: number): string => (plural === 1 ? 'item' : 'items'),
  'panel.passages': (plural: number): string => (plural === 1 ? 'passage' : 'passages'),
  'panel.linksCounted': (plural: number): string => (plural === 1 ? 'link' : 'links'),
  'panel.versesCounted': (plural: number): string => (plural === 1 ? 'verse' : 'verses'),

  'words.heading': (language: string) => `Same ${language} word`,
  'words.note': 'where else it is used',
  'words.counted': (plural: number): string => (plural === 1 ? 'word' : 'words'),
  'words.showMore': (count: string) => `Show ${count} more`,
  'language.hebrew': 'Hebrew',
  'language.greek': 'Greek',
  'words.credit': (max: string) =>
    `, based on work at Tyndale House, Cambridge; reduced to dictionary forms. Words used in ` +
    `more than ${max} verses are left out.`,
  'words.creditLabel': 'Words:',

  'loading.data': (verses: string, links: string) =>
    `Loading ${verses} verses and ${links} cross-references…`,
  // What a reader meets when a dataset will not load: almost always the network, and almost
  // always on a device that is offline rather than a machine missing a build step.
  'error.datasetUnavailable':
    'This part of the Bible data could not be loaded. Check your connection and try again.',
  'error.retry': 'Retry',
  'error.viewFailed': (view: string, message: string) => `${view} could not start: ${message}`,

  'threads.direction': 'Thread direction',
  'threads.outgoing': 'Points to',
  'threads.incoming': 'Pointed from',
  'threads.both': 'Both',
  'threads.verse': (number: string) => `Verse ${number}: show its connections`,
  'threads.omitted': (abbreviation: string) =>
    `Omitted in the ${abbreviation} (not in the earliest manuscripts).`,
  'threads.spineHover': (count: string, plural: number) =>
    plural === 1
      ? `${count} thread from here · click to read`
      : `${count} threads from here · click to read`,
  'threads.chapters': 'Chapters',
  'threads.previousChapter': 'Previous chapter',
  'threads.nextChapter': 'Next chapter',
  'threads.stage':
    'Threads from the verses of this chapter to where their cross-references land in the Bible, ' +
    'shown as a vertical bar of all the books.',
  'arcs.connections': (count: string, plural: number) =>
    plural === 1 ? `${count} connection` : `${count} connections`,
  'arcs.stage':
    'Arc diagram of cross-references. Drag or use the arrow keys to pan, scroll or +/- to zoom, ' +
    'click to focus a passage, Escape to clear. On a touch screen, touch and hold to preview a ' +
    'passage.',

  'credits.links': 'Links:',
  'credits.fromTsk': ', from the Treasury of Scripture Knowledge',
  'credits.reindexed': ', re-indexed',
  'credits.toKjv': ' to KJV verse numbering',
  'credits.text': 'Text:',
  'credits.inspiredBy': 'Inspired by',
  'credits.inspiration': (title: string, author: string) => `${title}, by ${author}`,

  'footer.source': 'Source code on GitHub',
  'footer.sourceLabel': 'GitHub',

  'install.link': 'Install the app',
  'install.linkLabel': 'Install',
  'install.title': 'Install the app',
  'install.lede':
    'Keep it on your home screen and read it with no connection. No app store, no account.',
  'install.now': 'Install now',
  'install.device': 'Device',
  'install.close': 'Close',
  'install.whileOnline':
    'Open the app once while you are online: that is when it stores the Bible text and the ' +
    'cross-references on your device.',
} as const;
