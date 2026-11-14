// 🔑 시험 서버(에뮬레이터) 0000 초기화 (📜 2026-11-14 리모컨 시안 v12 「시험 서버에서도 되게」): 학생 1-3 · 3번 가입(1234) → 교사 「학생」 탭 → 3번 → 🔑 0000
//   → 그 학생 폰 = 처음 화면에서 0000 으로 로그인됨 · 옛 비밀번호 1234 = 안 됨 · 기록 칸(반 · 번호)은 그대로 · 로그인 판 g = 1
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  const login = async (pw, join) => {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e))); p.setDefaultTimeout(15000);
    await p.goto(`${B}?${E}`); await p.waitForSelector('.title', { timeout: 20000 }); await p.waitForTimeout(800);
    await p.selectOption('select >> nth=0', '1-3'); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', '3'); await p.waitForTimeout(400);
    if (join && !(await p.$('.pw:has(small)'))) await p.click('.lk:has-text("가입")');
    if (!join && (await p.$('.pw:has(small)'))) await p.click('.lk:has-text("로그인")');
    await p.click('.pw >> nth=0'); for (const k of join ? pw + pw : pw) await p.click(`.pad button:text-is("${k}")`);
    await p.waitForTimeout(200); await p.click('.title .act .pmain'); await p.waitForTimeout(3000);
    const ok = !(await p.$('.title')), err = (await p.textContent('.err').catch(() => '')) || ''; await p.context().close(); return { ok, err: err.trim() };
  };
  const j = await login('1234', true); log('① 가입 1234:', j.ok ? '캠프 ○' : `✗ ${j.err}`); if (!j.ok) errs.push('가입');
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('.tabs button:has-text("학생")'); await t.waitForTimeout(400); await t.click('.chips button:text-is("1-3")').catch(() => {}); await t.waitForTimeout(300);
  await t.click('.pc[aria-label^="3번"]'); await t.waitForTimeout(300); await t.click('.acts button:has-text("0000")'); await t.waitForTimeout(800);
  const acc = await rest('accounts/1-3/3'); log('② 교사 🔑 0000 → 칸:', JSON.stringify({ g: acc?.g, reset: acc?.reset })); if (acc?.g !== 1 || acc?.reset !== true) errs.push('초기화 표시');
  const o = await login('1234', false); log('③ 옛 비밀번호 1234:', o.ok ? '✗ 들어가짐' : `막힘 ○ (${o.err})`); if (o.ok) errs.push('옛 비밀번호 들어감');
  const n = await login('0000', false); log('④ 0000 로그인:', n.ok ? '캠프 ○' : `✗ ${n.err}`); if (!n.ok) errs.push('0000 로그인');
  const acc2 = await rest('accounts/1-3/3'); log('⑤ 칸:', JSON.stringify({ g: acc2?.g, reset: acc2?.reset ?? null, uid: acc2?.uid !== acc?.uid ? '새 로그인' : '그대로' }));
  const n2 = await login('0000', false); log('⑥ 다시 0000:', n2.ok ? '○' : `✗ ${n2.err}`); if (!n2.ok) errs.push('다시 0000');
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
