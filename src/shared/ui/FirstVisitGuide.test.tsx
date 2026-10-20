import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GUIDE_PREFERENCE, preferenceKey } from '../lib/preference-keys.ts';
import { writePreference } from '../lib/preferences.ts';
import { FirstVisitGuide, GuideButton } from './FirstVisitGuide.tsx';
import { setGuideOpen } from './guide-state.ts';

describe('FirstVisitGuide', () => {
  beforeEach(() => {
    // Written through the module, which mirrors storage in memory: clearing storage alone
    // would leave the last test's answer in that mirror.
    writePreference(GUIDE_PREFERENCE, '');
    setGuideOpen(false);
  });
  afterEach(() => {
    setGuideOpen(false);
  });

  it('opens on a first visit and names every kind of line', () => {
    render(<FirstVisitGuide />);
    const dialog = screen.getByRole('dialog', { name: 'How to read this' });
    expect(dialog.textContent).toContain('Classic references');
    expect(dialog.textContent).toContain('Similar wording');
    expect(dialog.textContent).toContain('Weight');
  });

  it('stays closed once it has been dismissed, and remembers that', async () => {
    render(<FirstVisitGuide />);
    await userEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem(preferenceKey(GUIDE_PREFERENCE))).toBe('seen');
  });

  it('does not come back on its own for a reader who has seen it', () => {
    writePreference(GUIDE_PREFERENCE, 'seen');
    render(<FirstVisitGuide />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens again from the button, and closes on Escape', async () => {
    writePreference(GUIDE_PREFERENCE, 'seen');
    render(
      <>
        <GuideButton />
        <FirstVisitGuide />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'How to read this' }));
    expect(screen.getByRole('dialog')).toBeDefined();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes when the dimmed background is touched', async () => {
    render(<FirstVisitGuide />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.parentElement).not.toBeNull();
    await userEvent.click(dialog.parentElement ?? dialog);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
