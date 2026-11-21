import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectDatabaseEmulator, get as fbGet, getDatabase, goOffline, goOnline, increment, onValue, ref, runTransaction, set as fbSet, update as fbUpdate, type Database } from 'firebase/database';
import { connectAuthEmulator, getAuth, inMemoryPersistence, initializeAuth, onAuthStateChanged, signInAnonymously, type Auth } from 'firebase/auth';
import type { Store, Unsub } from '../model/types';
import { setClockOffset } from '../ui/clock.svelte';
import { tidy as tidyParts } from './tidy';
import { deepEq, incMark, localStorageOut, makeOutbox, merge3, queued, txFn, type Outbox } from './outbox';

// 🔌 시험 서버 꽂개 (#137 · Firebase Realtime Database) — 같은 Store 꼴(get 은 바로 · set · watch · now)
//   읽기 = 맨 윗칸(rooms · school · gifts · mail · accounts)을 실시간으로 받아 둔 거울(mirror)에서 바로 · 쓰기 = 거울에 먼저 + 서버에 보냄
//   시계 = 서버 시각(.info/serverTimeOffset) · 끊김 = .info/connected · 로그인 = 처음엔 익명(TV · 교사 · 둘러보기) · 학생은 계정으로 바꿔 탐
//   ⚠ 시험 전용: 운영 프로젝트에는 연결하지 않음(config.ts 가 막음) · 맨 윗칸 통째로 받으므로 시험 규모용(출시 때 방 단위로 나눔)
type Tree = Record<string, unknown>;
const ROOTS = ['rooms', 'school', 'gifts', 'mail', 'accounts', 'gem', 'xp', 'cards', 'records', 'bonus', 'roster', 'rosterMask', 'tester', 'admins', 'secrets', 'boardLock', 'held', 'survey', 'surveyDone', 'gcfg', 'photo_rubric', 'photo', 'photo_q', 'quest', 'quest_q', 'act', 'loginFail', 'teacherPush', 'atb', 'classWar'] as const; // 🔑 loginFail = 로그인 실패 기록(학생 = 쓰기만 · 교사 = 통째로 · 📜 2026-11-16 교사 알림) // 📈 act = 활용 추이(학생 = 자기 칸 · 교사 = 통째로) // 📝 survey = 열림 표시(누구나) · surveyDone = 응답했는지(그 학생 · 교사) · surveyA = 거울 밖(학생은 쓰기만 trySet · 교사는 fetch) // boardLock = 📋 게시판 암호 해시(쓰기만 · 아무도 못 읽음) // #141 학생 기록 칸(V1-DESIGN 7절)
// 🔐 #163-① 규칙 좁히기: 누구나 통째로 받는 칸(OPEN) · 칸마다 받는 칸(BUCKET = 몇 단까지가 한 덩어리) — 교사(admins/{uid}) 폰은 모두 통째로
//   rooms/{방} · gem|xp|cards|records|bonus/{반}/{번호} · roster/{반} · secrets/{방} = 필요할 때 그 덩어리만 실시간 (get · watch · set 이 처음 닿을 때)
const OPEN = ['school', 'classWar', 'gifts', 'mail', 'accounts', 'rosterMask', 'tester', 'admins', 'survey', 'held', 'gcfg', 'photo_rubric']; // 📷 gcfg/photo · 기준표 = 누구나 읽기 // held = 반마다 게임으로 수업한 차시(작음 · 누구나 읽기) → 🏰 성채 진도 · 🔁 연속 참여
const BUCKET: Record<string, number> = { atb: 2, teacherPush: 2, loginFail: 3, rooms: 2, gem: 3, xp: 3, cards: 3, records: 3, bonus: 3, roster: 2, secrets: 2, surveyDone: 3, photo: 3, photo_q: 3, quest: 3, quest_q: 3, act: 4 }; // 📷 결과 · 장 수 = 학생은 내 칸 · 교사는 통째로
// 교사도 통째로 못 받는 칸(규칙이 맨 윗칸 읽기를 안 줌 · 정식 규칙 그대로) = 그 단까지 덩어리 · 📝 surveyDone = 반마다
const ADMIN_BUCKET: Record<string, number> = { surveyDone: 2, secrets: 2, atb: 2 }; // 📡 atb = 규칙이 판마다만 읽기 → 교사 계정도 판마다 받음 (#65-1 교사 팀 합류 = 새 전투) // 🐞 secrets = 규칙이 맨 윗칸 읽기를 안 줌 → 교사도 방마다(secrets/{방} · secrets/fixed) 받음 (📜 2026-11-17 「종합실 키 저장해도 나갔다 오면 사라짐」)
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
export interface ServerStore extends Store { /** 익명 로그인 실패 코드 ('' = 됨) */ anonErr?: string; /** 쓰기 결과를 기다림(거울 먼저 바꾸지 않음 · 규칙이 막으면 false) — 🔒 게시판 암호 */ trySet(path: string, value: unknown): Promise<boolean>; net: NetState; auth: Auth; db: Database; onNet(fn: (s: NetState) => void): Unsub; preload(cls: string, num: number): Promise<void>; isAdmin(): boolean; /** 📮 #81 B 폰 보관함 (못 보낸 학생 쓰기) */ outbox: OutboxApi }
/** 📮 #81 B 화면용: 내 보관함 줄 수 · 바뀌면 부름 · 지금 보내 보기(ms 안에 다 올라가면 0) */
export interface OutboxApi { count(): number; on(fn: () => void): Unsub; flush(ms?: number): Promise<number> }
export interface ServerOpts { firebase: FirebaseOptions; emulator?: { host: string; db: number; auth: number } | null; /** 앱 이름 (같은 이름 = 새로 고침해도 로그인 그대로 · 시험에서 여러 명을 한 곳에 띄울 때만 다르게) */ name?: string }

