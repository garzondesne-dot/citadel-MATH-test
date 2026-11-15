// 📝 수업 설문 (에뮬레이터 · 정식 survey.js 옮김 b192): 학생 1-3 · 3번 가입 → 단추 없음 → 교사 소식 「1-3 열기」(7차시) → 학생 캠프 📝 단추
//   → ☑ 체크 전엔 A 잠김 → 빈칸으로 보내기 = 막힘 → 다 채워 보내기 → surveyA 1건(이름 · 번호 · 시각 없음) · surveyDone · 💎 +10 · EXP +5 → 단추 사라짐(새로 고침해도)
//   → 🧪 베타 반(1-6) 학생 = 응답 표시 · 보상만 · surveyA 안 쌓임 → 교사 대시보드 「설문」 = 응답 1 · 소식 = 1/2명 · 「모든 반 닫기」
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼', 4: '시험사' }, '1-6': { 2: '베타이' } }, rosterMask: { '1-3': { 3: '시*삼', 4: '시*사' }, '1-6': { 2: '베*이' } } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  const student = async (cls, num) => {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e))); p.setDefaultTimeout(15000);
    p.on('dialog', (d) => d.accept());
    await p.goto(`${B}?${E}`); await p.waitForSelector('.title', { timeout: 20000 }); await p.waitForTimeout(800);
    await p.selectOption('select >> nth=0', cls); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', String(num)); await p.waitForTimeout(400);
    if (!(await p.$('.pw:has(small)'))) await p.click('.lk:has-text("가입")');
    await p.click('.pw >> nth=0'); for (const k of '12341234') await p.click(`.pad button:text-is("${k}")`);
    await p.waitForTimeout(200); await p.click('.title .act .pmain'); await p.waitForTimeout(3500);
    const hero = await p.$('[data-k="first-hero"], .fh'); if (hero) { const go = await p.$('.fh .pmain, [data-k="first-hero"] .pmain'); if (go) await go.click().catch(() => {}); await p.waitForTimeout(800); }
    return p;
  };
  const fill = async (p) => {
    for (let i = 0; i < 7; i++) { await p.click(`[data-sv="${i}-0-${1 + (i % 3)}"]`); await p.click(`[data-sv="${i}-1-${3 + (i % 3)}"]`); }
    await p.click('[data-pick="0"]'); await p.click('[data-pick="4"]'); await p.click('[data-cmp="0"]');
    await p.fill('[data-k="sv-say"]', '틀린 문제를 다시 풀게 됐어요');
  };
  const s = await student('1-3', 3);
  log('① 학생 캠프:', (await s.$('.title')) ? '✗ 로그인 안 됨' : '○', '| 📝 단추(열기 전):', !!(await s.$('[data-k="sv-open"]')));
  if (await s.$('[data-k="sv-open"]')) errs.push('열기 전에 단추');
  const g0 = Number(await rest('gem/1-3/3/total')) || 0, x0 = Number(await rest('xp/1-3/3/total')) || 0;
  // 교사 = 소식 → 보내기 → 차시 7 · 1-3 열기
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e))); t.on('dialog', (d) => d.accept());
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('.tabs button:has-text("소식")'); await t.waitForTimeout(400); await t.click('.seg button:has-text("보내기")'); await t.waitForTimeout(400);
  await t.fill('[data-k="sv-no"]', '7'); await t.dispatchEvent('[data-k="sv-no"]', 'change');
  await t.click('[data-sv-cls="1-3"] button'); await t.waitForTimeout(800);
  const st = await rest('survey/1-3'); log('② 교사 1-3 열기 →', JSON.stringify(st)); if (!st || st.open !== true || st.no !== 7) errs.push('열기');
  await t.click('[data-sv-cls="1-6"] button'); await t.waitForTimeout(500);
  await t.screenshot({ path: `${SHOTS}/survey-teacher.png` });
  // 학생 = 📝 단추 → 창
  await s.waitForSelector('[data-k="sv-open"]', { timeout: 8000 }).catch(() => {});
  const btn = await s.$eval('[data-k="sv-open"]', (x) => x.textContent).catch(() => ''); log('③ 학생 📝 단추:', btn.replace(/\s+/g, ' ').trim() || '✗ 없음'); if (!btn.includes('7차시')) errs.push('단추');
  await s.click('[data-k="sv-open"]'); await s.waitForSelector('[data-k="survey"]');
  await s.click('[data-sv="0-0-3"]').catch(() => {}); await s.waitForTimeout(200);
  const lockedOn = await s.$eval('[data-sv="0-0-3"]', (x) => x.classList.contains('on')); log('④ ☑ 전 A 누름 → 고름', lockedOn ? '✗ 됨' : '막힘 ○'); if (lockedOn) errs.push('잠김');
  await s.screenshot({ path: `${SHOTS}/survey-sheet-lock.png` });
  await s.check('[data-k="sv-ack"] input'); await s.waitForTimeout(200);
  await s.click('.sheet .pmain, .sheet [data-k="main"], .sheet button:has-text("보내기")'); await s.waitForTimeout(600);
  const why = (await s.$eval('.sheet', (x) => x.textContent).catch(() => '')) || '';
  const n0 = Object.keys((await rest('surveyA/1-3')) || {}).length; log('⑤ 빈칸 보내기 →', n0 ? '✗ 저장됨' : '막힘 ○', why.includes('1번 문장') ? '· 「1번 문장」 안내 ○' : '· 안내 ✗'); if (n0 || !why.includes('1번 문장')) errs.push('빈칸 막기');
  await fill(s); await s.screenshot({ path: `${SHOTS}/survey-sheet-full.png`, fullPage: false });
  await s.click('.sheet button:has-text("보내기")'); await s.waitForTimeout(2000);
  const A = (await rest('surveyA/1-3')) || {}, ks = Object.keys(A), a = A[ks[0]] || {};
  log('⑥ surveyA:', ks.length, '건 · 키', /^[a-z2-9]{16}$/.test(ks[0] || '') ? '무작위 ○' : '✗', '· 칸', Object.keys(a).sort().join(','), '· no', a.no);
  if (ks.length !== 1 || Object.keys(a).some((k) => /^(n|num|name|at|uid|cls)$/.test(k)) || a.no !== 7) errs.push('surveyA 꼴');
  const done = await rest('surveyDone/1-3/3'), g1 = Number(await rest('gem/1-3/3/total')) || 0, x1 = Number(await rest('xp/1-3/3/total')) || 0, gl = await rest('gem/1-3/3/log/survey'), xl = await rest('xp/1-3/3/log/survey');
  log('⑦ 응답 표시', done, '| 💎', g0, '→', g1, gl && gl.g, '| EXP', x0, '→', x1, xl && xl.xp); if (done !== true || g1 - g0 !== 10 || x1 - x0 !== 5 || !gl || !xl) errs.push('보상');
  const gone = !(await s.$('[data-k="sv-open"]')); await s.reload(); await s.waitForTimeout(3500); const gone2 = !(await s.$('[data-k="sv-open"]'));
  log('⑧ 단추 사라짐', gone, '· 새로 고침 뒤', gone2); if (!gone || !gone2) errs.push('단추 남음');
  // 🧪 베타 반 1-6 학생
  const bs = await student('1-6', 2); await bs.waitForSelector('[data-k="sv-open"]', { timeout: 8000 }).catch(() => {});
  if (await bs.$('[data-k="sv-open"]')) { await bs.click('[data-k="sv-open"]'); await bs.check('[data-k="sv-ack"] input'); await fill(bs); await bs.click('.sheet button:has-text("보내기")'); await bs.waitForTimeout(2000); }
  const bA = Object.keys((await rest('surveyA/1-6')) || {}).length, bD = await rest('surveyDone/1-6/2'), bG = await rest('gem/1-6/2/log/survey');
  log('⑨ 🧪 베타 반 → surveyA', bA, '건 · 응답 표시', bD, '· 💎', bG && bG.g); if (bA !== 0 || bD !== true || !bG) errs.push('베타 반');
  // 교사 대시보드 「설문」 · 소식 응답 수
  await t.click('.tabs button:has-text("소식")'); await t.waitForTimeout(800);
  const row = await t.$eval('[data-sv-cls="1-3"]', (x) => x.textContent).catch(() => ''); log('⑩ 소식 1-3 줄:', row.replace(/\s+/g, ' ').trim()); if (!row.includes('1/2')) errs.push('응답 수');
  await t.click('.tabs button:has-text("학생")'); await t.waitForTimeout(400); await t.click('.chips button:text-is("1-3")').catch(() => {}); await t.waitForTimeout(300);
  await t.click('.seg button:has-text("대시보드")'); await t.waitForTimeout(400); await t.click('.grp button:has-text("기록 남기기")'); await t.waitForTimeout(300); await t.click('.vws button:has-text("설문")'); await t.waitForTimeout(2000);
  const kp = await t.$eval('.kpis', (x) => x.textContent).catch(() => ''), tb = await t.$$eval('.dash tbody tr', (r) => r.length).catch(() => 0);
  log('⑪ 대시보드 설문:', kp.replace(/\s+/g, ' ').trim(), '| 문항 줄', tb); if (!/응답\s*1/.test(kp) || tb !== 7) errs.push('대시보드');
  await t.screenshot({ path: `${SHOTS}/survey-dash.png`, fullPage: true });
  const [dl] = await Promise.all([t.waitForEvent('download', { timeout: 5000 }).catch(() => null), t.click('[data-k="sv-dash"] button:has-text("엑셀")')]);
  log('⑫ 설문 엑셀:', dl ? dl.suggestedFilename() : '✗'); if (!dl) errs.push('엑셀');
  await t.click('.tabs button:has-text("소식")'); await t.waitForTimeout(400); await t.click('.seg button:has-text("보내기")').catch(() => {}); await t.waitForTimeout(300);
  await t.click('[data-k="sv-all0"]'); await t.waitForTimeout(800);
  const c1 = await rest('survey/1-3'), c6 = await rest('survey/1-6'); log('⑬ 모든 반 닫기 →', c1, c6); if (c1 || c6) errs.push('닫기');
  // ⑭ 리모컨 마무리 = 그 반 설문 열기 · 닫기 (정식 ctlHtml)
  await t.click('.tabs button:has-text("수업")').catch(() => {}); await t.waitForTimeout(500);
  await t.click('[data-cls="1-3"]'); await t.click('.pk3 .pk:has-text("6차시")'); await t.click('.sub2 button:has-text("테스트")'); await t.waitForTimeout(1500);
  { const code = (await rest('school/live')).code; await rest(`rooms/${code}/players/u-test3`, 'PUT', { num: 3, nick: '시험삼', cls: '1-3', seen: Date.now() }); await t.waitForTimeout(1000); } // 대기실 1명 (시작 단추가 열리게)
  for (let k = 0; k < 30; k++) { const m = ((await t.textContent('.tact .btn').catch(() => '')) || '').trim(); if (/수업 닫기/.test(m)) break; await t.click('.tact .btn', { timeout: 3000 }).catch(() => {}); await t.waitForTimeout(500); }
  const ctl = await t.$eval('[data-k="sv-ctl"]', (x) => x.textContent).catch(() => ''); log('⑭ 리모컨 마무리 칸:', ctl.replace(/\s+/g, ' ').trim() || '✗ 없음'); if (!ctl) errs.push('리모컨 칸');
  await t.screenshot({ path: `${SHOTS}/survey-remote.png` });
  if (ctl) { await t.click('[data-k="sv-open-cls"]'); await t.waitForTimeout(800); const r1 = await rest('survey/1-3'); const ctl2 = await t.$eval('[data-k="sv-ctl"]', (x) => x.textContent).catch(() => ''); log('   열기 →', JSON.stringify(r1), '|', ctl2.replace(/\s+/g, ' ').trim()); if (!r1 || !r1.open) errs.push('리모컨 열기');
    await t.click('[data-k="sv-ctl"] button:has-text("닫기")'); await t.waitForTimeout(800); const r2 = await rest('survey/1-3'); log('   닫기 →', r2); if (r2) errs.push('리모컨 닫기'); }
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
