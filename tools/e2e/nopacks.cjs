// B9 🐞 차시 0개 (?packs=0 · 정식 0169e5f): 교사 폰 홈 · 준비 · 소식 · 나 탭이 깨지지 않음 · 준비 = 「아직 차시가 없어요」 + 📊 엑셀로 차시 만들기 · 🧪 테스트 = 안내
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(), errs = []; const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text().slice(0, 140)); });
  await p.goto('http://localhost:4173/?role=teacher&packs=0'); await p.waitForSelector('.tabs');
  for (const t of ['수업', '준비', '소식', '나', '학생']) { await p.click(`.tabs button:has-text("${t}")`); await p.waitForTimeout(400); }
  await p.click('.tabs button:has-text("준비")'); await p.waitForTimeout(300);
  const tx = (await p.textContent('.mid')).replace(/\s+/g, ' '), act = (await p.textContent('.tact')).replace(/\s+/g, ' ').trim();
  console.log('준비:', /아직 차시가 없어요/.test(tx) && /엑셀로 차시 만들기/.test(tx) ? '「아직 차시가 없어요」 + 📊 ○' : `✗ ${tx.slice(0, 80)}`, '| 아래 단추:', act);
  if (!/아직 차시가 없어요/.test(tx)) errs.push('빈 상태');
  await p.screenshot({ path: `${SHOTS}/b50-nopacks-prep.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
