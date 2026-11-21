// ⚡ #83 용사별 각성 (📜 2026-11-20 선생님 · 메타인지 8) — 조건 4 · 전용 칭호 30 · 모습 id · 학교판 연성 막음
import { describe, expect, it } from 'vitest';
import { AWAKEN_T, AWK_NEED, awakenBlocked, awakenChecks, awkId, awkTitle, attrOf, baseOf, famOfHero, heroOf, HEROES, isAwakened, isBlond, lookId, setCraftOn, titleOf } from '../src/model/hero';
import { earnedFrom, statsOf } from '../src/model/titles';

const full = (h: number) => ({ hero: h, enh: 10, fx: famOfHero(h).ids[3], title: awkTitle(h) });

describe('⚡ 각성 조건 4', () => {
  it('학생 용사 31명 모두 전용 칭호가 있음 (로안 = 만 번째 베기)', () => {
    const ids = HEROES.map((h) => h.id).sort((a, b) => a - b);
    expect(ids.filter((h) => !awkTitle(h))).toEqual([]);
    expect(Object.keys(AWAKEN_T)).toHaveLength(30);
    expect(awkTitle(0)).toBe('slash10k');
    for (const h of ids) expect(titleOf(awkTitle(h)!)).not.toBeNull();
  });
  it('네 칸이 다 맞을 때만 각성 · 하나라도 빠지면 원래 모습', () => {
    for (const h of HEROES.map((x) => x.id)) {
      const p = full(h);
      expect(isAwakened(p)).toBe(true);
      expect(lookId(p)).toBe(awkId(h));
      expect(baseOf(lookId(p))).toBe(h);
      for (const k of ['enh', 'fx', 'title'] as const) {
        const q = { ...p, [k]: k === 'enh' ? 9 : 'x' };
        expect(isAwakened(q)).toBe(false); expect(lookId(q)).toBe(h);
      }
    }
  });
  it('남의 칭호 · 남의 Ⅳ 는 안 됨', () => {
    expect(isAwakened({ ...full(18), title: awkTitle(8) })).toBe(false);
    expect(awakenChecks({ ...full(18), hero: 8 }, 18).find((c) => c.k === 'hero')!.ok).toBe(false);
  });
  it('로안 = 옛 각성한 로안(16) 그대로', () => {
    expect(lookId({ hero: 0, enh: 10, fx: 'twin', title: 'slash10k' })).toBe(16);
    expect(isBlond({ hero: 0, enh: 10, fx: 'twin', title: 'slash10k' })).toBe(true);
    expect(heroOf(16).sprite).toBe('hero-blond-v7.webp');
  });
  it('모습 id → 속성 · 이름 · 그림 (그림 없는 용사 = 원래 그림)', () => {
    expect(attrOf(118)).toBe('dark'); expect(heroOf(118).name).toBe('각성한 녹스');
    expect(heroOf(118).sprite).toBe('hero-dknight-awk-v8.webp');
    expect(heroOf(101).sprite).toBe('hero-witch-awk-v8.webp'); // 🔨 #44 각성 GPT 시트
    expect(heroOf(132).sprite).toBe(heroOf(32).sprite); // 칸델 = 아직 그림 없음 → 원래 그림
    expect(heroOf(101).name).toBe('각성한 누아');
  });
  it('🚫 모루 꺼진 판 = 연성 용사(리라 · 타미 · 마진) 각성 막음', () => {
    setCraftOn(() => false);
    try {
      for (const h of [11, 15, 29]) { expect(awakenBlocked(h)).toBe(true); expect(isAwakened(full(h))).toBe(false); }
      expect(awakenBlocked(18)).toBe(false); expect(isAwakened(full(18))).toBe(true);
    } finally { setCraftOn(() => true); }
  });
});

describe('🏅 전용 칭호 = 기록 하나 ≥ 기준 (소급)', () => {
  const rec = (o: Record<string, unknown>) => ({ records: { a: o } });
  it('기준 표 = 11/20 운영 읽기 값', () => expect(AWK_NEED).toEqual({ str: 170, grit: 35, focus: 20, brave: 7, explore: 30, craft: 20 }));
  it('🎯 집중 20 퍼펙트 = 누아 · 19 = 아님', () => {
    expect(earnedFrom(rec({ perfects: 20 }))).toContain('awk_1');
    expect(earnedFrom(rec({ perfects: 19 }))).not.toContain('awk_1');
  });
  it('⚔ 힘 = 피해 합 (conc 첫 칸 + boss)', () => {
    const d = rec({ conc: { m1: [100, 3], m2: [50, 2] }, boss: 20 });
    expect(statsOf(d).str).toBe(170); expect(earnedFrom(d)).toContain('awk_5');
  });
  it('👑 용기 = 이긴 수업 7', () => {
    const d = { records: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`r${i}`, { won: true }])) };
    expect(earnedFrom(d)).toContain('awk_18');
  });
  it('⚒ 연성 = 카드 20 · 🧭 탐험 = 도전 30', () => {
    expect(earnedFrom({ cards: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`c${i}`, true])) })).toContain('awk_11');
    expect(earnedFrom({ bonus: { 'ex-1': { m1: { tries: 30 } } } as never })).toContain('awk_3');
  });
  it('바르코 = 🏆 업적 3', () => {
    const b = { 'ex-1': { boss: { clear: true } }, 'ex-2': { boss: { clear: true } }, 'ex-3': { boss: { clear: true } } };
    expect(earnedFrom({ bonus: b as never })).toContain('awk_13');
    expect(earnedFrom({ bonus: { 'ex-1': b['ex-1'] } as never })).not.toContain('awk_13');
  });
});

describe('⚡ A3 각성 필살기 연출 34', () => {
  it('학생 용사 31명 모두 연출 열쇠 있음 · 로안 = blond · 각성 아니면 없음', async () => {
    const { awkKey, AWK_VFX, AWK_TINT } = await import('../src/ui/fx/awkfx');
    expect(Object.keys(AWK_VFX)).toHaveLength(34);
    for (const h of HEROES.map((x) => x.id)) expect(awkKey(awkId(h)), `용사 ${h}`).not.toBeNull();
    expect(awkKey(16)).toBe('blond'); expect(awkKey(118)).toBe('dknight'); expect(awkKey(18)).toBeNull();
    expect(Object.keys(AWK_TINT).sort()).toEqual(['dknight', 'frost', 'hacker', 'merchant']);
  });
});

describe('⚡ #44 각성 GPT 시트 29명 (칸델 빼고)', () => {
  it('그림 · 숨쉬기 파일이 있고 칸 크기 = 원래 시트와 같음', async () => {
    const fs = await import('node:fs'); const path = await import('node:path');
    const { AWK_ART, AWK_HAVE } = await import('../src/model/hero');
    const idle = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/ui/idle8-hd-map.json'), 'utf8')) as Record<string, string>;
    expect(AWK_HAVE.length).toBe(29);
    for (const id of AWK_HAVE) {
      const f = AWK_ART[id]!; expect(f).toMatch(/-awk-v8\.webp$/);
      expect(fs.existsSync(path.join(__dirname, '../public/art/heroes', f))).toBe(true);
      expect(idle[f]).toBeTruthy(); expect(fs.existsSync(path.join(__dirname, '../public/art/heroes', idle[f]!))).toBe(true);
    }
  });
});