/** 기다리되 ms 넘으면 그냥 넘어감 (서버가 안 닿거나 규칙 게시 전이어도 화면이 멈추지 않게) */
const within = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<void>((r) => setTimeout(r, ms))]);
export async function serverStore(o: ServerOpts): Promise<ServerStore> {
  const app = initializeApp(o.firebase, o.name ?? 'citadel'); // #141: 이름이 늘 같아야 새로 고침 뒤에도 그 학생 로그인이 남음
  // 🧪 에뮬레이터 + ?as = 탭마다 따로 로그인(한 브라우저에 학생 여럿 · 규칙 학생 칸 주인 시험) · 그 밖 = 기억하는 로그인
  const tabAuth = !!o.emulator && typeof location !== 'undefined' && !!new URLSearchParams(location.search).get('as');
  const db = getDatabase(app), auth = tabAuth ? initializeAuth(app, { persistence: inMemoryPersistence }) : getAuth(app);
  if (o.emulator) { connectDatabaseEmulator(db, o.emulator.host, o.emulator.db); connectAuthEmulator(auth, `http://${o.emulator.host}:${o.emulator.auth}`, { disableWarnings: true }); }
  // 로그인 (규칙 = 로그인한 사람만) — 이미 계정으로 들어와 있으면 그대로
  let anonErr = ''; // 🔐 익명 로그인이 막히면(그 학교 Firebase 에서 「익명」 꺼짐) 화면 위 안내 (📜 2026-11-16 학교판)
  await within(new Promise<void>((res) => { const off = onAuthStateChanged(auth, (u) => { off(); if (u) res(); else signInAnonymously(auth).then(() => res(), (e) => { anonErr = String((e as { code?: string }).code || ''); console.error('시험 서버 로그인 실패', e); res(); }); }); }), 8000);
  const mirror: Tree = {};
  const subs = new Set<{ path: string; fn: (v: unknown) => void; last: string }>();
  // 🚨 11/19 ⓪ 반쪽 방 = 방이 지워진 뒤 늦게 온 학생 쓰기(players 등)만 남은 rooms/{코드} (state · meta 없음) → 「방 없음」으로 읽음
  //   (교사 캠프가 그런 방을 읽다 「Cannot read properties of undefined (reading 'step')」로 멈췄음 · 운영에 646434 · TEST 2개)
  const tidy = (path: string, v: unknown): unknown => tidyParts(split(path), v); // store/tidy.ts (반쪽 방 · 반쪽 사람 줄)
  const read = (path: string) => (isLoaded(path) ? tidy(path, getIn(mirror, split(path))) : null);
  const fire = (path: string) => { for (const s of subs) if (related(s.path, path)) { const v = read(s.path), j = JSON.stringify(v ?? null); if (j !== s.last) { s.last = j; s.fn(clone(v)); } } };
  let offset = 0;
  const net: NetState = { connected: false, uid: auth.currentUser?.uid ?? null };
  const netSubs = new Set<(s: NetState) => void>();
  const tell = () => netSubs.forEach((f) => f({ ...net }));
  onValue(ref(db, '.info/serverTimeOffset'), (s) => { offset = Number(s.val()) || 0; setClockOffset(offset); }); // ⏱ 화면 시계도 같은 서버 시각
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
    if (admin) { const a = ADMIN_BUCKET[p[0] ?? '']; return a == null ? (p[0] as string) : p.length >= a ? p.slice(0, a).join('/') : null; }
    return p.length >= d ? p.slice(0, d).join('/') : null; // 덩어리보다 위(예: records/1-3) = 교사만 · 학생은 받지 않음
  };
  const ensure = (path: string) => { const b = bucketOf(path); return b ? sub(b) : Promise.resolve(); };
  let admin = false;
  await within(Promise.all(OPEN.map((k) => sub(k))), 10000);
  const meUid = () => auth.currentUser?.uid ?? null;
  // 📮 #81 B 폰 보관함 — 학생 자기 칸 쓰기를 서버 확인 받을 때까지 이 폰에 (앱을 닫아도 남음) · 교사 · TV = 안 씀
  const box: Outbox = makeOutbox(typeof localStorage !== 'undefined' && !tabAuth ? localStorageOut() : { load: () => [], save: () => {} });
  const flying = new Set<string>(); // 이번 세션에 보낸 뒤 확인을 기다리는 줄 (SDK 가 스스로 다시 보냄 → 다시 보내기에서 뺌)
  const permDenied = (e: unknown) => /permission|PERMISSION_DENIED/i.test(String((e as { code?: string })?.code || e));
  const sendQ = (id: string, path: string, v: unknown) => {
    flying.add(id);
    return fbSet(ref(db, split(path).join('/')), v).then(() => { flying.delete(id); box.done(id); return true; }, (e) => { flying.delete(id); if (permDenied(e)) { console.warn('보관함: 규칙이 막아 버림', path); box.done(id); } return false; });
  };
  /** 🐞 #83-10 더하기 줄 보내기 = 더하기 + applied 표시를 한 번에 (둘 다 되거나 둘 다 안 됨) */
  const sendInc = (id: string, path: string, n: number, mark: string) => {
    flying.add(id);
    return fbUpdate(ref(db), { [split(path).join('/')]: increment(n), [mark]: true }).then(() => { flying.delete(id); box.done(id); return true; }, (e) => { flying.delete(id); if (permDenied(e)) { console.warn('보관함: 규칙이 막아 버림', path); box.done(id); } return false; });
  };
  /** 🐞 #83-12 합치기 줄 보내기 = transaction 으로 서버 값과 합침 (몇 번 보내도 같음) */
  const sendTx = (id: string, path: string, v: unknown, kind: string) => {
    const fn = txFn(kind); if (!fn) { box.done(id); return Promise.resolve(true); }
    flying.add(id);
    return runTransaction(ref(db, split(path).join('/')), (cur) => fn(cur ?? null, v) as never).then((r) => { flying.delete(id); if (r.committed) box.done(id); return r.committed; }, (e) => { flying.delete(id); if (permDenied(e)) { console.warn('보관함: 규칙이 막아 버림', path); box.done(id); } return false; });
  };
  let replaying = false;
  /** 남은 줄 다시 보내기 — 그 경로 서버 값을 먼저 받고(못 받으면 다음에) 세 갈래로 합쳐서 (📜 「서버 값 받기 전에 쓰지 않음」) */
  async function replay() {
    const who = meUid(); if (replaying || !who || admin || !net.connected) return;
    replaying = true;
    try {
      for (const it of box.list(who)) {
        if (flying.has(it.id)) continue;
        if (it.tx) { if (!(await sendTx(it.id, it.path, it.v, it.tx))) break; continue; } // 🐞 #83-12 합치기 줄
        if (it.inc) { // 🐞 #83-10 더하기 줄 = 표시가 있으면 이미 더해짐
          const mark = incMark(it.path, it.id); if (!mark) { box.done(it.id); continue; }
          let m: unknown; try { const snap = await Promise.race([fbGet(ref(db, mark)), new Promise<null>((r) => setTimeout(() => r(null), 8000))]); if (!snap) break; m = snap.val(); } catch (e) { if (permDenied(e)) { box.done(it.id); continue; } break; }
          if (m) { box.done(it.id); continue; }
          if (!(await sendInc(it.id, it.path, it.inc, mark))) break;
          continue;
        }
        let s: unknown;
        try { const snap = await Promise.race([fbGet(ref(db, it.path)), new Promise<null>((r) => setTimeout(() => r(null), 8000))]); if (!snap) break; s = snap.val(); } catch (e) { if (permDenied(e)) { box.done(it.id); continue; } break; }
        if (deepEq(s, it.v)) { box.done(it.id); continue; } // 이미 올라가 있음 (앱을 닫기 직전에 닿았던 것)
        let out = merge3(s, it.base, it.v);
        if (/^records\/[^/]+\/[^/]+\/[^/]+$/.test(it.path) && s && it.v) { const { mergeRow } = await import('../school/records'); out = mergeRow(s as never, it.v as never); } // 수업 기록 = 더 좋은 쪽 (#39 와 같은 합치기)
        if (deepEq(out, s)) { box.done(it.id); continue; }
        if (!(await sendQ(it.id, it.path, out))) break;
      }
    } finally { replaying = false; }
  }
  onValue(ref(db, '.info/connected'), (s) => { if (s.val()) setTimeout(() => void replay(), 1500); });
  onAuthStateChanged(auth, (u) => { if (u) setTimeout(() => void replay(), 2500); });
  if (typeof setInterval !== 'undefined') setInterval(() => void replay(), 60000);
  admin = !!meUid() && getIn(mirror, ['admins', meUid() as string]) === true;
  if (admin) await within(Promise.all(Object.keys(BUCKET).filter((k) => !(k in ADMIN_BUCKET)).map((k) => sub(k))), 10000);
  /** 로그인한 학생의 자기 칸을 먼저 받아 둠 (지갑을 「처음」으로 잘못 알고 덮어쓰지 않게) */
  async function preload(cls: string, num: number) { await within(Promise.all(['gem', 'xp', 'cards', 'records', 'bonus', 'surveyDone', 'photo', 'photo_q', 'quest', 'quest_q'].map((k) => sub(`${k}/${cls}/${num}`)).concat([sub(`roster/${cls}`)])), 8000); }
  { // 이미 로그인한 학생 = 내 계정 칸을 찾아 미리
    const u = meUid(), acc = (mirror.accounts || {}) as Record<string, Record<string, { uid?: string }>>;
    if (u && !admin) for (const [c, ns] of Object.entries(acc)) for (const [n, a] of Object.entries(ns || {})) if (a?.uid === u) await preload(c, Number(n));
  }
  const store: ServerStore = {
    kind: 'server', net, auth, db, anonErr,
    onNet(fn) { netSubs.add(fn); fn({ ...net }); return () => netSubs.delete(fn); },
    preload, isAdmin: () => admin, loaded: (path: string) => isLoaded(path),
    outbox: {
      count: () => { const w = meUid(); return w ? box.count(w) : 0; },
      on: (fn: () => void) => box.on(fn),
      async flush(ms = 8000) { const end = Date.now() + ms; await replay(); while (Date.now() < end) { const w = meUid(); if (!w || !box.count(w)) return 0; await new Promise((r) => setTimeout(r, 300)); if (!flying.size) await replay(); } const w = meUid(); return w ? box.count(w) : 0; },
    },
    get<T>(path: string) { void ensure(path); return clone(read(path)) as T | null; },
    set(path: string, value: unknown) {
      const v = value == null ? null : clone(value);
      if (!ROOTS.includes(split(path)[0] as (typeof ROOTS)[number])) console.warn('시험 서버: 거울 밖 경로', path);
      if (admin || split(path)[0] !== 'loginFail') void ensure(path); // 🔑 학생 = 로그인 실패 칸은 쓰기만(읽기 규칙 없음 · 받지 않음)
      const who = meUid(), q = !admin && !!who && queued(path);
      const base = q ? clone(getIn(mirror, split(path)) ?? null) : null;
      setIn(mirror, split(path), v); fire(path); // 거울 먼저 (화면이 바로 바뀜)
      if (q) { void sendQ(box.put(path, v, base, who!, Date.now()), path, v); return; } // 📮 #81 B 보관함에 먼저 → 서버 확인 = 지움
      fbSet(ref(db, split(path).join('/')), v).catch((e) => { if (/\/hosts\/|^\/?hostKeys\//.test(path)) console.warn('종합실 키가 달라요', path); else console.error('시험 서버 쓰기 실패', path, e); }); // TV 가 기억한 키가 새 수업 키와 다르면 규칙이 막음 = 키 입력 화면
    },
    // 🐞 11/20 ② 통째로 덮어쓰기 막기: 수 칸 = 서버에서 더함 (두 기기 · 늦게 온 거울이 서로 지우지 않음)
    add(path: string, n: number) {
      if (!Number.isFinite(n) || !n) return;
      void ensure(path);
      const parts = split(path), cur = Number(getIn(mirror, parts)) || 0;
      setIn(mirror, [...parts], cur + n); fire(path); // setIn 은 parts 를 줄이므로 사본
      const who = meUid();
      if (!admin && who && queued(path)) { const id = box.putInc(path, n, who, Date.now()), mark = incMark(path, id); if (mark) { void sendInc(id, path, n, mark); return; } box.done(id); } // 🐞 #83-10 보관함 더하기 줄
      fbSet(ref(db, parts.join('/')), increment(n)).catch((e) => console.error('시험 서버 더하기 실패', path, e));
    },
    merge(path: string, v: unknown, kind: string) {
      const fn = txFn(kind); if (!fn) return;
      void ensure(path);
      const parts = split(path); setIn(mirror, [...parts], clone(fn(clone(getIn(mirror, parts) ?? null), v) ?? null)); fire(path); // 거울 먼저
      const who = meUid();
      if (!admin && who && queued(path)) { void sendTx(box.putTx(path, v, kind, who, Date.now()), path, v, kind); return; }
      void runTransaction(ref(db, parts.join('/')), (cur) => fn(cur ?? null, v) as never).catch((e) => console.error('시험 서버 합치기 실패', path, e));
    },
    async tx<T>(path: string, fn: (cur: T | null) => T | null | undefined, ms = 8000) {
      await ensure(path);
      const parts = split(path);
      try {
        const run = runTransaction(ref(db, parts.join('/')), (cur) => { const v = fn(clone(cur ?? null) as T | null); return v === undefined ? undefined : v; });
        const r = ms ? await within(run, ms) : await run; // 🐞 #83-11 ms 0 = 끝까지 기다림 (시간 초과로 「못 함」이라 해 놓고 뒤에 서버가 마저 하던 구멍)
        if (!r || !r.committed) return false;
        setIn(mirror, [...parts], clone(r.snapshot.val() ?? null)); fire(path); return true;
      } catch (e) { console.error('시험 서버 고쳐 쓰기 실패', path, e); return false; }
    },
    async trySet(path: string, value: unknown) {
      void ensure(path);
      const ok = await Promise.race([fbSet(ref(db, split(path).join('/')), value == null ? null : clone(value)).then(() => true, () => false), new Promise<boolean>((r) => setTimeout(() => r(false), 8000))]);
      if (ok) { setIn(mirror, split(path), value == null ? null : clone(value)); fire(path); }
      return ok;
    },
    watch<T>(path: string, fn: (v: T | null) => void): Unsub {
      void ensure(path);
      const v = read(path), s = { path, fn: fn as (v: unknown) => void, last: JSON.stringify(v ?? null) };
      subs.add(s); fn(clone(v) as T | null);
      return () => subs.delete(s);
    },
    now: () => Date.now() + offset,
    // 📄 거울 밖 칸 한 번 받기 (#158 prep/{차시}/img/{칸} · 그 단계에서만 한 장씩) · 거울 안 칸이면 거울에서
    async fetch<T>(path: string) {
      if (ROOTS.includes(split(path)[0] as (typeof ROOTS)[number])) { await ensure(path); return clone(tidy(path, getIn(mirror, split(path)))) as T | null; }
      try { const s = await within(fbGet(ref(db, split(path).join('/'))), 8000); return (tidy(path, s && 'val' in s ? s.val() : null) as T) ?? null; } catch (e) { console.warn('시험 서버 받기 실패', path, e); return null; }
    },
  };
  // 🧪 에뮬레이터 시험만: 끊김 흉내 · 보관함 시험 (#81 B e2e outbox81) — 운영 · 베타 서버에는 없음
  if (o.emulator && typeof window !== 'undefined') (window as unknown as { __ds?: unknown }).__ds = { S: store, off: () => goOffline(db), on: () => goOnline(db) };
  return store;
}
