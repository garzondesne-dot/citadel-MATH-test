// 🐞 💎 11/27 「수업 EXP 놓친 것 채우기」 (DECISIONS 266e46a · 에뮬레이터 · 1-3 · 3번 · 4번)
//   3번 = 수업에 들어갔다가 끝 화면 전에 나감 → 교사 기기가 반 기록만 채움 → 캠프 = 「⚔ 지난 수업 보상」 · 서버 💎 · EXP 늘어남 · 받음 칸 raid_{수업} · 다시 들어와도 그대로
//   4번 = 끝 화면까지 봄(끝 화면이 줌) → 캠프 = 더 안 줌
//   cd firebase && firebase emulators:start --only database,auth --project demo-citadel-test → NODE_PATH=$(npm root -g) node tools/e2e/raidcatch1127-emu.cjs <그림 폴더>
//   cd firebase && firebase emulators:start --only database,auth --project demo-citadel-test
//   NODE_PATH=$(npm root -g) node tools/e2e/petcatch1127-emu.cjs <그림 폴더>
const { chromium } = require('playwright');
const path = require('path');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼', 4: '시험사' } }, rosterMask: { '1-3': { 3: '시*삼', 4: '시*사' } } });
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const page = async (u) => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();  p.on('pageerror', (e) => errs.push(String(e))); p.on('dialog', (d) => d.accept()); p.setDefaultTimeout(15000); await p.goto(`${B}${u}${u.includes('?') ? '&' : '?'}${E}`); return p; };
  const t = await page('?role=teacher'); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('.tabs button:has-text("차시 팩")'); await t.waitForTimeout(400); await t.click('[data-k="packup-go"]');
  await t.setInputFiles('[data-k="packfile"]', path.join(__dirname, '../pack-upload/keys/ex-11-v4.json')); await t.waitForSelector('[data-k="packsum"]'); await t.waitForTimeout(600);
  await t.evaluate(() => { window.__noReload = true; }); await t.click('.sheet .btn.pmain'); await t.waitForTimeout(2500);
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs', { timeout: 20000 }); await t.waitForTimeout(800);
  await t.click('.tabs button:has-text("수업")'); await t.waitForTimeout(400);
  await t.click('[data-k="cls-row"] button:has-text("1-3")'); await t.waitForTimeout(200); await t.click('.pk[data-no="11"]'); await t.waitForTimeout(200);
  await t.click('[data-k="open-go"]'); await t.waitForTimeout(400); if (await t.$('[data-k="open-yes"]')) await t.click('[data-k="open-yes"]'); await t.waitForTimeout(1500);
  const live = await rest('school/live'), code = live && live.code; ok('1-3 · 11차시 수업 열림', !!code, JSON.stringify(live));
  const login = async (n, again = false) => {
    const s = await page(''); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
    await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', String(n)); await s.waitForTimeout(300);
    if (again) { await s.waitForTimeout(1500); const back = await s.$('.lk:has-text("로그인")'); if (back && /가입했어요/.test((await back.textContent()) || '')) await back.click(); await s.waitForTimeout(300); }
    else if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
    await s.click('.pw >> nth=0'); for (const k of again ? '1234' : '12341234') await s.click(`.pad button:text-is("${k}")`);
    await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
    const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
    return s;
  };
  const wallet = async (n) => ({ g: Number(await rest(`gem/1-3/${n}/total`)) || 0, x: Number(await rest(`xp/1-3/${n}/total`)) || 0, raid: await rest(`xp/1-3/${n}/log/raid_${code}`) });
  // ── 3번: 들어갔다가 끝 화면 전에 나감 ──
  const s3 = await login(3); await s3.click('button.pmain:has-text("던전 입장")'); await s3.waitForTimeout(3000);
  ok('3번 수업 방에 들어감', !!(await rest(`rooms/${code}/players/s1_3_3`)));
  await s3.close();
  // ── 4번: 끝 화면까지 ──
  const s4 = await login(4); await s4.click('button.pmain:has-text("던전 입장")'); await s4.waitForTimeout(3000);
  await rest(`rooms/${code}/state`, 'PATCH', { step: 9, stepAt: Date.now() }); // 마지막 단계 뒤 = 끝
  await s4.waitForTimeout(6000);
  const w4a = await wallet(4); ok('4번 = 끝 화면이 보상을 줌', !!w4a.raid && w4a.x > 0, JSON.stringify(w4a));
  // 교사 기기가 반 기록을 채운 꼴 (🧩 지난 수업 기록 채우기와 같은 칸 · 맞힌 것 있음)
  await rest('records/1-3/3/ex-11', 'PUT', { at: Date.now(), code: String(code), no: 11, right: 1, total: 20, mons: { m1: 'f' } });
  const w3a = await wallet(3); ok('3번 = 나간 학생은 보상 없음(전)', !w3a.raid && w3a.x === 0, JSON.stringify(w3a));
  // ── 3번 다시 로그인 → 캠프 ──
  const s3b = await login(3, true); let toast = '';
  for (let i = 0; i < 30 && !toast; i++) { await s3b.waitForTimeout(300); toast = await s3b.evaluate(() => { const m = document.body.innerText.match(/⚔ 지난 수업 보상[^\n]*/); return m ? m[0] : ''; }); }
  await s3b.waitForTimeout(2000);
  const w3b = await wallet(3);
  ok('3번 캠프 = 「⚔ 지난 수업 보상 +💎 · EXP」 알림', /💎\s*\d+/.test(toast) && /EXP\s*\d+/.test(toast), toast);
  ok('3번 서버 💎 · EXP 늘어남 · 받음 칸 raid_{수업}', w3b.g > w3a.g && w3b.x > w3a.x && !!w3b.raid, JSON.stringify(w3b));
  await s3b.screenshot({ path: `${SHOTS}/raidcatch-camp.png` });
  await s3b.reload(); await s3b.waitForTimeout(7000);
  const w3c = await wallet(3); ok('3번 다시 들어와도 그대로(두 번 안 줌)', w3c.g === w3b.g && w3c.x === w3b.x, JSON.stringify(w3c));
  // ── 4번 캠프 → 더 안 줌 ──
  await rest('records/1-3/4/ex-11/right', 'PUT', 1);
  await s4.goto(`${B}?${E}`); await s4.waitForTimeout(8000);
  const w4b = await wallet(4); ok('4번(끝 화면 본 학생) 캠프 = 더 안 줌', w4b.g === w4a.g && w4b.x === w4a.x, `${JSON.stringify(w4a)} → ${JSON.stringify(w4b)}`);
  await b.close(); console.log(errs.length ? `❌ ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
