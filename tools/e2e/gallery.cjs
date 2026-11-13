// #161 💥 공격 갤러리 (?role=atk · 학생 폰 360 × 640): 15개를 하나씩 눌러 캡처 · 문제 카드 · 주요 단추 rect 그대로 · 고른 답 그대로
//   장면 띠 = 속성 이펙트 · 머리 위 상태 그림 · 꼬리표 / 분노 = 장면 붉게 · 꼬리표 「분노」 / 손풀기: 속박 좌우 쓸기 · 수면 두 번 톡 · 자물쇠 열쇠 끌기 · 어둠 손전등
// 사용: npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/gallery.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch(), errs = [];
  const s = await (await b.newContext({ viewport: { width: 360, height: 640 } })).newPage();
  s.on('pageerror', (e) => errs.push(String(e))); s.on('console', (m) => { if (m.type() === 'error' && !/favicon|play\(\)|NotAllowed|NotSupported/.test(m.text())) errs.push(m.text().slice(0, 140)); });
  await s.goto('http://localhost:4173/?role=atk'); await s.waitForSelector('.qwrap .bcard', { timeout: 15000 }); await s.waitForTimeout(500);
  const ids = await s.$$eval('.ids .a', (xs) => xs.map((x) => x.dataset.id)); log('갤러리 단추:', ids.length, ids.join(' '));
  if (ids.length !== 15) errs.push('15개 아님');
  const chip = await s.$('.qwrap .bcard :is(.chip, .opt)'); if (chip) await chip.click();
  const R = () => s.evaluate(() => { const r = (q) => { const x = document.querySelector(q); if (!x) return null; const b = x.getBoundingClientRect(); return `${Math.round(b.top)}/${Math.round(b.height)}`; }; return { card: (() => { const x = document.querySelector('.qwrap .bcard'); return x ? `${x.offsetTop}/${x.offsetHeight}` : null; })(), main: r('.act .pmain'), sel: document.querySelectorAll('.qwrap .on, .qwrap [aria-pressed="true"]').length }; });
  const wait = async () => s.waitForFunction(() => !document.querySelector('.qwrap .afx'), null, { timeout: 8000 }).then(() => true).catch(() => false);
  const rows = [];
  for (const id of ids) {
    const before = await R(); await s.click(`.ids .a[data-id="${id}"]`); await s.waitForTimeout(id === 'glitch' ? 60 : 450);
    const mid = await R(); const tag = await s.$eval('.edge .hitTag', (x) => x.textContent.trim()).catch(() => '');
    const st = await s.$eval('.edge .status', (x) => x.dataset.elem).catch(() => ''); const ef = !!(await s.$('.edge .efx'));
    await s.screenshot({ path: `${SHOTS}/b49-atk-${String(ids.indexOf(id) + 1).padStart(2, '0')}-${id}.png` });
    let early = '';
    if (id === 'bind') { const bx = await s.$eval('.chains', (x) => { const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); await s.mouse.move(bx.x, bx.y); await s.mouse.down(); for (const dx of [-80, 80, -80, 80]) await s.mouse.move(bx.x + dx, bx.y, { steps: 6 }); await s.mouse.up(); early = (await wait()) ? '쓸기로 끊김' : '✗'; }
    if (id === 'sleep') { await s.mouse.click(180, 320); await s.waitForTimeout(80); await s.mouse.click(180, 320); early = (await wait()) ? '두 번 톡 = 번쩍' : '✗'; }
    if (id === 'lock') { const k = await s.$eval('.afx .key', (x) => { const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); const m = await s.$eval('.act .pmain', (x) => { const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: x.textContent }; }); await s.mouse.move(k.x, k.y); await s.mouse.down(); await s.mouse.move(m.x, m.y, { steps: 10 }); await s.mouse.up(); early = (await wait()) ? `열쇠 꽂음(${m.t.trim()})` : '✗'; }
    if (id === 'dark') { await s.mouse.move(180, 400); await s.mouse.down(); await s.waitForTimeout(80); const lx = await s.$eval('.darkc', (x) => x.style.getPropertyValue('--lx')); await s.screenshot({ path: `${SHOTS}/b49-atk-dark-light.png` }); await s.mouse.up(); early = lx !== '-999px' ? `손전등 ${lx}` : '✗'; }
    if (/✗/.test(early)) errs.push(`${id} 손풀기`);
    const done = await wait(); const after = await R();
    const same = before.card === mid.card && before.main === mid.main && before.sel === mid.sel && after.sel === before.sel;
    if (!same) errs.push(`${id} 자리 바뀜 ${JSON.stringify([before, mid, after])}`); if (!tag || !st || !ef) errs.push(`${id} 장면 ${tag}/${st}/${ef}`); if (!done) errs.push(`${id} 안 끝남`);
    rows.push(`${id.padEnd(8)} ${tag.padEnd(14)} 상태 ${st.padEnd(8)} 자리 ${same ? '○' : '✗'} ${early}`);
    await s.waitForTimeout(250);
  }
  rows.forEach((r) => log('  ' + r));
  // 😡 분노
  await s.click('.bar button:has-text("분노")'); await s.click('.ids .a[data-id="poison"]'); await s.waitForTimeout(400);
  const rage = await s.evaluate(() => ({ edge: document.querySelector('.edge').classList.contains('rage'), tag: document.querySelector('.edge .hitTag')?.textContent }));
  await s.screenshot({ path: `${SHOTS}/b49-atk-rage.png` }); log('분노:', JSON.stringify(rage)); if (!rage.edge || !/분노/.test(rage.tag || '')) errs.push('분노');
  await s.waitForTimeout(3500);
  // ⚔ 졸개 단계에서도
  await s.click('.bar button:has-text("졸개")'); await s.waitForSelector('.qwrap .bcard'); await s.waitForTimeout(400); await s.click('.ids .a[data-id="confuse"]'); await s.waitForTimeout(300);
  await s.screenshot({ path: `${SHOTS}/b49-atk-chain-confuse.png` }); log('졸개 단계 혼란:', (await s.$('.qwrap .afx.confuse')) ? '○' : '✗');
  const sfx = await s.evaluate(() => 0); void sfx;
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
