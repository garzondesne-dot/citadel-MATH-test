// 🧙 교사 「내 용사」 = 한 곳 (📜 2026-11-14 선생님 「교사의 내 용사 관리도 학생들처럼 일관 · 게시판 던전 갔더니 또 다른 캐릭터」)
//   교사 폰 「나」에서 「공식」 저장 → 서버 school/tlook → 교사 캠프 카드 · 📋 게시판 전투 용사 · 팀 방 players 용사 = 같음
//   → 다른 기기(TV 교사 캠프)가 바꿈(서버 값 바뀜) → 교사 캠프 다시 열면 같은 새 용사 · 학생 기기 칸은 안 바뀜
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/tme1.cjs <폴더>
const { chromium } = require('playwright'); const path = require('path');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), t = await ctx.newPage(); await t.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); } catch { /* */ } }); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => { localStorage.clear(); localStorage.setItem('citadel-v1-me', JSON.stringify({ hero: 3, socket: {} })); }); await t.reload(); await t.waitForSelector('.tabs'); // 이 기기 학생 칸 = 닌자(교사 화면에 나오면 안 됨)
  await t.click('.tabs button:has-text("나")'); await t.waitForTimeout(300); await t.click('button.hc'); await t.waitForSelector('button.top[aria-label="용사 바꾸기"]');
  await t.click('button.top[aria-label="용사 바꾸기"]'); await t.waitForSelector('.hsw .swc'); await t.click('.hsw .swc:has-text("공식")'); await t.waitForTimeout(200); await t.click('.hsw .pmain'); await t.waitForTimeout(300); await t.click('button:has-text("💾 저장")'); await t.waitForTimeout(600);
  const srv = await t.evaluate(() => window.__dbGet('school/tlook')); ok('① 교사 폰 저장 → 서버', srv?.hero === 17, JSON.stringify(srv && { hero: srv.hero, fx: srv.fx }));
  // ② 교사 캠프
  await t.goto(B + '?role=camp&from=me'); await t.waitForSelector('.hero-card'); await t.waitForTimeout(500);
  const card = (await t.textContent('.hero-card')).replace(/\s+/g, ' '); ok('② 교사 캠프 카드 = 공식(📐 수식)', /수식/.test(card), card.slice(0, 50));
  // ③ 📋 게시판 1인 전투 용사
  await t.click('button[aria-label="게시판"]'); await t.waitForSelector('.bd'); await t.waitForTimeout(300);
  if (await t.$('[data-k="board-story"]')) await t.click('[data-k="board-story"]');
  await t.click('.bd .act .btn'); await t.waitForSelector('[data-k="atb-stage"]', { timeout: 15000 }); await t.waitForTimeout(1500); // 📜 #65 혼자 도전 = 새 전투
  const lab = await t.$$eval('[data-k="atb-hero"] .tag > b', (x) => x.map((e) => e.textContent.trim()).join(' · ')).catch(() => '');
  ok('③ 게시판 새 전투 내 용사 = 공식', /공식/.test(lab.split(' · ')[0] || ''), lab);
  const pl = await t.evaluate(() => { const rs = Object.entries(JSON.parse(JSON.stringify(localStorage))).filter(([k]) => /rooms\/T/.test(k)); return rs.map(([k, v]) => { try { const o = JSON.parse(v); return JSON.stringify(Object.values(o.players || o || {}).map((x) => x && x.hero)); } catch { return ''; } }).join(' '); });
  await t.screenshot({ path: path.join(SHOTS, 'tme1-board.png') });
  // ④ 다른 기기에서 바꿈(서버 값) → 교사 캠프 다시
  await t.evaluate(() => window.__dbSet('school/tlook', { hero: 7, enh: 3, fx: 'qed', socket: {}, title: 'none', nick: '선생님', at: Date.now() }));
  await t.goto(B + '?role=camp&from=me'); await t.waitForSelector('.hero-card'); await t.waitForTimeout(500);
  const card2 = (await t.textContent('.hero-card')).replace(/\s+/g, ' '); ok('④ 서버 값 바뀜 → 교사 캠프 = 현자(🔮 마법 · +3)', /마법/.test(card2) && /\+3/.test(card2), card2.slice(0, 50));
  const stu = await t.evaluate(() => JSON.parse(localStorage.getItem('citadel-v1-me') || '{}').hero); ok('⑤ 이 기기 학생 칸은 그대로(닌자 3)', stu === 3, String(stu));
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
