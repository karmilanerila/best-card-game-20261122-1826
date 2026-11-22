// main.ts — the hand-in program for Scrapheap Showdown.
// It copies game/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from the
// kit's vendor/makefun-game.ts (unchanged). It runs twice under the
// grader and both runs must write the same bytes, so there is no clock,
// no randomness and no network here: plain recursive copies, then the
// dossier. The output directory is /output, or MAKEFUN_OUTPUT_DIR when
// the platform sets it (local runs use that to keep /output out of the way).

import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const rootDir = new URL('.', import.meta.url).pathname;

function handIn(): void {
  // Start from an empty output directory so a second run cannot leave
  // stale files behind and diverge from the first.
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const gameSrc = join(rootDir, 'game');
  const shotsSrc = join(rootDir, 'screenshots');
  if (!existsSync(gameSrc)) throw new Error('game/ is missing from the repository');
  if (!existsSync(shotsSrc)) throw new Error('screenshots/ is missing from the repository');

  cpSync(gameSrc, join(outDir, 'game'), { recursive: true });
  cpSync(shotsSrc, join(outDir, 'screenshots'), { recursive: true });

  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  // A one-line receipt on stdout: what was handed in and how big it is.
  console.log(`handed in ${outDir} (dossier ${dossier.length} bytes)`);
}

handIn();
