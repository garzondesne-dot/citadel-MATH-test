// 📜 #98-b 게시판 던전 = 원래 컨셉 몬스터 (2 ~ 11) · 12 · 13 설정표 그림 · 14 ~ 17 임시 · 5동작 시트 자동 전환
import { describe, expect, it } from 'vitest';
import { bossOf, type Diff } from '../src/board/atb/tune';
import { bossArt, CM5_OF } from '../src/ui/board/atb/rdunBoss';
import { SHEETS } from '../src/ui/manifest';

const DIFFS: Diff[] = ['easy', 'normal', 'hard'];
describe('📜 #98-b 컨셉 몬스터', () => {
  it('2 ~ 11 = 설정표 sprite · flip 그대로 · 세 난이도 같은 보스 · 배경 = 차시 던전', () => {
    for (let no = 2; no <= 11; no++) {
      const c = bossOf(no), a = DIFFS.map((d) => bossArt(c, d, 'theme-x'));
      for (const x of a) { expect(x.sprite, `${no}차시`).toBe(c.sprite); expect(x.flip ?? {}).toEqual(c.flip ?? {}); expect(x.bg).toBe('theme-x'); }
      expect(SHEETS[c.sprite.split(':')[0]!], `${no}차시 시트 ${c.sprite}`).toBeTruthy();
    }
  });
  it('차시 배경이 없으면 = 랜덤 던전 배경', () => { expect(bossArt(bossOf(2), 'normal').bg).toBeTruthy(); });
  it('12 · 13 = 설정표 그림(d08:2 · d09:3) 세 난이도 같음 · 14 ~ 17 = 난이도별 임시 그대로', () => {
    for (const d of DIFFS) { expect(bossArt(bossOf(12), d).sprite).toBe('d08:2'); expect(bossArt(bossOf(13), d).sprite).toBe('d09:3'); }
    expect(new Set(DIFFS.map((d) => bossArt(bossOf(14), d).sprite)).size).toBe(3);
  });
  it('5동작 시트(cols 5)가 들어오면 = 그 줄 · 반전 없음 · 없으면 그대로', () => {
    const was = SHEETS['cm5-a'];
    try {
      SHEETS['cm5-a'] = { src: 'x.webp', cols: 5, rows: 5, cell: 256, poses: { idle: 0, idleB: 1, attack: 2, hit: 3, down: 4 }, names: ['흑표범', '보라 드래곤', '서리 늑대', '미노타우로스', '청록 드래곤'] };
      const a = bossArt(bossOf(2), 'hard'); expect(a.sprite).toBe('cm5-a:0'); expect(a.flip).toEqual({});
      expect(bossArt(bossOf(7), 'normal').sprite).toBe('cm5-a:4');
      expect(bossArt(bossOf(8), 'normal').sprite).toBe(bossOf(8).sprite); // cm5-b 아직 없음
    } finally { if (was) SHEETS['cm5-a'] = was; else delete SHEETS['cm5-a']; }
    expect(Object.keys(CM5_OF).map(Number)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});
