// 📲 리모컨 시안 v12 (📜 2026-11-14 컨펌): 대기실 · 수업 중 🙋 5명 · 상태 창 캡처 + 확인
//   🙋 = 하트 4번 다 틀려 잠긴 학생(화면 시험 고리 __dbSet 로 틀린 제출 4개 · 이 기기 저장만) · 칩 3 + 4번째 잘림 · 🙋5 · 칩 누름 = 풀어주기 + 「되돌리기」
//   번호 칸 = 대기실 자리 그대로 · 상태 창 🔑 0000 (한 번 더 확인)
//   NODE_PATH=$(npm root -g) node tools/e2e/remote12.cjs <폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', DB = 'citadel-v1-test-db';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  if (await t.$('[data-cls="1-3"]')) await t.click('[data-cls="1-3"]'); else { await t.click('text=다른 반'); await t.click('.sheet .pk:has-text("1-3반")'); }
  await t.click('.pk:has-text("6차시")'); await t.click('.tact .btn'); await t.waitForSelector('.nums');
  const live = await t.evaluate((k) => JSON.parse(localStorage.getItem(`${k}|school/live`)), DB);
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 12]) { const s = await ctx.newPage(); await s.goto(`${B}?role=student&room=${live.code}&as=1-3:${n}${n === 5 || n === 8 ? '&ver=b6' : ''}`); }
  await t.bringToFront(); await t.waitForTimeout(900); await t.click('.n[data-n="15"]'); await t.waitForTimeout(200);
  const box = () => t.evaluate(() => { const r = document.querySelector('.att').getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); });
  const lob = await box(); await t.screenshot({ path: `${SHOTS}/r12-lobby.png` });
  log('대기실: 번호 칸', lob, '| ⚠ 칸', (await t.textContent('[data-k="qm"]')).trim(), '| 이름', await t.$eval('.n[data-n="1"] s', (e) => e.textContent));
  await t.click('.tact .btn'); await t.waitForSelector('.rflow'); await t.click('.tact .btn'); await t.waitForTimeout(200); await t.click('.tact .btn'); await t.waitForTimeout(400);
  for (const n of [4, 7, 2, 9, 12]) { await t.evaluate(([code, u]) => { for (let k = 0; k < 4; k++) window.__dbSet(`rooms/${code}/subs/m1/${u}/${k}`, [[]]); }, [live.code, `s1_3_${n}`]); await t.waitForTimeout(150); }
  await t.waitForTimeout(500); const rem = await box();
  const q = await t.evaluate(() => ({ qm: document.querySelector('[data-k="qm"]').textContent.trim(), chips: [...document.querySelectorAll('.qs .qc')].map((e) => `${e.textContent.trim()}${e.classList.contains('wait') ? '(대기)' : ''}`), more: document.querySelector('.qs').classList.contains('more'), help: [...document.querySelectorAll('.n.help, .n.oldh')].map((e) => e.dataset.n) }));
  log('수업 중: 번호 칸', rem, '같은 자리', JSON.stringify(lob) === JSON.stringify(rem), '|', JSON.stringify(q));
  if (JSON.stringify(lob) !== JSON.stringify(rem)) errs.push('번호 칸 자리 다름');
  if (q.qm !== '🙋5' || q.chips.length !== 4 || !q.more || !/대기/.test(q.chips[3])) errs.push('🙋 줄');
  await t.screenshot({ path: `${SHOTS}/r12-live-help5.png` });
  await t.click('.qs .qc.first'); await t.waitForTimeout(500);
  const after = await t.evaluate(() => ({ qm: document.querySelector('[data-k="qm"]').textContent.trim(), first: document.querySelector('.qs .qc.first')?.textContent.trim(), toast: document.querySelector('.utoast')?.textContent.trim() }));
  log('칩 누름 → 풀어주기:', JSON.stringify(after)); if (after.qm !== '🙋4' || !/되돌리기/.test(after.toast || '')) errs.push('풀어주기');
  await t.screenshot({ path: `${SHOTS}/r12-live-release.png` });
  await t.click('.utoast button'); await t.waitForTimeout(500); const und = (await t.textContent('[data-k="qm"]')).trim(); const f2 = (await t.textContent('.qs .qc.first')).trim(); log('되돌리기 →', und, '· 맨 앞', f2); if (und !== '🙋5' || !/^4/.test(f2)) errs.push('되돌리기');
  await t.evaluate(() => window.__dbSet('accounts/1-3/8', { pw: '1111', at: 1 }));
  await t.click('.n[data-n="8"]'); await t.waitForSelector('[data-k="who"]'); await t.click('[data-k="pw0"]'); await t.waitForSelector('[data-k="pwask"]');
  await t.screenshot({ path: `${SHOTS}/r12-who.png` });
  log('상태 창:', (await t.textContent('[data-k="who"]')).replace(/\s+/g, ' ').trim());
  await t.click('[data-k="pwgo"]'); await t.waitForTimeout(300);
  const pw = await t.evaluate((k) => localStorage.getItem(`${k}|accounts/1-3/8/pw`) ?? JSON.parse(localStorage.getItem(`${k}|accounts/1-3/8`) || 'null')?.pw, DB);
  log('🔑 0000:', pw, (await t.textContent('[data-k="pw0"]')).trim());
  const scroll = await t.evaluate(() => document.scrollingElement.scrollHeight - innerHeight); if (scroll > 0) errs.push(`스크롤 ${scroll}`);
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
