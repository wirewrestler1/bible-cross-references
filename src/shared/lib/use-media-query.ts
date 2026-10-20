import { useSyncExternalStore } from 'react';

/** Whether a media query matches, kept current as the window changes. False where there is no window. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') {
        return () => undefined; // Nothing to listen to: the answer is always "no".
      }
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => {
        list.removeEventListener('change', onChange);
      };
    },
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false),
  );
}

/**
 * Phones, as the stylesheets mean it: the width below which the details become a bottom sheet,
 * the menus open as sheets and the controls move to a bar along the bottom. The same number as
 * the `(max-width: 47.99rem)` rules in the CSS modules, which is why it is written out here too.
 */
export const PHONE_QUERY = '(max-width: 47.99rem)';
