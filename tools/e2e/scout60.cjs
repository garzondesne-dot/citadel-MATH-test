// 🌫 몬스터 등장(정찰) 기본 60초 · 「⚔ 지금 등장」 (📜 2026-11-14 「몬스터 지금 등장이 없는 버그 · 등장 시간 기본값 60초로」)
//   🧪 테스트 수업 → 첫 몬스터 = 정찰 60초에서 시작 · 리모컨 주요 단추 「⚔ 지금 등장」 · 누르면 바로 문제 · 가상 학생이 그 순간부터 풂
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/scout60.cjs <폴더>
const { chromium } = require('playwright');
const path = require('path');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const t = await (await b.newContext({ viewport: { width: 400, height: 860 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
  // 📦 #21 수업 탭 = 🧪 → 10차시 → 📱 리모컨만(🤖 봇 5) → 🧪 테스트 열기 (옛 「준비」 → 차시 고르기 · 4판 보기 대신)
  await t.click('[data-k="cls-test"]'); await t.click('.pk3 [data-no="10"]'); await t.click('[data-mode="remote"]'); await t.click('[data-k="open-go"]'); await t.click('[data-k="open-yes"]'); await t.waitForSelector('.tact .btn', { timeout: 15000 });
  await t.waitForFunction(() => !document.querySelector('.tact .btn')?.disabled, null, { timeout: 15000 });
  const R = () => t.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`); });
  ok('테스트 수업 방 정찰 = 60초', (await R()).meta.solve === 60, String((await R()).meta.solve));
  for (let g = 0; g < 8; g++) { if ((await R()).state.step === 2) break; await t.click('.tact .btn'); await t.waitForTimeout(400); } // 10차시 m1
  await t.waitForTimeout(1500);
  const mt = (await t.textContent('.tact .btn')).trim(), badge = (await t.textContent('.badge.sc').catch(() => '')).trim();
  ok('정찰 중 리모컨 주요 단추 = 「⚔ 지금 등장」 · 🌫 정찰', /지금 등장/.test(mt) && /정찰/.test(badge), `${mt} · ${badge}`);
  await t.screenshot({ path: path.join(SHOTS, 'scout60-remote.png') });
  const before = Object.keys(((await R()).subs || {}).m1 || {}).length;
  await t.waitForTimeout(6000); const mid = Object.keys(((await R()).subs || {}).m1 || {}).length;
  ok('정찰 중(6초 뒤)에도 아직 아무도 못 냄 (5초 판이 아님)', mid === 0 && /지금 등장/.test(await t.textContent('.tact .btn')), `${before} → ${mid}`);
  await t.click('.tact .btn'); await t.waitForTimeout(800);
  const mt2 = (await t.textContent('.tact .btn')).trim(); ok('누르면 바로 문제 (단추 = 다음 ▶)', /다음/.test(mt2), mt2);
  await t.waitForFunction(() => { const L = window.__dbGet('school/live'), R = window.__dbGet(`rooms/${L.code}`); return Object.keys((R.subs || {}).m1 || {}).length >= 3; }, null, { timeout: 40000 }).catch(() => {});
  const n = Object.keys(((await R()).subs || {}).m1 || {}).length; ok('가상 학생이 그 순간부터 풂', n >= 3, `${n}명 냄`);
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
