// 🧙 #93 게시판에서 용사 바꾸기 (📜 선생님 「추천대로」) · 에뮬레이터 · 고른 차시 카드 → HeroPick · 잠긴 칸 · 고르면 출전 용사 · 모집 글 mem 갱신
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
  const A = await open(); await signup(A, CLS, 1); await board(A);
  await A.click('[data-map="6"]'); await wait(300);
  const h0 = await rest(`accounts/${CLS}/1/hero`);
  ok("고른 차시 카드 위 「🧙 지금 용사 ›」 칩", !!(await A.$("[data-k=\"board-hero\"]")));
  await A.click('[data-k="board-hero"]'); await A.waitForSelector('[data-k="atb-pick"]', { timeout: 5000 }).catch(() => {});
  const cells = await A.$$eval('[data-k="atb-pick"] .cell', (x) => x.map((e) => ({ id: Number(e.getAttribute('data-id')), lock: e.classList.contains('lock'), weak: !!e.querySelector('.wk') })));
  ok('창 = 용사 격자 · 못 가진 칸 잠김 · 약점 리본', cells.length > 5 && cells.some((c) => c.lock) && cells.some((c) => !c.lock), `칸 ${cells.length} · 잠김 ${cells.filter((c) => c.lock).length} · 약점 ${cells.filter((c) => c.weak).length}`);
  const other = cells.find((c) => !c.lock && c.id !== h0);
  if (other) { await A.click(`[data-k="atb-pick"] .cell[data-id="${other.id}"]`); await A.click('[data-k="atb-pick"] button:has-text("이 용사로")'); await wait(1500); }
  const h1 = await rest(`accounts/${CLS}/1/hero`);
  ok('고르면 캠프 출전 용사도 바뀜 (서버 accounts/…/hero)', !!other && h1 === other.id, `${h0} → ${h1}`);
  // 팀 모집 글에 들어간 뒤 바꾸기 = 글 mem 용사 · g 갱신
  await A.click('[data-k="board-post"]'); await wait(2000);
  const pid = Object.keys((await rest('school/board/posts')) || {})[0];
  const back = cells.find((c) => !c.lock && c.id !== h1);
  ok('모집 대기실에도 「🧙 용사 바꾸기」', !!(await A.$('[data-k="room-hero"]')));
  if (await A.$('[data-k="room-hero"]')) { await A.click('[data-k="room-hero"]'); await A.waitForSelector('[data-k="atb-pick"]', { timeout: 5000 }).catch(() => {}); if (back) { await A.click(`[data-k="atb-pick"] .cell[data-id="${back.id}"]`); await A.click('[data-k="atb-pick"] button:has-text("이 용사로")'); await wait(1500); } }
  const mem = pid ? await rest(`school/board/posts/${pid}/mem`) : null, me = mem && Object.values(mem)[0];
  ok('모집 글 안에서 바꾸기 = 글 mem 용사 · 판 값(g.h) 갱신', !!me && !!back && me.g?.h === back.id, me ? `g.h ${me.g?.h} · hero ${me.hero}` : '글 없음');
  await A.screenshot({ path: `${SHOTS}/b93.png` });
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
