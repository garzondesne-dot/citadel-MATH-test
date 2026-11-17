// 🐞 #60 🧪 테스트 모드(🎒 학생 폰 · 메모리 방) 대기실 「🔑 열쇠 얻기」 → 문제 창 → 고르기 → 🔑 · --raw = 운영 상태(옛 앱으로 올린 팩 꼴 열쇠) 재현
const { chromium } = require('playwright');
const path = require('path');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?role=teacher&emu=127.0.0.1';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e))); t.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); }); t.setDefaultTimeout(15000);
  await t.goto(B); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  // 운영과 같은 상태 = 옛 앱(b221)으로 올려 keys 가 팩 꼴(q · a · ch) 그대로 저장된 11차시 팩
  const RAW = process.argv.includes('--raw');
  if (RAW) { await rest('prep/packs/ex-11', 'PUT', require('../pack-upload/keys/ex-11-v4.json')); await t.reload(); await t.waitForSelector('.tabs', { timeout: 20000 }); const k0 = await rest('prep/packs/ex-11/keys/0/vers/0'); ok('(운영 재현) 서버 열쇠 = 팩 꼴 q · a · ch', !!k0 && 'q' in k0 && !('question' in k0)); }
  else if (!(await rest('prep/packs/ex-11/keys'))) { await t.click('.tabs button:has-text("차시 팩")'); await t.click('[data-k="packup-go"]'); await t.setInputFiles('[data-k="packfile"]', path.join(__dirname, '../pack-upload/keys/ex-11-v4.json')); await t.waitForSelector('[data-k="packsum"]'); await t.click('.sheet .btn.pmain'); await t.waitForTimeout(3000); await t.goto(B); await t.waitForSelector('.tabs', { timeout: 20000 }); }
  await t.click('.tabs button:has-text("수업")'); await t.waitForTimeout(400);
  await t.click('[data-k="cls-test"]'); await t.click('.pk[data-no="11"]'); await t.click('.tmb[data-mode="stu"]'); await t.waitForTimeout(300);
  await t.click('[data-k="open-go"]'); await t.waitForTimeout(400); if (await t.$('[data-k="open-yes"]')) await t.click('[data-k="open-yes"]');
  await t.waitForSelector('[data-k="stutry"]'); await t.waitForSelector('[data-k="key-go"]', { timeout: 10000 });
  await t.screenshot({ path: `${SHOTS}/k60-try-lobby.png` });
  await t.click('[data-k="key-go"]'); await t.waitForTimeout(600);
  const sheet = await t.$('[data-k="key-sheet"]'); ok('① 단추 → 문제 창 열림', !!sheet);
  await t.screenshot({ path: `${SHOTS}/k60-try-sheet.png` });
  if (sheet) {
    const box = await sheet.boundingBox(), vp = t.viewportSize(); ok('① 문제 창이 화면 안에 보임', !!box && box.y >= 0 && box.y < vp.height - 40, JSON.stringify(box));
    await t.click('[data-k="key-sheet"] .opt >> nth=2').catch((e) => errs.push('고르기 클릭 실패 ' + String(e).slice(0, 120)));
    const on = await t.$('[data-k="key-sheet"] .opt.on'); ok('② 보기 고르면 선택 표시', !!on);
    await t.click('.sheet .pmain').catch((e) => errs.push('확인 클릭 실패 ' + String(e).slice(0, 120))); await t.waitForTimeout(400);
    ok('② 확인 → 결과(획득 / 💡)', !!(await t.$('[data-k="key-ok"], [data-k="key-no"]')));
    await t.screenshot({ path: `${SHOTS}/k60-try-res.png` });
  }
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
