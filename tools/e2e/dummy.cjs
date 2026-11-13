// 🎯 허수아비 = 혼자 복습 (📜 2026-11-13 밤 쪼갬): 캠프 🎯 → 차시 칩 · 문제마다 숫자 꼬리표 · ✍ 서술형만(흐림) → 시작 → 레이드 화면 그대로 · 「📄 학습지 숫자」 꼬리표 · ❤ 없음 / 📋 게시판 = 「팀 없이 도전」
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=camp&room=DM1'); await p.waitForSelector('.stage');
  const props = await p.$$eval('.prop', (x) => x.map((e) => e.getAttribute('aria-label')));
  log('캠프 물건:', props.join(' · ')); if (!props.includes('🎯 허수아비') || !props.includes('📋 게시판')) errs.push('🎯 · 📋 둘 다 있어야');
  await p.screenshot({ path: `${SHOTS}/dummy-camp.png` });
  await p.click('.prop[aria-label="🎯 허수아비"]'); await p.waitForSelector('.chips'); await p.waitForTimeout(300);
  const tags = await p.$$eval('.tl li', (x) => x.map((e) => e.textContent.replace(/\s+/g, ' ').trim())); log('꼬리표:', tags.join(' | '));
  const wonly = await p.$eval('.wonly', (x) => x.disabled); log('✍ 서술형만 흐림:', wonly);
  await p.screenshot({ path: `${SHOTS}/dummy-pick.png` });
  await p.waitForTimeout(500); await p.locator('.sheet .pmain').evaluate((e) => e.click()); await p.waitForSelector('.drun .qwrap, .drun .bcard', { timeout: 15000 }); await p.waitForTimeout(1500);
  const tag = await p.$eval('.drun .tag', (x) => x.textContent).catch(() => '없음'), hearts = await p.$$eval('.drun .pmain .hs', (x) => x.length);
  log('문제 꼬리표:', tag, '· 노란 단추 하트', hearts); if (!/학습지 숫자|바뀐 숫자/.test(tag)) errs.push('꼬리표 없음'); if (hearts) errs.push('허수아비에 하트');
  await p.screenshot({ path: `${SHOTS}/dummy-run.png` });
  await p.click('.drun .quit'); await p.waitForTimeout(300); await p.click('.sheet .x'); await p.waitForTimeout(400);
  await p.click('.prop[aria-label="📋 게시판"]'); await p.waitForTimeout(500); const bt = await p.$eval('button.pmain:has-text("팀 없이")', (x) => x.textContent).catch(() => '없음'); log('게시판 단추:', bt.trim()); if (!/팀 없이 도전/.test(bt)) errs.push('게시판 「팀 없이 도전」');
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
