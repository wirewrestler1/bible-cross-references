import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  buildHaydockRows,
  HAYDOCK_SOURCE_BOOKS,
  parseHaydockPage,
  type HaydockPage,
} from './importers/haydock-notes.ts';
import { HAYDOCK_FILE } from './datasets.ts';
import { REPO_ROOT } from './lib/paths.ts';

/**
 * Fetches Haydock's commentary on Wisdom, Baruch and 1–2 Maccabees from haydockcommentary.com,
 * one page per chapter, and writes the links its notes name to `data/haydock/…tsv`, which is
 * committed: the app's build reads the file and never the site. Run it again to refresh:
 *
 *   node scripts/data/haydock-notes.ts
 */
const SITE = 'https://haydockcommentary.com';
const PAUSE_MS = 400;

/** A chapter's page, or nothing where the site has none (its menu lists 2 Maccabees 6; the page is a 404). */
async function fetchPage(slug: string): Promise<string | undefined> {
  const response = await fetch(`${SITE}/${slug}`, {
    headers: { 'user-agent': 'bible-cross-references data build (one pass, paced)' },
  });
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(`${slug}: HTTP ${String(response.status)}`);
  }
  return response.text();
}

const pages = new Map<string, HaydockPage>();
const missing: string[] = [];
for (const { book, slug, chapters } of HAYDOCK_SOURCE_BOOKS) {
  for (let chapter = 1; chapter <= chapters; chapter += 1) {
    const html = await fetchPage(`${slug}-${String(chapter)}`);
    if (html === undefined) {
      missing.push(`${book}.${String(chapter)}`);
      process.stdout.write(`${book} ${String(chapter)}: no page\n`);
      continue;
    }
    const page = parseHaydockPage(html);
    pages.set(`${book}.${String(chapter)}`, page);
    process.stdout.write(
      `${book} ${String(chapter)}: ${String(page.notes.length)} notes, Douay verses ${String(page.verseCount)}\n`,
    );
    await new Promise((done) => setTimeout(done, PAUSE_MS));
  }
}
const report = buildHaydockRows(pages);
const today = new Date().toISOString().slice(0, 10);
const header =
  `From Verse\tTo Verse\tWeight\t# Public domain: scripture references in Haydock's Catholic ` +
  `Bible Commentary (1859), read from haydockcommentary.com on ${today} by ` +
  `scripts/data/haydock-notes.ts (Wisdom, Baruch, 1–2 Maccabees)`;
await writeFile(resolve(REPO_ROOT, HAYDOCK_FILE), `${[header, ...report.rows].join('\n')}\n`);
process.stdout.write(
  `\n${String(report.rows.length)} links from ${String(report.references)} references; ` +
    `${String(report.dropped)} dropped (unplaceable or unsafe numbering)\n` +
    `skipped chapters: ${report.skippedChapters.join(', ') || 'none'}\n` +
    `missing pages: ${missing.join(', ') || 'none'}\n`,
);
