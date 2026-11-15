// 🧪 출시 막는 것 9: 시험 주소(localhost) = 시험 고리 · ?as · dev 역할 됨 / 출시 같은 주소(rel.test → 같은 미리보기) = 모두 꺼짐 · BETA 글자 없음
//   출시 같은 주소 = dist 를 python3 -m http.server 4174 -d dist 로 (vite preview 는 낯선 이름을 막음)
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/channel.cjs <폴더>
const { chromium } = require('playwright');
const [SHOTS = '.'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--host-resolver-rules=MAP rel.test 127.0.0.1'] }), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const page = async (base, q) => { const cx = await b.newContext({ viewport: { width: 400, height: 800 } }); await cx.route('**/server.json*', (r) => r.fulfill({ status: 404, body: '' })); const p = await cx.newPage(); // 실제 베타 서버에 닿지 않게(이 기기)
    p.on('pageerror', (e) => errs.push(`${base}${q}: ${e}`)); await p.goto(base + q); await p.waitForTimeout(2500); return p; };
  for (const [tag, base, test] of [['시험 주소', 'http://localhost:4173/', true], ['출시 같은 주소', 'http://rel.test:4174/', false]]) {
    const c = await page(base, '?role=camp&room=CH1');
    const h = await c.evaluate(() => ({ sfx: Array.isArray(window.__sfxLog), wake: typeof window.__wake, db: typeof window.__dbGet }));
    ok(`${tag}: 시험 고리 ${test ? '있음' : '없음'}`, test ? h.sfx && h.wake === 'function' : !h.sfx && h.wake === 'undefined' && h.db === 'undefined', JSON.stringify(h));
    await c.evaluate(() => { window.__BOARD_SEC = 0.1; window.__board = 1; }); const k = await c.evaluate(() => [window.__BOARD_SEC, window.__board]);
    ok(`${tag}: 시험 고리 쓰기 ${test ? '됨' : '무시'}`, test ? k[0] === 0.1 : k[0] === undefined && k[1] === undefined, JSON.stringify(k));
    const t = await page(base, '?role=teacher'); await t.waitForSelector('.beta-pill, .beta', { timeout: 8000 }).catch(() => {}); const pill = (await t.$$eval('.beta-pill, .beta, .srv', (xs) => xs.map((x) => x.textContent).join(' | ')).catch(() => ''));
    ok(`${tag}: 교사 화면 ${test ? 'BETA 글자 있음' : 'BETA · 시험 서버 · 테스트 버전 글자 없음'}`, test ? /BETA|🧪 베타/.test(pill) : !/BETA|베타|시험 서버|테스트 버전/.test(pill) && /✅ 정식/.test(pill), pill.trim());
    const d = await page(base, '?role=dev'); const dev = await d.evaluate(() => document.body.innerText.length);
    const dk = await d.evaluate(() => !!document.querySelector('.dev, [data-k="dev"], h1'));
    out.push(`ℹ ${tag}: ?role=dev 글자 ${dev}`);
    if (!test) await t.screenshot({ path: `${SHOTS}/channel-rel-teacher.png` });
  }
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
