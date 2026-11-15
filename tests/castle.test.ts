// 🏰 성채 팩 (📜 2026-11-14): 검사기(eval-1 · eval-2 = 오류 0 · 일부러 깬 판 = 칸 · 이유) · 방 열림 = 진도 · 👑 60% 올림 · 틀린 소문제만 다음 판 숫자 · 차시 팩 덧칸
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { baseVer, castleState, checkCastle, clearedBy, diffRooms, reviveRaw, roomPack, SPRITE_RE, spanOf, type CastlePack } from '../src/school/castle';
import { checkUpload } from '../src/school/packUpload';
import { castleVers, itemsFor, plainRecord, seedOf } from '../src/raid/raid';
import { answerOf } from '../src/raid/raid';
import { items } from '../src/engine/lessons';
import { SUBJ } from '../src/engine/subject';
import { ATTACKS } from '../src/raid/attacks';
import type { Given, Question, Room } from '../src/model/types';

const DIR = 'tools/pack-upload/castle/';
const look = { sheet: () => true };
const raw = (f: string) => JSON.parse(fs.readFileSync(DIR + f, 'utf8')) as Record<string, unknown> & { rooms: Record<string, unknown>[] };
const errs = (r: ReturnType<typeof checkCastle>) => r.issues.filter((x) => x.lvl === 'err');

describe('🏰 성채 팩 검사기', () => {
  it('eval-1 · eval-2 = 오류 0 · 방 12 · 11 · 판 7', () => {
    for (const [f, n] of [['eval-1.json', 12], ['eval-2.json', 11]] as const) {
      const r = checkCastle(fs.readFileSync(DIR + f, 'utf8'), look);
      expect(errs(r)).toEqual([]);
      expect(r.pack!.rooms.length).toBe(n);
      expect(r.stats.versions).toBe(n * 7);
      expect(r.pack!.rooms.filter((x) => x.boss).length).toBe(1);
    }
    const P = checkCastle(raw('eval-1.json'), look).pack!;
    expect(spanOf(P)).toBe('2~6차시');
    // 덧칸: say · groups(두 칸 · 보기 겹침 허용) · ref 가 문항에 남음
    const q07 = P.rooms.find((r) => r.id === 'q07')!.vers[0]![0] as Extract<Question, { type: 'multi' }>;
    expect(q07.groups?.length).toBe(2); expect(q07.say).toMatch(/A = \{1, 2, 3, 6\}/);
    expect(new Set(q07.options).size).toBeLessThan(q07.options.length);
    expect(P.rooms[0]!.vers[0]![0]!.ref).toBe('01 ⑴');
  });
  it('일부러 깬 판 = 읽을 수 있는 한국어 오류 (방 id 겹침 · 보스 둘 · 보기 번호 · no 빠짐 · 판 8개 · 그림 꼴 · 보스 없음)', () => {
    const msg = (mut: (r: ReturnType<typeof raw>) => void) => { const r = raw('eval-1.json'); mut(r); return errs(checkCastle(r, look)).map((x) => `${x.at} | ${x.msg}`).join('\n'); };
    expect(msg((r) => { r.rooms[1]!.id = 'q01'; })).toMatch(/방 id 「q01」 가 겹쳐요/);
    expect(msg((r) => { r.rooms[0]!.boss = true; })).toMatch(/보스 방이 2개/);
    expect(msg((r) => { r.rooms.forEach((x) => delete x.boss); })).toMatch(/보스 방이 없어요/);
    expect(msg((r) => { ((r.rooms[2]!.vers as unknown[][])[0]![0] as { a: string }).a = '7'; })).toMatch(/보기 번호 범위\(0 ~ 3\) 밖/);
    expect(msg((r) => { delete r.rooms[3]!.no; })).toMatch(/열림 차시\(no\) \| 칸이 비었어요/);
    expect(msg((r) => { const v = r.rooms[0]!.vers as unknown[]; v.push(v[1]); })).toMatch(/버전이 8개/);
    expect(msg((r) => { r.rooms[0]!.sprite = 'castle1-1'; })).toMatch(/도감 이름표 꼴/);
    expect(msg((r) => { r.kind = 'lesson'; })).toMatch(/성채 팩은 "castle"/);
    expect(msg((r) => { ((r.rooms[1]!.vers as unknown[][])[0]![0] as { ch: string[] }).ch[1] = '1'; })).toMatch(/보기에 같은 것이 두 번/);
    expect(SPRITE_RE.test('castle1:1@h300')).toBe(true); expect(SPRITE_RE.test('castleboss:0')).toBe(true);
  });
  it('서버가 배열을 객체로 돌려줘도 같은 팩 (reviveRaw)', () => {
    const r = raw('eval-2.json'), obj = JSON.parse(JSON.stringify(r, (_k, v) => (Array.isArray(v) && v.length ? Object.fromEntries(v.map((x, i) => [String(i), x])) : Array.isArray(v) ? undefined : v)));
    const a = checkCastle(reviveRaw(obj), look); expect(errs(a)).toEqual([]); expect(a.pack!.rooms.length).toBe(11);
  });
});

