// 🧙 용사 소개 카드 (몽타주): 내 용사 → 「용사 바꾸기」 → 위 = 몽타주 · 이름 · 직업 · 근접/원거리 · 속성 · 별명 · 이야기 · 스킬 단계 · 잠긴 용사 = 흐림 + 열림 조건 · 폰 · 태블릿 캡처
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  for (const [nm, vp] of [['phone', { width: 390, height: 844 }], ['tablet', { width: 820, height: 1180 }]]) {
    const p = await (await b.newContext({ viewport: vp, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(B + '?role=camp&room=HI1'); await p.waitForSelector('.hero-card'); await p.click('.hero-card'); await p.waitForSelector('button.top[aria-label="용사 바꾸기"]');
    await p.click('button.top[aria-label="용사 바꾸기"]'); await p.waitForSelector('.hsw .hi'); await p.waitForTimeout(400);
    const own = await p.$eval('.hsw .hi', (e) => ({ port: !!e.querySelector('.pimg'), txt: e.textContent.replace(/\s+/g, ' ').trim(), lock: e.classList.contains('lock') }));
    log(nm, '가진 용사:', own.port ? '몽타주 ○' : '몽타주 ✗', '|', own.txt.slice(0, 90)); if (!own.port) errs.push(`${nm} 몽타주 없음`);
    await p.screenshot({ path: `${SHOTS}/herointro-${nm}-own.png` });
    await p.click('.swc.lk >> nth=0'); await p.waitForTimeout(300);
    const lk = await p.$eval('.hsw .hi', (e) => ({ dim: !!e.querySelector('.port.dim'), cond: e.querySelector('.cond')?.textContent || '' }));
    log(nm, '잠긴 용사: 흐림', lk.dim, '· 조건', lk.cond); if (!lk.dim || !lk.cond) errs.push(`${nm} 잠긴 용사 흐림 · 조건`);
    await p.screenshot({ path: `${SHOTS}/herointro-${nm}-lock.png` });
    await p.context().close();
  }
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
