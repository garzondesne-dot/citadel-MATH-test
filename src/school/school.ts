import type { Store } from '../model/types';
import { BUILD } from '../build';

// 🏫 학교 자료 (테스트 버전 = 이 기기 저장 · 서버 없음) — 반 명단 · 계정(반 + 번호 + 비밀번호 4자리) · 시간표 · 반마다 지난 수업 · 지금 열린 수업
//   정식 규칙 그대로: 학생은 이름을 쓰지 않음(명단에서 자동) · 중복 가입 불가 · 잊으면 선생님이 0000 으로 · 한 번 로그인한 폰은 바로 캠프
//   명단 = 테스트용 가짜 이름(실제 학생 아님 · 학생 명단은 저장소에 넣지 않음)
// 🏫 반 = 명단에 올린 반만 · 1-1 ~ 1-8 까지 (DECISIONS 「🏫 반 수 · 전체 통계」) · 테스트 판 가짜 명단 = 8반 · 1-6 = 🧪 베타 반
export const CLASSES = ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8'];
/** 🧪 베타 반 (#123): 화면 · 규칙 · 보상 · 하루 한도 · 저장은 실제 반과 같고 통계에서만 빠짐 — 반 설정 school/cls/{반}/beta (테스트 판 기본 = 1-6) */
const BETA_DEFAULT = ['1-6'];
const GIVEN = ['민준', '서연', '도윤', '하은', '시우', '지유', '주원', '하린', '예준', '서준', '지아', '은우', '수아', '건우', '지호'];
const FAMILY = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권'];
export interface Pupil { cls: string; num: number; name: string; uid: string }
export const uidOf = (cls: string, num: number) => `s${cls.replace('-', '_')}_${num}`;
/** 반 명단 (번호 순) · 선생님이 「＋ 명단」으로 올린 것(school/roster/{반} = { 번호: 이름 })이 있으면 그것 · 없으면 테스트용 가짜 이름 */
export function roster(cls: string, S?: Store | null): Pupil[] {
  const up = S?.get<Record<string, string>>(`school/roster/${cls}`);
  if (up && Object.keys(up).length) return Object.entries(up).map(([n, name]) => ({ cls, num: Number(n), name, uid: uidOf(cls, Number(n)) })).sort((a, b) => a.num - b.num);
  const k = CLASSES.indexOf(cls);
  return GIVEN.map((g, i) => ({ cls, num: i + 1, name: `${FAMILY[(i + k * 3) % FAMILY.length]}${g}`, uid: uidOf(cls, i + 1) }));
}
/** ＋ 명단 붙여넣기: 한 줄에 「번호 이름」(탭 · 쉼표 · 띄어쓰기) · 같은 번호는 이름만 바뀜 → 올린 수 */
export function pasteRoster(S: Store, cls: string, text: string): number {
  const cur = S.get<Record<string, string>>(`school/roster/${cls}`) || Object.fromEntries(roster(cls).map((p) => [p.num, p.name]));
  let n = 0;
  for (const line of text.split(/\r?\n/)) { const m = /^\s*(\d{1,2})[\s,\t.번]+(\S.{0,9}?)\s*$/.exec(line); if (m) { cur[String(Number(m[1]))] = (m[2] as string).trim(); n++; } }
  if (n) S.set(`school/roster/${cls}`, cur);
  return n;
}
export const pupil = (cls: string, num: number, S?: Store | null) => roster(cls, S).find((p) => p.num === num) ?? null;
export const isBeta = (S: Store | null, cls: string): boolean => { const v = S?.get<boolean>(`school/cls/${cls}/beta`); return v == null ? BETA_DEFAULT.includes(cls) : !!v; };
/** 🧪 학생 한 명 시험 계정 (#67) — school/test/{반}/{번호} */
export const isTester = (S: Store | null, cls: string, num: number) => !!S?.get<boolean>(`school/test/${cls}/${num}`);
/** 통계 · 체력 머릿수에서 빼는가 = 베타 반이거나 시험 계정 (#123 · 함수 하나로) — 대시보드 「전체」 · 반 비교 · 랭킹 · 대항전 · 설문 집계 · 몬스터 체력 머릿수 · 세특 초안 */
export const isExcluded = (S: Store | null, cls: string, num: number) => isBeta(S, cls) || isTester(S, cls, num);
export const clsLabel = (S: Store | null, cls: string) => `${cls}반${isBeta(S, cls) ? ' 🧪' : ''}`;
export const pupilOf = (uid: string) => { const m = /^s(\d+)_(\d+)_(\d+)$/.exec(uid); return m ? pupil(`${m[1]}-${m[2]}`, Number(m[3])) : null; };

// ── 계정 ──
const accPath = (cls: string, num: number) => `school/acc/${cls}/${num}`;
export const hasAccount = (S: Store, cls: string, num: number) => !!S.get<{ pw: string }>(accPath(cls, num));
export function signUp(S: Store, cls: string, num: number, pw: string, pw2: string): string | null {
  if (!pupil(cls, num, S)) return '명단에 없는 번호예요';
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
export function savedLogin(S?: Store | null): Pupil | null { try { const v = JSON.parse(localStorage.getItem(LOGIN) || 'null') as { cls: string; num: number } | null; return v ? pupil(v.cls, v.num, S) : null; } catch { return null; } }
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
