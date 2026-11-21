// 📮 #81 B 폰 보관함 (📜 선생님 2026-11-21 「서버 정보가 생각보다 수시로 날아가 · 학생들 폰에 저장되게 만들었다가 나중에 서버 접속되면 다시」
//   + 「학생이 폰을 바꿔서 기록이 아예 날아가는 참사는 막아야지」)
//   서버 = 원본 · 보관함 = 아직 서버 확인을 못 받은 학생 쓰기만 잠깐 (확인 오면 바로 지움) · 화면은 보관함을 읽지 않음(다른 폰 = 서버 값 그대로)
//   한 줄 = { id, path, v(쓴 값), base(쓰기 전 거울 값), at, who(로그인 uid) } · 같은 경로 = 한 줄로 합침(처음 base · 마지막 v)
//   다시 보내기 = 그 경로 서버 값을 받은 뒤에만 (11/20 지갑 덮어쓰기 꼴 막음): 서버 = v → 지움 · 서버 = base(그 뒤 안 바뀜) → v 보냄 ·
//   서버가 그새 바뀜 → merge3(서버 · base · v): 수 = 서버 + (v − base) · 객체 = 칸마다 · 서버에 없는 칸 = v · 그 밖 글 = 서버 그대로
//   한도 = 7일 · 500줄 · 약 1MB (넘으면 오래된 것부터 · gem/ · xp/ 는 맨 나중에 버림) · 체험판 · 이 기기 모드 = 안 씀
export interface OutItem { id: string; path: string; v: unknown; base: unknown; at: number; who: string }
export interface OutStorage { load(): OutItem[]; save(list: OutItem[]): void }
export const OUT_ROOTS = ['gem', 'xp', 'cards', 'records', 'bonus', 'gifts', 'mail', 'surveyDone', 'quest'] as const;
export const OUT_LIMIT = { days: 7, items: 500, bytes: 1_000_000 };
const KEY = 'citadel-v1-outbox';
const split = (p: string) => p.split('/').filter(Boolean);
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
export const deepEq = (a: unknown, b: unknown): boolean => JSON.stringify(norm(a)) === JSON.stringify(norm(b));
/** null · 빈 객체 · undefined 칸을 지운 꼴 (Firebase 는 빈 칸을 안 남김) + 키 정렬 */
function norm(x: unknown): unknown {
  if (x === undefined || x === null) return null;
  if (Array.isArray(x)) return x.map(norm);
  if (!isObj(x)) return x;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(x).sort()) { const v = norm(x[k]); if (v !== null && !(isObj(v) && !Object.keys(v).length)) out[k] = v; }
  return Object.keys(out).length ? out : null;
}
/** 보관함에 넣을 경로인가 (학생 자기 칸 · 실시간 방 · 게시판 · 학교 칸은 뺌) */
export const queued = (path: string) => (OUT_ROOTS as readonly string[]).includes(split(path)[0] ?? '');
/** 세 갈래 합치기 — 서버가 그새 바뀌었을 때 (s = 지금 서버 · base = 폰이 쓰기 전에 알던 값 · v = 폰이 쓴 값) */
export function merge3(s: unknown, base: unknown, v: unknown): unknown {
  if (deepEq(s, base)) return v; // 서버가 그대로 = 폰 값
  if (deepEq(v, base)) return s; // 폰이 바꾼 것 없음
  if (typeof v === 'number' && typeof s === 'number') return s + (v - (typeof base === 'number' ? base : 0)); // 💎 · 📜 · EXP = 늘어난 만큼만 더함
  if (isObj(v)) {
    const S0 = isObj(s) ? s : {}, B0 = isObj(base) ? base : {}, out: Record<string, unknown> = { ...S0 };
    for (const k of Object.keys(v)) out[k] = k in S0 ? merge3(S0[k], B0[k], v[k]) : B0[k] !== undefined && B0[k] !== null ? undefined : v[k]; // 서버가 지운 칸(base 에 있었는데 서버에 없음) = 지운 쪽
    for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
    return out;
  }
  if (s === null || s === undefined) return v; // 서버에 없음 = 폰 값
  return s; // 글 · 참거짓이 서로 다름 = 서버 그대로
}
export function localStorageOut(key = KEY): OutStorage {
  return {
    load() { try { const x = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(x) ? (x as OutItem[]) : []; } catch { return []; } },
    save(list) { try { if (list.length) localStorage.setItem(key, JSON.stringify(list)); else localStorage.removeItem(key); } catch { /* 저장 칸 막힘 = 메모리만 */ } },
  };
}
/** 한도 자르기 (오래된 것부터 · 💎 · EXP 줄은 마지막까지 남김) */
export function trim(list: OutItem[], now: number): OutItem[] {
  let out = list.filter((x) => now - x.at < OUT_LIMIT.days * 86400e3);
  const keep = (x: OutItem) => /^(gem|xp)\//.test(x.path);
  const size = () => JSON.stringify(out).length;
  while (out.length > OUT_LIMIT.items || (out.length > 1 && size() > OUT_LIMIT.bytes)) {
    const i = out.findIndex((x) => !keep(x)); out.splice(i >= 0 ? i : 0, 1);
  }
  return out;
}
let seq = 0;
export interface Outbox {
  /** 쓰기 하나 넣기 → 그 줄 id (같은 경로 · 같은 사람 = 한 줄로 합침 · 위 경로를 쓰면 아래 줄은 그 안으로) */
  put(path: string, v: unknown, base: unknown, who: string, now: number): string;
  /** 서버 확인 → 지움 (그 사이 같은 경로를 또 썼으면 그 줄은 남김) */
  done(id: string): void;
  list(who?: string): OutItem[];
  count(who?: string): number;
  on(fn: () => void): () => void;
}
export function makeOutbox(st: OutStorage): Outbox {
  let items = st.load();
  const subs = new Set<() => void>();
  const save = () => { st.save(items); subs.forEach((f) => f()); };
  return {
    put(path, v, base, who, now) {
      const p = split(path).join('/');
      const under = (a: string, b: string) => a === b || a.startsWith(b + '/');
      // 이 경로를 감싸는 줄이 있으면 = 그 줄 값 안에 넣음
      const parent = items.find((x) => x.who === who && under(p, x.path) && x.path !== p);
      if (parent) {
        const rest = split(p.slice(parent.path.length));
        const nv = isObj(parent.v) ? structuredClone(parent.v) : {};
        let cur = nv as Record<string, unknown>;
        rest.slice(0, -1).forEach((k) => { if (!isObj(cur[k])) cur[k] = {}; cur = cur[k] as Record<string, unknown>; });
        if (v === null || v === undefined) delete cur[rest[rest.length - 1]!]; else cur[rest[rest.length - 1]!] = structuredClone(v);
        parent.v = nv; parent.at = now; parent.id = `o${now.toString(36)}${(seq++).toString(36)}`; items = trim(items, now); save(); return parent.id;
      }
      // 이 경로 아래 줄들 = 이번 값이 덮음 → base 는 가장 먼저 알던 값을 살림
      const kids = items.filter((x) => x.who === who && under(x.path, p));
      const same = kids.find((x) => x.path === p);
      items = items.filter((x) => !(x.who === who && under(x.path, p)));
      const id = `o${now.toString(36)}${(seq++).toString(36)}`;
      // 거울 값(base)에는 아직 안 올라간 아래 줄 값이 섞여 있음 → 그 칸은 아래 줄이 알던 처음 값으로 되돌림
      let b0: unknown = same ? same.base : base ?? null;
      if (!same && kids.length) {
        b0 = isObj(base) ? structuredClone(base) : {};
        for (const k of kids) {
          const rest = split(k.path.slice(p.length)); let cur = b0 as Record<string, unknown>;
          rest.slice(0, -1).forEach((r) => { if (!isObj(cur[r])) cur[r] = {}; cur = cur[r] as Record<string, unknown>; });
          if (k.base === null || k.base === undefined) delete cur[rest[rest.length - 1]!]; else cur[rest[rest.length - 1]!] = structuredClone(k.base);
        }
      }
      items.push({ id, path: p, v: v ?? null, base: b0, at: now, who });
      items = trim(items, now); save(); return id;
    },
    done(id) { const n = items.length; items = items.filter((x) => x.id !== id); if (items.length !== n) save(); },
    list(who) { return items.filter((x) => !who || x.who === who).map((x) => ({ ...x })); },
    count(who) { return items.filter((x) => !who || x.who === who).length; },
    on(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}
