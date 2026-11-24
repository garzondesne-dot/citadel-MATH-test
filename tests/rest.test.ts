// 🏕 쉼터 놀이 (#142): 정식 시험(tests/fun.test.js · nunchi.test.js 원문)을 우리 판 코드(src/rest)로 그대로 돌림 + 진행 층(run.ts) 한 바퀴
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as Fun from '../src/rest/fun';
import * as Nun from '../src/rest/nunchi';
import FUNQ from '../src/rest/funq.json';
import { SUBJ } from '../src/engine/subject';
import { memoryStore } from '../src/store/device';
import { heartbeat, nextStep, openRoom, roomPath, setFocus } from '../src/raid/actions';
import { endRest, funOf, payFun, pick, restOn, startFun, tick, type AnyFun } from '../src/rest/run';
import { packOf } from '../src/engine/packs';
import { PROFILES } from '../src/model/profiles';
import type { Room, Store } from '../src/model/types';

// ⏱ #44 ⑨ 판정 = 마감 + 0.5초 → 정식 시험(마감 순간 판정)은 그 0.5초를 더해 돌림
const DS = { Fun: { ...Fun, step: (f: Fun.Fun | null, v: Record<string, string> | null, now: number) => Fun.step(f, v, f && now >= f.to ? now + Fun.LATE : now) }, FunQ: FUNQ, FunOX: { list: SUBJ.funOx }, Nunchi: { step: (f: Nun.Nun, p: Record<string, number> | null, now: number, c: Record<string, { e: string; at: number }> | null) => Nun.stepNun(f, p, now, c) } };
function runOfficial(file: string, fix: (src: string) => string) {
  const out: string[] = [], bad: string[] = [];
  const log = (...a: unknown[]) => { const t = a.join(' '); (t.startsWith('FAIL') ? bad : out).push(t); };
  const src = fix(readFileSync(new URL(`./official/rest/${file}`, import.meta.url), 'utf8'));
  runInNewContext(src, { require: (m: string) => (m === './load' ? () => DS : require(m)), console: { log, error: log }, process: { exit: (c: number) => { if (c) bad.push(`exit ${c}`); } }, DS_: DS, __dirname: '.', Object, Array, Math, JSON, Set, String, Number });
  return { out, bad };
}

describe('정식 시험 그대로 (src/rest 판)', () => {
  it('⚖ 밸런스 · 🔄 반대로 · ⭕ 수학 OX · OX 타임 (tests/fun.test.js)', () => {
    const r = runOfficial('fun.test.js', (s) => s);
    // 📜 #46 반대로 = 3명 이하에서 가위바위보 → 정식 「5명 = 가위바위보」 줄만 다름 (아래 새 시험이 대신)
    expect(r.bad.filter((b: string) => !/반대로: 6명 = 그대로 · 5명 = 가위바위보/.test(b) && !/💤|관전|다시 참여/.test(b) && b !== 'exit 1')).toEqual([]); // 📜 11/24 (DECISIONS 6849e1e) 안 고른 학생 = 탈락 · 다시 참여 없음 → 정식 「💤 관전 · 다시 참여」 줄 4개 다름 (아래 새 시험)
    expect(r.out.join('\n')).toMatch(/OK: 밸런스 게임/);
  });
  it('🙊 눈치 게임 (tests/nunchi.test.js)', () => {
    const r = runOfficial('nunchi.test.js', (s) => s.replace(/const vm = require[\s\S]*?const NU = ctx\.DS\.Nunchi;/, 'const NU = DS_.Nunchi;'));
    // 📜 11/17 ⓕ 선생님 A = 이번 게임에서 한 번도 안 누른 학생은 「마지막!」 탈락 대신 💤 관전 → 정식 시험의 「안 누른 d = 마지막 탈락」 줄만 다름 (아래 새 시험이 대신)
    expect(r.bad.filter((b: string) => !/마지막 탈락/.test(b) && !/관전|💤|zz|다시|🙋/.test(b) && b !== 'exit 1')).toEqual([]); expect(r.bad.filter((b: string) => /^FAIL/.test(b)).length).toBeLessThanOrEqual(4); // 📜 11/24 관전 · 다시 참여 줄 (위에서 내용 거름)
    expect(r.out.join('\n')).toMatch(/✅ 눈치 게임|❌ 눈치 게임 실패 [1-4]$/); // 📜 11/24 (DECISIONS 6849e1e) 🙋 다시 참여 없앰 = 정식 「다시 참여」 줄도 다름 (아래 새 시험) // ⓕ 실패 1 = 위 「마지막 탈락」 줄
  });
});

