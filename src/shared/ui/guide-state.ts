import { useSyncExternalStore } from 'react';

/**
 * Whether the guide is open, outside React: a "?" button in either view opens it, and one
 * dialog, mounted once by the host, shows it — so both views stay mounted and still share it.
 */
let open = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setGuideOpen(value: boolean): void {
  if (open === value) {
    return;
  }
  open = value;
  for (const listener of listeners) {
    listener();
  }
}

export function useGuideOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open);
}
