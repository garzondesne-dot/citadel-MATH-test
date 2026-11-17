// 🎁 #45 업데이트 사과 선물 (에뮬레이터): 서버 선물함 gifts/{uid}/sorry_b216 = { s: 2 · fun } → 캠프 들어올 때 「🎁 업데이트 사과 선물 · 📜 +2」 · 받음 표시 · 두 번째 = 없음
//   에뮬레이터 + vite preview 4173 → NODE_PATH=$(npm root -g) node tools/e2e/sorry45.cjs <폴더>
const { chromium } = require('playwright');
const { rest } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } } });
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(B); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  const sc0 = await s.evaluate(() => [...document.querySelectorAll('.pill')].map((e) => e.textContent).join('|'));
  await rest('gifts/s1_3_3/sorry_b216', 'PUT', { at: Date.now(), g: 0, s: 2, fun: '🎁 업데이트 사과 선물' });
  await s.reload(); await s.waitForSelector('.gtoast', { timeout: 15000 }).catch(() => {});
  const t = (await s.textContent('.gtoast').catch(() => '')) || '';
  ok('캠프 = 「🎁 업데이트 사과 선물 · 📜 +2」', /업데이트 사과 선물/.test(t) && /📜 \+2/.test(t), t.trim());
  await s.screenshot({ path: `${SHOTS}/sorry45.png` });
  const g = await rest('gifts/s1_3_3/sorry_b216'); ok('선물 = 받음 표시', g && g.got === true);
  await s.reload(); await s.waitForTimeout(3500);
  ok('다시 들어오면 = 또 안 줌', !(await s.$('.gtoast')), sc0);
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
