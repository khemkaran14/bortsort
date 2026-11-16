# Bolt Sort – Game Design & Build Plan

14 Nov 2026 · Khemkaran Singh

## Overview

Bolt Sort is a calm, brain-teasing color-sort puzzle for Android and iOS, launched as a free game.
Players move colored nuts between bolts until every bolt holds one color. The full game adds a world
map of themed stages, new mechanics every few stages, daily challenges and light progression so
players come back every day.

- **Players:** casual puzzle fans aged 18–55, commuters and short-break players; sessions of 2–10 minutes.
- **Platforms:** Android (Google Play) and iOS (App Store) from one shared codebase; phones first, tablets supported.
- **Launch content:** 500 hand-checked levels across 10 stages, plus daily challenges. Add 100 levels each month after launch.
- **Works offline:** every level and core feature plays without internet.
- **Success goals (first 90 days):** D1 retention ≥ 40%, D7 ≥ 15%, 3+ sessions/day, rating ≥ 4.5, crash-free sessions > 99.5%.
- **Name:** "Bolt Sort" is a working title. Check the final name and icon do not copy any existing game's name, art or branding before launch.

## Core gameplay

Tap a bolt to lift its top nuts, then tap a target bolt to drop them. Every rule is the same in the
game engine, the level solver and the hint system (`packages/core/src/rules.ts`).

1. **Bolts and nuts:** each bolt holds a fixed number of nuts (capacity). Default 4; later stages 5 and 6.
2. **Lift:** tapping a bolt lifts the top group of same-colored nuts. Tapping it again puts them back.
3. **Drop rule:** nuts can drop onto an empty bolt or onto a nut of the same color. As many as fit are moved; the rest stay on the source bolt.
4. **Bolt complete:** a bolt holding every nut of one color gets a cap, a sound and a spark. Completed bolts can't be picked up.
5. **Win:** all bolts are empty or complete. Result screen with stars and move count.
6. **Stuck:** if no legal move exists, show "No moves left" with Undo, Restart and Extra Bolt. Never leave the player without an action.
7. **Undo:** unlimited in stages 1–2; 3 free per level after that, then Undo pack boosters.
8. **Controls:** tap, with drag-and-drop as an option. Haptics on lift, drop, invalid move and bolt complete.

A good level makes the player plan 3–5 moves ahead, because empty bolts are scarce and the wrong drop blocks a color.

## Stages and level progression

| Stage | Theme          | Levels  | Colors | Capacity | New idea taught                                          |
| ----- | -------------- | ------- | ------ | -------- | -------------------------------------------------------- |
| 1     | Garage Bench   | 1–50    | 3–5    | 4        | Basic moves, Undo, Hint                                  |
| 2     | Bike Shop      | 51–100  | 4–6    | 4        | Fewer empty bolts (only 1 spare in some levels)          |
| 3     | Clock Tower    | 101–150 | 5–7    | 4        | Hidden nuts (shown as ? until uncovered)                 |
| 4     | Shipyard       | 151–200 | 5–7    | 5        | Taller bolts (capacity 5)                                |
| 5     | Rail Yard      | 201–250 | 6–8    | 5        | Locked bolt (opens when a key color is completed)        |
| 6     | Power Plant    | 251–300 | 6–8    | 5        | Frozen nuts (thaw after a set number of moves)           |
| 7     | Space Dock     | 301–350 | 7–9    | 5        | Short bolts (capacity 2–3 mixed with normal bolts)       |
| 8     | Robot Factory  | 351–400 | 7–10   | 6        | Move limit levels                                        |
| 9     | Deep Sea Rig   | 401–450 | 8–10   | 6        | Chained bolts (blocked until a linked bolt is completed) |
| 10    | Grand Workshop | 451–500 | 8–12   | 4–6      | Mixed mechanics finale                                   |
| 11    | Magnet Works   | 501–550 | 6–9    | 5        | Magnet tray (any color sticks on it) — update 1          |
| 12    | Glue Factory   | 551–600 | 6–9    | 5        | Glue bolt (nuts stick for good) — update 1               |

- **Sawtooth inside each stage:** blocks of 10. Levels 1–7 build up, 8 is Hard, 9 is a breather, 10 is a Boss with a bigger reward.
- **Labels:** Normal, Hard and Super Hard, with a colored badge.
- **Unlocking:** a stage opens when the previous stage's last level is cleared. No energy or lives system.

## Special mechanics

