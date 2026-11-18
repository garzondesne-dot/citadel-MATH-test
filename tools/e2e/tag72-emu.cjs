// 🏷 #72 캠프 이름표 (에뮬레이터 · 📜 2026-11-18 선생님 「캠프 혼잡 · 이름은 깔끔하게 · 말풍선 정중앙에 글씨 · 💎 얻을 수 있는 개수는 살려」 → B)
//   ① 처음 3번 들어올 때 = 이름표 모두 ② 그 뒤 할 일 없음 = 이름표 0 ③ 복습 있음 = 「허수아비」 금빛 + 빨간 숫자 + 💎+k 칩 · 다른 물건 숨김
//   ④ 모집 중 = 「게시판」 + 1/4 ⑤ 누르면 이름표 0.8초 ⑥ 글씨 = 띠 정가운데(가로 · 세로) ⑦ 교사 「나」 = 늘 보임
//   NODE_PATH=$(npm root -g) node tools/e2e/tag72-emu.cjs <그림 폴더>
const { chromium } = require('playwright');
const { rest } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } } });
  await rest('school/features', 'PUT', { bundle: 'full', on: { hero: true, scarecrow: true, board: true, citadel: true, forge: true } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(B); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  const close = async () => { const x = await s.$('.toast button, [aria-label="알림 닫기"]'); if (x) await x.click().catch(() => {}); };
  const st = () => s.evaluate(() => ({ tags: [...document.querySelectorAll('.tag')].map((e) => `${e.dataset.k.slice(4)}${e.classList.contains('todo') ? '★' : ''}:${e.textContent}`), gems: [...document.querySelectorAll('.gchip')].map((e) => e.textContent) }));
  await close(); let x = await st();
  ok('① 처음 들어올 때 = 이름표 모두 (5개 이상)', x.tags.length >= 5, x.tags.join(' '));
  ok('   이름 = 2~4글자 · 이모지 없음', x.tags.every((t) => /^[a-z]+★?:[가-힣 ]{2,5}\d*(\/\d+)?$/.test(t)), x.tags.join(' '));
  const ctr = await s.$$eval('.tag', (ts) => ts.map((t) => { const r = t.getBoundingClientRect(), q = t.querySelector('b').getBoundingClientRect(); return Math.max(Math.abs(r.left + r.width / 2 - (q.left + q.width / 2)), Math.abs(r.top + r.height / 2 - (q.top + q.height / 2))); }));
  ok('⑥ 글씨 = 띠 정가운데 (가로 · 세로 어긋남 ≤ 1.5px)', ctr.every((d) => d <= 1.5), ctr.map((d) => d.toFixed(1)).join(','));
  await s.screenshot({ path: `${SHOTS}/tag72-first.png` });
  await s.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('citadel-campvis-')) localStorage.setItem(k, '3'); });
  await s.reload(); await s.waitForTimeout(4000); await close(); x = await st();
  ok('② 4번째부터 · 할 일 없음 = 이름표 0', x.tags.length === 0, x.tags.join(' '));
  await s.screenshot({ path: `${SHOTS}/tag72-none.png` });
  await s.$eval('[data-prop="mail"]', (e) => { const r = e.getBoundingClientRect(); e.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); });
  await s.waitForTimeout(250); x = await st();
  ok('⑤ 누르면 그 이름표 잠깐 (0.8초)', x.tags.some((t) => /^mail:우편함/.test(t)), x.tags.join(' '));
  await s.waitForTimeout(1500); await s.keyboard.press('Escape'); await s.evaluate(() => sessionStorage.clear());
  await rest('records/1-3/3/set-02', 'PUT', { at: 1, no: 2, mons: { r0: 'o', m1: 'x', s1: 'o', m2: '-', m3: 'o', m4: 'o', s2: 'o' }, bossM: 'oo' });
  await rest('school/last/1-3', 'PUT', { lesson: 'set-02', no: 2, at: 1, done: true, code: '111111' });
  await s.reload(); await s.waitForTimeout(4500); await close(); x = await st();
  ok('③ 복습 있음 = 「허수아비」 금빛 + 숫자 · 💎+k 칩 · 나머지 숨김', x.tags.length === 1 && /^scare★:허수아비\d+$/.test(x.tags[0]) && /^💎\+\d+$/.test(x.gems[0] || ''), `${x.tags.join(' ')} ${x.gems.join(' ')}`);
  await s.screenshot({ path: `${SHOTS}/tag72-review.png` });
  await rest('school/board/posts/pT1', 'PUT', { pid: 'pT1', lesson: 'set-02', no: 2, at: Date.now(), host: 'other', phase: 'wait', mem: { other: { uid: 'other', cls: '1-4', num: 7, nick: '친구', hero: 1, role: 'c', why: '', at: Date.now() } } });
  await s.waitForTimeout(2500); x = await st();
  ok('④ 모집 중 = 「게시판」 + 1/4', x.tags.some((t) => /^dummy★:게시판1\/4$/.test(t)), x.tags.join(' '));
  await s.waitForTimeout(700); await s.screenshot({ path: `${SHOTS}/tag72-recruit.png` });
  await rest('school/board/posts/pT1', 'DELETE');
  // ⑦ 교사 「나」 캠프 = 늘 보임
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto('http://localhost:4173/?role=camp&from=me&room=TG1'); await t.waitForSelector('.stage'); await t.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('citadel-campvis-')) localStorage.setItem(k, '9'); }); await t.reload(); await t.waitForSelector('.stage'); await t.waitForTimeout(2000);
  const tt = await t.$$eval('.tag', (ts) => ts.length); ok('⑦ 교사 「나」 = 이름표 늘 보임', tt >= 5, `${tt}개`);
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