function setup(n = 4) {
  const base = memoryStore();
  let t = 1_000_000;
  const S: Store & { tick: (ms: number) => void } = { ...base, kind: 'memory', get: base.get, set: base.set, watch: base.watch, now: () => t, tick: (ms) => { t += ms; } };
  const L = packOf(SUBJ.defaultLesson)!;
  openRoom(S, L, 'T', PROFILES.test);
  const uids = Array.from({ length: n }, (_, k) => `u${k + 1}`);
  uids.forEach((u, k) => heartbeat(S, 'T', u, k + 1, `학생 ${k + 1}`));
  nextStep(S, L, 'T');
  const R = () => S.get<Room>(roomPath('T')) as Room;
  return { S, L, R, uids };
}

describe('진행 층 (run.ts)', () => {
  it('🏕 켜기 → ⚖ 시작 → 고름 → 판정 → 💤 → 끝 · 보상 한 번 · 쉼터 끝', () => {
    const { S, L, R, uids } = setup(7);
    restOn(S, 'T', R(), 7);
    expect(R().state.rest?.min).toBe(7);
    expect(S.get('school/teacher/restMin')).toBe(7);
    expect(startFun(S, 'T', R(), 'bal', { no: L.no, me: 'tv' })).toBeNull();
    let f = funOf(R()) as unknown as Fun.Fun;
    expect(f.phase).toBe('pick'); expect(f.total).toBe(7);
    // 7명(가위바위보 아님): u1 · u2 · u5 · u6 = a, u3 = b, u4 · u7 안 고름(💤)
    ['u1', 'u2', 'u5', 'u6'].forEach((u) => pick(S, 'T', f.rk, u, 'a')); pick(S, 'T', f.rk, 'u3', 'b');
    S.tick(15000 + Fun.LATE); tick(S, 'T', 'tv');
    f = funOf(R()) as unknown as Fun.Fun;
    expect(f.phase).toBe('show');
    expect(Object.keys(f.alive).sort()).toEqual(['u1', 'u2', 'u5', 'u6']); // 적은 쪽(u3) 탈락 · u4 · u7 안 고름 = 탈락 (📜 11/24)
    expect(f.zz?.u4).toBeUndefined(); expect([f.outAt.u3, f.outAt.u4, f.outAt.u7]).toEqual([1, 1, 1]);
    S.tick(Fun.SHOW); tick(S, 'T', 'tv');
    f = funOf(R()) as unknown as Fun.Fun;
    expect(f.rps).toBe(true); // 4명 = ✊✌️✋ 선생님과 가위바위보
    const h = Fun.tHand(f.g, f.n), lose = { a: 'b', b: 'c', c: 'a' }[h]!, win = { a: 'c', b: 'a', c: 'b' }[h]!;
    pick(S, 'T', f.rk, 'u1', win); pick(S, 'T', f.rk, 'u2', win); pick(S, 'T', f.rk, 'u5', lose); pick(S, 'T', f.rk, 'u6', lose);
    S.tick(15000 + Fun.LATE); tick(S, 'T', 'tv'); S.tick(Fun.SHOW); tick(S, 'T', 'tv');
    f = funOf(R()) as unknown as Fun.Fun;
    expect(f.phase).toBe('end'); expect(f.win?.sort()).toEqual(['u1', 'u2']);
    const r1 = payFun(S, f as unknown as AnyFun, 'u1', 'T'), r3 = payFun(S, f as unknown as AnyFun, 'u3', 'T');
    expect(r1).toMatchObject({ gem: 5 }); expect(r3).toMatchObject({ gem: 1 });
    payFun(S, f as unknown as AnyFun, 'u1', 'T');
    expect(S.get(`gifts/u1/fun${f.g}`)).toMatchObject({ g: 5 });
    endRest(S, 'T');
    expect(R().state.rest).toBeFalsy(); expect(funOf(R())).toBeNull();
    void uids;
  });
  it('🔴 집중 = 놀이 시계 멈춤 · 풀면 남은 초 그대로', () => {
    const { S, L, R } = setup(3);
    restOn(S, 'T', R(), 5);
    startFun(S, 'T', R(), 'bal', { no: L.no, me: 'tv' });
    const to0 = (funOf(R()) as unknown as Fun.Fun).to;
    S.tick(5000); setFocus(S, 'T', true); tick(S, 'T', 'tv');
    expect(funOf(R())?.frz).toBe(S.now());
    S.tick(60000); tick(S, 'T', 'tv');
    expect((funOf(R()) as unknown as Fun.Fun).phase).toBe('pick'); // 멈춤 중엔 판정 안 함
    setFocus(S, 'T', false); tick(S, 'T', 'tv');
    const f = funOf(R()) as unknown as Fun.Fun;
    expect(f.frz).toBeNull(); expect(f.to).toBe(to0 + 60000);
  });
  it('⭕ OX 타임 · 🙊 눈치 시작 조건 · 시계는 한 기기만', () => {
    const { S, L, R } = setup(2);
    restOn(S, 'T', R(), 5);
    expect(startFun(S, 'T', R(), 'bal', { no: L.no, me: 'tv' })).toMatch(/3명 이상/);
    expect(startFun(S, 'T', R(), 'nun', { no: L.no, me: 'tv' })).toMatch(/3명 이상/);
    expect(startFun(S, 'T', R(), 'quiz', { which: 'now', no: L.no, me: 'tv' })).toBeNull();
    const f = funOf(R()) as unknown as Fun.Fun;
    expect(f.kind).toBe('quiz'); expect(f.s).toBeTruthy();
    expect(Fun.oxPool(L.no, 'now')).toContain(f.qi);
    expect(tick(S, 'T', 'tp')).toBe(false); // TV 가 맡는 중 → 교사 폰은 안 씀
    S.tick(5000); expect(tick(S, 'T', 'tp')).toBe(true); // 4초 넘게 소식 없음 → 이어받음
  });
});
describe('🙊 ⓕ 한 번도 안 누른 학생 = 탈락 (📜 11/24 · 옛 11/17 관전 바뀜)', () => {
  it('누른 적 있는 학생이 혼자 남으면 마지막 탈락 · 한 번도 안 누른 학생이 혼자 남으면 시간 탈락', () => {
    let f: Nun.Nun | null = Nun.startNun(['a', 'b', 'c', 'd'], 0); f = Nun.stepNun(f, null, 3001, null)!; // 준비 → 시작
    f = Nun.stepNun(f, { a: 3100, b: 3800, c: 4600 }, 6000, null)!;
    expect(f.out.d).toBe('time'); expect(f.phase).toBe('show'); // d = 안 누름 → 탈락 (📜 11/24 DECISIONS 6849e1e · 옛 💤 관전 바뀜)
    let g: Nun.Nun | null = Nun.startNun(['a', 'b', 'c', 'd'], 0); g = Nun.stepNun(g, null, 3001, null)!;
    g = { ...g, act: { d: 1 } } as Nun.Nun; // d 는 앞 판에서 눌렀던 학생
    g = Nun.stepNun(g, { a: 3100, b: 3800, c: 4600 }, 6000, null)!;
    expect(g.out.d).toBe('last');
  });
});

