import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectDatabaseEmulator, get as fbGet, getDatabase, onValue, ref, set as fbSet, type Database } from 'firebase/database';
import { connectAuthEmulator, getAuth, onAuthStateChanged, signInAnonymously, type Auth } from 'firebase/auth';
import type { Store, Unsub } from '../model/types';

// 🔌 시험 서버 꽂개 (#137 · Firebase Realtime Database) — 같은 Store 꼴(get 은 바로 · set · watch · now)
//   읽기 = 맨 윗칸(rooms · school · gifts · mail · accounts)을 실시간으로 받아 둔 거울(mirror)에서 바로 · 쓰기 = 거울에 먼저 + 서버에 보냄
//   시계 = 서버 시각(.info/serverTimeOffset) · 끊김 = .info/connected · 로그인 = 처음엔 익명(TV · 교사 · 둘러보기) · 학생은 계정으로 바꿔 탐
//   ⚠ 시험 전용: 운영 프로젝트에는 연결하지 않음(config.ts 가 막음) · 맨 윗칸 통째로 받으므로 시험 규모용(출시 때 방 단위로 나눔)
type Tree = Record<string, unknown>;
const ROOTS = ['rooms', 'school', 'gifts', 'mail', 'accounts', 'gem', 'xp', 'cards', 'records', 'bonus', 'roster', 'rosterMask', 'tester', 'admins', 'secrets'] as const; // #141 학생 기록 칸(V1-DESIGN 7절)
// 🔐 #163-① 규칙 좁히기: 누구나 통째로 받는 칸(OPEN) · 칸마다 받는 칸(BUCKET = 몇 단까지가 한 덩어리) — 교사(admins/{uid}) 폰은 모두 통째로
//   rooms/{방} · gem|xp|cards|records|bonus/{반}/{번호} · roster/{반} · secrets/{방} = 필요할 때 그 덩어리만 실시간 (get · watch · set 이 처음 닿을 때)
const OPEN = ['school', 'gifts', 'mail', 'accounts', 'rosterMask', 'tester', 'admins'];
const BUCKET: Record<string, number> = { rooms: 2, gem: 3, xp: 3, cards: 3, records: 3, bonus: 3, roster: 2, secrets: 2 };
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
export interface ServerStore extends Store { net: NetState; auth: Auth; db: Database; onNet(fn: (s: NetState) => void): Unsub; preload(cls: string, num: number): Promise<void>; isAdmin(): boolean }
export interface ServerOpts { firebase: FirebaseOptions; emulator?: { host: string; db: number; auth: number } | null; /** 앱 이름 (같은 이름 = 새로 고침해도 로그인 그대로 · 시험에서 여러 명을 한 곳에 띄울 때만 다르게) */ name?: string }

