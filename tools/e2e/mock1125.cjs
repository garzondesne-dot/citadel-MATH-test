// 📄 모의 시험지 마왕전 (📜 2026-11-25 · 머리 🔨) — 이 기기 캠프 · 시계 = 기간 안
//   ① 띠 → 「📄 무지의 마왕 모의전」 · 시작 화면 안내 고정 문구 · 「문제 은행 n문항 중 무작위 10문항」 · 「기출」 낱말 없음
//   ② 시험지 = 10문항 · 25:00 · 빈칸 제출 = 한 번 더 묻기
//   ③ 7문항만 맞힘 → 7 / 10 · 틀린 3 = 정답 · 그 차시 허수아비로 · 결과 줄 「연습이에요」 · 다시 도전 → 10/10 = 쓰러짐(4째 칸)
//   NODE_PATH=$(npm root -g) node tools/e2e/mock1125.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { const T = Date.parse('2026-11-25T03:00:00Z'), D0 = Date, off = T - D0.now(); class FD extends D0 { constructor(...a) { super(...(a.length ? a : [D0.now() + off])); } static now() { return D0.now() + off; } } globalThis.Date = FD; });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('캠프 ' + e));
  await p.goto(B + '?role=camp&room=MX'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('citadel-exam-cut|me|2026-12-10', '1'); }); await p.reload(); await p.waitForTimeout(1500);
  await p.click('[data-k="exam-band"]'); await p.waitForTimeout(300);
  ok('① 띠 시트에 📄 무지의 마왕 모의전', !!(await p.$('[data-k="exam-go-mock"]')));
  await p.click('[data-k="exam-go-mock"]'); await p.waitForTimeout(500);
  const notice = (await p.textContent('[data-k="mx-notice"]').catch(() => '')) || '', head = (await p.textContent('[data-k="mx-bank"]').catch(() => '')) || '';
  ok('시작 화면 안내 고정 문구 · 은행 줄', /선생님이 고른 문제도, 기말고사 힌트도 전혀 없어요/.test(notice) && /문제 은행 \d+문항 중 무작위 10문항/.test(head), head);
  ok('「기출」 「실제 시험」 낱말 없음', !/기출|실제 시험/.test((await p.textContent('[data-k="mock-exam"]')) || ''));
  await p.screenshot({ path: `${SHOTS}/mx-intro.png` });
  const mainBtn = () => p.locator('[data-k="mock-exam"] button').last();
  await mainBtn().click(); await p.waitForTimeout(500);
  const tm = (await p.textContent('[data-k="mx-time"]').catch(() => '')) || '';
  ok('② 시험지 = 10문항 · 타이머', (await p.$$('[data-k="mx-q"]')).length === 10 && /2[45]:\d\d/.test(tm), tm);
  await p.screenshot({ path: `${SHOTS}/mx-paper.png` });
  const f7 = await p.evaluate(() => globalThis.__mock.fill(7)); await p.waitForTimeout(200);
  await mainBtn().click(); await p.waitForTimeout(300);
  ok('빈칸 제출 = 한 번 더 묻기', /그래도 낼까요/.test((await mainBtn().textContent()) || ''), (await mainBtn().textContent()) || '');
  await mainBtn().click(); await p.waitForTimeout(2200);
  const sc = (await p.textContent('[data-k="mx-score"]').catch(() => '')) || '';
  ok(`③ ${f7} / 10 · 틀린 ${10 - f7} · 허수아비로 · 연습 줄`, new RegExp(`^\\s*${f7}\\s*/\\s*10`).test(sc) && (await p.$$('[data-k="mx-wrong"]')).length === 10 - f7 && (await p.$$('[data-k="mx-review"]')).length === 10 - f7 &&/연습이에요/.test((await p.textContent('[data-k="mx-resline"]')) || ''), sc);
  await p.screenshot({ path: `${SHOTS}/mx-result7.png` });
  await mainBtn().click(); await p.waitForTimeout(500);
  let f10 = 0;
  for (let t = 0; t < 8; t++) { f10 = await p.evaluate(() => globalThis.__mock.fill(10)); if (f10 === 10) break; await mainBtn().click(); await mainBtn().click(); await p.waitForTimeout(1500); await mainBtn().click(); await p.waitForTimeout(400); } // 답을 다 채울 수 있는 판이 나올 때까지 (과목 고유 꼴 = 시험 고리가 답을 못 만듦)
  await mainBtn().click(); await p.waitForTimeout(2200);
  ok('다시 도전 → 10/10 = 쓰러짐', /10\s*\/\s*10/.test((await p.textContent('[data-k="mx-score"]')) || '') && (await p.getAttribute('[data-k="mx-boss"]', 'data-frame')) === '3', `채운 ${f10}`);
  await p.screenshot({ path: `${SHOTS}/mx-result10.png` });
  await b.close(); console.log(errs.length ? `❌ ${errs.length}` : '✅ 오류 0'); process.exit(errs.length ? 1 : 0);
})();
