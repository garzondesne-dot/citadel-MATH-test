// 📮 11/19 「우편으로 돌려줘」: hold 선물이 캠프에 들어와도 저절로 안 들어가고 · 우편함에 「받기」로 남음 · 받기 → 💎 · 두 번 안 받음
//   NODE_PATH=$(npm root -g) node tools/e2e/mailhold-emu.cjs <그림 폴더>
const { chromium } = require('playwright');
const { rest } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?emu=127.0.0.1', PID = 's1_3_3';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } } });
  await rest(`gifts/${PID}`, 'PUT', { sorry_cap230: { g: 52, at: Date.now(), fun: '💎 하루 한도 때문에 못 받은 💎 돌려줘요', got: false, hold: true }, sorry_refund_hero_8: { g: 60, at: Date.now() + 1, fun: '💎 용사 값 돌려받기', got: false, hold: true } });
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); s.on('pageerror', (e) => errs.push(String(e))); s.setDefaultTimeout(15000);
  await s.goto(B); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  await s.reload(); await s.waitForTimeout(4000);
  const g0 = Number(await rest('gem/1-3/3/total')) || 0;
  ok('캠프에 들어와도 저절로 안 받음', (await rest(`gifts/${PID}/sorry_cap230/got`)) === false && (await rest(`gifts/${PID}/sorry_refund_hero_8/got`)) === false);
  await s.click('[data-prop="mail"]'); await s.waitForSelector('[data-k="mailbox"]'); await s.waitForTimeout(400);
  const rows = await s.$$eval('[data-k="mailbox"] [data-mail="gift"]', (x) => x.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  rows.forEach((r) => console.log('   📮', r));
  ok('우편함 = 두 선물 · 「받기」', rows.length === 2 && rows.every((r) => /받기/.test(r)) && rows.some((r) => /하루 한도 때문에 못 받은 💎 돌려줘요 · 💎 52/.test(r)) && rows.some((r) => /용사 값 돌려받기 · 💎 60/.test(r)));
  await s.screenshot({ path: `${SHOTS}/mailhold-box.png` });
  await s.click('[data-claim="sorry_cap230"]'); await s.waitForTimeout(1500);
  const t = (await s.textContent('[data-k="mailbox"] .toast').catch(() => '')).trim(), g1 = Number(await rest('gem/1-3/3/total')) || 0;
  ok('받기 → 💎 +52 · got', (await rest(`gifts/${PID}/sorry_cap230/got`)) === true && g1 - g0 === 52, `${t} · 💎 ${g0} → ${g1}`);
  await s.screenshot({ path: `${SHOTS}/mailhold-took.png` });
  await s.reload(); await s.waitForTimeout(4000); const g2 = Number(await rest('gem/1-3/3/total')) || 0;
  ok('새로 고침 → 두 번 안 들어옴 · 남은 선물은 그대로 기다림', g2 === g1 && (await rest(`gifts/${PID}/sorry_refund_hero_8/got`)) === false, `💎 ${g2}`);
  ok('콘솔 오류 0', !errs.some((e) => /Error/.test(e)), errs.slice(0, 2).join(' | '));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
