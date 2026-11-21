// ⚔ #51 기사단 토벌 주간 — 에뮬레이터: 공적 넣기 → 게시판 맨 위 막대(우리 반 강조) · 캠프 한 줄
//   NODE_PATH=$(npm root -g) node tools/e2e/war51.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb';
const rest = (path, method = 'GET', body) => fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const KST = 9 * 3600e3, wk = (t) => { const k = new Date(t + KST), d = (k.getUTCDay() + 6) % 7; return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - d * 864e5).toISOString().slice(0, 10); };
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const w = wk(Date.now()), pw = new Date(Date.parse(`${w}T00:00:00Z`) - 7 * 864e5).toISOString().slice(0, 10);
  await rest(`classWar/${w}/sum`, 'PUT', { '1-1': 120, '1-2': 340, '1-3': 260, '1-4': 40 });
  await rest(`classWar/${pw}/done`, 'PUT', { at: 1, rank: ['1-3', '1-2'], paid: false });
  await rest('school/last/1-3', 'PUT', { lesson: 'set-06', no: 6, at: Date.now(), done: true, code: 'x' });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${B}?${E}`); await p.waitForSelector('select'); await p.selectOption('select >> nth=0', '1-3'); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', '5'); await p.waitForTimeout(200);
  await p.click('.links button:has-text("가입")'); await p.click('button.pw >> nth=0'); for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
  await p.waitForTimeout(150); if (await p.$('.pad')) for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
  await p.click('.title .pmain'); await p.waitForTimeout(2500); if (await p.$('text=첫 용사 고르기')) { await p.click('button:has-text("시작")'); await p.waitForTimeout(800); }
  await p.waitForSelector('[data-k="war-line"]', { timeout: 10000 }).catch(() => {});
  const line = (await p.textContent('[data-k="war-line"]').catch(() => '')) || '';
  ok('캠프 한 줄 = 왕의 깃발 + 우리 반 순위', /황금 곰단/.test(line) && /2위/.test(line), line.trim());
  await p.screenshot({ path: `${SHOTS}/war51-camp.png` });
  await p.click('button[aria-label="게시판"]'); await p.waitForSelector('[data-k="war-bar"]', { timeout: 10000 }).catch(() => {});
  const rows = await p.$$eval('[data-k="war-bar"] .row', (rs) => rs.map((r) => `${r.getAttribute('data-war')}:${r.classList.contains('me') ? '*' : ''}${r.querySelector('.pt')?.textContent}`));
  ok('게시판 막대 = 5 기사단 · 순서 · 우리 반 강조', rows.join(',') === '1-2:340,1-3:*260,1-1:120,1-4:40,1-5:0', rows.join(','));
  await p.screenshot({ path: `${SHOTS}/war51-board.png` });
  await rest(`classWar/${w}/sum/1-3`, 'PUT', 400); await p.waitForTimeout(1500);
  const top = await p.$eval('[data-k="war-bar"] .row', (r) => r.getAttribute('data-war')).catch(() => '');
  ok('실시간 = 공적 바뀌면 순위 바로 바뀜', top === '1-3', top);
  // 종합실 대기 한 줄 = 종합실 키 입장 뒤라 여기선 안 봄 (TV.svelte entry 화면에 같은 WarBar line)
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
