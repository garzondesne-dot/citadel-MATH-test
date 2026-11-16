// 🧩 덧칸 화면 (📜 2026-11-15 머리 🔨 · 2026-11-16 꼴별): 합친 팩(docs/handoff/packNN/ex-NN-with-addons.json)을 이 기기 저장소에 넣고
//   node tools/e2e/addons.cjs <캡처 폴더> [주소] [12|13] — 기본 13
//   ✔ 개념 체크(c1 · 학생 카드 · 틀리면 도움 1단 · TV 준비 완료) · 💡 도움 3단(m1 · ①②③ · first = 첫 판 · sol 줄 · ✋) · 🔎 익명 풀이(m1 · TV 양피지 · focus 3번째 줄 · 학생 「TV 를 봐요」)
const { chromium } = require('playwright');
const fs = require('fs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
const NO = process.argv[4] || '13', LID = `ex-${NO}`;
const PACK = JSON.parse(fs.readFileSync(`${__dirname}/../../docs/handoff/pack${NO}/${LID}-with-addons.json`, 'utf8'));
const C1 = PACK.steps.find((x) => x.check), WRONG = C1.check.type === 'ox' ? ((C1.check.a === true || C1.check.a === 'O') ? 1 : 0) : (Number(C1.check.a) === 0 ? 1 : 0);
const M1 = PACK.monsters.m1, REV = (M1.reviewsBy ? Object.values(M1.reviewsBy).flat() : []).concat(M1.reviews || [])[0], FO = REV?.focus ? REV.focus - 1 : -1;
const C1T = C1.title.split(' · ')[0];
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript((p) => { try { localStorage.setItem(`citadel-v1-test-db|prep/packs/${p.id}`, JSON.stringify(p)); } catch { /* 무시 */ } }, PACK);
  const R = `AD${NO}`, Q = `mode=test&lesson=${LID}&room=${R}`;
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('TV ' + e));
  await t.goto(`${B}?role=hall&${Q}`); await t.waitForSelector('.dock', { timeout: 20000 }); await t.waitForTimeout(800);
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 844 }); s.on('pageerror', (e) => errs.push('폰 ' + e));
  await s.goto(`${B}?role=student&${Q}`); await s.waitForTimeout(2500);
  const go = async () => { await t.bringToFront(); await t.mouse.move(600, 400); await t.waitForTimeout(120); const g = t.locator('.dock .go').first(); if (await g.isVisible().catch(() => false)) await g.click().catch(() => {}); await t.waitForTimeout(700); await s.bringToFront(); await s.waitForTimeout(900); };
  // ✔ 개념 체크: c1 단계까지
  for (let i = 0; i < 6 && !(await s.$('[data-k="talk"]')) ; i++) await go();
  for (let i = 0; i < 4 && !(await s.textContent('[data-k="talk"]').catch(() => '') || '').includes(C1T) && !/x^/.test((await s.textContent('[data-k="talk"]').catch(() => '')) || ''); i++) await go();
  ok(`${C1.id} 개념 단계`, ((await s.textContent('[data-k="talk"]').catch(() => '')) || '').includes(C1T));
  // 📺 종합실 막대 「✔ 체크」 (📜 2026-11-17 #13) = 교사 폰과 같은 함수로 엶
  await t.bringToFront(); const dcc = await t.$('[data-k="dock-cc"]'); ok('📺 종합실 막대 ✔ 체크 단추', !!dcc && /체크/.test(await dcc.textContent()));
  if (dcc) await dcc.click(); else await t.evaluate((a) => { const n = Date.now(); window.__dbSet(`rooms/${a.R}/state/cc`, { id: a.id, at: n, end: n + 30000 }); }, { R, id: C1.id });
  await t.waitForTimeout(400); ok('📺 누르면 「닫기 n」', /닫기\s*\d+/.test((await t.textContent('[data-k="dock-cc"]').catch(() => '')) || ''));
  await s.bringToFront(); await s.waitForTimeout(1200);
  ok('✔ 학생 폰 = 개념 체크 카드', !!(await s.$('[data-k="cc"]')));
  await s.screenshot({ path: `${SHOTS}/ad${NO}-cc-0.png` });
  await s.locator('[data-k="cc"] button').nth(WRONG).click(); await s.waitForTimeout(600); // 틀린 보기
  ok('✔ 틀림 → 💡 도움 1단(why)', !!(await s.$('[data-k="cc-help"]')));
  await s.screenshot({ path: `${SHOTS}/ad${NO}-cc-1.png` });
  await t.bringToFront(); await t.waitForTimeout(500); ok('✔ TV = 준비 완료 1 / 인원', /준비 완료\s*1/.test((await t.textContent('[data-k="tv-cc"]').catch(() => '')) || ''));
  await t.screenshot({ path: `${SHOTS}/ad${NO}-cc-tv.png` });
  await t.evaluate((R) => window.__dbSet(`rooms/${R}/state/cc/end`, Date.now()), R);
  // 💡 도움 3단 · 🔎 익명 풀이: m1 몬스터
  for (let i = 0; i < 6 && !(await s.$('[data-k="hint"]')); i++) { await go(); await s.waitForTimeout(5500); }
  ok('m1 몬스터 · 💡 도움 단추', /도움/.test((await s.textContent('[data-k="hint"]').catch(() => '')) || ''));
  await s.click('[data-k="hint"]'); await s.waitForSelector('[data-k="help"]', { timeout: 5000 }).catch(() => {});
  const st1 = await s.evaluate(() => ({ stage: document.querySelector('[data-k="help"]')?.dataset.stage, dots: document.querySelectorAll('[data-k="help"] .dots li').length }));
  ok('💡 1단 · 단계 3개', st1.stage === '1' && st1.dots === 3, JSON.stringify(st1));
  await s.screenshot({ path: `${SHOTS}/ad${NO}-help-1.png` });
  await s.click('[data-k="help-next"]'); await s.waitForTimeout(300);
  const f2 = await s.textContent('[data-k="help"] .line').catch(() => '');
  ok('💡 2단 = 첫 판 그 소문항 first(빈칸 □)', /□/.test(f2 || ''), (f2 || '').slice(0, 60));
  await s.screenshot({ path: `${SHOTS}/ad${NO}-help-2.png` });
  await s.click('[data-k="help-next"]'); await s.waitForTimeout(300);
  ok('💡 3단 = 예제 + 풀이 줄', (await s.$$('[data-k="help"] ol.sol li')).length >= 2 && !!(await s.$('[data-k="help-hand"]')));
  await s.click('[data-k="help-hand"]'); await s.waitForTimeout(300); ok('✋ 손들기', /손을 들었어요/.test(await s.textContent('[data-k="help"]')));
  await s.screenshot({ path: `${SHOTS}/ad${NO}-help-3.png` });
  await s.keyboard.press('Escape'); const x = await s.$('.sheet .x'); if (x) await x.click().catch(() => {}); await s.waitForTimeout(300);
  await t.evaluate((R) => window.__dbSet(`rooms/${R}/bossTry/zz/0/0`, '1'), R); await t.waitForTimeout(500); // 📊 단추 = 반이 하나라도 풀면 보임 (11/17 #14)
  await t.bringToFront(); const drv = await t.$('[data-k="dock-review"]'); ok('📺 종합실 막대 🔎 풀이 단추', !!drv && /풀이/.test(await drv.textContent()));
  // 📊 (📜 2026-11-17 #14): 첫 장 = 우리 반 고비 · 몬스터가 살아 있으면 다음 누름 = 닫힘(자주 하는 실수는 쓰러진 뒤) → 풀이 카드는 직접 띄워 확인
  if (drv) await drv.click(); await t.waitForTimeout(800);
  ok('📺 누르면 첫 장 = 📊 고비', /고비/.test((await t.textContent('[data-k="dock-review"]').catch(() => '')) || '') && !!(await t.$('[data-k="tv-gobi"]')));
  if (drv) await drv.click(); await t.waitForTimeout(500);
  await t.evaluate((R) => window.__dbSet(`rooms/${R}/state/review`, { mid: 'm1', i: -1, k: 0 }), R); await t.waitForTimeout(800);
  ok('📺 풀이 카드 = 「1/n」', /1\/\d+/.test((await t.textContent('[data-k="dock-review"]').catch(() => '')) || ''));
  const rv = await t.evaluate(() => { const c = document.querySelector('[data-k="tv-review"]'); return c ? { lines: c.querySelectorAll('.rl li').length, fo: [...c.querySelectorAll('.rl li')].findIndex((l) => l.classList.contains('fo')), tag: !!c.querySelector('.rtag') } : null; });
  ok(`🔎 TV 양피지 · ${FO + 1}번째 줄 강조 · 꼬리표 ${REV.wrong ? '있음' : '없음'}`, !!rv && rv.fo === FO && rv.tag === !!REV.wrong, JSON.stringify(rv));
  await t.screenshot({ path: `${SHOTS}/ad${NO}-review-tv.png` });
  await s.bringToFront(); await s.waitForTimeout(600); ok('🔎 학생 폰 = TV 를 봐요', !!(await s.$('[data-k="review-band"]')));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
