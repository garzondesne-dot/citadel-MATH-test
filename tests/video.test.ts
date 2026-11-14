import { describe, expect, it } from 'vitest';
import { matchVideos, vidBytes, vidDoc, vidKey, vidPath, videoSrc, isRtdb } from '../src/school/video';
import { unpackZip } from '../src/school/packUpload';
import { zipSync, strToU8 } from 'fflate';

describe('🎬 영상 (zip 안 mp4 → 서버 · 📜 2026-11-14)', () => {
  it('쪼개 넣고 다시 합치면 같은 바이트 (75만 바이트 경계 넘음)', () => {
    const b = new Uint8Array(1_600_003).map((_, i) => (i * 31 + 7) & 255);
    const d = vidDoc(b);
    expect(d.n).toBe(3);
    expect((d.c as string[]).every((x) => x.length <= 1_000_000)).toBe(true);
    const same = (x: Uint8Array) => Buffer.from(x).equals(Buffer.from(b));
    expect(same(vidBytes(d))).toBe(true);
    // Firebase 가 배열을 객체로 돌려줘도
    expect(same(vidBytes({ ...d, c: Object.fromEntries((d.c as string[]).map((x, i) => [String(i), x])) }))).toBe(true);
  });
  it('서버 칸 이름 = 못 쓰는 글자 바꿈', () => {
    expect(vidKey('folder/(11차시) 49_v11-49.mp4')).toBe('(11차시)_49_v11-49');
    expect(vidPath('lesson-11', 'a.b.mp4')).toBe('prep/lesson-11/vid/a_b');
    expect(isRtdb('rtdb:prep/x/vid/y')).toBe(true);
    expect(isRtdb('video/v11-49.mp4')).toBe(false);
  });
  it('이름 끝맞춤: 팩 video 칸 파일 → at 칸들 · 없으면 단계 칸 이름', () => {
    const m = matchVideos(['(11차시) 49_v11-49.mp4', 'v11-50.mp4', '정리_c3.mp4', 'xm1.mp4', '모름.mp4'], [{ file: 'v11-49', at: ['c1', 'm1'] }, { file: 'v11-50', at: ['c2'] }], ['c1', 'm1', 'c2', 'c3', 'm1x']);
    expect(m.map).toEqual({ c1: '(11차시) 49_v11-49.mp4', m1: '(11차시) 49_v11-49.mp4', c2: 'v11-50.mp4', c3: '정리_c3.mp4' });
    expect(m.unused).toEqual(['xm1.mp4', '모름.mp4']); // 「xm1」 = 구분자 없이 붙음 → 아님
  });
  it('보통 주소는 그대로 · 없는 rtdb 영상 = null', async () => {
    const S = { get: () => null } as never;
    expect(await videoSrc(S, 'video/v11-49.mp4')).toBe('video/v11-49.mp4');
    expect(await videoSrc(S, 'rtdb:prep/x/vid/none')).toBe(null);
  });
  it('zip 풀기 = .mp4 를 영상으로', async () => {
    const z = zipSync({ 'p.json': strToU8('{}'), 'v/a_v11-49.mp4': new Uint8Array([1, 2, 3]), 'c1.png': new Uint8Array([9]) });
    const u = await unpackZip(z);
    expect(u.videos.map((x) => x.name)).toEqual(['a_v11-49.mp4']);
    expect(u.images.map((x) => x.name)).toEqual(['c1.png']);
  });
});
