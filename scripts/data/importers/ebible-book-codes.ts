import type {
  BookId,
  DeuterocanonicalBookId,
  ProtestantBookId,
} from '../../../src/core/bible/books.ts';

/**
 * eBible's book code for each book, keyed by the book it names.
 *
 * Keyed rather than listed in canonical order. As a list, the code and the book it belongs to
 * were held together by nothing but their position, and the only check was that there were 66 of
 * each — so exchanging two entries produced an import that succeeds, fills all 31,102 verses,
 * duplicates nothing and reports nothing, with one book's text filed under another's name.
 * Philemon and Jude make that concrete: they are the canon's only pair with the same shape (one
 * chapter, twenty-five verses), so no count anywhere in the pipeline can tell them apart. Here a
 * swap is a visible diff and a wrong key is a compile error.
 */
export const PROTESTANT_BOOK_CODES: Readonly<Record<ProtestantBookId, string>> = {
  Gen: 'GEN',
  Exod: 'EXO',
  Lev: 'LEV',
  Num: 'NUM',
  Deut: 'DEU',
  Josh: 'JOS',
  Judg: 'JDG',
  Ruth: 'RUT',
  '1Sam': '1SA',
  '2Sam': '2SA',
  '1Kgs': '1KI',
  '2Kgs': '2KI',
  '1Chr': '1CH',
  '2Chr': '2CH',
  Ezra: 'EZR',
  Neh: 'NEH',
  Esth: 'EST',
  Job: 'JOB',
  Ps: 'PSA',
  Prov: 'PRO',
  Eccl: 'ECC',
  Song: 'SOL',
  Isa: 'ISA',
  Jer: 'JER',
  Lam: 'LAM',
  Ezek: 'EZE',
  Dan: 'DAN',
  Hos: 'HOS',
  Joel: 'JOE',
  Amos: 'AMO',
  Obad: 'OBA',
  Jonah: 'JON',
  Mic: 'MIC',
  Nah: 'NAH',
  Hab: 'HAB',
  Zeph: 'ZEP',
  Hag: 'HAG',
  Zech: 'ZEC',
  Mal: 'MAL',
  Matt: 'MAT',
  Mark: 'MAR',
  Luke: 'LUK',
  John: 'JOH',
  Acts: 'ACT',
  Rom: 'ROM',
  '1Cor': '1CO',
  '2Cor': '2CO',
  Gal: 'GAL',
  Eph: 'EPH',
  Phil: 'PHI',
  Col: 'COL',
  '1Thess': '1TH',
  '2Thess': '2TH',
  '1Tim': '1TI',
  '2Tim': '2TI',
  Titus: 'TIT',
  Phlm: 'PHM',
  Heb: 'HEB',
  Jas: 'JAM',
  '1Pet': '1PE',
  '2Pet': '2PE',
  '1John': '1JO',
  '2John': '2JO',
  '3John': '3JO',
  Jude: 'JUD',
  Rev: 'REV',
};

/**
 * The deuterocanonical books, as the World English Bible codes them. Several differ from the
 * codes the OSIS ids would suggest: Psalm 151 is `PSX`, the Prayer of Manasseh `PRM`, and the
 * Greek Daniel with its additions `DNG`. The WEB also carries 2 Esdras as `4ES`, which is not in
 * the Orthodox canon and so has no entry here; its lines are skipped by name below.
 */
export const DEUTEROCANON_BOOK_CODES: Readonly<Record<DeuterocanonicalBookId, string>> = {
  '1Esd': '1ES',
  PrMan: 'PRM',
  Tob: 'TOB',
  Jdt: 'JDT',
  EsthGr: 'ESG',
  '1Macc': '1MA',
  '2Macc': '2MA',
  '3Macc': '3MA',
  AddPs: 'PSX',
  Wis: 'WIS',
  Sir: 'SIR',
  Bar: 'BAR',
  DanGr: 'DNG',
  '4Macc': '4MA',
};

export const BOOK_CODES: Readonly<Record<BookId, string>> = {
  ...PROTESTANT_BOOK_CODES,
  ...DEUTEROCANON_BOOK_CODES,
};
