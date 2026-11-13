// B5 🔊 소리 탭 = 🔊 효과음 · 🎵 배경음 켜기 · 끄기 따로 · 이 기기 기억 (교사 「나」 탭 · 학생 ⚙ 설정 같은 부품) — 이 기기 모드
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch(), errs = []; const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=teacher'); await t.waitForSelector('.tabs'); await t.click('.tabs button:has-text("나")'); await t.click('.item:has-text("소리")'); await t.waitForSelector('.snd');
  const st = () => t.$$eval('.snd .sw', (xs) => xs.map((x) => `${x.dataset.k}:${x.getAttribute('aria-checked')}`).join(' '));
  log('처음:', await st()); await t.click('.snd .sw[data-k="bgm"]'); log('🎵 끔:', await st()); await t.screenshot({ path: `${SHOTS}/b50-sound-teacher.png` });
  await t.reload(); await t.waitForSelector('.tabs'); await t.click('.tabs button:has-text("나")'); const small = await t.textContent('.item:has-text("소리") small'); log('새로 고침 뒤 나 탭:', small.trim());
  if (!/배경음 꺼짐/.test(small) || !/효과음 켜짐/.test(small)) errs.push('기억 안 됨');
  await t.click('.item:has-text("소리")'); await t.click('.snd .sw[data-k="sfx"]'); await t.click('.sheet .x, .sheet [aria-label="닫기"]').catch(() => {}); await t.keyboard.press('Escape'); await t.waitForTimeout(300);
  const ic = await t.textContent('.item:has-text("소리") .ic'); log('둘 다 끔 → 아이콘:', ic); if (ic.trim() !== '🔇') errs.push('🔇 아님');
  // 학생 ⚙ (캠프)
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push(String(e))); await s.goto(B + '?role=camp'); await s.waitForSelector('button[aria-label="설정"]', { timeout: 15000 });
  await s.click('button[aria-label="설정"]'); await s.waitForSelector('.sheet .snd'); log('학생 ⚙ 같은 값:', await s.$$eval('.snd .sw', (xs) => xs.map((x) => `${x.dataset.k}:${x.getAttribute('aria-checked')}`).join(' ')));
  await s.screenshot({ path: `${SHOTS}/b50-sound-student.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
