// 📝 12월 마무리 설문 (에뮬레이터 · 📜 11/23): 학생 1-3 · 3번 가입 → 교사 소식 ☐ 12월 마무리 → 1-3 열기 → 학생 캠프 📝 「12월 마무리」
//   → 빈칸 보내기 = 막힘 → 22문항 채워 보내기 → surveyA v2 1건 · EXP log survey12 · 💎 +10 → 단추 사라짐 · 11/17 surveyDone 은 안 건드림
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼', 4: '시험사' } }, rosterMask: { '1-3': { 3: '시*삼', 4: '시*사' } } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e))); p.setDefaultTimeout(15000); p.on('dialog', (d) => d.accept());
  await p.goto(`${B}?${E}`); await p.waitForSelector('.title', { timeout: 20000 }); await p.waitForTimeout(800);
  await p.selectOption('select >> nth=0', '1-3'); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', '3'); await p.waitForTimeout(400);
  if (!(await p.$('.pw:has(small)'))) await p.click('.lk:has-text("가입")');
  await p.click('.pw >> nth=0'); for (const k of '12341234') await p.click(`.pad button:text-is("${k}")`);
  await p.waitForTimeout(200); await p.click('.title .act .pmain'); await p.waitForTimeout(3500);
  const hero = await p.$('[data-k="first-hero"], .fh'); if (hero) { const go = await p.$('.fh .pmain, [data-k="first-hero"] .pmain'); if (go) await go.click().catch(() => {}); await p.waitForTimeout(800); }
  await rest('surveyDone/1-3/3', 'PUT', true); // 11/17 에 이미 답한 학생
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e))); t.on('dialog', (d) => d.accept());
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('.tabs button:has-text("소식")'); await t.waitForTimeout(400); await t.click('.seg button:has-text("보내기")'); await t.waitForTimeout(400);
  await t.check('[data-k="sv-12"]'); await t.waitForTimeout(200);
  ok('교사 「12월 마무리」 켜면 차시 칸 숨김', !(await t.$('[data-k="sv-no"]')));
  await t.click('[data-sv-cls="1-3"] button'); await t.waitForTimeout(800);
  const st = await rest('survey/1-3'); ok('열기 → survey/1-3 no 100', st && st.open === true && st.no === 100, JSON.stringify(st));
  const row = await t.$eval('[data-sv-cls="1-3"]', (x) => x.textContent).catch(() => ''); ok('소식 줄 「열림 · 12월 마무리」 · 0/2명 (11/17 응답 수 아님)', row.includes('12월 마무리') && row.includes('0/2'), row.replace(/\s+/g, ' ').trim());
  await t.screenshot({ path: `${SHOTS}/sv12-teacher.png` });
  await p.waitForSelector('[data-k="sv-open"]', { timeout: 8000 }).catch(() => {});
  const btn = await p.$eval('[data-k="sv-open"]', (x) => x.textContent).catch(() => ''); ok('학생 📝 단추 「12월 마무리」 (11/17 했어도)', btn.includes('12월 마무리'), btn.replace(/\s+/g, ' ').trim());
  await p.click('[data-k="sv-open"]'); await p.waitForSelector('[data-k="survey12"]');
  const intro = await p.$eval('[data-k="survey12"] .anon', (x) => x.textContent); ok('첫 안내 글', intro.includes('성적과 상관없고, 안 해도 불이익 없어요. 선생님은 누가 무엇을 답했는지 볼 수 없어요.'));
  const nq = await p.$$eval('[data-k="survey12"] [data-q]', (x) => x.length); ok('문항 22', nq === 22, String(nq));
  await p.screenshot({ path: `${SHOTS}/sv12-sheet-top.png` });
  await p.click('.sheet button:has-text("보내기")'); await p.waitForTimeout(600);
  ok('빈칸 보내기 = 막힘', !(await rest('surveyA/1-3')) && ((await p.$eval('.sheet', (x) => x.textContent)) || '').includes('1번을 골라'));
  for (let n = 1; n <= 18; n++) if (n !== 12) await p.click(`[data-sv="${n}-${n === 13 ? 0 : 4}"]`);
  for (const [n, k] of [[12, 0], [19, 1], [20, 0]]) await p.click(`[data-pk="${n}-${k}"]`);
  await p.fill('[data-k="sv12-say"]', '틀린 문제를 다시 풀게 됐어요');
  await p.locator('[data-q="13"]').scrollIntoViewIfNeeded(); await p.screenshot({ path: `${SHOTS}/sv12-sheet-c.png` });
  await p.click('.sheet button:has-text("보내기")'); await p.waitForTimeout(2000);
  const A = (await rest('surveyA/1-3')) || {}, ks = Object.keys(A), a = A[ks[0]] || {};
  ok('surveyA 1건 · v2 · no 100 · r 17 · 13번 0 · pick 3 · 이름 없음', ks.length === 1 && a.v === 2 && a.no === 100 && a.r?.length === 17 && a.r[11] === 0 && a.pick?.length === 3 && !('n' in a) && !('name' in a), JSON.stringify({ ...a, say: a.say?.length }));
  const xl = await rest('xp/1-3/3/log/survey12'), gl = await rest('gem/1-3/3/log/survey12');
  ok('EXP log survey12 +5 · 💎 +10', xl?.xp === 5 && gl?.g === 10, JSON.stringify({ xl, gl }));
  ok('11/17 응답 표시는 그대로', (await rest('surveyDone/1-3/3')) === true);
  const gone = !(await p.$('[data-k="sv-open"]')); await p.reload(); await p.waitForTimeout(3500); const gone2 = !(await p.$('[data-k="sv-open"]'));
  ok('단추 사라짐 · 새로 고침 뒤에도', gone && gone2);
  await t.click('.tabs button:has-text("학생")').catch(() => {}); await t.waitForTimeout(300); await t.click('.tabs button:has-text("소식")'); await t.waitForTimeout(400); await t.click('.seg button:has-text("보내기")').catch(() => {}); await t.waitForTimeout(800); const row2 = await t.$eval('[data-sv-cls="1-3"]', (x) => x.textContent).catch(() => ''); ok('보낸 뒤 소식 줄 1/2명', row2.includes('1/2'), row2.replace(/\s+/g, ' ').trim());
  console.log(errs.length ? `❌ ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); await b.close(); process.exit(errs.length ? 1 : 0);
})();
