/**
 * End-to-end play-through against the production build.
 *
 *   npm run build && npm run test:e2e          (SHOTS=dir to save screenshots)
 *
 * Clicks go through the real WebGL canvas (R3F raycasting). The page exposes
 * projected hit-target centres and the engine state only when loaded with
 * `?e2e`. Requires Playwright with Chromium (`npm i -D playwright` +
 * `npx playwright install chromium` if it is not available globally).
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const PORT = 4179;
const URL = `http://localhost:${PORT}/?e2e`;
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const stop = () => server.kill();
process.on('exit', stop);

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('preview server did not start');
}

const countCorrect = (slots, answer) => slots.reduce((n, id, i) => n + (id === answer[i] ? 1 : 0), 0);

async function run(viewport, label, seedBest = null) {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', () => errors.push('native dialog must not be used'));
  const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${label}-${name}.png` });

  await page.goto(URL);
  await page.waitForSelector('[data-testid=start]');
  // desktop: no record yet; mobile: an unbeatable 1.00 s record → "not a new best" path
  await page.evaluate((seed) => (seed ? localStorage.setItem('nbox_best_stopwatch', seed) : localStorage.removeItem('nbox_best_stopwatch')), seedBest);
  await page.reload();
  await page.waitForSelector('[data-testid=start]');
  await page.waitForTimeout(800);
  await shot('00-start');
  await page.click('[data-testid=start]');

  const state = () => page.evaluate(() => window.__NBOX_STATE__);
  const canvasBox = await page.locator('canvas').boundingBox();
  const targets = async () => {
    await page.waitForTimeout(80); // let the probe refresh after layout changes
    return page.evaluate(() => window.__NBOX_TARGETS__);
  };
  const clickAt = (p) => page.mouse.click(canvasBox.x + p.x, canvasBox.y + p.y);
  const waitState = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 8000 });

  for (let round = 0; round < 3; round++) {
    const size = 3 + round;
    await waitState((n) => window.__NBOX_STATE__?.phase === 'playing' && window.__NBOX_STATE__.ids.length === n, size);
    await page.waitForTimeout(400);
    let s = await state();
    let t = await targets();
    assert.equal(t.slots.length, size);

    // click areas must not overlap: adjacent slot centres well apart
    for (let i = 1; i < size; i++) assert.ok(t.slots[i].x - t.slots[i - 1].x > 40, `${label}: slots too close`);
    for (const p of [...t.slots, ...t.tray]) {
      assert.ok(p.x > 0 && p.x < canvasBox.width && p.y > 0 && p.y < canvasBox.height, `${label}: target off-screen`);
    }

    // --- RESET in round 1: place one can, reset, everything back on the tray
    if (round === 0) {
      await clickAt(t.tray[0]);
      await clickAt(t.slots[0]);
      await waitState(() => window.__NBOX_STATE__.slots[0] !== null);
      await page.waitForTimeout(500);
      await page.click('[data-testid=reset]');
      s = await state();
      assert.deepEqual(s.slots, Array(size).fill(null), 'RESET clears slots');
      assert.equal(s.stage, 0, 'RESET keeps the round');
    }

    // --- place a wrong full arrangement (rotation of the answer) via tray clicks
    const wrong = [...s.answer.slice(1), s.answer[0]];
    for (let i = 0; i < size; i++) {
      const trayIndex = s.ids.indexOf(wrong[i]);
      await clickAt(t.tray[trayIndex]);
      if (i === 0 && round === 0) {
        await page.waitForTimeout(250);
        await shot('01-selected');
        const sel = (await state()).selection;
        assert.deepEqual(sel, { kind: 'tray', id: wrong[0] }, 'tray can selected');
      }
      await clickAt(t.slots[i]);
      if (i === 0 && round === 0) {
        await page.waitForTimeout(200);
        await shot('02-placing');
      }
      if (i < size - 1) {
        // incomplete arrangement → no judgement, no toast
        assert.equal(await page.locator('[data-testid=match-toast]').count(), 0, 'no toast while incomplete');
      }
    }
    s = await state();
    assert.notEqual(s.pendingJudge, null, 'auto judge queued without CHECK');
    const toast = page.locator('[data-testid=match-toast]');
    await toast.waitFor({ timeout: 3000 });
    const expected = countCorrect(wrong, s.answer);
    assert.equal(await toast.textContent(), `${expected} RIGHT!`);
    if (round === 0) await shot('03-toast');
    await toast.waitFor({ state: 'detached', timeout: 2000 }); // disappears after ~0.7 s

    // --- solve with swaps (canonical selection sort)
    for (let i = 0; i < size; i++) {
      s = await state();
      if (s.slots[i] === s.answer[i]) continue;
      const j = s.slots.indexOf(s.answer[i]);
      const before = s.lastResult?.seq ?? 0;
      await clickAt(t.slots[i]);
      await clickAt(t.slots[j]);
      if (round === 2 && i === 0) {
        await page.waitForTimeout(150);
        await shot('04-swap-midway');
      }
      await waitState((b) => (window.__NBOX_STATE__.lastResult?.seq ?? 0) > b, before);
      const after = await state();
      assert.equal(after.lastResult.correct, countCorrect(after.slots, after.answer));
    }

    s = await state();
    assert.equal(s.phase, 'revealing', 'round solved → reveal');
    await page.waitForTimeout(800);
    await shot(`05-reveal-${size}`);
  }

  // --- final: timer stops immediately, result screen
  const t1 = await page.textContent('[data-testid=timer]');
  await page.waitForTimeout(300);
  const t2 = await page.textContent('[data-testid=timer]');
  assert.equal(t1, t2, 'timer stopped after last box');
  await page.waitForSelector('[data-testid=result-time]', { timeout: 5000 });
  assert.equal(await page.textContent('[data-testid=result-time]'), t2);
  await page.waitForTimeout(300);
  await shot('06-result');
  const best = await page.evaluate(() => localStorage.getItem('nbox_best_stopwatch'));
  assert.ok(Number(best) > 0, 'best record saved');
  const compare = await page.textContent('[data-testid=compare]');
  if (seedBest) {
    assert.equal(best, seedBest, 'slower run does not overwrite best');
    assert.match(compare, /최고 기록까지/, 'invites a retry');
    assert.equal(await page.textContent('[data-testid=play-again]'), '다시 도전');
  } else {
    assert.match(compare, /첫 기록/, 'first run framed as first record');
  }


  // --- best survives reload and is shown above START
  await page.reload();
  await page.waitForSelector('[data-testid=start]');
  assert.equal(await page.textContent('[data-testid=best-time]'), seedBest ? '00:01.00' : t2);
  await shot('07-start-with-best');

  // --- RESTART mid-game: in-game dialog; cancel keeps the run, confirm restarts
  await page.click('[data-testid=start]');
  await waitState(() => window.__NBOX_STATE__?.phase === 'playing');
  const runBefore = (await state()).runId;
  await page.click('[data-testid=restart]');
  await page.waitForSelector('[data-testid=confirm-dialog]');
  await shot('08-confirm');
  await page.click('[data-testid=confirm-cancel]');
  assert.equal((await state()).runId, runBefore, 'cancel keeps the run');
  await page.click('[data-testid=restart]');
  await page.click('[data-testid=confirm-ok]');
  const s2 = await state();
  assert.equal(s2.runId, runBefore + 1);
  assert.equal(s2.stage, 0);
  assert.equal(s2.ids.length, 3);

  // --- logo → start screen (with confirmation while playing)
  await page.click('[data-testid=logo]');
  await page.click('[data-testid=confirm-ok]');
  await page.waitForSelector('[data-testid=start]');
  assert.equal((await state()).phase, 'ready');
  await page.waitForFunction(() => document.querySelector('[data-testid=timer]').textContent === '00:00.00', null, { timeout: 2000 });

  assert.deepEqual(errors, [], 'no page errors');
  await browser.close();
  console.log(`✓ ${label} (${viewport.width}×${viewport.height}) full play-through passed`);
}

try {
  await waitForServer();
  await run({ width: 1280, height: 800 }, 'desktop');
  await run({ width: 390, height: 844 }, 'mobile', '1000');
  stop();
  process.exit(0);
} catch (e) {
  console.error(e);
  stop();
  process.exit(1);
}
