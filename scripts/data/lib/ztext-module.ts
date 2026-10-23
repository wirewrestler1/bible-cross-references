import { deflateSync } from 'node:zlib';
import { strToU8, zipSync } from 'fflate';

/**
 * A SWORD zText module archive built from the entries of its verse index, for tests of the
 * importer that reads one: every string is one entry (an intro, a chapter marker or a verse),
 * each testament in one zlib block.
 */
export function createZTextModule(
  parts: Readonly<Record<'ot' | 'nt', readonly string[]>>,
  path = 'modules/texts/ztext/swe1917',
  driver: 'zText' | 'zText4' = 'zText',
): Uint8Array {
  const entryBytes = driver === 'zText4' ? 12 : 10;
  const files: Record<string, Uint8Array> = {};
  for (const [part, entries] of Object.entries(parts)) {
    const texts = entries.map((entry) => strToU8(entry));
    const uncompressed = new Uint8Array(texts.reduce((total, text) => total + text.length, 0));
    const verseIndex = new DataView(new ArrayBuffer(entries.length * entryBytes));
    let offset = 0;
    texts.forEach((text, index) => {
      uncompressed.set(text, offset);
      verseIndex.setUint32(index * entryBytes, 0, true);
      verseIndex.setUint32(index * entryBytes + 4, offset, true);
      if (entryBytes === 12) {
        verseIndex.setUint32(index * entryBytes + 8, text.length, true);
      } else {
        verseIndex.setUint16(index * entryBytes + 8, text.length, true);
      }
      offset += text.length;
    });
    const block = deflateSync(uncompressed);
    const blockIndex = new DataView(new ArrayBuffer(12));
    blockIndex.setUint32(0, 0, true);
    blockIndex.setUint32(4, block.length, true);
    blockIndex.setUint32(8, uncompressed.length, true);
    files[`${path}/${part}.bzz`] = new Uint8Array(block);
    files[`${path}/${part}.bzs`] = new Uint8Array(blockIndex.buffer);
    files[`${path}/${part}.bzv`] = new Uint8Array(verseIndex.buffer);
  }
  return zipSync(files);
}