Each mechanic is introduced with a tutorial level (the first level of its stage), then mixed into later levels. The solver supports every mechanic, so all levels are provably solvable.

| Mechanic          | How it works                                                       | Why it makes players think           |
| ----------------- | ------------------------------------------------------------------ | ------------------------------------ |
| Hidden nuts       | Nuts below the top show as "?" until they become the top nut       | Planning with incomplete information |
| Fewer spare bolts | One empty bolt instead of two                                      | Every move matters                   |
| Taller bolts      | Capacity 5 or 6                                                    | Longer planning chains               |
| Locked bolt       | Padlock with a color; opens when a bolt of that color is completed | Choose which color to finish first   |
| Frozen nut        | Ice with a counter; can be lifted after that many moves            | Timing and ordering                  |
| Short bolts       | Some bolts hold only 2 or 3 nuts                                   | Breaks habits; tight spaces          |
| Move limit        | Finish within solver's best + a margin                             | Efficient thinking; replay value     |
| Chained bolt      | Usable once a linked bolt is completed                             | A dependency to plan around          |

| Magnet tray | Small red bolt where any color can be dropped on any other; only the top run lifts off | A free-form parking stack: what you bury, you must dig out later |
| Glue bolt | Starts with one stuck nut; nuts dropped in can never be lifted out | Commitment: every drop there is final, so that color must be gathered first |

After launch: at most one new mechanic per monthly update, tested in 20+ levels first.

## Engagement systems

1. **Stars** (launch): 3 stars at ≤ best + 2 moves, 2 stars under best + 6, else 1. Stars unlock stage chests.
2. **Coins** (launch): per level (more for Hard, Boss and 3 stars). Spent on boosters and skins. No real money at launch.
3. **Boosters** (launch): Undo pack (5), Extra Bolt, Hint (next best move from the solver), Reveal Hidden (3 moves).
4. **Daily Challenge** (launch): same level for every player each day, calendar, monthly trophy for 20+ days.
5. **Login streak:** day 1–7 rewards (coins, booster, skin on day 7); one free streak freeze per week.
6. **Stage chests:** 120 of 150 stars opens the chest (coins + a cosmetic).
7. **Cosmetics:** nut skins (metal, wood, gems, candy, neon), bolt skins. Never change difficulty.
8. **Weekly event:** 7-day themed run of 20 levels with its own reward track.
9. **Achievements:** hooked into Google Play Games and Apple Game Center.
10. **Leaderboards** (later): fewest moves on the Daily Challenge.
11. **Zen mode** (later): endless random levels, no stars or move counts.

Notifications: at most one per day (daily challenge, streak at risk, new event), each type can be switched off.

## Play modes (what makes Bolt Sort different)

Besides the stage map, a **Modes** screen offers four other ways to play. Each opens as the player
progresses, so there is always something new to unlock.

| Mode            | Opens at | How it plays                                                                                                                                                                          |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Daily Challenge | start    | One level per day, the same for everyone; calendar and monthly trophy.                                                                                                                |
| Zen Garden      | level 8  | Endless calm puzzles made on the phone; no move counter, no timer, free hints, +3 coins each.                                                                                         |
| Blueprint       | level 12 | 60 levels where you **copy a drawing** (stripes, steps, sandwiches) instead of sorting by color. Any nut may be dropped on any nut, so it is a rearranging puzzle, not a sorting one. |
| Rush Hour       | level 20 | 120 seconds of small puzzles; +8 s per solve, combo bonus for quick solves, efficiency bonus, personal best. Skip costs 5 s.                                                          |

Blueprint levels are made by scrambling the finished drawing a set number of moves, then solved
exactly; Zen and Rush puzzles are generated and solved on the device in a few milliseconds.

## Second game: Wit Twist (trick puzzles)

The app opens on a **game chooser**: Bolt Sort or **Wit Twist**. Coins are shared, so either game
helps the other. ("Wit Twist" is a working title: run the same trademark check as for Bolt Sort.)

Wit Twist is a lateral-thinking puzzle game: each level asks a short question and the obvious answer
is usually wrong. 50 launch puzzles, written from scratch for this app (a few use old public-domain
riddles in our own words; no levels, art or characters are taken from any other game).

- **Ways to answer:** tap objects, drag objects, tap or drag words of the question itself, number
  pad, answer buttons, tap in order, or simply wait.
