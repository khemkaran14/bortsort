# Bolt Sort — notes for Claude Code

Calm color-sort puzzle for Android and iOS. Players move colored nuts between bolts until every bolt
holds one color. Full design: `docs/GAME_PLAN.md`. Work one phase at a time and tick its boxes there.

## Stack

TypeScript · Phaser 3 · Vite · Capacitor 8 (Android + iOS) · Vitest · ESLint · Prettier. npm workspaces.

## Folders

- `packages/core` — pure TypeScript, no graphics: rules (`rules.ts`), solver (`solver.ts`), generator
  (`generator.ts`, `build.ts`), difficulty (`analyze.ts`), stars/coins/boosters (`progress.ts`), stages.
  Everything else must call these; never re-implement a rule in a scene.
- `packages/services` — save data (Capacitor Preferences), audio (Web Audio synth), haptics, analytics,
  notifications, i18n (en + hi), streak, remote config defaults, and **placeholder** `AdsService` /
  `StoreService` (monetization phase).
- `packages/game` — Phaser scenes: Boot, Map, Level, Daily, Shop, Settings. `public/levels/*.json` are
  generated; do not hand-edit.
- `tools/level-gen` — CLI that builds `stage-XX.json` (`npm run levels`), and `check` to re-verify.
- `apps/mobile` — Capacitor project (`android/`, `ios/`). Web assets come from `packages/game/dist`.

## Game rules (same in engine, solver and hints)

1. Bolt capacity 4 by default (5–6 later; short bolts 2–3).
2. Tap lifts the top run of same-colored nuts (stops at a hidden or frozen nut). Tap again = put back.
3. Drop onto an empty bolt or the same color; as many as fit move, the rest stay.
4. A bolt is complete when it holds every nut of one color → capped, can't be picked up.
5. Win = every bolt empty or complete. No legal move = "No moves left" (Undo / Restart / Extra Bolt).
6. Mechanics: hidden (`h`), frozen (`f` = thaws after N total moves; can't lift or drop onto it),
   locked bolt (`lock` color: opens when a bolt of that color completes), chained bolt (`chain` = bolt
   index that must complete), short bolts (`cap` 2–3), move limit (`moveLimit`).
7. Stars: 3 at ≤ best+2, 2 at ≤ best+5 (under best+6), else 1. Undo unlimited in stages 1–2, then 3 free.

## Commands

- `npm test` — all unit tests (core rules/solver/generator, services, shipped level files)
- `npm run typecheck`, `npm run lint`, `npm run format`
- `npm run dev` — play in the browser (add `?debug` for the test hook `window.__game`)
- `npm run levels -- --stages 1-2` — regenerate stages; `npm run levels -- check` — verify all
- `npm run android` / `npm run ios` — build, sync and open the native project

## Conventions

- Write core tests first; core must stay free of Phaser/DOM.
- All player text goes through `t()` in `packages/services/src/i18n.ts` (add the key to en and hi).
- Changing the save format: bump `SAVE_VERSION` and extend `migrate()`.
- Levels are deterministic from the seed; changing the generator changes levels — regenerate and run `check`.
