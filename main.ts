// main.ts — Ember Pact's hand-in program (Node 22, standard library only).
// It copies the finished game (game/) and its screenshots (screenshots/)
// from beside this file into the output directory, then writes
// dossier.json with the kit's vendored buildDossier library, exactly the
// summary the judge reads. Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The grader runs it twice and both runs must write identical bytes. The
// copy is a plain file copy and buildDossier is deterministic, so the two
// runs agree byte for byte as long as game/ and screenshots/ do not change
// between them — nothing here writes timestamps or random data.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function handIn(folder) {
  const source = join(repoRoot, folder);
  const target = join(outputDir, folder);
  if (!existsSync(source)) return;
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
handIn('game');
handIn('screenshots');

// The gate's own caps, as the kit documents them: the dossier text is
// capped at 160 KiB, at most 4 screenshots of 256 KiB each, and game/ stays
// under 993 entries and 48 MiB with no path over 1000 bytes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
