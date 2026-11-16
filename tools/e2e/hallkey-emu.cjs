// 🖥 종합실 키 (📜 2026-11-17 🐞 「저장해도 나갔다 오면 사라짐 · 브라우저가 비밀번호로 인식」 · 에뮬레이터)
//   ① 교사 「나」 → 종합실 비밀번호 고정 1357 → 새로 고침해도 「고정 1357」 ② TV 키 칸 = 비밀번호 칸 아님(type text · 글자만 가림)
//   NODE_PATH=$(npm root -g) node tools/e2e/hallkey-emu.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.goto(`${B}?role=teacher&tab=me&${E}`); await t.waitForSelector('.item:has-text("종합실 비밀번호")', { timeout: 20000 });
  await t.click('.item:has-text("종합실 비밀번호")'); await t.fill('.sheet input.in', '1357'); await t.click('.sheet .btn:has-text("이 번호로 고정")'); await t.waitForTimeout(1200);
  ok('① 서버에 고정 키 저장', (await rest('secrets/fixed/hallKey')) === '1357');
  await t.reload(); await t.waitForSelector('.item:has-text("종합실 비밀번호")', { timeout: 20000 }); await t.waitForTimeout(2500);
  const sub = (await t.textContent('.item:has-text("종합실 비밀번호") small')) || '';
  ok('   새로 고침 뒤에도 「고정 1357」', /고정 1357/.test(sub), sub);
  const tv = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await tv.goto(`${B}?role=hall&${E}`); await tv.waitForTimeout(4000);
  const k = await tv.$('[data-k="tv-key"]');
  const ty = k ? await k.getAttribute('type') : 'none', ac = k ? await k.getAttribute('autocomplete') : '';
  ok('② TV 키 칸 = 비밀번호 칸 아님 (type text · autocomplete off)', ty === 'text' && ac === 'off', `${ty} · ${ac}`);
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