describe('🏰 방 열림 · 👑 보스', () => {
  const P = checkCastle(raw('eval-1.json'), look).pack!;
  it('진도 ≥ 방 no 인 방만 열림 · 보스는 no 와 60% 둘 다', () => {
    const s3 = castleState(P, 3, {});
    expect(s3.open.map((r) => r.id)).toEqual(['q01', 'q02', 'q03']);
    expect(s3.bossOpen).toBe(false);
    const s6 = castleState(P, 6, {});
    expect(s6.plain.length).toBe(11); expect(s6.need).toBe(7); // ⌈11 × 0.6⌉ = 7 (올림)
    const six = Object.fromEntries(s6.plain.slice(0, 6).map((r) => [r.id, { clear: true }]));
    expect(castleState(P, 6, six).bossOpen).toBe(false);
    const seven = Object.fromEntries(s6.plain.slice(0, 7).map((r) => [r.id, { clear: true }]));
    expect(castleState(P, 6, seven).bossOpen).toBe(true);
    expect(castleState(P, 5, seven).bossOpen).toBe(false); // 보스 no 6 > 진도 5
    expect(castleState(P, 0, {}, true).open.length).toBe(12); // 👁 미리 보기 = 모두
    // 진도 4: 열린 방 9 (no 2 · 2 · 3 · 4 × 6) → ⌈9 × 0.6⌉ = ⌈5.4⌉ = 6 (올림)
    expect(castleState(P, 4, {}).plain.length).toBe(9); expect(castleState(P, 4, {}).need).toBe(6);
  });
  it('다시 들어온 방의 첫 판 = 1 · 2 · 3 돌림 (기회 4번이 판 6 안)', () => {
    expect([undefined, { runs: 1 }, { runs: 2 }, { runs: 3 }, { runs: 4 }].map(baseVer)).toEqual([0, 1, 2, 3, 1]);
  });
  it('처치 n명 · 다시 올린 판 = 같은 방 id 는 기록 이어짐', () => {
    expect(clearedBy({ '1-1': { 3: { 'eval-1': { q01: { clear: true } } }, 4: { 'eval-1': { q01: { tries: 2 } } } }, '1-2': { 1: { 'eval-1': { q05: { clear: true } }, 'eval-2': {} } } }, 'eval-1')).toBe(2);
    const P2 = { ...P, rooms: P.rooms.filter((r) => r.id !== 'q02').concat([{ ...P.rooms[0]!, id: 'q13' }]) } as CastlePack;
    expect(diffRooms(P, P2)).toEqual({ keep: P.rooms.map((r) => r.id).filter((x) => x !== 'q02').concat(['q13']).filter((x) => x !== 'q13'), gone: ['q02'], added: ['q13'] });
  });
});

describe('🏰 틀린 소문제만 다음 판 숫자', () => {
  const P = checkCastle(raw('eval-1.json'), look).pack!;
  const room = P.rooms.find((r) => r.id === 'q05')!; // 4소문제 · 일반 방
  const L = roomPack(P, room);
  const mk = (subs: Given[][], fresh = 0): Room => ({ meta: { code: 'C', lesson: L.id, version: 4, created: 0, retries: 3, healMax: 0, bossTries: 4, think: 0, solve: 0, castle: true, fresh: { [room.id]: fresh } } as Room['meta'], state: { step: 0, stepAt: 0 }, subs: { [room.id]: { u: Object.fromEntries(subs.map((g, i) => [String(i), g])) } } });
  const wrongOf = (q: Question): Given => (q.type === 'choice' ? (q.answerIndex + 1) % q.choices.length : q.type === 'number' ? q.answer + 1 : q.type === 'ox' ? !q.answer : q.type === 'multi' ? [] : null);
  it('1·3번 틀림 → 2판째 = 1·3번만 판 1 숫자 · 2·4번은 판 0 그대로(잠김) · 다 맞히면 처치', () => {
    const v0 = room.vers[0]!, v1 = room.vers[1]!;
    const g0 = v0.map((q, i) => (i === 0 || i === 2 ? wrongOf(q) : answerOf(q)));
    const R1 = mk([g0]);
    expect(castleVers(L, R1, room.id, 'u', 1)).toEqual([1, 0, 1, 0]);
    const its = itemsFor(L, R1, room.id, 'u', 1);
    expect(its[0]).toBe(v1[0]); expect(its[1]).toBe(v0[1]); expect(its[2]).toBe(v1[2]); expect(its[3]).toBe(v0[3]);
    const g1 = its.map((q) => answerOf(q));
    const R2 = mk([g0, g1]), rec = plainRecord(L, R2, room.id, 'u');
    expect(rec.perfect).toBe(true); expect(rec.tries.map((t) => t.correct)).toEqual([2, 4]);
    expect(rec.slots).toBe(4); // 기회 4
  });
  it('또 틀린 소문제 = 판 2 · 다시 들어온 방(shift 2) = 판 2 부터 · 소레이드 방 = 판 pool', () => {
    const v0 = room.vers[0]!;
    const g0 = v0.map((q) => wrongOf(q)), R1 = mk([g0]);
    const g1 = itemsFor(L, R1, room.id, 'u', 1).map((q, i) => (i === 0 ? wrongOf(q) : answerOf(q)));
    expect(castleVers(L, mk([g0, g1]), room.id, 'u', 2)).toEqual([2, 1, 1, 1]);
    expect(itemsFor(L, mk([], 2), room.id, 'u', 0)[0]).toBe(room.vers[2]![0]);
    const ch = P.rooms.find((r) => r.chain)!, LC = roomPack(P, ch);
    expect(LC.monsters[ch.id]!.chain).toEqual({ pool: ch.vers });
    expect(items(L, room.id, seedOf(mk([]), 'u'), 7)).toBe(room.vers[1]); // 판 7 = 재도전 판을 돌림
  });
});

