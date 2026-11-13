// 🧙 첫 용사 고르기 (📜 2026-11-13 밤 ❓#1 = A): 가입 → 첫 캠프에서 기본 용사 7 + 소개 카드 → 고르고 시작 → 캠프 용사 = 고른 용사 · 새로 고침 · 다시 로그인 = 안 뜸
//   NODE_PATH=$(npm root -g) node tools/e2e/firsthero.cjs <폴더>   (이 기기 모드)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [], log = (...a) => console.log(...a);
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', (e) => errs.push(String(e))); p.setDefaultTimeout(6000);
  await p.goto(B + '?emu=off'); await p.waitForSelector('.title');
  const login = async (join) => {
    await p.selectOption('select >> nth=0', '1-3'); await p.waitForTimeout(150); await p.selectOption('select >> nth=1', '5'); await p.waitForTimeout(250);
    if (join && !(await p.$('.pw:has(small)'))) await p.click('.lk:has-text("가입")');
    await p.click('.pw >> nth=0'); for (const k of join ? '24682468' : '2468') await p.click(`.pad button:text-is("${k}")`);
    await p.waitForTimeout(200); await p.click('.title .act .pmain'); await p.waitForTimeout(1500);
  };
  await login(true);
  const fh = await p.$('[data-k="first-hero"]'), n = await p.$$eval('[data-k="first-hero"] .c', (x) => x.length).catch(() => 0);
  log('① 가입 → 첫 용사 고르기:', !!fh, '· 기본 용사', n); if (!fh || n !== 7) errs.push('① 첫 용사 화면');
  await p.click('[data-k="first-hero"] .c:has-text("리아넬")'); await p.waitForTimeout(300);
  const card = (await p.textContent('[data-k="first-hero"] .hi .nm')).trim(), btn = (await p.textContent('[data-k="first-hero"] .pmain')).replace(/\s+/g, ' ').trim();
  log('   리아넬 누름 → 소개 카드:', card, '· 단추:', btn); if (card !== '리아넬' || !/리아넬/.test(btn)) errs.push('소개 카드');
  await p.screenshot({ path: `${SHOTS}/firsthero.png` });
  await p.click('[data-k="first-hero"] .pmain'); await p.waitForTimeout(800);
  const gone = !(await p.$('[data-k="first-hero"]')), hero = await p.evaluate(() => { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^citadel-v1-me/.test(k) && !/teacher/.test(k)) { const v = JSON.parse(localStorage.getItem(k)); if (v.seen?.hero0) return v.hero; } } return null; });
  log('② 시작 → 캠프 · 저장된 용사:', gone, hero); if (!gone || hero !== 2) errs.push('② 저장');
  await p.screenshot({ path: `${SHOTS}/firsthero-camp.png` });
  await p.reload(); await p.waitForTimeout(2000); const again = !!(await p.$('[data-k="first-hero"]')); log('③ 새로 고침 = 안 뜸:', !again); if (again) errs.push('③ 다시 뜸');
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
