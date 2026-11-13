import type { Auth } from 'firebase/auth';
import type { Store } from '../../model/types';
import { loginEmails, makeEmail } from '../../school/teacherId';

// 🔐 교사 로그인 한 곳 (#163-① · 정식 그대로) — 「나」 탭 로그인 창 · 교사 화면 입구(TGate) 가 같이 씀
//   이메일 · 비번 · 처음 만든 비번 계정 = 교사(admins/{uid}) · 이 폰은 계속 로그인 · 성공하면 새로 고침(교사 칸을 다시 받음)
export type AS = Store & { auth?: Auth; isAdmin?: () => boolean };
export const hasAuth = (S: Store) => !!(S as AS).auth;
export const isAdmin = (S: Store) => (S as AS).isAdmin?.() ?? false;
export const whoAmI = (S: Store) => (S as AS).auth?.currentUser?.email ?? '';
/** 로그인 · 계정 만들기 → 성공 = '' (곧 새로 고침) · 실패 = 한 줄 이유 */
export async function teacherIn(S: Store, id: string, pw: string, make: boolean): Promise<string> {
  const A = (S as AS).auth; if (!A) return '서버에 닿지 않았어요';
  try {
    const fa = await import('firebase/auth');
    // ✉ B8 아이디 또는 이메일: 로그인 = 이메일 그대로 → 안 되면 예전 꼴 t_…@citadel.class
    let c: Awaited<ReturnType<typeof fa.signInWithEmailAndPassword>> | null = null, last: unknown = null;
    if (make) c = await fa.createUserWithEmailAndPassword(A, makeEmail(id), pw);
    else for (const e of loginEmails(id)) { try { c = await fa.signInWithEmailAndPassword(A, e, pw); break; } catch (x) { last = x; } }
    if (!c) throw last;
    if (!S.get('admins')) S.set(`admins/${c.user.uid}`, true); // 첫 비번 계정 = 교사 (규칙이 「교사가 아직 없을 때만」 허락)
    setTimeout(() => location.reload(), 600);
    return '';
  } catch (e) {
    const code = String((e as { code?: string }).code);
    return /email-already/.test(code) ? '이미 있는 계정 · 「로그인」을 눌러요' : /weak-password/.test(code) ? '비밀번호는 6자 이상' : '아이디(이메일) · 비밀번호를 다시 확인해요';
  }
}
/** 🚪 처음 화면 = 로그인 정보만 지움 → 첫 화면 */
export async function toTitle(S: Store) { const A = (S as AS).auth; if (A?.currentUser) { try { const fa = await import('firebase/auth'); await fa.signOut(A); } catch { /* 무시 */ } } location.replace(location.pathname); }
