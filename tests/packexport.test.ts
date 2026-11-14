import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { exportName, exportPack, packJson } from '../src/school/packExport';
import type { LessonPack } from '../src/model/types';

const L = { v: 1, id: 'set-10', no: 10, title: '시험', unit: '', defaultPct: 90, steps: [{ id: 'c1', kind: 'concept', title: '개념 1' }, { id: 'c2', kind: 'concept', title: '개념 2' }], monsters: {}, videos: { c1: 'video/a.mp4', c2: 'video/b.mp4' }, partOf: 'x', imgOf: 'y', source: { file: 'f', commit: '' } } as unknown as LessonPack;
const S = { get: () => null, set: () => {}, watch: () => () => {}, now: () => 0 } as never;

describe('📦 차시 팩 내려받기 (zip · 📜 2026-11-14)', () => {
  it('파일 이름 = (NN차시) 차시팩_YYYYMMDD.zip (한국 날짜)', () => { expect(exportName(L, Date.UTC(2026, 10, 14, 16, 0))).toBe('(10차시) 차시팩_20261115.zip'); });
  it('앱 차시 = id ex-NN · 나눈 차시 · 빌린 그림 칸 지움', () => { const p = packJson(L, true, ['c1'], {}) as LessonPack & Record<string, unknown>; expect(p.id).toBe('ex-10'); expect(p.partOf).toBeUndefined(); expect(p.imgOf).toBeUndefined(); expect(p.imgCells).toEqual(['c1']); expect(p.videos).toBeUndefined(); });
  it('20MB 넘으면 큰 영상부터 빼고 한 줄 · 뺀 영상은 주소 그대로', async () => {
    const big = (n: number) => new Uint8Array(n * 1048576);
    const r = await exportPack(S, L, true, 0, async (u) => (u.endsWith('a.mp4') ? big(8) : big(13)));
    expect(r.vids).toBe(1); expect(r.dropped.n).toBe(1); expect(r.note).toMatch(/영상 1편 뺐어요\(13\.0MB/);
    const z = unzipSync(r.bytes), J = JSON.parse(strFromU8(z['ex-10.json']!));
    expect(Object.keys(z).sort()).toEqual(['README.txt', 'a.mp4', 'ex-10.json']);
    expect(J.videos).toEqual({ c1: 'video/a.mp4', c2: 'video/b.mp4' });
    expect(strFromU8(z['README.txt']!)).toMatch(/영상 1편\(13\.0MB\)을 뺐어요/);
  });
});
