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
  it('보통 주소는 그대로 · 없는 rtdb 영상 = null · 앱 영상 이름 = 재생할 때 다시 찾음(앱 → 정식 사이트)', async () => {
    const S = { get: () => null } as never, f0 = globalThis.fetch;
    const has = new Set(['video/v11-49.mp4', 'https://garzondesne-dot.github.io/Citadel-MATH/assets/video/v12-60-v2.mp4']);
    globalThis.fetch = (async (u: string) => ({ ok: has.has(u), headers: { get: () => 'video/mp4' } })) as never;
    try {
      expect(await videoSrc(S, 'video/v11-49.mp4')).toBe('video/v11-49.mp4'); // 앱에 있음
      expect(await videoSrc(S, 'video/v12-60.mp4')).toBe('https://garzondesne-dot.github.io/Citadel-MATH/assets/video/v12-60-v2.mp4'); // 정식 꼬리 최신
      expect(await videoSrc(S, 'video/v99-99.mp4')).toBe(null); // 아무 데도 없음 = 「받지 못했어요」
      expect(await videoSrc(S, 'https://x.example/a.mp4')).toBe('https://x.example/a.mp4');
    } finally { globalThis.fetch = f0; }
    expect(await videoSrc(S, 'rtdb:prep/x/vid/none')).toBe(null);
  });
  it('zip 풀기 = .mp4 를 영상으로', async () => {
    const z = zipSync({ 'p.json': strToU8('{}'), 'v/a_v11-49.mp4': new Uint8Array([1, 2, 3]), 'c1.png': new Uint8Array([9]) });
    const u = await unpackZip(z);
    expect(u.videos.map((x) => x.name)).toEqual(['a_v11-49.mp4']);
    expect(u.images.map((x) => x.name)).toEqual(['c1.png']);
  });
});

// 🎬 13차시 영상 서고 (📜 2026-11-14 머리 🔨 · 13차시 = 베타 차시 팩만 · ex-13 video = v13-55 · 56 · 57) — 앱 video/ 에 있어야 팩 이름만으로 연결
import fsV13 from 'node:fs';
describe('🎬 13차시 영상', () => {
  it('v13-55 · 56 · 57 = public/video', () => { for (const f of ['v13-55', 'v13-56', 'v13-57']) expect(fsV13.statSync(`public/video/${f}.mp4`).size, f).toBeGreaterThan(100_000); });
});
