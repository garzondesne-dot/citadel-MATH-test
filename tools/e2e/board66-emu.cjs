// 🗺 #66 게시판 탭 3 (출정 · 기사단 · 기록) · 칩 줄 없음 · 고른 차시 카드 · 단추 둘 · 16 · 17 칸 (에뮬레이터)
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
  const open = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); await p.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); } catch { /* */ } }); /* #69 조우 · 정찰 건너뜀 (e2e) */ p.on('pageerror', (e) => errs.push(String(e))); await p.goto(`${B}?${E}`); return p; };
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
  const A = await open(); await signup(A, CLS, 1); await board(A);
  const tabs = await A.$$eval('.btabs button', (x) => x.map((e) => e.textContent.trim())); ok('탭 3 = 출정 · 기사단 · 기록', tabs.join('|') === '🗺 출정|🏆 기사단|📜 기록', tabs.join('|'));
  ok('차시 칩 줄 없음', !(await A.$('.bd > .chips')));
  ok('출정 = 토벌 주간 띠', !!(await A.$('[data-k="war-chip"]')), ((await A.textContent('[data-k="war-chip"]').catch(() => '')) || '').trim());
  const pick0 = await A.$eval('[data-k="board-pick"]', (e) => ({ no: e.getAttribute('data-no'), t: e.textContent.replace(/\s+/g, ' ').trim() })).catch(() => null);
  ok('처음 고른 칸 = 진도 맨 끝(6차시) · 카드 = 보스 · ⭐ · 의뢰문', pick0?.no === '6' && /청록 드래곤/.test(pick0.t) && /0\/3/.test(pick0.t), pick0?.t);
  const btns = await A.$$eval('.bd .act button', (x) => x.map((e) => e.textContent.trim())); ok('단추 = 「⚔ 6차시 혼자 도전」 · 「👥 6차시 팀 모집」', btns.some((t) => /6차시 혼자 도전/.test(t)) && btns.some((t) => /6차시 팀 모집/.test(t)), btns.join(' | '));
  const pins = await A.$$eval('[data-map]', (x) => x.map((e) => e.getAttribute('data-map'))); ok('지도 칸 = 이 서버 팩 차시마다 하나', pins.length > 0 && new Set(pins).size === pins.length, pins.join(','));
  await A.screenshot({ path: `${SHOTS}/b66-go.png` });
  await A.click('[data-map="4"]'); await wait(300);
  const p4 = await A.$eval('[data-k="board-pick"]', (e) => e.getAttribute('data-no')); ok('칸 누르면 고름 → 4차시', p4 === '4');
  await A.click('[data-k="war-chip"]'); await wait(400); ok('띠 누르면 기사단 탭', !!(await A.$('[data-k="war-bar"]')) && !(await A.$('[data-k="board-map"]')));
  await A.screenshot({ path: `${SHOTS}/b66-war.png` });
  await A.click('[data-btab="rec"]'); await wait(400); ok('기록 탭 = ⭐ · 명성 · 내 기록', !!(await A.$('[data-k="board-rec"]')) && !!(await A.$('[data-k="board-rank-open"]')));
  await A.screenshot({ path: `${SHOTS}/b66-rec.png` });
  await A.reload(); await wait(2500); await board(A); const p5 = await A.$eval('[data-k="board-pick"]', (e) => e.getAttribute('data-no')).catch(() => ''); ok('다시 열면 지난번 고른 차시(4)', p5 === '4', p5);
  const ov = await A.evaluate(() => document.documentElement.scrollWidth > window.innerWidth); ok('가로 넘침 없음', !ov);
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