describe('➕ 덧칸 = 차시 팩에도 (say · why · groups · ref)', () => {
  it('차시 팩 문항에 덧칸이 그대로 · 틀린 why = 오류', () => {
    const P = JSON.parse(fs.readFileSync('tools/pack-upload/example-ex-11.json', 'utf8'));
    const lk = { sheet: (r: string) => (r.split(':')[0]!.replace(/@.*$/, '') in SUBJ.themes.sheets), theme: (t: string) => !t || t in SUBJ.themes.dungeons, attack: (a: string) => a in ATTACKS, builtIn: () => false };
    const m = Object.keys(P.mons)[0]!, it0 = (P.mons[m].vers?.[0] ?? P.mons[m].first)[0];
    Object.assign(it0, { say: 'A ∩ B = {3} 이다.', ref: '07', why: { pre: '공통인 원소는', post: '이다', choices: ['3', '4'], answer: 0, text: '공통인 원소는 3 이다' } });
    const r = checkUpload(JSON.stringify(P), lk);
    expect(r.issues.filter((x) => x.lvl === 'err')).toEqual([]);
    const q = r.pack!.monsters[m]!.first![0]!;
    expect(q.say).toBe('A ∩ B = {3} 이다.'); expect(q.ref).toBe('07'); expect(q.why?.answer).toBe(0);
    it0.why.answer = 5;
    expect(checkUpload(JSON.stringify(P), lk).issues.filter((x) => x.lvl === 'err').map((x) => x.msg).join()).toMatch(/근거 줄\(why\) 정답 「5」/);
  });
});

// 💎 성채 보상 = 정식 gem.js G · grow.js XP 그대로 (📜 2026-11-14 머리 「정식 값 그대로」)
import { castleReward, CASTLE_GEM, CASTLE_PHOTO_GEM, CASTLE_XP } from '../src/school/castle';
describe('💎 성채 보상 (정식 값)', () => {
  it('정식 숫자', () => { expect(CASTLE_GEM).toEqual({ room: 8, roomBoss: 24, roomFirst: 6, first: 4, seal: 12 }); expect(CASTLE_XP).toEqual({ clear: 5, seal: 10, photo: 6 }); expect(CASTLE_PHOTO_GEM).toBe(6); }); // 📷 서술형 통과 = 정식 G.photo 6 · EXP 6
  it('처음 처치 · 첫 방 · 첫 판 무오답', () => { const r = castleReward({ first: true, boss: false, firstCastle: true, flawless: true, sealed: false }); expect(r.gems.map((g) => g.n)).toEqual([8, 4, 6]); expect(r.xp).toBe(5); });
  it('보스 = 24 + 업적 12(한도 밖) · EXP 15', () => { const r = castleReward({ first: true, boss: true, firstCastle: false, flawless: false, sealed: true }); expect(r.gems).toEqual([{ n: 24, why: '성채 방 처치' }, { n: 12, why: '🏆 업적', free: true }]); expect(r.xp).toBe(15); });
  it('다시 처치 = 없음', () => { expect(castleReward({ first: false, boss: true, firstCastle: false, flawless: true, sealed: false })).toEqual({ gems: [], xp: 0 }); });
});

// 🏰 정식 성채 몬스터 시트 다섯 그대로 (📜 2026-11-14 「기존에 쓰던 몬스터 셋을 그대로」 · 정식 assets/manifest.js 71~77)
import { spriteOf } from '../src/ui/manifest';
describe('🏰 성채 몬스터 시트', () => {
  it('castle1 · 2 · 3 · castleboss · castleboss2 + @h 색 변형', () => {
    for (const ref of ['castle1:1', 'castle2:4', 'castle3:2@h200', 'castleboss:1', 'castleboss2:0']) { const s = spriteOf(ref); expect(s.url, ref).toMatch(/art\/castle\/monsters-castle/); }
    expect(spriteOf('castle3:2@h200').hue).toBe(200);
  });
});
