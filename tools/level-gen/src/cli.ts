/**
 * Bolt Sort level generator.
 *
 *   npm run levels                        # build stages 1–10 into packages/game/public/levels
 *   npm run levels -- --stages 1-2        # only stages 1 and 2
 *   npm run levels -- --stages 3 --seed 7 --candidates 8
 *   npm run levels -- blueprint           # build the 60 Blueprint-mode levels
 *   npm run levels -- check               # re-solve every shipped level and report problems
 *
 * Same seed → same levels, so level 137 is identical for every player and every rebuild.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyMove,
  buildBlueprints,
  buildStage,
  createState,
  isWon,
  solve,
  STAGES,
  type StageFile,
} from '@bolt-sort/core';

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = resolve(here, '../../../packages/game/public/levels');

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) args[a.slice(2)] = argv[++i] ?? '';
    else rest.push(a);
  }
  return { args, rest };
}

function parseStages(s: string | undefined): number[] {
  if (!s) return STAGES.map((x) => x.stage);
  const out: number[] = [];
  for (const part of s.split(',')) {
    const [a, b] = part.split('-').map(Number);
    for (let k = a; k <= (b || a); k++) out.push(k);
  }
  return out;
}

const fileName = (stage: number) => `stage-${String(stage).padStart(2, '0')}.json`;
const BLUEPRINT_FILE = 'blueprint.json';

function writeFile(out: string, name: string, file: StageFile, seed: number) {
  const body = file.levels.map((l) => '    ' + JSON.stringify(l)).join(',\n');
  const json = `{\n  "stage": ${file.stage},\n  "theme": ${JSON.stringify(file.theme)},\n  "version": ${file.version},\n  "seed": ${seed},\n  "levels": [\n${body}\n  ]\n}\n`;
  writeFileSync(join(out, name), json);
}

function writeIndex(out: string) {
  const stages = STAGES.filter((s) => existsSync(join(out, fileName(s.stage)))).map((s) => {
    const f = JSON.parse(readFileSync(join(out, fileName(s.stage)), 'utf8')) as StageFile;
    return { stage: s.stage, theme: s.theme, file: fileName(s.stage), levels: f.levels.length, first: f.levels[0].id };
  });
  const modes = existsSync(join(out, BLUEPRINT_FILE)) ? { blueprint: BLUEPRINT_FILE } : {};
  writeFileSync(join(out, 'index.json'), JSON.stringify({ version: 1, stages, modes }, null, 2) + '\n');
}

function generate(args: Record<string, string>) {
  const out = resolve(args.out ?? DEFAULT_OUT);
  const seed = Number(args.seed ?? 2026);
  const candidates = Number(args.candidates ?? 6);
  mkdirSync(out, { recursive: true });
  for (const stage of parseStages(args.stages)) {
    const t0 = Date.now();
    const file = buildStage(stage, seed, {
      candidates,
      onProgress: args.verbose ? (m) => console.log('  ' + m) : undefined,
    });
    // Compact layout, one level per line: small files, readable diffs.
    writeFile(out, fileName(stage), file, seed);
    const counts = { normal: 0, hard: 0, superhard: 0 };
    for (const l of file.levels) counts[l.difficulty]++;
    const bests = file.levels.map((l) => l.best);
    const inexact = file.levels.filter((l) => !l.bestExact).length;
    console.log(
      `${fileName(stage)}  ${file.theme.padEnd(15)} best moves ${Math.min(...bests)}–${Math.max(...bests)}  ` +
        `normal ${counts.normal} / hard ${counts.hard} / super hard ${counts.superhard}` +
        (inexact ? `  (${inexact} upper bounds)` : '') +
        `  ${((Date.now() - t0) / 1000).toFixed(1)}s`,
    );
  }
  writeIndex(out);
  console.log(`Wrote ${out}`);
}

function blueprint(args: Record<string, string>) {
  const out = resolve(args.out ?? DEFAULT_OUT);
  const seed = Number(args.seed ?? 2026);
  const t0 = Date.now();
  const file = buildBlueprints(seed, { onProgress: args.verbose ? (m) => console.log('  ' + m) : undefined });
  writeFile(out, BLUEPRINT_FILE, file, seed);
  const bests = file.levels.map((l) => l.best);
  console.log(
    `${BLUEPRINT_FILE}  best moves ${Math.min(...bests)}–${Math.max(...bests)}  ${((Date.now() - t0) / 1000).toFixed(1)}s`,
  );
  writeIndex(out);
}

function check(args: Record<string, string>) {
  const out = resolve(args.out ?? DEFAULT_OUT);
  let problems = 0;
  let total = 0;
  const files = STAGES.map((s) => fileName(s.stage)).concat(BLUEPRINT_FILE);
  for (const name of files) {
    const p = join(out, name);
    if (!existsSync(p)) continue;
    const file = JSON.parse(readFileSync(p, 'utf8')) as StageFile;
    for (const l of file.levels) {
      total++;
      const start = createState(l);
      const r = solve(start);
      let st = start;
      for (const m of r.path) st = applyMove(st, m.from, m.to)!;
      const ok = r.solvable === true && isWon(st) && r.path.length <= l.best;
      if (!ok) {
        problems++;
        console.log(`level ${l.id}: solvable=${r.solvable} found=${r.path.length} stored best=${l.best}`);
      }
    }
  }
  console.log(
    problems
      ? `${problems} problem(s) in ${total} levels`
      : `All ${total} levels solvable and match their best move counts.`,
  );
  process.exitCode = problems ? 1 : 0;
}

const { args, rest } = parseArgs(process.argv.slice(2));
if (rest[0] === 'check') check(args);
else if (rest[0] === 'blueprint') blueprint(args);
else generate(args);
