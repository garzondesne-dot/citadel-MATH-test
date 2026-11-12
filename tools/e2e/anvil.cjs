// #148 ⚒ 모루 한 판 (이 기기 · 360 × 640): ⭐ 찜(기호 톡 ⊂) → 찜 칩 → 💡 목록(찜 맨 위 · 이름 · 기호만) → 틀린 순서 = 실수 메시지 + 🧩 +1 · 🧩 로 재료 공개
//   → [a] ∈ [A] 🔨 두드리기 → 🔮 마력 예제 → ✨ 마력 넣기 → 망치 → NEW CARD → 💎 +3 · 내 카드 → 📖 도감 1 / 54 · 카드 시트 · 11 테마 넘침 0
// 사용: npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/anvil.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/';
const IDS = ['gold', 'navy', 'cloud', 'classic', 'lava', 'star', 'sakura', 'sand', 'deep', 'porcelain', 'parchment'];
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=camp&room=AV'); await p.waitForSelector('.stage');
  await p.evaluate(() => { const m = JSON.parse(localStorage.getItem('citadel-v1-me') || '{}'); m.wishes = { sub: true }; localStorage.setItem('citadel-v1-me', JSON.stringify(m)); });
  await p.reload(); await p.waitForSelector('.stage');
  const gem0 = await p.$eval('.pill', (x) => x.textContent.replace(/\D/g, ''));
  await p.click('button[aria-label="모루"]'); await p.waitForSelector('.fg .stage'); await p.waitForTimeout(400);
  const fit = await p.evaluate(() => { const f = document.querySelector('.fg'); return { over: f.scrollHeight - f.clientHeight, x: document.documentElement.scrollWidth - innerWidth, ops: document.querySelectorAll('.shelf.ops .tile').length, mats: document.querySelectorAll('.shelf.mats .tile').length, wish: [...document.querySelectorAll('.wishes button')].map((x) => x.textContent).join(' ') }; });
  log('① 모루:', JSON.stringify(fit)); if (fit.over > 0 || fit.x > 0) errs.push('모루 넘침'); if (fit.ops !== 24 || fit.mats !== 13) errs.push('재료 13 · 연산 24');
  await p.screenshot({ path: `${SHOTS}/b35-anvil.png` });
  const Y = {}; const yOf = async (k) => { Y[k] = await p.$eval('.pmain', (x) => { const r = x.getBoundingClientRect(); return `${Math.round(r.top)}/${Math.round(r.height)}`; }); };
  await yOf('① 두드리기');
  const order = await p.evaluate(() => { const y = (s) => document.querySelector('.fg ' + s).getBoundingClientRect().top; return y('.shelf.ops') < y('.stage') && y('.stage') < y('.shelf.mats') && y('.shelf.mats') < y('.row2') && y('.row2') < y('.pmain'); }); log('   줄 순서 (찜 → 연산 → 모루 → 재료 → 💡 📖 → 🔨):', order); if (!order) errs.push('줄 순서');
  // ⭐ 찜 칩 → 💡 목록 맨 위
  await p.click('.wishes button'); await p.waitForSelector('.hr'); const top = await p.$eval('.hr', (x) => x.textContent.replace(/\s+/g, ' ').trim()); log('③ 💡 목록 맨 위:', top); if (!/⭐ 부분집합 · A ⊂ B/.test(top)) errs.push('찜 맨 위');
  await p.screenshot({ path: `${SHOTS}/b35-anvil-list.png` }); await yOf('③ 모루로');
  await p.click('.hr button'); await p.waitForTimeout(200); const sh = await p.$eval('.hr .shape', (x) => x.textContent.replace(/\s+/g, ' ').trim()); log('   🧩 재료 보기 →', sh); if (!/A/.test(sh)) errs.push('조각 공개');
  await p.click('.fg .act .pmain');
  // 틀린 순서 → 실수 메시지 + 🧩 +1
  const pts0 = await p.$eval('.row2 .btn2 b', (x) => +x.textContent);
  await p.click('.shelf.ops .tile:has-text("∈")'); await p.click('.shelf.mats .tile >> nth=2'); await p.click('.shelf.mats .tile >> nth=0'); await p.click('.fg .act .pmain'); await p.waitForTimeout(300);
  const m1 = await p.textContent('.msg'), pts1 = await p.$eval('.row2 .btn2 b', (x) => +x.textContent); log('   [A] ∈ [a] →', m1.trim(), '| 🧩', pts0, '→', pts1); if (!/거꾸로/.test(m1) || pts1 !== pts0 + 1) errs.push('엄격 연성 실패');
  // 바른 순서 → 마력 예제
  for (const k of ['l', 'r']) await p.click(`.slots .tile >> nth=${k === 'l' ? 0 : 2}`);
  await p.click('.slots .tile >> nth=0'); await p.click('.shelf.mats .tile >> nth=0'); await p.click('.shelf.mats .tile >> nth=2'); await p.waitForTimeout(150);
  log('   모루 칸:', await p.$$eval('.slots .tile', (xs) => xs.map((x) => x.textContent.trim()).join(' | ')));
  await p.click('.fg .act .pmain'); await p.waitForSelector('.ov .qc'); await yOf('② 마력 넣기'); await p.screenshot({ path: `${SHOTS}/b35-anvil-example.png` });
  log('② 예제:', (await p.textContent('.ov .q')).trim());
  await p.click('.chs button >> nth=1'); await p.click('.ov .act .btn'); await p.waitForTimeout(200); const wr = await p.$('.wr'); log('   틀린 답 → 해설 · 다시:', !!wr); if (!wr) errs.push('예제 틀림');
  await p.click('.chs button >> nth=0'); await p.click('.ov .act .btn'); await p.waitForSelector('.ov.rv', { timeout: 5000 }); await p.screenshot({ path: `${SHOTS}/b35-anvil-new.png` });
  log('   NEW:', (await p.textContent('.ov.rv')).replace(/\s+/g, ' ').trim().slice(0, 80)); await p.click('.ov.rv .pmain'); await p.waitForTimeout(300);
  const gem1 = await p.$eval('.fg .wal', (x) => x.textContent.replace(/\D/g, '')); log('   💎', gem0, '→', gem1); if (+gem1 !== +gem0 + 3) errs.push('💎 +3');
  // 📖 도감
  await p.click('.row2 .btn2 >> nth=1'); await p.waitForSelector('.book'); await p.waitForTimeout(300);
  log('④ 도감:', (await p.textContent('.bk-h')).trim(), '| 첫 묶음:', (await p.textContent('.book h3')).trim()); if (!/1 \/ 54/.test(await p.textContent('.bk-h'))) errs.push('도감 수');
  const fb = await p.evaluate(() => ({ book: document.querySelector('.book').scrollHeight > document.querySelector('.book').clientHeight, fg: document.querySelector('.fg').scrollHeight - document.querySelector('.fg').clientHeight })); log('   가운데만 스크롤:', JSON.stringify(fb)); if (fb.fg > 0) errs.push('도감 넘침');
  await p.screenshot({ path: `${SHOTS}/b35-anvil-book.png` }); await yOf('④ 모루로');
  const pk = await p.$$eval('.perk', (xs) => xs.map((x) => x.textContent.replace(/\s+/g, ' ').trim())); log('   도감 특전:', pk.join(' | ')); if (pk.length !== 3) errs.push('특전 3줄');
  log('주요 단추 위치(top/높이):', JSON.stringify(Y)); if (new Set(Object.values(Y)).size !== 1) errs.push('주요 단추 자리 다름');
  await p.click('.cw >> nth=0'); await p.waitForSelector('.zm'); log('   카드 시트:', (await p.textContent('.zm p')).trim()); await p.click('.sheet .x');
  // 11 테마 넘침
  const rows = [];
  for (const t of IDS) { await p.evaluate((t) => localStorage.setItem('citadel-v1-theme', t), t); await p.reload(); await p.waitForSelector('.stage'); await p.click('button[aria-label="모루"]'); await p.waitForSelector('.fg .stage'); await p.waitForTimeout(250); const o = await p.evaluate(() => { const f = document.querySelector('.fg'); return Math.max(f.scrollHeight - f.clientHeight, document.documentElement.scrollWidth - innerWidth); }); rows.push(`${t} ${o}`); if (o > 0) errs.push(`${t} 넘침`); if (t === 'classic' || t === 'cloud') await p.screenshot({ path: `${SHOTS}/b35-anvil-${t}.png` }); }
  log('11 테마 넘침:', rows.join(' · '));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
