// 🐞 11/21 버그 사냥 · 문제 카드 보기가 화면에 다 들어오나 (이 기기): 차시 · 화면 크기마다 카드를 열어 보기 · 숫자판 · 칩이 「제출」 뒤 · 화면 밖이면 그림 + 스크롤로 닿는지
//   node tools/e2e/atbcardfit.cjs  (그림 = /tmp/claude-0/hunt)
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const res = [];
  for (const [w, h, no] of [[844, 390, '6'], [844, 390, '2'], [844, 390, '9'], [740, 360, '6'], [844, 390, '10']]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await p.goto('http://localhost:4173/?role=atb'); await p.waitForSelector('[data-k="atb-setup"]'); await p.click(`[data-k="atb-setup"] .chips button[data-no="${no}"]`); await p.click('[data-k="atb-seed-fix"]');
    await p.click('[data-k="atb-mode-play"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(800); await p.evaluate(() => globalThis.__atb.pause(true));
    await p.click('[data-k="atb-quiz-open"]'); await p.waitForTimeout(800);
    for (let k = 0; k < 6; k++) {
      const r = await p.evaluate(() => { const card = document.querySelector('[data-k="atb-quiz"]'); const sub = document.querySelector('[data-k="atb-submit"]')?.getBoundingClientRect();
        const opts = [...card.querySelectorAll('button.opt, button.rune, button.chip')]; const scs = [card, ...card.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY));
        const bad = opts.filter((e) => { const r = e.getBoundingClientRect(); const top = document.elementFromPoint(Math.min(innerWidth - 1, r.left + r.width / 2), Math.min(innerHeight - 1, r.top + r.height / 2)); return r.bottom > innerHeight || r.right > innerWidth || (top && top !== e && !e.contains(top)); }).map((e) => e.textContent.trim().slice(0, 12));
        return { title: document.querySelector('[data-k="atb-qtitle"]')?.textContent.trim().slice(0, 40), n: opts.length, bad, scroll: scs.map((s) => `${s.className.split(' ')[0]} ${s.scrollHeight}/${s.clientHeight}`), sub: sub && [Math.round(sub.top), Math.round(sub.bottom)], vh: innerHeight }; });
      if (r.bad.length) { res.push({ w, h, no, ...r }); await p.screenshot({ path: `/tmp/claude-0/hunt/qcov-${w}-${no}-${k}.png` });
        // 스크롤해서 닿나
        const after = await p.evaluate(async () => { const card = document.querySelector('[data-k="atb-quiz"]'); for (const s of [card, ...card.querySelectorAll('*')]) if (s.scrollHeight > s.clientHeight + 4) s.scrollTop = 1e5; await new Promise((r) => setTimeout(r, 200)); const opts = [...card.querySelectorAll('button.opt, button.rune, button.chip')]; return opts.filter((e) => { const r = e.getBoundingClientRect(); const top = document.elementFromPoint(Math.min(innerWidth - 1, r.left + r.width / 2), Math.min(innerHeight - 1, r.top + r.height / 2)); return r.bottom > innerHeight || r.right > innerWidth || (top && top !== e && !e.contains(top)); }).map((e) => e.textContent.trim().slice(0, 12)); });
        res[res.length - 1].afterScroll = after; await p.screenshot({ path: `/tmp/claude-0/hunt/qcov-${w}-${no}-${k}-scrolled.png` }); }
      // 다음 소문항으로: 정답 넣기
      const nx = await p.evaluate(() => { try { globalThis.__atb.skip?.(); return true; } catch { return false; } });
      await p.evaluate(() => globalThis.__atb.close?.()).catch(() => {}); await p.waitForTimeout(300); await p.click('[data-k="atb-quiz-open"]').catch(() => {}); await p.waitForTimeout(600); if (!nx) break;
    }
    await p.close();
  }
  console.log(JSON.stringify(res, null, 0)); await b.close(); })();
