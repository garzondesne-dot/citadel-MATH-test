// 📖 기호 톡 기록 (에뮬레이터 · 📜 2026-11-15 머리 🔨): 실제 학생(1-3 · 3번) 🎯 허수아비 2차시 문제에서 기호를 톡 → 1.5초 뒤 xp/1-3/3/st/set-02/{기호} 에 +1 (규칙 통과)
//   → 교사 대시보드 「기호 톡」 = 그 기호 1번 · 1명 · 차시 거르기
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } }, school: { features: { bundle: 'full', on: { hero: true, scarecrow: true } } } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(B); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  await rest('records/1-3/3/set-02', 'PUT', { at: 1, no: 2, mons: { r0: 'o', m1: 'x', s1: 'o', m2: 'x', m3: 'x', m4: 'x', s2: 'o' }, bossM: 'oo' });
  await rest('school/last/1-3', 'PUT', { lesson: 'set-02', no: 2, at: 1, done: true, code: '111111' });
  await s.reload(); await s.waitForTimeout(4000);
  await s.waitForSelector('[data-prop="scare"]', { timeout: 15000 }); await s.$eval('[data-prop="scare"]', (e) => e.click()); await s.waitForSelector('[data-k="dummy-list"]'); await s.waitForTimeout(500);
  let sym = null;
  for (const mid of ['m1', 'm2', 'm3', 'm4']) {
    const go = await s.$(`[data-lesson="set-02"] li[data-mid="${mid}"] .go`); if (!go) continue;
    await go.click(); await s.waitForSelector('.drun', { timeout: 15000 }); await s.waitForTimeout(2500);
    const el = await s.$('.sy'); if (el) { await el.click(); await s.waitForTimeout(400); sym = mid; break; }
    await s.$eval('.drun .back, [data-k="dummy-quit"]', (e) => e.click()).catch(() => {}); await s.waitForTimeout(800);
  }
  ok('기호 톡 칸이 있는 문제를 찾음', !!sym, sym || '없음');
  await s.screenshot({ path: `${SHOTS}/symtap-sheet.png` });
  await s.waitForTimeout(2200);
  const st = await rest('xp/1-3/3/st');
  const n = Object.values((st && st['set-02']) || {}).reduce((a, v) => a + v, 0);
  ok('톡 1번 → xp/1-3/3/st/set-02 에 1 (규칙 통과)', n === 1, JSON.stringify(st));
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${B}&role=teacher`); await p.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(p, '.tabs');
  await p.click('.tabs button:has-text("학생")'); await p.waitForTimeout(400); await p.click('.chips button:has-text("1-3")'); await p.waitForTimeout(1200);
  await p.click('.seg button:has-text("대시보드")'); await p.waitForTimeout(800); await p.click('.grp button:has-text("우리 반 어때")'); await p.waitForTimeout(300);
  await p.click('.vws button:has-text("기호 톡")'); await p.waitForTimeout(800);
  const rows = await p.$$eval('.list .dl', (x) => x.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  ok('대시보드 기호 톡 = 1번 · 1명 · 차시 거르기 있음', rows.length === 1 && /1번 · 1명/.test(rows[0]) && !!(await p.$('[data-k="vpick"]')), rows.join(' | '));
  await p.screenshot({ path: `${SHOTS}/symtap-dash.png`, fullPage: true });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
