// 🐞 11/25 정식 b243 수업: 🏁 땅따먹기 학생 안 움직임 · 🥏 알까기 화면 안 뜸 — 진짜 서버(Firebase)는 빈 {} · [] 를 저장하지 않고 배열 빈칸(null)을 뺌
//   이 기기 시험(메모리)은 그대로 둬서 못 잡았음 → 서버처럼 「빈 것 빼기」를 거친 값으로 판을 끝까지 돌려 봄
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import { startFun, lgGo, lgJoin, lgDir, akJoin, akShoot, funOf } from '../src/rest/run';
import * as run from '../src/rest/run';

/** Firebase 저장 흉내: 빈 객체 · 빈 배열 = 없음 · 배열 안 null = 빠짐(배열 → 객체) */
export function fbRound(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) {
    const out: Record<string, unknown> = {}; let hole = false;
    v.forEach((x, i) => { const y = fbRound(x); if (y == null) hole = true; else out[i] = y; });
    const ks = Object.keys(out); if (!ks.length) return null;
    return hole ? out : ks.map((k) => out[k]);
  }
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as object)) { const y = fbRound(x); if (y != null) out[k] = y; }
    return Object.keys(out).length ? out : null;
  }
  return v;
}
function fbStore() {
  const S = memoryStore(); const set0 = S.set.bind(S);
  (S as { set: (p: string, v: unknown) => void }).set = (p, v) => set0(p, fbRound(JSON.parse(JSON.stringify(v ?? null))));
  return S;
}
function room(S: ReturnType<typeof memoryStore>, code: string, n: number) {
  const now = S.now();
  const players: Record<string, unknown> = {};
  for (let i = 1; i <= n; i++) players[`s1_3_${i}`] = { num: i, nick: `학생${i}`, seen: now, cls: '1-3' };
  S.set(`rooms/${code}`, { meta: { lesson: 'set-07', cls: '1-3' }, state: { step: 0, rest: true, started: now }, players });
}
let fake = 0;
const tickFor = (S: ReturnType<typeof memoryStore>, code: string, ms: number, each?: (f: unknown) => void) => {
  const clock = S as unknown as { now: () => number; __f?: boolean }; if (!clock.__f) { fake = clock.now(); clock.now = () => fake; clock.__f = true; }
  const t0 = fake; const errs: string[] = [];
  for (; fake < t0 + ms; fake += 150) {
    for (const u of Object.keys(S.get<Record<string, unknown>>(`rooms/${code}/players`) || {})) S.set(`rooms/${code}/players/${u}/seen`, fake);
    try { (run as unknown as { tick: (S: unknown, c: string, me: string) => boolean }).tick(S, code, 'tv'); } catch (e) { errs.push(String(e)); }
    each?.(funOf(S.get(`rooms/${code}`)));
  }
  return errs;
};

describe('🐞 쉼터 놀이 = 진짜 서버 저장 꼴(빈 것 빠짐)에서도 돌아감', () => {
  it('🏁 땅따먹기: 참가 → 출발 → 턴이 넘어가고 말이 움직임', () => {
    const S = fbStore(), code = '683809'; room(S, code, 6);
    expect(startFun(S, code, S.get(`rooms/${code}`) as never, 'lg' as never, { no: 7, me: 'tv' })).toBeNull();
    const g = (funOf(S.get(`rooms/${code}`)) as { g: number }).g;
    for (let i = 1; i <= 6; i++) lgJoin(S, code, g, `s1_3_${i}`);
    lgGo(S, code);
    const errs = tickFor(S, code, 20000);
    const f = funOf(S.get(`rooms/${code}`)) as unknown as { phase: string; turn: number; pos?: Record<string, [number, number]> };
    console.log('lg', f?.phase, f?.turn, errs.slice(0, 3));
    expect(errs).toEqual([]);
    expect(['pick', 'move']).toContain(f.phase);
    const p0 = JSON.stringify(f.pos);
    for (let i = 1; i <= 6; i++) lgDir(S, code, g, f.turn, `s1_3_${i}`, 3);
    const e2 = tickFor(S, code, 12000);
    const f2 = funOf(S.get(`rooms/${code}`)) as unknown as { turn: number; pos?: Record<string, [number, number]> };
    console.log('lg2', f2.turn, e2.slice(0, 3));
    expect(e2).toEqual([]);
    expect(f2.turn).toBeGreaterThan(f.turn);
    expect(JSON.stringify(f2.pos)).not.toBe(p0);
  });
  it('🥏 알까기: 참가 → 출발 → 판이 돌아감 · 폰 화면 값 깨지지 않음', () => {
    const S = fbStore(), code = '683810'; room(S, code, 6);
    expect(startFun(S, code, S.get(`rooms/${code}`) as never, 'ak' as never, { no: 7, me: 'tv' })).toBeNull();
    const g = (funOf(S.get(`rooms/${code}`)) as { g: number }).g;
    for (let i = 1; i <= 6; i++) akJoin(S, code, g, `s1_3_${i}`);
    lgGo(S, code);
    const errs = tickFor(S, code, 8000);
    const f = funOf(S.get(`rooms/${code}`)) as unknown as { phase: string; st?: Record<string, unknown> };
    console.log('ak', f?.phase, Object.keys(f?.st || {}).length, errs.slice(0, 3));
    expect(errs).toEqual([]);
    expect(f.phase).toBe('play');
    akShoot(S, code, g, 's1_3_1', { a: 0.5, p: 1, n: 1 } as never);
    expect(tickFor(S, code, 3000)).toEqual([]);
  });
});
