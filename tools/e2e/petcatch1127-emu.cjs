// 🐞 🐾 11/27 「둥지 알이 수업 끝나도 5 가 안 찬다」: 수업 끝 화면을 못 본 학생 → 캠프에 들어오면 놓친 차시 먹이 +5 (에뮬레이터 · 1-3 · 3번)
//   교사 = 11차시 팩 올리고 1-3 수업 열기 → 학생 = 로그인(수업에는 안 들어감) · 펫 = 수업 1분 전에 들임 → 반 기록만 채움(교사 기기)
//   ① 캠프 = 서버 먹이 0 → 5 · fed/ex-11 · 펫 들이기 전 차시는 안 줌 ② 「🐾 지난 수업 펫 먹이 +5」 ③ 다시 들어와도 더 안 줌
//   cd firebase && firebase emulators:start --only database,auth --project demo-citadel-test
//   NODE_PATH=$(npm root -g) node tools/e2e/petcatch1127-emu.cjs <그림 폴더>
const { chromium } = require('playwright');
const path = require('path');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } } });
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const page = async (u) => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e))); p.on('dialog', (d) => d.accept()); p.setDefaultTimeout(15000); await p.goto(`${B}${u}${u.includes('?') ? '&' : '?'}${E}`); return p; };
  const t = await page('?role=teacher'); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('.tabs button:has-text("차시 팩")'); await t.waitForTimeout(400); await t.click('[data-k="packup-go"]');
  await t.setInputFiles('[data-k="packfile"]', path.join(__dirname, '../pack-upload/keys/ex-11-v4.json')); await t.waitForSelector('[data-k="packsum"]'); await t.waitForTimeout(600);
  await t.evaluate(() => { window.__noReload = true; }); await t.click('.sheet .btn.pmain'); await t.waitForTimeout(2500);
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs', { timeout: 20000 }); await t.waitForTimeout(800);
  await t.click('.tabs button:has-text("수업")'); await t.waitForTimeout(400);
  await t.click('[data-k="cls-row"] button:has-text("1-3")'); await t.waitForTimeout(200); await t.click('.pk[data-no="11"]'); await t.waitForTimeout(200);
  await t.click('[data-k="open-go"]'); await t.waitForTimeout(400); if (await t.$('[data-k="open-yes"]')) await t.click('[data-k="open-yes"]'); await t.waitForTimeout(1500);
  const live = await rest('school/live'), code = live && live.code; ok('1-3 · 11차시 수업 열림', !!code, JSON.stringify(live));
  const s = await page('');
  await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  const created = Number(await rest(`rooms/${code}/meta/created`)) || Date.now(), pid = `owl_${(created - 60000).toString(36)}`;
  await rest('accounts/1-3/3/pet', 'PUT', { on: pid, list: { [pid]: { kind: 'owl', food: 0, name: '꼬마 부엉' } } }); // 수업 1분 전에 알을 산 학생
  // 학생은 수업 끝 화면을 못 봄(중간에 나감 · 종합실이 시간으로 닫음) → 교사 기기가 반 기록만 채움 (🧩 지난 수업 기록 채우기와 같은 꼴)
  await rest('accounts/1-3/3/pet/fed', 'DELETE');
  await rest('records/1-3/3/ex-11', 'PUT', { at: Date.now(), code: String(code), no: 11, mons: { m1: 'n' } });
  await rest('records/1-3/3/ex-09', 'PUT', { at: Date.now(), code: '000000', no: 9, mons: { m1: 'o' } }); // 펫 들이기 전(방 없음) = 안 줌
  await s.reload(); let toast = false;
  for (let i = 0; i < 30 && !toast; i++) { await s.waitForTimeout(300); toast = await s.evaluate(() => document.body.innerText.includes('지난 수업 펫 먹이 +5')); }
  await s.waitForTimeout(1500);
  const pet = await rest('accounts/1-3/3/pet');
  ok('① 캠프에 들어오면 놓친 차시 먹이 0 → 5 · 이 차시 표시', pet?.list?.[pid]?.food === 5 && pet?.fed?.['ex-11'] === true && !pet?.fed?.['ex-09'], JSON.stringify(pet));
  ok('② 캠프 알림 「🐾 지난 수업 펫 먹이 +5」', toast);
  await s.screenshot({ path: `${SHOTS}/petcatch-camp.png` });
  await s.reload(); await s.waitForTimeout(6000);
  const pet2 = await rest('accounts/1-3/3/pet');
  ok('③ 다시 들어와도 더 안 줌', pet2?.list?.[pid]?.food === 5, JSON.stringify(pet2?.list?.[pid]));
  await b.close(); console.log(errs.length ? `❌ ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
