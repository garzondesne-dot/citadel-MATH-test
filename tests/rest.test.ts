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

const DS = { Fun: { ...Fun }, FunQ: FUNQ, FunOX: { list: SUBJ.funOx }, Nunchi: { step: (f: Nun.Nun, p: Record<string, number> | null, now: number, c: Record<string, { e: string; at: number }> | null) => Nun.stepNun(f, p, now, c) } };
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
    expect(r.bad).toEqual([]);
    expect(r.out.join('\n')).toMatch(/OK: 밸런스 게임/);
  });
  it('🙊 눈치 게임 (tests/nunchi.test.js)', () => {
    const r = runOfficial('nunchi.test.js', (s) => s.replace(/const vm = require[\s\S]*?const NU = ctx\.DS\.Nunchi;/, 'const NU = DS_.Nunchi;'));
    expect(r.bad).toEqual([]);
    expect(r.out.join('\n')).toMatch(/✅ 눈치 게임/);
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
    S.tick(15000); tick(S, 'T', 'tv');
    f = funOf(R()) as unknown as Fun.Fun;
    expect(f.phase).toBe('show');
    expect(Object.keys(f.alive).sort()).toEqual(['u1', 'u2', 'u5', 'u6']); // 적은 쪽(u3) 탈락 · u4 · u7 = 💤
    expect(f.zz?.u4).toBe(1); expect(f.outAt.u3).toBe(1);
    S.tick(Fun.SHOW); tick(S, 'T', 'tv');
    f = funOf(R()) as unknown as Fun.Fun;
    expect(f.rps).toBe(true); // 4명 = ✊✌️✋ 선생님과 가위바위보
    const h = Fun.tHand(f.g, f.n), lose = { a: 'b', b: 'c', c: 'a' }[h]!, win = { a: 'c', b: 'a', c: 'b' }[h]!;
    pick(S, 'T', f.rk, 'u1', win); pick(S, 'T', f.rk, 'u2', win); pick(S, 'T', f.rk, 'u5', lose); pick(S, 'T', f.rk, 'u6', lose);
    S.tick(15000); tick(S, 'T', 'tv'); S.tick(Fun.SHOW); tick(S, 'T', 'tv');
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
