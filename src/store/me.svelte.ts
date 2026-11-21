import { lookId } from '../model/hero';
import { equipOf, type Look } from '../model/draft';
import { ECON_VER, migrate, type Wallet } from '../model/wallet';
import { meBound, p, type Bound } from './meSync';
import type { Store } from '../model/types';
import { onDestroy } from 'svelte';
import { addTo, txOn } from './atomic';
import { registerTx } from './outbox';
// 🧑 학생 한 명의 기록 — 이 기기(서버 없음 · 시험 · 교사 · TV) 또는 시험 서버(#141 · 그 학생으로 로그인한 폰 = store/meSync.ts 정식 경로)
//   seen = 캠프에서 한 번이라도 눌러 본 물건 (#111 ② 이름표 규칙)
//   socket = 용사마다 끼운 스킬 · title = 고른 호칭 id(hero-data titles · 'none' = 안 닮) · 산 용사 · 스킬 = wallet.buys { id, ver } · test = 🧪 테스트 기록(「테스터」 배지)
export interface Me { nick: string; hero: number; enh: number; xp: number; socket: Record<string, string>; title: string; /** 🏅 W2 용사마다 칭호 (accounts/…/titles) */ titles?: Record<string, string>; wallet: Wallet; seen: Record<string, true>; wish: number; test: boolean; /** ⭐ 기호 톡 찜(기호 id) · 모루에서 만든 카드(카드 id) (#129) */ wishes: Record<string, true>; cards: Record<string, true>; /** 🎨 고른 테마 (#144 · 서버 accounts 에 · 다른 폰도 같음) */ theme?: string }
const KEY = 'citadel-v1-me';
const fresh = (gem: number, scroll: number, test: boolean): Me => ({ nick: '학생 01', hero: 0, enh: 0, xp: 0, socket: {}, title: 'none', wallet: { gem, scroll, buys: [], ver: ECON_VER }, seen: {}, wish: 0, test, wishes: {}, cards: {} });
/** 폰에만 남기는 칸 (서버에 안 씀) */
const LOCAL_ONLY = ['seen', 'wish', 'wishes'] as const;
const localKey = (b: Bound | null) => (b ? `${KEY}|${b.cls}|${b.num}` : KEY);
function readLocal(key: string): Partial<Me> | null { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as Partial<Me>) : null; } catch { return null; } }
//   🔁 #163 정식 칸 지킴: 정식 gem 의 다른 칸(earned · log{키: {g, at, why}} · medal · chest · feather …)은 읽지도 지우지도 않음 → 칸마다 씀
//   buy = 정식은 { 물건: 산 시각 } · v1.0 은 [{ id, ver, at }] → 정식 꼴이면 경제 0판(정식)으로 읽고 migrate 로 옮김(기록 = mlog) · 이전 기록 = mlog(정식 log 와 겹치지 않게)
type GemRow = { total?: number; scroll?: number; enh?: number; buy?: Wallet['buys'] | Record<string, number | Wallet['buys'][number]>; ver?: number; mlog?: string[]; day?: Record<string, number> };
/** 정식 buy 지도 { id: at } 또는 v1.0 목록 → v1.0 목록 · 판 */
export function buysOf(gem: GemRow): { buys: Wallet['buys']; ver: number } {
  const v = Object.values(gem.buy || {});
  if (v.length && v.every((x) => typeof x === 'number')) return { buys: Object.entries(gem.buy as Record<string, number>).map(([id, at]) => ({ id, ver: 0, at: Number(at) || 0 })), ver: 0 };
  return { buys: v.filter((x): x is Wallet['buys'][number] => !!x && typeof x === 'object'), ver: gem.ver ?? (v.length ? ECON_VER : ECON_VER) };
}
function fromServer(b: Bound): Partial<Me> {
  const acc = b.S.get<{ hero?: number; socket?: Record<string, string>; title?: string; titles?: Record<string, string>; theme?: string }>(p(b, 'accounts')) || {};
  const gem = b.S.get<GemRow>(p(b, 'gem'));
  const xp = b.S.get<{ total?: number }>(p(b, 'xp'));
  const cards = b.S.get<Record<string, true>>(p(b, 'cards'));
  const out: Partial<Me> = {};
  if (acc.hero != null) out.hero = acc.hero;
  if (acc.socket) out.socket = acc.socket;
  if (acc.title) out.title = acc.title;
  if (acc.titles) out.titles = acc.titles;
  if (acc.theme) out.theme = acc.theme;
  if (gem) { const bv = buysOf(gem); out.enh = gem.enh ?? 0; out.wallet = { gem: gem.total ?? 0, scroll: gem.scroll ?? 0, buys: bv.buys, ver: bv.ver, ...(gem.mlog ? { log: Object.values(gem.mlog) } : {}), ...(gem.day ? { day: gem.day } : {}) }; }
  if (xp) out.xp = xp.total ?? 0;
  if (cards) out.cards = cards;
  return out;
}
// 🐞 11/20 ② 통째로 덮어쓰기 막기 — 서버에 「마지막으로 맞춘 값(base)」을 기억하고
//   수 칸(💎 · 📜 · 강화 · EXP · 하루 💎) = 늘거나 준 만큼만 더함(increment) · 나머지 칸 = 이 폰에서 바뀐 것만 씀 · 산 것 = 서버 최신 목록과 합침(transaction)
//   다른 기기 · 수업 보상 · 선물이 서버를 바꾸면 = 이 폰 값도 그만큼 옮김(rebase) → 두 기기로 써도 서로 지우지 않음
type Base = { gem: number; scroll: number; enh: number; xp: number; day: Record<string, number>; hero?: number; socket?: Record<string, string>; title?: string; titles?: Record<string, string>; theme?: string; ver?: number; log?: string[]; buys: Wallet['buys'] };
const eq = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const cl = <T>(v: T): T => (v == null ? v : (JSON.parse(JSON.stringify(v)) as T));
function srvBase(b: Bound): Base {
  const acc = b.S.get<{ hero?: number; socket?: Record<string, string>; title?: string; titles?: Record<string, string>; theme?: string }>(p(b, 'accounts')) || {};
  const gem = b.S.get<GemRow>(p(b, 'gem')) || {}, xp = b.S.get<{ total?: number }>(p(b, 'xp')) || {}, bv = buysOf(gem);
  return { gem: Number(gem.total) || 0, scroll: Number(gem.scroll) || 0, enh: Number(gem.enh) || 0, xp: Number(xp.total) || 0, day: { ...(gem.day || {}) }, hero: acc.hero, socket: acc.socket, title: acc.title, titles: acc.titles, theme: acc.theme, ver: gem.ver, log: gem.mlog ? Object.values(gem.mlog) : undefined, buys: bv.buys };
}
const meBase = (m: Me): Base => cl({ gem: m.wallet.gem, scroll: m.wallet.scroll, enh: m.enh, xp: m.xp, day: m.wallet.day || {}, hero: m.hero, socket: m.socket, title: m.title, titles: m.titles, theme: m.theme, ver: m.wallet.ver, log: m.wallet.log, buys: m.wallet.buys });
const buyKey = (x: Wallet['buys']) => JSON.stringify([...(x || [])].map((b) => `${b.id}|${b.ver}`).sort());
/** 산 것 합치기: 내 목록 + 서버에만 있는 것 (같은 id = 내 것 · 산 것은 늘기만) */
export function mergeBuys(server: GemRow['buy'] | null | undefined, mine: Wallet['buys']): Wallet['buys'] {
  const sv = buysOf({ buy: server || undefined }).buys, ids = new Set(mine.map((x) => x.id));
  return [...mine.map((x) => ({ ...x })), ...sv.filter((x) => !ids.has(x.id))];
}
registerTx('buys', (cur, v) => mergeBuys(cur as GemRow['buy'], v as Wallet['buys'])); // 🐞 #83-12 보관함이 다시 보낼 때 쓰는 합치기
/** 서버가 바뀜(다른 기기 · 보상 · 선물) → 이 폰 값을 그만큼 옮김 · base = 서버 값 */
function rebase(me: Me, base: Base, sv: Base) {
  me.wallet.gem += sv.gem - base.gem; me.wallet.scroll += sv.scroll - base.scroll; me.enh += sv.enh - base.enh; me.xp += sv.xp - base.xp;
  const day = { ...(me.wallet.day || {}) };
  for (const d of new Set([...Object.keys(sv.day), ...Object.keys(base.day)])) { const n = (Number(day[d]) || 0) + (Number(sv.day[d]) || 0) - (Number(base.day[d]) || 0); if (n) day[d] = n; else delete day[d]; }
  if (Object.keys(day).length || me.wallet.day) me.wallet.day = day;
  const take = <K extends 'hero' | 'socket' | 'title' | 'titles' | 'theme'>(k: K) => { if (sv[k] !== undefined && eq(me[k], base[k])) (me as Me)[k] = cl(sv[k]) as Me[K]; };
  take('hero'); take('socket'); take('title'); take('titles'); take('theme');
  if (sv.ver !== undefined && eq(me.wallet.ver, base.ver)) me.wallet.ver = sv.ver;
  if (sv.log && eq(me.wallet.log, base.log)) me.wallet.log = [...sv.log];
  const ids = new Set(me.wallet.buys.map((x) => x.id)), more = sv.buys.filter((x) => !ids.has(x.id));
  if (more.length) me.wallet.buys = [...me.wallet.buys, ...more];
  Object.assign(base, cl(sv));
}
function toServer(b: Bound, me: Me, base: Base) {
  const S = b.S, a = p(b, 'accounts'), g = p(b, 'gem'), x = p(b, 'xp');
  // 수 칸 = 늘어난 만큼만 (base 먼저 옮김: add 가 바로 watch 를 부르므로)
  const add = (k: 'gem' | 'scroll' | 'enh' | 'xp', now: number, path: string) => { const d = now - base[k]; if (!d) return; base[k] = now; addTo(S, path, d); };
  add('gem', me.wallet.gem, `${g}/total`); add('scroll', me.wallet.scroll, `${g}/scroll`); add('enh', me.enh, `${g}/enh`); add('xp', me.xp, `${x}/total`); // 정식 xp.log · ttl 은 그대로
  for (const [d, n] of Object.entries(me.wallet.day || {})) { const dd = (Number(n) || 0) - (Number(base.day[d]) || 0); if (dd) { base.day[d] = Number(n) || 0; addTo(S, `${g}/day/${d}`, dd); } }
  // 나머지 칸 = 바뀐 것만 (uid · at · 정식 log · earned · medal … 은 그대로)
  const put = <K extends 'hero' | 'socket' | 'title' | 'titles' | 'theme'>(k: K) => { if (me[k] === undefined || eq(me[k], base[k])) return; (base as Base)[k] = cl(me[k]) as Base[K]; S.set(`${a}/${k}`, cl(me[k])); };
  put('hero'); put('socket'); put('title'); put('titles'); put('theme');
  if (!eq(me.wallet.ver, base.ver)) { base.ver = me.wallet.ver; S.set(`${g}/ver`, me.wallet.ver); }
  if (me.wallet.log?.length && !eq(me.wallet.log, base.log)) { base.log = [...me.wallet.log]; S.set(`${g}/mlog`, me.wallet.log); }
  if (buyKey(me.wallet.buys) !== buyKey(base.buys)) { // 🐞 #83-12 산 것 = 보관함 합치기 줄(끊긴 채 닫아도 💎 빠짐과 같이 다시 올라감) · 서버 아님 = 예전 그대로
    const mine = cl(me.wallet.buys); base.buys = cl(mine);
    if (S.merge) S.merge(`${g}/buy`, mine, 'buys'); else void txOn<GemRow['buy']>(S, `${g}/buy`, (cur) => mergeBuys(cur, mine));
  }
  const had = b.S.get<Record<string, unknown>>(p(b, 'cards')) || {};
  for (const id of Object.keys(me.cards || {})) if (!had[id]) S.set(`${p(b, 'cards')}/${id}`, true); // 카드 = 늘기만 (정식 cards/{카드} = true)
}
/** 서버 거울이 내 칸(지갑 · 계정 · EXP)을 아직 다 받지 않음 (이 기기 · 메모리 저장 = 늘 받음) */
const MY_ROOTS = ['gem', 'xp', 'accounts', 'cards'] as const;
function pendingOf(b: Bound): boolean { const L = b.S.loaded; return !!L && MY_ROOTS.some((r) => !L(p(b, r))); }
const localOf = (loc: Partial<Me> | null) => Object.fromEntries(LOCAL_ONLY.filter((k) => loc && k in loc).map((k) => [k, loc![k]]));
function load(gem: number, scroll: number, test: boolean, teacher = false): Me {
  const b = teacher ? null : meBound(), base = { ...fresh(gem, scroll, test), ...(teacher ? { nick: '선생님', hero: 7 } : {}) }, loc = readLocal(teacher ? TKEY : localKey(b));
  if (b) {
    // 🚨 11/20 학생 기록 「초기화」(1-1-14 · 1-5-16): 받기 전(pending) = 시작 값 · 서버에 쓰지 않음 · 받으면 useMe 가 서버 값으로 옮김(rebase)
    if (pendingOf(b)) return { ...base, ...localOf(loc), test } as Me;
    const sv = fromServer(b), first = !b.S.get(p(b, 'gem'));
    const m = { ...base, ...(first ? {} : sv), ...localOf(loc), test } as Me;
    m.wallet = migrate(m.wallet);
    return m;
  }
  if (loc) { const m = { ...base, ...loc, test } as Me; m.wallet = migrate(m.wallet); if (teacher) lookIn(m); return m; }
  if (teacher) { const m = { ...base, test } as Me; lookIn(m); return m; }
  return base;
}
/** 👩‍🏫 교사 기록 = 이 기기 따로 칸 (📜 2026-11-13 밤 교사 B안 · 학생 통계 · 순위 · 대시보드와 안 섞임 · 시작 💎 9,999 · 📜 30 · 현자) */
const TKEY = `${KEY}|teacher`;
/** local = 폰에만 남기는 칸(⭐ 찜 등)만 저장 · 서버 지갑 · 용사 칸은 쓰지 않음 (🚀 출시 · 전투 중 ⭐ 창이 옛 지갑 값으로 💎 를 덮어쓰지 않게) */
export function useMe(gem: number, scroll: number, test = false, teacher = false, local = false) {
  if (teacher) asTeacher = true; // 👩‍🏫 이 탭 = 교사 → savedLook 도 교사 용사(서버 하나)
  const me = $state<Me>(load(gem, scroll, test, teacher));
  if (teacher) tWatch.add((v) => { if (v && v.hero != null) Object.assign(me, { hero: v.hero, enh: v.enh, socket: v.socket || {}, title: v.title || 'none' }); }); // 다른 기기(TV 교사 캠프 · 폰)에서 바꿔도 바로
  const b = teacher ? null : meBound();
  // 🚨 11/20 받기 전에 연 화면 = base 를 시작 값으로 두고(그동안 선물 · 보상으로 바뀐 몫은 차이로 남음) 받으면 서버 값으로 옮긴 뒤 저장
  let ready = !(b && pendingOf(b));
  const base: Base = b && ready ? srvBase(b) : meBase(me);
  const stops: (() => void)[] = [];
  if (b) {
    const onSrv = () => {
      if (!ready) { if (pendingOf(b)) return; ready = true; const sv = srvBase(b); rebase(me, base, sv); const was = me.wallet.ver; me.wallet = migrate(me.wallet); if (me.wallet.ver !== was) base.ver = was; if (!local) toServer(b, me, base); return; }
      rebase(me, base, srvBase(b)); // 다른 기기 · 수업 보상 · 선물 = 이 폰 값도 옮김
    };
    for (const r of MY_ROOTS) stops.push(b.S.watch(p(b, r), onSrv));
    if (!ready) { const t = setInterval(onSrv, 300); stops.push(() => clearInterval(t)); } // 빈 칸(새 학생) = 값이 안 바뀌어 watch 가 안 울림 → 받음 표시를 따로 봄
    else if (!local && b.S.get(p(b, 'gem')) == null) toServer(b, me, base); // 처음 온 학생 (받은 뒤 정말 빈 칸) = 시작 값으로 서버 칸을 만듦
    else if (!local && me.wallet.ver !== base.ver) toServer(b, me, base); // 경제 판 옮김 = 한 번
    onSrv();
    try { onDestroy(() => stops.forEach((f) => f())); } catch { /* 화면 밖에서 부름 */ }
  }
  const save = () => {
    const snap = JSON.parse(JSON.stringify(me)) as Me;
    if (teacher) { try { localStorage.setItem(TKEY, JSON.stringify(snap)); } catch { /* 무시 */ } tSink?.(tlookOf(snap)); return; }
    if (b) { if (!local && ready) toServer(b, me, base); try { localStorage.setItem(localKey(b), JSON.stringify(Object.fromEntries(LOCAL_ONLY.map((k) => [k, snap[k]])))); } catch { /* 무시 */ } return; }
    try { localStorage.setItem(KEY, JSON.stringify(snap)); } catch { /* 무시 */ }
  };
  /** 👩‍🏫 교사만: ↺ 처음으로 = 스킬(산 것 · 끼운 것) · 용사(강화 · 고른 용사) 처음 상태 + 💎 · 📜 다시 채움 */
  const reset = () => { const f = fresh(gem, scroll, test); Object.assign(me, { ...f, ...(teacher ? { nick: '선생님', hero: 7 } : {}), seen: me.seen }); save(); };
  return { me, save, reset, teacher, mark(id: string) { if (!me.seen[id]) { me.seen[id] = true; save(); } } };
}
// 👩‍🏫 교사 「내 용사」를 서버에도 (📜 2026-11-14 선생님 「교사 모습이랑 실제 시연할 때 캐릭터랑 안 맞음」 · 머리 🐞) = school/tlook
//   교사 폰 「나」 · 교사 캠프(폰 · TV)에서 저장할 때마다 씀 → 교실 TV 🎮 시연 일격 · 컷인 · 필살기 잠김이 이 값을 따름(TV 기기에 따로 저장된 값을 쓰지 않음)
export const TLOOK = 'school/tlook';
export interface TLook { hero: number; enh: number; fx: string; socket: Record<string, string>; title: string; nick: string; at: number }
let tSink: ((l: TLook) => void) | null = null;
// 🧙 교사 「내 용사」 = 한 곳 (📜 2026-11-14 선생님 「교사의 내 용사 관리도 학생들처럼 일관되었으면 · 게시판 던전 갔더니 또 다른 캐릭터」 · DECISIONS 「🧙 교사 내 용사 = 한 곳」)
//   원본 = 서버 school/tlook 하나 · 이 탭이 교사면(교사 폰 · 교사 캠프 · TV) savedLook() 도 이 값 → 게시판 · 허수아비 · 성채 · 시연 · 컷인 · 대기실 · 결과가 모두 같음
//   서버 값이 없을 때만 기본 용사(현자 7) · 이 기기 교사 칸(TKEY)은 💎 · 📜 · 산 것 같은 지갑만 (용사 · 강화 · 스킬 · 호칭은 서버 값이 이김)
let asTeacher = false, tCache: TLook | null = null, tUnsub: (() => void) | null = null;
const tWatch = new Set<(v: TLook | null) => void>();
export const isTeacherTab = () => asTeacher;
function lookIn(m: Me) { if (tCache && tCache.hero != null) Object.assign(m, { hero: tCache.hero, enh: tCache.enh, socket: tCache.socket || {}, title: tCache.title || 'none' }); }
export const tlookOf = (m: Partial<Me>): TLook => { const hero = Number(m.hero ?? 7) || 0, socket = m.socket || {}; return { hero, enh: Number(m.enh) || 0, fx: equipOf({ hero, socket } as Look), socket, title: m.title || 'none', nick: m.nick || '선생님', at: Date.now() }; };
/** 교사 화면(교사 폰 · 교실 TV)이 서버 칸을 알려 줌 · publish = 이 기기 교사 기록을 지금 한 번 올림(서버에 아직 없을 때) */
export function setTeacherSink(S: Pick<Store, 'set' | 'get' | 'watch'>, publish = false): void {
  asTeacher = true; tSink = (l) => { tCache = l; S.set(TLOOK, l); };
  tUnsub?.(); tUnsub = S.watch<TLook>(TLOOK, (v) => { tCache = v; tWatch.forEach((f) => f(v)); });
  if (publish && !S.get(TLOOK)) { const m = readLocal(TKEY); if (m) tSink(tlookOf(m)); }
}
/** 교사 용사 (서버 값 · 없으면 기본 용사 = 현자 7) */
export function teacherLook(v: Partial<TLook> | null | undefined): Looked {
  if (v && v.hero != null) { const hero = Number(v.hero) || 0; return looked(hero, Number(v.enh) || 0, v.fx || equipOf({ hero, socket: v.socket || {} } as Look), v.title); }
  return looked(7, 0, equipOf({ hero: 7, socket: {} } as Look));
}
/** 🌟 #29 보이는 모습 — hero = 보이는 모습(각성한 로안이면 16) · base = 고른 용사 */
export type Looked = { hero: number; base: number; enh: number; fx: string };
export const looked = (base: number, enh: number, fx: string, title?: string | null): Looked => ({ hero: lookId({ hero: base, enh, fx, title }), base, enh, fx });
/** 캠프 · 내 용사 = 지금 장착 그대로의 보이는 모습 */
export const meLookId = (m: Pick<Me, 'hero' | 'enh' | 'socket' | 'title'>) => lookId({ hero: m.hero, enh: m.enh, fx: equipOf({ hero: m.hero, socket: m.socket || {} } as Look), title: m.title });
/** 출전 용사 · 강화 (전투 장면이 읽음 · 없으면 로안) — 서버에 묶였으면 서버 값 */
export function savedLook(): Looked {
  if (asTeacher) return teacherLook(tCache); // 👩‍🏫 교사 탭 = 서버 교사 용사 하나 (없으면 현자 7)
  const b = meBound();
  if (b) { const sv = fromServer(b); const hero = Number(sv.hero) || 0; return looked(hero, Number(sv.enh) || 0, equipOf({ hero, socket: sv.socket || {} } as Look), sv.title); }
  const m = readLocal(KEY), hero = Number(m?.hero) || 0;
  return looked(hero, Number(m?.enh) || 0, equipOf({ hero, socket: m?.socket || {} } as Look), m?.title); // ⚔ 끼운 스킬 (빈 칸 = 내 속성 Ⅰ)
}
