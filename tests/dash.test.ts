// 📊 대시보드 (#125): 「전체」 = 베타 반 · 시험 계정 빠짐 · 보기 12개가 모두 그려짐 · 엑셀 = 숫자는 숫자 · % 서식 · 첫 행 고정
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import { memoryStore } from '../src/store/device';
import { ALL, ALL_VIEWS, scope, toSheet, view } from '../src/school/views';
import { makeXlsx } from '../src/school/xlsx';
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
      expect(v.table || v.list || v.memos || v.bars || v.kpis, id).toBeTruthy();
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
});
