// 📊 우리 반 고비 (📜 2026-11-17 #14) — 시험 모드 TV · 가상 친구 5명이 문제 1에 낸 답 → 막대 「📊 풀이」 = 고비 카드 · 공격 시계 멈춤 · 한 번 더 = 닫힘
//   NODE_PATH=$(npm root -g) node tools/e2e/gobi.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); t.on('pageerror', (e) => { errs.push(String(e)); console.log('PAGEERR', String(e).slice(0, 300)); });
  await t.goto(`${B}?role=hall&mode=test&lesson=set-05&room=GB1`); await t.waitForSelector('.dock', { timeout: 20000 });
  await t.evaluate(() => window.__tvFake?.(12));
  for (let i = 0; i < 12 && !(await t.$('[data-k="tv-gauge"]')); i++) { await t.click('.dock .go').catch(() => {}); await t.waitForTimeout(800); }
  // 가상 친구 5명 = 1번 칸 「X」로 틀림 (3명 이상 같은 오답) · 2명은 다음 판에 해냄
  await t.evaluate(() => { for (let k = 0; k < 5; k++) { window.__dbSet(`rooms/GB1/subs/m1/fake${k}/0`, [['7'], ['7'], ['7']]); } window.__dbSet('rooms/GB1/subs/m1/fake0/1', [['1', '2', '3', '4', '5'], ['7'], ['7']]); });
  await t.waitForTimeout(800);
  await t.screenshot({ path: `${SHOTS}/gobi-0.png` }); log(JSON.stringify(await t.evaluate(() => ({ st: window.__dbGet('rooms/GB1/state/step'), feat: window.__dbGet('school/features'), dock: [...document.querySelectorAll('.dock button')].map((b) => b.textContent.trim()) }))));
  const lab0 = (await t.textContent('[data-k="dock-review"]').catch(() => '')) || '';
  ok('📊 단추 = 반이 풀면 보임 「풀이」', /풀이/.test(lab0), lab0);
  await t.click('[data-k="dock-review"]'); await t.waitForTimeout(800);
  const g = await t.evaluate(() => { const e = document.querySelector('[data-k="tv-gobi"]'); return e ? { t: e.textContent.replace(/\s+/g, ' ').slice(0, 220), hot: !!e.querySelector('li.hot') } : null; });
  ok('누르면 TV 📊 우리 반이 힘들어한 곳 · 🔥 제일 힘들었던 칸 · 응원 줄', !!g && /힘들어한 곳/.test(g.t) && /처음에 틀린 친구 5/.test(g.t) && g.hot && /고민 중|같이/.test(g.t), JSON.stringify(g));
  ok('살아 있는 몬스터 = 많이 쓴 답 숨김', !!g && !/많이 쓴 답/.test(g.t));
  const paused = await t.evaluate(() => window.__dbGet('rooms/GB1/state/demoAt') != null);
  ok('고비 동안 공격 시계 멈춤', paused);
  await t.screenshot({ path: `${SHOTS}/gobi-tv.png` });
  await t.click('[data-k="dock-review"]'); await t.waitForTimeout(600);
  ok('한 번 더 = 닫힘 · 시계 다시', !(await t.$('[data-k="tv-gobi"]')) && (await t.evaluate(() => window.__dbGet('rooms/GB1/state/demoAt') == null)));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
