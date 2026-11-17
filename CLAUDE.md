# Bolt Sort — notes for Claude Code

Two games in one Android/iOS app, picked on a game chooser: **Bolt Sort** (calm color-sort puzzle: move
colored nuts between bolts until every bolt holds one color) and **Wit Twist** (100 trick puzzles). Full design: `docs/GAME_PLAN.md`. Work one phase at a time and tick its boxes there.

## Stack

TypeScript · Phaser 3 · Vite · Capacitor 8 (Android + iOS) · Vitest · ESLint · Prettier. npm workspaces.

## Folders

- `packages/core` — pure TypeScript, no graphics: rules (`rules.ts`), solver (`solver.ts`), generator
  (`generator.ts`, `build.ts`), difficulty (`analyze.ts`), stars/coins/boosters (`progress.ts`), stages.
  Everything else must call these; never re-implement a rule in a scene.
- `packages/services` — save data (Capacitor Preferences), audio (Web Audio synth), haptics, analytics,
  notifications, i18n (en + hi), streak, remote config defaults, and **placeholder** `AdsService` /
  `StoreService` (monetization phase).
- `packages/game` — Phaser scenes: Boot, Map, Level (runs every mode: stage, daily, blueprint, rush,
  zen), Modes (hub), Blueprint (level picker), Daily, Shop, Settings. `public/levels/*.json` are
  generated; do not hand-edit.
- `packages/game/src/wit` — Wit Twist: `levels.ts` (1–50) and `levels2.ts` (51–100), each with en+hi text, a `tag`
  (kids / all / eng badge), `build()` and a
  scripted `solve()`), `types.ts` (the toolkit API levels use). Scenes: GameSelect, WitMap, WitLevel.
  Puzzle text lives in `levels.ts` as `{ en, hi }` pairs; screen chrome text uses `t()`.
- `tools/e2e/wit-playthrough.cjs` — plays every Wit Twist puzzle in a browser via their `solve()`.
- `tools/level-gen` — CLI that builds `stage-XX.json` (`npm run levels`), and `check` to re-verify.
- `apps/server` — backend (Express + SQLite): OTP login (phone/email), Sign in with Google, accounts, subscriptions, house ads
  with click redirect `/r/:id`, admin panel `/admin`, `/delete-account`. See `apps/server/README.md`.
  The app talks to it through `ApiClient`/`AccountService`/`HouseAds` in `packages/services`;
  `VITE_API_URL` (in `packages/game/.env`) sets the address; empty = offline build, no login or ads.
- `apps/mobile` — Capacitor project (`android/`, `ios/`). Web assets come from `packages/game/dist`.

## Game rules (same in engine, solver and hints)

1. Bolt capacity 4 by default (5–6 later; short bolts 2–3).
2. Tap lifts the top run of same-colored nuts (stops at a hidden or frozen nut). Tap again = put back.
3. Drop onto an empty bolt or the same color; as many as fit move, the rest stay.
4. A bolt is complete when it holds every nut of one color → capped, can't be picked up.
5. Win = every bolt empty or complete. No legal move = "No moves left" (Undo / Restart / Extra Bolt).
6. Mechanics: hidden (`h`), frozen (`f` = thaws after N total moves; can't lift or drop onto it),
   locked bolt (`lock` color: opens when a bolt of that color completes), chained bolt (`chain` = bolt
   index that must complete), short bolts (`cap` 2–3), move limit (`moveLimit`), magnet tray (`magnet`:
   any color may be dropped on it), glue bolt (`glue`: nuts can be dropped in, never lifted out; starts
   with one stuck nut whose color must be finished there).
7. Blueprint levels (`goal`): win when every bolt matches its drawing exactly; any nut may be dropped on
   any nut where there is room; a bolt matching its drawing is capped.
8. Stars: 3 at ≤ best+2, 2 at ≤ best+5 (under best+6), else 1. Undo unlimited in stages 1–2, then 3 free.
9. Modes: Daily (always), Zen (level 8+), Blueprint (level 12+), Rush (level 20+; 120 s, +8 s per solve).

## Commands

- `npm test` — all unit tests (core rules/solver/generator, services, shipped level files)
- `npm run typecheck`, `npm run lint`, `npm run format`
- `npm run dev` — play in the browser (add `?debug` for the test hook `window.__game`)
- `npm run levels -- --stages 1-2` — regenerate stages; `npm run levels -- blueprint` — Blueprint set;
  `npm run levels -- check` — verify all
- `npm run android` / `npm run ios` — build, sync and open the native project

## Wit Twist rules

- A new puzzle must be our own idea (old public-domain riddles only in our own words); never copy
  levels, art or characters from other games.
- Use `{id:text}` in a question to make a word tappable/draggable; the same ids must exist in en and hi.
- Every puzzle needs a `solve()` that passes the playthrough in both languages.

## Graphics

- Layout is always 720 wide; the canvas is `RES`× bigger and each scene's camera zooms by `RES`
  (`view(this)` in `packages/game/src/view.ts` — call it for sizes, never `this.scale`).
- Use `pointer.worldX/worldY` (layout units), not `pointer.x/y`.
- Art is drawn in code with Canvas 2D in `textures.ts` at `HD`× size: show generated images with
  `setDisplaySize(...)` or `hd(image, scale)`, never a bare `setScale`.
- Buttons and panels are 9-slice (`button()`, `panel()` in `ui.ts`); font is Baloo 2 (bundled, has Hindi).

## Conventions

- Write core tests first; core must stay free of Phaser/DOM.
- All player text goes through `t()` in `packages/services/src/i18n.ts` (add the key to en and hi).
- Changing the save format: bump `SAVE_VERSION` and extend `migrate()`.
- Levels are deterministic from the seed; changing the generator changes levels — regenerate and run `check`.
  New pieces/options must not consume random numbers for older settings (shipped levels must stay identical).
