// 📦 #82 같은 차시 = 바꾸기 · 병합 · 요약 · 휴지통 (11/19 상황: ex-11(열쇠 3 · 서술 0 · 그림 9) 위에 set-11(서술 있음 · 열쇠 0)을 올림)
import { describe, expect, it } from 'vitest';
import type { LessonPack, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { diffLine, mergePack, restoreTrash, sameNo, tally, toTrash, trashList } from '../src/school/packMerge';

const J = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const strip = (P: LessonPack) => { const v = J(P) as unknown as { monsters: Record<string, { first?: Record<string, unknown>[]; retry: { pool?: Record<string, unknown>[][] } }> }; for (const m of Object.values(v.monsters)) { for (const q of m.first || []) delete q.say; for (const p of m.retry.pool || []) for (const q of p) delete q.say; } return v as unknown as LessonPack; };
const Q = (t: string, say?: string) => ({ type: 'choice', question: t, choices: ['가', '나'], answerIndex: 0, ...(say ? { say } : {}) });
const MON = (id: string, say: boolean) => ({ title: id, sprite: 'mimic:0', first: [Q(`${id} 1`, say ? `${id} 풀이 1` : undefined), Q(`${id} 2`, say ? `${id} 풀이 2` : undefined)], retry: { pool: [0, 1, 2].map((v) => [Q(`${id} ${v}a`, say ? 's' : undefined), Q(`${id} ${v}b`, say ? 's' : undefined)]) } });
const PACK = (id: string, say: boolean): LessonPack => ({ v: 1, id, no: 11, title: '대우를 이용한 증명', unit: '명제', defaultPct: 90, steps: [{ id: 'm1', kind: 'monster', title: 'm1' }, { id: 'm2', kind: 'monster', title: 'm2' }, { id: 'boss', kind: 'boss', title: '형성평가' }], monsters: { m1: MON('m1', say), m2: MON('m2', say) }, boss: { items: 2, pool: [[Q('b1'), Q('b2')]] } } as unknown as LessonPack);
function scene() {
  const neu = { ...PACK('set-11', true), imgCells: ['review', 'c1'] } as LessonPack;
  const old = { ...strip(PACK('set-11', true)), id: 'ex-11', keys: [1, 2, 3].map((k) => ({ id: `k${k}`, name: `열쇠${k}`, help: '…', vers: [], uses: [] })), imgCells: ['review', 'c1', 'm1', 'c2', 'm2', 'm3', 'm4', 'recap', 'sum'] } as unknown as LessonPack;
  return { old, neu };
}
describe('📦 #82 같은 차시 = 바꾸기', () => {
  it('같은 no 의 다른 팩을 찾음 (자기 id · 평가 층 빼고)', () => {
    const { old, neu } = scene();
    expect(sameNo([old, neu, { ...old, id: 'eval-9' } as LessonPack], neu).map((x) => x.id)).toEqual(['ex-11']);
  });
  it('병합 = 원래 id · 열쇠 3 유지 · 서술은 새 것 · 그림 9칸 유지', () => {
    const { old, neu } = scene(), r = mergePack(old, neu), a = tally(old), b = tally(r.pack);
    expect(r.pack.id).toBe('ex-11'); expect(b.keys).toBe(3); expect(r.kept).toContain('keys');
    expect(a.say).toBe(0); expect(b.say).toBe(tally(neu).say); expect(b.say).toBeGreaterThan(0);
    expect(b.img).toBeGreaterThanOrEqual(9); expect(r.pack.imgCells).toEqual(expect.arrayContaining(old.imgCells!));
    const d = diffLine(a, b); expect(d.warn).toEqual([]); expect(d.text).toMatch(/🔑 열쇠 3 → 3\(유지\)/);
  });
  it('반대로 (서술 있는 팩 위에 서술 없는 파일) = 같은 모양이면 서술 칸은 원래 것을 채움', () => {
    const { neu } = scene(), had = { ...neu, id: 'ex-11' } as LessonPack, bare = strip(neu), r = mergePack(had, bare);
    expect(tally(r.pack).say).toBe(tally(had).say); expect(r.sameMon.length).toBeGreaterThan(0);
  });
  it('구조가 다르면 새 것 그대로 · 줄어드는 칸 = 경고', () => {
    const { old, neu } = scene(), n2 = J(neu); const m = Object.values(n2.monsters)[0]!; m.first = m.first!.slice(0, 1);
    const r = mergePack(old, n2); expect(r.newMon).toContain(Object.keys(n2.monsters)[0]);
    const w = diffLine(tally(old), tally({ ...r.pack, keys: [] } as LessonPack)).warn; expect(w.join()).toMatch(/열쇠 3 → 0/);
  });
  it('🗑 휴지통: 빼기 → 목록 → ↩ 되돌리기 (칸 그림까지) · 30일 지나면 비움', async () => {
    const S: Store = { ...memoryStore(), kind: 'memory' }, { old } = scene();
    S.set('prep/packs/ex-11', old); S.set('prep/ex-11', { img: { c1: 'data:image/webp;base64,AA' } });
    expect(await toTrash(S, 'ex-11', 'delete', 1000)).toBe(true); S.set('prep/packs/ex-11', null); S.set('prep/ex-11', null);
    const L = await trashList(S, 2000); expect(L).toHaveLength(1); expect(L[0]).toMatchObject({ id: 'ex-11', why: 'delete', no: 11 });
    expect((await restoreTrash(S, L[0]!.key, 3000))?.id).toBe('ex-11');
    expect(S.get<LessonPack>('prep/packs/ex-11')?.keys).toHaveLength(3); expect(S.get('prep/ex-11/img/c1')).toBe('data:image/webp;base64,AA');
    expect(await trashList(S, 4000)).toHaveLength(0);
    await toTrash(S, 'ex-11', 'replace', 5000); expect(await trashList(S, 5000 + 31 * 864e5)).toHaveLength(0);
  });
});

describe('🎬 영상 칸 병합 (🐞 11/23 14차시 v6)', () => {
  it('서버에 올린 같은 영상(rtdb:) = 새 파일의 video/ 이름이 덮지 않음 · 다른 영상 · 새 칸은 새 것', async () => {
    const { mergePack } = await import('../src/school/packMerge');
    const old = { id: 'ex-14', no: 14, steps: [], monsters: {}, videos: { c1: 'rtdb:prep/ex-14/vid/v14-58', c2: 'rtdb:prep/ex-14/vid/v14-59', c3: 'video/v14-60.mp4' } } as never;
    const neu = { id: 'ex-14', no: 14, steps: [], monsters: {}, videos: { c1: 'video/v14-58.mp4', c2: 'video/v14-70.mp4', c3: 'video/v14-60-v2.mp4', c5: 'video/v14-62.mp4' } } as never;
    const v = (mergePack(old, neu).pack as unknown as { videos: Record<string, string> }).videos;
    expect(v).toEqual({ c1: 'rtdb:prep/ex-14/vid/v14-58', c2: 'video/v14-70.mp4', c3: 'video/v14-60-v2.mp4', c5: 'video/v14-62.mp4' });
  });
});
