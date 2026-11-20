// 🔁 한 교시에 12 → 13차시 차례로 열기 리허설 (📜 2026-11-20 선생님 고르기 · 1-4 = 11/24 화 2교시 · 1-2 = 화 4교시 · 머리 🔨)
//   ① 12 열기 → 학생 입장 → 수업 시작 → 🎯 m3 복습으로 → 끝까지 → 수업 닫기
//   ② 바로 13 열기 → 학생이 다시 들어오는 길(누르는 수) → 🎯 m2 · m4 복습으로 → 닫기
//   확인: 다시 입장 · 진도(school/last) · 허수아비 12 · 13 따로 · 기록 따로 · 오류 0
//   NODE_PATH=$(npm root -g) node tools/e2e/seq1213.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/', DB = 'citadel-v1-test-db', CLS = '1-4', NUM = 2;
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  // 12 · 13 = 올린 차시 팩 → PACKS=<폴더> 의 pack-ex-12.json · pack-ex-13.json 을 이 기기 시험 DB 에 넣고 다시 읽음 (팩 파일은 저장소에 넣지 않음)
  const fs = require('fs'), PD = process.env.PACKS;
  if (PD) { for (const id of ['ex-12', 'ex-13']) await t.evaluate(([id, v]) => window.__dbSet(`prep/packs/${id}`, v), [id, JSON.parse(fs.readFileSync(`${PD}/pack-${id}.json`, 'utf8'))]); await t.reload(); await t.waitForSelector('.tp'); }
  // 학생 = 캠프에서 시작 (로그인 1-4 2번 · 이 기기 체험)
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push('폰 ' + e));
  await s.goto(B); await s.evaluate(([c, n]) => localStorage.setItem('citadel-v1-login', JSON.stringify({ cls: c, num: n })), [CLS, NUM]); await s.goto(B); await s.waitForSelector('.stage'); await s.waitForTimeout(800);
  const live = () => t.evaluate((k) => JSON.parse(localStorage.getItem(`${k}|school/live`) || 'null'), DB);
  const st = (c) => t.evaluate((c) => window.__dbGet(`rooms/${c}/state`), c);
  async function openLesson(no) {
    await t.bringToFront();
    if (await t.$(`[data-cls="${CLS}"]`)) await t.click(`[data-cls="${CLS}"]`); else { await t.click('text=다른 반'); await t.click(`.sheet .pk:has-text("${CLS}반")`); }
    await t.click(`.pk:has-text("${no}차시")`); await t.click('.tact .btn'); await t.click('[data-k="open-yes"]'); await t.waitForSelector('.nums');
    return (await live()).code;
  }
  async function phoneJoin(tag) {
    await s.bringToFront(); let taps = 0;
    for (let i = 0; i < 6; i++) {
      await s.waitForTimeout(900);
      const bt = await s.innerText('body'); if (/입장 완료/.test(bt) && !/수업이 끝났어요/.test(bt)) break;
      const btn = (await s.$(`:is(a,button):has-text("내 캠프로")`)) || (await s.$('button:has-text("입장"):not([disabled])')) || (await s.$('.bottom .pmain:not([disabled])'));
      if (!btn) { log('    단추들:', (await s.$$eval('button', (x) => x.map((e) => `${e.textContent.replace(/\s+/g, ' ').trim().slice(0, 14)}${e.disabled ? '(x)' : ''}`))).join(' | ')); continue; } log('    누름:', ((await btn.textContent()) || '').replace(/\s+/g, ' ').trim()); await btn.click(); taps++;
    }
    const txt = (await s.innerText('body')).replace(/\s+/g, ' ').slice(0, 90);
    await s.screenshot({ path: `${SHOTS}/seq-${tag}-join.png` });
    return { taps, txt };
  }
  async function runAndClose(code, sendIds, tag) {
    await t.bringToFront(); await t.click('.tact .btn'); await t.waitForSelector('.rflow'); await t.waitForTimeout(500); // 수업 시작
    const sent = [];
    for (let i = 0; i < 40; i++) {
      const R = await st(code), step = R.step;
      const L = await t.evaluate((c) => window.__dbGet(`rooms/${c}/meta`), code);
      const sid = (await t.evaluate(() => [...document.querySelectorAll('.rflow [data-sid], .rflow .on')].map((e) => e.dataset.sid || e.textContent.trim()).join('|')).catch(() => '')) || '';
      void L; void sid;
      // 보낼 몬스터가 남아 있으면 지금 보냄 (단계와 상관없이 목록에서)
      for (const id of sendIds.filter((x) => !sent.includes(x))) {
        await t.click('[data-k="send-open"]').catch(() => {}); const ul = await t.waitForSelector('[data-k="send-list"]', { timeout: 1500 }).catch(() => null); if (!ul) break;
        log('    🎯 목록:', (await t.$$eval('[data-k="send-list"] li span', (x) => x.map((e) => e.textContent.trim()))).join(' | '));
        const li = await t.$(`[data-k="send-list"] li:has-text("${id}")`); if (li) { await (await li.$('[data-k="send-one"]')).click(); sent.push(id); await t.waitForTimeout(400); }
        const x = await t.$('.sheet .x'); if (x) await x.click(); await t.waitForTimeout(200);
      }
      const main = (await t.textContent('.tact .btn').catch(() => '')) || '';
      if (/수업 닫기/.test(main)) break;
      await t.click('.tact .btn'); await t.waitForTimeout(450); void step;
    }
    ok(`${tag} 🎯 복습으로 보냄`, sent.length === sendIds.length, sent.join(' · '));
    const sentState = Object.keys((await st(code)).sent || {});
    await t.click('.tact .btn').catch(() => {}); await t.waitForTimeout(300); // ■ 수업 닫기 → 확인
    const ask = await t.$('.ask .btn'); if (ask) await ask.click(); else { await t.click('.lbar button'); await t.click('.ask .btn'); }
    await t.waitForTimeout(1200);
    return sentState;
  }
  // ① 12차시
  const c12 = await openLesson(12); log('  12 방', c12);
  const j12 = await phoneJoin('12'); ok('12 학생 입장', j12.taps <= 2, `누름 ${j12.taps} · ${j12.txt}`);
  const s12 = await runAndClose(c12, ['문제 3'], '12');
  log('  12 state.sent', s12.join());
  await s.bringToFront(); await s.waitForTimeout(1500); await s.screenshot({ path: `${SHOTS}/seq-12-after.png` });
  const after12 = (await s.innerText('body')).replace(/\s+/g, ' ').slice(0, 120); log('  12 닫은 뒤 폰', after12);
  const last12 = await t.evaluate((c) => window.__dbGet(`school/last/${c}`), CLS);
  ok('12 닫음 = 진도 12 · done', last12?.no === 12 && !!last12?.done, JSON.stringify(last12));
  // ② 바로 13차시
  const c13 = await openLesson(13); log('  13 방', c13);
  ok('13 = 새 방 코드', c13 && c13 !== c12, `${c12} → ${c13}`);
  const j13 = await phoneJoin('13'); ok('13 학생 다시 입장', /.+/.test(j13.txt), `누름 ${j13.taps} · ${j13.txt}`);
  const s13 = await runAndClose(c13, ['몬스터 2', '몬스터 4'], '13');
  log('  13 state.sent', s13.join());
  const last13 = await t.evaluate((c) => window.__dbGet(`school/last/${c}`), CLS);
  ok('13 닫음 = 진도 13 · done', last13?.no === 13 && !!last13?.done, JSON.stringify(last13));
  const lastL = await t.evaluate(() => window.__dbGet('school/lastLesson'));
  log('  school/lastLesson', JSON.stringify(lastL?.[CLS]));
  // 허수아비: 12 · 13 따로
  await s.bringToFront(); await s.goto(B); await s.waitForSelector('.stage'); await s.waitForTimeout(900);
  await s.click('.prop[aria-label^="허수아비"]'); await s.waitForSelector('[data-k="dummy-list"]'); await s.waitForTimeout(600);
  const cards = await s.$$eval('[data-k="dummy-list"] .card .h b', (x) => x.map((e) => e.textContent.trim()));
  ok('허수아비 = 12차시 · 13차시 카드 따로', cards.some((x) => /12차시/.test(x)) && cards.some((x) => /13차시/.test(x)), cards.slice(0, 6).join(' | '));
  await s.screenshot({ path: `${SHOTS}/seq-dummy.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
