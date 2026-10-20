import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { versePassage, type Passage } from '../../../core/bible/passage.ts';
import { verseIndex } from '../../../test-utils/fixtures.ts';
import { createVizData } from '../../../test-utils/viz-data.ts';
import { DEFAULT_LINK_FILTER } from '../link-filter.ts';
import type { PassagePictureProps } from '../passage-picture.ts';
import { PassageCard } from './PassageCard.tsx';

const JOHN_3_16 = verseIndex('John', 3, 16);
const JOHN_3_17 = verseIndex('John', 3, 17);
const ROM_5_8 = verseIndex('Rom', 5, 8);
const GEN_1_1 = verseIndex('Gen', 1, 1);

const DATA = createVizData(
  [
    { from: JOHN_3_16, to: ROM_5_8, votes: 50 },
    { from: GEN_1_1, to: JOHN_3_16, votes: 30 },
  ],
  new Map([
    [JOHN_3_16, 'For God so loved the world…'],
    [ROM_5_8, 'But God proves His love…'],
    [GEN_1_1, 'In the beginning…'],
    [JOHN_3_17, 'For God did not send His Son…'],
  ]),
);

/** A stand-in for the host's picture: it shows the label and lets a test point at a link. */
function Picture({ label, connections, onPoint }: PassagePictureProps) {
  return (
    <svg role="img" aria-label={label}>
      {connections.map((connection) => (
        <title
          key={`${String(connection.link.id)}-${connection.direction}`}
          onPointerEnter={() => {
            onPoint(connection);
          }}
        >
          {connection.direction}
        </title>
      ))}
    </svg>
  );
}

function renderPanel(passage: Passage = versePassage(JOHN_3_16), props = {}) {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  const result = render(
    <PassageCard
      data={DATA}
      passage={passage}
      filter={DEFAULT_LINK_FILTER}
      onSelect={onSelect}
      onClose={onClose}
      shareUrl={(target) => `https://example.org/?ref=${target.kind}`}
      picture={Picture}
      {...props}
    />,
  );
  return { ...result, onSelect, onClose };
}

