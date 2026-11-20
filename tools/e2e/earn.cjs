// 🏕 내 캠프 시안 + 💎 · 📜 얻는 길 (📜 2026-11-20 선생님 · 머리 🔨) — 390 × 844
//   장면 = 폰 양끝까지 · 가로 넘침 0 · 💎 누름 = 얻는 길 7칸(스크롤 없음) · 타일 누름 = 그 물건 · 📜 누름 = 얻는 길 4칸 · 닫힘 단추 = 「🔒 차시 던전 / 수업 대기」 · 살 칸 = 「… 열기」 단추
//   NODE_PATH=$(npm root -g) node tools/e2e/earn.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=camp&room=EA'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(3000);
  await p.evaluate(() => { const m = JSON.parse(localStorage.getItem('citadel-v1-me') || '{}'); m.seen = { ...(m.seen || {}), hero: true }; localStorage.setItem('citadel-v1-me', JSON.stringify(m)); }); await p.reload(); await p.waitForTimeout(3500);
  const g = await p.evaluate(() => { const r = document.querySelector('.stage').getBoundingClientRect(); return { sw: document.scrollingElement.scrollWidth, l: Math.round(r.left), w: Math.round(r.width) }; });
  ok('장면 = 폰 양끝까지 · 가로 넘침 0', g.l === 0 && g.w === 390 && g.sw <= 390, JSON.stringify(g));
  ok('위 막대 💎 · 📜 = 아이콘 글꼴 글자', (await p.$$eval('[data-k="wallet"] .wic', (x) => x.map((e) => e.textContent).join(''))) === '💎📜');
  ok('닫힘 단추 = 🔒 차시 던전 / 수업 대기', /🔒 차시 던전\s*수업 대기/.test((await p.textContent('[data-k="gate-shut"]').catch(() => '')) || ''));
  ok('살 수 있는 칸 = 「… 열기」 단추', /열기/.test((await p.textContent('[data-k="next-buy"]').catch(() => '')) || ''));
  await p.screenshot({ path: `${SHOTS}/earn-camp.png` });
  const snd = () => p.evaluate(() => (window.__sfxLog || []).slice());
  await p.click('[data-k="wallet-gem"]'); await p.waitForTimeout(600);
  ok('🔊 💎 누름 = star 소리', (await snd()).includes('star'));
  const s1 = await p.evaluate(() => { const body = document.querySelector('.sheet .body'); return { tiles: [...document.querySelectorAll('.tile')].map((t) => t.dataset.earn), over: body ? body.scrollHeight - body.clientHeight : -1, amt: [...document.querySelectorAll('.tile .amt')].every((a) => /💎 (\+\d|여러)/.test(a.textContent)) }; });
  ok('💎 얻는 길 = 7칸 · 스크롤 없음 · 칸마다 💎 값', s1.tiles.join(',') === 'chal,scare,castle,board,raid,chest,mail' && s1.over <= 0 && s1.amt, JSON.stringify(s1));
  await p.screenshot({ path: `${SHOTS}/earn-gem.png` });
  await p.click('.tile[data-earn="scare"]'); await p.waitForTimeout(1500);
  ok('🔊 타일 누름 = 그 물건 소리(허수아비 dummy-hit)', (await snd()).includes('dummy-hit'));
  ok('타일 누름 = 그 물건(허수아비)', /복습 허수아비/.test(await p.evaluate(() => document.body.innerText)));
  await p.reload(); await p.waitForTimeout(3000);
  for (let i = 0; i < 3 && (await p.$('.sheet .x')); i++) { await p.click('.sheet .x').catch(() => {}); await p.waitForTimeout(400); }
  await p.click('[data-k="wallet-scroll"]'); await p.waitForTimeout(600);
  ok('🔊 📜 누름 = scroll 소리', (await snd()).includes('scroll'));
  ok('📜 얻는 길 = 수업 · 허수아비 · 성채 · 도전과제', (await p.$$eval('.tile', (x) => x.map((t) => t.dataset.earn).join(','))) === 'raid,scare,castle,chal');
  await p.screenshot({ path: `${SHOTS}/earn-scroll.png` });
  await p.click('.sheet .x'); await p.waitForTimeout(400); await p.click('[data-k="next-buy"]'); await p.waitForTimeout(600);
  ok('🔊 「… 열기」 단추 = click 소리 + 내 용사', (await snd()).slice(-3).includes('click') && !!(await p.$('.mh')));
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
