// 🌫 정찰 시간 조사 · 시험 (📜 2026-11-15 「정찰 50초로 하면 실제로 60 · 지금 등장 눌러도 몇 초 뒤」 · 에뮬레이터)
//   ① 📋 차시 준비에서 정찰 60 → 50 (화면으로) → 수업 열기(테스트 · 진짜 수업) → 방 meta.solve · 리모컨 · TV · 학생 폰 「등장까지」 숫자
//   ② 「⚔ 지금 등장」 → TV · 학생 폰에서 정찰 덮개가 사라지기까지 걸린 시간 (폰 시계를 일부러 −4초 · TV +3초 어긋나게)
//   사용: 에뮬레이터 켬 → NODE_PATH=$(npm root -g) node tools/e2e/scout.cjs <폴더>
const { chromium } = require('playwright');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/', E = '&emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb', DBU = 'http://127.0.0.1:9000';
const rest = (p, method = 'GET', body) => fetch(`${DBU}/${p}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const skew = (ms) => `(() => { const R = Date, d = ${ms}; class F extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + d); } static now() { return R.now() + d; } } F.UTC = R.UTC; F.parse = R.parse; globalThis.Date = F; })();`; // 기기 시계가 틀린 폰 흉내 (Date 전체)
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const W = {}; for (let d = 1; d <= 5; d++) { W[d] = {}; for (let q = 1; q <= 7; q++) W[d][q] = '1-3'; } await rest('school/sched', 'PUT', W);
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const t = await (await b.newContext({ viewport: { width: 400, height: 860 } })).newPage();
  await t.goto(`${B}?role=teacher${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await require('./_emu.cjs').asAdmin(t, '.tabs');
  // ① 차시 준비 정찰 60 → 50
  await t.click('.tabs button:has-text("준비")'); await t.click('[data-k="lpick-go"]'); await t.click('[data-k="lpick"] .grid [data-id="set-06"]');
  await t.click('.four button:has-text("정찰")'); await t.click('.stp button[aria-label="줄이기"]'); await t.waitForTimeout(300); await t.click('.sheet .act .btn, button:has-text("다 했어요")').catch(() => {});
  const prep = await rest('school/prep/set-06'); ok('① 차시 준비 저장 = 50', prep && prep.solve === 50, JSON.stringify(prep));
  // 수업 열기 (리모컨 첫 화면 · 6차시 · 진짜 수업)
  await t.click('.tabs button:has-text("학생"), .tabs button >> nth=0'); await t.waitForTimeout(400);
  await t.click('[data-cls="1-3"]'); await t.click('.pk3 .pk:has-text("6차시")'); const openBtn = await t.$('.sub2 button:has-text("수업 열기"), .sub2 button:has-text("열기")');
  if (openBtn) await openBtn.click(); else await t.click('.sub2 button:has-text("테스트")'); await t.waitForTimeout(1500);
  const live = await rest('school/live'), code = live.code, meta = await rest(`rooms/${code}/meta`);
  ok('① 연 수업 meta.solve = 50', meta.solve === 50, `meta.solve ${meta.solve} · lesson ${meta.lesson} · ${live.test ? '테스트' : '진짜'} 수업`);
  const key = String(await rest(`secrets/${code}/hallKey`));
  const tvx = await b.newContext({ viewport: { width: 1280, height: 720 } }); await tvx.addInitScript(skew(3000)); const tv = await tvx.newPage();
  await tv.goto(`${B}?role=hall&code=${code}&key=${key}${E}`); await tv.waitForSelector('nav.dock', { timeout: 20000 }).catch(() => {});
  const sx = await b.newContext({ viewport: { width: 390, height: 844 } }); await sx.addInitScript(skew(-4000)); const s = await sx.newPage();
  await s.goto(`${B}?role=student&room=${code}&as=1-3:2${E}`); await s.waitForTimeout(3000);
  await t.waitForFunction(() => !document.querySelector('.tact .btn')?.disabled, null, { timeout: 15000 }).catch(() => {});
  const L = require('../../src/subjects/common-math2/lessons/set-06.json'), first = L.steps.findIndex((x) => x.kind === 'monster');
  for (let g = 0; g < 20; g++) { const st = (await rest(`rooms/${code}/state`)).step; if (st === first) break; await t.click('.tact .btn'); await t.waitForTimeout(350); }
  const t0 = Date.now(), st0 = await rest(`rooms/${code}/state`);
  await t.waitForTimeout(2500);
  const num = async (p, sel) => p.evaluate((sel) => { const x = document.querySelector(sel); const m = x && /(\d+)\s*초?/.exec(x.textContent || ''); return m ? Number(m[1]) : null; }, sel).catch(() => null);
  const tvLeft = await num(tv, '.sc .r b'), stuLeft = await s.evaluate(() => { const m = /(\d+)\s*초/.exec(document.body.innerText); return m ? Number(m[1]) : null; }), el = (Date.now() - t0) / 1000;
  out.push(`ℹ 정찰 시작 ${el.toFixed(1)}초 뒤: TV ${tvLeft}초 · 학생 ${stuLeft}초 (TV 시계 +3초 · 폰 시계 −4초 어긋남)`);
  ok('① TV 남은 초 = 50 − 지난 초 (±1)', tvLeft != null && Math.abs(tvLeft - (50 - el)) <= 1.5, `${tvLeft} ↔ ${(50 - el).toFixed(1)}`);
  ok('① 학생 폰 남은 초 = 50 − 지난 초 (±1)', stuLeft != null && Math.abs(stuLeft - (50 - el)) <= 1.5, `${stuLeft} ↔ ${(50 - el).toFixed(1)}`);
  // ② 지금 등장
  const gone = async (p, sel) => { for (let k = 0; k < 100; k++) { if (!(await p.$(sel))) return Date.now() - press; await p.waitForTimeout(100); } return 99999; };
  ok('② 누르기 전 학생 폰에 정찰 카드 있음', !!(await s.$('.bcard .lab:has-text("정찰")')));
  const press = Date.now(); await t.click('.tact .btn');
  const [dTv, dSt] = await Promise.all([gone(tv, '.sc'), gone(s, '.bcard .lab:has-text("정찰")')]);
  ok('② 지금 등장 → TV 1초 안', dTv <= 1200, `${dTv}ms`); ok('② 지금 등장 → 학생 폰 1초 안', dSt <= 1200, `${dSt}ms`);
  // (수업 중 교사 폰에는 준비 탭이 없음 → 준비 ↔ 리모컨 값 맞추기는 tests/solvesync.test.ts)
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
