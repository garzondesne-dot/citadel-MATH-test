// 🧾 📜 #128 게시판 문제 카드 = 레이드 학생 문제 화면과 같은 부품 (src/ui/q · AnswerRow · ChainStage) — 미리 보기 서버 4173 · 가로 폰 844 × 390
//   ① 일반 원문항 = 답안 줄 칸(소문항 수) · 맞힘 = 낸 칸 ✔ 뒤집힘 · 틀림 = ✘ · 카드가 가려지지 않음(전역 .bad 겹침 #128 🩹)
//   ② 소레이드(9차시 문제 5) = 졸개 ① → 👑 대장 · 단계마다 「📜 나의 풀이」 줄이 쌓임 · 지금 단계 이름표가 카드 안에 보임 · 끝 = 채점
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
(async () => {
  const out = [], errs = [], ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 844, height: 390 } });
  await p.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); globalThis.__atbNoAutoQ = true; } catch { /* 무시 */ } });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('http://localhost:4173/?role=atb'); await p.waitForSelector('[data-k="atb-setup"]');
  await p.click('button[data-no="9"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(800);
  await p.evaluate(() => globalThis.__atb.pause(true));
  const ev = (f, a) => p.evaluate(f, a), wait = (ms) => p.waitForTimeout(ms);
  // ① 일반
  const n1 = await ev(() => globalThis.__atb.show('m3', 1, 0)); await wait(400);
  ok('① 일반 원문항 = 답안 줄 칸 = 소문항 수', (await p.$$('[data-k="atb-cells"] .cell')).length === n1, String(n1));
  await ev(() => globalThis.__atb.solve()); await wait(150);
  ok('① 맞힘 = 낸 칸 ✔ (s-ok)', !!(await p.$('[data-k="atb-cells"] .cell.s-ok')));
  await wait(800); await ev(() => globalThis.__atb.miss()); await wait(150);
  ok('① 틀림 = 낸 칸 ✘ (s-bad)', !!(await p.$('[data-k="atb-cells"] .cell.s-bad')));
  const cover = await ev(() => { const r = document.querySelector('[data-k="atb-quiz"]').getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height * 0.45; return [...document.querySelectorAll('[data-k="atb-quiz"] *')].some((e) => { const c = getComputedStyle(e), q = e.getBoundingClientRect(); return c.position === 'absolute' && q.width > r.width * 0.8 && q.height > r.height * 0.8 && c.backgroundColor !== 'rgba(0, 0, 0, 0)' && q.left <= x && q.right >= x && q.top <= y && q.bottom >= y; }); });
  ok('🩹 틀림 순간 카드가 진한 판에 가려지지 않음', !cover);
  // ② 소레이드
  const n2 = await ev(() => globalThis.__atb.show('m5', 1, 0)); await wait(400);
  ok('② 소레이드 = ChainStage(답안 줄 + 단계 이름표)', !!(await p.$('[data-k="atb-chain"] .lab')) && (await p.$$('[data-k="atb-chain"] .cell')).length === n2, String(n2));
  let grew = true, seen = true, prev = 0;
  for (let k = 0; k < n2 - 1; k++) {
    await ev(() => globalThis.__atb.solve()); await wait(900);
    const st = await ev(() => { const bd = document.querySelector('.body'), l = document.querySelector('[data-k="atb-chain"] .lab'); const B = bd.getBoundingClientRect(), L = l.getBoundingClientRect(); return { lines: document.querySelectorAll('[data-k="atb-chain"] .story ol li').length, lab: l.textContent, vis: L.top >= B.top - 1 && L.bottom <= B.bottom + 1 }; });
    if (st.lines <= prev) grew = false; prev = st.lines; if (!st.vis) seen = false;
    if (k === n2 - 2) ok('② 마지막 = 👑 대장', /대장/.test(st.lab), st.lab);
  }
  ok('② 단계마다 「📜 나의 풀이」 줄이 늘어남', grew, String(prev));
  ok('② 지금 단계 이름표 = 카드 안에 보임 (긴 풀이 = 카드 안 스크롤)', seen);
  await p.screenshot({ path: `${SHOTS}/atb128-boss.png` });
  await ev(() => globalThis.__atb.solve()); await wait(300);
  ok('② 대장 맞힘 = 채점', !!(await p.$('[data-k="atb-grade"]')));
  ok('오류 0', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(out.join('\n')); await b.close(); process.exit(errs.length ? 1 : 0);
})();
