import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FiltersIcon } from '../../../shared/ui/icons.tsx';
import { MenuButton } from './MenuButton.tsx';

function renderMenu(props: Partial<Parameters<typeof MenuButton>[0]> = {}) {
  return render(
    <MenuButton label="Filters" icon={FiltersIcon} {...props}>
      <p>menu contents</p>
    </MenuButton>,
  );
}

describe('MenuButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts closed', () => {
    renderMenu();
    expect(screen.queryByText('menu contents')).toBeNull();
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false');
  });

  it('opens and closes on its own button', async () => {
    renderMenu();
    const button = screen.getByRole('button');
    await userEvent.click(button);
    expect(screen.getByText('menu contents')).toBeDefined();
    await userEvent.click(button);
    expect(screen.queryByText('menu contents')).toBeNull();
  });

  it('closes when something outside it is used', async () => {
    render(
      <div>
        <MenuButton label="Filters">
          <p>menu contents</p>
        </MenuButton>
        <button type="button">elsewhere</button>
      </div>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByText('menu contents')).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }));
    expect(screen.queryByText('menu contents')).toBeNull();
  });

  it('closes when the dimmed page behind its sheet is tapped, as on a phone', async () => {
    const { container } = renderMenu();
    await userEvent.click(screen.getByRole('button'));
    const scrim = container.querySelector('[class*="menuScrim"]');
    expect(scrim).not.toBeNull();
    await userEvent.click(scrim ?? container);
    expect(screen.queryByText('menu contents')).toBeNull();
  });

  it('leaves a sheet where it is, since a sheet is already the width of the screen', async () => {
    // On a phone the stylesheet makes the popover a fixed sheet; the nudge that keeps a popover
    // inside the viewport would push a sheet sideways.
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
      const style = real(element, pseudo);
      const isPopover = element instanceof HTMLElement && element.textContent === 'menu contents';
      return isPopover
        ? new Proxy(style, {
            get: (target, key): unknown =>
              key === 'position' ? 'fixed' : (Reflect.get(target, key) as unknown),
          })
        : style;
    });
    renderMenu();
    await userEvent.click(screen.getByRole('button'));
    const popover = screen.getByText('menu contents').parentElement;
    expect(popover?.style.translate).toBe('');
  });

  it('stays open while the menu itself is used', async () => {
    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    await userEvent.click(screen.getByText('menu contents'));
    expect(screen.getByText('menu contents')).toBeDefined();
  });

  it('closes on Escape', async () => {
    renderMenu();
    await userEvent.click(screen.getByRole('button'));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('menu contents')).toBeNull();
  });

  it('ignores keys that are not Escape', async () => {
    renderMenu();
    await userEvent.click(screen.getByRole('button'));
    // Enter and Space would activate the focused button, which is the browser's own doing.
    await userEvent.keyboard('{ArrowDown}x');
    expect(screen.getByText('menu contents')).toBeDefined();
  });

  it('wears its value in place of its name, so the setting is readable at a glance', () => {
    renderMenu({ value: 'KJV' });
    const button = screen.getByRole('button');
    expect(button.textContent).toContain('KJV');
    expect(button.getAttribute('aria-label')).toBe('Filters: KJV');
  });

  it('is named for itself when it shows no value', () => {
    renderMenu();
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Filters');
  });

  it('says when its settings differ from the defaults', () => {
    renderMenu({ indicator: true, changedLabel: 'Filters (changed)' });
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Filters (changed)');
  });

  it('keeps its plain name when it is marked changed but given no changed name', () => {
    renderMenu({ indicator: true });
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Filters');
  });

  it('says when the choice is still being applied', () => {
    renderMenu({ value: 'KJV', busy: true });
    expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('true');
  });

  it('is not busy by default', () => {
    renderMenu();
    expect(screen.getByRole('button').getAttribute('aria-busy')).toBeNull();
  });

  it('points at the popover it controls', async () => {
    renderMenu();
    const button = screen.getByRole('button');
    await userEvent.click(button);
    const id = button.getAttribute('aria-controls');
    expect(document.getElementById(id ?? '')?.textContent).toBe('menu contents');
  });

  it('stops listening once it is gone', async () => {
    const { unmount } = renderMenu();
    await userEvent.click(screen.getByRole('button'));
    unmount();
    // No listener should survive to act on this.
    await userEvent.keyboard('{Escape}');
    expect(document.body.textContent).toBe('');
  });
});
