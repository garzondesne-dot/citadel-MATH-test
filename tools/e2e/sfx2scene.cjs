// 🔊 효과음 2차 → 장면 (머리 🔨 2026-11-14 · 18종 중 쉬운 장면): 🧙 첫 용사 · 🎯 허수아비 · 📬 우편 · 🔨 강화 → 소리 기록(window.__sfxLog)에 딱 한 번씩
//   NODE_PATH=$(npm root -g) node tools/e2e/sfx2scene.cjs <폴더>   (npx vite build → vite preview --port 4173 · 이 기기 모드)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e))); p.setDefaultTimeout(8000);
  const cnt = (id) => p.evaluate((k) => (window.__sfxLog || []).filter((x) => x === k).length, id);
  // 한 장면 = 앞뒤 기록 차이가 딱 1 (다시 그려도 또 안 남)
  const scene = async (name, ids, act, wait = 900) => {
    const before = {}; for (const id of ids) before[id] = await cnt(id);
    await act(); await p.waitForTimeout(wait);
    const d = {}; for (const id of ids) d[id] = (await cnt(id)) - before[id];
    const sum = Object.values(d).reduce((a, x) => a + x, 0);
    ok(name, sum === 1, ids.map((id) => `${id} +${d[id]}`).join(' · '));
  };
  await p.goto(B + '?emu=off'); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await p.reload(); await p.waitForSelector('.title');
  // 가입 (firsthero.cjs 와 같은 길)
  await p.selectOption('select >> nth=0', '1-3'); await p.waitForTimeout(150); await p.selectOption('select >> nth=1', '5'); await p.waitForTimeout(250);
  if (!(await p.$('.pw:has(small)'))) await p.click('.lk:has-text("가입")');
  await p.click('.pw >> nth=0'); for (const k of '24682468') await p.click(`.pad button:text-is("${k}")`);
  await p.waitForTimeout(200); await p.click('.title .act .pmain'); await p.waitForSelector('[data-k="first-hero"]');
  // ① 🧙 첫 용사 고르기
  await scene('🧙 첫 용사 고름 = hero-pick 한 번', ['hero-pick'], () => p.click('[data-k="first-hero"] .pmain'));
  await p.waitForSelector('.stage');
  // ② 🎯 허수아비 누름
  await scene('🎯 허수아비 누름 = dummy-hit 한 번', ['dummy-hit'], () => p.click('[data-prop="scare"]'));
  await p.screenshot({ path: `${SHOTS}/sfx2scene-dummy.png` });
  await p.reload(); await p.waitForSelector('.stage'); // 시트 닫기 (새로 고침 = 기록 비움 · 시트 기억은 10분 → 지움)
  await p.evaluate(() => sessionStorage.removeItem('citadel-camp-sheet')); await p.reload(); await p.waitForSelector('.stage'); await p.waitForTimeout(500);
  // ③ 📬 우편 새 소식 (선생님 메시지가 캠프에 있을 때 들어옴)
  const uid = await p.evaluate(() => { const a = window.__dbGet('accounts/1-3/5'); return (a && a.uid) || 's1_3_5'; });
  await scene('📬 새 소식 = mail 한 번', ['mail'], () => p.evaluate((u) => window.__dbSet(`mail/${u}/e2e1`, { text: '시험 소식', g: 0, at: Date.now(), kind: 'msg' }), uid), 1200);
  await p.evaluate((u) => window.__dbSet(`mail/${u}/e2e1/seen`, true), uid); await p.waitForTimeout(600); // 같은 소식 칸이 다시 바뀜 → 다시 그림
  ok('📬 같은 소식 = 다시 안 남', (await cnt('mail')) === 1, `mail 기록 ${await cnt('mail')}`);
  // ④ 🔨 강화 → 💾 저장 (강화 성공 · 대성공 중 하나만 · 🔓 해금 소리 없음)
  await p.click('button[aria-label="내 용사 보기"]'); await p.waitForSelector('.mh');
  await p.click('.mh .pmain'); await p.waitForTimeout(150);
  await scene('🔨 강화 저장 = enh-ok · enh-great 중 한 번 (skill-unlock 없음)', ['enh-ok', 'enh-great', 'skill-unlock'], async () => { await p.click('.mh .pmain'); await p.waitForSelector('.ask'); await p.click('.askbox .btn'); });
  await p.screenshot({ path: `${SHOTS}/sfx2scene-enh.png` });
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
  process.exit(errs.length ? 1 : 0);
})();
