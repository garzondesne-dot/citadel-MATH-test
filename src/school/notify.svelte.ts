// 🔔 교사 알림 ① = 앱 안 알림 (📜 2026-11-16 선생님 「교사 APK + 알림 진행」 「추천대로」 · DECISIONS 「📲 교사 APK + 교사 알림」)
//   교사 폰(리모컨 · 홈 화면 앱 · APK)이 열려 있는 동안(막 내린 때 포함) 서비스 워커가 알림을 띄움 · 앱을 닫아도 오는 알림 = ④ 무료 중계(다음 단계)
//   종류 = 📷 사진 들어옴 · 💬 학생 메시지(수업 밖 손들기) · 🔑 로그인 여러 번 실패 · 🆕 새 판 배포 — 교사 「나」 → 🔔 알림 에서 종류별 켬 · 끔 (이 기기)
//   알림 글에 학생 이름 · 번호는 넣지 않음(잠금 화면에 보이므로) → 「1-3반 1장」 꼴 · 누르면 소식 탭
import type { Store } from '../model/types';
import { BUILD } from '../build';
import { TEST_ADDR } from '../channel';
import { inbox } from './inbox';
import { photoNeeds } from './photo';

export type NoteKind = 'photo' | 'hand' | 'login' | 'deploy';
export const NOTE_KINDS: { k: NoteKind; ic: string; name: string; sub: string }[] = [
  { k: 'photo', ic: '📷', name: '사진 들어옴', sub: '채점 확인이 필요한 사진' },
  { k: 'hand', ic: '💬', name: '학생 메시지 · 손들기', sub: '수업 밖에서 보낸 메시지' },
  { k: 'login', ic: '🔑', name: '로그인 여러 번 실패', sub: '같은 학생이 오늘 3번 이상 틀림' },
  { k: 'deploy', ic: '🆕', name: '새 판 배포', sub: '게임이 새 판으로 바뀜' },
];
/** 로그인 실패 = 오늘 이 횟수부터 알림 */
export const LOGIN_FAIL_N = 3;
const PREF_KEY = 'citadel-v1-notify', SEEN_KEY = 'citadel-v1-notify-seen';
type Pref = Record<NoteKind, boolean> & { on: boolean };
const read = <T>(k: string, d: T): T => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? { ...d, ...v } : d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 사생활 창 */ } };
/** 이 기기 알림 설정 (on = 「알림 켜기」 · 종류별은 처음 모두 켬) */
export const notePref = $state<Pref>(read<Pref>(PREF_KEY, { on: false, photo: true, hand: true, login: true, deploy: true }));
export function setNotePref(p: Partial<Pref>): void { Object.assign(notePref, p); write(PREF_KEY, { ...notePref }); }
/** 이 브라우저가 알림을 띄울 수 있나 */
export const noteSupported = (): boolean => typeof window !== 'undefined' && 'Notification' in window;
export const notePerm = (): NotificationPermission | 'unsupported' => (noteSupported() ? Notification.permission : 'unsupported');
/** 「알림 켜기」 = 브라우저 허락 받기 → 켜짐 */
export async function enableNotes(): Promise<boolean> {
  if (!noteSupported()) return false;
  const p = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  setNotePref({ on: p === 'granted' });
  return p === 'granted';
}

/** 알림 한 장 (켜 둔 종류 · 허락된 때만) */
export async function notify(kind: NoteKind | 'test', title: string, body: string, url = '?role=teacher&tab=news'): Promise<boolean> {
  if (kind !== 'test' && (!notePref.on || !notePref[kind])) return false;
  if (!noteSupported() || Notification.permission !== 'granted') return false;
  const opt: NotificationOptions = { body, tag: `citadel-${kind}`, icon: './icons/icon-192-v2.png', badge: './icons/icon-192-v2.png', data: { url } };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) { await reg.showNotification(title, opt); return true; }
    new Notification(title, opt); return true;
  } catch { return false; }
}

/** 반별로 묶은 한 줄 (이름 · 번호 없음) 「1-3반 2 · 1-5반 1」 */
const byClass = (cls: string[], unit: string) => { const m = new Map<string, number>(); for (const c of cls) m.set(c, (m.get(c) ?? 0) + 1); return [...m].map(([c, n]) => `${c.replace(/_/g, '-')}반 ${n}${unit}`).join(' · '); };
const today0 = (now: number) => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); };

