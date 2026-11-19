import type { Store } from '../model/types';
import { BUILD } from '../build';

// 🏫 학교 자료 (테스트 버전 = 이 기기 저장 · 서버 없음) — 반 명단 · 계정(반 + 번호 + 비밀번호 4자리) · 시간표 · 반마다 지난 수업 · 지금 열린 수업
//   정식 규칙 그대로: 학생은 이름을 쓰지 않음(명단에서 자동) · 중복 가입 불가 · 잊으면 선생님이 0000 으로 · 한 번 로그인한 폰은 바로 캠프
//   명단 = 테스트용 가짜 이름(실제 학생 아님 · 학생 명단은 저장소에 넣지 않음)
// 🏫 반 = 명단에 올린 반만 · 1-1 ~ 1-8 까지 (DECISIONS 「🏫 반 수 · 전체 통계」) · 테스트 판 가짜 명단 = 8반 · 1-6 = 🧪 베타 반
export const CLASSES = ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8'];
/** 🏫 그 학교 정보 (⚙ 스위치 틀 · school/info): 반 목록 · 교시 시각 · 요일마다 교시 — 없으면 지금 값(우리 학교) 그대로
 *  같은 배열 · 표를 그 자리에서 바꿈(이 값을 읽는 모든 곳이 그대로) · 처음 반 = 반 목록 첫째 */