describe('📜 #46 반대로 밸런스 · 🐞 #44 ⑨ 판정 여유', () => {
  const alive = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`u${i + 1}`, true])) as Record<string, true>;
  it('반대로 = 4명까지 문항 · 3명 이하 가위바위보 · 1명 남을 때까지 / 밸런스 = 5명 이하 그대로', () => {
    expect(Fun.rpsOn({ kind: 'rev', alive: alive(4) })).toBe(false); expect(Fun.rpsOn({ kind: 'rev', alive: alive(3) })).toBe(true); expect(Fun.rpsOn({ kind: 'rev', alive: alive(2) })).toBe(true);
    expect(Fun.rpsOn({ kind: 'bal', alive: alive(5) })).toBe(true); expect(Fun.rpsOn({ kind: 'bal', alive: alive(6) })).toBe(false);
    expect(Fun.endAt('rev')).toBe(1); expect(Fun.endAt('bal')).toBe(2);
    // 반대로 2명 남음 = 끝나지 않고 다음 판(가위바위보)
    const f0 = { kind: 'rev', g: 1, n: 3, rk: 'r3', qi: 0, rps: false, q: ['a', 'b'], s: null, ans: null, why: null, phase: 'show', from: 0, to: 1000, until: 2000, final: false, alive: alive(2), queue: [0, 1, 2, 3], at0: 0, total: 6, outAt: {}, zz: {} } as unknown as Fun.Fun;
    const f1 = Fun.step(f0, null, 2000)!; expect(f1.phase).toBe('pick'); expect(f1.rps).toBe(true);
    const f2 = Fun.step({ ...f0, alive: alive(1) } as Fun.Fun, null, 2000)!; expect(f2.phase).toBe('end');
    const f3 = Fun.step({ ...f0, final: true } as Fun.Fun, null, 2000)!; expect(f3.phase).toBe('end'); expect(f3.win?.length).toBe(2); // 시간 다 됨 = 남은 학생
  });
  it('⑨ 마감 순간엔 판정 안 함 · 0.5초 뒤 판정 (그 사이 도착한 표도 셈)', () => {
    const f0 = { kind: 'bal', g: 1, n: 1, rk: 'r1', qi: 0, rps: false, q: ['a', 'b'], s: null, ans: null, why: null, phase: 'pick', from: 0, to: 15000, final: false, alive: alive(8), queue: [0, 1, 2], at0: 0, total: 8, outAt: {}, zz: {} } as unknown as Fun.Fun;
    expect(Fun.step(f0, {}, 15000)).toBeNull(); expect(Fun.step(f0, {}, 15000 + Fun.LATE - 1)).toBeNull();
    const v = { u1: 'a', u2: 'a', u3: 'a', u4: 'a', u5: 'a', u6: 'b', u7: 'b', u8: 'b' }; // u8 = 마감 0.3초 뒤 도착
    const f1 = Fun.step(f0, v, 15000 + Fun.LATE)!; expect(f1.phase).toBe('show'); expect(f1.res?.none).toEqual([]);
  });
});

