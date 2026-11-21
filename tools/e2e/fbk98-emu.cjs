// 🛠 #98 개선단 (에뮬레이터 · 새 규칙을 먼저 올림): 학생 1-3 · 3번
//   ① ⚙ → 💬 의견 보내기 → 🐞 + 글 + 사진 1장 → 서버 fbk(자동 글 · 사진 시각) · fbkph(JPEG) · fbkpub(이름 · 자동 글 없음)
//   ② 🛠 게시판 = 그 줄 · 👍 → fbkvote · ③ 같은 날 사진 2장째 = 막힘
//   ④ 교사 소식 → 🛠 의견 → 이름 · 번호 · 📷 사진 보기(그때 받음) → 💎 100 채택 → 선물 · 메시지 · 게시판 ✅ · 사진 지움
//   ⑤ 학생 캠프 = 💎 +100 · 💎 로그 fbk_{id}(칭호 「🛠 개선단」) · ⑥ 규칙: 그림 표 · 난이도 = 자기 칸만 · 남의 의견 못 읽음
//   NODE_PATH=$(npm root -g) node tools/e2e/fbk98-emu.cjs <그림 폴더>
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1', PID = 's1_3_3';
const NS = 'demo-citadel-test-default-rtdb';
(async () => {
  const rules = fs.readFileSync(path.join(__dirname, '../../firebase/database.rules.json'), 'utf8');
  const rr = await fetch(`http://127.0.0.1:9000/.settings/rules.json?ns=${NS}`, { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: rules }); if (!rr.ok) throw new Error('규칙 못 올림 ' + rr.status);
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼', 4: '시험사' } }, rosterMask: { '1-3': { 3: '시*삼', 4: '시*사' } } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e))); s.setDefaultTimeout(15000);
  await s.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); } catch { /* */ } });
  await s.goto(`${B}?${E}`); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  for (let i = 0; i < 3 && (await s.$('.sheet .x')); i++) { await s.click('.sheet .x').catch(() => {}); await s.waitForTimeout(250); }
  // ① 보내기
  await s.click('button.gear'); await s.waitForTimeout(400); await s.click('[data-k="fb-open"]'); await s.waitForSelector('[data-k="fb-kind-bug"]');
  await s.click('[data-k="fb-kind-bug"]'); await s.fill('[data-k="fb-text"]', '게시판 👍 단추를 두 번 누르면 숫자가 이상해요');
  const info = await s.textContent('[data-k="fb-info"] pre'); ok('① 🐞 자동 글 = 화면 · 판 · 기기 · 방향 · 단추', /화면:/.test(info) && /판: v/.test(info) && /단추\(최근/.test(info) && info.length <= 2048, `${info.length}자`);
  const png = await s.evaluate(() => { const c = document.createElement('canvas'); c.width = 1600; c.height = 1200; const g = c.getContext('2d'); for (let i = 0; i < 400; i++) { g.fillStyle = `hsl(${i * 9},70%,50%)`; g.fillRect((i * 37) % 1600, (i * 53) % 1200, 120, 90); } return c.toDataURL('image/png').split(',')[1]; });
  await s.setInputFiles('[data-k="fb-photo"]', { name: 'shot.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') }); await s.waitForSelector('.ph img');
  await s.screenshot({ path: `${SHOTS}/fbk98-send.png` });
  await s.click('.sheet button:text-is("보내기")'); await s.waitForSelector('[data-k="fb-done"], [data-k="fb-err"]', { timeout: 10000 }); log("보내기 결과:", await s.textContent('[data-k="fb-done"], [data-k="fb-err"]'));
  const mine = (await rest('fbk/1-3/3')) || {}, id = Object.keys(mine)[0], row = mine[id] || {};
  const ph = await rest(`fbkph/1-3/3/${id}`), pub = await rest(`fbkpub/${id}`);
  ok('① 서버 의견 = 글 · 자동 글 · 사진 시각', row.k === 'bug' && /두 번/.test(row.t) && !!row.info && row.ph > 0);
  const kb = Math.round((ph?.d || '').length * 0.75 / 1024);
  ok('① 사진 따로 = JPEG · 120KB 아래', /^data:image\/jpeg/.test(ph?.d || '') && kb > 5 && kb < 120, `${kb}KB`);
  ok('① 게시판 줄 = 이름 · 자동 글 · 사진 없음', !!pub && Object.keys(pub).sort().join(',') === 'at,k,t', Object.keys(pub || {}).join(','));
  // ② 게시판 👍
  await s.click('[data-k="fb-tab-board"]'); await s.waitForSelector('[data-k="fb-up"]'); await s.click('[data-k="fb-up"]'); await s.waitForTimeout(800);
  ok('② 게시판 👍 = fbkvote', (await rest(`fbkvote/${id}/${PID}`)) === true);
  await s.screenshot({ path: `${SHOTS}/fbk98-board.png` });
  // ③ 사진 2장째
  await s.click('[data-k="fb-tab-send"]'); await s.click('[data-k="fb-kind-bug"]'); await s.waitForTimeout(200);
  ok('③ 같은 날 사진 2장째 = 막힘', await s.$eval('[data-k="fb-photo"]', (x) => x.disabled));
  await s.click('.sheet .x'); await s.waitForTimeout(300); if (await s.$('.sheet .x')) { await s.click('.sheet .x'); await s.waitForTimeout(300); } // 💬 닫기 = ⚙ 설정으로 → 그것도 닫음
  // ⑥ 규칙
  await rest('fbk/1-3/4/x1', 'PUT', { k: 'idea', t: '남의 의견', at: Date.now() }); await rest('fbkph/1-3/4/x1', 'PUT', { d: 'data:image/jpeg;base64,AA', at: Date.now() });
  const r6 = await s.evaluate(async (pid) => { const S = window.__ds.S, t = (p, v) => S.trySet(p, v); return { art: await t(`artvote/hero_3/${pid}`, -1), artOther: await t('artvote/hero_3/s1_3_4', 1), diff: await t(`diff/set-06/m1/${pid}`, 3), diffBad: await t(`diff/set-06/m1/${pid}`, 7), read: await S.fetch('fbk/1-3/4').then((v) => (v ? 'ok' : 'deny'), () => 'deny'), readPh: await S.fetch('fbkph/1-3/4').then((v) => (v ? 'ok' : 'deny'), () => 'deny') }; }, PID);
  ok('⑥ 규칙: 그림 · 난이도 = 자기 칸만 · 범위 밖 값 막힘 · 남의 의견 · 사진 못 읽음', r6.art && !r6.artOther && r6.diff && !r6.diffBad && r6.read === 'deny' && r6.readPh === 'deny', JSON.stringify(r6));
  const gem = () => s.evaluate(() => Number(document.querySelector('[data-k="wallet-gem"]')?.textContent?.replace(/\D/g, '')) || 0);
  const g0 = await gem();
  // ④ 교사
  const tp = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); tp.on('pageerror', (e) => errs.push('교사 ' + String(e)));
  await tp.goto(`${B}?role=teacher&${E}`); await tp.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(tp, '.tabs');
  await tp.click('.tabs button:has-text("소식")'); await tp.waitForTimeout(400); await tp.click('[data-k="news-fbk"]'); await tp.waitForSelector('[data-k="tfb-item"]:has-text("시험삼")', { timeout: 10000 });
  const head = await tp.textContent('[data-k="tfb-item"]:has-text("시험삼") .tx b'); ok('④ 교사 = 이름 · 번호 보임', /1-3반 3번 시험삼/.test(head), head);
  await tp.click('[data-k="tfb-item"]:has-text("시험삼") .hd'); await tp.waitForTimeout(300);
  ok('④ 사진은 누르기 전엔 안 받음', !(await tp.$('[data-k="tfb-item"]:has-text("시험삼") img.pic')));
  await tp.click('[data-k="tfb-item"]:has-text("시험삼") [data-k="tfb-photo"]'); await tp.waitForSelector('[data-k="tfb-item"]:has-text("시험삼") img.pic', { timeout: 8000 }); ok('④ 📷 사진 보기 = 그때 받아 보임', true);
  await tp.click('[data-k="tfb-item"]:has-text("시험삼") .gems button:text-is("100")'); await tp.screenshot({ path: `${SHOTS}/fbk98-teacher.png` });
  await tp.click('[data-k="tfb-item"]:has-text("시험삼") [data-k="tfb-adopt"]'); await tp.waitForTimeout(1200);
  const gift = await rest(`gifts/${PID}/fbk_${id}m`), mail = await rest(`mail/${PID}/fbk_${id}`);
  ok('④ 채택 = 💎 100 선물 + 메시지 · 게시판 ✅ · 사진 지움', gift?.g === 100 && mail?.g === 100 && (await rest(`fbkpub/${id}/ad`)) === true && (await rest(`fbkph/1-3/3/${id}`)) === null);
  // ⑤ 학생 받기
  let g1 = await gem(); for (let i = 0; i < 20 && g1 === g0; i++) { await s.waitForTimeout(500); g1 = await gem(); }
  ok('⑤ 학생 💎 +100', g1 - g0 === 100, `${g0} → ${g1}`);
  ok('⑤ 💎 로그 fbk_ (칭호 「🛠 개선단」 근거)', !!(await rest(`gem/1-3/3/log/fbk_${id}`)));
  await s.click('button.gear'); await s.click('[data-k="fb-board-open"]'); await s.waitForSelector('[data-k="fb-board"]'); await s.waitForTimeout(400);
  ok('⑤ 게시판 「✅ 채택」 표시', /채택/.test(await s.textContent('[data-k="fb-board"]')));
  await s.screenshot({ path: `${SHOTS}/fbk98-adopted.png` });
  await b.close(); log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
