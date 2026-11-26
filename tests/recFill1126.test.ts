// 🐞 11/26 「수업 종료를 안 누르면 대시보드 기록 누락」: TV(교사 로그인 아님)가 시간 끝에 닫으면 반 기록을 못 씀 → 교사 기기가 채움 · 멈춘 방은 닫고 채움 · 이 판 전 수업은 안 건드림
import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/device';
import type { Room, Store } from '../src/model/types';
import { PROFILES } from '../src/model/profiles';
import { packOf, PACKS } from '../src/engine/packs';
import { heartbeat, nextStep, openRoom, roomPath } from '../src/raid/actions';
import { fillRecords, fillPast, needFill, isStale, RECFILL_SINCE, RECFILL_PAST, RECFILL_PAST_DONE, STALE_MS } from '../src/school/recFill';

const mk = (now: number) => { let t = now; const S: Store & { tick: (ms: number) => void } = { ...memoryStore(), kind: 'memory', now: () => t, tick: (ms: number) => { t += ms; } } as never; return S; };
function room(S: Store, code: string, cls = '1-2', closed = true) {
  const L = packOf('set-06')!; openRoom(S, L, code, PROFILES.class); S.set(`${roomPath(code)}/meta/cls`, cls); S.set(`${roomPath(code)}/meta/t0`, S.now());
  heartbeat(S, code, 's1_2_3', 3, '삼'); heartbeat(S, code, 's1_2_4', 4, '사');
  for (let i = 0; i < 3; i++) nextStep(S, L, code);
  if (closed) S.set(`${roomPath(code)}/state/closed`, true); // TV 가 닫음 = 반 기록 · recAt 없음
  S.set('school/last/' + cls, { lesson: L.id, no: L.no, at: S.now(), done: false, code });
  return L;
}
describe('🧩 빠진 수업 기록 채우기', () => {
  it('닫혔는데 반 기록 없음 → 교사 기기가 학생마다 기록 · recAt · 두 번째는 안 함', async () => {
    const S = mk(RECFILL_SINCE + 1000); const L = room(S, 'A1');
    expect(needFill(S.get<Room>(roomPath('A1')))).toBe(true);
    expect(await fillRecords(S, PACKS)).toBe(1);
    expect(S.get(`records/1-2/3/${L.id}`)).toBeTruthy(); expect(S.get(`records/1-2/4/${L.id}`)).toBeTruthy();
    expect(S.get(`${roomPath('A1')}/state/recAt`)).toBeTruthy();
    expect(await fillRecords(S, PACKS)).toBe(0);
  });
  it('이 판 전에 연 수업 = 건드리지 않음 (지난 수업은 선생님 말씀 뒤)', async () => {
    const S = mk(RECFILL_SINCE - 3600e3); room(S, 'A2');
    expect(await fillRecords(S, PACKS)).toBe(0); expect(S.get('records/1-2/3')).toBeNull();
  });
  it('안 닫힌 채 3시간 넘게 멈춘 방(지금 수업 아님) = 닫고 기록 · 지금 수업 · 3시간 안 = 그대로', async () => {
    const S = mk(RECFILL_SINCE + 1000); room(S, 'A3', '1-3', false);
    expect(isStale(S.get<Room>(roomPath('A3')), S.now(), null, 'A3')).toBe(false);
    (S as never as { tick: (ms: number) => void }).tick(STALE_MS + 60e3);
    expect(isStale(S.get<Room>(roomPath('A3')), S.now(), 'A3', 'A3')).toBe(false);
    expect(await fillRecords(S, PACKS)).toBe(1);
    expect(S.get<boolean>(`${roomPath('A3')}/state/closed`)).toBe(true);
  });
  it('📜 지난 수업 한 번 채우기 = 정한 방만(이 판 전이어도) · 끝 표시', async () => {
    const S = mk(RECFILL_SINCE - 86400e3); const L = room(S, RECFILL_PAST[0]); room(S, 'OTHER', '1-4');
    expect(await fillPast(S, PACKS)).toBe(1);
    expect(S.get(`records/1-2/3/${L.id}`)).toBeTruthy(); expect(S.get('records/1-4')).toBeNull();
    expect(S.get<{ n: number }>(RECFILL_PAST_DONE)?.n).toBe(1);
  });
});
