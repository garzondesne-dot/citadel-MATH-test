// 📺 TV(PC) 정식 b206 캡처 3건 (🐞 2026-11-15): ① 개념 단계 문제 칸 확대 = 좁은 세로 띠 → 화면 대부분 · 가로 글자
//   ② 던전 대기실 선생님 = 앞쪽 바닥 · 학생 1.15배 · 말풍선과 안 겹침 · 학생 용사 보임 ③ 「들어온 학생 n / 명단」 · 조작 막대가 숨으면 손잡이
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${B}?role=hall&mode=test&room=TL1`); await p.waitForSelector('.campv', { timeout: 20000 }); await p.waitForTimeout(1200);
  await p.click('[data-zone="gate"]'); await p.waitForSelector('.lring', { timeout: 10000 }); await p.waitForTimeout(1000);
  const g = await p.evaluate(() => { const r = (e) => e.getBoundingClientRect(); const L = r(document.querySelector('.lring')), t = r(document.querySelector('.tchr .hs')), bub = r(document.querySelector('.tchr .bub')), s = document.querySelector('.rows .h .hs'); const sr = s ? r(s) : null;
    return { tBottomGap: L.bottom - t.bottom, tW: t.width, sW: sr?.width ?? 0, over: !(t.right < bub.left || t.left > bub.right || t.bottom < bub.top || t.top > bub.bottom), box: document.querySelector('.nbox')?.textContent.replace(/\s+/g, ' ').trim() }; });
  ok('② 선생님 = 앞쪽 바닥(대기실 아래 끝 근처)', g.tBottomGap < 80, `${Math.round(g.tBottomGap)}px`);
  ok('② 선생님 = 학생의 1.15배 · 학생 용사 64px 넘게 보임', g.sW > 64 && Math.abs(g.tW / g.sW - 1.15) < 0.05, `학생 ${Math.round(g.sW)} · 선생님 ${Math.round(g.tW)}`);
  ok('② 말풍선 ↔ 선생님 용사 안 겹침', !g.over);
  ok('③ 들어온 학생 = 0 / 명단', /들어온 학생\s*0\s*\/\s*\d+/.test(g.box || ''), g.box);
  await p.screenshot({ path: `${SHOTS}/tvlobby.png` });
  await p.waitForTimeout(3500);
  ok('③ 조작 막대 숨으면 손잡이 보임', !!(await p.$('[data-k="dock-handle"]')));
  await p.evaluate(() => document.querySelector('[data-k="dock-handle"]').click()); await p.waitForTimeout(300);
  ok('③ 손잡이 누르면(터치) 조작 막대', await p.$eval('.dock', (e) => e.classList.contains('on')));
  await p.waitForTimeout(3500); await p.mouse.move(700, 500); await p.mouse.move(720, 520); await p.waitForTimeout(300);
  ok('③ 마우스 움직이면 조작 막대 · 손잡이 사라짐', (await p.$eval('.dock', (e) => e.classList.contains('on'))) && !(await p.$('[data-k="dock-handle"]')));
  // 수업 시작 → 개념 단계 (학생 한 명 = 같은 브라우저 다른 탭 · 이 기기 모드)
  const st = await p.context().newPage(); await st.goto(`${B}?role=student&mode=test&room=TL1`); await st.waitForTimeout(3000);
  await p.bringToFront(); await p.mouse.move(600, 400); await p.waitForTimeout(800);
  const go = p.locator('.dock button:has-text("수업 시작"), .dock button:has-text("앞으로")').first(); await go.click(); await p.waitForTimeout(1200);
  for (let i = 0; i < 4 && !(await p.$('.split')); i++) { await p.mouse.move(800, 400); await p.waitForTimeout(200); const g2 = p.locator('.dock button:has-text("앞으로"), .dock button:has-text("수업 시작")').first(); if (await g2.isVisible().catch(() => false)) await g2.click(); await p.waitForTimeout(1000); }
  ok('개념 단계 2분할', !!(await p.$('.split')));
  const panes = await p.$$('.split .cpane');
  if (panes.length > 1) {
    await panes[1].click(); await p.waitForTimeout(500);
    const w = await p.evaluate(() => { const v = [...document.querySelectorAll('.split .cpane')].find((e) => getComputedStyle(e).display !== 'none'); return v ? v.getBoundingClientRect().width / innerWidth : 0; });
    ok('① 문제 칸 확대 = 화면 폭의 80% 넘음 (좁은 띠 아님)', w > 0.8, `${Math.round(w * 100)}%`);
    await p.screenshot({ path: `${SHOTS}/tvzoom-q.png` });
    await p.locator('.split .cpane:visible').first().click(); await p.waitForTimeout(400); await p.locator('.split .cpane:visible').first().click(); await p.waitForTimeout(500);
    const w1 = await p.evaluate(() => { const v = [...document.querySelectorAll('.split .cpane')].find((e) => getComputedStyle(e).display !== 'none'); return v ? v.getBoundingClientRect().width / innerWidth : 0; });
    ok('① 개념 칸 확대도 = 80% 넘음', w1 > 0.8, `${Math.round(w1 * 100)}%`);
  }
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
