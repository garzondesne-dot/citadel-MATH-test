// 🌊 파도 레이드에서 가져온 것 (📜 2026-11-16 · DECISIONS 🌊 · 머리 🔨) — 리모컨 · 학생 폰 · TV
//   ③ ⚔ 선제 공격: 지난 수업 닫힘 뒤 허수아비로 고친 칸 2개(학생 2명) → 수업 시작 때 meta.pre · 첫 몬스터 체력 −2 · TV 「⚔ 선제 공격! 복습한 친구 2명 · 체력 −2」
//   ⑤ ✅ 도장: 리모컨 학생 칸 → ✅ 도장 → 학생 폰 「✅ 도장! 📜 +1」 · 다시 = 「✅ 이미 도장」
//   NODE_PATH=$(npm root -g) node tools/e2e/wave.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/', DB = 'citadel-v1-test-db';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  if (await t.$('[data-cls="1-3"]')) await t.click('[data-cls="1-3"]'); else { await t.click('text=다른 반'); await t.click('.sheet .pk:has-text("1-3반")'); }
  await t.click('.pk:has-text("6차시")'); await t.click('.tact .btn'); await t.waitForSelector('.nums');
  const live = await t.evaluate((k) => JSON.parse(localStorage.getItem(`${k}|school/live`)), DB), code = live.code;
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push('폰 ' + e)); await s.goto(`${B}?role=student&room=${code}&as=1-3:2`); await s.waitForTimeout(1500);
  // ③ 지난 수업 닫힘 = 1시간 전 · 그 뒤 고친 칸 2개(2번 · 3번) · 그 전 1개(세면 안 됨)
  await t.evaluate((lid) => { const n = Date.now(), d = window.__dbSet; d('school/lastClose/1-3', n - 3600e3); d(`bonus/1-3/2/${lid}/m1`, { clear: true, fixAt: n - 60e3 }); d(`bonus/1-3/3/${lid}/m2`, { clear: true, fixAt: n - 30e3 }); d(`bonus/1-3/4/${lid}/m1`, { clear: true, fixAt: n - 7200e3 }); }, live.lesson || 'set-06');
  await t.bringToFront(); await t.waitForTimeout(600); await t.click('.tact .btn'); await t.waitForSelector('.rflow'); await t.waitForTimeout(900);
  const pre = await t.evaluate(([k, c]) => JSON.parse(localStorage.getItem(`${k}|rooms/${c}/meta/pre`) || 'null') || (JSON.parse(localStorage.getItem(`${k}|rooms/${c}`) || 'null') || {}).meta?.pre, [DB, code]);
  ok('③ 수업 시작 = meta.pre (고친 칸 2 · 학생 2 · 그 전 것은 안 셈)', !!pre && pre.fixed === 2 && pre.who === 2, JSON.stringify(pre));
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e));
  const key = await t.evaluate((c) => window.__dbGet(`secrets/${c}/hallKey`), code);
  await tv.goto(`${B}?role=hall&code=${code}&key=${key}`); await tv.waitForTimeout(2500);
  await t.evaluate((c) => window.__dbSet(`rooms/${c}/state/headcount`, 20), code); // 학생 1명이면 체력 2 → 10% = 0 · 20명 = 체력 54 → 최대 5
  let pb = '';
  for (let i = 0; i < 8 && !pb; i++) { await t.bringToFront(); await t.click('.tact .btn'); await tv.bringToFront(); await tv.waitForTimeout(1500); pb = (await tv.textContent('[data-k="tv-pre"]').catch(() => '')) || ''; if (!pb) log("  단계", i, await t.evaluate(([k, c]) => (JSON.parse(localStorage.getItem(`${k}|rooms/${c}/state`) || 'null') || {}).step, [DB, code])); }
  ok('③ TV = ⚔ 선제 공격! 복습한 친구 2명 · 체력 −k (이름 없음)', /선제 공격! 복습한 친구 2명 · 체력 −\d/.test(pb || ''), pb || '없음');
  await tv.screenshot({ path: `${SHOTS}/wave-pre-tv.png` });
  // ⑤ 도장
  await t.click('.n[data-n="2"]'); await t.waitForSelector('[data-k="stamp"]');
  ok('⑤ 리모컨 학생 칸 = ✅ 도장 단추', /도장 \(📜 \+1\)/.test(await t.textContent('[data-k="stamp"]')));
  await t.click('[data-k="stamp"]'); await t.waitForTimeout(300);
  ok('⑤ 다시 = 이미 도장(흐림)', /이미 도장/.test(await t.textContent('[data-k="stamp"]')) && await t.$eval('[data-k="stamp"]', (e) => e.disabled));
  await t.screenshot({ path: `${SHOTS}/wave-stamp-remote.png` });
  await s.bringToFront(); await s.waitForTimeout(700);
  ok('⑤ 학생 폰 = ✅ 도장! 📜 +1', /도장! 📜 \+1/.test((await s.textContent('.gtoast').catch(() => '')) || ''));
  await s.screenshot({ path: `${SHOTS}/wave-stamp-phone.png` });
  ok('⑤ 📜 +1 = 선물 칸(캠프에서 받음)', await s.evaluate(([k, c]) => { const g = JSON.parse(localStorage.getItem(`${k}|gifts/s1_3_2/stamp_${c}`) || 'null'); return !!g && g.s === 1; }, [DB, code]));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
