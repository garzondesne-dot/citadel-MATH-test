// 던전 통일 엔진 한 바퀴: 입장 → 단계(개념 · 몬스터 · 보스) → 결과 · 「다음 판에서」 자리 건너뜀 · 다른 점 표 값만 다름
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import type { Given, LessonPack, Question, Room, Store } from '../src/model/types';
import pack from '../src/packs/set-06.json';
import { PROFILES } from '../src/model/profiles';
import { memoryStore } from '../src/store/device';
import { appearNow, bossSubmit, chainRelease, chainSubmit, heartbeat, nextStep, openRoom, pracStart, roomPath, submit } from '../src/raid/actions';
import { atkClock, bossHp, bossItem, bossState, chainDown, chainItems, chainRecord, cleared, isChain, isEnd, itemsFor, monsterHp, record, resultOf, solveLock, stepOf, variantOf } from '../src/raid/raid';

const L = pack as LessonPack;
const ans = (q: Question): Given => (q.type === 'multi' ? q.answer.slice() : q.type === 'choice' ? q.answerIndex : q.type === 'number' ? q.answer : null);
const right = (qs: Question[]) => qs.map(ans);
const wrong = (qs: Question[]) => qs.map((q) => (q.type === 'multi' ? [] : -999)) as Given[];

/** 가짜 시계를 가진 메모리 저장소 */
function setup(key: 'class' | 'test', n = 2) {
  const base = memoryStore();
  let t = 1_000_000;
  const S: Store & { tick: (ms: number) => void } = { ...base, kind: 'memory', get: base.get, set: base.set, watch: base.watch, now: () => t, tick: (ms) => { t += ms; } };
  openRoom(S, L, 'T', PROFILES[key]);
  const uids = Array.from({ length: n }, (_, k) => `u${k + 1}`);
  const beat = () => uids.forEach((u, k) => heartbeat(S, 'T', u, k + 1, `학생 ${k + 1}`));
  beat();
  const R = () => S.get<Room>(roomPath('T')) as Room;
  return { S, R, uids, beat };
}

