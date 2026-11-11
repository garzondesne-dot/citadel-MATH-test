import type { Store, Unsub } from '../model/types';

// 🧪 이 기기 저장 꽂개 — localStorage 한 덩어리 + BroadcastChannel (같은 브라우저 탭끼리 실시간)
// 정식 js/raid/net.js LocalNet 과 같은 방식. 서버에 닿지 않는다.
// 경로 = 'rooms/ABCD/players/u1' 처럼 / 로 나눔
type Tree = Record<string, unknown>;

const split = (p: string) => p.split('/').filter(Boolean);

function getIn(t: unknown, parts: string[]): unknown {
  let cur = t;
  for (const k of parts) {
    if (cur == null || typeof cur !== 'object') return null;
    cur = (cur as Tree)[k];
  }
  return cur === undefined ? null : cur;
}

function setIn(t: Tree, parts: string[], v: unknown): void {
  const last = parts.pop();
  if (last == null) return;
  let cur = t;
  for (const k of parts) {
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k] as Tree;
  }
  if (v === null || v === undefined) delete cur[last];
  else cur[last] = v;
}

const related = (a: string, b: string) => {
  const A = split(a).join('/'), B = split(b).join('/');
  return A === B || A.startsWith(B + '/') || B.startsWith(A + '/') || A === '' || B === '';
};

export function deviceStore(key = 'citadel-v1-test-db'): Store {
  const load = (): Tree => {
    try {
      return JSON.parse(localStorage.getItem(key) || '{}') as Tree;
    } catch {
      return {};
    }
  };
  let db = load();
  const subs = new Set<{ path: string; fn: (v: unknown) => void }>();
  const chan = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(key) : null;

  const fire = (path: string) => {
    for (const s of subs) if (related(s.path, path)) s.fn(clone(getIn(db, split(s.path))));
  };
  const clone = <T>(v: T): T => (v == null ? v : (JSON.parse(JSON.stringify(v)) as T));

  chan?.addEventListener('message', (e: MessageEvent<{ path: string }>) => {
    db = load();
    fire(e.data.path);
  });

  return {
    kind: 'device',
    get<T>(path: string) {
      return clone(getIn(db, split(path))) as T | null;
    },
    set(path: string, value: unknown) {
      db = load(); // 다른 탭이 쓴 것 위에 쓰기
      setIn(db, split(path), value == null ? null : clone(value));
      try {
        localStorage.setItem(key, JSON.stringify(db));
      } catch {
        /* 저장 공간 막힘: 이 탭 메모리에만 */
      }
      fire(path);
      chan?.postMessage({ path });
    },
    watch<T>(path: string, fn: (v: T | null) => void): Unsub {
      const s = { path, fn: fn as (v: unknown) => void };
      subs.add(s);
      fn(clone(getIn(db, split(path))) as T | null);
      return () => subs.delete(s);
    },
    now: () => Date.now(),
  };
}

/** 메모리 꽂개 (시험용 · 체험판 자리) — 같은 인터페이스 */
export function memoryStore(): Store {
  let db: Tree = {};
  const subs = new Set<{ path: string; fn: (v: unknown) => void }>();
  const clone = <T>(v: T): T => (v == null ? v : (JSON.parse(JSON.stringify(v)) as T));
  return {
    kind: 'memory',
    get: <T>(p: string) => clone(getIn(db, split(p))) as T | null,
    set(p, v) {
      setIn(db, split(p), v == null ? null : clone(v));
      for (const s of subs) if (related(s.path, p)) s.fn(clone(getIn(db, split(s.path))));
    },
    watch<T>(p: string, fn: (v: T | null) => void) {
      const s = { path: p, fn: fn as (v: unknown) => void };
      subs.add(s);
      fn(clone(getIn(db, split(p))) as T | null);
      return () => subs.delete(s);
    },
    now: () => Date.now(),
  };
}