export interface NoteSnap { photo: string[]; hand: string[]; login: Record<string, string>; deploy: string }
/** 지금 서버 값에서 알릴 것 고르기 (순수 함수 · 시험이 직접 부름) — seen = 지난번까지 본 것 · 첫 번 = 알리지 않고 기준만 */
export function diffNotes(S: Store, seen: NoteSnap | null, now: number, site: string | null): { notes: { kind: NoteKind; title: string; body: string }[]; next: NoteSnap } {
  const ph = S.kind === 'server' ? photoNeeds(S) : [];
  const phIds = ph.map((x) => `${x.c}_${x.n}_${x.k}_${x.id}`);
  const msgs = inbox(S).filter((x) => x.kind === 'idea' && x.from && !x.read);
  const fails = S.get<Record<string, Record<string, Record<string, number>>>>('loginFail') || {}, t0 = today0(now), day = new Date(now).toDateString();
  const loginHot: Record<string, string> = {};
  for (const [c, byN] of Object.entries(fails)) for (const [n, byT] of Object.entries(byN || {})) { const k = Object.values(byT || {}).filter((at) => Number(at) >= t0).length; if (k >= LOGIN_FAIL_N) loginHot[`${c}/${n}`] = day; }
  const next: NoteSnap = { photo: phIds, hand: msgs.map((x) => x.id), login: Object.fromEntries(Object.entries({ ...(seen?.login ?? {}), ...loginHot }).filter(([, d]) => d === day)), deploy: site ?? seen?.deploy ?? BUILD };
  if (!seen) return { notes: [], next };
  const notes: { kind: NoteKind; title: string; body: string }[] = [];
  const newPh = ph.filter((x, i) => !seen.photo.includes(phIds[i]!));
  if (newPh.length) notes.push({ kind: 'photo', title: `📷 사진 확인 ${newPh.length}장`, body: `${byClass(newPh.map((x) => x.c), '장')} · 소식 탭에서 확인` });
  const newMsg = msgs.filter((x) => !seen.hand.includes(x.id));
  if (newMsg.length) notes.push({ kind: 'hand', title: `💬 학생 메시지 ${newMsg.length}개`, body: `${byClass(newMsg.map((x) => x.from!.cls), '개')} · 소식 탭에서 답장` });
  const newFail = Object.keys(loginHot).filter((k) => seen.login[k] !== day);
  if (newFail.length) notes.push({ kind: 'login', title: `🔑 로그인 실패 여러 번 · ${newFail.length}명`, body: `${byClass(newFail.map((k) => k.split('/')[0]!), '명')} · 오늘 ${LOGIN_FAIL_N}번 이상 · 반 탭에서 0000 초기화` });
  if (site && site !== seen.deploy && site !== BUILD) notes.push({ kind: 'deploy', title: `🆕 새 판 ${site}`, body: '게임이 새 판으로 바뀌었어요 · 열면 새로 고침' });
  return { notes, next };
}

/** 교사 폰이 열려 있는 동안 지켜보기 (20초마다 · 사이트 판은 5분마다) · 끝내기 함수를 돌려줌 */
export function watchTeacherNotes(S: Store, every = 20000): () => void {
  let site: string | null = null, siteAt = 0, stop = false;
  const tick = async () => {
    if (stop) return;
    const now = Date.now();
    if (now - siteAt > 300000) { siteAt = now; try { const r = await fetch(`./version.json?t=${now}`, { cache: 'no-store' }); if (r.ok) site = String(((await r.json()) as { build?: string }).build || '') || null; } catch { /* 망 끊김 */ } }
    const seen = (() => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || 'null') as NoteSnap | null; } catch { return null; } })();
    const { notes, next } = diffNotes(S, seen, now, site);
    write(SEEN_KEY, next);
    for (const n of notes) await notify(n.kind, n.title, n.body);
  };
  const iv = setInterval(() => void tick(), every);
  if (TEST_ADDR) (window as { __noteTick?: () => Promise<void> }).__noteTick = () => { siteAt = 0; return tick(); }; // 🧪 시험 = 지금 한 번 살펴보기
  void tick();
  return () => { stop = true; clearInterval(iv); };
}

// ── 🔔 ② · ④ 앱을 닫아도 오는 알림 (웹 푸시) — 교사 폰이 「받는 주소(구독)」를 teacherPush/{교사 uid}/{주소 지문} 에 둠(교사만 읽고 씀)
//   보내는 쪽(무료 중계 · 다음 단계)이 그 주소로 보냄 · kinds = 켜 둔 종류(중계가 거름) · VAPID 공개 열쇠는 공개값(비밀 열쇠는 저장소 밖)
export const VAPID_PUBLIC = 'BHLbfxRkAOne6F2gfZMYrY0B9GeD5AqXrkLsKnmEPkSUs9VvCEZbsGoEznyjAix-LygAMty0tKAxA6MA7tz6NIk';
const b64u = (s: string) => { const p = (s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'); const r = atob(p); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
const fp = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
type PushStore = Store & { net?: { uid: string | null }; isAdmin?: () => boolean };
/** 이 교사 폰을 받는 주소로 등록 · 켠 종류도 같이 (서버 · 교사 로그인 때만) — 돌려줌 = 됨 / 안 되는 까닭 */
export async function syncPush(S: Store): Promise<string> {
  const P = S as PushStore, uid = P.net?.uid;
  if (S.kind !== 'server' || !uid || !P.isAdmin?.()) return '교사 로그인 뒤에 돼요';
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || typeof window === 'undefined' || !('PushManager' in window)) return '이 브라우저는 닫힌 앱 알림을 못 받아요';
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!notePref.on) { if (sub) { S.set(`teacherPush/${uid}/${fp(sub.endpoint)}`, null); await sub.unsubscribe().catch(() => null); } return '꺼짐'; }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(VAPID_PUBLIC) });
    const kinds = Object.fromEntries(NOTE_KINDS.map((n) => [n.k, !!notePref[n.k]]));
    S.set(`teacherPush/${uid}/${fp(sub.endpoint)}`, { sub: sub.toJSON(), kinds, at: S.now(), ua: navigator.userAgent.slice(0, 80) });
    return '';
  } catch (e) { return `등록하지 못했어요 (${String((e as Error).message || e).slice(0, 40)})`; }
}
