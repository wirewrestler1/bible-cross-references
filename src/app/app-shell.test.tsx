import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DebugPage } from '../features/debug/DebugPage.tsx';
import { debugDataLoader } from '../features/debug/debug-data.ts';
import { mount } from '../shared/lib/mount.tsx';
import { CROSS_REFERENCE_SOURCE_MANIFESTS } from '../cross-references/registry.ts';
import { DEFAULT_TRANSLATION_ID } from '../translations/registry.ts';
import {
  createCrossReferenceColumns,
  createTranslationFile,
  PROVENANCE,
  verseIndex,
} from '../test-utils/fixtures.ts';
import {
  HOLD_MS,
  LEAVE_MS,
  VizDataBoundary,
} from '../visualizations/shared/components/VizDataBoundary.tsx';
import { VizPage } from '../visualizations/shared/components/VizPage.tsx';
import { PHONE_QUERY } from '../shared/lib/use-media-query.ts';
import { vizCoreLoader, resetTranslations } from '../visualizations/shared/viz-data.ts';
import { ViewSwitch } from './ViewSwitch.tsx';
import { VIEWS } from './views.ts';

const GEN_1_1 = verseIndex('Gen', 1, 1);

const CROSS_REFERENCES = {
  format: 'cross-references',
  schemaVersion: 2,
  versification: 'kjv-dc',
  provenance: PROVENANCE,
  notices: [],
  sourceId: 'openbible',
  sourceRowCount: 1,
  links: createCrossReferenceColumns([{ from: GEN_1_1, to: GEN_1_1 + 1, votes: 5 }]),
};

/**
 * Renders something that suspends, waiting for it to settle before asserting. The render has to
 * happen inside an awaited `act`, or React stays on the loading screen and never reaches the
 * data — or the error boundary.
 */
async function renderSuspending(node: React.ReactNode): Promise<void> {
  await act(async () => {
    render(node);
    await Promise.resolve();
  });
}

/** Serves the datasets, or fails every request. */
function serve({ failing = false } = {}) {
  const fetch = vi.fn((input: string | URL) => {
    if (failing) {
      return Promise.reject(new Error('offline'));
    }
    // The debug page loads the default translation, which the fixture file has to name.
    // Every registered source is served the same links, under its own id.
    const url = String(input);
    const body = url.includes('cross-references')
      ? {
          ...CROSS_REFERENCES,
          sourceId: CROSS_REFERENCE_SOURCE_MANIFESTS.find(({ id }) => url.includes(id))?.id,
        }
      : { ...createTranslationFile(), translationId: DEFAULT_TRANSLATION_ID };
    return Promise.resolve(new Response(JSON.stringify(body)));
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vizCoreLoader.reset();
  resetTranslations();
  debugDataLoader.reset();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('mount', () => {
  it('renders the page into the root, with one install guide beside it', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await act(async () => {
      mount(<p>Hello</p>);
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain('Hello');
    expect(document.querySelectorAll('dialog')).toHaveLength(1);
  });

  it('refuses to start without a root to render into', () => {
    expect(() => {
      mount(<p>Hello</p>);
    }).toThrow(/#root/);
  });
});

describe('VizDataBoundary', () => {
  // A reader who prefers reduced motion: the loading screen is not held (the hold has its own
  // test, which asks for motion).
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }) as MediaQueryList);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('holds the loading screen on every open until its picture is full, then lets it leave', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }) as MediaQueryList);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    serve();
    await renderSuspending(<VizDataBoundary>{() => <p>done</p>}</VizDataBoundary>);
    await act(async () => {
      await vizCoreLoader.load();
    });
    // The data is here, but the screen holds.
    expect(screen.queryByText('done')).toBeNull();
    expect(screen.getByRole('status')).toBeDefined();
    await act(async () => {
      vi.advanceTimersByTime(HOLD_MS);
      await Promise.resolve();
    });
    // The page is in, under the leaving screen...
    expect(screen.getByText('done')).toBeDefined();
    expect(screen.getByRole('status')).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(LEAVE_MS);
    });
    // ...and then on its own.
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the data once it has loaded', async () => {
    serve();
    await renderSuspending(
      <VizDataBoundary>{(core) => <p>{core.versification.verseCount} verses</p>}</VizDataBoundary>,
    );
    expect(screen.getByText(/37128 verses/)).toBeDefined();
  });

  it('waits with a loading screen that says what is coming', () => {
    serve();
    render(<VizDataBoundary>{() => <p>done</p>}</VizDataBoundary>);
    expect(screen.getByText(/Loading 37,128 verses/)).toBeDefined();
  });

  it('explains a failed download and offers to try again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    serve({ failing: true });
    await renderSuspending(<VizDataBoundary>{() => <p>done</p>}</VizDataBoundary>);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('could not be loaded');
    // And in the reader's own words, not the importer's: the underlying error names the file and
    // tells whoever is reading it to run a build script, which is no use to someone on a train.
    expect(alert.textContent).not.toContain('npm run data');
    expect(alert.textContent).not.toContain('data/translations');
    expect(screen.getByRole('button', { name: /Retry/ })).toBeDefined();
  });

  it('forgets the failure when retried, so the download starts over', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetch = serve({ failing: true });
    await renderSuspending(<VizDataBoundary>{() => <p>done</p>}</VizDataBoundary>);
    await screen.findByRole('button', { name: /Retry/ });
    const before = fetch.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: /Retry/ }));
    await waitFor(() => {
      expect(fetch.mock.calls.length).toBeGreaterThan(before);
    });
  });
});