- **Examples:** the smallest dot is the full stop in the question; drag “NOT” out of “Do NOT tap the
  star”; move the hole to the ball; fox-chick-corn river crossing; 3 L / 5 L jugs; lights-out grid.
- **Help:** 3 free hints, then 25 coins each; skip a puzzle for 60 coins. +10 coins per first solve.
- **Languages:** every question, hint and explanation in English and Hindi.
- **Testing:** every level has a scripted solution; `tools/e2e/wit-playthrough.cjs` plays all 50
  with real touch events in a browser (both languages pass).
- **Code:** `packages/game/src/wit/` (levels and toolkit), scenes `GameSelect`, `WitMap`, `WitLevel`.
- **Next:** 25 new puzzles per monthly update; a daily trick puzzle; a "Wit Twist" store listing of
  its own later if it grows (the code is already separate).

## Level generation and difficulty tuning

1. **Generator** (`tools/level-gen`, Node.js): stage settings → random candidates from a seed.
2. **Solver:** exact A* search (consistent lower-bound heuristic, so the first solution is optimal — same answer as breadth-first search, much faster) with weighted-search fallback. Records solvable, best moves, dead-end ratio, winning first moves.
3. **Difficulty score:** best moves, dead-end ratio, trap first moves, spare bolts, mechanic count → Normal / Hard / Super Hard.
4. **Selection:** fits the sawtooth curve, rejects duplicates.
5. **Output:** `packages/game/public/levels/stage-XX.json` (layout, seed, best moves, star thresholds, difficulty).
6. **Human check:** play every Boss level and every mechanic tutorial level before release.
7. **Live tuning:** if > 40% quit a level or use 3+ hints, lower its difficulty or swap it.

The Hint button uses the same solver at runtime, from the player's current position.

## Look, feel, audio and accessibility

- Clean 2D original art; each stage has its own background and palette; 60 fps on mid-range phones.
- Nuts spin as they lift and screw down when they drop; spark and cap on a completed bolt; confetti on win.
- Metallic click on lift, thread sound on drop, chime on complete; calm music per stage; separate music/SFX switches.
- Haptics light on lift/drop, stronger on complete; can be switched off.
- Color-blind setting adds a symbol on each nut; default palette distinguishable for common color blindness.
- Portrait only; bolts arrange in 1–3 rows; safe areas respected.
- English and Hindi at launch, all text in translation files.
- First-time flow: 3 tutorial levels with a pointing hand; no sign-up; level 1 starts within 10 seconds.

## Tech stack and architecture

TypeScript + Phaser 3 + Capacitor (one codebase for both stores plus a web version for marketing).

- `packages/core` – rules, mechanics, solver, level format, star and coin rules. Unit-tested (Vitest).
- `packages/game` – Phaser scenes: Boot, World Map, Level, Daily Challenge, Shop (with Collections), Settings.
- `packages/services` – save data, analytics, notifications, audio, haptics, placeholders for ads and purchases.
- `tools/level-gen` – generator and difficulty tool.
- `apps/mobile` – Capacitor project with `android` and `ios`.

Plugins: Preferences, Haptics, Local Notifications, App, Splash Screen. Firebase (Analytics, Crashlytics, Remote Config) in Phase 3.

You need: a Google Play developer account, an Apple Developer Program membership, and a Mac with Xcode (or a cloud build service such as Codemagic) for iOS.

## Data, analytics and backend

No custom server at launch.

- **Save data on device:** level, stars, coins, boosters, skins, streak, daily calendar, settings; versioned with migration.
- **Cloud save** (Phase 3): optional Google Play Games / Game Center sign-in.
- **Remote Config:** star thresholds, rewards, booster prices, daily level, ad frequency, products, cross-promos.
- **Events:** level_start, level_win, level_quit, booster_used, coins_earned, coins_spent, daily_challenge_played, streak_day, tutorial_step, notification_opened.
- **Privacy:** privacy policy, Play Data safety form, Apple privacy labels, DPDP Act (India) and GDPR. No personal data beyond analytics.

## Build phases and milestones

### Phase 0 – Setup

- [x] Create the repository with the folder structure
- [x] TypeScript, Vite, Phaser 3, Vitest, ESLint and Prettier
- [x] Capacitor with Android and iOS projects
- [ ] Run on a real Android phone (install the CI debug APK, or `npm run android`)

### Phase 1 – Core engine

