// main.ts — hand-in for Scrapheap Showdown (round 3 fix).
//
// Copies game/ and screenshots/ from this repo into the output directory
// and writes dossier.json there, using buildDossier from the kit's
// vendor/makefun-game.ts (unchanged). The program must run twice under
// the grader and produce identical bytes both times, so there is no
// clock, no randomness and no network: plain recursive copies, then the
// dossier, then a one-line receipt on stdout.
//
// One deliberate rule: the output directory itself is NEVER deleted.
// In the grader /output is a mounted volume, and removing a mount point
// fails (EBUSY) and aborts the run. We only create it if missing
// (mkdirSync with recursive:true is a no-op when it already exists),
// then copy into it. That matches the round-1 program, which passed.

import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const repoRoot = dirname(fileURLToPath(import.meta.url));

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
} as const;

function copyInputs(): void {
  const gameDir = join(repoRoot, 'game');
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(gameDir)) {
    throw new Error(`game/ is missing from the repository at ${gameDir}`);
  }
  if (!existsSync(shotsDir)) {
    throw new Error(`screenshots/ is missing from the repository at ${shotsDir}`);
  }
  cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

function verifyHandIn(): void {
  // Read the dossier back and confirm it parses and lists handed-in
  // files, so a partial write cannot slip by. (No byte comparison here:
  // buildDossier returns bytes, and a second call would see the file
  // it just wrote, so only a structural check is valid.)
  const onDisk = readFileSync(join(outputDir, 'dossier.json'), 'utf8');
  const dossier = JSON.parse(onDisk) as { images?: unknown[]; text?: unknown };
  if (!Array.isArray(dossier.images) || dossier.images.length === 0) {
    throw new Error('dossier.json lists no screenshots');
  }
  if (typeof dossier.text !== 'string' || dossier.text.length === 0) {
    throw new Error('dossier.json has no text section');
  }
}

function main(): void {
  // Create the output directory if it is not there yet; never remove it.
  mkdirSync(outputDir, { recursive: true });
  copyInputs();
  const dossier = buildDossier(outputDir, DOSSIER_CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  verifyHandIn();
  console.log(`handed in ${outputDir} (dossier ${dossier.length} bytes)`);
}

main();
