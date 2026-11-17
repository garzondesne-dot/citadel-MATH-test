// 📜 #57 ✍ 실력 쓰기 · 📜 +1 (숫자 바꾼 판) — 에뮬레이터 실제 학생 로그인 (가짜 중계소)
//   ① 🎯 허수아비 9차시 문제 5: 학습지 숫자 📜 받은 뒤 = 목록 「✔ 서술형 · 실력 쓰기 가능」 + 단추 → 다시 쓰기 창(소레이드 없이 바뀐 숫자 문제)
//      → 불통과 → 같은 숫자로 다시 → 통과 = ult_set-09_m5_v · 단추 사라짐
//   ② 🏰 성채 2층 10: 서술형 통과한 방 → 카드 「다시 쓰기 가능」 → 「✍ 실력 쓰기 · 📜 +1」 → 판 1~6 숫자 → 불통과 → 같은 숫자 → 통과 = ph2 · 📜 +1
//   ③ 🏰 3층 17 (숫자 없는 증명) = 판 0 그대로 → 통과 = ph2 · 📜 +1
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const { rest, asAdmin } = require('./_emu.cjs');
const R = require('../../src/subjects/common-math2/rubrics.json'), P2 = require('../pack-upload/castle/eval-2.json'), P3 = require('../pack-upload/castle/eval-3.json');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?emu=127.0.0.1', URL = 'https://script.google.com/macros/s/FAKE-relay/exec';
const img = (f, lines, seed) => { execFileSync('python3', ['-c', `
from PIL import Image, ImageDraw
import random
random.seed(${seed}); im = Image.new('RGB', (900, 1200), (246, 244, 238)); d = ImageDraw.Draw(im)
x0, y0 = 60 + (${seed} % 3) * 230, 80 + (${seed} % 2) * 560
per = 100 + (${seed} % 6) * 50
for x in range(900): d.line([(x, 0), (x, 1199)], fill=((250 if (x // per) % 2 else 222),) * 3)  # 줄무늬 폭이 사진마다 달라 「같은 사진」 거르기에 안 걸림
for i in range(${lines} // 2):
  y = y0 + i * 70; x = x0
  while x < x0 + 300:
    w = random.randint(20, 60); d.line([(x, y + random.randint(-6, 6)), (x + w, y + random.randint(-6, 6))], fill=(30, 30, 40), width=5); x += w + random.randint(10, 30)
im.save('${f}')`]); return f; };
const RETRY = (id) => ({ ok: true, status: 'retry', score: 2, total: 4, pass: 3, id, left: 9, roomLeft: 3, cool: 0, feedback: '한 줄 더', steps: {} });
const PASS = (id) => ({ ok: true, status: 'pass', score: 4, total: 4, pass: 3, id, left: 8, roomLeft: 2, cool: 0, feedback: '좋아요', steps: {} });
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const others3 = Object.fromEntries(P3.rooms.filter((r) => !r.boss).map((r) => [r.id, { clear: true, tries: 1, at: 1 }]));
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } }, school: { features: { bundle: 'full', on: { hero: true, scarecrow: true, citadel: true } },
      castleOpen: { 'eval-2': { '1-3': { q10: true } }, 'eval-3': { '1-3': Object.fromEntries(P3.rooms.map((r) => [r.id, true])) } } },
    gcfg: { photo: { on: true, url: URL, daily: 12, room: 5, cool: 0 } },
    prep: { addons: { castle: { 'eval-2': P2, 'eval-3': P3 } } },
    photo_rubric: { 'set-09': { m5: { ...R['set-09'].m5, on: true } }, 'eval-2': { q10: { ...R['eval-2'].q10, on: true } }, 'eval-3': { q17: { ...R['eval-3'].q17, on: true } } } });
  const tmp = fs.mkdtempSync('/tmp/rw57-'), I = [1, 2, 3, 4, 5, 6].map((k) => img(`${tmp}/i${k}.png`, 8 + k, 10 + k));
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e))); s.setDefaultTimeout(15000);
  const sent = []; let plan = [];
  await s.route('https://script.google.com/**', async (r) => { const body = JSON.parse(r.request().postData() || '{}'); sent.push(body); const res = plan.shift() || { ok: false, err: 'api' }; if (res.ok && res.id) await rest(`photo/${body.c}/${body.n}/${body.lesson}_${body.room}/${res.id}`, 'PUT', { status: res.status, score: res.score, total: res.total, pass: res.pass, conf: 'high', at: Date.now(), ask: String(body.ask || '').slice(0, 80), right: String(body.answer || ''), ans: '-', fb: res.feedback, steps: {} }); await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(res) }); });
  await s.goto(B); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  const uid = 's1_3_3';
  await rest('records/1-3/3/set-09', 'PUT', { at: 1, no: 9, mons: { m1: 'o', m2: 'o', m3: 'o', m4: 'o', m5: 'o' }, bossM: 'oo' });
  await rest('school/last/1-3', 'PUT', { lesson: 'set-09', no: 9, at: 1, done: true, code: '111111' });
  await rest(`gifts/${uid}/ult_set-09_m5`, 'PUT', { g: 0, s: 1, at: 1, fun: '🌟 진필살기 서술', got: true }); // 학습지 숫자 📜 = 이미 받음
  const closeSheets = async () => { for (let k = 0; k < 4 && (await s.$('.sheet .x')); k++) { await s.$eval('.sheet .x', (e) => e.click()).catch(() => {}); await s.waitForTimeout(400); } };
  const up = async (f) => { await s.setInputFiles('input.hide[type=file]', f); await s.waitForSelector('[data-k="photo-sheet"][data-view="edit"]'); await s.waitForTimeout(300); };
  /** 다시 쓰기 창 → 📸 → 불통과 → 창 닫기 → 같은 숫자 확인 → 📸 → 통과 */
  const shootTwice = async (tag, a, bImg, idA, idB) => {
    const t0 = (await s.textContent('[data-k="rewrite"]')).replace(/\s+/g, ' ').trim();
    await s.click('.sheet button.pmain:has-text("찍어서 채점")'); await s.waitForSelector('[data-k="photo-sheet"]'); await up(a);
    plan = [RETRY(idA)]; await s.click('.sheet button:has-text("채점 받기")'); await s.waitForSelector('[data-k="photo-sheet"][data-view="retry"]', { timeout: 10000 }); await s.waitForTimeout(500);
    await s.$eval('.sheet .x', (e) => e.click()); await s.waitForSelector('[data-k="rewrite"]'); await s.waitForTimeout(300);
    const note = (await s.textContent('[data-k="rw-note"]').catch(() => '')).trim(), t1 = (await s.textContent('[data-k="rewrite"]')).replace(/\s+/g, ' ').trim();
    ok(`${tag} 불통과 → 같은 숫자 판 그대로 · 안내`, t1.includes(t0.slice(0, 60)) && /같은 숫자/.test(note), note);
    await s.screenshot({ path: `${SHOTS}/rw57-${tag}-retry.png` });
    await s.click('.sheet button.pmain:has-text("찍어서 채점")'); await s.waitForSelector('[data-k="photo-sheet"]'); await up(bImg);
    plan = [PASS(idB)]; await s.click('.sheet button:has-text("채점 받기")'); await s.waitForSelector('[data-k="photo-sheet"][data-view="pass"]', { timeout: 10000 }).catch(async (e) => { console.log('   ✗', await s.$eval('[data-k="photo-sheet"]', (x) => x.dataset.view + ' | ' + x.textContent.replace(/\s+/g, ' ').slice(0, 300)).catch(() => '?'), '| 보낸', sent.length); throw e; }); await s.waitForTimeout(800);
    await s.screenshot({ path: `${SHOTS}/rw57-${tag}-pass.png` });
    await s.click('.sheet button.pmain:has-text("받기")'); await s.waitForTimeout(1200);
    const [x, y] = sent.slice(-2);
    ok(`${tag} 두 번 보낸 문제 글 = 같음 (같은 숫자로 다시)`, !!x && !!y && x.ask === y.ask && x.room === y.room && x.lesson === y.lesson, `${x && x.lesson}_${x && x.room}`);
    return { t0, ask: y ? y.ask : '' };
  };

  // ── ① 🎯 허수아비 9차시 문제 5 ──
  await s.reload(); await s.waitForTimeout(3500); await closeSheets();
  await s.waitForSelector('[data-prop="scare"]', { timeout: 15000 }); await s.$eval('[data-prop="scare"]', (e) => e.click()); await s.waitForSelector('[data-k="dummy-list"]'); await s.waitForTimeout(500);
  const row = '[data-lesson="set-09"] li[data-mid="m5"]';
  const tg = await s.$eval(`${row} [data-k="ph-v"]`, (e) => e.textContent.trim()).catch(() => ''), bt = await s.$eval(`${row} [data-k="rw-go"]`, (e) => e.textContent.trim()).catch(() => '');
  ok('① 🎯 목록 = 「✔ 서술형 · 실력 쓰기 가능」 + 「✍ 실력 쓰기 · 📜 +1」', tg === '✔ 서술형 · 실력 쓰기 가능' && bt === '✍ 실력 쓰기 · 📜 +1', `${tg} | ${bt}`);
  ok('① 「📷 서술형 남음」 은 없음 (학습지 숫자 📜 받음)', !(await s.$(`${row} [data-k="ph-left"]`)));
  await s.$eval(row, (e) => e.scrollIntoView({ block: 'center' })); await s.screenshot({ path: `${SHOTS}/rw57-dummy-list.png` });
  await s.$eval(`${row} [data-k="rw-go"]`, (e) => e.click()); await s.waitForSelector('[data-k="rewrite"]'); await s.waitForTimeout(400);
  const dTxt = (await s.textContent('[data-k="rewrite"]')).replace(/\s+/g, ' ');
  ok('① 다시 쓰기 창 = 소레이드 없이 문제(단계 질문) · 🔁 숫자 바꾼 판 · 학습지 숫자(자연수 → 유리수) 아님', /숫자 바꾼 판/.test(dTxt) && /역은/.test(dTxt) && !/x 가 자연수이면 x 는 유리수/.test(dTxt) && !(await s.$('.drun')), dTxt.slice(0, 120));
  await s.screenshot({ path: `${SHOTS}/rw57-dummy-sheet.png` });
  const g0 = await rest(`gifts/${uid}`);
  const d1 = await shootTwice('dummy', I[0], I[1], 'dr1', 'dp1');
  const gv = await rest(`gifts/${uid}/ult_set-09_m5_v`);
  ok('① 통과 = 📜 칸 ult_set-09_m5_v (학습지 숫자 칸과 따로)', !!gv && gv.s === 1 && !g0.ult_set_09_m5_v, JSON.stringify(gv));
  ok('① 보낸 글 = 9차시 · m5 · 바뀐 숫자 · 「숫자 바꾼 판」 표시', sent[0].lesson === 'set-09' && sent[0].room === 'm5' && /숫자 바꾼 판/.test(d1.ask) && !/유리수이다/.test(d1.ask), d1.ask.slice(0, 90));
  const kill = (await s.textContent('.sheet').catch(() => '')).replace(/\s+/g, ' ');
  ok('① 결과 창 = 📜 +1', /📜 \+1/.test(kill), kill.slice(0, 100));
  await s.screenshot({ path: `${SHOTS}/rw57-dummy-done.png` });
  await s.$eval('.sheet .pmain', (e) => e.click()).catch(() => {}); await s.waitForSelector('[data-k="dummy-list"]'); await s.waitForTimeout(500);
  ok('① 받은 뒤 = 단추 · 「실력 쓰기 가능」 사라짐 · 「✔ 실력 쓰기 통과」', !(await s.$(`${row} [data-k="rw-go"]`)) && !(await s.$(`${row} [data-k="ph-v"]`)) && !!(await s.$(`${row} [data-k="ph-vok"]`)));

  // ── ② 🏰 성채 2층 10 ──
  await rest('bonus/1-3/3/eval-2/q10', 'PUT', { clear: true, ph: 'p0', tries: 1, at: 1 });
  await rest('bonus/1-3/3/eval-3', 'PUT', { ...others3, q17: { clear: true, ph: 'p0', tries: 1, at: 1 } });
  const castle = async (floor) => {
    await s.reload(); await s.waitForTimeout(3500); await closeSheets();
    await s.click('button[aria-label="성채"]'); await s.waitForTimeout(500); await s.click('.sheet button:has-text("성채 들어가기")'); await s.waitForSelector('[data-k="castle"]');
    await s.waitForSelector(`[data-floor="${floor}"]`, { timeout: 8000 }); await s.click(`[data-floor="${floor}"]`); await s.waitForSelector('[data-k="castle-sum"]'); await s.waitForTimeout(600);
  };
  const sc = async () => Number((await rest('gem/1-3/3/scroll'))) || 0;
  await castle('eval-2');
  const c10 = await s.$eval('[data-room="q10"]', (e) => e.textContent.replace(/\s+/g, ' ').trim());
  ok('② 🏰 2층 10 카드 = 「✔ 서술형 · 실력 쓰기 가능」', /실력 쓰기 가능/.test(c10), c10);
  await s.screenshot({ path: `${SHOTS}/rw57-castle-list.png` });
  await s.click('[data-room="q10"]'); await s.waitForSelector('[data-k="castle-res"]'); await s.waitForTimeout(400);
  const mainT = (await s.textContent('[data-k="castle"] button.pmain')).trim(), refight = !!(await s.$('[data-k="castle-refight"]'));
  ok('② 방을 누르면 = 「✍ 실력 쓰기 · 📜 +1」 + 「⚔ 다시 싸우기」', /실력 쓰기/.test(mainT) && refight, mainT);
  await s.screenshot({ path: `${SHOTS}/rw57-castle-pick.png` });
  await s.click('[data-k="castle"] button.pmain'); await s.waitForSelector('[data-k="rewrite"]'); await s.waitForTimeout(300);
  const stem = (await s.textContent('[data-k="rw-stem"]')).trim(), v0 = P2.rooms.find((r) => r.id === 'q10').vers.map((v) => v[0].q.split('\n')[0]);
  const k = v0.indexOf(stem);
  ok('② 다시 쓰기 문제 = 판 1~6 중 하나 (학습지 판 0 아님)', k >= 1 && k <= 6, `판 ${k}`);
  await s.screenshot({ path: `${SHOTS}/rw57-castle-sheet.png` });
  const s0 = await sc(); await shootTwice('castle10', I[2], I[3], 'cr1', 'cp1');
  const r10 = await rest('bonus/1-3/3/eval-2/q10'), s1 = await sc();
  ok('② 통과 = 기록 ph2 · 📜 +1 (서술형 ph 그대로)', r10 && r10.ph2 === 'cp1' && r10.ph === 'p0' && s1 - s0 === 1, `ph2 ${r10 && r10.ph2} · 📜 ${s0}→${s1}`);
  const got = await s.$$eval('[data-k="castle-got"] li', (x) => x.map((e) => e.textContent.trim())).catch(() => []);
  ok('② 결과 = 📜 +1 하나뿐 (💎 · EXP 없음)', got.length === 1 && /📜 \+1/.test(got[0]), JSON.stringify(got));
  await s.screenshot({ path: `${SHOTS}/rw57-castle-done.png` });
  await s.click('[data-k="castle"] button.pmain'); await s.waitForTimeout(500);
  const c10b = await s.$eval('[data-room="q10"]', (e) => e.textContent.replace(/\s+/g, ' ').trim());
  ok('② 받은 뒤 카드 = 「실력 쓰기 가능」 없음 · 「✔ 실력 쓰기 통과」', !/실력 쓰기 가능/.test(c10b) && /실력 쓰기 통과/.test(c10b), c10b);

  // ── ③ 🏰 3층 17 ──
  await castle('eval-3');
  await s.click('[data-room="q17"]'); await s.waitForSelector('[data-k="castle-res"]'); await s.click('[data-k="castle"] button.pmain'); await s.waitForSelector('[data-k="rewrite"]');
  const st17 = (await s.textContent('[data-k="rw-stem"]')).trim(), w17 = P3.rooms.find((r) => r.id === 'q17').vers[0][0].q.split('\n')[0];
  ok('③ 🏰 3층 17 = 판 0 그대로 (숫자 없는 증명)', st17 === w17, st17.slice(0, 50));
  await s.screenshot({ path: `${SHOTS}/rw57-castle17-sheet.png` });
  const t0 = await sc(); await shootTwice('castle17', I[4], I[5], 'br1', 'bp1');
  const r17 = await rest('bonus/1-3/3/eval-3/q17'), t1 = await sc();
  ok('③ 통과 = ph2 · 📜 +1', r17 && r17.ph2 === 'bp1' && t1 - t0 === 1, `📜 ${t0}→${t1}`);
  // ── ④ 교사 대시보드 = ✍ 연습 통과 · ✍ 실력 통과 두 칸 (한눈에 표 · 서술형 보기) ──
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e))); t.setDefaultTimeout(15000);
  await t.goto(B.replace('?', '?role=teacher&')); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('.tabs button:has-text("반")'); await t.waitForTimeout(500); await t.click('.seg button:has-text("대시보드")'); await t.waitForTimeout(500);
  await t.click('.chips button:text-is("1-3")'); await t.waitForTimeout(1200);
  const grid = await t.evaluate(() => { const h = [...document.querySelectorAll('.dash thead th')].map((x) => x.textContent.trim()); const r = [...document.querySelectorAll('.dash tbody tr')].map((tr) => [...tr.children].map((x) => x.textContent.trim())).find((c) => /시험삼/.test(c[0])); return { h, r }; });
  const iP = grid.h.findIndex((x) => /연습 통과/.test(x)), iV = grid.h.findIndex((x) => /실력 통과/.test(x)), iL = grid.h.findIndex((x) => /사다리/.test(x));
  ok('④ 대시보드 한눈에 표 = 「✍ 연습 통과」 · 「✍ 실력 통과」 칸 · 실력 3 (허수아비 1 + 성채 2)', iP > 0 && iV > 0 && grid.r && grid.r[iV] === '3', grid.r ? `연습 ${grid.r[iP]} · 실력 ${grid.r[iV]} · 사다리 「${grid.r[iL]}」` : '줄 없음');
  ok('④ 사다리 칸 = 💪✍ 실력 표시', !!grid.r && /💪✍3/.test(grid.r[iL] || ''));
  await t.screenshot({ path: `${SHOTS}/rw57-dash-grid.png` });
  await t.click('.grp button:has-text("기록 남기기")'); await t.waitForTimeout(300); await t.click('.vws button:has-text("서술형")'); await t.waitForTimeout(800);
  const pl = await t.$$eval('.dash .dl', (x) => x.map((e) => e.textContent.replace(/\s+/g, ' ').trim())).catch(() => []);
  ok('④ 서술형 보기 = 「✍ 연습 통과 n · ✍ 실력 통과 n」', pl.some((x) => /시험삼/.test(x) && /연습 통과 \d+/.test(x) && /실력 통과 3/.test(x)), pl.find((x) => /시험삼/.test(x)) || '없음');
  await t.screenshot({ path: `${SHOTS}/rw57-dash-photo.png` });
  console.log(`보낸 사진 ${sent.length}장`);
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
