// 📷 서술형 사진 채점 (정식 photo.js · actions.js snapEnd · photoTrue · chainPhotoFill 그대로 · 📜 2026-11-15 선생님 「오늘 사진 채점 기능까지」)
import { describe, expect, it } from 'vitest';
import type { Room, Store } from '../src/model/types';
import { memoryStore } from '../src/store/device';
import { PROFILES } from '../src/model/profiles';
import { heartbeat, nextStep, openRoom, photoScroll, roomPath, snapEnd, snapStart, chainPhotoFill, chainSubmit } from '../src/raid/actions';
import { answerOf, chainRecord, isChain, petrify, stepOf } from '../src/raid/raid';
import { packOf } from '../src/engine/packs';
import { codeRubrics, coolSec, daily, errMsg, leftToday, needs, pack, pendState, precheckOf, raidMax, ready, roomMax, rubricLesson, usage, day, allRows } from '../src/school/photo';
import { photoScrolls } from '../src/school/castle';

const mem = (t = 1_000_000): Store => ({ ...memoryStore(), kind: 'memory', now: () => t });
describe('📷 설정 · 기준표', () => {
  it('코드 기준표 = 정식 lessons/rubrics.js (수업 소레이드 8 · 성채 7) + 11/23 확정 6방 (11 m4 · 13 m4 · 14 ~ 17 m3)', () => {
    const R = codeRubrics(), n = (k: string) => Object.keys(R[k] || {}).length;
    expect([n('set-06'), n('set-09'), n('set-10'), n('set-11'), n('set-12')]).toEqual([4, 1, 1, 2, 1]);
    expect([n('set-13'), n('set-14'), n('set-15'), n('set-16'), n('set-17')]).toEqual([1, 1, 1, 1, 1]);
    expect([R['set-13']!.m4!.total, R['set-13']!.m4!.pass, R['set-14']!.m3!.pass]).toEqual([5, 4, 3]);
    expect([n('eval-1'), n('eval-2'), n('eval-3')]).toEqual([2, 2, 3]);
    for (const rs of Object.values(R)) for (const r of Object.values(rs)) { expect(r.pass).toBeLessThanOrEqual(r.total); expect((r.steps || []).reduce((a, s) => a + s.pts, 0)).toBe(r.total); }
  });
  it('켜짐 = url + on + 그 방 기준표 on · 값 없으면 정식 기본값', () => {
    const S = mem();
    expect(ready(S)).toBe(false);
    S.set('gcfg/photo', { on: true, url: 'https://script.google.com/macros/s/x/exec' }); expect(ready(S)).toBe(true);
    expect(ready(S, 'eval-1', 'q07')).toBe(false); S.set('photo_rubric/eval-1/q07', { on: true, title: 't', total: 4, pass: 3 }); expect(ready(S, 'eval-1', 'q07')).toBe(true);
    const c = {}; expect([daily(c), roomMax(c), coolSec(c), raidMax(c)]).toEqual([6, 2, 30, 2]); expect(coolSec({ cool: 0 })).toBe(0);
  });
  it('올린 차시 팩(ex-NN) → 기준표 이름 set-NN (차시 번호로) · 이미 있는 이름은 그대로', () => {
    const S = mem();
    expect(rubricLesson(S, { id: 'ex-12', no: 12 })).toBe('set-12');
    expect(rubricLesson(S, { id: 'set-06a', no: 6 })).toBe('set-06');
    expect(rubricLesson(S, { id: 'set-06@7', no: 7 })).toBe('set-06'); // 베타 6차시 뒤쪽 팩 (차시 번호 7)
    expect(rubricLesson(S, { id: 'eval-1', no: 0 })).toBe('eval-1');
    expect(rubricLesson(S, { id: 'ex-13', no: 13 })).toBe('set-13'); // 11/23 확정 기준표
    expect(rubricLesson(S, { id: 'ex-18', no: 18 })).toBe('ex-18'); // 기준표 없음 = 그대로 (준비 중)
  });
  it('보내는 글 = 정식 pack (번호 · 「풀이는 학습지에」 · 「(이어서)」 지움)', () => {
    const p = pack([{ question: '3 A ⊂ B 를 보여라 (풀이는 학습지에)', answer: 5, solution: 'x', check: { a: 1 } }, { question: '(이어서) 다음', answer: 'y', check: { b: 2 } }]);
    expect(p).toEqual({ ask: 'A ⊂ B 를 보여라 / 다음', answer: '5 / y', ref: 'x / ', params: { a: 1, b: 2 } });
  });
  it('🧹 1차 거르기 = 정식 기준값 (어두움 · 종이 아님 · 빈 종이 · 통과)', () => {
    expect(precheckOf({ mean: 30, paper: 60, sat: 0.1, inkR: 0.05 })).toBe('dark');
    expect(precheckOf({ mean: 120, paper: 100, sat: 0.1, inkR: 0.05 })).toBe('notpaper');
    expect(precheckOf({ mean: 200, paper: 220, sat: 0.5, inkR: 0.05 })).toBe('notpaper');
    expect(precheckOf({ mean: 230, paper: 240, sat: 0.05, inkR: 0.001 })).toBe('blank');
    expect(precheckOf({ mean: 200, paper: 230, sat: 0.05, inkR: 0.04 })).toBeNull();
  });
  it('남은 장 수 · 쉬는 초 · 오류 문구', () => {
    const S = mem(); const t = Date.now();
    S.set(`photo_q/1-2/3/${day()}`, { n: 4, r: { 'eval-1_q07': 2 }, last: t - 10_000 });
    const v = leftToday(S, {}, '1-2', 3, 'eval-1_q07'); expect(v.left).toBe(2); expect(v.roomLeft).toBe(0); expect(v.wait).toBeGreaterThanOrEqual(19);
    expect(errMsg({ ok: false, err: 'roomquota' }, {})).toContain('2번 다 해 봤어요'); expect(errMsg({ ok: false, err: 'wait', sec: 12 }, {})).toContain('12초 뒤');
    expect(errMsg(null, {})).toContain('인터넷');
  });
});
describe('⏳ 선생님 확인 · 결과판', () => {
  it('결과 없음 · ok 없음 = wait (거울이 늦어도 기다림을 지우지 않음) · ✔ = ok · ✖ = no', () => {
    const S = mem(), p = 'photo/1-2/3/eval-1_q07/r1';
    expect(pendState(S, '1-2', 3, 'eval-1', 'q07', 'r1')).toBe('wait');
    S.set(p, { status: 'check', score: 2, total: 4, pass: 3, at: 5 }); expect(pendState(S, '1-2', 3, 'eval-1', 'q07', 'r1')).toBe('wait');
    expect(allRows(S).filter(needs).length).toBe(1);
    S.set(`${p}/ok`, true); expect(pendState(S, '1-2', 3, 'eval-1', 'q07', 'r1')).toBe('ok'); expect(allRows(S).filter(needs).length).toBe(0);
    S.set(`${p}/ok`, false); expect(pendState(S, '1-2', 3, 'eval-1', 'q07', 'r1')).toBe('no');
  });
  it('이의 신청 = 확인할 것 · 사용량 경고 (학교 전체 하루 기준)', () => {
    const S = mem(); S.set('photo/1-2/4/set-06_u4/r2', { status: 'retry', appeal: { t: '맞게 썼어요', at: 1 }, at: 1 });
    expect(needs(allRows(S)[0]!)).toBe(true);
    S.set(`photo_q/_all/${day()}`, 150); const u = usage(S); expect(u.today).toBe(150); expect(u.warn).toBe(true); expect(u.won).toBe(180);
  });
});
describe('⚔ 수업 소레이드 ✍ → 📸', () => {
  function room() {
    const S = mem(); const L = packOf('set-06@7')!; openRoom(S, L, 'P1', PROFILES.test); S.set(`${roomPath('P1')}/meta/version`, 4);
    heartbeat(S, 'P1', 'a', 1, 'a'); heartbeat(S, 'P1', 'b', 2, 'b');
    const R = () => S.get<Room>(roomPath('P1')) as Room;
    for (let i = 0; i < 40 && !(stepOf(L, R())?.kind === 'monster' && isChain(L, R(), stepOf(L, R())!.id)); i++) nextStep(S, L, 'P1');
    expect(isChain(L, R(), stepOf(L, R())!.id)).toBe(true);
    return { S, L, R, mid: stepOf(L, R())!.id };
  }
  it('통과 = 장 수 1 · wr ok · 🌟 석화 (살아 있는 몬스터) · 남은 단계 모두 처치(퍼펙트 아님) · 📜 문제당 한 번', () => {
    const { S, L, R, mid } = room();
    const its = chainRecord(L, R(), mid, 'a').items; chainSubmit(S, L, 'P1', mid, 'a', 0, 0, answerOf(its[0]!));
    snapStart(S, 'P1', 'a', mid); expect((R().players!.a as unknown as { snap?: unknown }).snap).toBeTruthy();
    expect(snapEnd(S, L, 'P1', 'a', mid, { status: 'pass', id: 'x1', scores: [4] })).toBe('true');
    const p = R().players!.a as unknown as { ph: Record<string, number>; wr: Record<string, string>; snap?: unknown };
    expect([p.ph[mid], p.wr[mid], p.snap ?? null]).toEqual([1, 'ok', null]); expect(petrify(R(), mid)?.by).toBe('a');
    expect(chainPhotoFill(S, L, 'P1', 'a', mid)).toBe(its.length - 1);
    const r = chainRecord(L, R(), mid, 'a'); expect(r.done).toBe(true); expect(r.byPh).toBe(true); expect(r.perfect).toBe(false);
    expect(photoScroll(S, 'a', L.id, mid)).toBe(true); expect(photoScroll(S, 'a', L.id, mid)).toBe(false);
    expect(S.get<{ s: number }>(`gifts/a/ult_${L.id}_${mid}`)!.s).toBe(1);
  });
  it('이미 석화 = 효과 없이 done · ⏳ 확인 = 장 수 안 셈(앞 장만) · pp 에 결과 id · 창만 닫음 = 0장', () => {
    const { S, L, R, mid } = room();
    snapEnd(S, L, 'P1', 'a', mid, { status: 'pass', scores: [3] });
    expect(snapEnd(S, L, 'P1', 'b', mid, { status: 'pass', scores: [3] })).toBe('done');
    snapEnd(S, L, 'P1', 'b', mid, null); expect((R().players!.b as unknown as { ph: Record<string, number> }).ph[mid]).toBe(1);
    snapEnd(S, L, 'P1', 'b', mid, { status: 'check', id: 'c9', scores: [1, 2] });
    const b = R().players!.b as unknown as { ph: Record<string, number>; pp: Record<string, string> }; expect(b.ph[mid]).toBe(2); expect(b.pp[mid]).toBe('c9');
  });
  it('연습 쓰기(풀이 보기) 통과 = wr peek · 🌟 없음', () => {
    const { S, L, R, mid } = room();
    expect(snapEnd(S, L, 'P1', 'a', mid, { status: 'pass', scores: [4] }, true)).toBeNull();
    expect((R().players!.a as unknown as { wr: Record<string, string> }).wr[mid]).toBe('peek'); expect(petrify(R(), mid)).toBeNull();
  });
});
describe('🏰 성채 📷 📜', () => {
  it('처음 통과 1 · 만점 +1 · 점수가 오르면 +1 (정식 scrollWin)', () => {
    expect(photoScrolls(null)).toBe(1); expect(photoScrolls({ score: 3, total: 4 })).toBe(1); expect(photoScrolls({ score: 4, total: 4 })).toBe(2); expect(photoScrolls({ score: 4, total: 4, up: true })).toBe(3);
  });
});

describe('📸 소레이드 사진 = 정답 글 (🐞 11/23 「undefined」 · 「0,2」)', () => {
  it('선다 = 보기 글 · 여러 개 = 보기 글들', async () => {
    const { chainItems: ci } = await import('../src/school/photo');
    const ch = { type: 'choice', question: 'q', choices: ['8', '18', '10'], answerIndex: 1 };
    expect(ci(null, 't', [ch as never], [])[0]!.answer).toBe('18');
    const mu = { type: 'multi', question: 'q', options: ['ㄱ. a', 'ㄴ. b', 'ㄷ. c'], answer: [0, 2] };
    expect(ci(null, 't', [mu as never], [])[0]!.answer).toBe('ㄱ. a, ㄷ. c');
    expect(pack([{ question: 'a' }]).answer).toBe('');
  });
});
