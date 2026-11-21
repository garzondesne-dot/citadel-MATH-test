// 🐞 11/21 버그 사냥 · 화면 검사 (이 기기 · 서버 안 씀): 학생 캠프 물건 9 · 교사 폰 탭 5 · 종합실 · 체험판 을 360 · 390 폭에서 열고
//   ① 가려진 단추 ② 화면 밖 단추 ③ 잘린 글자 ④ NaN · undefined ⑤ 가로 넘침 ⑥ 페이지 오류
//   node tools/e2e/screenlint.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
const LINT = () => {
  const vis = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05 && !e.closest('[aria-hidden="true"]'); };
  const name = (e) => `${e.tagName.toLowerCase()}${e.dataset.k ? `[${e.dataset.k}]` : e.dataset.prop ? `[prop=${e.dataset.prop}]` : e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').filter((c) => !/svelte/.test(c))[0] : ''} 「${(e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 22)}」`;
  const out = { hidden: [], off: [], cut: [], over: document.documentElement.scrollWidth - innerWidth, nan: (document.body.innerText.match(/.{0,18}(NaN|undefined|Infinity|\[object Object\]).{0,18}/) || [''])[0] };
  for (const e of document.querySelectorAll('button:not([disabled]), [role="button"], a[href]')) {
    if (!vis(e)) continue; const r = e.getBoundingClientRect();
    if (r.right < 1 || r.left > innerWidth - 1) { out.off.push(name(e)); continue; }
    if (r.top > innerHeight || r.bottom < 0) continue; // 스크롤 아래 = 괜찮음
    const cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)), top = document.elementFromPoint(cx, cy);
    if (top && top !== e && !e.contains(top) && !top.contains(e) && getComputedStyle(top).pointerEvents !== 'none') out.hidden.push(`${name(e)} ← ${name(top)}`);
  }
  for (const e of document.querySelectorAll('button, b, span, small, em, p, h1, h2, h3, li, label')) {
    if (!vis(e) || !e.textContent.trim() || e.children.length > 2) continue; const s = getComputedStyle(e), r = e.getBoundingClientRect();
    if (r.top > innerHeight) continue;
    if ((s.overflow === 'hidden' || s.textOverflow === 'ellipsis' || s.overflowX === 'hidden') && e.scrollWidth > e.clientWidth + 2) out.cut.push(name(e));
  }
  return out;
};
(async () => {
  const b = await chromium.launch(), found = new Map();
  const note = (where, r, errs) => { for (const k of ['hidden', 'off', 'cut']) for (const x of r[k]) { const key = `${k} · ${x}`; if (!found.has(key)) found.set(key, where); } if (r.over > 0) found.set(`가로넘침 ${r.over}px · ${where.split(' ')[1]}`, where); if (r.nan) found.set(`nan · ${r.nan}`, where); for (const e of errs.splice(0)) found.set(`오류 · ${e}`, where); };
  const close = async (p) => { for (let i = 0; i < 3; i++) { const x = await p.$('.sheet .x, [aria-label="닫기"]:visible, .back'); if (!x) break; await x.click().catch(() => {}); await p.waitForTimeout(300); } await p.keyboard.press('Escape').catch(() => {}); };
  for (const [w, h] of [[360, 640], [390, 844]]) {
    // 학생 캠프 (이 기기 · 시험 반 꼴)
    const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));
    await p.addInitScript(() => { try { localStorage.setItem('citadel-wake-tip', '1'); } catch {} });
    await p.goto(B + '?role=camp&mode=test&room=LINT'); await p.waitForSelector('.stage', { timeout: 20000 }); await p.waitForTimeout(1500);
    note(`${w} 캠프`, await p.evaluate(LINT), errs); await p.screenshot({ path: `${SHOTS}/lint-camp-${w}.png` });
    const props = await p.$$eval('[data-prop]', (x) => x.map((e) => e.dataset.prop));
    for (const k of props) {
      await p.$eval(`[data-prop="${k}"]`, (e) => e.click()).catch(() => {}); await p.waitForTimeout(2200);
      note(`${w} 캠프→${k}`, await p.evaluate(LINT), errs); await p.screenshot({ path: `${SHOTS}/lint-${k}-${w}.png` });
      await close(p); await p.goto(B + '?role=camp&mode=test&room=LINT'); await p.waitForSelector('.stage', { timeout: 20000 }); await p.waitForTimeout(800);
    }
    // 교사 폰 탭
    const t = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
    t.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));
    await t.goto(B + '?role=teacher'); await t.waitForSelector('.tabs', { timeout: 20000 }); await t.waitForTimeout(1000);
    for (const tab of await t.$$eval('.tabs button', (x) => x.map((e) => e.textContent.replace(/\s+/g, ' ').trim()))) {
      await t.click(`.tabs button:has-text("${tab.replace(/^[^가-힣]+/, '').split(' ')[0]}")`).catch(() => {}); await t.waitForTimeout(900);
      note(`${w} 교사→${tab}`, await t.evaluate(LINT), errs); await t.screenshot({ path: `${SHOTS}/lint-t-${tab.replace(/[^가-힣]/g, '')}-${w}.png` });
    }
    await t.context().close(); await p.context().close();
  }
  // 종합실 · 체험판
  for (const [u, nm, w, h] of [['?role=hall&mode=test&lesson=set-05&room=LINTT', '종합실', 1280, 720], ['?role=hall&mode=test&lesson=set-05&room=LINTT', '종합실', 1920, 1080], ['?trial=1', '체험판', 390, 844]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));
    await p.goto(B + u); await p.waitForTimeout(4000);
    note(`${w} ${nm}`, await p.evaluate(LINT), errs); await p.screenshot({ path: `${SHOTS}/lint-${nm}-${w}.png` }); await p.context().close();
  }
  for (const [k, v] of found) console.log(`${k} · 처음: ${v}`);
  console.log(`끝 · ${found.size}`); await b.close();
})();
