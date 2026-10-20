import { GENRES, type GenreId } from '../../core/bible/genres.ts';

/** Background of every visualization (the dark theme's `--color-background`). */
export const VIZ_SURFACE = '#0d0d0d';

/**
 * Genre colors for the dark surface, in canonical genre order: warm Old Testament, cool New
 * Testament, and a crimson for the deuterocanon between them.
 *
 * Validated with the dataviz skill's palette validator (`--mode dark --surface #0d0d0d`), all
 * eleven in this order:
 * - lightness band and chroma floor pass;
 * - worst adjacent-genre CVD ΔE is 8.0 (target ≥ 8), and worst normal-vision ΔE is 15.3 (floor ≥ 15);
 * - every color has at least 3:1 contrast against the surface.
 *
 * The deuterocanon's crimson (OKLCH 0.58 / 0.19 / 20°) was the pick from a sweep of candidates
 * run through the validator: every gold and amber, which would have read as kin to the Poetry,
 * either left the lightness band or fell under the CVD floor against the Minor Prophets' olive
 * beside it, and the violets that passed sat too near Revelation's purple to tell apart across
 * the picture.
 *
 * Eleven colors cannot all be pairwise distinct (the validator's all-pairs check caps at three),
 * so every visualization must also encode genre by position (genres are contiguous runs of
 * books) and by labels.
 */
export const GENRE_COLORS: Readonly<Record<GenreId, string>> = {
  law: '#eb568f',
  history: '#cd4805',
  poetry: '#b48f05',
  'major-prophets': '#cd489d',
  'minor-prophets': '#88a00d',
  deuterocanon: '#d33949',
  gospels: '#17a7b4',
  acts: '#119245',
  'pauline-epistles': '#0593e6',
  'general-epistles': '#03ac8f',
  revelation: '#a06aec',
};

export type Rgb = readonly [red: number, green: number, blue: number];

/** Converts `#rrggbb` into linear-light-agnostic sRGB channels in [0, 1]. */
export function hexToRgb(hex: string): Rgb {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const [, red = '0', green = '0', blue = '0'] = match;
  return [parseInt(red, 16) / 255, parseInt(green, 16) / 255, parseInt(blue, 16) / 255];
}

/** Genre colors as RGB channels, indexed by genre ordinal (for WebGL uniforms). */
export const GENRE_RGB: readonly Rgb[] = GENRES.map((genre) => hexToRgb(GENRE_COLORS[genre.id]));

/** Genre colors as hex strings, indexed by genre ordinal (for Canvas 2D). */
export const GENRE_HEX: readonly string[] = GENRES.map((genre) => GENRE_COLORS[genre.id]);
