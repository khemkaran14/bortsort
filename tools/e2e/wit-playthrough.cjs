/**
 * Plays all 50 Wit Twist puzzles in a real browser, using each level's scripted solution and real
 * mouse events on the canvas (so hit areas and covering objects are tested too).
 *
 *   npm run build && npx vite preview --port 4173 (in packages/game), then:
 *   node tools/e2e/wit-playthrough.cjs <screenshot-dir> [en|hi] [levels-to-screenshot, e.g. 3,11]
 *
 * Needs Playwright with Chromium installed (npx playwright install chromium).
 */
const { chromium, devices } = require('playwright');
const out = process.argv[2];
const lang = process.argv[3] || 'en';
const shots = new Set((process.argv[4] || '').split(',').filter(Boolean).map(Number));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text());
  });
  await p.addInitScript(
    (lang) =>
      localStorage.setItem(
        'CapacitorStorage.bolt-sort.save',
        JSON.stringify({
          version: 2,
          unlocked: 30,
          tutorialDone: true,
          coins: 500,
          settings: { language: lang },
          streak: { day: 1, lastDate: new Date().toISOString().slice(0, 10), freezesUsedWeek: null },
        }),
      ),
    lang,
  );
  await p.goto('http://localhost:4173/?debug');
  await p.waitForTimeout(2500);
  await p.screenshot({ path: out + '/00-select.png' });
  const fails = [];
  for (let n = 1; n <= 50; n++) {
    await p.evaluate((n) => window.__game.scene.getScenes(true)[0].scene.start('WitLevel', { n }), n);
    await p.waitForTimeout(900);
    if (shots.has(n)) await p.screenshot({ path: out + `/l${String(n).padStart(2, '0')}.png` });
    let ok = false;
    try {
      ok = await p.evaluate(() => window.__witSolve());
    } catch (e) {
      fails.push(n + ': ' + String(e).slice(0, 200));
      continue;
    }
    if (!ok) fails.push(n + ': not solved');
    if (shots.has(n)) {
      await p.waitForTimeout(900);
      await p.screenshot({ path: out + `/l${String(n).padStart(2, '0')}-done.png` });
    }
  }
  const save = await p.evaluate(() => JSON.parse(localStorage.getItem('CapacitorStorage.bolt-sort.save')).wit);
  console.log('solved count', Object.keys(save.solved).length, 'unlocked', save.unlocked);
  await p.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('WitMap'));
  await p.waitForTimeout(1000);
  await p.screenshot({ path: out + '/99-map.png' });
  console.log('FAILS:', fails.length ? '\n' + fails.join('\n') : 'none');
  console.log('errors:', errs.slice(0, 10).join('\n') || 'none');
  await b.close();
})();
