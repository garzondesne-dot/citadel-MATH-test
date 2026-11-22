// 📡 게시판 던전 ↔ 게시판 (📜 요청 #48 · #51) — 방장 엔진 · 행동 · 상태 요약 · 방장 넘김 · 판 결과
import { describe, expect, it } from 'vitest';
import { HEROES } from '../src/model/hero';
import { tick } from '../src/board/atb/engine';
import { BOSSES } from '../src/board/atb/tune';
import { applyAct, atbResultFor, battleOf, decodeSnap, encodeSnap, lostSlots, NET, overwrite, pickHost, slotOf, type Meta } from '../src/board/atb/net';
const id = (n: string) => HEROES.find((h) => h.name === n)!.id;
const meta: Meta = { v: 1, pid: 'p1', lid: 'L2', no: 2, diff: 'normal', seed: 7, t0: 0, slots: [
  { uid: 's1_3_1', cls: '1-3', num: 1, hero: id('로안'), lv: 1, enh: 1, tier: 1 }, { uid: 's1_3_2', cls: '1-3', num: 2, hero: id('발도르'), lv: 1, enh: 1, tier: 1 },
  { uid: 's1_4_5', cls: '1-4', num: 5, hero: id('루멘'), lv: 1, enh: 1, tier: 1 }, { bot: 'normal', hero: id('누아') }] };
describe('ATB 게시판 연결 (요청 #48)', () => {
  it('같은 meta = 모든 폰 같은 첫 상태 · 자리 번호', () => {
    const A = battleOf(meta, BOSSES[2]!), B = battleOf(meta, BOSSES[2]!);
    expect(JSON.stringify(A)).toBe(JSON.stringify(B)); expect(A.heroes.length).toBe(4);
    expect([slotOf(meta, 's1_3_2'), slotOf(meta, 'x')]).toEqual([1, -1]);
  });
  it('행동 = 방장 엔진이 처리 · 상태 요약 왕복 = 같은 상태 (사건 마지막 40개)', () => {
    const H = battleOf(meta, BOSSES[2]!); H.heroes[1]!.atb = 1; H.heroes[2]!.ch = 1;
    expect(applyAct(H, { k: 'atk', s: 1, timing: 'ok' })).toBe(true);
    applyAct(H, { k: 'earn', s: 2, e: { done: false, perfect: false, right: true, miss: 1 } }); expect(H.heroes[2]!.ch).toBe(1.5);
    for (let i = 0; i < 300; i++) tick(H, 0.1);
    const sn = encodeSnap(H, 's1_3_1', 123, { s1_3_2: 1 }), R = decodeSnap(JSON.parse(JSON.stringify(sn)))!;
    expect(R.heroes.map((h) => h.hp)).toEqual(H.heroes.map((h) => h.hp)); expect(R.bossHp).toBe(H.bossHp); expect(R.evN).toBe(H.evN); expect(R.ev.length).toBeLessThanOrEqual(NET.evKeep);
    const L = battleOf(meta, BOSSES[2]!); overwrite(L, R); expect(L.bossHp).toBe(H.bossHp); expect(sn.ack).toEqual({ s1_3_2: 1 });
  });
  it('방장 넘김 = 지금 방장 끊기면(10초) 자리 순서 다음 사람 · 끊긴 자리 = 봇 이어받음', () => {
    const now = 100000, hb = { s1_3_1: now - 20000, s1_3_2: now - 1000, s1_4_5: now - 500 };
    expect(pickHost(meta, hb, now, 's1_3_1')).toBe('s1_3_2'); expect(pickHost(meta, hb, now, 's1_4_5')).toBe('s1_4_5');
    expect(lostSlots(meta, hb, now)).toEqual([0]); expect(pickHost(meta, {}, now, null)).toBe(null);
  });
});
describe('ATB 판 결과 = 공적 · 💎 · ⭐ 골고루 (요청 #51)', () => {
  const won = () => { const S = battleOf(meta, BOSSES[2]!); S.end = { win: true, why: '', t: 300 }; const g = S.heroes[0]!.log; g.right = 12; g.first = { ok: 10, bad: 0, none: 0, total: 10 }; g.blocks = 2; g.covers = 2; return S; };
  it('클리어 10 · 새 별 5 · 한 번에 맞힌 소문항 1 · 막기 2 · 💎 = 소문항 ×3(최대 30) · 클리어 10 · 수호 ×2(최대 10) · 새 별 +20', () => {
    const r = atbResultFor(won(), 0, { prevStars: 1 });
    expect(r.stars).toBe(3); expect(r.newStars).toBe(2);
    expect(r.merit).toEqual({ clear: 10, star: 10, first: 10, act: 4, role: 5 }); expect(r.meritSum).toBe(39); expect(r.mission).toBe(true);
    expect(r.gem).toEqual({ items: 30, clear: 10, guard: 8, star: 40 }); expect(r.gemSum).toBe(88); expect(r.acts).toEqual({ block: 2, rescue: 0, cut: 0, brk: 0, shd: 0 });
  });
  it('⭐3 다 모은 차시 = 공적 · 💎 절반 · 새 별 0 · 진 판 = 별 0', () => {
    const r = atbResultFor(won(), 0, { prevStars: 3 }); expect(r.full).toBe(true); expect(r.newStars).toBe(0);
    expect(r.merit).toEqual({ clear: 5, star: 0, first: 5, act: 2, role: 2 }); expect(r.gem).toEqual({ items: 15, clear: 5, guard: 4, star: 0 });
    const L = won(); L.end = { win: false, why: '쓰러짐', t: 200 }; expect(atbResultFor(L, 0, { prevStars: 0 }).stars).toBe(0);
  });
});
