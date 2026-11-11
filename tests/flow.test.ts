// 던전 통일 엔진 한 바퀴: 입장 → 단계(개념 · 몬스터 · 보스) → 결과 · 「다음 판에서」 자리 건너뜀 · 다른 점 표 값만 다름
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import type { Given, LessonPack, Question, Room, Store } from '../src/model/types';
import pack from '../src/packs/set-06.json';
import { PROFILES } from '../src/model/profiles';
import { memoryStore } from '../src/store/device';
import { appearNow, bossSubmit, heartbeat, nextStep, openRoom, roomPath, submit } from '../src/raid/actions';
import { atkClock, bossHp, bossItem, bossState, cleared, isEnd, itemsFor, monsterHp, record, resultOf, solveLock, stepOf, variantOf } from '../src/raid/raid';

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
  it('수업: 입장 → c1 → m1 … → 보스 → 결과 · u4~u7 건너뜀', () => {
    const { S, R, uids, beat } = setup('class');
    expect(R().meta).toMatchObject({ profile: 'class', retries: 3, healMax: 2, bossTries: 4, solve: 60 });
    expect(R().state.step).toBe(-1);
    const seen: string[] = [];
    for (let guard = 0; guard < 20 && !isEnd(L, R()); guard++) {
      nextStep(S, L, 'T'); beat();
      const st = stepOf(L, R());
      if (!st) break;
      seen.push(st.id);
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
    expect(seen).toEqual(['c1', 'm1', 'c2', 'm2', 'c3', 'm3', 'c4', 'boss']);
    expect(isEnd(L, R())).toBe(true);
    const res = resultOf(L, R(), 'u1');
    expect(res.mons.map((m) => `${m.id}:${m.best}/${m.total}`)).toEqual(['m1:4/4', 'm2:3/3', 'm3:2/2']);
    expect(res.boss?.ok).toBe(6);
    expect(resultOf(L, R(), 'u2').boss?.ok).toBe(4); // 체력 10 = 6 + 4 에서 승리 → 남은 문항은 안 풀어도 됨
    expect(res.right).toBe(4 + 3 + 2 + 6);
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
      expect({ ...R().meta, profile: '', solve: 0, created: 0 }).toEqual({ code: 'T', lesson: 'set-06', version: 3, created: 0, profile: '', retries: 3, healMax: 2, bossTries: 4, solve: 0 });
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
});