export interface SchoolInfo { classes?: string[]; bells?: Record<number, [string, string]>; periods?: Record<number, number[]> }
const BASE = { classes: [...CLASSES] };
export function applySchoolInfo(i: SchoolInfo | null, bells: Record<number, [string, string]>, periods: Record<number, number[]>, base?: { bells: Record<number, [string, string]>; periods: Record<number, number[]> }) {
  const cl = i?.classes?.filter((c) => /^[\w가-힣-]{1,8}$/.test(c)).slice(0, 30);
  CLASSES.splice(0, CLASSES.length, ...(cl?.length ? cl : BASE.classes));
  const swap = <T>(o: Record<number, T>, n: Record<number, T> | undefined, b: Record<number, T> | undefined) => { if (!n && !b) return; for (const k of Object.keys(o)) delete o[Number(k)]; Object.assign(o, n ?? b); };
  swap(bells, i?.bells, base?.bells); swap(periods, i?.periods, base?.periods);
}
export const firstClass = () => CLASSES[0] ?? '1-1';
/** 🧪 베타 반 (#123): 화면 · 규칙 · 보상 · 하루 한도 · 저장은 실제 반과 같고 통계에서만 빠짐 — 반 설정 school/cls/{반}/beta (테스트 판 기본 = 1-6) */
const BETA_DEFAULT = ['1-6'];
const GIVEN = ['민준', '서연', '도윤', '하은', '시우', '지유', '주원', '하린', '예준', '서준', '지아', '은우', '수아', '건우', '지호'];
const FAMILY = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권'];
export interface Pupil { cls: string; num: number; name: string; uid: string }
export const uidOf = (cls: string, num: number) => `s${cls.replace('-', '_')}_${num}`;
/** 반 명단 (번호 순) · 선생님이 「＋ 명단」으로 올린 것(school/roster/{반} = { 번호: 이름 })이 있으면 그것 · 없으면 테스트용 가짜 이름 */
//   🔁 #163 정식 칸: roster/{반}/{번호} = 이름(로그인한 학생 · 교사만 읽음) · rosterMask/{반}/{번호} = 가린 이름(김*수 · 누구나) · 옛 v1.0 school/roster 도 읽음
export const maskName = (name: string) => { const a = [...String(name).trim()]; return a.length <= 1 ? '*' : a.length === 2 ? `${a[0]}*` : `${a[0]}${'*'.repeat(a.length - 2)}${a[a.length - 1]}`; }; // 정식 account.js mask
export function roster(cls: string, S?: Store | null): Pupil[] {
  const ok = (v: unknown) => (v && typeof v === 'object' && Object.keys(v).length ? (v as Record<string, string>) : null);
  const up = ok(S?.get(`roster/${cls}`)) || ok(S?.get(`rosterMask/${cls}`)) || ok(S?.get(`school/roster/${cls}`));
  // 🚀 정식 기록 = 번호가 1 부터 빽빽하면 서버가 배열로 줌([빈칸, 1번, 2번 …]) → 빈칸 · 0번 뺌
  if (up && Object.keys(up).length) return Object.entries(up).filter(([n, name]) => !!name && Number(n) > 0).map(([n, name]) => ({ cls, num: Number(n), name, uid: uidOf(cls, Number(n)) })).sort((a, b) => a.num - b.num);
  const k = Math.max(0, CLASSES.indexOf(cls)); // 목록 밖 반('test') = 첫 반 이름표
  return GIVEN.map((g, i) => ({ cls, num: i + 1, name: `${FAMILY[(i + k * 3) % FAMILY.length]}${g}`, uid: uidOf(cls, i + 1) }));
}
/** ＋ 명단 붙여넣기: 한 줄에 「번호 이름」(탭 · 쉼표 · 띄어쓰기) · 같은 번호는 이름만 바뀜 → 올린 수 */
export function pasteRoster(S: Store, cls: string, text: string): number {
  const cur = S.get<Record<string, string>>(`roster/${cls}`) || S.get<Record<string, string>>(`school/roster/${cls}`) || Object.fromEntries(roster(cls).map((p) => [p.num, p.name]));
  let n = 0;
  for (const line of text.split(/\r?\n/)) { const m = /^\s*(\d{1,2})[\s,\t.번]+(\S.{0,9}?)\s*$/.exec(line); if (m) { cur[String(Number(m[1]))] = (m[2] as string).trim(); n++; } }
  if (n) { S.set(`roster/${cls}`, cur); S.set(`rosterMask/${cls}`, Object.fromEntries(Object.entries(cur).map(([k, v]) => [k, maskName(v)]))); } // 정식 칸 (#163)
  return n;
}
/** 🐞 11/19 ② 서버(시험 · 운영)에서 이 반 명단이 아직 안 왔으면 false → 첫 화면은 가짜 이름 대신 「명단 불러오는 중…」 (가짜 이름 목록 = 이 기기 체험 모드만) */
export function rosterReady(cls: string, S?: Store | null): boolean {
  if (!S || S.kind !== 'server') return true;
  const ok = (v: unknown) => !!v && typeof v === 'object' && Object.keys(v).length > 0;
  if (ok(S.get(`roster/${cls}`)) || ok(S.get(`rosterMask/${cls}`)) || ok(S.get(`school/roster/${cls}`))) return true;
  return !!S.loaded?.(`rosterMask/${cls}`); // 받았는데 비어 있음(명단을 안 올린 반) = 예전처럼 이름표 목록
}
export const pupil = (cls: string, num: number, S?: Store | null) => roster(cls, S).find((p) => p.num === num) ?? null;
export const isBeta = (S: Store | null, cls: string): boolean => { const v = S?.get<boolean>(`school/cls/${cls}/beta`); return v == null ? BETA_DEFAULT.includes(cls) : !!v; };
/** 🧪 학생 한 명 시험 계정 (#67) — school/test/{반}/{번호} */
export const isTester = (S: Store | null, cls: string, num: number) => !!S?.get<boolean>(`tester/${cls}/${num}`) || !!S?.get<boolean>(`school/test/${cls}/${num}`); // 정식 tester/{반}/{번호} (#163) · 옛 칸도
/** 통계 · 체력 머릿수에서 빼는가 = 베타 반이거나 시험 계정 (#123 · 함수 하나로) — 대시보드 「전체」 · 반 비교 · 랭킹 · 대항전 · 설문 집계 · 몬스터 체력 머릿수 · 세특 초안 */
export const isExcluded = (S: Store | null, cls: string, num: number) => isBeta(S, cls) || isTester(S, cls, num);
export const clsLabel = (S: Store | null, cls: string) => (cls === 'test' ? '🧪 테스트' : `${cls}반${isBeta(S, cls) ? ' 🧪' : ''}`); // 'test' = 테스트 반이 없는 학교 · 🖥 한 화면 테스트 (📜 2026-11-17 #21)
export const pupilOf = (uid: string) => { const m = /^s(\d+)_(\d+)_(\d+)$/.exec(uid); return m ? pupil(`${m[1]}-${m[2]}`, Number(m[3])) : null; };

