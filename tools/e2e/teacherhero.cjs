// 👩‍🏫 교사 B안 (📜 2026-11-13 밤): 교사 「나」 내 용사 = 용사 모두 열림(선생님 전용 올드윈 · 공식 포함) · 스킬은 직접 해금(💎 9,999 · 📜 30) · ↺ 처음으로(확인 한 번) · 학생 캠프엔 선생님 용사 · 되돌리기 없음 · 기록 따로
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  // 학생 캠프 먼저 (기록 따로 · 선생님 용사 안 보임)
  await p.goto(B + '?role=camp&room=TH1'); await p.waitForSelector('.hero-card'); await p.click('.hero-card'); await p.click('button.top[aria-label="용사 바꾸기"]'); await p.waitForSelector('.hsw .swc');
  const stu = await p.$$eval('.hsw .swc b', (x) => x.map((e) => e.textContent)); const stuReset = !!(await p.$('[data-k="treset"]'));
  log('학생: 용사', stu.length, '· 올드윈', stu.includes('올드윈'), '· 되돌리기', stuReset); if (stu.includes('올드윈') || stu.includes('공식') || stuReset) errs.push('학생 화면에 선생님 용사 · 되돌리기');
  // 교사 「나」 → 내 용사
  await p.goto(B + '?role=teacher'); await p.waitForSelector('.tabs'); await p.click('.tabs button:has-text("나")'); await p.waitForTimeout(300);
  await p.click('.item:has-text("내 용사")'); await p.waitForSelector('button.top[aria-label="용사 바꾸기"]');
  const top0 = (await p.textContent('button.top')).replace(/\s+/g, ' '); log('교사 내 용사:', top0.slice(0, 60)); if (!/올드윈/.test(top0)) errs.push('교사 기본 용사 = 현자 올드윈 아님');
  await p.screenshot({ path: `${SHOTS}/teacher-me.png` });
  await p.click('button.top[aria-label="용사 바꾸기"]'); await p.waitForSelector('.hsw .swc');
  const tch = await p.$$eval('.hsw .swc', (x) => x.map((e) => ({ n: e.querySelector('b').textContent, lk: e.classList.contains('lk') })));
  log('교사: 용사', tch.length, '· 잠김', tch.filter((x) => x.lk).length, '· 앞', tch.slice(0, 3).map((x) => x.n).join(' · ')); if (tch.some((x) => x.lk) || !tch.some((x) => x.n === '공식')) errs.push('교사 용사 모두 열림 아님');
  await p.click('.hsw .swc:has-text("공식")'); await p.waitForTimeout(300); await p.screenshot({ path: `${SHOTS}/teacher-heroes.png` });
  await p.click('.hsw .pmain'); await p.waitForTimeout(300);
  // 스킬 = 직접 해금 (Ⅰ 만 가짐)
  const sk = await p.$$eval('.lr', (x) => x.map((e) => e.className.replace('lr', '').trim())); log('스킬 칸:', sk.join(' · ')); if (sk.filter((c) => /own|equip/.test(c)).length > 1) errs.push('스킬이 처음부터 열림');
  // ↺ 처음으로
  const has = !!(await p.$('[data-k="treset"]')); log('↺ 처음으로 단추:', has); if (!has) errs.push('교사 되돌리기 없음');
  await p.evaluate(() => { const k = 'citadel-v1-me|teacher'; const m = JSON.parse(localStorage.getItem(k) || '{}'); m.wallet = { ...(m.wallet || {}), gem: 120, scroll: 2, buys: [{ id: 'moon', ver: 2, at: 1 }] }; m.enh = 4; m.hero = 17; localStorage.setItem(k, JSON.stringify(m)); });
  await p.reload(); await p.waitForSelector('.tabs'); await p.click('.tabs button:has-text("나")'); await p.waitForTimeout(300); await p.click('.item:has-text("내 용사")'); await p.waitForSelector('[data-k="treset"]');
  await p.click('[data-k="treset"]'); await p.waitForSelector('[data-k="treset-go"]'); await p.screenshot({ path: `${SHOTS}/teacher-reset-ask.png` }); await p.click('[data-k="treset-go"]'); await p.waitForTimeout(400);
  const after = await p.evaluate(() => JSON.parse(localStorage.getItem('citadel-v1-me|teacher') || '{}')); log('되돌린 뒤:', JSON.stringify({ hero: after.hero, enh: after.enh, gem: after.wallet?.gem, scroll: after.wallet?.scroll, buys: after.wallet?.buys?.length }));
  if (after.hero !== 7 || after.enh !== 0 || after.wallet?.gem !== 9999 || after.wallet?.scroll !== 30 || after.wallet?.buys?.length) errs.push('되돌리기 값');
  const stuKey = await p.evaluate(() => localStorage.getItem('citadel-v1-me')); log('학생 기록 칸 따로:', !!stuKey);
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
