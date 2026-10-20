import type { GenreId } from '../../core/bible/genres.ts';

/** The eleven genres in Portuguese. */
export const ptGenres: Readonly<Record<GenreId, string>> = {
  law: 'Lei',
  history: 'História',
  poetry: 'Poesia e Sabedoria',
  'major-prophets': 'Profetas Maiores',
  'minor-prophets': 'Profetas Menores',
  deuterocanon: 'Deuterocanônicos',
  gospels: 'Evangelhos',
  acts: 'Atos',
  'pauline-epistles': 'Epístolas Paulinas',
  'general-epistles': 'Epístolas Gerais',
  revelation: 'Apocalipse',
};
