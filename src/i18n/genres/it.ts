import type { GenreId } from '../../core/bible/genres.ts';

/** The eleven genres in Italian. */
export const itGenres: Readonly<Record<GenreId, string>> = {
  law: 'Legge',
  history: 'Libri storici',
  poetry: 'Poesia e sapienza',
  'major-prophets': 'Profeti maggiori',
  'minor-prophets': 'Profeti minori',
  deuterocanon: 'Deuterocanonici',
  gospels: 'Vangeli',
  acts: 'Atti',
  'pauline-epistles': 'Lettere di Paolo',
  'general-epistles': 'Lettere cattoliche',
  revelation: 'Apocalisse',
};
