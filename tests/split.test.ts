// ✂ #149 6차시 = 문제 1~3 + 형성평가 1~3 · 7차시 = 문제 4~7 + 형성평가 4~6 (v1.0 만 · 글자 · 숫자 · 재도전 = 원래 번호 그대로)
import { describe, expect, it } from 'vitest';
import { packOf } from '../src/engine/packs';
import { SUBJ } from '../src/engine/subject';
import { bossItem, items, chainItems } from '../src/engine/lessons';
import { boardPack, itemCount } from '../src/board/board';
import { memoryStore } from '../src/store/device';
import { openRoom, roomPath } from '../src/raid/actions';
import { PROFILES } from '../src/model/profiles';
import type { Room, Store } from '../src/model/types';

const L6 = packOf('set-06')!, L7 = packOf('set-06@7')!, RAW = SUBJ.lessons.find((p) => p.id === 'set-06')!;
const n = (L: typeof L6) => { const S: Store = { ...memoryStore(), kind: 'memory' }; const B = boardPack(L); openRoom(S, B, 'X', PROFILES.board); return itemCount(B, S.get<Room>(roomPath('X'))!); };
describe('✂ 6 · 7차시 나누기 (#149)', () => {
  it('6차시 = 개념 · 문제 1 ~ 3 + 한 장 정리(c4) + 형성평가 3 · 7차시 = 문제 4 ~ 7 + 형성평가 3', () => {
    expect(L6.steps.map((s) => s.id)).toEqual(['c1', 'm1', 'c2', 'm2', 'c3', 'm3', 'c4', 'boss']);
    expect(L7.steps.map((s) => s.id)).toEqual(['u4', 'u5', 'u6', 'u7', 'boss']);
    expect([L6.boss!.items, L6.boss!.hpItems, L7.boss!.items, L7.boss!.hpItems]).toEqual([3, 3, 3, 3]);
  });
  it('형성평가 글자 = 원래 1 ~ 3 / 4 ~ 6 (첫 시도 · 재도전 모두 원래 번호)', () => {
    for (let i = 0; i < 3; i++) {
      expect(bossItem(L6, 's', i, 0)?.question).toBe(bossItem(RAW, 's', i, 0)?.question);
      expect(bossItem(L7, 's', i, 0)?.question).toBe(bossItem(RAW, 's', i + 3, 0)?.question);
      expect(bossItem(L7, 's', i, 2)?.question).toBe(bossItem(RAW, 's', i + 3, 2)?.question);
    }
  });
  it('게시판 소문제 수 · 제한 시간', () => {
    const per = (L: typeof L6) => L.steps.filter((s) => s.kind === 'monster').map((s) => `${s.id}:${L.monsters[s.id]?.chain ? chainItems(L, s.id, 'x', 0).length : items(L, s.id, 'x', 0).length}`).join(' ');
    console.log('6차시', per(L6), '+ 형성평가', L6.boss!.items, '=', n(L6), `(${n(L6) * 1.5}분)`, '| 7차시', per(L7), '+ 형성평가', L7.boss!.items, '=', n(L7), `(${n(L7) * 1.5}분)`);
    expect([n(L6), n(L7), n(L6) + n(L7)]).toEqual([12, 20, 32]); // 예전 6차시 한 판 32 = 두 판 합
  });
});
