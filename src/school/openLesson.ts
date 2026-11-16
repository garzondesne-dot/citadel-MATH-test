import type { LessonPack, Store } from '../model/types';
import { PROFILES } from '../model/profiles';
import { openRoom, roomPath } from '../raid/actions';
import { HALLKEY, newCode, newKey, roster, setLast, setLastTest, setLive } from './school';
import type { Carry } from './carry';

// 🔑 수업 열기 한 입구 (📜 2026-11-17 #21) — 교사 폰 「▶ 수업 열기」 · 📅 「▶ 바로 열기」 · ⏰ 자동 열기(종합실 입장 대기 화면)가 같은 함수
//   종합실 키 방식 = school/teacher/keyMode ('new' 수업마다 새로 · 'fixed' 고정 = secrets/fixed/hallKey) · 없으면 고정 번호가 있을 때 고정 (옛 판 그대로)
export type KeyMode = 'new' | 'fixed';
export const KEYMODE = 'school/teacher/keyMode';
export const keyModeOf = (S: Store): KeyMode => { const m = S.get<string>(KEYMODE); return m === 'new' || m === 'fixed' ? m : fixedKey(S) ? 'fixed' : 'new'; };
export const fixedKey = (S: Store) => S.get<string>(HALLKEY) || S.get<string>('school/teacher/hallKey') || '';
export interface OpenOpt { test?: boolean; from?: { step: number; fresh: string | null }; carry?: Carry | null; keyMode?: KeyMode }
/** 방을 만들고 school/live 에 적음 → 방 코드 */
export function openLesson(S: Store, cls: string, L: LessonPack, o: OpenOpt = {}): string {
  const { test = false, from, carry } = o;
  const mode = o.keyMode ?? keyModeOf(S);
  const code = newCode(), key = (mode === 'fixed' && fixedKey(S)) || newKey(); // 🖥 종합실 키 (⑲) · 🔐 #163-① 교사만 읽는 secrets
  openRoom(S, L, code, test ? PROFILES.test : PROFILES.class);
  const pr = S.get<Record<string, number>>(`school/prep/${L.id}`); // 📋 차시 준비 기본값 (⑰) → 방에 옮겨 적음
  if (pr) Object.entries(pr).forEach(([k, v]) => S.set(`${roomPath(code)}/meta/${k}`, v)); // 🧪 테스트 수업도 차시 준비 값 그대로 (📜 2026-11-14)
  if (test && pr?.solve == null) S.set(`${roomPath(code)}/meta/solve`, PROFILES.class.scoutSec); // 🌫 정찰 기본 60초 = 실제 수업 · 🧪 테스트 같음 (📜 2026-11-14)
  S.set(`${roomPath(code)}/meta/names`, Object.fromEntries(roster(cls, S).map((p) => [p.uid, p.name]))); // 📜 2026-11-16 「이름 전부 표기」
  S.set(`${roomPath(code)}/meta/cls`, cls); S.set(`secrets/${code}/hallKey`, key); // 🔐 TV 는 이 키를 쳐서 hosts 에 등록
  if (from) { S.set(`${roomPath(code)}/meta/resumeFrom`, from.step); if (from.fresh) S.set(`${roomPath(code)}/meta/fresh/${from.fresh}`, true); } // ⏯ 이어서
  if (!test) S.set(`${roomPath(code)}/meta/limit`, true);
  if (carry && !from) S.set(`${roomPath(code)}/meta/carry`, carry); // 📦 B 지난 차시에서 넘어온 몬스터
  setLive(S, { code, cls, lesson: L.id, ...(test ? { test: true } : {}) });
  (test ? setLastTest : setLast)(S, cls, { lesson: L.id, no: L.no, at: S.now(), done: false, code }); // ⏯ 🧪 테스트도 이어서 (#133 · 따로 저장)
  return code;
}
