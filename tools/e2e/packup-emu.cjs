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
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  await rest('prep/packs/ex-11', 'DELETE');
  const open = async (u, w = 360, h = 760) => { const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e))); await p.goto(B + u + E); return p; };
  const t = await open('?role=teacher'); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  const lists = async (p) => {
    await p.click('.tabs button:has-text("준비")'); await p.waitForTimeout(300);
    const prep = await p.$$eval('.lsel option', (xs) => xs.map((x) => x.textContent)).catch(() => []);
    await p.click('.tabs button:has-text("수업")'); await p.waitForTimeout(300);
    const home = await p.evaluate(() => document.body.innerText);
    return { prep: prep.some((x) => /11차시/.test(x)), home: /11차시|11\s*예시|예시 · 집합/.test(home) };
  };
  ok('올리기 전 = 11차시 없음', !(await lists(t)).prep);
  await t.click('.tabs button:has-text("준비")'); await t.click('.seg3 button:has-text("도구")'); await t.click('[data-k="packup-go"]');
  await t.setInputFiles('[data-k="packfile"]', path.join(__dirname, '../pack-upload/example-ex-11.json')); await t.waitForSelector('[data-k="packsum"]');
  // 새로 고침 없이 (저장 직후 · 다시 그리기 전)
  await t.evaluate(() => { window.__noReload = true; });
  await t.click('.sheet .btn.pmain'); await t.waitForSelector('.sheet .ok, .sheet .fail', { timeout: 10000 });
  const fail = await t.$('.sheet .fail'); ok('저장 = 서버가 받음', !fail, fail ? await fail.textContent() : '');
  const srv = await rest('prep/packs/ex-11'); ok('서버 prep/packs/ex-11 있음', !!srv && srv.id === 'ex-11', srv ? `steps ${(srv.steps || []).length} · m1 retry ${JSON.stringify(Object.keys(srv.monsters?.m1?.retry || {}))}` : '없음');
  await t.waitForNavigation({ timeout: 6000 }).catch(() => {}); await t.waitForSelector('.tabs', { timeout: 20000 });
  const l1 = await lists(t); ok('새로 고침 뒤 · 준비 차시 ▾ · 수업 열기 = 11차시', l1.prep && l1.home, JSON.stringify(l1));
  await t.screenshot({ path: `${SHOTS}/packup-emu-home.png` });
  // 새 기기 (다른 교사 폰 = 서버에서만 받음)
  const t2 = await open('?role=teacher'); await t2.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t2, '.tabs');
  const l2 = await lists(t2); ok('새 기기 교사 = 11차시', l2.prep && l2.home, JSON.stringify(l2));
  // 학생 폰: 교사가 11차시 테스트 수업을 열고 학생이 들어감
  await t2.click('.tabs button:has-text("준비")'); await t2.selectOption('.lsel select', 'ex-11'); await t2.waitForTimeout(200); await t2.click('.tact .btn'); await t2.waitForTimeout(1500);
  const live = await rest('school/live'); ok('11차시 수업 열림', live && live.lesson === 'ex-11', JSON.stringify(live));
  const s = await open(`?role=student&room=${live?.code}&as=1-3:1`); await s.waitForTimeout(2500);
  const L = await s.evaluate(() => document.body.innerText.slice(0, 120)); ok('학생 폰 = 11차시 방', !/수업 방을 찾지 못했어요/.test(L), L.replace(/\s+/g, ' ').slice(0, 80));
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await rest('prep/packs/ex-11', 'DELETE'); await b.close();
})();
