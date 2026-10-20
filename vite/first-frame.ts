import type { Plugin } from 'vite';
import { SITE_COPY } from '../src/i18n/site-copy.ts';
import { MARK_PATHS, MARK_VIEWBOX } from '../src/shared/ui/mark-paths.ts';
import { atEndOfHead, pageOf, SURFACE } from './site.ts';

function escapeText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** Styles for the first frame, inlined so that it needs no stylesheet or script. */
const FIRST_FRAME_CSS = `
html{background:${SURFACE};color-scheme:dark}
body{margin:0}
.first-frame{position:fixed;inset:0;display:grid;place-content:center;justify-items:center;gap:18px;color:#e8e6df;font:500 19px/1.3 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif}
.first-frame svg{width:76px;height:76px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round}
.first-frame .arc{stroke-dasharray:1;animation:first-frame-draw 2s ease-in-out infinite}
.first-frame .arc+.arc{animation-delay:.3s}
.first-frame .arc+.arc+.arc{animation-delay:.6s}
@keyframes first-frame-draw{0%{stroke-dashoffset:1}45%,65%{stroke-dashoffset:0}100%{stroke-dashoffset:-1}}
@media (prefers-reduced-motion:reduce){.first-frame .arc{animation:none}}
noscript{position:fixed;inset-inline:0;bottom:32px;padding:0 24px;color:#9a9890;font:14px/1.5 system-ui,sans-serif;text-align:center}
`.trim();

/**
 * Makes every page's first frame instant: before any stylesheet or script arrives, the page is
 * already dark and shows the logo, its arcs drawing themselves (in CSS). React replaces it with
 * the animated loading screen, and then with the app.
 *
 * The page's stylesheets move to the end of `<body>`, where browsers paint the content above them
 * first; the scripts still wait for them, so nothing renders unstyled.
 */
export function firstFrame(): Plugin {
  const root = '<div id="root"></div>';
  return {
    name: 'bible-cross-references:first-frame',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        const page = pageOf(context.path);
        if (!page) {
          return html;
        }
        // The site's name in the page's own language. This is the only text on screen until
        // React mounts, so on a Portuguese page it has to be the Portuguese name — otherwise a
        // reader who opened `/pt/` spends the first second looking at an English title on a
        // document that declares itself `lang="pt-BR"`.
        const siteName = SITE_COPY[page.locale].siteName;
        if (!html.includes(root)) {
          throw new Error(
            `${context.path}: expected an empty ${root} to fill with the first frame.`,
          );
        }
        // The arcs draw themselves, outermost first; the baseline and the cross stand still.
        const logo =
          `<svg viewBox="${MARK_VIEWBOX}" aria-hidden="true">` +
          MARK_PATHS.arcs.map((d) => `<path class="arc" pathLength="1" d="${d}"/>`).join('') +
          [MARK_PATHS.baseline, ...MARK_PATHS.cross].map((d) => `<path d="${d}"/>`).join('') +
          '</svg>';
        const stylesheets: string[] = [];
        const withoutStylesheets = html.replace(/\s*<link rel="stylesheet"[^>]*>/g, (link) => {
          stylesheets.push(link.trim());
          return '';
        });
        return {
          html: withoutStylesheets
            .replace(
              root,
              `<div id="root"><div class="first-frame">${logo}${escapeText(siteName)}</div></div>`,
            )
            .replace('</body>', `${stylesheets.map((link) => `  ${link}\n`).join('')}</body>`),
          tags: atEndOfHead([
            { tag: 'meta', attrs: { name: 'color-scheme', content: 'dark' } },
            { tag: 'style', children: FIRST_FRAME_CSS },
          ]),
        };
      },
    },
  };
}