describe('VizPage', () => {
  it('lays out the masthead, the switch, the controls, the stage and the credits', () => {
    render(
      <VizPage
        masthead={<h1>Title</h1>}
        viewSwitch={<nav aria-label="Views" />}
        search={<input type="search" aria-label="Go to" />}
        tools={<button type="button">Translation</button>}
        menus={<button type="button">Filter</button>}
        credits={<span>Credits</span>}
      >
        <canvas />
      </VizPage>,
    );
    expect(screen.getByRole('heading', { name: 'Title' })).toBeDefined();
    expect(screen.getByRole('navigation', { name: 'Views' })).toBeDefined();
    expect(screen.getByRole('searchbox', { name: 'Go to' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Translation' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Filter' })).toBeDefined();
    expect(screen.getByText('Credits')).toBeDefined();
    expect(screen.getByRole('main')).toBeDefined();
    // Wide: no bar, and no search button since the box is in the header.
    expect(screen.queryByRole('navigation', { name: 'Main controls' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Search' })).toBeNull();
  });

  it('has no details panel until there is something to show', () => {
    render(
      <VizPage credits={<span>Credits</span>}>
        <canvas />
      </VizPage>,
    );
    expect(screen.queryByLabelText('Details')).toBeNull();
  });

  it('shows the details panel, with a handle to open it fully', () => {
    render(
      <VizPage credits={<span>Credits</span>} panel={<p>About this verse</p>}>
        <canvas />
      </VizPage>,
    );
    expect(screen.getByLabelText('Details')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Expand details' })).toBeDefined();
  });

  it('opens and closes the sheet from its handle', async () => {
    render(
      <VizPage credits={<span>Credits</span>} panel={<p>About this verse</p>}>
        <canvas />
      </VizPage>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Expand details' }));
    expect(screen.getByRole('button', { name: 'Collapse details' })).toBeDefined();
  });
});

describe('VizPage on a phone', () => {
  /**
   * A window the width of a phone, as far as `matchMedia` is concerned. Returns a way to widen
   * it: the page then hears the change the way it would from a real window.
   */
  function phoneWidth(): () => void {
    const lists = new Map<string, MediaQueryList & { matches: boolean }>();
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
      let list = lists.get(query);
      if (!list) {
        const target = new EventTarget();
        list = Object.assign(target, {
          media: query,
          matches: query === PHONE_QUERY,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
        });
        lists.set(query, list);
      }
      return list;
    });
    return () => {
      for (const list of lists.values()) {
        list.matches = false;
        list.dispatchEvent(new Event('change'));
      }
    };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('puts the switch, the search, the filters and the guide in a bar, and no footer', () => {
    phoneWidth();
    render(
      <VizPage
        masthead={<h1>Title</h1>}
        viewSwitch={<nav aria-label="Views" />}
        search={<input type="search" aria-label="Go to" />}
        tools={<button type="button">Translation</button>}
        menus={<button type="button">Filter</button>}
        credits={<span>Credits</span>}
      >
        <canvas />
      </VizPage>,
    );
    const bar = screen.getByRole('navigation', { name: 'Main controls' });
    expect(within(bar).getByRole('navigation', { name: 'Views' })).toBeDefined();
    expect(within(bar).getByRole('button', { name: 'Search' })).toBeDefined();
    expect(within(bar).getByRole('button', { name: 'Filter' })).toBeDefined();
    // The translation stays in the header, by the name.
    expect(within(bar).queryByRole('button', { name: 'Translation' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Translation' })).toBeDefined();
    // The search box waits in its sheet; the footer's links are in the guide instead.
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByText('Credits')).toBeNull();
  });

  it('opens the search as a sheet with the box focused, and closes it once the focus leaves', async () => {
    phoneWidth();
    render(
      <VizPage
        search={<input type="search" aria-label="Go to" />}
        tools={<button type="button">Translation</button>}
        credits={<span>Credits</span>}
      >
        <canvas />
      </VizPage>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    const box = screen.getByRole('searchbox', { name: 'Go to' });
    expect(document.activeElement).toBe(box);
    expect(screen.getByRole('dialog', { name: 'Go to a Bible reference' })).toBeDefined();
    // What the search does once it has found a reference: the box lets the focus go.
    act(() => {
      box.blur();
    });
    expect(screen.queryByRole('searchbox')).toBeNull();

    // Escape closes it too.
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('closes the search sheet from its dimmed background, and when the window widens', async () => {
    const widen = phoneWidth();
    const { container } = render(
      <VizPage search={<input type="search" aria-label="Go to" />} credits={<span>Credits</span>}>
        <canvas />
      </VizPage>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByRole('searchbox')).toBeDefined();
    const scrim = container.querySelector('[class*="menuScrim"]');
    expect(scrim).not.toBeNull();
    // A tap, which moves no focus (a pointer's press would, and the sheet closes on that alone).
    fireEvent.click(scrim ?? container);
    expect(screen.queryByRole('searchbox')).toBeNull();

    // Open again, then widen past a phone: the box is back in the header, and the sheet is gone.
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByRole('dialog')).toBeDefined();
    act(widen);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('searchbox', { name: 'Go to' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Search' })).toBeNull();
  });

  it('closes an open sheet when the dimmed stage behind it is tapped', async () => {
    const { container } = render(
      <VizPage credits={<span>Credits</span>} panel={<p>About this verse</p>}>
        <canvas />
      </VizPage>,
    );
    await userEvent.click(screen.getByRole('button', { name: /expand/i }));
    expect(screen.getByRole('button', { name: /collapse/i })).toBeDefined();
    const scrim = container.querySelector('[class*="sheetScrim"]');
    expect(scrim).not.toBeNull();
    await userEvent.click(scrim ?? container);
    expect(screen.getByRole('button', { name: /expand/i })).toBeDefined();
    expect(container.querySelector('[data-sheet]')?.getAttribute('data-sheet')).toBe('half');
  });
});

describe('ViewSwitch', () => {
  it('offers every visualization, marking the one on screen', () => {
    render(
      <ViewSwitch
        views={VIEWS}
        current="arcs"
        hrefOf={(view) => `/${view.path}`}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('link')).toHaveLength(VIEWS.length);
    expect(screen.getByRole('link', { name: 'Arcs' }).getAttribute('aria-current')).toBe('page');
  });

  it('opens a view in place, without loading the page again', async () => {
    const onOpen = vi.fn();
    render(
      <ViewSwitch
        views={VIEWS}
        current="arcs"
        hrefOf={(view) => `/${view.path}`}
        onOpen={onOpen}
      />,
    );
    await userEvent.click(screen.getByRole('link', { name: 'Threads' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'threads' }));
  });

  it('keeps a real address on each link, so they can be opened in a tab', () => {
    render(
      <ViewSwitch
        views={VIEWS}
        current="arcs"
        hrefOf={(view) => `/${view.path}`}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByRole('link', { name: 'Threads' }).getAttribute('href')).toBe('/threads/');
  });
});

describe('the views', () => {
  it('starts with the home page, and gives every other view a path of its own', () => {
    expect(VIEWS[0].path).toBe('');
    const paths = VIEWS.map((view) => view.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('names each view for its switch and for the panel’s link', () => {
    for (const view of VIEWS) {
      expect(view.titleKey.length).toBeGreaterThan(0);
      expect(view.shortTitleKey.length).toBeGreaterThan(0);
      expect(view.openLabelKey.length).toBeGreaterThan(0);
    }
  });
});

describe('DebugPage', () => {
  it('lists its sections and waits for the datasets', () => {
    vi.spyOn(debugDataLoader, 'load').mockReturnValue(new Promise(() => undefined));
    render(<DebugPage />);
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeDefined();
    expect(screen.getByText(/Loading datasets/)).toBeDefined();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(3);
  });

  // Renders one element per unlinked verse over a whole-Bible fixture, which is slow in
  // happy-dom and slower again on a loaded CI runner: measured at 7s beside 21 other files.
  it('shows the dashboard once the datasets are there', { timeout: 30_000 }, async () => {
    serve();
    debugDataLoader.reset();
    await renderSuspending(<DebugPage />);
    expect(screen.getByText('Dataset files')).toBeDefined();
  });

  it('explains a failed load and offers to retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(debugDataLoader, 'load').mockRejectedValue(new Error('no datasets'));
    await renderSuspending(<DebugPage />);
    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.getByText('no datasets')).toBeDefined();
    expect(screen.getByRole('button', { name: /Retry/ })).toBeDefined();
  });

  it('starts the load again when retried', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const load = vi.spyOn(debugDataLoader, 'load').mockRejectedValue(new Error('no datasets'));
    const reset = vi.spyOn(debugDataLoader, 'reset');
    await renderSuspending(<DebugPage />);
    await screen.findByRole('button', { name: /Retry/ });
    await userEvent.click(screen.getByRole('button', { name: /Retry/ }));
    expect(reset).toHaveBeenCalled();
    expect(load.mock.calls.length).toBeGreaterThan(1);
  });
});

describe('the debug dataset loader', () => {
  it('loads the default text and every registered source together', async () => {
    const fetch = serve();
    debugDataLoader.reset();
    const data = await debugDataLoader.load();
    expect(data.translation.translation.manifest.id).toBe(DEFAULT_TRANSLATION_ID);
    expect(data.crossReferences).toHaveLength(CROSS_REFERENCE_SOURCE_MANIFESTS.length);
    expect(fetch).toHaveBeenCalledTimes(1 + CROSS_REFERENCE_SOURCE_MANIFESTS.length);
  });
});

describe('the visualization registry', () => {
  it('describes each view with an icon and a lazily loaded component', async () => {
    const { arcs } = await import('../visualizations/arcs/index.ts');
    const { threads } = await import('../visualizations/threads/index.ts');
    for (const view of [arcs, threads]) {
      expect(typeof view.icon).toBe('function');
      expect(view.Component).toBeDefined();
    }
  });
});
