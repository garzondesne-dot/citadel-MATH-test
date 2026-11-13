import { equipOf, type Look } from '../model/draft';
import { ECON_VER, migrate, type Wallet } from '../model/wallet';
import { meBound, p, type Bound } from './meSync';
// 🧑 학생 한 명의 기록 — 이 기기(서버 없음 · 시험 · 교사 · TV) 또는 시험 서버(#141 · 그 학생으로 로그인한 폰 = store/meSync.ts 정식 경로)
//   seen = 캠프에서 한 번이라도 눌러 본 물건 (#111 ② 이름표 규칙)
//   socket = 용사마다 끼운 스킬 · title = 고른 호칭 id(hero-data titles · 'none' = 안 닮) · 산 용사 · 스킬 = wallet.buys { id, ver } · test = 🧪 테스트 기록(「테스터」 배지)
export interface Me { nick: string; hero: number; enh: number; xp: number; socket: Record<string, string>; title: string; wallet: Wallet; seen: Record<string, true>; wish: number; test: boolean; /** ⭐ 기호 톡 찜(기호 id) · 모루에서 만든 카드(카드 id) (#129) */ wishes: Record<string, true>; cards: Record<string, true>; /** 🎨 고른 테마 (#144 · 서버 accounts 에 · 다른 폰도 같음) */ theme?: string }
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
  const acc = b.S.get<{ hero?: number; socket?: Record<string, string>; title?: string; theme?: string }>(p(b, 'accounts')) || {};
  const gem = b.S.get<GemRow>(p(b, 'gem'));
  const xp = b.S.get<{ total?: number }>(p(b, 'xp'));
  const cards = b.S.get<Record<string, true>>(p(b, 'cards'));
  const out: Partial<Me> = {};
  if (acc.hero != null) out.hero = acc.hero;
  if (acc.socket) out.socket = acc.socket;
  if (acc.title) out.title = acc.title;
  if (acc.theme) out.theme = acc.theme;
  if (gem) { const bv = buysOf(gem); out.enh = gem.enh ?? 0; out.wallet = { gem: gem.total ?? 0, scroll: gem.scroll ?? 0, buys: bv.buys, ver: bv.ver, ...(gem.mlog ? { log: Object.values(gem.mlog) } : {}), ...(gem.day ? { day: gem.day } : {}) }; }
  if (xp) out.xp = xp.total ?? 0;
  if (cards) out.cards = cards;
  return out;
}
function toServer(b: Bound, me: Me) {
  const S = b.S, a = p(b, 'accounts');
  S.set(`${a}/hero`, me.hero); S.set(`${a}/socket`, me.socket); S.set(`${a}/title`, me.title); if (me.theme) S.set(`${a}/theme`, me.theme); // uid · at 은 그대로 (칸마다 씀)
  const g = p(b, 'gem'); // 칸마다 (정식 칸 지킴 · #163)
  S.set(`${g}/total`, me.wallet.gem); S.set(`${g}/scroll`, me.wallet.scroll); S.set(`${g}/enh`, me.enh); S.set(`${g}/buy`, me.wallet.buys); S.set(`${g}/ver`, me.wallet.ver);
  if (me.wallet.log?.length) S.set(`${g}/mlog`, me.wallet.log);
  for (const [d, n] of Object.entries(me.wallet.day || {})) S.set(`${g}/day/${d}`, n);
  S.set(`${p(b, 'xp')}/total`, me.xp); // 정식 xp.log · ttl 은 그대로
  const had = b.S.get<Record<string, unknown>>(p(b, 'cards')) || {};
  for (const id of Object.keys(me.cards || {})) if (!had[id]) S.set(`${p(b, 'cards')}/${id}`, true); // 카드 = 늘기만 (정식 cards/{카드} = true)
}
function load(gem: number, scroll: number, test: boolean, teacher = false): Me {
  const b = teacher ? null : meBound(), base = { ...fresh(gem, scroll, test), ...(teacher ? { nick: '선생님', hero: 7 } : {}) }, loc = readLocal(teacher ? TKEY : localKey(b));
  if (b) {
    const sv = fromServer(b), first = !b.S.get(p(b, 'gem'));
    const local = Object.fromEntries(LOCAL_ONLY.filter((k) => loc && k in loc).map((k) => [k, loc![k]]));
    const m = { ...base, ...(first ? {} : sv), ...local, test } as Me;
    m.wallet = migrate(m.wallet);
    if (first) toServer(b, m); // 처음 = 시작 값으로 서버 칸을 만듦
    return m;
  }
  if (loc) { const m = { ...base, ...loc, test } as Me; m.wallet = migrate(m.wallet); return m; }
  return base;
}
/** 👩‍🏫 교사 기록 = 이 기기 따로 칸 (📜 2026-11-13 밤 교사 B안 · 학생 통계 · 순위 · 대시보드와 안 섞임 · 시작 💎 9,999 · 📜 30 · 현자) */
const TKEY = `${KEY}|teacher`;
export function useMe(gem: number, scroll: number, test = false, teacher = false) {
  const me = $state<Me>(load(gem, scroll, test, teacher));
  const b = teacher ? null : meBound();
  const save = () => {
    const snap = JSON.parse(JSON.stringify(me)) as Me;
    if (teacher) { try { localStorage.setItem(TKEY, JSON.stringify(snap)); } catch { /* 무시 */ } return; }
    if (b) { toServer(b, snap); try { localStorage.setItem(localKey(b), JSON.stringify(Object.fromEntries(LOCAL_ONLY.map((k) => [k, snap[k]])))); } catch { /* 무시 */ } return; }
    try { localStorage.setItem(KEY, JSON.stringify(snap)); } catch { /* 무시 */ }
  };
  /** 👩‍🏫 교사만: ↺ 처음으로 = 스킬(산 것 · 끼운 것) · 용사(강화 · 고른 용사) 처음 상태 + 💎 · 📜 다시 채움 */
  const reset = () => { const f = fresh(gem, scroll, test); Object.assign(me, { ...f, ...(teacher ? { nick: '선생님', hero: 7 } : {}), seen: me.seen }); save(); };
  return { me, save, reset, teacher, mark(id: string) { if (!me.seen[id]) { me.seen[id] = true; save(); } } };
}
/** 출전 용사 · 강화 (전투 장면이 읽음 · 없으면 로안) — 서버에 묶였으면 서버 값 */
export function savedLook(): { hero: number; enh: number; fx: string } {
  const b = meBound();
  if (b) { const sv = fromServer(b); const hero = Number(sv.hero) || 0; return { hero, enh: Number(sv.enh) || 0, fx: equipOf({ hero, socket: sv.socket || {} } as Look) }; }
  const m = readLocal(KEY), hero = Number(m?.hero) || 0;
  return { hero, enh: Number(m?.enh) || 0, fx: equipOf({ hero, socket: m?.socket || {} } as Look) }; // ⚔ 끼운 스킬 (빈 칸 = 내 속성 Ⅰ)
}
