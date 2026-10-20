import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Mark } from './Mark.tsx';
import { MARK_STROKES } from './mark-paths.ts';

describe('Mark', () => {
  it('draws every stroke of the mark, as decoration beside the name', () => {
    const { container } = render(<Mark className="mark" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('class')).toBe('mark');
    const drawn = [...container.querySelectorAll('path')].map((path) => path.getAttribute('d'));
    expect(drawn).toEqual(MARK_STROKES);
  });
});
