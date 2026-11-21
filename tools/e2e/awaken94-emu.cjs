// ⚡ #94 각성 해금 연출 (📜 선생님 「각성 용사 해금 시 각성 해금 연출 보여 줘!」) · 에뮬레이터 · 로안 4칸 채움 → 캠프 연출 · 건너뛰기 · 확인 · 기록 · 한 번만
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
  const A = await open(); await signup(A, CLS, 1); await wait(1500);
  ok('조건 전 = 연출 없음', !(await A.$('[data-k="awaken-pop"]')));
  // 로안 각성 4칸: 출전 0 · +10 · Ⅳ 쌍월 참(twin) 장착 · 호칭 slash10k
  await rest(`accounts/${CLS}/1`, 'PATCH', { hero: 0, socket: { 0: 'twin' }, title: 'slash10k' }); await rest(`gem/${CLS}/1`, 'PATCH', { enh: 10 });
  await A.reload(); await A.waitForTimeout(4000);
  ok('⚡ 조건이 다 채워짐 = 각성 해금 연출이 뜸', !!(await A.$('[data-k="awaken-pop"]')));
  await A.screenshot({ path: `${SHOTS}/awk94-a.png` });
  if (await A.$('[data-k="awaken-skip"]')) await A.click('[data-k="awaken-skip"]');
  await wait(400);
  const txt = (await A.textContent('[data-k="awaken-text"]').catch(() => '')) || '';
  ok('건너뛰기 = 마지막 장면 「⚡ 각성 해금!」 · 「각성한 로안 · 「칭호」」 · 각성 필살기 이름', /각성 해금/.test(txt) && /각성한/.test(txt) && /각성 필살기/.test(txt), txt.replace(/\s+/g, ' ').trim());
  await A.screenshot({ path: `${SHOTS}/awk94-b.png` });
  await A.click('[data-k="awaken-ok"]'); await wait(1500);
  const seen = await rest(`accounts/${CLS}/1/awk/0`);
  ok('「확인」 = 닫힘 · 기록 칸(accounts/…/awk/0)', !(await A.$('[data-k="awaken-pop"]')) && typeof seen === 'number', String(seen));
  await A.reload(); await A.waitForTimeout(4000);
  ok('한 번만 = 다시 열어도 안 뜸', !(await A.$('[data-k="awaken-pop"]')));
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
