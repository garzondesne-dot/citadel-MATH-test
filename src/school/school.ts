import type { Store } from '../model/types';
import { BUILD } from '../build';

// 🏫 학교 자료 (테스트 버전 = 이 기기 저장 · 서버 없음) — 반 명단 · 계정(반 + 번호 + 비밀번호 4자리) · 시간표 · 반마다 지난 수업 · 지금 열린 수업
//   정식 규칙 그대로: 학생은 이름을 쓰지 않음(명단에서 자동) · 중복 가입 불가 · 잊으면 선생님이 0000 으로 · 한 번 로그인한 폰은 바로 캠프
//   명단 = 테스트용 가짜 이름(실제 학생 아님 · 학생 명단은 저장소에 넣지 않음)
export const CLASSES = ['1-1', '1-2', '1-3', '1-4'];
const GIVEN = ['민준', '서연', '도윤', '하은', '시우', '지유', '주원', '하린', '예준', '서준', '지아', '은우', '수아', '건우', '지호'];
const FAMILY = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권'];
export interface Pupil { cls: string; num: number; name: string; uid: string }
export const uidOf = (cls: string, num: number) => `s${cls.replace('-', '_')}_${num}`;
/** 반 명단 (번호 순) */
export function roster(cls: string): Pupil[] {
  const k = CLASSES.indexOf(cls);
  return GIVEN.map((g, i) => ({ cls, num: i + 1, name: `${FAMILY[(i + k * 3) % FAMILY.length]}${g}`, uid: uidOf(cls, i + 1) }));
}
export const pupil = (cls: string, num: number) => roster(cls).find((p) => p.num === num) ?? null;
export const pupilOf = (uid: string) => { const m = /^s(\d+)_(\d+)_(\d+)$/.exec(uid); return m ? pupil(`${m[1]}-${m[2]}`, Number(m[3])) : null; };

// ── 계정 ──
const accPath = (cls: string, num: number) => `school/acc/${cls}/${num}`;
export const hasAccount = (S: Store, cls: string, num: number) => !!S.get<{ pw: string }>(accPath(cls, num));
export function signUp(S: Store, cls: string, num: number, pw: string, pw2: string): string | null {
  if (!pupil(cls, num)) return '명단에 없는 번호예요';
  if (hasAccount(S, cls, num)) return '이미 가입한 번호예요 · 로그인해요';
  if (!/^\d{4}$/.test(pw)) return '비밀번호는 숫자 4자리예요';
  if (pw !== pw2) return '두 번 쓴 비밀번호가 달라요';
  S.set(accPath(cls, num), { pw, at: S.now() });
  return null;
}
export function logIn(S: Store, cls: string, num: number, pw: string): string | null {
  const a = S.get<{ pw: string }>(accPath(cls, num));
  if (!a) return '아직 가입하지 않은 번호예요 · 「처음이에요 · 가입」';
  if (a.pw !== pw) return '비밀번호가 달라요 · 잊었으면 선생님께 (0000 으로 바꿔 줘요)';
  return null;
}
/** 선생님: 비밀번호 0000 으로 */
export function resetPw(S: Store, cls: string, num: number): void { if (hasAccount(S, cls, num)) S.set(`${accPath(cls, num)}/pw`, '0000'); }

// ── 이 폰의 로그인 (한 번 하면 다음부터 바로 캠프) ──
const LOGIN = 'citadel-v1-login';
export function savedLogin(): Pupil | null { try { const v = JSON.parse(localStorage.getItem(LOGIN) || 'null') as { cls: string; num: number } | null; return v ? pupil(v.cls, v.num) : null; } catch { return null; } }
export function saveLogin(p: Pupil | null): void { try { if (p) localStorage.setItem(LOGIN, JSON.stringify({ cls: p.cls, num: p.num })); else localStorage.removeItem(LOGIN); } catch { /* 무시 */ } }

// ── 시간표 (요일 → 교시 → 반) · 비어 있으면 「시간표 넣기」 ──
export type Week = Record<string, Record<string, string>>;
export const week = (S: Store): Week => S.get<Week>('school/sched') || {};
export const setSlot = (S: Store, dow: number, p: number, cls: string | null) => S.set(`school/sched/${dow}/${p}`, cls);

// ── 반마다 지난 수업 · 지금 열린 수업 ──
export interface LastClass { lesson: string; no: number; at: number; done: boolean; code: string }
export const lastClass = (S: Store, cls: string) => S.get<LastClass>(`school/last/${cls}`);
export const setLast = (S: Store, cls: string, v: LastClass) => S.set(`school/last/${cls}`, v);
/** 지금 열린 수업 (교사 폰이 열면 · 교실 TV · 학생 캠프가 따라감) */
export interface Live { code: string; cls: string; lesson: string; key: string; test?: boolean }
export const liveNow = (S: Store) => S.get<Live>('school/live');
export const setLive = (S: Store, v: Live | null) => S.set('school/live', v);
export const liveOfCls = (S: Store, cls: string) => { const v = liveNow(S); return v && v.cls === cls ? v : null; };
export const newCode = () => String(100000 + Math.floor(Math.random() * 900000));
export const newKey = () => String(1000 + Math.floor(Math.random() * 9000));
/** 들어온 판이 지금 판과 다르면 🔄 옛 판 */
export const isOld = (ver?: string) => !!ver && ver !== BUILD;
