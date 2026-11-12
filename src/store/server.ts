import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectDatabaseEmulator, getDatabase, onValue, ref, set as fbSet, type Database } from 'firebase/database';
import { connectAuthEmulator, getAuth, onAuthStateChanged, signInAnonymously, type Auth } from 'firebase/auth';
import type { Store, Unsub } from '../model/types';

// 🔌 시험 서버 꽂개 (#137 · Firebase Realtime Database) — 같은 Store 꼴(get 은 바로 · set · watch · now)
//   읽기 = 맨 윗칸(rooms · school · gifts · mail · accounts)을 실시간으로 받아 둔 거울(mirror)에서 바로 · 쓰기 = 거울에 먼저 + 서버에 보냄
//   시계 = 서버 시각(.info/serverTimeOffset) · 끊김 = .info/connected · 로그인 = 처음엔 익명(TV · 교사 · 둘러보기) · 학생은 계정으로 바꿔 탐
//   ⚠ 시험 전용: 운영 프로젝트에는 연결하지 않음(config.ts 가 막음) · 맨 윗칸 통째로 받으므로 시험 규모용(출시 때 방 단위로 나눔)
type Tree = Record<string, unknown>;
const ROOTS = ['rooms', 'school', 'gifts', 'mail', 'accounts'] as const;
const split = (p: string) => p.split('/').filter(Boolean);
function getIn(t: unknown, parts: string[]): unknown { let cur = t; for (const k of parts) { if (cur == null || typeof cur !== 'object') return null; cur = (cur as Tree)[k]; } return cur === undefined ? null : cur; }
function setIn(t: Tree, parts: string[], v: unknown): void {
  const last = parts.pop(); if (last == null) return;
  let cur = t; for (const k of parts) { if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {}; cur = cur[k] as Tree; }
  if (v === null || v === undefined) delete cur[last]; else cur[last] = v;
}
const related = (a: string, b: string) => { const A = split(a).join('/'), B = split(b).join('/'); return A === B || A.startsWith(B + '/') || B.startsWith(A + '/') || A === '' || B === ''; };
const clone = <T>(v: T): T => (v == null ? v : (JSON.parse(JSON.stringify(v)) as T));

export interface NetState { connected: boolean; uid: string | null }
export interface ServerStore extends Store { net: NetState; auth: Auth; db: Database; onNet(fn: (s: NetState) => void): Unsub }
export interface ServerOpts { firebase: FirebaseOptions; emulator?: { host: string; db: number; auth: number } | null }

export async function serverStore(o: ServerOpts): Promise<ServerStore> {
  const app = initializeApp(o.firebase, `citadel-${Date.now()}`);
  const db = getDatabase(app), auth = getAuth(app);
  if (o.emulator) { connectDatabaseEmulator(db, o.emulator.host, o.emulator.db); connectAuthEmulator(auth, `http://${o.emulator.host}:${o.emulator.auth}`, { disableWarnings: true }); }
  // 로그인 (규칙 = 로그인한 사람만) — 이미 계정으로 들어와 있으면 그대로
  await new Promise<void>((res) => { const off = onAuthStateChanged(auth, (u) => { off(); if (u) res(); else signInAnonymously(auth).then(() => res(), () => res()); }); });
  const mirror: Tree = {};
  const subs = new Set<{ path: string; fn: (v: unknown) => void; last: string }>();
  const fire = (path: string) => { for (const s of subs) if (related(s.path, path)) { const v = getIn(mirror, split(s.path)), j = JSON.stringify(v ?? null); if (j !== s.last) { s.last = j; s.fn(clone(v)); } } };
  let offset = 0;
  const net: NetState = { connected: false, uid: auth.currentUser?.uid ?? null };
  const netSubs = new Set<(s: NetState) => void>();
  const tell = () => netSubs.forEach((f) => f({ ...net }));
  onValue(ref(db, '.info/serverTimeOffset'), (s) => { offset = Number(s.val()) || 0; });
  onValue(ref(db, '.info/connected'), (s) => { net.connected = !!s.val(); tell(); });
  onAuthStateChanged(auth, (u) => { net.uid = u?.uid ?? null; tell(); });
  // 맨 윗칸 실시간 → 거울 (첫 값이 모두 올 때까지 기다림 = get 이 바로 답할 수 있게)
  await Promise.all(ROOTS.map((k) => new Promise<void>((res) => {
    let first = true;
    onValue(ref(db, k), (snap) => { const v = snap.val(); if (v == null) delete mirror[k]; else mirror[k] = v; fire(k); if (first) { first = false; res(); } }, () => res());
  })));
  return {
    kind: 'server', net, auth, db,
    onNet(fn) { netSubs.add(fn); fn({ ...net }); return () => netSubs.delete(fn); },
    get<T>(path: string) { return clone(getIn(mirror, split(path))) as T | null; },
    set(path: string, value: unknown) {
      const v = value == null ? null : clone(value);
      if (!ROOTS.includes(split(path)[0] as (typeof ROOTS)[number])) console.warn('시험 서버: 거울 밖 경로', path);
      setIn(mirror, split(path), v); fire(path); // 거울 먼저 (화면이 바로 바뀜)
      fbSet(ref(db, split(path).join('/')), v).catch((e) => console.error('시험 서버 쓰기 실패', path, e));
    },
    watch<T>(path: string, fn: (v: T | null) => void): Unsub {
      const v = getIn(mirror, split(path)), s = { path, fn: fn as (v: unknown) => void, last: JSON.stringify(v ?? null) };
      subs.add(s); fn(clone(v) as T | null);
      return () => subs.delete(s);
    },
    now: () => Date.now() + offset,
  };
}
