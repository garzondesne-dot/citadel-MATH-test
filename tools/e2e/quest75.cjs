// ✏ #75 출제 공방 (이 기기 캠프 = 🧪 테스트 길 · 학생과 같은 화면 · 단계)
//   책상 → 📸 올리기(바탕 방 · 형식 · 바꾼 것) → 「✔ 테스트: 판단 결과로 보기」 🟢 → 📜 내가 낸 문제 + 💎 3 · ⚪ 반려 이유 + 다시 내기 · 🔵 ⏳ 선생님 확인
//   → 교사 소식 「✏ 출제」 안건 = 바탕 ↔ 학생 문제 · AI 두 번 풀이 → ✅ 승인 → 학생 💎 8 📜 1 · 친구 문제 · 🟣 승인 → 🏛 전당 · 1:1 풀기 · 👍
//   NODE_PATH=$(npm root -g) node tools/e2e/quest75.cjs <그림 폴더>
const { chromium } = require('playwright');
const path = require('path');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await ctx.addInitScript(() => { try { localStorage.setItem('citadel-wake-tip', '1'); } catch {} });
  // 🏰 이 기기 체험 = 성채 1층 팩을 이 기기 저장소에 (교사 📦 팩 올리기와 같은 값)
  const E1 = require('fs').readFileSync(path.join(__dirname, '../pack-upload/castle/eval-1.json'), 'utf8');
  await ctx.addInitScript((raw) => { try { if (!localStorage.getItem('citadel-v1-test-db|prep/addons/castle/eval-1')) localStorage.setItem('citadel-v1-test-db|prep/addons/castle/eval-1', raw); } catch {} }, E1);
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${B}?role=camp&room=QS1`); await p.waitForSelector('.stage'); await p.waitForTimeout(1000);
  const gem = async () => Number((await p.evaluate(() => JSON.parse(localStorage.getItem('citadel-v1-me') || '{}').wallet?.gem)) || 0);
  const open = async () => { await p.$eval('[data-prop="tent"]', (e) => e.click()); await p.waitForSelector('[data-k="quest-desk"]', { timeout: 8000 }); await p.waitForTimeout(400); };
  await open(); ok('책상 = 출제 공방 (탭 3)', (await p.$$('[data-k^="quest-tab-"]')).length === 3);
  const nb = await p.$$eval('[data-k="quest-base"] option', (o) => o.length - 1); ok('바탕 방 = 성채 방 목록', nb > 0, `${nb}방`);
  await p.screenshot({ path: `${SHOTS}/q-1-up.png` });
  const fill = async (type) => { await p.selectOption('[data-k="quest-base"]', { index: 4 }); await p.click(`[data-k="quest-type-${type}"]`); await p.click('[data-k="quest-ch-num"]'); };
  await fill('subj'); await p.waitForTimeout(200); await p.screenshot({ path: `${SHOTS}/q-2-filled.png` });
  const g0 = await gem();
  await p.click('[data-k="quest-fake-green"]'); await p.waitForTimeout(1200);
  ok('🟢 → 📜 내가 낸 문제', (await p.$$('[data-k="quest-mine"]')).length === 1);
  ok('🟢 = 💎 +3', (await gem()) - g0 === 3, `${g0} → ${await gem()}`);
  await p.screenshot({ path: `${SHOTS}/q-3-green.png` });
  await p.click('[data-k="quest-tab-up"]'); await fill('obj'); await p.click('[data-k="quest-fake-gray"]'); await p.waitForTimeout(800);
  ok('⚪ = 반려 이유 + 다시 내기', !!(await p.$('[data-k="quest-again"]')) && (await p.textContent('[data-k="quest-desk"]')).includes('두 풀이와 달라요'));
  await p.screenshot({ path: `${SHOTS}/q-4-gray.png` });
  await p.click('[data-k="quest-again"]'); await p.waitForTimeout(300);
  ok('다시 내기 = 바탕 · 형식 그대로', (await p.$eval('[data-k="quest-base"]', (e) => e.value)) !== '' && !!(await p.$('[data-k="quest-type-obj"][aria-checked="true"]')));
  await p.click('[data-k="quest-fake-blue"]'); await p.waitForTimeout(500); await p.click('[data-k="quest-tab-up"]'); await fill('obj'); await p.waitForTimeout(200);
  ok('하루 3번 = 4번째 못 냄', !!(await p.$('[data-k="quest-fake-purple"]:disabled')), (await p.textContent('.why').catch(() => '')) || '');
  await p.screenshot({ path: `${SHOTS}/q-5-limit.png` });
  // 반려 기록 = 어제로 옮김 (하루 한도 다시 1) → 🟣
  await p.evaluate(() => { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k || !k.includes('|quest/')) continue; const v = JSON.parse(localStorage.getItem(k)); const fix = (r) => { if (r && r.grade === 'gray') r.at -= 86400e3; }; if (v && v.grade) fix(v); else if (v) Object.values(v).forEach(fix); localStorage.setItem(k, JSON.stringify(v)); } });
  await p.reload(); await p.waitForSelector('.stage'); await p.waitForTimeout(800); await open(); await fill('obj'); await p.click('[data-k="quest-fake-purple"]'); await p.waitForTimeout(800);
  ok('🔵 🟣 = ⏳ 선생님 확인 중', ((await p.textContent('[data-k="quest-desk"]')).match(/선생님 확인 중/g) || []).length === 2);
  // 교사 = 소식 「✏ 출제」 (같은 기기 체험 저장소)
  const g1 = await gem(), s1 = Number((await p.evaluate(() => JSON.parse(localStorage.getItem('citadel-v1-me') || '{}').wallet?.scroll)) || 0);
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push(`T ${e}`));
  await t.goto(`${B}?role=teacher&tab=news`); await t.waitForTimeout(2500);
  await t.click('[data-chip="quiz"]').catch(() => {}); await t.waitForTimeout(400);
  const ag = await t.$$eval('.nw', (x) => x.filter((e) => e.textContent.includes('출제 안건')).length); ok('교사 소식 ✏ 출제 안건 2', ag === 2, `${ag}`);
  await t.$$eval('.nw .nb', (x) => x.find((e) => e.textContent.includes('🔵'))?.click()); await t.waitForTimeout(400);
  ok('안건 = 바탕 ↔ 학생 문제 · AI 두 번 풀이', !!(await t.$('[data-k="quest-check-t"]')));
  await t.screenshot({ path: `${SHOTS}/q-6-teacher.png` });
  await t.click('[data-k="quest-ok"]'); await t.waitForTimeout(600);
  await t.$$eval('.nw .nb', (x) => x.find((e) => e.textContent.includes('🟣'))?.click()); await t.waitForTimeout(400); await t.click('[data-k="quest-ok"]'); await t.waitForTimeout(600);
  ok('승인 뒤 안건 0', (await t.$$eval('.nw', (x) => x.filter((e) => e.textContent.includes('출제 안건')).length)) === 0);
  // 학생 = 보상 · 친구 문제 · 전당
  await p.reload(); await p.waitForSelector('.stage'); await p.waitForTimeout(800);
  await open(); await p.click('[data-k="quest-tab-mine"]'); await p.waitForTimeout(1200);
  const sc = Number((await p.evaluate(() => JSON.parse(localStorage.getItem('citadel-v1-me') || '{}').wallet?.scroll)) || 0);
  ok('🔵 승인 💎8 📜1 + 🟣 승인 💎20 📜2 = 💎 +28 · 📜 +3', (await gem()) - g1 === 28 && sc - s1 === 3, `💎 ${g1} → ${await gem()} · 📜 ${s1} → ${sc}`);
  ok('🔵 = 친구 문제 칸', (await p.$$('[data-k="quest-friend"]')).length === 1);
  await p.screenshot({ path: `${SHOTS}/q-7-mine.png` });
  await p.click('[data-k="quest-tab-hall"]'); await p.waitForTimeout(400);
  ok('🟣 = 🏛 전당', (await p.$$('[data-k="quest-hall"]')).length === 1);
  await p.screenshot({ path: `${SHOTS}/q-8-hall.png` });
  await p.click('[data-k="quest-hall"] .b2'); await p.waitForSelector('[data-k="quest-play"]'); await p.click('[data-k="quest-play"] .ch button:nth-child(3)'); await p.click('[data-k="quest-check"]'); await p.waitForTimeout(400);
  ok('1:1 풀기 = 맞음 (내 문제 · 보상 없음)', (await p.textContent('[data-k="quest-play"]')).includes('맞았어요'));
  await p.screenshot({ path: `${SHOTS}/q-9-play.png` });
  ok('콘솔 오류 0', !errs.filter((e) => !/^T? ?❌/.test(e)).some((e) => /Error|error/.test(e)), errs.slice(0, 3).join(' | '));
  await b.close(); log(errs.length ? `실패 ${errs.length}` : '모두 통과'); process.exit(errs.length ? 1 : 0);
})();
