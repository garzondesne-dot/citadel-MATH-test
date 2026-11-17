// 🐞 #52 실제 학생(서버 로그인)에서 🎯 허수아비 서술형 「✍ 서술형 · 📷」 단추가 보이나 (에뮬레이터 · 정식과 같은 길)
//   #40 시험(dummywr40)은 이 기기 체험(서버 없음) 길만 봐서 놓침 → 허수아비 방 = 이 탭 메모리 · 사진 켜짐 · 기준표 = 서버에서 읽어야 함
//   ① 사진 켜짐 + 9차시 문제 5 기준표 켬 → 허수아비 9차시 문제 5 = 단추 있음 ② 기준표 끔 → 단추 없음 · 🏰 성채 2층 07 = 기준표 켬일 때만 단추
const { chromium } = require('playwright');
const { rest } = require('./_emu.cjs');
const R = require('../../src/subjects/common-math2/rubrics.json');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } }, school: { features: { bundle: 'full', on: { hero: true, scarecrow: true, citadel: true } } },
    gcfg: { photo: { on: true, url: 'https://example.invalid/exec', daily: 6, room: 2, cool: 30 }, floorOpen: { 'eval-1': true, 'eval-2': true } },
    photo_rubric: { 'set-09': { m5: { ...R['set-09'].m5, on: true } }, 'eval-2': { q07: { ...R['eval-2'].q07, on: true } } } });
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(B); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  await rest('records/1-3/3/set-09', 'PUT', { at: 1, no: 9, mons: { m1: 'o', m2: 'o', m3: 'o', m4: 'o', m5: 'x' }, bossM: 'oo' });
  await rest('school/last/1-3', 'PUT', { lesson: 'set-09', no: 9, at: 1, done: true, code: '111111' });
  const openDummy = async () => {
    await s.reload(); await s.waitForTimeout(3500);
    await s.waitForSelector('[data-prop="scare"]', { timeout: 15000 }); await s.$eval('[data-prop="scare"]', (e) => e.click()); await s.waitForSelector('[data-k="dummy-list"]'); await s.waitForTimeout(500);
    await s.$eval('[data-lesson="set-09"] li[data-mid="m5"] .go', (e) => e.click()); await s.waitForSelector('.drun', { timeout: 15000 }); await s.waitForTimeout(2500);
    return s.$('[data-k="wr-btn"]');
  };
  const w1 = await openDummy();
  ok('① 실제 학생 · 🎯 9차시 문제 5 = 「✍ 서술형」 단추', !!w1, w1 ? (await w1.textContent()).trim().replace(/\s+/g, ' ') : '없음');
  await s.screenshot({ path: `${SHOTS}/photo52-dummy-on.png` });
  await rest('photo_rubric/set-09/m5/on', 'PUT', false);
  const w2 = await openDummy();
  ok('② 기준표 끔 = 단추 없음 (선생님 스위치 그대로 따름)', !w2);
  await rest('photo_rubric/set-09/m5/on', 'PUT', true);
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
