// 📦 #82 같은 차시 = 바꾸기 · 병합 · 🗑 휴지통 (에뮬레이터 · 11/19 상황 그대로)
//   ex-11(열쇠 3 · 서술 0 · 그림 9) 위에 같은 11차시 다른 id 「set-11」(서술 있음 · 열쇠 0) 을 올림
//   → 「11차시 팩이 이미 있어요」 · 🔁 바꾸기(기본) · 요약 한 줄 → 저장 = ex-11 하나 · 열쇠 3 · 서술 n · 그림 9 · set-11 없음 · 옛 판 = 🗑 휴지통
//   → 카드 🗑 빼기 = 휴지통 → ↩ 되돌리기 = 팩 · 칸 그림 제자리
//   NODE_PATH=$(npm root -g) node tools/e2e/packreplace82-emu.cjs <그림 폴더>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
const EX = require('../pack-upload/keys/ex-11-v4.json'); // 열쇠 3 · 서술 0 · 그림 9칸
const sayN = (P) => Object.values(P.monsters || {}).reduce((a, m) => a + (m.first || []).filter((q) => q.say).length + (((m.retry || {}).pool) || []).flat().filter((q) => q.say).length, 0);
(async () => {
  // 새 파일 = 같은 11차시 · 다른 id · 열쇠 없음 · 서술 칸 채움
  const neu = JSON.parse(JSON.stringify(EX)); neu.id = 'set-11'; delete neu.keys; neu.imgCells = ['review', 'c1'];
  let k = 0; for (const m of Object.values(neu.monsters)) { for (const q of m.first || []) q.say = `풀이 ${++k}`; for (const p of ((m.retry || {}).pool) || []) for (const q of p) q.say = `풀이 ${++k}`; }
  const tmp = path.join(os.tmpdir(), 'set-11-up.json'); fs.writeFileSync(tmp, JSON.stringify(neu));
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const img = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
  await rest('prep/packs/ex-11', 'PUT', EX); await rest('prep/ex-11', 'PUT', { img: Object.fromEntries(EX.imgCells.map((c) => [c, img])), has: true });
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); t.on('pageerror', (e) => errs.push(String(e))); t.on('dialog', (d) => d.accept()); t.setDefaultTimeout(15000);
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('.tabs button:has-text("차시 팩")'); await t.waitForTimeout(500); await t.click('[data-k="packup-go"]');
  await t.setInputFiles('[data-k="packfile"]', tmp); await t.waitForSelector('[data-k="packsum"]'); await t.waitForTimeout(800);
  const same = (await t.textContent('[data-k="pack-same"]').catch(() => '')).replace(/\s+/g, ' ');
  ok('① 「11차시 팩이 이미 있어요」 + 🔁 바꾸기(기본) 눌림', /11차시 팩이 이미 있어요/.test(same) && (await t.getAttribute('[data-k="same-replace"]', 'aria-pressed')) === 'true', same.slice(0, 120));
  const sum = (await t.textContent('[data-k="pack-merge-sum"]').catch(() => '')).replace(/\s+/g, ' '), warn = await t.$('[data-k="pack-merge-warn"]');
  ok('② 요약 = 열쇠 3 → 3(유지) · 서술 0 → n · 그림 9칸 · 경고 없음', /🔑 열쇠 3 → 3\(유지\)/.test(sum) && /✍ 서술 칸 0 → \d+/.test(sum) && /🖼 그림 9 → 9칸/.test(sum) && !warn, sum);
  await t.screenshot({ path: `${SHOTS}/p82-same.png` });
  await t.click('[data-k="same-add"]'); await t.waitForTimeout(200);
  ok('「➕ 따로 추가」 = 요약 사라짐 · 단추 「11차시 저장」', !(await t.$('[data-k="pack-merge-sum"]')) && /11차시 저장/.test(await t.textContent('.sheet .btn.pmain')));
  await t.click('[data-k="same-replace"]'); await t.waitForTimeout(200);
  ok('단추 = 「🔁 11차시 바꾸기」', /🔁 11차시 바꾸기/.test(await t.textContent('.sheet .btn.pmain')));
  await t.evaluate(() => { window.__noReload = true; }); await t.click('.sheet .btn.pmain'); await t.waitForTimeout(3000);
  const srv = await rest('prep/packs/ex-11'), s11 = await rest('prep/packs/set-11'), im = await rest('prep/ex-11/img'), idx = (await rest('prep/trashIdx')) || {};
  ok('③ 저장 = ex-11 하나 · set-11 없음', !!srv && srv.id === 'ex-11' && !s11);
  ok('③ 열쇠 3 · 서술 n · 그림 9칸 유지', (srv.keys || []).length === 3 && sayN(srv) === k && Object.keys(im || {}).length === 9 && EX.imgCells.every((c) => srv.imgCells.includes(c)), `열쇠 ${(srv.keys || []).length} · 서술 ${sayN(srv)}/${k} · 그림 ${Object.keys(im || {}).length}`);
  ok('③ 옛 판 = 🗑 휴지통 (바꾸기 전 판)', Object.values(idx).some((r) => r.id === 'ex-11' && r.why === 'replace'), JSON.stringify(Object.values(idx)));
  // ④ 빼기 → 휴지통 → 되돌리기
  await t.goto(`${B}?role=teacher&tab=prep&${E}`); await t.waitForSelector('.tabs', { timeout: 20000 }); await t.waitForTimeout(1200);
  if (await t.$('[data-k="pack-more"]')) await t.click('[data-k="pack-more"]');
  await t.click('[data-k="pack-card"][data-id="ex-11"]'); await t.waitForTimeout(500); await t.click('[data-k="pack-del"]'); await t.waitForTimeout(200);
  const ask = (await t.textContent('[data-k="pack-del-ask"]')).replace(/\s+/g, ' '); ok('④ 빼기 확인 = 「휴지통에 30일」', /휴지통에 30일/.test(ask), ask.slice(0, 100));
  await t.click('[data-k="pack-del-yes"]'); await t.waitForTimeout(2500);
  ok('④ 빼기 = 서버 팩 · 칸 그림 없음', !(await rest('prep/packs/ex-11')) && !(await rest('prep/ex-11')));
  await t.click('[data-k="trash-go"]'); await t.waitForSelector('[data-k="trash-row"]'); await t.waitForTimeout(400);
  const rows = await t.$$eval('[data-k="trash-row"]', (x) => x.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  rows.forEach((r) => console.log('   🗑', r)); ok('④ 휴지통 = 뺌 1 · 바꾸기 전 판 1', rows.length === 2 && rows.some((r) => /🗑 뺌/.test(r)) && rows.some((r) => /바꾸기 전 판/.test(r)));
  await t.screenshot({ path: `${SHOTS}/p82-trash.png` });
  await t.click('[data-k="trash-row"]:has-text("🗑 뺌") [data-k="trash-undo"]'); await t.waitForTimeout(2500);
  const back = await rest('prep/packs/ex-11'), im2 = await rest('prep/ex-11/img');
  ok('⑤ ↩ 되돌리기 = ex-11 · 열쇠 3 · 서술 n · 그림 9칸 제자리', !!back && (back.keys || []).length === 3 && sayN(back) === k && Object.keys(im2 || {}).length === 9, `열쇠 ${(back && back.keys || []).length} · 서술 ${back ? sayN(back) : 0} · 그림 ${Object.keys(im2 || {}).length}`);
  ok('콘솔 오류 0', !errs.some((e) => /Error/.test(e)), errs.slice(0, 2).join(' | '));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