// ── 계정 ──
// 경로 = 정식 accounts/{반}/{번호} (V1-DESIGN 7절 · #137) · 이 기기 = { pw, at } · 시험 서버 = { uid, at } (비밀번호는 Firebase 로그인에만 · DB 에 안 씀)
const accPath = (cls: string, num: number) => `accounts/${cls}/${num}`;
export const hasAccount = (S: Store, cls: string, num: number) => !!S.get<object>(accPath(cls, num));
type AuthStore = Store & { auth?: import('firebase/auth').Auth; preload?: (cls: string, num: number) => Promise<void> };
/** 🔐 #163-① 로그인한 학생의 자기 칸(💎 · EXP · 카드 · 기록)을 먼저 받아 둠 → 그다음 화면 */
/** 🔐 학생 칸 주인 표시 (📜 2026-11-14 출시 막는 것 2 · 규칙이 「이 학생 칸 = 이 로그인」을 알게): pids/{s반_번호} = { u: 로그인 uid, c: 반, n: 번호 }
 *  규칙 = accounts/{반}/{번호}/uid 가 같은 로그인일 때만 씀 · 방의 학생 칸 · 선물 · 우편 받음 표시는 이 주인만 */
export function claimPid(S: Store, cls: string, num: number): void {
  const u = (S as AuthStore).auth?.currentUser?.uid; if (!u || S.kind !== 'server') return;
  const k = `pids/${uidOf(cls, num)}`, cur = S.get<{ u?: string }>(k); if (cur?.u === u) return;
  S.set(k, { u, c: cls, n: String(num) }); // n = 글자 (규칙이 's' + 반 + '_' + 번호 로 맞춰 봄)
}
const ready = async (S: Store, cls: string, num: number) => { await (S as AuthStore).preload?.(cls, num); claimPid(S, cls, num); return null; };
/** 시험 서버 로그인 이름 · 비밀번호 (Firebase 는 6자 이상 · 학생이 쓰는 건 숫자 4자리 그대로) */
// 🔑 시험 서버 0000 초기화 (📜 2026-11-14 리모컨 시안 v12 「시험 서버에서도 되게」): 다른 학생의 로그인 비밀번호는 바꿀 수 없어서 → 선생님이 그 칸의 「로그인 판 g」를 하나 올리고 reset 표시
//   → 학생 로그인 주소가 새 주소(…-g1@…)가 되고 · 새 주소엔 로그인이 아직 없으니 그때 친 4자리(0000)로 새로 만들어 그 칸에 이어짐(claim) · 용사 · 기록 칸은 반 · 번호라 그대로
// 🚀 출시 (📜 2026-11-15 「정식 기준 · 합치기 없음」 · 계정 옮기기): 로그인 이름 · 비밀번호 = 정식과 같은 꼴 → 선생님이 정식 로그인 목록을 그대로 들여오면(auth:import) 학생은 같은 4자리로 바로 들어옴
//   정식 = s_{반}_{번호}_{gen}@citadel.class · {4자리}#cm (js/raid/account.js email · pw) · gen = 정식 accounts 의 gen(초기화 판) · 베타 0000 초기화 판 g 와 같은 뜻(g 가 있으면 g)
//   옛 베타 꼴(s1_3_1@citadel-test.local · cdm-4자리)은 로그인 때 한 번 더 시도만(새로 만들지 않음)
export const authEmail = (cls: string, num: number, g = 0) => `s_${encodeURIComponent(cls).replace(/%/g, '').toLowerCase()}_${Number(num)}_${g || 0}@citadel.class`;
const oldEmail = (cls: string, num: number, g = 0) => `${uidOf(cls, num)}${g ? `-g${g}` : ''}@citadel-test.local`;
const genOf = (S: Store, cls: string, num: number) => { const a = S.get<{ g?: number; gen?: number }>(accPath(cls, num)); return Number(a?.g ?? a?.gen) || 0; };
export const authPw = (pw: string) => `${pw}#cm`;
const oldPw = (pw: string) => `cdm-${pw}`;
/** 가입 · 로그인 (시험 서버면 Firebase 로그인까지) → 오류 글 또는 null */
/** 🔑 선생님 0000 초기화 뒤 첫 로그인 = 새 4자리를 정해야 함 (정식 account.js login needNewPin 그대로 · 📜 2026-11-16 핫픽스) */
export const NEED_NEW_PIN = '__needNewPin__';
export async function enter(S: Store, cls: string, num: number, pw: string, pw2: string, join: boolean, newPin?: string): Promise<string | null> {
  const A = (S as AuthStore).auth;
  if (!A) return join ? signUp(S, cls, num, pw, pw2) : logIn(S, cls, num, pw);
  const fa = await import('firebase/auth');
  if (join) {
    if (!pupil(cls, num, S)) return '명단에 없는 번호예요';
    if (hasAccount(S, cls, num) && !S.get<boolean>(`${accPath(cls, num)}/reset`)) return '이미 가입한 번호예요 · 로그인해요';
    if (!/^\d{4}$/.test(pw)) return '비밀번호는 숫자 4자리예요';
    if (pw !== pw2) return '두 번 쓴 비밀번호가 달라요';
    if (hasAccount(S, cls, num)) { try { const c = await fa.createUserWithEmailAndPassword(A, authEmail(cls, num, genOf(S, cls, num)), authPw(pw)); claim(S, cls, num, c.user.uid); return ready(S, cls, num); } catch { return '이미 가입한 번호예요 · 로그인해요'; } } // 옮긴 계정 = 칸은 그대로 두고 잇기
    try { const c = await fa.createUserWithEmailAndPassword(A, authEmail(cls, num, genOf(S, cls, num)), authPw(pw)); S.set(accPath(cls, num), { uid: c.user.uid, at: S.now() }); return ready(S, cls, num); }
    catch (e) { const cd = String((e as { code?: string }).code); return /email-already/.test(cd) ? '이미 가입한 번호예요 · 로그인해요' : /operation-not-allowed|admin-restricted/.test(cd) ? '서버에서 로그인이 꺼져 있어요 · 선생님께 알려 주세요' : '가입하지 못했어요 · 잠시 뒤 다시'; }
  }
  if (!hasAccount(S, cls, num)) return '아직 가입하지 않은 번호예요 · 「처음이에요 · 가입」';
  const g0 = genOf(S, cls, num);
  // 🔑 선생님 0000 초기화(reset · 로그인 판 g ≥ 1) = 정식 그대로: 0000 → 새 4자리 정하기 → 그 4자리로 새 판 로그인을 만들어 그 학생 칸에 이음 (접속 안 한 학생도 · 📜 2026-11-16 핫픽스)
  if (S.get<boolean>(`${accPath(cls, num)}/reset`) && g0 > 0) {
    if (pw !== '0000') return '선생님이 0000 으로 바꿨어요 · 0000 으로 들어와요';
    if (!newPin) return NEED_NEW_PIN;
    if (!/^\d{4}$/.test(newPin)) return '새 비밀번호는 숫자 4자리예요';
    if (newPin === '0000') return '새 비밀번호는 0000 말고 다른 숫자로 정해요';
    try { const c = await fa.createUserWithEmailAndPassword(A, authEmail(cls, num, g0), authPw(newPin)); claim(S, cls, num, c.user.uid); return ready(S, cls, num); }
    catch (e) {
      if (/email-already/.test(String((e as { code?: string }).code))) { try { const c = await fa.createUserWithEmailAndPassword(A, authEmail(cls, num, g0 + 1), authPw(newPin)); claim(S, cls, num, c.user.uid); S.set(`${accPath(cls, num)}/g`, g0 + 1); return ready(S, cls, num); } catch { /* 아래 */ } }
      return '새 비밀번호를 저장하지 못했어요 · 잠시 뒤 다시';
    }
  }
  const signIn = async () => { try { return await fa.signInWithEmailAndPassword(A, authEmail(cls, num, g0), authPw(pw)); } catch (e) { try { return await fa.signInWithEmailAndPassword(A, oldEmail(cls, num, g0), oldPw(pw)); } catch { throw e; } } }; // 정식 꼴 → 옛 베타 꼴
  try { const c = await signIn(); if (S.get<boolean>(`${accPath(cls, num)}/reset`) || S.get<string>(`${accPath(cls, num)}/uid`) !== c.user.uid) claim(S, cls, num, c.user.uid); return ready(S, cls, num); }
  catch (e) {
    // 🔁 #163 정식에서 옮긴 계정(reset: true · 정식 「선생님 초기화」와 같은 뜻) = 이 서버 로그인이 아직 없음 → 지금 친 4자리로 새로 만들고 그 학생 칸에 이어짐
    //   🔑 선생님 0000 초기화(로그인 판 g ≥ 1) = 0000 으로만 들어옴 (정식 「잊으면 0000」)
    const rs = S.get<boolean>(`${accPath(cls, num)}/reset`), g = genOf(S, cls, num);
    if (rs && g > 0 && pw !== '0000') return '선생님이 0000 으로 바꿨어요 · 0000 으로 들어와요';
    if (rs && /^\d{4}$/.test(pw) && /user-not-found|invalid-credential|invalid-login|wrong-password/.test(String((e as { code?: string }).code))) {
      try { const c = await fa.createUserWithEmailAndPassword(A, authEmail(cls, num, g), authPw(pw)); claim(S, cls, num, c.user.uid); return ready(S, cls, num); }
      catch (e2) {
        // 정식에서 「선생님 초기화」 표시째 옮긴 계정 = 그 판(gen) 로그인이 이미 있음 → 정식처럼 0000 이면 다음 판(gen + 1)으로 새로 만들어 이음
        if (pw === '0000' && /email-already/.test(String((e2 as { code?: string }).code))) {
          try { const c = await fa.createUserWithEmailAndPassword(A, authEmail(cls, num, g + 1), authPw(pw)); claim(S, cls, num, c.user.uid); S.set(`${accPath(cls, num)}/g`, g + 1); /* 규칙 = 내 uid 를 먼저 적어야 다음 칸을 씀 */ return ready(S, cls, num); } catch { /* 아래 */ }
        }
      }
    }
    noteLoginFail(S, cls, num);
    return '비밀번호가 달라요 · 잊었으면 선생님께';
  }
}
/** 🔑 로그인 실패 한 번 = loginFail/{반}/{번호}/{시각} (📜 2026-11-16 · 교사 알림 「로그인 여러 번 실패」 · 학생은 쓰기만 · 읽기 = 교사만 · 규칙 게시 필요) */
function noteLoginFail(S: Store, cls: string, num: number) { const t = S.now(); S.set(`loginFail/${cls.replace(/[.#$/[\]]/g, '_')}/${num}/${t}`, t); }
/** 옮긴 계정 잇기: uid = 이 서버 로그인 · reset 지움 (용사 · 스킬 · 호칭 등 다른 칸은 그대로) */
function claim(S: Store, cls: string, num: number, uid: string | undefined) { if (!uid) return; S.set(`${accPath(cls, num)}/uid`, uid); S.set(`${accPath(cls, num)}/reset`, null); }
/** 선생님 0000 초기화가 되는 저장인가 */
export const canResetPw = (_S: Store) => true; // 🔑 시험 서버도 됨 (로그인 판 g)
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
/** 🔑 학생이 스스로 비밀번호 바꾸기 (📜 2026-11-16 머리 🔨 b4 · b8 · b20 「학생들 비번 바꾸는 게 있는지」) → 오류 글 또는 '' (됨)
 *  서버 = 지금 4자리로 다시 확인(reauthenticate) 뒤 새 4자리로 · 이 기기 = 계정 칸 pw */
