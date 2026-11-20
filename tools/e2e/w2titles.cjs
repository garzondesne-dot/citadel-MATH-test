// 🏅 W2 용사마다 스킬 · 칭호 (📜 2026-11-20) — 이 기기 저장(테스트 모드와 같은 길)
//   로안(쌍월 참 · 만 번째 베기) → 녹스로 출전(처음 = 가진 것 중 가장 높은 스킬 · 칭호 그대로) → 저장 → 녹스 칭호 「달지 않기」로 바꿔 저장 → 로안으로 → 만 번째 베기 · 쌍월 참이 돌아옴 → 다시 녹스 → 「달지 않기」
//   NODE_PATH=$(npm root -g) node tools/e2e/w2titles.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push('캠프 ' + e));
  await p.goto(B + '?role=camp&room=W2'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2500);
  await p.evaluate(() => { const m = JSON.parse(localStorage.getItem('citadel-v1-me') || '{}'); Object.assign(m, { hero: 0, enh: 10, title: 'slash10k', socket: { 0: 'twin' }, test: true, seen: { ...(m.seen || {}), hero: true }, wallet: { gem: 9999, scroll: 30, ver: 1, buys: ['hero_18', 'fx_claw', 'fx_phantom'].map((id) => ({ id, ver: 1, at: 1 })) } }); delete m.titles; localStorage.setItem('citadel-v1-me', JSON.stringify(m)); });
  const me = () => p.evaluate(() => JSON.parse(localStorage.getItem('citadel-v1-me') || '{}'));
  const open = async () => { await p.reload(); await p.waitForSelector('.stage'); await p.waitForTimeout(700); if (!(await p.$('.mh'))) await p.click('button[aria-label="내 용사 보기"]'); await p.waitForSelector('.mh'); }; // 새로 고침 뒤 보던 창이 다시 열려 있을 수 있음
  const pick = async (name) => { await p.click('.mh .top'); await p.waitForTimeout(400); await p.click(`.swc[aria-label^="${name}"]`); await p.waitForTimeout(200); await p.click('.hsw .pmain'); await p.waitForTimeout(300); };
  const saveIt = async () => { await p.click('[aria-label="저장"]').catch(() => {}); await p.waitForTimeout(300); await p.$eval('.askbox .btn', (e) => e.click()).catch(() => {}); await p.waitForTimeout(500); };
  await open(); await pick('녹스'); await saveIt();
  let m = await me();
  ok('녹스 처음 = 가진 것 중 가장 높은 스킬(그림자 분신) · 칭호 그대로', m.hero === 18 && m.socket['18'] === 'phantom' && m.title === 'slash10k', JSON.stringify({ h: m.hero, s: m.socket, t: m.title, ts: m.titles }));
  ok('옛 계정 칭호 = 로안 칸에 옮김', m.titles && m.titles['0'] === 'slash10k');
  // 녹스 칭호 = 달지 않기
  await p.click('.mh [role="tab"]:has-text("기록"), .mh .tabs button:has-text("기록")').catch(() => {}); await p.waitForTimeout(300);
  await p.evaluate(() => [...document.querySelectorAll('.mh button.row')].find((b) => /호칭 고르기/.test(b.textContent))?.click()); await p.waitForTimeout(400);
  await p.evaluate(() => [...document.querySelectorAll('.ttp')].find((b) => /달지 않기/.test(b.textContent))?.click()); await p.waitForTimeout(300); await saveIt();
  m = await me(); ok('녹스 칭호 = 달지 않기 저장', m.title === 'none' && m.titles['18'] === 'none', JSON.stringify(m.titles));
  await open(); await pick('로안'); await saveIt();
  m = await me(); ok('로안으로 = 만 번째 베기 · 쌍월 참 돌아옴', m.hero === 0 && m.title === 'slash10k' && m.socket['0'] === 'twin', JSON.stringify({ t: m.title, s: m.socket }));
  const card = await p.$eval('.mh .top', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => '');
  ok('내 용사 맨 위 = 각성한 로안 칭호', /만 번째 베기/.test(card), card.slice(0, 60));
  await open(); await pick('녹스'); await saveIt();
  m = await me(); ok('다시 녹스 = 달지 않기 · 그림자 분신', m.title === 'none' && m.socket['18'] === 'phantom');
  await p.screenshot({ path: `${SHOTS}/w2.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
