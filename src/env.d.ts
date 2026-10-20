interface ImportMetaEnv {
  /** The site's name, defined once in `vite/site.ts`. */
  readonly SITE_NAME: string;
  /** The published site's address (origin and path), also on the dev server; see `vite/site.ts`. */
  readonly SITE_URL: string;
  /** How many links the dataset the app draws holds, per the last data build; see `vite/link-count.ts`. */
  readonly LINK_COUNT: number;
}
