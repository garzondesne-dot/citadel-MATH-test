// 🐞 11/19 수업 버그 (11차시 · 1-5반) — ② 명단 받기 전 가짜 이름 · ③ 🎬 영상 중 효과음
import { describe, expect, it } from 'vitest';
import { roster, rosterReady } from '../src/school/school';
import type { Store } from '../src/model/types';

const mk = (kind: Store['kind'], data: Record<string, unknown>): Store => ({ kind, get: <T>(p: string) => (data[p] ?? null) as T | null, set: () => {}, watch: () => () => {}, now: () => 0 });

describe('② 명단 받기 전', () => {
  it('서버 + 명단 없음 = 아직 아님 (가짜 이름을 보여 주지 않음)', () => {
    expect(rosterReady('1-1', mk('server', {}))).toBe(false);
  });
  it('서버 + 가린 명단이 오면 준비됨 · 진짜 번호만', () => {
    const S = mk('server', { 'rosterMask/1-1': { 15: '김*수' } });
    expect(rosterReady('1-1', S)).toBe(true);
    expect(roster('1-1', S).map((p) => p.num)).toEqual([15]);
  });
  it('이 기기 체험 모드 = 늘 준비됨 (가짜 이름 목록 그대로)', () => {
    expect(rosterReady('1-1', mk('device', {}))).toBe(true);
    expect(roster('1-1', mk('device', {})).length).toBeGreaterThan(0);
  });
});

describe('③ 🎬 영상 동안 효과음 끔', () => {
  it('hush 가 켜지면 소리 칸은 기록만 하고 내지 않음 · 끄면 되돌림', async () => {
    const m = await import('../src/ui/sound.svelte');
    m.hush('tv-video', true); expect(m.hushed()).toBe(true);
    m.hush('tv-video', false); expect(m.hushed()).toBe(false);
  });
});

describe('② 받았는데 비어 있는 반', () => {
  it('서버가 「받음」이라고 하면 예전처럼 이름표 목록 (명단을 안 올린 반 · 에뮬레이터 시험)', () => {
    const S = { ...mk('server', {}), loaded: (p: string) => p === 'rosterMask/1-9' };
    expect(rosterReady('1-9', S)).toBe(true);
    expect(rosterReady('1-1', S)).toBe(false);
  });
});

// ── ④ 조건 해금 용사 · 업적 이펙트 (옛 정식 looks() · chalProgress()) ──
import { cardNeed, heroUnlock, statsOf } from '../src/model/heroUnlock';
import { PACKS } from '../src/engine/packs';
import { ownsSkill, emptyPlan } from '../src/model/draft';
import { ladder } from '../src/model/hero';
describe('④ 조건 해금', () => {
  const les = PACKS.filter((L) => L.no && !L.id.startsWith('eval-') && !L.partOf && L.boss);
  it('빈 기록 = 아무것도 안 열림 · 진행 0', () => {
    const u = heroUnlock({});
    expect(u.open).toEqual([]);
    expect(u.chal[28]).toEqual({ n: 0, need: 10 });
    expect(u.chal[27]).toEqual({ n: 0, need: 3 });
    expect(u.chal[33]).toEqual({ n: 0, need: 15 });
  });
  it('🏰 콤파 = 성채 방 10개 (9개 = 9 / 10 · 10개 = 열림)', () => {
    const room = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`q${i}`, { clear: true }]));
    expect(heroUnlock({ bonus: { 'eval-1': room(9) } }).chal[28]).toEqual({ n: 9, need: 10 });
    expect(heroUnlock({ bonus: { 'eval-1': room(6), 'eval-2': room(4) } }).open).toContain(28);
  });
  it('👑 아바쿠 = 형성평가 만점 서로 다른 차시 3', () => {
    const recs = Object.fromEntries(les.slice(0, 3).map((L) => [L.id, { boss: L.boss!.hpItems ?? L.boss!.items, bossN: L.boss!.hpItems ?? L.boss!.items }]));
    const u = heroUnlock({ records: recs });
    expect(u.chal[27]!.n).toBe(3); expect(u.open).toContain(27);
    expect(u.open).toContain(9); // 🎁 바루 = 수업 기록이 하나라도
  });
  it('📚 발도르 = 1~3차시 카드(부분집합의 개수 뺌) 다 모으면 무료', () => {
    const need = cardNeed(8); expect(need.length).toBeGreaterThan(0); expect(need).not.toContain('subcount');
    expect(heroUnlock({ cards: Object.fromEntries(need.slice(1).map((k) => [k, 1])) }).open).not.toContain(8);
    expect(heroUnlock({ cards: Object.fromEntries(need.map((k) => [k, 1])) }).open).toContain(8);
  });
  it('✨ 업적 1 · 2 개 = Ⅲ 이펙트 두 개 · 가진 것으로(아래 칸도)', () => {
    const u = heroUnlock({ bonus: { [les[0]!.id]: { boss: { clear: true } }, [les[1]!.id]: { boss: { clear: true } } } });
    expect(u.seals).toBe(2); expect(u.fx).toHaveLength(2);
    const fx = u.fx[0]!, hero = [...Array(40).keys()].find((h) => { try { return ladder(h).includes(fx); } catch { return false; } });
    if (hero != null) { const W = { gem: 0, scroll: 0, buys: [] } as never; expect(ownsSkill(W, emptyPlan(), hero, fx)).toBe(false); expect(ownsSkill(W, emptyPlan(), hero, fx, u.fx)).toBe(true); }
  });
  it('📊 상태창 = 기록에서 셈', () => {
    expect(statsOf({ records: { a: { boss: 3, fixed: 2, perfects: 1, won: true } }, cards: { x: 1 } })).toMatchObject({ str: 3, grit: 2, focus: 1, brave: 1, craft: 1 });
  });
});

describe('🗿 석화 중 맞힘 토스트 (11/19)', () => {
  it('돌려준 값 > 0 일 때만 「🗿 💎 +n (캠프에서 받기)」', async () => {
    const { petriToast, showPetri } = await import('../src/ui/q/petriPop.svelte');
    showPetri(0); expect(petriToast.msg).toBe('');
    showPetri(2); expect(petriToast.msg).toBe('🗿 💎 +2 (캠프에서 받기)');
  });
});

describe('🚨 ⓪ 반쪽 방 (state · meta 없는 rooms/{코드})', () => {
  it('stepIdx · focusOn · deadline 이 멈추지 않음', async () => {
    const r = await import('../src/raid/raid');
    const H = { players: { s1_1_3: { n: 1 } } } as never;
    expect(r.stepIdx(H)).toBe(-1); expect(r.focusOn(H)).toBe(false); expect(r.restOn(H)).toBe(false); expect(r.deadline(H)).toBe(null);
  });
});
