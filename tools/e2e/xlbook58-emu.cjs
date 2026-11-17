// 📜 #58 엑셀 「전체 · 한 파일」 — 에뮬레이터 교사 로그인: 반 두 개(차시가 다름) 기록 → 학생 탭 대시보드 「전체」 → ⬇ 엑셀
//   ① 받기 단추 = 기록 받는 동안 「기록 받는 중…」(눌리지 않음) → 다 받은 뒤 「받기」 ② 파일 = 읽어보기 · 반 비교 · 보기 11개 · 「반」 열 · 두 반 줄 · 차시 열 합침 · 요약 줄
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?role=teacher&emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const rec = (no, id, b) => ({ at: 1, no, mons: { m1: 'o', m2: 'x' }, boss: b, bossN: 4, bossM: 'oo' + (b > 2 ? 'oo' : 'xx') });
  await rest('', 'PATCH', { roster: { '1-2': { 1: '가나', 2: '다라' }, '1-3': { 1: '마바', 2: '사아', 3: '자차' } }, rosterMask: { '1-2': { 1: '가*', 2: '다*' }, '1-3': { 1: '마*', 2: '사*', 3: '자*' } },
    records: { '1-2': { 1: { 'set-08': rec(8, 'set-08', 3) }, 2: { 'set-08': rec(8, 'set-08', 2) } }, '1-3': { 1: { 'set-09': rec(9, 'set-09', 4) }, 2: { 'set-09': rec(9, 'set-09', 1) }, 3: { 'set-08': rec(8, 'set-08', 3) } } },
    xp: { '1-3': { 1: { total: 40 } } }, gem: { '1-3': { 1: { total: 120, scroll: 2 } } },
    // 📝 설문 (#61): 응답 = 익명 · 응답 표시 = 번호가 빽빽 → 서버가 배열로 줌
    surveyA: { '1-2': { a1: { no: 6, r: [[2, 4]], pick: [0], cmp: 0, say: '좋아요' }, a2: { no: 6, r: [[3, 4]], pick: [1], cmp: 1 } }, '1-3': { b1: { no: 6, r: [[1, 5]], pick: [0], cmp: 0 }, b2: { no: 6, r: [[2, 3]], pick: [2], cmp: 0 }, b3: { no: 6, r: [[3, 3]], pick: [0], cmp: 2 } } },
    surveyDone: { '1-2': { 1: true, 2: true }, '1-3': { 1: true, 2: true, 3: true } } });
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true })).newPage(); t.on('pageerror', (e) => errs.push(String(e))); t.on('dialog', (d) => d.accept()); t.setDefaultTimeout(15000);
  await t.goto(B); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('.tabs button:has-text("학생")').catch(() => t.click('.tabs button:has-text("반")')); await t.waitForTimeout(500);
  await t.click('.seg button:has-text("대시보드")'); await t.waitForTimeout(800);
  await t.click('.chips button:text-is("전체")'); await t.waitForTimeout(500); // 「전체」 칩 = 대시보드에서만
  // 기록 받기를 늦춤: 에뮬레이터 REST 가 아니라 앱 웹소켓이라 막을 수 없어서 = 단추가 처음에 꺼져 있는지 바로 봄
  await t.click('button:has-text("⬇ 엑셀")'); await t.waitForSelector('[data-k="xl-go"]');
  const first = await t.$eval('[data-k="xl-go"]', (e) => ({ t: e.textContent.trim(), d: e.disabled }));
  await t.waitForFunction(() => { const e = document.querySelector('[data-k="xl-go"]'); return e && !e.disabled; }, null, { timeout: 15000 });
  const after = await t.$eval('[data-k="xl-go"]', (e) => e.textContent.trim());
  ok('① 받기 단추 = 다 받은 뒤 켜짐', after === '받기', `처음 「${first.t}」${first.d ? '(꺼짐)' : '(켜짐 · 이미 받음)'} → 「${after}」`);
  const pick = await t.$eval('.xo.on', (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
  ok('① 「전체 · 한 파일」 고름 · 설명 = 읽어보기 + 반 비교 + 보기 11개', /전체 · 한 파일/.test(pick) && /읽어보기/.test(pick) && /보기 11개/.test(pick), pick);
  await t.screenshot({ path: `${SHOTS}/xl58-sheet.png` });
  const [dl] = await Promise.all([t.waitForEvent('download', { timeout: 10000 }), t.click('[data-k="xl-go"]')]);
  const f = `${SHOTS}/xl58.xlsx`; await dl.saveAs(f);
  console.log('   파일 이름(브라우저 제안):', dl.suggestedFilename());
  const py = execFileSync('python3', ['-I', '-W', 'error', '-c', `
import pandas as pd, json, sys
d = pd.read_excel(sys.argv[1], sheet_name=None, header=None)
g = d['한눈에 표']; h = list(g.iloc[0])
rows = g[g[0].isin(['1-2', '1-3'])]
out = {'names': list(d), 'gridHead': [str(x) for x in h], 'gridCls': sorted(set(rows[0])), 'allCls': sorted(set(str(x) for x in g[0][1:] if str(x)[:2] == '1-')), 'sum': [n for n, x in d.items() if (x[0] == '📌 요약 (대시보드 표 위 숫자 카드)').any()], 'readme': [str(x) for x in d['읽어보기'][0].dropna()]}
print(json.dumps(out, ensure_ascii=False))`, f], { encoding: 'utf8' });
  const o = JSON.parse(py);
  ok('② 시트 13 = 읽어보기 · 반 비교 · 보기 11개', o.names.length === 13 && o.names[0] === '읽어보기' && o.names[1] === '반 비교', o.names.join(' | '));
  ok('② 한눈에 표 = 맨 앞 「반」 열 · 기록 · 명단 있는 두 반만 (가짜 이름 반 빠짐)', o.gridHead[0] === '반' && o.gridCls.join() === '1-2,1-3' && o.allCls.join() === '1-2,1-3', o.allCls.join());
  ok('② 차시 열 = 두 반 합침 · 「번호 · 이름」 바로 뒤 8차시 → 9차시', o.gridHead[1] === '번호 · 이름' && /8차시/.test(o.gridHead[2]) && /9차시/.test(o.gridHead[3]), o.gridHead.slice(0, 6).join(' | '));
  ok('② 📌 요약 줄 있는 시트', o.sum.length >= 2, o.sum.join(' · '));
  ok('② 읽어보기 = 시트 목록 · 읽는 법', o.names.slice(1).every((n) => o.readme.includes(n)) && o.readme.includes('반 열'));
  // ── #61 반 칩 1-3 을 고른 채 「전체 · 한 파일」 = 모든 반 설문 · 응답 표시 = 실제 수 ──
  await t.click('.chips button:text-is("1-3")'); await t.waitForTimeout(600);
  await t.click('button:has-text("⬇ 엑셀")'); await t.waitForSelector('[data-k="xl-go"]'); await t.click('.xo >> nth=0'); await t.waitForFunction(() => { const e = document.querySelector('[data-k="xl-go"]'); return e && !e.disabled; }, null, { timeout: 15000 });
  const [dl2] = await Promise.all([t.waitForEvent('download', { timeout: 10000 }), t.click('[data-k="xl-go"]')]);
  const f2 = `${SHOTS}/xl61.xlsx`; await dl2.saveAs(f2);
  const sv = JSON.parse(execFileSync('python3', ['-I', '-c', `
import pandas as pd, json, sys
d = pd.read_excel(sys.argv[1], sheet_name='설문', header=None)
rows = d[d[0].isin(['1-2', '1-3', '전체'])]
print(json.dumps({'cls': sorted(set(str(x) for x in d[0] if str(x) in ('1-2', '1-3'))), 'sum': [' | '.join(str(v) for v in r[:4]) for r in rows.values.tolist() if str(r[1]) == '응답']}, ensure_ascii=False))`, f2], { encoding: 'utf8' }));
  ok('#61 반 칩 1-3 인 채 전체 받기 = 설문 시트에 1-2 · 1-3 둘 다', sv.cls.join() === '1-2,1-3', sv.cls.join());
  ok('#61 요약 = 전체 응답 5 · 응답 표시 5 (배열 빈칸 안 셈)', sv.sum.some((x) => /^전체 \| 응답 \| 5 \| 응답 표시 5 \//.test(x)) && sv.sum.some((x) => /^1-2 \| 응답 \| 2 \| 응답 표시 2 \//.test(x)), sv.sum.join(' ; '));
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
