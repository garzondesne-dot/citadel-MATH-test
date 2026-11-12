// 🔐 #163-① 교사 로그인 (에뮬레이터): 나 탭 → 교사 계정 만들기 → 새로 고침 → 「교사로 로그인됨」 · 명단 · 기록을 읽음 / 두 번째 계정은 교사가 아님
const { chromium } = require('playwright');
const B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
const { rest } = require('./_emu.cjs');
const log = (...a) => console.log(...a);
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' });
  await rest('', 'PATCH', { gem: { '1-3': { 1: { total: 7 } } } });
  const b = await chromium.launch(), errs = [];
  const go = async (email) => {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(`${B}?role=teacher&${E}`); await p.waitForSelector('.tabs', { timeout: 20000 });
    await p.click('.tabs button:has-text("나")'); await p.click('.item:has-text("교사 로그인")'); await p.waitForSelector('.sheet');
    await p.fill('.fld[type=email]', email); await p.fill('.fld[type=password]', 'pw123456'); await p.click('.sheet .lk');
    await p.waitForTimeout(2500); await p.waitForSelector('.tabs', { timeout: 20000 }); await p.click('.tabs button:has-text("나")'); await p.waitForTimeout(300);
    const t = (await p.textContent('.item:has-text("교사")')).replace(/\s+/g, ' ').trim();
    const gem = await p.evaluate(() => window.__uid && window.__uid()); return { t, uid: gem };
  };
  const a = await go('t1@school.test'), c = await go('t2@school.test');
  const adm = await rest('admins');
  log('첫 계정:', a.t, '| 두 번째:', c.t, '| admins', Object.keys(adm || {}).length);
  if (!/교사로 로그인됨/.test(a.t) || /교사로 로그인됨/.test(c.t) || Object.keys(adm || {}).length !== 1) errs.push('교사 = 첫 계정만');
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
