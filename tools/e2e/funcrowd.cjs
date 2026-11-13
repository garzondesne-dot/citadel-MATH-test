// ❓#2 B 🔄 🙊 쉼터 TV 놀이 중 용사 무리 + 이름 크게 (에뮬레이터 · TV 1280 × 720 · 1920 × 1080)
//   가짜 학생 30명(4자 이름 섞어 · 시험 명단 아님 · 방 players 에만) → 🔄 반대로: 번호표 22px · 이름 17px 이상 · 겹침 0 · 화면 밖 0 / 🙊 눈치: 이름 14px 이상 · 두 줄까지 · 겹침 0 · 화면 밖 0
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
const { rest, asAdmin, asHost } = require('./_emu.cjs');
const log = (...a) => console.log(...a), wait = (ms) => new Promise((r) => setTimeout(r, ms));
const NAMES = ['가람', '나래', '다온', '라온', '마루', '바다', '사랑', '아라', '자람', '차오', '카이', '타라', '파랑', '하늘', '가온누리', '나린아라', '다솜별이', '라희온', '마리솔', '보라빛새', '새롬이', '아름드리', '자운영', '초롱별', '큰별님', '태양빛', '푸른솔', '한가람이', '해오름', '희망찬'];
(async () => {
  await rest('', 'DELETE');
  const W = {}; for (let d = 1; d <= 5; d++) { W[d] = {}; for (let q = 1; q <= 7; q++) W[d][q] = '1-3'; } await rest('school/sched', 'PUT', W);
  const b = await chromium.launch(), errs = [];
  const open = async (url, vp) => { const p = await (await b.newContext({ viewport: vp })).newPage(); p.on('pageerror', (e) => errs.push(`${url}: ${e}`)); await p.goto(B + url); return p; };
  const t = await open(`?role=teacher&${E}`, { width: 390, height: 844 }); await t.waitForSelector('.tabs', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('.tt:not([disabled])'); await t.click('.pk3 .pk:has-text("6차시")'); await t.click('.sub2 button:has-text("테스트")'); await wait(1500);
  const code = (await rest('school/live')).code;
  const seen = async () => { const P = {}; NAMES.forEach((n, i) => { P[`fk${i + 1}`] = { num: i + 1, nick: n, seen: Date.now(), hero: i % 34, cls: '1-3' }; }); await rest(`rooms/${code}/players`, 'PATCH', P); };
  await seen(); const keep = setInterval(seen, 2000);
  await t.click('.tact .btn'); await wait(1500);
  const shoot = async (vp, tag) => {
    const tv = await open(`?role=hall&${E}`, vp); await asHost(tv, code); await wait(2500);
    for (const kind of ['rev', 'nun']) {
      await t.click('.rdock button:has-text("쉼터")').catch(() => {}); await t.click('.sheet .x').catch(() => {});
      await rest(`rooms/${code}/fun`, 'DELETE');
      await tv.mouse.move(600, 400); await tv.click(`.dock .t:has-text("${kind === 'rev' ? '반대로' : '눈치'}")`); await wait(kind === 'nun' ? 4500 : 2500);
      const sel = kind === 'rev' ? '.crowd2 .fa-nm' : '.crowd2 .nn-name';
      const m = await tv.evaluate((sel) => { const el = [...document.querySelectorAll(sel)], r = el.map((e) => e.getBoundingClientRect()); let hit = 0; for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i], c = r[j]; if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) hit++; }
        const bib = document.querySelector('.crowd2 .bib'); const lines = el.map((e) => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight || '1')));
        return { n: el.length, hit, fs: el.length ? parseFloat(getComputedStyle(el[0]).fontSize) : 0, bib: bib ? parseFloat(getComputedStyle(bib).fontSize) : 0, out: r.filter((x) => x.right > innerWidth + 1 || x.left < -1 || x.bottom > innerHeight + 1 || x.top < -1).length, cut: el.filter((e) => e.scrollWidth > e.clientWidth + 1).length }; }, sel);
      await tv.screenshot({ path: `${SHOTS}/b51-${kind}-${tag}.png` });
      const ok = m.n === 30 && m.hit === 0 && m.out === 0 && (kind === 'rev' ? m.fs >= 17 && m.bib >= 22 : m.fs >= 14);
      log(`${tag} ${kind === 'rev' ? '🔄 반대로' : '🙊 눈치'}: 이름 ${m.n}명 · 글자 ${m.fs}px${kind === 'rev' ? ` · 번호표 ${m.bib}px` : ''} · 겹침 ${m.hit} · 화면 밖 ${m.out} · 잘림 ${m.cut} ${ok ? '○' : '✗'}`); if (!ok) errs.push(`${tag} ${kind}`);
      await tv.click(`.dock .t:has-text("${kind === 'rev' ? '반대로' : '눈치'}")`).catch(() => {}); await wait(500);
    }
    await tv.close();
  };
  await shoot({ width: 1280, height: 720 }, '720'); await shoot({ width: 1920, height: 1080 }, '1080');
  clearInterval(keep);
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close(); process.exit(0);
})();