describe('PassageCard', () => {
  it('names the passage, its book and its genre', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: 'John 3:16' })).toBeDefined();
    expect(screen.getByText(/Gospels/)).toBeDefined();
  });

  it("shows a verse's text", () => {
    renderPanel();
    expect(screen.getByText('For God so loved the world…')).toBeDefined();
  });

  it('lists where the passage points, and what points at it, behind two chips', async () => {
    renderPanel();
    const out = screen.getByRole('tab', { name: '1 points out' });
    const inward = screen.getByRole('tab', { name: '1 points in' });
    expect(out.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText(/But God proves His love/)).toBeDefined();
    expect(screen.queryByText(/In the beginning/)).toBeNull();
    await userEvent.click(inward);
    expect(screen.getByText(/In the beginning/)).toBeDefined();
    expect(screen.queryByText(/But God proves His love/)).toBeNull();
  });

  it('shows the host’s picture of the passage’s links above the headline, and lets it point', async () => {
    const onPreview = vi.fn();
    renderPanel(undefined, { onPreview });
    const picture = screen.getByRole('img', { name: 'The links of John 3:16, drawn small' });
    expect(picture.querySelectorAll('title')).toHaveLength(2);
    await userEvent.hover(picture.querySelector('title') as Element);
    expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ direction: 'outgoing' }));
  });

  it('says where the passage sits in its chapter', () => {
    renderPanel();
    expect(screen.getByText('16 of 36')).toBeDefined();
  });

  it('follows a reference when it is chosen', async () => {
    const { onSelect } = renderPanel();
    await userEvent.click(
      screen.getByText(/But God proves His love/).closest('button') as HTMLElement,
    );
    expect(onSelect).toHaveBeenCalledWith(versePassage(ROM_5_8));
  });

  it('closes', async () => {
    const { onClose } = renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('steps to the next and previous verse', async () => {
    const { onSelect } = renderPanel();
    await userEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(onSelect).toHaveBeenCalledWith(versePassage(JOHN_3_17));
    await userEvent.click(screen.getByRole('button', { name: /Previous/i }));
    expect(onSelect).toHaveBeenCalledWith(versePassage(verseIndex('John', 3, 15)));
  });

  it('says so when a passage has no links in a direction', () => {
    renderPanel(versePassage(verseIndex('Rev', 22, 21)));
    expect(screen.getByText(/Nothing here/)).toBeDefined();
  });

  it('starts on what points in when nothing points out', () => {
    renderPanel(versePassage(ROM_5_8));
    expect(screen.getByRole('tab', { name: '1 points in' }).getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('shows a chapter as a list of its verses, each with how many links it has', () => {
    renderPanel({ kind: 'chapter', book: 'John', chapter: 3 });
    expect(screen.getByRole('tab', { name: '36 verses' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByText('For God so loved the world…')).toBeDefined();
    const row = screen.getByText('For God so loved the world…').closest('button');
    expect(row?.textContent).toContain('2');
  });

  it("opens a verse from a chapter's list", async () => {
    const { onSelect } = renderPanel({ kind: 'chapter', book: 'John', chapter: 3 });
    await userEvent.click(
      screen.getByText('For God so loved the world…').closest('button') as HTMLElement,
    );
    expect(onSelect).toHaveBeenCalledWith(versePassage(JOHN_3_16));
  });

  it('shows the genres the links reach as a spectrum that narrows the list', async () => {
    renderPanel();
    const spectrum = screen.getByRole('group', { name: 'Narrow to a genre' });
    const pauline = within(spectrum).getByRole('button', { name: 'Pauline Epistles: 1' });
    expect(pauline.getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(pauline);
    expect(pauline.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(/But God proves His love/)).toBeDefined();
    await userEvent.click(pauline);
    expect(pauline.getAttribute('aria-pressed')).toBe('false');
  });

  it('names the books the links reach, with counts, as pills that narrow the list', async () => {
    renderPanel();
    const pills = screen.getByRole('group', { name: 'Narrow to a book' });
    const romans = within(pills).getByRole('button', { name: 'Romans: 1' });
    expect(romans.getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(romans);
    expect(romans.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(/But God proves His love/)).toBeDefined();
    await userEvent.click(romans);
    expect(romans.getAttribute('aria-pressed')).toBe('false');
    // What points in reaches Genesis instead.
    await userEvent.click(screen.getByRole('tab', { name: '1 points in' }));
    expect(within(pills).getByRole('button', { name: 'Genesis: 1' })).toBeDefined();
    expect(within(pills).queryByRole('button', { name: 'Romans: 1' })).toBeNull();
  });

  it('groups the list under the books it lands in, in the order of the canon', () => {
    const data = createVizData(
      [
        { from: JOHN_3_16, to: ROM_5_8, votes: 50 },
        { from: JOHN_3_16, to: GEN_1_1, votes: 10 },
        { from: JOHN_3_16, to: verseIndex('Rom', 8, 32), votes: 60 },
      ],
      new Map([[JOHN_3_16, 'For God so loved the world…']]),
    );
    render(
      <PassageCard
        data={data}
        passage={versePassage(JOHN_3_16)}
        filter={DEFAULT_LINK_FILTER}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        shareUrl={() => 'https://example.org/'}
      />,
    );
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Genesis', 'Romans']);
    // Within Romans, the surer link first.
    const rows = screen
      .getAllByRole('button', { name: /^(Genesis|Romans) / })
      .map((b) => b.textContent);
    expect(rows[0]).toMatch(/^Genesis 1:1/);
    expect(rows[1]).toMatch(/^Romans 8:32/);
    expect(rows[2]).toMatch(/^Romans 5:8/);
  });

  it('shows the first of a long list, and the rest on request', async () => {
    const links = Array.from({ length: 30 }, (_, i) => ({
      from: JOHN_3_16,
      to: verseIndex('Rom', 1, i + 1),
      votes: 30,
    }));
    const data = createVizData(links, new Map([[JOHN_3_16, 'For God so loved the world…']]));
    render(
      <PassageCard
        data={data}
        passage={versePassage(JOHN_3_16)}
        filter={DEFAULT_LINK_FILTER}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        shareUrl={() => 'https://example.org/'}
      />,
    );
    expect(screen.getAllByRole('button', { name: /^Romans 1:/ })).toHaveLength(24);
    await userEvent.click(screen.getByRole('button', { name: 'Show all 30' }));
    expect(screen.getAllByRole('button', { name: /^Romans 1:/ })).toHaveLength(30);
  });

  it('shows actions the host gives it', () => {
    renderPanel(versePassage(JOHN_3_16), {
      actions: <button type="button">Read in context</button>,
    });
    expect(screen.getByRole('button', { name: 'Read in context' })).toBeDefined();
  });

  it('previews a connection when one is pointed at, and stops when it is not', async () => {
    const onPreview = vi.fn();
    renderPanel(versePassage(JOHN_3_16), { onPreview });
    const row = screen.getByText(/But God proves His love/).closest('div[class*="row"]');
    await userEvent.hover(row as HTMLElement);
    await userEvent.unhover(row as HTMLElement);
    expect(onPreview).toHaveBeenCalledWith(null);
  });

  it('notes a verse the translation leaves out', () => {
    const data = createVizData([], new Map([[verseIndex('Matt', 17, 21), '']]));
    render(
      <PassageCard
        data={data}
        passage={versePassage(verseIndex('Matt', 17, 21))}
        filter={DEFAULT_LINK_FILTER}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        shareUrl={() => 'https://example.org/'}
      />,
    );
    expect(screen.getByText(/Omitted in the BSB/)).toBeDefined();
  });
});
