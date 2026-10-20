import type { GenreId } from '../../core/bible/genres.ts';

/** The eleven genres in German. */
export const deGenres: Readonly<Record<GenreId, string>> = {
  law: 'Gesetz',
  history: 'Geschichtsbücher',
  poetry: 'Poesie und Weisheit',
  'major-prophets': 'Große Propheten',
  'minor-prophets': 'Kleine Propheten',
  deuterocanon: 'Deuterokanonische Bücher',
  gospels: 'Evangelien',
  acts: 'Apostelgeschichte',
  'pauline-epistles': 'Paulusbriefe',
  'general-epistles': 'Katholische Briefe',
  revelation: 'Offenbarung',
};
