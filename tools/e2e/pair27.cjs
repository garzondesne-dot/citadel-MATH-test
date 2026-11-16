// 👑 형성평가 짝 (📜 2026-11-17 #27) — 13차시 짝 판(links "",m1,m2,m3,m4)을 올리고 🧪 테스트 리모컨에서 몬스터 4 를 🎯 복습으로 → 형성평가 4문항(1문항은 허수아비로)
//   NODE_PATH=$(npm root -g) node tools/e2e/pair27.cjs <폴더> <13차시 짝 판 json> [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const [SHOTS = '.', PACK, B = 'http://localhost:4173/'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  const txt = async (s) => ((await t.textContent(s).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.goto(B + '?role=teacher&tab=prep'); await t.waitForSelector('[data-k="packs-tab"]');
  await t.click('[data-k="packup-go"]'); await t.setInputFiles('[data-k="packfile"]', PACK); await t.waitForSelector('[data-k="packsum"]'); await t.waitForTimeout(1200);
  await (await t.$('.sheet .btn.pmain') || await t.$('.sheet .act .btn')).click(); await t.waitForTimeout(2000);
  await t.goto(B + '?role=teacher'); await t.waitForSelector('.tp'); await t.evaluate(() => { window.__botSpeed = 4; });
  await testOpen(t, { no: 13, mode: 'remote', bots: 5 }); await t.waitForSelector('[data-k="bots"]');
  await t.click('.tact .btn'); await t.waitForTimeout(600); // 수업 시작
  await t.click('[data-k="send-open"]'); await t.waitForSelector('[data-k="send-list"]');
  const rows = await t.$$eval('[data-k="send-list"] li', (xs) => xs.map((x) => x.textContent));
  const k4 = rows.findIndex((r) => /문제 4|몬스터 4|m4/.test(r));
  ok('🎯 복습으로 목록에 몬스터 4', k4 >= 0, rows.join(' | '));
  if (k4 >= 0) await (await t.$$('[data-k="send-one"]'))[k4].click();
  await t.waitForTimeout(500); await t.keyboard.press('Escape'); await t.click('.sheet .x').catch(() => {});
  for (let i = 0; i < 30 && !/형성평가/.test(await txt('[data-k="now-lab"]')); i++) { await t.click('.tact .btn').catch(() => {}); await t.waitForTimeout(400); if (await t.$('[data-k="bossask"]')) break; }
  const lab = await txt('[data-k="now-lab"]');
  ok('리모컨 「지금」 칸 = 형성평가 4문항 (1문항은 허수아비로)', /형성평가 4문항 \(1문항은 허수아비로\)/.test(lab), lab);
  const code = await t.evaluate(() => window.__dbGet('school/live').code);
  const sent = await t.evaluate((c) => window.__dbGet(`rooms/${c}/state/sent`), code);
  ok('방 state.sent = m4', !!sent?.m4, JSON.stringify(sent));
  await t.screenshot({ path: `${SHOTS}/pair27-remote.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
