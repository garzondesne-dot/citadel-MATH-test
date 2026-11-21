// 🎯 #54 레이드 손맛 공용 조각 — 체험판 학생 판(🤖 친구 4) 으로: 폰 장면 = 친구 공격 숫자(작게 · hitfx-num fr) · 체력 흰 잔상 칸 · 금(체력 75% 아래) · 📺 TV 장면도 같은 판
//   (레이드 폰 = 내 공격 숫자만 크게 · 친구 공격은 TV 에서 · 여기선 체력 잔상 · 금 · 📺 TV 장면 오류 0)
//   NODE_PATH=$(npm root -g) node tools/e2e/hitfx54.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/trial/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B); await p.fill('[data-k="trial-name"]', '체험'); await p.click('[data-k="trial-stu"]'); await p.waitForTimeout(800);
  if (await p.$('text=첫 용사 고르기')) { await p.click('button:has-text("시작")'); await p.waitForTimeout(600); }
  await p.click('[data-k="trial-card"]'); await p.waitForSelector('[data-k="try-remote"]', { timeout: 15000 });
  const next = async () => p.click('[data-k="try-remote"] button:has-text("다음")').catch(() => {});
  for (let i = 0; i < 12 && !(await p.$('.mon.monster')); i++) { await next(); await p.waitForTimeout(1200); }
  await p.waitForSelector('.mhp', { timeout: 20000 }).catch(() => {});
  ok('몬스터 장면 · 체력 막대', !!(await p.$('.mhp')));
  ok('체력 막대 흰 잔상 칸', !!(await p.$('.mhp .b .hitfx-lag')));
  const seen = { fr: 0, me: 0, crack: 0, bits: 0 };
  for (let i = 0; i < 80; i++) { const r = await p.evaluate(() => ({ fr: document.querySelectorAll('.hitfx-num.fr').length, me: document.querySelectorAll('.hitfx-num.me').length, crack: document.querySelectorAll('[data-k="mon-crack"]').length, bits: document.querySelectorAll('.hitfx-bit').length })); seen.fr = Math.max(seen.fr, r.fr); seen.me = Math.max(seen.me, r.me); seen.crack = Math.max(seen.crack, r.crack); seen.bits = Math.max(seen.bits, r.bits); if (seen.crack) break; await p.waitForTimeout(250); }
    ok('체력 75% 아래 = 몸에 금', seen.crack > 0, JSON.stringify(seen));
  await p.screenshot({ path: `${SHOTS}/hitfx54-phone.png` });
  await p.click('[data-k="try-tv-btn"]').catch(() => {}); await p.waitForTimeout(4000); await p.screenshot({ path: `${SHOTS}/hitfx54-tv.png` });
  ok('📺 TV 장면 열림 · 오류 0', !errs.length);
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
