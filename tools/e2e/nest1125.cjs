// 🐾 둥지 (📜 2026-11-25 · 머리 🔨) — 이 기기 캠프
//   ① 캠프 🪺 둥지 → 처음 = 🥚 알 탭 · 3종 단계 그림 미리 · 이름 낱말 두 개 · 「💎 150 으로 알 사기」 → 정말? → 💎 −150 · 내 펫 탭
//   ② 캠프 = 용사 발치에 펫 · 용사 카드에 작은 펫 · 누르면 폴짝
//   ③ 먹이(폰 저장 · 시험 고리 없이 저장값으로) 50 → 다 큼 → 🎀 꾸미기 왕관 사기 💎 −80 · 입힘
//   NODE_PATH=$(npm root -g) node tools/e2e/nest1125.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('캠프 ' + e));
  await p.goto(B + '?role=camp&room=NE'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('citadel-exam-cut|me|2026-12-11', '1'); }); await p.reload(); await p.waitForTimeout(2000);
  const gem = async () => Number(((await p.textContent('[data-k="wallet-gem"]')) || '').replace(/[^0-9]/g, ''));
  const g0 = await gem();
  await p.click('[data-prop="nest"]'); await p.waitForTimeout(500);
  ok('① 처음 = 알 탭 · 3종', (await p.getAttribute('[data-k="nest-tab-egg"]', 'aria-selected')) === 'true' && (await p.$$('[data-k="nest-egg"]')).length === 3);
  await p.click('[data-k="nest-egg"][data-kind="owl"]'); await p.waitForTimeout(150);
  const main = () => p.locator('.sheet button').last();
  ok('단추 = 💎 150 으로 알 사기', /💎 150 으로 알 사기/.test((await main().textContent()) || ''));
  await p.screenshot({ path: `${SHOTS}/nest-egg.png` });
  await main().click(); await main().click(); await p.waitForTimeout(500);
  ok('샀음 = 💎 −150 · 내 펫 탭 · 알 단계', (await gem()) === g0 - 150 && (await p.getAttribute('[data-k="nest-tab-mine"]', 'aria-selected')) === 'true' && (await p.getAttribute('[data-k="nest-pet"] [data-k="pet"]', 'data-stage')) === '0', `${g0} → ${await gem()}`);
  await p.screenshot({ path: `${SHOTS}/nest-mine.png` });
  await p.click('.sheet .x'); await p.waitForTimeout(400);
  ok('② 캠프 = 용사 발치 펫 · 용사 카드 펫', !!(await p.$('[data-k="camp-pet"] [data-k="pet"]')) && !!(await p.$('.hero-card [data-k="pet"]')));
  // ③ 먹이 50 (저장값) → 다 큼 → 왕관
  await p.evaluate(() => { const m = JSON.parse(localStorage.getItem('citadel-v1-me') || '{}'); for (const id of Object.keys(m.pet.list)) m.pet.list[id].food = 50; localStorage.setItem('citadel-v1-me', JSON.stringify(m)); });
  await p.reload(); await p.waitForTimeout(1500);
  ok('먹이 50 = 다 큼', (await p.getAttribute('[data-k="camp-pet"] [data-k="pet"]', 'data-stage')) === '2');
  await p.screenshot({ path: `${SHOTS}/nest-camp.png` });
  await p.click('[data-prop="nest"]'); await p.waitForTimeout(400); await p.click('[data-k="nest-tab-cos"]'); await p.waitForTimeout(200);
  await p.click('[data-k="nest-cos"][data-id="pc_crown"]'); await main().click(); await main().click(); await p.waitForTimeout(400);
  ok('③ 왕관 = 💎 −80 · 입힘', (await gem()) === g0 - 230 && !!(await p.$('.big [data-k="pet-cos"]')), String(await gem()));
  await p.screenshot({ path: `${SHOTS}/nest-cos.png` });
  await b.close(); console.log(errs.length ? `❌ ${errs.length}` : '✅ 오류 0'); process.exit(errs.length ? 1 : 0);
})();
