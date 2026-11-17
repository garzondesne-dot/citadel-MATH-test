// 💎 선물 「전체」 = 명단 전원 − 결석 표시 (📜 2026-11-17 #31) — 이 기기 저장 · 🧪 테스트 + 🤖 3
//   끊긴 학생(seen 0) · 안 들어온 학생 · 대기실 학생도 받음 · 결석 표시 학생만 빠짐 · 창에 「명단 n명에게 (결석 k명 빼고)」
//   NODE_PATH=$(npm root -g) node tools/e2e/gift31.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  const txt = async (s) => ((await t.textContent(s).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  await testOpen(t, { no: 6, mode: 'remote', bots: 3 }); await t.waitForSelector('[data-k="bots"]'); await t.waitForTimeout(2500); await t.click('.tact .btn'); await t.waitForTimeout(1000);
  const live = await t.evaluate(() => window.__dbGet('school/live')), P = `rooms/${live.code}`;
  const get = (p) => t.evaluate((p) => window.__dbGet(p), p), set = (p, v) => t.evaluate(([p, v]) => window.__dbSet(p, v), [p, v]);
  const bots = Object.keys((await get(`${P}/players`)) || {});
  // 결석 = 명단 1번 · 끊김 = 🤖 하나 (seen 0)
  const abs = `s${String(live.cls).replace('-', '_')}_1`;
  await set(`${P}/absent/${abs}`, true); await set(`${P}/players/${bots[0]}/seen`, 0); await t.waitForTimeout(800);
  await t.click('[data-slot="gift"]'); await t.waitForSelector('[data-k="gift-grid"]');
  const n = (await t.$$('[data-k="gift-grid"] .gn')).length, off = (await t.$$('[data-k="gift-grid"] .gn.off')).length;
  ok('선물 칸 = 명단 − 결석 (접속 안 한 학생도)', n >= 15 && off >= 10, `${n}칸 · 흐림 ${off}`);
  ok('창 한 줄 = 「명단 n명에게 (결석 1명 빼고)」', new RegExp(`명단 ${n}명에게 \\(결석 1명 빼고\\)`).test(await txt('[data-k="gift-who"]')), await txt('[data-k="gift-who"]'));
  await t.click('[data-k="gift-all"]'); await t.waitForTimeout(200);
  ok('주요 단추 = 「전체 n명에게 💎 …」', new RegExp(`전체 ${n}명에게`).test(await txt('.sheet .btn.big')), await txt('.sheet .btn.big'));
  await t.screenshot({ path: `${SHOTS}/gift31.png` });
  await t.click('.sheet .btn.big'); await t.waitForTimeout(800);
  const got = await t.evaluate(() => Object.keys(window.__dbGet('gifts') || {}));
  ok('결석 학생만 빼고 모두 받음', got.length === n && !got.includes(abs), `${got.length}명 · 결석 받음 ${got.includes(abs)}`);
  ok('끊긴 🤖 도 받음', got.includes(bots[0]), bots[0]);
  ok('안 들어온 명단 학생(2번)도 받음', got.includes(`s${String(live.cls).replace('-', '_')}_2`));
  ok('TV 「모두」 선물 띠 = 전체', !!(await get(`${P}/state/gift`)), JSON.stringify(await get(`${P}/state/gift`)));
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
