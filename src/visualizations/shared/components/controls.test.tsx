import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GENRES } from '../../../core/bible/genres.ts';
import { CANONICAL_VERSIFICATION } from '../../../core/bible/versification.ts';
import { verseIndex } from '../../../test-utils/fixtures.ts';
import { GenreToggles } from './GenreToggles.tsx';
import { ReferenceSearch } from './ReferenceSearch.tsx';

describe('ReferenceSearch', () => {
  function renderSearch() {
    const onSelect = vi.fn();
    render(<ReferenceSearch versification={CANONICAL_VERSIFICATION} onSelect={onSelect} />);
    return { onSelect, input: screen.getByRole('searchbox') };
  }

  it('opens a verse that is typed in full', async () => {
    const { onSelect, input } = renderSearch();
    await userEvent.type(input, 'John 3:16{Enter}');
    expect(onSelect).toHaveBeenCalledWith({ kind: 'verse', verse: verseIndex('John', 3, 16) });
  });

  it.each(['jn 3 16', 'Gen.1.1', 'ps 23', 'JOHN 3:16'])(
    'accepts %s, the way a reader actually types it',
    async (typed) => {
      const { onSelect, input } = renderSearch();
      await userEvent.type(input, `${typed}{Enter}`);
      expect(onSelect).toHaveBeenCalled();
    },
  );

  it('opens a whole chapter when no verse is given', async () => {
    const { onSelect, input } = renderSearch();
    await userEvent.type(input, 'Psalm 23{Enter}');
    expect(onSelect).toHaveBeenCalledWith({ kind: 'chapter', book: 'Ps', chapter: 23 });
  });

  it('says what is wrong instead of doing nothing', async () => {
    const { onSelect, input } = renderSearch();
    await userEvent.type(input, 'Hesitations 4:4{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBeTruthy();
  });

  it('points the box at its own message, so it is announced', async () => {
    const { input } = renderSearch();
    await userEvent.type(input, 'nonsense{Enter}');
    const described = input.getAttribute('aria-describedby');
    expect(described).toBeTruthy();
    expect(document.getElementById(described ?? '')).not.toBeNull();
  });

  it('clears the message once the next reference is good', async () => {
    const { input } = renderSearch();
    await userEvent.type(input, 'nonsense{Enter}');
    expect(screen.getByRole('alert')).toBeDefined();
    await userEvent.clear(input);
    await userEvent.type(input, 'John 3:16{Enter}');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('does nothing for an empty box', async () => {
    const { onSelect, input } = renderSearch();
    await userEvent.type(input, '{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
  });

  describe('suggesting as it is typed', () => {
    it('offers the books the typing could become, and nothing for an empty box', async () => {
      const { input } = renderSearch();
      expect(screen.queryByRole('listbox')).toBeNull();
      await userEvent.type(input, 'ge');
      const list = screen.getByRole('listbox', { name: 'Suggestions' });
      expect(list.getAttribute('data-stage')).toBe('book');
      expect(screen.getByRole('option', { name: 'Genesis' })).toBeDefined();
    });

    it('walks from a book to its chapters to its verses, and goes to the verse tapped', async () => {
      const { onSelect, input } = renderSearch();
      await userEvent.type(input, 'ge');
      await userEvent.click(screen.getByRole('option', { name: 'Genesis' }));
      expect(input).toHaveProperty('value', 'Genesis ');
      expect(screen.getByRole('listbox').getAttribute('data-stage')).toBe('chapter');
      expect(screen.getAllByRole('option')).toHaveLength(50);

      await userEvent.click(screen.getByRole('option', { name: '2' }));
      expect(input).toHaveProperty('value', 'Genesis 2:');
      expect(screen.getByRole('listbox').getAttribute('data-stage')).toBe('verse');
      // The chapter itself leads the verses.
      expect(screen.getAllByRole('option')[0]?.textContent).toBe('Whole chapter');
      expect(screen.getAllByRole('option')).toHaveLength(26);

      await userEvent.click(screen.getByRole('option', { name: '3' }));
      expect(onSelect).toHaveBeenCalledWith({ kind: 'verse', verse: verseIndex('Gen', 2, 3) });
      expect(input).toHaveProperty('value', '');
      expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('opens the whole chapter from the first offer among its verses', async () => {
      const { onSelect, input } = renderSearch();
      await userEvent.type(input, 'Psalm 23:');
      await userEvent.click(screen.getByRole('option', { name: 'Whole chapter' }));
      expect(onSelect).toHaveBeenCalledWith({ kind: 'chapter', book: 'Ps', chapter: 23 });
    });

    it('narrows the numbers to the digits typed', async () => {
      const { input } = renderSearch();
      await userEvent.type(input, 'Genesis 2');
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        '2',
        '20',
        '21',
        '22',
        '23',
        '24',
        '25',
        '26',
        '27',
        '28',
        '29',
      ]);
    });

    it('can be walked with the arrow keys and chosen with Enter', async () => {
      const { onSelect, input } = renderSearch();
      await userEvent.type(input, 'judg');
      await userEvent.keyboard('{ArrowDown}');
      expect(input.getAttribute('aria-activedescendant')).toBe(
        screen.getByRole('option', { name: 'Judges' }).id,
      );
      expect(screen.getByRole('option', { name: 'Judges' }).getAttribute('aria-selected')).toBe(
        'true',
      );
      await userEvent.keyboard('{ArrowDown}{ArrowUp}{Enter}');
      expect(input).toHaveProperty('value', 'Judges ');
      expect(onSelect).not.toHaveBeenCalled();
      // Up from the first offer is none at all: Enter then submits the text as typed.
      await userEvent.keyboard('3{ArrowDown}{ArrowUp}{Enter}');
      expect(onSelect).toHaveBeenCalledWith({ kind: 'chapter', book: 'Judg', chapter: 3 });
    });

    it('closes on Escape, keeping what was typed, and comes back on the next keystroke', async () => {
      const { input } = renderSearch();
      await userEvent.type(input, 'ge');
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).toBeNull();
      expect(input).toHaveProperty('value', 'ge');
      await userEvent.type(input, 'n');
      expect(screen.getByRole('listbox')).toBeDefined();
    });

    it('closes when the focus goes elsewhere', async () => {
      render(<button type="button">elsewhere</button>);
      const { input } = renderSearch();
      await userEvent.type(input, 'ge');
      await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }));
      expect(screen.queryByRole('listbox')).toBeNull();
      await userEvent.click(input);
      expect(screen.getByRole('listbox')).toBeDefined();
    });

    it('offers nothing for text no reference starts with', async () => {
      const { input } = renderSearch();
      await userEvent.type(input, 'zzz');
      expect(screen.queryByRole('listbox')).toBeNull();
    });
  });
});

describe('GenreToggles', () => {
  it('shows every genre, grouped by testament', () => {
    render(<GenreToggles hiddenGenres={new Set()} onToggle={vi.fn()} />);
    expect(screen.getByText('Old Testament')).toBeDefined();
    expect(screen.getByText('New Testament')).toBeDefined();
    expect(screen.getAllByRole('button')).toHaveLength(GENRES.length);
  });

  it('marks a genre that is showing as pressed', () => {
    render(<GenreToggles hiddenGenres={new Set()} onToggle={vi.fn()} />);
    for (const button of screen.getAllByRole('button')) {
      expect(button.getAttribute('aria-pressed')).toBe('true');
    }
  });

  it('marks a hidden genre as not pressed', () => {
    render(<GenreToggles hiddenGenres={new Set(['law'])} onToggle={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Law/ }).getAttribute('aria-pressed')).toBe('false');
  });

  it('reports the genre that was toggled', async () => {
    const onToggle = vi.fn();
    render(<GenreToggles hiddenGenres={new Set()} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /Revelation/ }));
    expect(onToggle).toHaveBeenCalledWith('revelation');
  });
});
