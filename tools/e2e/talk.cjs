// 📣 학생 폰 도입 · 개념 화면 (📜 2026-11-15 머리 🔨 ⑥ · 「빈 화면 · 고장 난 것 같아」): 위 = 던전 배경 + 내 용사 + 「👩‍🏫 선생님 설명 중」 띠 · 몬스터 없음
//   아래 = 📣 도입/개념 설명 · 단계 이름 · 말 · 칸 그림(있으면) · 영상 단추(있으면) · 360 · 390 넘침 0 · 빈 화면 아님
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  for (const W of [390, 360]) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
    const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('TV ' + String(e) + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
    await t.goto(`${B}?role=hall&mode=test&lesson=set-08&room=TK${W}`); await t.waitForSelector('.dock', { timeout: 20000 }); await t.waitForTimeout(800);
    const s = await ctx.newPage(); await s.setViewportSize({ width: W, height: 780 }); s.on('pageerror', (e) => errs.push('폰 ' + String(e)));
    await s.goto(`${B}?role=student&mode=test&lesson=set-08&room=TK${W}`); await s.waitForTimeout(2500);
    const seen = {};
    for (let i = 0; i < 8 && Object.keys(seen).length < 2; i++) {
      await t.bringToFront(); await t.mouse.move(600, 400); await t.waitForTimeout(150); const g = t.locator('.dock .go').first(); if (await g.isVisible().catch(() => false)) await g.click(); await t.waitForTimeout(900);
      await s.bringToFront(); await s.waitForTimeout(1500);
      const v = await s.evaluate(() => { const c = document.querySelector('[data-k="talk"]'); return c ? { lab: c.querySelector('.lab')?.textContent, ttl: c.querySelector('.ttl')?.textContent, scene: !!document.querySelector('.edge'), mon: !!document.querySelector('.edge .mon'), hero: !!document.querySelector('.edge .hero'), note: document.querySelector('.edge .tag')?.textContent, over: document.documentElement.scrollWidth - innerWidth, img: !!c.querySelector('img'), vid: !!c.querySelector('[data-k="talk-vid"]') } : null; });
      if (v) { const k = /도입/.test(v.lab) ? 'intro' : 'concept'; if (!seen[k]) { seen[k] = v; await s.screenshot({ path: `${SHOTS}/talk-${k}-${W}.png` }); } }
    }
    for (const k of ['intro', 'concept']) {
      const v = seen[k];
      ok(`${W} ${k === 'intro' ? '도입' : '개념'} = 장면(배경 · 내 용사 · 설명 중 띠 · 몬스터 없음) + 카드 · 넘침 0`, !!v && v.scene && v.hero && !v.mon && /설명 중/.test(v.note || '') && !!v.ttl && v.over <= 0, JSON.stringify(v));
    }
    await ctx.close();
  }
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
