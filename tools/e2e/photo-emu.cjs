// 📷 서술형 사진 채점 (에뮬레이터 · 가짜 중계소 · b201): 정식 photo.js 옮김
//   ① 교사 「나」 → 📷 사진 채점 설정 = 주소 · 켜기 저장 → gcfg/photo · 기준표 표
//   ② 🏰 2층 q07(보통 방 · 답은 맞힘) → 📷 풀이 사진 올리기 → 🧹 빈 종이 = 막힘(장 수 그대로 · 중계소 안 감) → 사진 → ✏ 2/4 재도전 → 고쳐서 다시 → 🎉 4/4 통과 → 처치 · 💎 · 📜 +3(처음 · 만점 · 점수 오름) · EXP
//   ③ 🏰 1층 q07(소레이드 · 처치함) → ✍ 서술형 도전 → ⏳ 선생님 확인 → 교사 대시보드 「서술형」 ✔ 처치 인정 → 학생 성채 다시 = 📷 보너스
//   중계소에 보낸 글 = idToken · 반 · 번호 · 차시 · 방 · 문제 · 사진(JPEG base64) — 사진은 어디에도 저장 안 됨
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1', DIR = path.join(__dirname, '../pack-upload/castle');
const URL = 'https://script.google.com/macros/s/FAKE-relay/exec';
// 시험 사진 3장 (흰 종이 + 글씨 줄 · 빈 종이)
const img = (f, lines, seed, half = 0) => { execFileSync('python3', ['-c', `
from PIL import Image, ImageDraw
import random
random.seed(${seed}); im = Image.new('RGB', (900, 1200), (246, 244, 238)); d = ImageDraw.Draw(im)
if ${half}:
  for x in range(900): d.line([(x, 0), (x, 1199)], fill=((250 - x // 18) if ${half} == 1 else (215 if (x // 100) % 2 else 250),) * 3)
for i in range(${lines}):
  y = 120 + i * 70; x = 80
  while x < (420 if ${half} else 780):
    w = random.randint(20, 60); d.line([(x, y + random.randint(-6, 6)), (x + w, y + random.randint(-6, 6))], fill=(30, 30, 40), width=(22 if ${half} else 5)); x += w + random.randint(10, 30)
im.save('${f}')`]); return f; };
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const P1 = JSON.parse(fs.readFileSync(path.join(DIR, 'eval-1.json'), 'utf8')), P2 = JSON.parse(fs.readFileSync(path.join(DIR, 'eval-2.json'), 'utf8'));
  const R = require('../../src/subjects/common-math2/rubrics.json');
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } }, prep: { addons: { castle: { [P1.id]: P1, [P2.id]: P2 } } },
    school: { castleOpen: { 'eval-1': { '1-3': { q07: true } }, 'eval-2': { '1-3': { q07: true } } } },
    photo_rubric: { 'eval-1': { q07: { ...R['eval-1'].q07, on: true } }, 'eval-2': { q07: { ...R['eval-2'].q07, on: true } } } });
  const tmp = fs.mkdtempSync('/tmp/ph-'), I1 = img(`${tmp}/a.png`, 9, 1), I2 = img(`${tmp}/b.png`, 14, 2, 1), I0 = img(`${tmp}/blank.png`, 0, 3), I3 = img(`${tmp}/c.png`, 10, 4, 2);
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  // ── 교사 = 설정 ──
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('.tabs button:has-text("나")'); await t.click('[data-k="photo-set-go"]'); await t.waitForSelector('[data-k="photo-set"]');
  await t.fill('[data-k="ph-url"]', URL); await t.check('[data-k="ph-on"]'); await t.fill('[data-k="photo-set"] .lim label:nth-child(3) input', '0'); await t.click('[data-k="ph-save"]'); await t.waitForTimeout(800);
  const cfg = await rest('gcfg/photo'); log('① 교사 설정 저장 →', JSON.stringify(cfg), '| 기준표 줄', (await t.$$('[data-rub]')).length);
  if (!cfg || cfg.url !== URL || cfg.on !== true || cfg.cool !== 0 || cfg.daily !== 6) errs.push('설정 저장');
  await t.screenshot({ path: `${SHOTS}/photo-set.png` });
  await t.click('.sheet .x');
  // ── 학생 ──
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e))); s.setDefaultTimeout(15000);
  const sent = []; let plan = [];
  await s.route('https://script.google.com/**', async (r) => { const body = JSON.parse(r.request().postData() || '{}'); sent.push(body); const res = plan.shift() || { ok: false, err: 'api' }; if (res.ok && res.id) await rest(`photo/${body.c}/${body.n}/${body.lesson}_${body.room}/${res.id}`, 'PUT', { status: res.status, score: res.score, total: res.total, pass: res.pass, conf: res.status === 'check' ? 'low' : 'high', at: Date.now(), ask: String(body.ask || '').slice(0, 80), right: String(body.answer || ''), ans: '-', fb: res.feedback || '', steps: res.steps || {} }); /* 중계소가 결과 줄을 먼저 씀 (정식) */ await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(res) }); });
  await s.goto(`${B}?${E}`); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  // 2층 q07 = 답은 이미 맞힘 (그 숫자 그대로 사진 단계)
  const q = P2.rooms.find((r) => r.id === 'q07').vers[0];
  await rest('bonus/1-3/3/eval-2/q07', 'PUT', { tries: 1, runs: 1, at: 1, ans: { items: q.map((x) => ({ question: x.q, answer: x.a, solution: x.sol || '', check: {} })) } }); // 팩 원문 q · a · sol (앱은 풀린 문항에서 만듦)
  await rest('bonus/1-3/3/eval-1/q07', 'PUT', { tries: 1, runs: 1, at: 1, clear: true });
  const g0 = Number(await rest('gem/1-3/3/total')) || 0, sc0 = Number(await rest('gem/1-3/3/scroll')) || 0;
  const castle = async (floor) => { await s.click('button[aria-label="성채"]'); await s.waitForTimeout(500); await s.click('.sheet button:has-text("성채 들어가기")'); await s.waitForSelector('[data-k="castle"]'); if (await s.$(`[data-k="castle"] [data-floor="${floor}"]`)) { await s.click(`[data-floor="${floor}"]`); await s.click('[data-k="castle"] button.pmain'); } await s.waitForSelector('[data-k="castle"] [data-room]'); };
  await castle('eval-2');
  const line = async (r) => (await s.$eval(`[data-room="${r}"]`, (x) => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => ''));
  log('② 2층 q07 줄:', await line('q07')); if (!(await line('q07')).includes('📷 풀이 사진 올리기')) errs.push('사진 단계 줄');
  await s.click('[data-room="q07"]'); await s.click('[data-k="castle"] button.pmain'); await s.waitForSelector('[data-k="photo-sheet"]');
  await s.screenshot({ path: `${SHOTS}/photo-intro.png` });
  const up = async (f) => { await s.setInputFiles('input.hide[type=file]', f); await s.waitForSelector('[data-k="photo-sheet"][data-view="edit"]'); await s.waitForTimeout(300); };
  await up(I0); await s.click('.sheet button:has-text("채점 받기")'); await s.waitForTimeout(400);
  const pre = await s.textContent('[data-k="photo-pre"]').catch(() => ''); log('   🧹 빈 종이 →', pre.trim(), '| 중계소', sent.length); if (!pre.includes('글씨가 거의') || sent.length) errs.push('1차 거르기');
  await s.click('.tools button:has-text("다시 찍기")').catch(() => {}); await up(I1); await s.screenshot({ path: `${SHOTS}/photo-crop.png` });
  plan = [{ ok: true, status: 'retry', score: 2, total: 4, pass: 3, id: 'r1', left: 5, roomLeft: 1, cool: 0, feedback: '조건을 한 줄 더 써 봐요', steps: { a: { id: 'a', pts: 1, earned: 1, note: '집합을 바르게 썼어요' }, b: { id: 'b', pts: 1, earned: 1, note: '포함 관계 맞음' }, c: { id: 'c', pts: 1, earned: 0, note: '원소의 개수 식이 빠졌어요' }, d: { id: 'd', pts: 1, earned: 0, note: '답을 써요' } } }];
  await s.click('.sheet button:has-text("채점 받기")'); await s.waitForSelector('[data-k="photo-sheet"][data-view="retry"]', { timeout: 10000 }); await s.waitForTimeout(2400);
  const b0 = sent[0] || {}; log('   보낸 글: 반', b0.c, '번호', b0.n, '차시', b0.lesson, '방', b0.room, '| idToken', b0.idToken ? '있음' : '✗', '| 사진', b0.media, Math.round(String(b0.image || '').length / 1024), 'KB | 문제', String(b0.ask || '').slice(0, 30));
  if (b0.c !== '1-3' || b0.n !== 3 || b0.lesson !== 'eval-2' || b0.room !== 'q07' || !b0.idToken || b0.media !== 'image/jpeg' || String(b0.image || '').length < 2000 || !/역이 참/.test(b0.ask || '') || /풀이는 학습지에|^07/.test(b0.ask || '') || b0.answer !== '3') errs.push('보낸 글');
  log('   ✏ 재도전 점수', (await s.textContent('[data-k="photo-score"]')).trim()); await s.screenshot({ path: `${SHOTS}/photo-retry.png` });
  await s.click('.sheet button:has-text("고쳐서 다시 찍기")'); await up(I2);
  plan = [{ ok: true, status: 'pass', score: 4, total: 4, pass: 3, id: 'p1', left: 4, roomLeft: 0, cool: 0, feedback: '완벽해요', steps: { a: { id: 'a', pts: 1, earned: 1, note: '집합 ✔' }, b: { id: 'b', pts: 1, earned: 1, note: '포함 ✔' }, c: { id: 'c', pts: 1, earned: 1, note: '식 ✔' }, d: { id: 'd', pts: 1, earned: 1, note: '답 ✔' } } }];
  const pre2 = await s.click('.sheet button:has-text("채점 받기")').then(() => s.waitForTimeout(400)).then(() => s.textContent('[data-k="photo-pre"]').catch(() => '')); if (pre2) log('   ⚠ 두 번째 사진 거름:', pre2); await s.waitForSelector('[data-k="photo-sheet"][data-view="pass"]', { timeout: 10000 }); await s.waitForTimeout(2600);
  await s.screenshot({ path: `${SHOTS}/photo-pass.png` });
  await s.click('.sheet button:has-text("처치하러")'); await s.waitForSelector('[data-k="castle-res"]'); await s.waitForTimeout(1200);
  const got = await s.$$eval('[data-k="castle-got"] li', (x) => x.map((e) => e.textContent.trim())).catch(() => []);
  const rec2 = await rest('bonus/1-3/3/eval-2/q07'), g1 = Number(await rest('gem/1-3/3/total')) || 0, sc1 = Number(await rest('gem/1-3/3/scroll')) || 0;
  log('   🎉 통과 → 받은 것', JSON.stringify(got), '| 기록 clear', rec2 && rec2.clear, 'ph', rec2 && rec2.ph, 'ans 지움', !(rec2 && rec2.ans), '| 💎', g0, '→', g1, '| 📜', sc0, '→', sc1);
  if (!rec2 || rec2.clear !== true || rec2.ph !== 'p1' || rec2.ans || sc1 - sc0 !== 3 || g1 <= g0) errs.push('통과 기록 · 보상');
  await s.screenshot({ path: `${SHOTS}/photo-castle-win.png` });
  for (let i = 0; i < 4 && (await s.$('[data-k="castle"]')); i++) { await s.click('[data-k="castle"] .back'); await s.waitForTimeout(300); }
  // ③ 1층 q07 (소레이드 · 처치함) → ✍ 보너스 → ⏳ 선생님 확인
  await castle('eval-1'); log('③ 1층 q07 줄:', await line('q07'));
  await s.click('[data-room="q07"]'); await s.click('[data-k="castle"] button.pmain'); await s.waitForSelector('[data-k="photo-sheet"]');
  await up(I3);
  plan = [{ ok: true, status: 'check', score: 2, total: 4, pass: 3, id: 'c1', left: 3, roomLeft: 1, cool: 0, feedback: '글씨가 흐려요', steps: {} }];
  await s.click('.sheet button:has-text("채점 받기")'); await s.waitForSelector('[data-k="photo-sheet"][data-view="check"]', { timeout: 10000 }).catch(async (e) => { log('   ✗ 상태', await s.$eval('[data-k="photo-sheet"]', (x) => x.dataset.view + ' | ' + x.textContent.slice(0, 200)).catch(() => '시트 없음'), '| 요청', sent.length); await s.screenshot({ path: `${SHOTS}/photo-fail.png` }); throw e; }); await s.screenshot({ path: `${SHOTS}/photo-check.png` });
  await s.click('.sheet button:has-text("알겠어요")'); await s.waitForTimeout(800);
  const rec1 = await rest('bonus/1-3/3/eval-1/q07'); log('   ⏳ 기록 pend', rec1 && rec1.pend, '| 줄', await line('q07')); if (!rec1 || rec1.pend !== 'c1') errs.push('확인 기다림');
  // 교사 대시보드 「서술형」 ✔ (결과 줄 = 가짜 중계소가 씀)
  await t.click('.tabs button:has-text("학생")'); await t.waitForTimeout(400); await t.click('.chips button:text-is("1-3")').catch(() => {}); await t.waitForTimeout(300);
  await t.click('.seg button:has-text("대시보드")'); await t.waitForTimeout(500);
  await t.click('.grp button:has-text("수업")').catch(() => {}); await t.click('.vws button:has-text("서술형")').catch(async () => { for (const g of await t.$$('.grp button')) { await g.click(); if (await t.$('.vws button:has-text("서술형")')) { await t.click('.vws button:has-text("서술형")'); break; } } });
  await t.waitForSelector('[data-k="photo-board"]'); await t.waitForTimeout(500);
  log('   교사 서술형 확인할 것:', (await t.textContent('[data-pf="need"]')).trim()); await t.screenshot({ path: `${SHOTS}/photo-board.png`, fullPage: true });
  await t.click('[data-photo="c1"] [data-ok="1"]'); await t.waitForTimeout(800);
  const okv = await rest('photo/1-3/3/eval-1_q07/c1/ok'); log('   ✔ 처치 인정 → ok', okv); if (okv !== true) errs.push('교사 인정');
  // 학생 성채 다시 → 📷 보너스
  for (let i = 0; i < 4 && (await s.$('[data-k="castle"]')); i++) { await s.click('[data-k="castle"] .back'); await s.waitForTimeout(300); }
  await castle('eval-1'); await s.waitForTimeout(1500);
  const rec1b = await rest('bonus/1-3/3/eval-1/q07'), sc2 = Number(await rest('gem/1-3/3/scroll')) || 0;
  log('   학생 다시 들어옴 → ph', rec1b && rec1b.ph, 'pend', rec1b && rec1b.pend, '| 📜', sc1, '→', sc2, '| 줄', await line('q07'));
  if (!rec1b || !rec1b.ph || rec1b.pend || sc2 - sc1 !== 1) errs.push('인정 뒤 보너스');
  await s.screenshot({ path: `${SHOTS}/photo-after-ok.png` });
  log(`중계소 요청 ${sent.length}번 (빈 종이 · 같은 사진은 안 감)`);
  fs.rmSync(tmp, { recursive: true, force: true });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
