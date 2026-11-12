import type { Store, Unsub } from '../model/types';

// 🧪 이 기기 저장 꽂개 — localStorage(경로마다 한 키) + BroadcastChannel (같은 브라우저 탭끼리 실시간)
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
  // 🧷 #119: 경로마다 따로 저장 (localStorage 키 = 「key|경로」) — 여러 탭이 한 덩어리를 통째로 덮어써서
  //   학생 탭 접속 신호(3초마다)가 선생님이 막 바꾼 값(집중 · 수업 끝 · 선물)을 지우던 것을 막음. 다른 경로 쓰기는 서로 덮지 않음
  //   읽기 = 얕은 경로부터 차례로 겹침 · 위 경로를 쓰면 그 아래 키는 지움 · 지우기 = null 표(위 경로 값 안의 칸을 지울 때)
  const P = `${key}|`;
  const load = (): Tree => {
    const t: Tree = {};
    try {
      const rows: [string[], unknown][] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(P)) continue;
        rows.push([split(k.slice(P.length)), JSON.parse(localStorage.getItem(k) || 'null')]);
      }
      rows.sort((a, b) => a[0].length - b[0].length).forEach(([parts, v]) => setIn(t, [...parts], v));
    } catch {
      /* 저장 막힘: 빈 판 */
    }
    return t;
  };
  let db = load();
  const subs = new Set<{ path: string; fn: (v: unknown) => void }>();
  const chan = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(key) : null;
  const clone = <T>(v: T): T => (v == null ? v : (JSON.parse(JSON.stringify(v)) as T));
  const fire = (path: string) => {
    for (const s of subs) if (related(s.path, path)) s.fn(clone(getIn(db, split(s.path))));
  };
  chan?.addEventListener('message', (e: MessageEvent<{ path: string; v: unknown }>) => {
    setIn(db, split(e.data.path), e.data.v ?? null); // 다른 탭이 쓴 그 경로만 반영
    fire(e.data.path);
  });

  return {
    kind: 'device',
    get<T>(path: string) {
      return clone(getIn(db, split(path))) as T | null;
    },
    set(path: string, value: unknown) {
      const parts = split(path), v = value == null ? null : clone(value);
      setIn(db, [...parts], v);
      try {
        const me = P + parts.join('/'), under = me + '/';
        const drop: string[] = [];
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(under)) drop.push(k); }
        drop.forEach((k) => localStorage.removeItem(k));
        localStorage.setItem(me, JSON.stringify(v));
      } catch {
        /* 저장 공간 막힘: 이 탭 메모리에만 */
      }
      fire(path);
      chan?.postMessage({ path, v });
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
