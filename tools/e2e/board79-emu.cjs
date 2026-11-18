// 🎯 #79 게시판 목표 (에뮬레이터 · 폰 1대): ⭐ 차시 정복 지도 · 📕 남은 오답 막대 · 🛡 수호자 명성 배지
//   NODE_PATH=$(npm root -g) node tools/e2e/board79-emu.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/', E = 'emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb';
const rest = (path, method = 'GET', body) => fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const log = (...a) => console.log(...a);
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('school/last/1-3', 'PUT', { lesson: 'set-06', no: 6, at: Date.now(), done: true, code: 'x' });
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const p = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', (e) => errs.push(String(e))); await p.goto(`${B}?${E}`);
  await p.waitForSelector('select'); await p.selectOption('select >> nth=0', '1-3'); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', '1'); await p.waitForTimeout(200);
  await p.click('.links button:has-text("가입")'); await p.click('button.pw >> nth=0'); for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
  await p.waitForTimeout(150); if (await p.$('.pad')) for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
  await p.click('.title .pmain'); await p.waitForTimeout(2500); if (await p.$('text=첫 용사 고르기')) { await p.click('button:has-text("시작")'); await p.waitForTimeout(800); }
  const now = Date.now(), runs = {};
  [[2, 'S', 'g', 2], [3, 'A', 'g', 3], [4, 'B', 'c', 1], [5, 'S', 'g', 2], [6, 'C', 'g', 2], [8, 'S', 'g', 4]].forEach(([no, grade, role, n], i) => { runs[`r${i}`] = { at: now - i * 1000, lid: `set-0${no}`, no, n, role, grade, right: 10, total: 12, sec: 300, clear: true }; });
  await rest('bonus/1-3/1/board', 'PUT', runs);
  await rest('records/1-3/1/set-02', 'PUT', { at: 1, code: 'x', no: 2, mons: {}, miss: [], perfects: 0, right: 0, total: 1, boss: 1, bossN: 5 });
  await p.reload(); await p.waitForTimeout(2500);
  if (!(await p.$('.bd'))) await p.click('button[aria-label="게시판"]'); await p.waitForSelector('.bd'); await p.waitForTimeout(1500);
  ok('지도 = 차시 칸', (await p.$$('[data-map]')).length >= 9, `${(await p.$$('[data-map]')).length}칸`);
  const st = await p.$eval('[data-k="board-map"] .gl b', (e) => e.textContent); ok('⭐ 합계 = 3 + 2 + 1 + 3 + 0 + 3 = 12', /⭐ 12 \//.test(st), st);
  ok('📕 남은 오답 막대', /남은 오답 \d+/.test((await p.textContent('[data-k="board-note"]').catch(() => '')) || ''));
  const fm = (await p.textContent('[data-k="board-fame"]')).replace(/\s+/g, ' ');
  ok('🛡 명성 = 🛡 · 2명+ · 클리어 5판 → 수호 견습 배지', /수호 견습/.test(fm) && /5판/.test(fm) && !!(await p.$('[data-k="board-fame"] .badge')), fm);
  await p.screenshot({ path: `${SHOTS}/b79-goals.png` });
  await p.click('[data-map="5"]'); await p.waitForTimeout(300); ok('지도 칸 누르면 그 차시 거르기', !!(await p.$('[data-map="5"].on')));
  ok('360 가로 넘침 0', (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  ok('콘솔 오류 0', !errs.some((e) => /Error/.test(e) && !/❌/.test(e)), errs.filter((e) => !/❌/.test(e)).slice(0, 2).join(' | '));
  await b.close(); log(errs.length ? `실패 ${errs.length}` : '모두 통과'); process.exit(errs.length ? 1 : 0);
})();
