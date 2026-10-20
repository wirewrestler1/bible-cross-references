import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { crossReferencesDatasetPath } from '../src/core/datasets/paths.ts';
import { vizCrossReferenceSource } from '../src/visualizations/shared/viz-datasets.ts';
import { ROOT_DIR } from './site.ts';

/**
 * How many links the dataset the app draws holds, read from `data/datasets.lock.json` — what
 * the last data build recorded — so the loading screen can say what is coming before the file
 * has arrived, without anyone typing the number. Zero when the lock file has no entry yet, as
 * on a fresh clone before the first `npm run data:build`.
 */
export function mergedLinkCount(): number {
  try {
    const lock = JSON.parse(
      readFileSync(resolve(ROOT_DIR, 'data/datasets.lock.json'), 'utf8'),
    ) as Record<string, { shape?: Record<string, number> }>;
    return lock[crossReferencesDatasetPath(vizCrossReferenceSource().id)]?.shape?.['links'] ?? 0;
  } catch {
    return 0;
  }
}