/** 기다리되 ms 넘으면 그냥 넘어감 (서버가 안 닿거나 규칙 게시 전이어도 화면이 멈추지 않게) */
const within = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<void>((r) => setTimeout(r, ms))]);
export async function serverStore(o: ServerOpts): Promise<ServerStore> {
  const app = initializeApp(o.firebase, o.name ?? 'citadel'); // #141: 이름이 늘 같아야 새로 고침 뒤에도 그 학생 로그인이 남음
  const db = getDatabase(app), auth = getAuth(app);
  if (o.emulator) { connectDatabaseEmulator(db, o.emulator.host, o.emulator.db); connectAuthEmulator(auth, `http://${o.emulator.host}:${o.emulator.auth}`, { disableWarnings: true }); }
  // 로그인 (규칙 = 로그인한 사람만) — 이미 계정으로 들어와 있으면 그대로
  await within(new Promise<void>((res) => { const off = onAuthStateChanged(auth, (u) => { off(); if (u) res(); else signInAnonymously(auth).then(() => res(), (e) => { console.error('시험 서버 로그인 실패', e); res(); }); }); }), 8000);
  const mirror: Tree = {};
  const subs = new Set<{ path: string; fn: (v: unknown) => void; last: string }>();
  const fire = (path: string) => { for (const s of subs) if (related(s.path, path)) { const v = isLoaded(s.path) ? getIn(mirror, split(s.path)) : null, j = JSON.stringify(v ?? null); if (j !== s.last) { s.last = j; s.fn(clone(v)); } } };
  let offset = 0;
  const net: NetState = { connected: false, uid: auth.currentUser?.uid ?? null };
  const netSubs = new Set<(s: NetState) => void>();
  const tell = () => netSubs.forEach((f) => f({ ...net }));
  onValue(ref(db, '.info/serverTimeOffset'), (s) => { offset = Number(s.val()) || 0; });
  onValue(ref(db, '.info/connected'), (s) => { net.connected = !!s.val(); tell(); });
  onAuthStateChanged(auth, (u) => { net.uid = u?.uid ?? null; tell(); });
  // 거울 덩어리 구독 (같은 덩어리는 한 번) · 첫 값이 올 때까지 기다리는 약속을 돌려줌
  const live = new Map<string, Promise<void>>(), loaded = new Set<string>();
  // 덩어리 첫 값이 오기 전에는 그 안을 「없음」으로 (접속 신호 같은 내 쓰기만 들어간 반쪽 방을 화면이 읽지 않게)
  const isLoaded = (path: string) => { const b = bucketOf(path); if (!b) return true; for (const k of loaded) if (b === k || b.startsWith(k + '/')) return true; return false; };
  function sub(path: string): Promise<void> {
    for (const [k, pr] of live) if (path === k || path.startsWith(k + '/')) return pr;
    const pr = new Promise<void>((res) => {
      let first = true;
      onValue(ref(db, path), (snap) => { setIn(mirror, split(path), snap.val() ?? null); loaded.add(path); fire(path); if (first) { first = false; res(); } }, (e) => { console.warn('시험 서버 읽기 막힘(규칙)', path, String(e).slice(0, 80)); loaded.add(path); res(); });
    });
    live.set(path, pr); return pr;
  }
  const bucketOf = (path: string): string | null => {
    const p = split(path), d = BUCKET[p[0] ?? ''];
    if (d == null) return OPEN.includes(p[0] ?? '') ? (p[0] as string) : null;
    if (admin) return p[0] as string;
    return p.length >= d ? p.slice(0, d).join('/') : null; // 덩어리보다 위(예: records/1-3) = 교사만 · 학생은 받지 않음
  };
  const ensure = (path: string) => { const b = bucketOf(path); return b ? sub(b) : Promise.resolve(); };
  let admin = false;
  await within(Promise.all(OPEN.map((k) => sub(k))), 10000);
  const meUid = () => auth.currentUser?.uid ?? null;
  admin = !!meUid() && getIn(mirror, ['admins', meUid() as string]) === true;
  if (admin) await within(Promise.all(Object.keys(BUCKET).map((k) => sub(k))), 10000);
  /** 로그인한 학생의 자기 칸을 먼저 받아 둠 (지갑을 「처음」으로 잘못 알고 덮어쓰지 않게) */
  async function preload(cls: string, num: number) { await within(Promise.all(['gem', 'xp', 'cards', 'records', 'bonus'].map((k) => sub(`${k}/${cls}/${num}`)).concat([sub(`roster/${cls}`)])), 8000); }
  { // 이미 로그인한 학생 = 내 계정 칸을 찾아 미리
    const u = meUid(), acc = (mirror.accounts || {}) as Record<string, Record<string, { uid?: string }>>;
    if (u && !admin) for (const [c, ns] of Object.entries(acc)) for (const [n, a] of Object.entries(ns || {})) if (a?.uid === u) await preload(c, Number(n));
  }
  return {
    kind: 'server', net, auth, db,
    onNet(fn) { netSubs.add(fn); fn({ ...net }); return () => netSubs.delete(fn); },
    preload, isAdmin: () => admin,
    get<T>(path: string) { void ensure(path); return isLoaded(path) ? (clone(getIn(mirror, split(path))) as T | null) : null; },
    set(path: string, value: unknown) {
      const v = value == null ? null : clone(value);
      if (!ROOTS.includes(split(path)[0] as (typeof ROOTS)[number])) console.warn('시험 서버: 거울 밖 경로', path);
      void ensure(path);
      setIn(mirror, split(path), v); fire(path); // 거울 먼저 (화면이 바로 바뀜)
      fbSet(ref(db, split(path).join('/')), v).catch((e) => { if (/\/hosts\//.test(path)) console.warn('종합실 키가 달라요', path); else console.error('시험 서버 쓰기 실패', path, e); }); // TV 가 기억한 키가 새 수업 키와 다르면 규칙이 막음 = 키 입력 화면
    },
    watch<T>(path: string, fn: (v: T | null) => void): Unsub {
      void ensure(path);
      const v = isLoaded(path) ? getIn(mirror, split(path)) : null, s = { path, fn: fn as (v: unknown) => void, last: JSON.stringify(v ?? null) };
      subs.add(s); fn(clone(v) as T | null);
      return () => subs.delete(s);
    },
    now: () => Date.now() + offset,
    // 📄 거울 밖 칸 한 번 받기 (#158 prep/{차시}/img/{칸} · 그 단계에서만 한 장씩) · 거울 안 칸이면 거울에서
    async fetch<T>(path: string) {
      if (ROOTS.includes(split(path)[0] as (typeof ROOTS)[number])) { await ensure(path); return clone(getIn(mirror, split(path))) as T | null; }
      try { const s = await within(fbGet(ref(db, split(path).join('/'))), 8000); return (s && 'val' in s ? (s.val() as T) : null) ?? null; } catch (e) { console.warn('시험 서버 받기 실패', path, e); return null; }
    },
  };
}
