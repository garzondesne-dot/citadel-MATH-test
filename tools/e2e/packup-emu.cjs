// 📦 차시 팩 올리기 · 시험 서버(에뮬레이터) 길 (🐞 머리 🔨 2026-11-14 선생님 「11차시 추가했는데 차시선택에서는 11차시가 안보여」)
//   원인 = prep/packs 가 서버 거울 밖 칸 → 새로 고침 뒤 앱이 읽지 못함 + Firebase 가 빈 배열(retry.pool [])을 지워 엔진 검사에서 빠짐
//   확인: 교사(admins) 올리기 → 저장(서버) → 새로 고침 없이 차시 ▾ · 수업 열기 차시 칸 → 새로 고침 뒤 같음 → 새 기기(교사 · TV · 학생)도 11차시 → 학생 폰 첫 문항
//   사용: (1) cd firebase && firebase emulators:start --only database,auth --project demo-citadel-test (2) 빌드 · 미리 보기 (3) NODE_PATH=$(npm root -g) node tools/e2e/packup-emu.cjs <폴더>
const { chromium } = require('playwright');
const path = require('path');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = '&emu=127.0.0.1';
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); console.error(out[out.length - 1]); if (!c) errs.push(n); };
  await rest('prep/packs/ex-11', 'DELETE'); await rest('prep/ex-11', 'DELETE'); await rest('school/live', 'DELETE'); // 지난 시험이 연 수업 지움
  const open = async (u, w = 360, h = 760) => { const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e))); await p.goto(B + u + E); return p; };
  const t = await open('?role=teacher'); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  const lists = async (p) => {
    await p.click('.tabs button:has-text("준비")'); await p.waitForTimeout(300);
    const prep = await (async (pg, fn) => { await pg.click('[data-k="lpick-go"]'); const v = await pg.$$eval('[data-k="lpick"] .grid .c', (xs) => xs.map((x) => ({ textContent: x.getAttribute('aria-label'), value: x.dataset.id }))); await pg.click('.sheet .bar .x'); return fn(v); })(p, (xs) => xs.map((x) => x.textContent)).catch(() => []);
    await p.click('.tabs button:has-text("수업")'); await p.waitForTimeout(300);
    const home = await p.evaluate(() => document.body.innerText);
    return { prep: prep.some((x) => /11차시/.test(x)), home: /11차시|11\s*예시|예시 · 집합/.test(home) };
  };
  ok('올리기 전 = 11차시 없음', !(await lists(t)).prep);
  await t.click('.tabs button:has-text("준비")'); await t.click('.seg3 button:has-text("도구")'); await t.click('[data-k="packup-go"]');
  await t.setInputFiles('[data-k="packfile"]', path.join(__dirname, '../pack-upload/example-ex-11.json')); await t.waitForSelector('[data-k="packsum"]');
  await t.setInputFiles('[data-k="packimgs"]', ['review', 'c1', 'm1', 'c2', 'm2', 'sum', 'boss'].map((c) => path.join(__dirname, `../pack-upload/img/${c}.png`))); await t.waitForTimeout(1500);
  // 새로 고침 없이 (저장 직후 · 다시 그리기 전)
  await t.evaluate(() => { window.__noReload = true; });
  await t.click('.sheet .btn.pmain'); await t.waitForSelector('.sheet .ok, .sheet .fail', { timeout: 10000 });
  const fail = await t.$('.sheet .fail'); ok('저장 = 서버가 받음', !fail, fail ? await fail.textContent() : '');
  const srv = await rest('prep/packs/ex-11'); ok('서버 prep/packs/ex-11 있음', !!srv && srv.id === 'ex-11', srv ? `steps ${(srv.steps || []).length} · m1 retry ${JSON.stringify(Object.keys(srv.monsters?.m1?.retry || {}))}` : '없음');
  { const im = await rest('prep/ex-11/img'); ok('🖼 서버 prep/ex-11/img = 칸 그림 7장(webp)', !!im && Object.keys(im).length === 7 && Object.values(im).every((x) => /^data:image\/webp/.test(x)), im ? Object.keys(im).join(' · ') : '없음'); }
  await t.waitForNavigation({ timeout: 6000 }).catch(() => {}); await t.waitForSelector('.tabs', { timeout: 20000 }).catch(async (e) => { await t.screenshot({ path: `${SHOTS}/emu-fail.png` }); console.error('URL', t.url(), (await t.evaluate(() => document.body.innerText)).slice(0, 300)); throw e; });
  const l1 = await lists(t); ok('새로 고침 뒤 · 준비 차시 ▾ · 수업 열기 = 11차시', l1.prep && l1.home, JSON.stringify(l1));
  await t.screenshot({ path: `${SHOTS}/packup-emu-home.png` });
  // 새 기기 (다른 교사 폰 = 서버에서만 받음)
  const t2 = await open('?role=teacher'); await t2.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t2, '.tabs');
  const l2 = await lists(t2); ok('새 기기 교사 = 11차시', l2.prep && l2.home, JSON.stringify(l2));
  // 학생 폰: 교사가 11차시 테스트 수업을 열고 학생이 들어감
  await t2.click('.tabs button:has-text("준비")'); await (async (pg, id) => { await pg.click('[data-k="lpick-go"]'); await pg.click(`[data-k="lpick"] .grid [data-id="${id}"]`); })(t2, 'ex-11'); await t2.waitForTimeout(200); await t2.click('.tact .btn'); await t2.waitForTimeout(1500);
  const live = await rest('school/live'); ok('11차시 수업 열림', live && live.lesson === 'ex-11', JSON.stringify(live));
  const s = await open(`?role=student&room=${live?.code}&as=1-3:1`); await s.waitForTimeout(2500);
  const L = await s.evaluate(() => document.body.innerText.slice(0, 120)); ok('학생 폰 = 11차시 방', !/수업 방을 찾지 못했어요/.test(L), L.replace(/\s+/g, ' ').slice(0, 80));
  // 🗑 안전장치 (📜 2026-11-15): 기록 있는 팩 = 경고 + 👀 숨기기 먼저 · 숨김 = 학생 캠프에서만 빠짐 · 다르게 다시 올리면 경고 → 「그래도 올리기」 뒤에만 저장
  await rest('records/1-3/2/ex-11', 'PUT', { no: 11, mons: { m1: 'o' } }); await rest('records/1-4/5/ex-11', 'PUT', { no: 11, mons: { m1: 'x' } });
  await rest('school/live', 'DELETE'); await t2.reload(); await t2.waitForSelector('.tabs', { timeout: 20000 }); await t2.waitForTimeout(800);
  await t2.click('.tabs button:has-text("준비")'); await t2.click('.seg3 button:has-text("도구")'); await t2.click('[data-k="packup-go"]'); await t2.waitForTimeout(500);
  await t2.click('.mrow[data-id="ex-11"] [data-k="packdel"]'); await t2.waitForTimeout(300);
  const ask = await t2.$eval('[data-k="packdel-ask"]', (x) => x.textContent.replace(/\s+/g, ' ')).catch(() => '');
  ok('① 기록 있음 = 「학생 2명의 기록」 경고 + 👀 숨기기 · 그래도 지우기 · 취소', /학생 2명의 기록이 있어요/.test(ask) && /숨기기/.test(ask) && /그래도 지우기/.test(ask) && /취소/.test(ask), ask.slice(0, 90));
  await t2.screenshot({ path: `${SHOTS}/packsafe-del.png` });
  await t2.click('[data-k="packdel-hide"]'); await t2.waitForTimeout(800);
  ok('👀 숨기기 = 서버 hide · 팩은 그대로', (await rest('prep/packs/ex-11/hide')) === true && !!(await rest('prep/packs/ex-11/id')));
  { const c = await open(''); await c.waitForTimeout(2500); const ids = await c.evaluate(() => (window.__packs ?? null)); const tv = await open('?role=teacher'); await tv.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(tv, '.tabs'); const l = await lists(tv); ok('숨김 = 교사 목록엔 그대로', l.prep, JSON.stringify(l)); void ids; }
  // ② 몬스터 하나 뺀 판을 같은 id 로 다시 올림
  const fs = require('fs'), os = require('os'), src = JSON.parse(fs.readFileSync(path.join(__dirname, '../pack-upload/example-ex-11.json'), 'utf8'));
  const m0 = src.steps.find((x) => x.kind === 'monster').id, cut = { ...src, steps: src.steps.filter((x) => x.id !== m0) }; cut.mons = { ...src.mons }; delete cut.mons[m0];
  const f2 = path.join(os.tmpdir(), 'ex-11-cut.json'); fs.writeFileSync(f2, JSON.stringify(cut));
  await t2.setInputFiles('[data-k="packfile"]', f2); await t2.waitForSelector('[data-k="packsum"]'); await t2.waitForTimeout(500);
  const rep = await t2.$eval('[data-k="pack-replace"]', (x) => x.textContent.replace(/\s+/g, ' ')).catch(() => ''), dis = await t2.$eval('.sheet .btn.pmain', (x) => x.disabled).catch(() => null);
  ok(`② 다르게 다시 올림 = 「옛 기록 2명과 문제가 맞지 않아요 · 빠지는 칸 ${m0}」 · 저장 막힘`, /옛 기록 2명과 문제가 맞지 않아요/.test(rep) && rep.includes(m0) && dis === true, `${rep.slice(0, 80)} | 막힘 ${dis}`);
  await t2.screenshot({ path: `${SHOTS}/packsafe-replace.png` });
  await t2.click('[data-k="pack-replace-ok"]'); await t2.waitForTimeout(300);
  ok('「그래도 올리기」 = 저장 열림', (await t2.$eval('.sheet .btn.pmain', (x) => x.disabled)) === false);
  await rest('records/1-3/2/ex-11', 'DELETE'); await rest('records/1-4/5/ex-11', 'DELETE');
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await rest('prep/packs/ex-11', 'DELETE'); await rest('prep/ex-11', 'DELETE'); await b.close();
})();
