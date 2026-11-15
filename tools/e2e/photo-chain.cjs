// ✍ 수업 소레이드 서술형 📸 (🧪 테스트 모드 = 이 기기 · 사진 안 받음 「✔ 테스트: 사진 통과로 보기」 · b201)
//   6차시 문제 4(소레이드) 시작 전 → ✍ 서술형 → 쓰기 화면(학습지 문제 · 📸 찍어서 채점 · 📜 풀이 보기 · ✕ 그만 쓰기) → 통과 = 🌟 진필살기 · 남은 단계 모두 처치 · ✍ 단추 「🌟 통과」
//   + 🎯 허수아비 · 📋 게시판 · 🏰 성채 전투 화면엔 ✍ 없음(정식) — dummy.cjs · castle.cjs 가 따로 봄
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', base = 'http://localhost:4173/';
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 360, height: 760 } });
  const open = async (url) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e))); await p.goto(base + url); return p; };
  const hall = await open('?role=hall&mode=test&lesson=set-06@7&room=PH1'); await hall.setViewportSize({ width: 1000, height: 900 }); await hall.waitForSelector('.dock');
  const s = await open('?role=student&room=PH1'); await hall.waitForTimeout(1200);
  await hall.mouse.move(500, 400); await hall.click('.dock .t:has-text("고정")');
  const next = async () => { await hall.click('.dock .go'); await hall.waitForTimeout(300); };
  await next(); await next();
  let found = false;
  for (let g = 0; g < 30 && !found; g++) {
    const title = (await hall.$('.split')) ? '개념' : ((await hall.textContent('.fs.now em').catch(() => '')) || '').trim();
    log('   단계', g, title);
    if (/문제 4|u4/.test(title)) { found = true; break; }
    await next();
  }
  if (!found) errs.push('문제 4 못 찾음');
  await hall.waitForFunction(() => !document.querySelector('.sc'), null, { timeout: 12000 }).catch(() => {});
  await s.waitForSelector('[data-k="wr-btn"]', { timeout: 12000 }).catch(() => {});
  const wb = await s.$eval('[data-k="wr-btn"]', (x) => `${x.textContent.trim()}${x.disabled ? ' (막힘)' : ''}`).catch(() => '');
  log('① 문제 4 시작 전 ✍ 단추:', wb || '✗ 없음'); if (!/서술형/.test(wb) || /막힘/.test(wb)) errs.push('✍ 단추');
  await s.screenshot({ path: `${SHOTS}/chain-wr-btn.png` });
  await s.click('[data-k="wr-btn"]'); await s.waitForSelector('[data-k="write-mode"]');
  const wtxt = (await s.textContent('[data-k="write-mode"]')).replace(/\s+/g, ' ').trim();
  log('② 쓰기 화면:', wtxt.slice(0, 90), '| 📜 풀이 보기', !!(await s.$('[data-k="wr-peek"]')), '| ✕', !!(await s.$('[data-k="wr-x"]')));
  if (!/학습지 숫자 그대로/.test(wtxt) || !/2장 남음/.test(wtxt)) errs.push('쓰기 화면 글');
  await s.screenshot({ path: `${SHOTS}/chain-write.png` });
  await s.click('.act button:has-text("찍어서 채점")'); await s.waitForSelector('[data-k="photo-sheet"][data-view="trial"]');
  await s.screenshot({ path: `${SHOTS}/chain-trial.png` });
  await s.click('.sheet button:has-text("테스트: 사진 통과로 보기")'); await s.waitForTimeout(900);
  const toast = await s.textContent('.toast').catch(() => ''); log('③ 통과 →', toast.trim());
  if (!/진필살기|서술형 통과/.test(toast)) errs.push('통과 알림');
  await s.waitForTimeout(3800);
  const toast2 = await s.textContent('.toast').catch(() => ''); log('   이어서 →', toast2.trim()); if (!/남은 \d단계 모두 처치/.test(toast2)) errs.push('남은 단계 처치');
  const done = await s.textContent('.okline').catch(() => ''); log('   카드:', done.replace(/\s+/g, ' ').trim()); if (!/대장 처치/.test(done)) errs.push('처치 카드');
  const wb2 = await s.$eval('[data-k="wr-btn"]', (x) => x.textContent.trim()).catch(() => ''); log('   ✍ 단추 →', wb2); if (!/통과/.test(wb2)) errs.push('통과 단추');
  await s.screenshot({ path: `${SHOTS}/chain-pass.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