describe('🐞 #44 ⑩ 용이 잠든 사이 = 1판 출발 때 들어와 있는 학생 모두', () => {
  it('시작 뒤 안내 10초 동안 들어온 학생도 참가 · 2판부터는 그대로', async () => {
    const { S, R } = setup(4);
    restOn(S, 'T', R(), 7);
    expect(startFun(S, 'T', R(), 'drg', { no: 1, me: 'tv' })).toBeNull();
    expect(Object.keys((funOf(R()) as unknown as { alive: object }).alive).length).toBe(4);
    S.tick(3000); heartbeat(S, 'T', 'u9', 9, '학생 9'); // 늦게 들어옴(새 판 받느라)
    S.tick(7000); ['u1', 'u2', 'u3', 'u4', 'u9'].forEach((u, k) => heartbeat(S, 'T', u, u === 'u9' ? 9 : k + 1, `학생 ${k + 1}`)); // 폰은 몇 초마다 소식
    S.tick(1000); tick(S, 'T', 'tv');
    const f = funOf(R()) as unknown as { phase: string; alive: Record<string, 1>; total: number };
    expect(f.phase).toBe('play'); expect(f.alive.u9).toBe(1); expect(f.total).toBe(5);
  });
});

// 📜 11/24 선생님 (DECISIONS 6849e1e) 「안 고른 학생 = 탈락이 맞음」: ⚖ · 🔄 · 🙊 시간 안에 안 고르면 그 판 탈락 · 🙋 다시 참여 없음
describe('📜 11/24 안 고르면 탈락 · 다시 참여 없음', () => {
  it('⚖ 밸런스: 안 고른 학생 = 탈락 · 다음 판에 골라도 못 들어옴', () => {
    const { S, L, R } = setup(7);
    restOn(S, 'T', R(), 7); startFun(S, 'T', R(), 'bal', { no: L.no, me: 'tv' });
    let f = funOf(R()) as unknown as Fun.Fun;
    ['u1', 'u2', 'u3', 'u5', 'u6'].forEach((u) => pick(S, 'T', f.rk, u, 'a')); pick(S, 'T', f.rk, 'u7', 'b');
    S.tick(15000 + Fun.LATE); tick(S, 'T', 'tv'); f = funOf(R()) as unknown as Fun.Fun;
    expect(f.alive.u4).toBeUndefined(); expect(f.outAt.u4).toBe(1); expect(f.res?.zz ?? []).toEqual([]);
    pick(S, 'T', f.rk, 'u4', 'a'); S.tick(Fun.SHOW); tick(S, 'T', 'tv'); f = funOf(R()) as unknown as Fun.Fun;
    expect(f.alive.u4).toBeUndefined();
  });
  it('🙊 눈치: 안 누른 학생이 🙋 해도 다음 판에 안 들어옴', () => {
    let x = Nun.stepNun(Nun.startNun(['a', 'b', 'c', 'd', 'e', 'f'], 0), null, Nun.READY, null)!; const t0 = Nun.READY, P: Record<string, number> = {};
    for (const [u, dt] of [['a', 100], ['b', 2000], ['c', 4000], ['d', 6000]] as const) { P[u] = t0 + dt; x = Nun.stepNun(x, P, t0 + dt + 900, null) ?? x; }
    x = Nun.stepNun(x, P, t0 + 6900 + Nun.TIMEOUT + 10, null) ?? x; // e · f 시간 초과
    expect(x.phase).toBe('show');
    const nx = Nun.stepNun(x, null, x.to + 1, { e: { e: '🙋', at: x.to } })!;
    expect([nx.phase, nx.round]).toEqual(['ready', 2]); expect(Object.keys(nx.alive).sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});
