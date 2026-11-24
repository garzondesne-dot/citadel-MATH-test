// 🎥 📜 11/24 「종합실엔 녹화 모드가 없어 · 설정에 넣어 줘」 — 종합실 ⚙ → 🎥 촬영 모드 = 교사 폰과 같은 칸(방 meta/film) · 켜면 종합실 명단 이름 가림 · 다시 누르면 끔
//   node tools/e2e/tvfilm1124.cjs <캡처 폴더> [주소]   (이 기기 테스트 모드)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); t.on('pageerror', (e) => errs.push('TV ' + e));
  const R = 'TF24';
  await t.goto(`${B}?role=hall&mode=test&lesson=set-09&room=${R}`); await t.waitForSelector('.dock', { timeout: 20000 }); await t.waitForTimeout(800);
  await t.click('[data-k="tvset"]'); await t.waitForTimeout(200);
  ok('⚙ 설정에 🎥 촬영 모드', !!(await t.$('[data-k="tvfilm"]')), (await t.textContent('[data-k="tvfilm"]').catch(() => '')) || '');
  await t.click('[data-k="tvfilm"]'); await t.waitForTimeout(300);
  ok('누르면 방 meta/film = true (교사 폰과 같은 칸)', (await t.evaluate((c) => window.__dbGet(`rooms/${c}/meta/film`), R)) === true);
  ok('단추 = 켬 표시', /켬/.test((await t.textContent('[data-k="tvfilm"]')) || ''));
  ok('종합실 어디에도 「촬영 중」 없음', !/촬영 중/.test((await t.textContent('body')) || ''));
  await t.screenshot({ path: `${SHOTS}/tv-film-on.png` });
  await t.click('[data-k="tvfilm"]'); await t.waitForTimeout(300);
  ok('다시 누르면 끔', !(await t.evaluate((c) => window.__dbGet(`rooms/${c}/meta/film`), R)));
  console.log(errs.length ? `❌ ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); await b.close(); process.exit(errs.length ? 1 : 0);
})();
