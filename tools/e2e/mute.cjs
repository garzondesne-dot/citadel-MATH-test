// 🔇 무음 모드 긴급 패치 (📜 2026-11-15 선생님): ① iOS 흉내(navigator.audioSession 있음) → type = 'ambient' · 소리 = Web Audio(<audio> 없음)
//   ② audioSession 없음(안드로이드) → 학생 폰 배경음 처음 끔 · 켜면 그 폰 기억 · 교사 폰 · TV = 처음 켬 · 효과음 = 처음 켬
const { chromium } = require('playwright');
const B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const page = async (q, ios) => {
    const c = await b.newContext({ viewport: { width: 390, height: 844 } });
    await c.addInitScript((ios) => {
      if (ios) Object.defineProperty(navigator, 'audioSession', { value: { type: 'auto' }, configurable: true });
      window.__media = 0; const P = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__media++; return P.call(this); };
    }, ios);
    const p = await c.newPage(); p.on('pageerror', (e) => errs.push(String(e))); await p.goto(B + q); await p.waitForTimeout(2500); return p;
  };
  // ① iOS 흉내 · 학생 캠프 · 배경음 켬
  const s1 = await page('?role=camp&room=MU1', true);
  await s1.evaluate(() => localStorage.setItem('citadel-sound', JSON.stringify({ sfx: true, bgm: true }))); await s1.reload(); await s1.waitForTimeout(2000);
  await s1.mouse.click(200, 300); await s1.waitForTimeout(2500);
  const r1 = await s1.evaluate(() => ({ type: navigator.audioSession?.type, media: window.__media, bgm: window.__bgm && window.__bgm() }));
  ok('① iOS: audioSession.type = ambient', r1.type === 'ambient', JSON.stringify(r1.type));
  ok('① 소리 = Web Audio (<audio> 재생 0번)', r1.media === 0 && !!r1.bgm?.playing, JSON.stringify(r1));
  // ② 안드로이드 흉내 · 처음(기억 없음) 학생 = 배경음 끔
  const s2 = await page('?role=camp&room=MU2', false);
  const p2 = await s2.evaluate(() => ({ store: localStorage.getItem('citadel-sound'), bgm: window.__bgm && window.__bgm() }));
  ok('② 학생 폰 처음 = 배경음 끔 (곡 없음)', !p2.bgm?.playing, JSON.stringify(p2));
  // 켜기 → 기억
  await s2.evaluate(() => localStorage.setItem('citadel-sound', JSON.stringify({ sfx: true, bgm: true }))); await s2.reload(); await s2.waitForTimeout(1500); await s2.mouse.click(200, 300); await s2.waitForTimeout(2000);
  ok('② 켜 두면 다시 열어도 켬(기억)', !!(await s2.evaluate(() => window.__bgm && window.__bgm().playing)));
  // 교사 폰 = 처음 켬
  const t = await page('?role=camp&from=me', false); await t.mouse.click(200, 300); await t.waitForTimeout(2000);
  ok('③ 교사 내 캠프 처음 = 배경음 켬', !!(await t.evaluate(() => window.__bgm && window.__bgm().playing)));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
