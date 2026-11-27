// 🐞 11/27 선생님 「베타로 들어가도 사진 찍는 칸은 어디에도 없다」 — 🧪 테스트(교사 내 캠프 · 이 기기 캠프)에서도 학생과 같은 📷 찍기 · 🖼 앨범 · 📨 보내기
//   중계소 주소가 있는 판(gcfg/photo) · 중계소 답은 가짜(route) · 보내는 값에 test:true · 받은 판단 = 이 기기 테스트 기록 → 📜 내가 낸 문제 · 「✔ 판단 결과로 보기」도 그대로
//   NODE_PATH=$(npm root -g) node tools/e2e/quest1127.cjs <그림 폴더> <양식 뒷면 사진 png(ㄱ 표시 4개)>
const { chromium } = require('playwright');
const path = require('path');
const SHOTS = process.argv[2] || '.', PIC = process.argv[3], B = 'http://localhost:4173/', RELAY = 'https://relay.example.test/exec';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const E1 = require('fs').readFileSync(path.join(__dirname, '../pack-upload/castle/eval-1.json'), 'utf8');
  await ctx.addInitScript(([raw, url]) => { try { localStorage.setItem('citadel-wake-tip', '1'); localStorage.setItem('citadel-v1-test-db|prep/addons/castle/eval-1', raw); localStorage.setItem('citadel-v1-test-db|gcfg/photo', JSON.stringify({ url, on: true })); } catch {} }, [E1, RELAY]);
  let sent = null;
  await ctx.route(RELAY, async (r) => {
    sent = JSON.parse(r.request().postData() || '{}');
    await r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, id: 'aitest1', left: 2, rec: { at: Date.now(), grade: 'blue', status: 'wait', reason: '', base: sent.base, type: sent.type, changed: sent.changed, problem: 'AI 가 옮긴 학생 문제', answer: '7', steps: ['① 식', '② 계산'], hint: '힌트', solve1: '7', solve2: '7', agree: true, issues: [] } }) });
  });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${B}?role=camp&room=QS2`); await p.waitForSelector('.stage'); await p.waitForTimeout(1000);
  await p.$eval('[data-prop="tent"]', (e) => e.click()); await p.waitForSelector('[data-k="quest-desk"]', { timeout: 8000 }); await p.waitForTimeout(400);
  ok('🧪 테스트에도 📷 찍기 단추 (바탕 고르기 전 = 흐림)', !!(await p.$('[data-k="quest-cam"]:disabled')));
  ok('「✔ 테스트: 판단 결과로 보기」도 그대로', !!(await p.$('[data-k="quest-test"]')));
  await p.selectOption('[data-k="quest-base"]', { index: 3 }); await p.click('[data-k="quest-type-subj"]'); await p.click('[data-k="quest-ch-num"]'); await p.waitForTimeout(200);
  ok('바탕 · 형식 고르면 📷 찍기 켜짐', !!(await p.$('[data-k="quest-cam"]:not(:disabled)')));
  await p.screenshot({ path: `${SHOTS}/q1127-1-test-cam.png` });
  if (PIC) {
    await p.setInputFiles('[data-k="quest-desk"] input[type="file"]', PIC); await p.waitForTimeout(1500);
    const shot = await p.$('[data-k="quest-desk"] img.shot'), err = (await p.textContent('[data-k="quest-desk"] .err').catch(() => '')) || '';
    ok('양식 뒷면 사진 → 반듯하게 편 그림 (이름 칸 가림)', !!shot, err);
    await p.screenshot({ path: `${SHOTS}/q1127-2-shot.png` });
    if (shot) {
      ok('보내기 단추 = 「실제 AI 판단 받기 (🧪 기록 안 남김)」', /실제 AI 판단/.test((await p.textContent('[data-k="quest-send"]')) || ''));
      await p.click('[data-k="quest-send"]'); await p.waitForTimeout(1500);
      ok('보낸 값 = test:true · 반 · 번호 칸 있음(중계소 모양 확인 통과)', !!sent && sent.test === true && sent.kind === 'quest' && !!sent.c && sent.n >= 1 && typeof sent.image === 'string' && sent.image.length > 1000, sent ? JSON.stringify({ test: sent.test, c: sent.c, n: sent.n, img: sent.image && sent.image.length }) : '안 보냄');
      ok('받은 판단 → 📜 내가 낸 문제(🧪 표시)', (await p.$$('[data-k="quest-mine"]')).length === 1 && /🧪/.test((await p.textContent('[data-k="quest-desk"]')) || ''));
      await p.screenshot({ path: `${SHOTS}/q1127-3-mine.png` });
    }
  }
  ok('오류 0', errs.length === 0, errs.join(' | '));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