export async function changePw(S: Store, cls: string, num: number, cur: string, nw: string): Promise<string> {
  if (!/^\d{4}$/.test(cur) || !/^\d{4}$/.test(nw)) return '비밀번호는 숫자 4자리예요';
  if (nw === '0000') return '새 비밀번호는 0000 말고 다른 숫자로 정해요';
  if (nw === cur) return '지금 비밀번호와 달라야 해요';
  const A = (S as AuthStore).auth;
  if (!A) { const a = S.get<{ pw?: string }>(accPath(cls, num)); if (!a || a.pw !== cur) return '지금 비밀번호가 달라요'; S.set(`${accPath(cls, num)}/pw`, nw); return ''; }
  const u = A.currentUser; if (!u) return '로그인이 풀렸어요 · 다시 로그인해 주세요';
  const fa = await import('firebase/auth');
  try { await fa.reauthenticateWithCredential(u, fa.EmailAuthProvider.credential(u.email || authEmail(cls, num, genOf(S, cls, num)), authPw(cur))); }
  catch { return '지금 비밀번호가 달라요'; }
  try { await fa.updatePassword(u, authPw(nw)); return ''; } catch { return '바꾸지 못했어요 · 잠시 뒤 다시'; }
}
export function resetPw(S: Store, cls: string, num: number): void {
  if (!hasAccount(S, cls, num)) return;
  if ((S as AuthStore).auth) { S.set(`${accPath(cls, num)}/g`, genOf(S, cls, num) + 1); S.set(`${accPath(cls, num)}/reset`, true); return; } // 🔑 시험 서버 = 로그인 판 올림
  S.set(`${accPath(cls, num)}/pw`, '0000');
}

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
/** 🧪 테스트로 연 수업의 이어서 자리 (#133 · 학생과 같은 과정 = 테스트도 이어서 · 실제 반 기록 school/last 와 따로) */
export const lastTest = (S: Store, cls: string) => S.get<LastClass>(`school/lastTest/${cls}`);
export const setLastTest = (S: Store, cls: string, v: LastClass) => S.set(`school/lastTest/${cls}`, v);
/** 지금 열린 수업 (교사 폰이 열면 · 교실 TV · 학생 캠프가 따라감) */
export interface Live { code: string; cls: string; lesson: string; key?: string; test?: boolean }
/** 🔐 #163-① 종합실 키(고정) = 교사만 읽는 칸 · 수업마다 secrets/{방}/hallKey 에 옮겨 적음 */
export const HALLKEY = 'secrets/fixed/hallKey';
export const hallKeyOf = (S: Store, code: string) => S.get<string>(`secrets/${code}/hallKey`) || S.get<string>(HALLKEY) || '';
export const liveNow = (S: Store) => S.get<Live>('school/live');
export const setLive = (S: Store, v: Live | null) => S.set('school/live', v);
export const liveOfCls = (S: Store, cls: string) => { const v = liveNow(S); return v && v.cls === cls ? v : null; };
export const newCode = () => String(100000 + Math.floor(Math.random() * 900000));
export const newKey = () => String(1000 + Math.floor(Math.random() * 9000));
/** 들어온 판이 지금 판과 다르면 🔄 옛 판 */
export const isOld = (ver?: string) => !!ver && ver !== BUILD;
/** 🧪 에뮬레이터 시험 전용: ?as=반:번호 = 그 학생으로 진짜 로그인(없으면 가입 · 비번 1234 = 시험 가입과 같음) → 규칙(pids 주인)을 그대로 지나감
 *  실제 시험 서버 · 정식 = 쓰지 않음(main.ts 가 where.kind === 'emulator' 일 때만 부름) */
