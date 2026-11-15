# Bolt Sort

A calm, brain-teasing color-sort puzzle for **Android and iOS**. Move the colored nuts between bolts
until every bolt holds one color. 500 hand-checked levels in 10 themed stages, 8 special mechanics,
a Daily Challenge, login streaks, stage chests, boosters and cosmetic skins, and it all works offline.

_"Bolt Sort" is a working title. Check the final name and icon for trademark clashes before launch._

## Quick start

```bash
npm install
npm test            # 44 tests: rules, every mechanic, solver, generator, saves, shipped levels
npm run dev         # play in the browser at http://localhost:5173
```

## Build for phones

```bash
npm run android     # builds the game, syncs Capacitor, opens Android Studio
npm run ios         # same for Xcode (needs a Mac)
```

Every push to GitHub runs the tests and builds a **debug APK** (Actions → CI → artifacts) that you can
install on an Android phone to test.

For store releases: in Android Studio use _Build → Generate Signed App Bundle_ (.aab) with your own
keystore (never commit it). For iOS, archive in Xcode and upload to App Store Connect / TestFlight.
App id: `com.divyrs.boltsort` (change it in `apps/mobile/capacitor.config.json` **before** the
first store upload, because it can't be changed afterwards).

## Levels

```bash
npm run levels                      # regenerate all 10 stages (~20 min)
npm run levels -- --stages 1-2      # just some stages
npm run levels -- check             # re-solve all 500 levels and confirm best move counts
```

Each level is generated from a seed, solved with an exact A* search (every shipped level has a proven
optimal move count), scored for difficulty (best moves, dead-end ratio from random play-outs, trap
first moves, spare bolts, mechanics), placed on the stage's sawtooth curve (Hard at 8, breather at 9,
Boss at 10 of every block) and labelled Normal / Hard / Super Hard.

## Structure

| Folder              | What                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| `packages/core`     | Rules, mechanics, solver, hints, generator, stars and coins. Pure TypeScript, fully tested             |
| `packages/services` | Save data, audio, haptics, analytics, notifications, Hindi and English text, monetization placeholders |
| `packages/game`     | Phaser scenes: Map, Level, Daily, Shop, Settings                                                       |
| `tools/level-gen`   | Level generator CLI                                                                                    |
| `apps/mobile`       | Capacitor Android and iOS projects                                                                     |

See `docs/GAME_PLAN.md` for the full plan and progress, and `CLAUDE.md` for working rules.
