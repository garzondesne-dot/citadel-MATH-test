// 🐞 11/21 버그 사냥 · 게시판 던전 화면 검사 (이 기기 · 서버 안 씀): 나 + 봇 판을 돌리며 순간마다
//   ① 보이는 단추가 다른 것에 가려짐(가운데 점) ② 화면 밖 ③ 글자 잘림(scrollWidth > clientWidth) ④ NaN · undefined 글자
//   node tools/e2e/atblint.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?role=atb';
const LINT = () => {
  const vis = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05 && !e.closest('[aria-hidden="true"]'); };
  const name = (e) => `${e.tagName.toLowerCase()}${e.dataset.k ? `[${e.dataset.k}]` : e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').filter((c) => !/svelte/.test(c))[0] : ''} 「${(e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24)}」`;
  const out = { hidden: [], off: [], cut: [], nan: /NaN|undefined|Infinity|\[object/.test(document.body.innerText) ? (document.body.innerText.match(/.{0,20}(NaN|undefined|Infinity|\[object).{0,20}/) || [''])[0] : '' };
  const rot = !!document.querySelector('[data-rot90]');
  for (const e of document.querySelectorAll('button:not([disabled]), [role="button"]')) {
    if (!vis(e)) continue; const r = e.getBoundingClientRect();
    if (!rot && (r.right < 1 || r.bottom < 1 || r.left > innerWidth - 1 || r.top > innerHeight - 1)) { out.off.push(name(e)); continue; }
    if (!rot && (r.left < -2 || r.right > innerWidth + 2 || r.top < -2 || r.bottom > innerHeight + 2)) out.off.push(name(e) + ' (반쯤)');
    const cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)), top = document.elementFromPoint(cx, cy);
    if (!rot && top && top !== e && !e.contains(top) && !top.contains(e) && getComputedStyle(top).pointerEvents !== 'none') out.hidden.push(`${name(e)} ← ${name(top)}`);
  }
  for (const e of document.querySelectorAll('button, b, span, small, em, p, h1, h2, h3, li')) {
    if (!vis(e) || !e.textContent.trim() || e.children.length > 2) continue; const s = getComputedStyle(e);
    if ((s.overflow === 'hidden' || s.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 2) out.cut.push(name(e));
  }
  return out;
};
(async () => {
  const b = await chromium.launch(), found = new Map();
  const note = (vp, when, r) => { for (const k of ['hidden', 'off', 'cut']) for (const x of r[k]) { const key = `${k}|${x}`; if (!found.has(key)) found.set(key, `${vp} · ${when}`); } if (r.nan) found.set(`nan|${r.nan}`, `${vp} · ${when}`); };
  for (const [w, h] of [[844, 390], [667, 375], [1024, 768]]) {
    for (const no of ['2', '6', '9']) {
      const p = await b.newPage({ viewport: { width: w, height: h } }), errs = [];
      p.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));
      await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click(`[data-k="atb-setup"] .chips button[data-no="${no}"]`);
      await p.click('[data-k="atb-mode-play"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(1500);
      const vp = `${w}×${h} ${no}차시`;
      note(vp, '시작', await p.evaluate(LINT));
      await p.click('[data-k="atb-quiz-open"]').catch(() => {}); await p.waitForTimeout(700); note(vp, '문제 카드', await p.evaluate(LINT));
      if (no === '2') await p.screenshot({ path: `${SHOTS}/lint-card-${w}.png` });
      await p.evaluate(() => globalThis.__atb?.charge?.(4)); await p.waitForTimeout(400);
      await p.evaluate(() => globalThis.__atb?.close?.()).catch(() => {}); await p.waitForTimeout(400);
      await p.click('[data-k="atb-skill-btn"]').catch(() => {}); await p.waitForTimeout(500); note(vp, '스킬 메뉴', await p.evaluate(LINT));
      if (no === '2') await p.screenshot({ path: `${SHOTS}/lint-skills-${w}.png` });
      for (let i = 0; i < 8; i++) { await p.waitForTimeout(4000); note(vp, `${(i + 1) * 4}초`, await p.evaluate(LINT)); if (await p.$('[data-k="atb-result"]')) break; }
      if (errs.length) found.set(`pageerror|${errs[0]}`, vp);
      await p.close();
    }
  }
  for (const [k, v] of found) console.log(`${k.split('|')[0]} · ${k.split('|').slice(1).join('|')} · 처음: ${v}`);
  console.log(`끝 · ${found.size}`); await b.close();
})();
