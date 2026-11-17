// 📊 대시보드 (#125): 「전체」 = 베타 반 · 시험 계정 빠짐 · 보기 12개가 모두 그려짐 · 엑셀 = 숫자는 숫자 · % 서식 · 첫 행 고정
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import { memoryStore } from '../src/store/device';
import { ALL, ALL_VIEWS, bookAll, scope, toSheet, view } from '../src/school/views';
import { makeXlsx } from '../src/school/xlsx';
import { spawnSync } from 'node:child_process';
import { fakeClass } from '../src/school/dash';

describe('대시보드 (#125)', () => {
  it('전체 = 베타 반(1-6) · 시험 계정 빠짐 · 반 칩 = 그 반 기록 보임', () => {
    const S = memoryStore();
    S.set('school/test/1-3/7', true);
    const all = scope(S, ALL);
    expect(all.studs.some((s) => s.cls === '1-6')).toBe(false);
    expect(all.studs.some((s) => s.cls === '1-3' && s.n === 7)).toBe(false);
    expect(all.xN).toBe(1);
    expect(scope(S, '1-6').studs.length).toBe(15);
    expect(scope(S, ALL, true).studs.some((s) => s.cls === '1-6')).toBe(true);
  });
  it('가짜 기록은 반 · 번호로 늘 같은 값', () => {
    const a = fakeClass(memoryStore(), '1-2').studs.map((s) => [s.boss, s.lv]);
    const b = fakeClass(memoryStore(), '1-2').studs.map((s) => [s.boss, s.lv]);
    expect(a).toEqual(b);
  });
  it('보기 12개가 모두 내용을 냄 (반 · 전체)', () => {
    const S = memoryStore();
    for (const id of ALL_VIEWS) {
      const v = view(S, id === 'cmp' ? ALL : '1-3', id);
      expect(v.table || v.list || v.memos || v.bars || v.kpis || v.boards, id).toBeTruthy();
      expect(toSheet(v).rows.length, id).toBeGreaterThan(1);
    }
  });
  it('엑셀: 숫자 = 숫자 칸 · % = 0.78 + 서식(9) · 첫 행 고정 · 시트 이름', () => {
    const S = memoryStore();
    const bytes = makeXlsx([toSheet(view(S, ALL, 'cmp')), toSheet(view(S, '1-3', 'grid'))]);
    writeFileSync('/tmp/dash-test.xlsx', bytes);
    const z = unzipSync(bytes), wb = strFromU8(z['xl/workbook.xml']!), s1 = strFromU8(z['xl/worksheets/sheet1.xml']!);
    expect(wb).toContain('name="반 비교 전체"');
    expect(s1).toContain('state="frozen"');
    expect(s1).toMatch(/<c r="C2" s="2"><v>0\.\d+<\/v><\/c>|<c r="C2" s="2"><v>1<\/v><\/c>/);
    expect(s1).toMatch(/<c r="B2"><v>\d+<\/v><\/c>/);
    expect(strFromU8(z['xl/styles.xml']!)).toContain('numFmtId="9"');
  });
  // 📄 #54 다른 AI(파이썬 openpyxl · pandas)가 그대로 읽는 표준 xlsx — 파이썬 · openpyxl 이 없는 기기면 건너뜀
  it('엑셀: openpyxl · pandas 로 경고 없이 읽힘 (공유 문자열 · 기본 서식 · 제어 글자 · NaN · 긴/겹친 시트 이름)', () => {
    const py = spawnSync('python3', ['-c', 'import openpyxl, pandas'], { encoding: 'utf8' });
    if (py.status !== 0) return;
    const S = memoryStore();
    const bytes = makeXlsx([toSheet(view(S, ALL, 'cmp')), toSheet(view(S, '1-3', 'grid')), { name: '아주 긴 시트 이름이 서른한 글자를 넘어가면 잘려야 함', rows: [['글', '수'], ['줄\u0001바꿈\u0008 & <b> "q"', NaN], ['⭐ 6/6', Infinity], [null, 3]] }, { name: '아주 긴 시트 이름이 서른한 글자를 넘어가면 잘려야 함', rows: [['같은 이름']] }]);
    const f = '/tmp/dash-test-std.xlsx'; writeFileSync(f, bytes);
    const r = spawnSync('python3', ['-W', 'error', '-c', `import openpyxl, pandas as pd
wb = openpyxl.load_workbook('${f}'); assert len(wb.sheetnames) == 4 and all(len(n) <= 31 for n in wb.sheetnames) and len(set(wb.sheetnames)) == 4
d = pd.read_excel('${f}', sheet_name=None); x = d[wb.sheetnames[2]]
assert list(x.columns) == ['글', '수'] and x.iloc[0, 0] == '줄바꿈 & <b> "q"' and pd.isna(x.iloc[0, 1]) and x.iloc[2, 1] == 3
print('ok')`], { encoding: 'utf8' });
    expect(r.stderr + r.stdout).toContain('ok');
  });
  // 📜 #58 「전체 · 한 파일」 = 읽어보기 → 반 비교 → 보기 11개(맨 앞 「반」 열) · 시트 아래 📌 요약 줄
  it('엑셀 전체 한 파일: 읽어보기 · 반 비교 · 보기 11개 · 반 열 · 요약 줄 · 반마다 차시 열 합침', () => {
    const S = memoryStore(), B = bookAll(S, false, '2026-11-18');
    expect(B.map((x) => x.name)).toEqual(['읽어보기', '반 비교', ...ALL_VIEWS.filter((v) => v !== 'cmp').map((id) => view(S, ALL, id).title.replace(/ · /g, ' '))]);
    expect(B).toHaveLength(13);
    const rd = B[0]!.rows.map((r) => String(r[0] ?? ''));
    for (const n of B.slice(1).map((x) => x.name)) expect(rd, n).toContain(n);
    const grid = B.find((x) => x.name === '한눈에 표')!;
    expect(grid.rows[0]![0]).toBe('반');
    const cls = new Set(grid.rows.slice(1).map((r) => r[0]).filter((c) => typeof c === 'string' && /^\d-\d$/.test(c)));
    expect(cls.size).toBeGreaterThan(1); expect(cls.has('1-6')).toBe(false); // 🧪 베타 반 빠짐
    for (const x of B.slice(2)) { const h = (x.rows[0] || []).map(String); if (h.length > 1) expect(h.includes('반'), x.name).toBe(true); }
    const withSum = B.filter((x) => x.rows.some((r) => r[0] === '📌 요약 (대시보드 표 위 숫자 카드)'));
    expect(withSum.length).toBeGreaterThan(2);
    const w = makeXlsx(B); writeFileSync('/tmp/dash-book.xlsx', w);
    const py = spawnSync('python3', ['-c', 'import openpyxl, pandas'], { encoding: 'utf8' }); if (py.status !== 0) return;
    const r = spawnSync('python3', ['-W', 'error', '-c', `import pandas as pd
d = pd.read_excel('/tmp/dash-book.xlsx', sheet_name=None); assert list(d)[0] == '읽어보기' and len(d) == 13
g = d['한눈에 표']; assert g.columns[0] == '반'
print('ok')`], { encoding: 'utf8' });
    expect(r.stderr + r.stdout).toContain('ok');
  });
});
