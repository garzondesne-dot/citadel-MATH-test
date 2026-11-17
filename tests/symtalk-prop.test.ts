// 📖 #49 기호 톡 명제 단원 (8 · 9차시) — 문구 = hero-v2 docs/SYMBOL-TALK.md (tests/fixtures 사본 · 머리 방 원본) 한 글자씩 · 붙는 곳 = 정식 symtalk.js propHits 그대로 · 명제 차시에서만
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BY, PROP, propHits, propOn, segments } from '../src/subjects/common-math2/symtalk';

const md = readFileSync(new URL('./fixtures/SYMBOL-TALK.md', import.meta.url), 'utf8');
const sect = (a: string, b: string) => md.slice(md.indexOf(a), md.indexOf(b));
const rows = (s: string) => s.split('\n').filter((l) => /^\| [^-|]/.test(l) && !/^\| 붙는 곳/.test(l)).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
const strip = (c: string) => c.replace(/\*\*/g, '');

describe('📖 #49 기호 톡 명제 단원', () => {
  it('8 · 9차시 8줄 = SYMBOL-TALK.md 와 한 글자씩 같음', () => {
    const md8 = rows(sect('## 명제 단원', '### 9차시')), md9 = rows(sect('### 9차시', '- 다음 차시'));
    const all = [...md8, ...md9];
    expect(all.length).toBe(8); expect(PROP.length).toBe(8);
    all.forEach((r, i) => { const p = PROP[i]!; expect(strip(r[1]!), p.id).toBe(p.easy); expect(r[2], p.id).toBe(p.def); expect(r[3], p.id).toBe(p.memo); });
    for (const p of PROP) expect(BY[p.id]).toBe(p); // 대시보드 기호 톡 칸 = BY 에 있는 것만
  });
  it('붙는 곳: ~ · → (p q r 사이) · 명제 · 조건(조건제시법 빼고) · 진리집합 · P(진리집합 있을 때만) · 반례 · 역 · 대우(낱말 경계)', () => {
    const ids = (t: string) => propHits(t).map((h) => `${t.slice(h.i, h.i + h.len)}:${h.id}`);
    expect(ids('명제 p → q 의 역은 q → p 이고 대우는 ~q → ~p 이다.')).toEqual(['명제:prop', '→:imp', '역:conv', '→:imp', '대우:contra', '~:neg', '→:imp', '~:neg']);
    expect(ids('다음 조건 p 의 진리집합 P 를 구하시오.')).toEqual(['조건:cond', '진리집합:truth', 'P:truth']);
    expect(ids('집합 P = {1, 2}')).toEqual([]); // 진리집합 낱말 없음 = P 안 칠함
    expect(ids('조건제시법으로 나타내시오.')).toEqual([]);
    expect(ids('반례를 하나 드시오.')).toEqual(['반례:counter']);
    expect(ids('역사 · 대우주 · 역할')).toEqual([]); // 낱말 안의 「역」 · 「대우」 = 안 칠함
    expect(ids('x → 3')).toEqual([]); // p q r 사이 화살표만
  });
  it('명제 차시에서만: 8차시부터 · 성채 2층(eval-2) = 켬 / 집합 차시 · 성채 1 · 3층 = 끔', () => {
    expect(propOn({ id: 'set-08', no: 8 })).toBe(true); expect(propOn({ id: 'set-09', no: 9 })).toBe(true); expect(propOn({ id: 'ex-12', no: 12 })).toBe(true);
    expect(propOn({ id: 'set-06', no: 6 })).toBe(false); expect(propOn({ id: 'eval-2', no: 0 })).toBe(true); expect(propOn({ id: 'eval-3', no: 13 })).toBe(false);
    const t = '명제 「A ⊂ B 이면 x ∈ B」의 대우';
    expect(segments(t).filter((s) => s.id).map((s) => s.id)).toEqual(['sub', 'in']); // 끔 = 집합 기호만
    expect(segments(t, { prop: true }).filter((s) => s.id).map((s) => s.id)).toEqual(['prop', 'sub', 'in', 'contra']); // 켬 = 낱말도 (차례대로)
  });
});
