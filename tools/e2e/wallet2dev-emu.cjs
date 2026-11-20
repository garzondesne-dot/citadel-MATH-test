// 🐞 11/20 ①② 두 기기 지갑 (에뮬레이터): 같은 학생이 폰 A · B 로 동시에 · A = 우편 선물 받기 · B(먼저 열어 둔 옛 화면) = 💎 강화 → 서버 = 둘 다 남음
//   + 서버 칸이 느리게 와도(🐢) 캠프를 열 때 지갑을 시작 값으로 덮어쓰지 않음 (1-1-14 · 1-5-16 꼴)
//   NODE_PATH=$(npm root -g) node [-r ./tools/e2e/_slow.cjs] tools/e2e/wallet2dev-emu.cjs <그림 폴더>
const { chromium } = require('playwright');
const { rest } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = (process.env.E2E_BASE || 'http://localhost:4173/') + '?emu=127.0.0.1', PID = 's1_3_3';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } }, school: { features: { bundle: 'full', on: { hero: true, scarecrow: true } } } });
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const phone = async (pin) => {
    const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e))); s.setDefaultTimeout(40000);
    await s.addInitScript(() => { try { localStorage.setItem('citadel-wake-tip', '1'); sessionStorage.setItem('citadel-hero0', ''); } catch {} });
    await s.goto(B); await s.waitForSelector('.title', { timeout: 60000 }); await s.waitForTimeout(800);
    await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(300); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(500);
    if (pin.length === 8 && !(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
    await s.click('.pw >> nth=0'); for (const k of pin) await s.click(`.pad button:text-is("${k}")`);
    await s.click('.title .act .pmain');
    const fh = await s.waitForSelector('button:has-text("과 시작"), button:has-text("와 시작"), [data-prop]', { timeout: 60000 }).catch(() => null);
    if (fh && /시작/.test((await fh.textContent()) || '')) { await fh.click(); await s.waitForTimeout(1200); }
    await s.waitForSelector('[data-prop="mail"]', { timeout: 60000 });
    return s;
  };
  const A = await phone('12341234'); // 가입
  await A.waitForTimeout(2000);
  // 서버에 지갑 기록이 있는 학생으로 만듦 (💎 300 · 📜 5 · EXP 475 · 용사 산 것 1)
  await rest('gem/1-3/3', 'PATCH', { total: 300, scroll: 5, ver: 1, buy: [{ id: 'hero_6', ver: 1, at: 1 }], log: { raid_OLD: { g: 9, at: 1 } } }); await rest('xp/1-3/3', 'PUT', { total: 475 });
  await A.reload(); await A.waitForSelector('[data-prop="mail"]', { timeout: 60000 }); await A.waitForTimeout(3000);
  const g0 = await rest('gem/1-3/3');
  ok('① 느린 망에서 다시 열어도 지갑 그대로 (시작 값으로 안 덮어씀)', g0.total === 300 && g0.scroll === 5 && (await rest('xp/1-3/3/total')) === 475 && (g0.buy || []).some((x) => x.id === 'hero_6'), JSON.stringify({ t: g0.total, s: g0.scroll }));
  const Bp = await phone('1234'); await Bp.waitForTimeout(2500); // 두 번째 폰 (로그인) = 💎 300 을 본 채로 둠
  // A = 선물 받기 (+50)
  await rest(`gifts/${PID}/sorry_t`, 'PUT', { g: 50, at: Date.now(), fun: '시험 선물', got: false, hold: true });
  await A.click('[data-prop="mail"]'); await A.waitForSelector('[data-claim="sorry_t"]', { timeout: 30000 }); await A.click('[data-claim="sorry_t"]');
  for (let i = 0; i < 40 && (await rest('gem/1-3/3/total')) !== 350; i++) await A.waitForTimeout(250);
  ok('A 선물 받기 → 서버 💎 350', (await rest('gem/1-3/3/total')) === 350, String(await rest('gem/1-3/3/total')));
  // B = 강화 +1 (옛 화면) → 저장
  await Bp.click('button[aria-label="내 용사 보기"]'); await Bp.waitForSelector('.mh'); await Bp.waitForTimeout(600);
  const E1 = require('../../src/model/hero-data.json').enh[1], cost = E1.g, sc = E1.s || 0; // 강화 +1 값 (hero-data)
  await Bp.click('.mh .pmain'); await Bp.waitForTimeout(300); await Bp.click('.mh .pmain'); await Bp.waitForSelector('.ask'); await Bp.click('.askbox .btn');
  for (let i = 0; i < 40 && (await rest('gem/1-3/3/enh')) !== 1; i++) await Bp.waitForTimeout(250);
  await Bp.waitForTimeout(2500);
  const g1 = await rest('gem/1-3/3');
  ok('② B 강화 = 강화 1 · 💎 = 350 − 값 (A 의 선물 +50 이 남음 · 예전 = 300 − 값으로 덮어씀)', g1.enh === 1 && g1.total === 350 - cost && g1.scroll === 5 - sc, JSON.stringify({ total: g1.total, enh: g1.enh, cost, scroll: g1.scroll }));
  ok('② 옛 log · 산 것 그대로', !!g1.log?.raid_OLD && (g1.buy || []).some((x) => x.id === 'hero_6'));
  await A.reload(); await A.waitForSelector('[data-prop="mail"]', { timeout: 60000 }); await A.waitForTimeout(3000);
  const g2 = await rest('gem/1-3/3');
  ok('③ A 다시 열기 = 서버 그대로', g2.total === g1.total && g2.enh === 1, JSON.stringify({ total: g2.total, enh: g2.enh }));
  await A.screenshot({ path: `${SHOTS}/wallet2dev.png` });
  ok('콘솔 오류 0', !errs.some((e) => /Error/.test(e)), errs.slice(0, 2).join(' | '));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
