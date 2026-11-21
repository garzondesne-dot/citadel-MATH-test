// 📜 게시판 💎 하루 200 (선생님 2026-11-21 · DECISIONS 「게시판 💎 하루 200」) · 에뮬레이터 · 혼자 판 1 · 지급 스위치 켬 · 오늘 게시판 195 받은 뒤 한 판 = 5 만 · 문구
// (옛 머리) · 에뮬레이터 폰 3대 + 봇 1 (손발 #1 몫: 출발 · 화면 잇기 · 판 끝 기록 · ⭐ · 반 공적)
//   A 🔒 모집 → B · C 합류 · 준비 → A 출발 → 세 폰 모두 AtbNet(같은 meta · 4칸 · 봇 1) → 방장 엔진 보스 0 → 결과 → 「게시판으로」
//   → 서버: bonus/1-3/{n}/board 한 줄씩 · boardStar · classWar 반 합 = 세 명 공적 합 · 글 done
//   NODE_PATH=$(npm root -g) node tools/e2e/atb48-emu.cjs <그림 폴더> [폰 수 2~4 · 기본 3] [반 · 기본 1-3 · 1-6 = 🧪 테스트 반도 새 전투 · 기록 · 공적 0 (#65-1)]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', N = Number(process.argv[3] || 3), CLS = process.argv[4] || '1-3', CK = CLS.replace('-', '_'), BETA = CLS === '1-6', B = 'http://localhost:4173/', E = 'emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb';
const rest = (path, method = 'GET', body) => fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const KST = 9 * 3600e3, wk = (t) => { const k = new Date(t + KST), d = (k.getUTCDay() + 6) % 7; return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - d * 864e5).toISOString().slice(0, 10); };
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const open = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); await p.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); localStorage.setItem('citadel-v1-board-story', '1'); } catch { /* */ } }); /* #69 조우 · 정찰 건너뜀 (e2e) */ p.on('pageerror', (e) => errs.push(String(e))); await p.goto(`${B}?${E}`); return p; };
  const signup = async (p, cls, num) => {
    await p.waitForSelector('select'); await p.selectOption('select >> nth=0', cls); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', String(num)); await p.waitForTimeout(200);
    await p.click('.links button:has-text("가입")'); await p.click('button.pw >> nth=0'); for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.waitForTimeout(150); if (await p.$('.pad')) for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.click('.title .pmain'); await p.waitForTimeout(2500); if (await p.$('text=첫 용사 고르기')) { await p.click('button:has-text("시작")'); await p.waitForTimeout(800); }
  };
  const board = async (p) => { if (!(await p.$('.bd'))) await p.click('button[aria-label="게시판"]'); await p.waitForSelector('.bd'); await p.waitForTimeout(500); };
  const rune = async (p, x) => { for (const d of x) await p.click(`.sheet .rune-keys button:has-text("${d}")`); };
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest(`school/last/${CLS}`, 'PUT', { lesson: 'set-06', no: 6, at: Date.now(), done: true, code: 'x' });
  await rest('school/war', 'PUT', { pay: true }); // 💎 지급 스위치 켬
  const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const A = await open(); await signup(A, CLS, 1);
  await rest(`gem/${CLS}/1/log/board_${day}_seed`, 'PUT', { g: 195, at: Date.now(), why: 'e2e 앞 판' }); // 오늘 게시판 195 받음
  await A.reload(); await A.waitForTimeout(3500); await board(A);
  await A.click('[data-btab="rec"]').catch(() => {}); await wait(400);
  const capLine = (await A.textContent('[data-k="board-daycap"]').catch(() => '')) || '';
  ok('기록 탭 「오늘 받을 수 있는 💎 5 / 200」', /5 \/ 200/.test(capLine), capLine.trim());
  await A.click('[data-btab="go"]').catch(() => {}); await wait(300);
  await A.click('[data-map="6"]'); await A.click('button:has-text("6차시 혼자 도전")');
  await A.waitForSelector('[data-k="atb-stage"]', { timeout: 25000 }).catch(() => {});
  for (let i = 0; i < 6; i++) { await A.evaluate(() => globalThis.__atb?.solve?.()); await wait(500); }
  await A.evaluate(() => globalThis.__atb?.win?.()); /* 📡 손발 #2 시험 고리 = 실드 칸 깸 · HP 0 · 엔진 끝 판정 */
  await A.waitForSelector('[data-k="atb-to-board"]', { timeout: 60000 }).catch(() => {});
  await A.click('[data-k="atb-to-board"]').catch(() => {});
  let toast = ''; for (let i = 0; i < 20 && !/다 받았어요/.test(toast); i++) { await wait(150); toast = (await A.textContent('body').catch(() => '')) || ''; }
  await wait(2000);
  const log = (await rest(`gem/${CLS}/1/log`)) || {};
  const today = Object.entries(log).filter(([k]) => k.startsWith(`board_${day}_`)).reduce((a, [, v]) => a + (v.g || 0), 0);
  ok('📜 게시판 하루 200: 195 + 이번 판 = 정확히 200 (넘친 몫 안 받음)', today === 200, `오늘 게시판 💎 ${today}`);
  ok('결과 뒤 한 줄 「오늘 받을 💎 는 다 받았어요 · 공적은 계속 쌓여요」', /오늘 받을 💎 는 다 받았어요 · 공적은 계속 쌓여요/.test(toast));
  await A.click('[data-btab="rec"]').catch(() => {}); await wait(400);
  const cap2 = (await A.textContent('[data-k="board-daycap"]').catch(() => '')) || '';
  ok('기록 탭 = 「오늘 받을 💎 는 다 받았어요」', /다 받았어요/.test(cap2), cap2.trim());
  await A.screenshot({ path: `${SHOTS}/cap200.png` });
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
