// 🐞 🐾 11/26 1-1반 「수업 끝났는데 먹이 5 가 안 들어와요」 (에뮬레이터 · 실제 학생 1-3 · 3번 · 펫 있음)
//   교사 = 11차시 팩 올리고 1-3 수업 열기 → 학생 = 로그인 · 입장 → 수업을 끝(마지막 단계 뒤)으로
//   ① 서버 accounts/1-3/3/pet 먹이 0 → 5 · fed/ex-11 ② 끝 화면 「🐾 펫 먹이 +5」 ③ 다시 들어와도 더 안 줌(차시마다 한 번)
//   cd firebase && firebase emulators:start --only database,auth --project demo-citadel-test
//   NODE_PATH=$(npm root -g) node tools/e2e/petfeed1126-emu.cjs <그림 폴더>
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
  await rest('accounts/1-3/3/pet', 'PUT', { on: 'p1', list: { p1: { kind: 'owl', food: 0, name: '꼬마 부엉' } } }); // 둥지에서 알을 산 학생
  await s.waitForTimeout(800);
  await s.click('button.pmain:has-text("던전 입장")'); await s.waitForTimeout(2500);
  await rest(`rooms/${code}/state`, 'PATCH', { step: 9, stepAt: Date.now() }); // 마지막 단계 뒤 = 끝
  await s.waitForSelector('[data-k="pet-feed"]', { timeout: 20000 }).catch(() => {});
  await s.waitForTimeout(1500);
  const pet = await rest('accounts/1-3/3/pet');
  ok('① 서버 먹이 0 → 5 · 이 차시 표시', pet?.list?.p1?.food === 5 && pet?.fed?.['ex-11'] === true, JSON.stringify(pet));
  const line = await s.textContent('[data-k="pet-feed"]').catch(() => '없음');
  ok('② 끝 화면 「🐾 펫 먹이 +5」', /펫 먹이 \+5/.test(line), line);
  await s.screenshot({ path: `${SHOTS}/petfeed-end.png`, fullPage: true });
  await s.reload(); await s.waitForTimeout(5000);
  const pet2 = await rest('accounts/1-3/3/pet'), line2 = await s.textContent('[data-k="pet-feed"]').catch(() => '없음');
  ok('③ 다시 들어와도 더 안 줌 · 「이미 받았어요」', pet2?.list?.p1?.food === 5 && /이미 받았어요/.test(line2), `${pet2?.list?.p1?.food} · ${line2}`);
  await b.close(); console.log(errs.length ? `❌ ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