- [x] Rules in `packages/core` (no web prototype was in the repo; written from this plan)
- [x] Every special mechanic in the rules
- [x] Solver and hint function, with unit tests for each mechanic
- [x] Level generator and difficulty score; stages 1–2 (and 3–10) generated

### Phase 2 – Playable game

- [x] Level scene with lift and drop animations, sounds and haptics
- [x] World map, result screen, settings, pause menu
- [x] Stars, coins, Undo, Hint and Extra Bolt (plus Reveal Hidden)
- [x] On-device save data and the 3-level tutorial
- [x] 100 levels playable end to end (all 500 are)

### Phase 3 – Engagement and content

- [x] Daily Challenge with calendar, login streak, stage chests
- [x] Cosmetic shop and collections (coins only)
- [ ] Achievements with Google Play Games and Game Center (stats are already tracked in the save)
- [ ] Firebase Analytics, Crashlytics and Remote Config (interfaces ready in `packages/services`)
- [x] All 500 launch levels generated and checked by the solver
- [ ] Weekly event

### Phase 4 – Polish and beta

- [ ] Final art, music and stage backgrounds (current art and sound are generated in code)
- [x] Color-blind symbols, Hindi translation
- [ ] Tablet layout review
- [ ] Performance check on a low-end Android phone (60 fps target)
- [ ] Closed testing on Google Play and TestFlight; fix top issues
- [ ] Human play-through of every Boss and tutorial level

### Phase 5 – Launch

- [ ] Store listings, screenshots and preview video
- [ ] Submit to both stores; India first, worldwide a week later

### Update 1 – More ways to play

- [x] Magnet tray and glue bolt pieces (rules, solver, generator, tests)
- [x] Stages 11–12 (levels 501–600)
- [x] Modes screen; Blueprint mode (60 levels); Rush Hour; Zen Garden
- [ ] Leaderboard for Rush Hour best score (with Play Games / Game Center)

### Update 2 – Second game: Wit Twist

- [x] Game chooser at launch; shared coins and settings
- [x] Puzzle toolkit (tap, drag, question words, keypad, choices, sequences, waiting)
- [x] 50 original puzzles in English and Hindi, all auto-played in a browser test
- [ ] Hand-play all 50 on a phone and tune hints and difficulty order

### Update 3 – Accounts, admin and house ads

- [x] Optional login with a one-time code by phone (SMS) or email; account screen with log out and delete
- [x] Server (`apps/server`) with admin panel: dashboard, users, progress, subscriptions (give/extend/cancel), block
- [x] House ads: full-screen (close ✕ after the seconds the admin sets) and banner; tap opens the advertiser's page via a click-counting redirect
- [x] Ad settings: on/off, frequency, first level, banners; subscribers never see ads
- [x] Web page to delete an account (Google Play requirement)
- [ ] Deploy the server (https) and set `VITE_API_URL`; SMS provider with DLT template; SMTP
- [ ] In-app subscription payment (Google Play Billing / App Store) feeding the same subscriptions table
- [ ] Update the privacy policy and store data-safety forms (phone/email are now collected)

### Phase 6 – Monetization and promotion (after launch)

- [ ] Ads and in-app purchases (separate plan)
- [ ] Cross-promotion of our other products (`promos` in Remote Config)

## Store launch checklist

**Both stores:** final name trademark check · original icon · 6–8 screenshots per device size · 15–30 s preview video · descriptions with keywords ("nut sort", "color sort puzzle", "brain game") · public privacy policy page · age rating questionnaire · support email and website.

**Google Play:** verified developer account · signed .aab targeting the currently required API level (project targets SDK 36) · Data safety form · closed test with the testers and days Google requires for new personal accounts.

**App Store:** Developer Program membership · build signed in Xcode and uploaded · privacy labels · TestFlight beta then App Review.

**Launch week:** crash-free > 99.5% in beta · rating prompt only after level 15 with 3 stars (official in-app review API) · promote on LinkedIn and aiinterviewstack.com.

## Monetization hooks (reserved now)

- `AdsService` with `showRewarded()`, `showInterstitial()`, `showBanner()` — does nothing yet (`packages/services/src/monetization.ts`).
- `StoreService` for buying, restoring and "Remove Ads".
- Reward hooks: result screen, "No moves left" screen, daily chest.
- Break point after every level for an interstitial, frequency from Remote Config (`interstitialEveryNLevels`, 0 = off).
- 100 px reserved at the bottom of the level screen for a banner.
- Product list and cross-promotions in Remote Config (`products`, `promos`).
