// 📺 TV(PC) 교사 캠프 (🐞 2026-11-15 정식 b205 선생님 캡처 3건): ① 학생 입장 QR = 지금 사이트 주소 + ?join=코드 ② 교사 용사 크기 = 학생 캠프 비율 · 허수아비와 안 겹침
//   ③ 마우스로 물건 클릭: 모루 · 허수아비 · 게시판 · 성채 = 가운데 창 · 차원문 = 던전 대기실(수업 열린 채로) · 맨 위 요소(elementFromPoint) 확인
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${B}?role=hall&mode=test&room=TC1`); await p.waitForSelector('.campv', { timeout: 20000 }); await p.waitForTimeout(1500);
  const qr = await p.$eval('.campqr svg', (e) => e.getAttribute('data-text')).catch(() => '');
  ok('① QR = 지금 사이트 주소 + ?join=코드', qr.startsWith(B) && /\?join=\w+/.test(qr) && !/\.\//.test(qr), qr);
  const geo = await p.evaluate(() => { const r = (s) => document.querySelector(s)?.getBoundingClientRect(); const c = r('.campv'), h = r('.campv .me'), s = r('[data-prop="scare"]'); return { cw: c.width, hw: h.width, ov: !!(s && h && !(h.right < s.left || h.left > s.right || h.bottom < s.top || h.top > s.bottom)) }; });
  ok('② 교사 용사 폭 = 장면의 24% 안쪽(학생 캠프 비율) · 허수아비와 안 겹침', geo.hw / geo.cw < 0.24 && !geo.ov, `${Math.round((geo.hw / geo.cw) * 100)}% · 겹침 ${geo.ov}`);
  await p.screenshot({ path: `${SHOTS}/tvcamp.png` });
  const top = (sel) => p.$eval(sel, (e) => { const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (e === t || e.contains(t)); });
  const shut = async () => {
    for (let i = 0; i < 3 && (await p.$('[data-k="tv-sheet"]')); i++) {
      const x = await p.$('[data-k="tv-sheet"] .x, [data-k="tv-sheet"] .back, [data-k="tv-sheet"] button[aria-label="닫기"], [data-k="tv-sheet"] button:has-text("닫기")');
      if (x) await x.click().catch(() => {}); else await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    }
  };
  for (const k of ['anvil', 'scare', 'dummy']) {
    if (!(await p.$(`[data-prop="${k}"]`))) { log(`   (${k} 꺼짐)`); continue; }
    const t = await top(`[data-prop="${k}"]`);
    await p.click(`[data-prop="${k}"]`); await p.waitForTimeout(700);
    ok(`③ ${k} 클릭 = 맨 위 요소 · 가운데 창`, t && !!(await p.$('[data-k="tv-sheet"]')));
    await p.screenshot({ path: `${SHOTS}/tvcamp-${k}.png` });
    await shut(); ok(`   ${k} 창 닫힘`, !(await p.$('[data-k="tv-sheet"]')));
  }
  await p.click('[data-zone="castle"]'); await p.waitForTimeout(800); ok('③ 성채 클릭 = 가운데 창', !!(await p.$('[data-k="tv-sheet"]')));
  await p.screenshot({ path: `${SHOTS}/tvcamp-castle.png` });
  await shut(); ok('   성채 창 닫힘', !(await p.$('[data-k="tv-sheet"]')));
  await p.click('[data-zone="gate"]'); await p.waitForTimeout(1200);
  ok('③ 차원문 클릭 = 던전 대기실(캠프 화면 끝)', !(await p.$('.campv')), await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 80)));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
