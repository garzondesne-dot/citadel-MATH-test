// 🔑 로그인 기억은 있는데 서버 계정 주인이 다를 때 (b205 · 🐞 1-6 베타테 「정식은 성채 처치 0 · 💎 9,159 · 테스터」)
//   ① 가입 → 새로 고침 = 같은 계정 캠프(서버 💎) ② 계정 주인 uid 를 다른 값으로 → 새로 고침 = 「다시 로그인」 안내 + 첫 화면(테스트 저장소 캠프로 열리지 않음)
const { chromium } = require('playwright');
const { rest } = require('./_emu.cjs');
const B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(`${B}?${E}`); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  await rest('gem/1-3/3/total', 'PUT', 15);
  await s.reload(); await s.waitForTimeout(4000);
  const camp1 = !(await s.$('.title')), gem1 = await s.evaluate(() => document.body.innerText.includes('15'));
  log('① 새로 고침 → 캠프', camp1, '| 서버 💎 15 보임', gem1, '| 안내', !!(await s.$('[data-k="relogin"]'))); if (!camp1 || (await s.$('[data-k="relogin"]'))) errs.push('정상 새로 고침');
  await rest('accounts/1-3/3/uid', 'PUT', 'someone-else');
  await s.reload(); await s.waitForTimeout(4500);
  const title2 = !!(await s.$('.title')), msg = await s.textContent('[data-k="relogin"]').catch(() => '');
  log('② 계정 주인 다름 → 첫 화면', title2, '| 안내', msg.trim()); if (!title2 || !msg) errs.push('다시 로그인');
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
