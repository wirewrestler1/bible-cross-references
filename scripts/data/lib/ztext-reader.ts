import { inflateSync } from 'node:zlib';
import { extractZipEntry } from './files.ts';

/** A module verse as `Book.chapter.verse`, with the chapter's verses in the module's own order. */
export interface ModuleVerse {
  readonly book: string;
  readonly chapter: number;
  readonly verse: number;
  readonly text: string;
}

/**
 * Reads the verses of a SWORD zText or zText4 module, in order, by walking its verse index.
 *
 * Each testament is three files under `modulePath`: `*.bzz` holds zlib-compressed blocks,
 * `*.bzs` says where each block is (offset, size, uncompressed size: three little-endian 32-bit
 * integers), and `*.bzv` has one entry per verse of the module's versification (block, offset
 * in the block, size) in that versification's order, with intro entries before each book and
 * chapter — ten bytes an entry in a zText (a 16-bit size), twelve in a zText4 (a 32-bit one).
 * The text has no `<verse>` tags, so a verse is known by its place: the entry holding
 * `<chapter osisID="Sir.24">` is the chapter's intro, and the entries after it are its verses
 * 1, 2, 3, … until the next chapter's intro — an empty entry still counts, which is how the
 * gaps of a numbering come through.
 */
export function readZTextVerses(
  archive: Uint8Array,
  modulePath: string,
  driver: 'zText' | 'zText4' = 'zText',
): ModuleVerse[] {
  const entryBytes = driver === 'zText4' ? 12 : 10;
  const verses: ModuleVerse[] = [];
  for (const part of ['ot', 'nt']) {
    const index = extractZipEntry(archive, `${modulePath}/${part}.bzs`);
    const verseIndex = extractZipEntry(archive, `${modulePath}/${part}.bzv`);
    const compressed = extractZipEntry(archive, `${modulePath}/${part}.bzz`);
    const blocks: Buffer[] = [];
    const indexView = new DataView(index.buffer, index.byteOffset, index.byteLength);
    for (let at = 0; at + 12 <= index.byteLength; at += 12) {
      const offset = indexView.getUint32(at, true);
      const size = indexView.getUint32(at + 4, true);
      blocks.push(inflateSync(compressed.subarray(offset, offset + size)));
    }
    const verseView = new DataView(verseIndex.buffer, verseIndex.byteOffset, verseIndex.byteLength);
    let book = '';
    let chapter = 0;
    let verse = 0;
    for (let at = 0; at + entryBytes <= verseIndex.byteLength; at += entryBytes) {
      const block = blocks[verseView.getUint32(at, true)];
      const start = verseView.getUint32(at + 4, true);
      const size =
        entryBytes === 12 ? verseView.getUint32(at + 8, true) : verseView.getUint16(at + 8, true);
      const text =
        block === undefined || size === 0
          ? ''
          : block.subarray(start, start + size).toString('utf8');
      const marker = /<chapter[^>]*osisID="([1-4]?[A-Za-z]+)\.(\d+)"/.exec(text);
      if (marker) {
        book = marker[1] ?? '';
        chapter = Number(marker[2]);
        verse = 0;
        continue;
      }
      // Before the first chapter, and the entry that opens each book (`<div type="book">`),
      // are intros rather than verses, and the intro of one book sits right after the last
      // verse of the one before it.
      if (book === '' || /<div[^>]*type="book"/.test(text)) {
        continue;
      }
      verse += 1;
      verses.push({ book, chapter, verse, text });
    }
  }
  return verses;
}

/** The last verse with text of each chapter, as `Book.chapter` → verse number. */
export function chapterVerseCounts(verses: readonly ModuleVerse[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { book, chapter, verse, text } of verses) {
    if (text.trim() !== '') {
      counts.set(`${book}.${String(chapter)}`, verse);
    }
  }
  return counts;
}