export async function emuAsLogin(S: Store, cls: string, num: number): Promise<string | null> {
  const A = (S as AuthStore).auth; if (!A) return 'no auth';
  const fa = await import('firebase/auth'), email = authEmail(cls, num, 0), pw = authPw('1234'); // 시험(e2e)이 화면으로 가입할 때 쓰는 4자리와 같게
  const F = (S as Store & { fetch?: (p: string) => Promise<unknown> }).fetch; if (F) await F(accPath(cls, num)).catch(() => null);
  const tries = hasAccount(S, cls, num) ? [fa.signInWithEmailAndPassword, fa.createUserWithEmailAndPassword] : [fa.createUserWithEmailAndPassword, fa.signInWithEmailAndPassword]; // 있을 법한 쪽 먼저 (400 줄이기)
  let err = ''; for (const f of tries) { try { await f(A, email, pw); err = ''; break; } catch (e) { err = String(e); } } if (err) return err;
  const u = A.currentUser?.uid; if (!u) return 'no uid';
  if (S.get<string>(`${accPath(cls, num)}/uid`) !== u) S.set(accPath(cls, num), { uid: u, at: S.now() }); // 시험 DB 를 지운 뒤에도 같은 로그인으로 칸을 다시 엶
  return ready(S, cls, num);
}