describe('던전 통일 엔진', () => {
  it('수업: 입장 → c1 → m1 … → ⚔ u4~u7 → 보스 → 결과', () => {
    const { S, R, uids, beat } = setup('class');
    expect(R().meta).toMatchObject({ profile: 'class', retries: 3, healMax: 2, bossTries: 4, solve: 60 });
    expect(R().state.step).toBe(-1);
    const seen: string[] = [];
    for (let guard = 0; guard < 20 && !isEnd(L, R()); guard++) {
      nextStep(S, L, 'T'); beat();
      const st = stepOf(L, R());
      if (!st) break;
      seen.push(st.id);
      if (st.kind === 'monster' && isChain(L, R(), st.id)) {
        appearNow(S, L, 'T'); S.tick(1);
        // 학생 1: 졸개 ① 한 번 틀림(−½) → 끝까지 / 학생 2: 퍼펙트
        const its1 = chainItems(L, R(), st.id, 'u1', 0), its2 = chainItems(L, R(), st.id, 'u2', 0);
        expect(chainSubmit(S, L, 'T', st.id, 'u1', 0, 0, wrong([its1[0] as Question])[0] as Given)).toBeNull();
        expect(chainRecord(L, R(), st.id, 'u1').left).toBe(3.5);
        its1.forEach((q, k) => expect(chainSubmit(S, L, 'T', st.id, 'u1', k, 0, ans(q))).toBeNull());
        its2.forEach((q, k) => expect(chainSubmit(S, L, 'T', st.id, 'u2', k, 0, ans(q))).toBeNull());
        expect(chainRecord(L, R(), st.id, 'u2').perfect).toBe(true);
        expect(cleared(L, R(), st.id, S.now())).toBe(true);
        continue;
      }
      if (st.kind === 'monster') {
        // 정찰 60초 동안 잠김 → 「⚔ 등장!」
        expect(solveLock(L, R(), S.now())?.on).toBe(true);
        expect(atkClock(L, R(), S.now())?.paused).toBe(true);
        appearNow(S, L, 'T');
        S.tick(1);
        expect(solveLock(L, R(), S.now())?.on).toBe(false);
        // 학생 1 = 틀림 → 같은 문제 · 다시 맞힘 / 학생 2 = 바로 맞힘 → 체력 0
        const q0 = itemsFor(L, R(), st.id, 'u1', 0);
        submit(S, L, 'T', st.id, 'u1', wrong(q0));
        expect(variantOf(L, R(), st.id, 'u1', 1)).toBe(0);
        submit(S, L, 'T', st.id, 'u1', right(q0));
        submit(S, L, 'T', st.id, 'u2', right(itemsFor(L, R(), st.id, 'u2', 0)));
        expect(cleared(L, R(), st.id, S.now())).toBe(true);
        expect(atkClock(L, R(), S.now())).toBeNull(); // 쓰러진 몬스터는 공격 안 함
      }
      if (st.kind === 'boss') {
        appearNow(S, L, 'T'); S.tick(1);
        const hp0 = bossHp(L, R(), S.now());
        expect(hp0.max).toBe(Math.floor((2 * 6 * 90) / 100)); // 10
        for (const u of uids) for (let i = 0; i < 6; i++) {
          if (bossHp(L, R(), S.now()).won) break;
          expect(bossSubmit(S, L, 'T', u, i, ans(bossItem(L, R(), u, i, 0) as Question))).toBe(true);
        }
        expect(bossHp(L, R(), S.now()).won).toBe(true); // 체력 0 = 즉시 승리
        expect(atkClock(L, R(), S.now())).toBeNull();
      }
    }
    expect(seen).toEqual(['c1', 'm1', 'c2', 'm2', 'c3', 'm3', 'c4', 'u4', 'u5', 'u6', 'u7', 'boss']);
    expect(isEnd(L, R())).toBe(true);
    const res = resultOf(L, R(), 'u1');
    expect(res.mons.map((m) => `${m.id}:${m.best}/${m.total}`)).toEqual(['m1:4/4', 'm2:3/3', 'm3:2/2', 'u4:4/4', 'u5:4/4', 'u6:4/4', 'u7:5/5']);
    expect(res.boss?.ok).toBe(6);
    expect(resultOf(L, R(), 'u2').boss?.ok).toBe(4); // 체력 10 = 6 + 4 에서 승리 → 남은 문항은 안 풀어도 됨
    expect(res.right).toBe(4 + 3 + 2 + 4 + 4 + 4 + 5 + 6);
  });

  it('보스: 문항마다 기회 4번 · 틀리면 숫자 바뀐 문제 · 맞히면 도달', () => {
    const { S, R } = setup('test', 1);
    while (stepOf(L, R())?.kind !== 'boss') nextStep(S, L, 'T');
    const q0 = bossItem(L, R(), 'u1', 1, 0) as Question, wrongA = (q0 as Extract<Question, { type: 'number' }>).answer + 1;
    expect(bossSubmit(S, L, 'T', 'u1', 1, wrongA)).toBe(true);
    const s1 = bossState(L, R(), 'u1')[1];
    expect(s1).toMatchObject({ n: 1, ok: false, left: 3, next: 1 });
    expect((bossItem(L, R(), 'u1', 1, 1) as Question).question).not.toBe(q0.question);
    for (let k = 1; k < 4; k++) expect(bossSubmit(S, L, 'T', 'u1', 1, -1)).toBe(true);
    expect(bossSubmit(S, L, 'T', 'u1', 1, -1)).toBe(false); // 기회 다 씀
    expect(bossState(L, R(), 'u1')[1]?.left).toBe(0);
  });

  it('수업 · 테스트 모드 = 다른 점 표 값만 다름 (정찰 60초 / 5초)', () => {
    for (const [key, sec] of [['class', 60], ['test', 5]] as const) {
      const { S, R } = setup(key, 1);
      nextStep(S, L, 'T'); nextStep(S, L, 'T'); // c1 → m1
      expect(stepOf(L, R())?.id).toBe('m1');
      expect(solveLock(L, R(), S.now())?.sec).toBe(sec);
      S.tick(sec * 1000 - 1);
      expect(solveLock(L, R(), S.now())?.on).toBe(true);
      S.tick(2);
      expect(solveLock(L, R(), S.now())?.on).toBe(false);
      // 그 밖의 규칙 값은 같음
      expect({ ...R().meta, profile: '', solve: 0, created: 0 }).toEqual({ code: 'T', lesson: 'set-06', version: 3, created: 0, profile: '', retries: 3, healMax: 2, bossTries: 4, solve: 0, think: 5 });
      expect(monsterHp(L, R(), 'm1', S.now()).max).toBe(Math.floor((1 * 4 * 90) / 100));
      expect(record(L, R(), 'm1', 'u1').slots).toBe(4);
    }
  });

  it('엔진(src/raid · src/engine)에 모드 이름 분기가 없음', () => {
    for (const dir of ['src/raid', 'src/engine']) for (const f of readdirSync(dir)) {
      const src = readFileSync(`${dir}/${f}`, 'utf8');
      expect(/['"](class|test|trial)['"]/.test(src), `${dir}/${f} 에 모드 이름`).toBe(false);
      expect(/(profile|\.key)\s*[!=]==?\s*['"]/.test(src), `${dir}/${f} 에 모드 이름과 비교`).toBe(false);
    }
  });

  it('⚔ 소레이드: 잠김 → 풀어주기 · 한 판 더 3판 · 근거 빈칸 · 졸개 쓰러짐', () => {
    const { S, R } = setup('test', 3);
    while (stepOf(L, R())?.id !== 'u4') nextStep(S, L, 'T');
    const mid = 'u4', its = chainItems(L, R(), mid, 'u1', 0), w = wrong([its[0] as Question])[0] as Given;
    for (let k = 0; k < 6; k++) chainSubmit(S, L, 'T', mid, 'u1', 0, 0, w);
    expect(chainRecord(L, R(), mid, 'u1')).toMatchObject({ locked: true, left: 1 });
    expect(chainSubmit(S, L, 'T', mid, 'u1', 0, 0, ans(its[0] as Question))).toBe('🙋 선생님 확인을 기다려요');
    chainRelease(S, 'T', mid, 'u1');
    its.forEach((q, k) => expect(chainSubmit(S, L, 'T', mid, 'u1', k, 0, ans(q))).toBeNull());
    expect(chainRecord(L, R(), mid, 'u1')).toMatchObject({ done: true, perfect: false, left: 1 });
    // 졸개 쓰러짐: 셋 중 ⌈3 × 90%⌉ = 3명이 넘어야
    chainItems(L, R(), mid, 'u2', 0).forEach((q, k) => chainSubmit(S, L, 'T', mid, 'u2', k, 0, ans(q)));
    expect(chainDown(L, R(), mid, S.now()).map((d) => d.down)).toEqual([false, false, false]);
    chainSubmit(S, L, 'T', mid, 'u3', 0, 0, ans(chainItems(L, R(), mid, 'u3', 0)[0] as Question));
    expect(chainDown(L, R(), mid, S.now()).map((d) => d.down)).toEqual([true, false, false]);
    // 🔥 한 판 더: 3판까지 · 연습 판 대장 뒤 💡 근거 빈칸(틀려도 기회 안 깎임)
    expect(pracStart(S, L, 'T', mid, 'u2')).toBe(1);
    const p1 = chainItems(L, R(), mid, 'u2', 1);
    p1.forEach((q, k) => { if (k === 3) { expect(chainSubmit(S, L, 'T', mid, 'u2', 3, 1, ans(q))).toBeNull(); } else chainSubmit(S, L, 'T', mid, 'u2', k, 1, ans(q)); });
    expect(chainRecord(L, R(), mid, 'u2')).toMatchObject({ pass: 1, pStage: 4, pWhy: 3, pDoneN: 0 });
    chainSubmit(S, L, 'T', mid, 'u2', 3, 1, 1, 1); // 근거 틀림
    expect(chainRecord(L, R(), mid, 'u2')).toMatchObject({ pWhy: 3, pLeft: 4 });
    chainSubmit(S, L, 'T', mid, 'u2', 3, 1, 0, 1); // 근거 맞힘
    expect(chainRecord(L, R(), mid, 'u2')).toMatchObject({ pWhy: -1, pDoneN: 1, whyOk: true });
    expect(pracStart(S, L, 'T', mid, 'u2')).toBe(2);
    expect(pracStart(S, L, 'T', mid, 'u2')).toBe(3);
    expect(pracStart(S, L, 'T', mid, 'u2')).toBe(0); // 3판 끝
  });
});
