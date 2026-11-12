// 📝 #127 세특 초안 = 생기부 낱말: 함수 하나 seteukDraft · 정식 #126 과 같은 문장(기준값 tests/fixtures/memo126.json = 정식 dda3360 memoParts 출력)
//   금지 낱말 0개(상수 SETEUK_BAN) · 순서(참여 → 이해 → 협력 → 오류 수정 → 자기주도 → 성찰) · 본문 최대 6문장 · 500자 · 문장 끝 -함 · -임 · -보임 · 남는 문장 = 더 보기
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/memo126.json';
import { MIS, SETEUK_BAN, seteukDraft, type SeteukIn } from '../src/school/seteuk';
import { memoParts, fakeClass } from '../src/school/dash';
import { CLASSES } from '../src/school/school';
import { memoryStore } from '../src/store/device';
import { ALL, toSheet, view } from '../src/school/views';

const ORDER = [['참여'], ['이해', '성취기준', '형성평가'], ['협력', '친구'], ['바로잡음', '고쳐 씀', '서술함', '단서'], ['단원 평가', '반복 연습', '오답', '기호와 개념', '기호의 뜻'], ['성찰']];
const stage = (t: string) => (t.includes('성찰') ? 5 : ORDER.findIndex((ws) => ws.some((w) => t.includes(w))));
const END = /(함|임|보임|씀|음)(\(.+\))?$/;

describe('세특 초안 (#127)', () => {
  it('정식 #126 과 같은 기록 = 같은 초안 (본문 · 더 보기 글자까지)', () => {
    for (const c of fixture.cases) expect(seteukDraft(c.in as SeteukIn)).toEqual(c.out);
  });
  it('오개념 문구 = 정식 사전 그대로', () => {
    for (const [k, v] of Object.entries(fixture.misCodes)) expect(MIS[k]?.seteuk).toBe((v as { seteuk: string }).seteuk);
  });
  it('8반 모든 학생: 금지 낱말 0 · 순서 · 6문장 · 500자 · 문장 끝', () => {
    const S = memoryStore();
    let n = 0;
    for (const c of CLASSES) for (const s of fakeClass(S, c).studs) {
      const { main, more } = memoParts(s), all = `${main} ${more.join(' ')}`, sent = main.replace(/\.$/, '').split('. ');
      expect(SETEUK_BAN.filter((w) => all.includes(w)), `${c} ${s.n}`).toEqual([]);
      expect(sent.length).toBeLessThanOrEqual(6); expect(sent.length).toBeGreaterThanOrEqual(s.went ? 3 : 1);
      expect(main.length).toBeLessThanOrEqual(500);
      if (s.went) { expect(sent.every((t) => END.test(t)), main).toBe(true); const st = sent.map(stage); expect(st.every((x, i) => x >= 0 && (i === 0 || x >= st[i - 1]!)), `${st}`).toBe(true); expect(sent[0]!.startsWith('모둠 협동학습 형태의 수학 수업')).toBe(true); }
      n++;
    }
    expect(n).toBe(120);
  });
  it('대시보드 「세특 메모」 · 엑셀 세특 시트 = 같은 함수 (초안 · 더 보기 열)', () => {
    const S = memoryStore(), v = view(S, '1-3', 'memo'), sh = toSheet(v), s0 = fakeClass(S, '1-3').studs[0]!;
    expect(v.memos?.[0]?.text).toBe(memoParts(s0).main);
    expect(sh.rows[0]).toEqual(['반', '번호', '이름', '세특 초안', '더 보기']);
    expect(sh.rows[1]?.[3]).toBe(memoParts(s0).main);
    expect(toSheet(view(S, ALL, 'memo')).rows.flat().join(' ')).not.toMatch(new RegExp(SETEUK_BAN.join('|')));
  });
});
