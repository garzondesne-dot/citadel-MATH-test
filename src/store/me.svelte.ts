import { ECON_VER, migrate, type Wallet } from '../model/wallet';
import { meBound, p, type Bound } from './meSync';
// 🧑 학생 한 명의 기록 — 이 기기(서버 없음 · 시험 · 교사 · TV) 또는 시험 서버(#141 · 그 학생으로 로그인한 폰 = store/meSync.ts 정식 경로)
//   seen = 캠프에서 한 번이라도 눌러 본 물건 (#111 ② 이름표 규칙)
//   socket = 용사마다 끼운 스킬 · title = 고른 호칭 id(hero-data titles · 'none' = 안 닮) · 산 용사 · 스킬 = wallet.buys { id, ver } · test = 🧪 테스트 기록(「테스터」 배지)
export interface Me { nick: string; hero: number; enh: number; xp: number; socket: Record<string, string>; title: string; wallet: Wallet; seen: Record<string, true>; wish: number; test: boolean; /** ⭐ 기호 톡 찜(기호 id) · 모루에서 만든 카드(카드 id) (#129) */ wishes: Record<string, true>; cards: Record<string, true> }
const KEY = 'citadel-v1-me';
const fresh = (gem: number, scroll: number, test: boolean): Me => ({ nick: '학생 01', hero: 0, enh: 0, xp: 0, socket: {}, title: 'none', wallet: { gem, scroll, buys: [], ver: ECON_VER }, seen: {}, wish: 0, test, wishes: {}, cards: {} });
/** 폰에만 남기는 칸 (서버에 안 씀) */
const LOCAL_ONLY = ['seen', 'wish', 'wishes'] as const;
const localKey = (b: Bound | null) => (b ? `${KEY}|${b.cls}|${b.num}` : KEY);
function readLocal(key: string): Partial<Me> | null { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as Partial<Me>) : null; } catch { return null; } }
type GemRow = { total?: number; scroll?: number; enh?: number; buy?: Wallet['buys']; ver?: number; log?: string[] };
function fromServer(b: Bound): Partial<Me> {
  const acc = b.S.get<{ hero?: number; socket?: Record<string, string>; title?: string }>(p(b, 'accounts')) || {};
  const gem = b.S.get<GemRow>(p(b, 'gem'));
  const xp = b.S.get<{ total?: number }>(p(b, 'xp'));
  const cards = b.S.get<Record<string, true>>(p(b, 'cards'));
  const out: Partial<Me> = {};
  if (acc.hero != null) out.hero = acc.hero;
  if (acc.socket) out.socket = acc.socket;
  if (acc.title) out.title = acc.title;
  if (gem) { out.enh = gem.enh ?? 0; out.wallet = { gem: gem.total ?? 0, scroll: gem.scroll ?? 0, buys: Object.values(gem.buy || {}), ver: gem.ver ?? ECON_VER, ...(gem.log ? { log: Object.values(gem.log) } : {}) }; }
  if (xp) out.xp = xp.total ?? 0;
  if (cards) out.cards = cards;
  return out;
}
function toServer(b: Bound, me: Me) {
  const S = b.S, a = p(b, 'accounts');
  S.set(`${a}/hero`, me.hero); S.set(`${a}/socket`, me.socket); S.set(`${a}/title`, me.title); // uid · at 은 그대로 (칸마다 씀)
  S.set(p(b, 'gem'), { total: me.wallet.gem, scroll: me.wallet.scroll, enh: me.enh, buy: me.wallet.buys, ver: me.wallet.ver, ...(me.wallet.log?.length ? { log: me.wallet.log } : {}) });
  S.set(p(b, 'xp'), { total: me.xp });
  S.set(p(b, 'cards'), Object.keys(me.cards || {}).length ? me.cards : null);
}
function load(gem: number, scroll: number, test: boolean): Me {
  const b = meBound(), base = fresh(gem, scroll, test), loc = readLocal(localKey(b));
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
export function useMe(gem: number, scroll: number, test = false) {
  const me = $state<Me>(load(gem, scroll, test));
  const b = meBound();
  const save = () => {
    const snap = JSON.parse(JSON.stringify(me)) as Me;
    if (b) { toServer(b, snap); try { localStorage.setItem(localKey(b), JSON.stringify(Object.fromEntries(LOCAL_ONLY.map((k) => [k, snap[k]])))); } catch { /* 무시 */ } return; }
    try { localStorage.setItem(KEY, JSON.stringify(snap)); } catch { /* 무시 */ }
  };
  return { me, save, mark(id: string) { if (!me.seen[id]) { me.seen[id] = true; save(); } } };
}
/** 출전 용사 · 강화 (전투 장면이 읽음 · 없으면 로안) — 서버에 묶였으면 서버 값 */
export function savedLook(): { hero: number; enh: number } {
  const b = meBound();
  if (b) { const sv = fromServer(b); return { hero: Number(sv.hero) || 0, enh: Number(sv.enh) || 0 }; }
  const m = readLocal(KEY);
  return { hero: Number(m?.hero) || 0, enh: Number(m?.enh) || 0 };
}
