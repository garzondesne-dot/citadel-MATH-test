// 💥 📜 #129 실드 깨짐 = 유리창 쨍그랑 + 무방비 — 미리 보기 서버 4173 · 가로 폰 844 × 390
//   ① 마지막 칸 깸 → 하얀 번쩍 · 금 간 방패막 · 유리 조각 · 「💥 실드 파괴!」 · 소리 shield-crack → shield-shatter → boss-stagger
//   ② 무방비 = 💢 칩 · 머리 위 별 · 발밑 금 · 게이지 금색 · 무방비 모양은 산산조각 뒤에 ③ 석화와 겹침 = 칩 둘 · 회색 대신 무방비 ④ 끝 = 칩 사라짐
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
(async () => {
  const out = [], errs = [], ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 844, height: 390 } });
  await p.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); globalThis.__atbNoAutoQ = true; } catch { /* 무시 */ } });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('http://localhost:4173/?role=atb'); await p.waitForSelector('[data-k="atb-setup"]');
  await p.click('button:has-text("실드 한 칸 남음")'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(3500);
  await p.evaluate(() => { const S = globalThis.__atb.S, me = S.heroes[0]; S.cells = S.cells.map((c, i) => (i === 0 ? { ...c, fam: me.s.fam, broken: false } : { ...c, broken: true })); S.shieldUp = true; me.ch = 4; me.atb = 1; window.__sfxLog.length = 0; });
  await p.waitForTimeout(400);
  await p.click('[data-k="atb-break"]', { force: true });
  const seen = { flash: false, cracked: false, glass: 0, msg: false, dazeBefore: false };
  for (let i = 0; i < 50; i++) {
    const s = await p.evaluate(() => ({ f: !!document.querySelector('.sflash'), bar: document.querySelector('[data-k="atb-barrier"]')?.className ?? '', g: document.querySelectorAll('[data-k="atb-glass"] .gs').length, msg: document.querySelector('[data-k="atb-bigmsg"]')?.textContent ?? '', d: !!document.querySelector('[data-k="atb-stars"]') }));
    if (s.d && !seen.glass) seen.dazeBefore = true;
    seen.flash ||= s.f; seen.cracked ||= /cracked/.test(s.bar); seen.glass = Math.max(seen.glass, s.g); seen.msg ||= /실드 파괴/.test(s.msg);
    if (seen.glass && s.d) break; await p.waitForTimeout(60);
  }
  ok('① 하얀 번쩍 · 금 간 방패막(cracked)', seen.flash && seen.cracked);
  ok('① 유리 조각 20 ~ 30개', seen.glass >= 20 && seen.glass <= 30, String(seen.glass));
  ok('① 위 띠 「💥 실드 파괴!」', seen.msg);
  ok('② 무방비 모양 = 산산조각 뒤에', !seen.dazeBefore);
  await p.waitForTimeout(700);
  const log = await p.evaluate(() => window.__sfxLog.slice()), at = (k) => log.indexOf(k);
  ok('🔊 쩍 → 쨍그랑 → 휘청 (shield-crack · shield-shatter · boss-stagger)', at('shield-crack') >= 0 && at('shield-shatter') > at('shield-crack') && at('boss-stagger') > at('shield-crack'), JSON.stringify(log.filter((k) => /shield|stagger/.test(k))));
  const d = await p.evaluate(() => ({ chip: document.querySelector('[data-k="atb-daze"]')?.textContent ?? '', stars: document.querySelectorAll('[data-k="atb-stars"] i').length, floor: !!document.querySelector('[data-k="atb-dfloor"]'), gold: !!document.querySelector('[data-k="atk-gauge"].gold'), dazed: !!document.querySelector('[data-k="atb-boss"].dazed') }));
  ok('② 💢 무방비 n초 칩 · 별 3 · 발밑 금 · 게이지 금색 · 보스 dazed', /무방비 \d+초/.test(d.chip) && d.stars === 3 && d.floor && d.gold && d.dazed, JSON.stringify(d));
  await p.screenshot({ path: `${SHOTS}/atb129-daze.png` });
  await p.evaluate(() => { const S = globalThis.__atb.S; S.stoneUntil = S.t + 6; }); await p.waitForTimeout(300);
  const st = await p.evaluate(() => ({ n: document.querySelectorAll('.bsts .bst').length, gray: !!document.querySelector('[data-k="atb-boss"].stone') }));
  ok('③ 석화와 겹침 = 칩 둘 · 무방비 연출 우선(회색 아님)', st.n === 2 && !st.gray, JSON.stringify(st));
  await p.evaluate(() => { const S = globalThis.__atb.S; S.weakUntil = S.t; S.stoneUntil = 0; }); await p.waitForTimeout(600);
  ok('④ 무방비 끝 = 칩 · 별 사라짐', !(await p.$('[data-k="atb-daze"]')) && !(await p.$('[data-k="atb-stars"]')));
  ok('오류 0', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(out.join('\n')); await b.close(); process.exit(errs.length ? 1 : 0);
})();
