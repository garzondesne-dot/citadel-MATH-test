// 🐞 💎 놓친 수업 보상 채우기 (📜 2026-11-27 선생님 「수업 EXP 놓친 것 채우기 먼저 고쳐」 · DECISIONS 266e46a)
//   수업 💎 · EXP 는 학생 폰이 수업 끝 화면을 볼 때만 들어갔음 → 중간에 나감 · 폰 꺼짐 · 종합실이 시간으로 닫음 = 영영 못 받음(운영 11차시 뒤 38%)
//   → 캠프에 들어오면: 내 수업 기록(맞힌 것 있음 · 11/15 정식 출시 뒤)인데 그 수업 보상 「받음」 칸(xp log raid_{수업})이 없는 차시만
//      그 수업 방(rooms/{코드})을 받아 끝 화면과 같은 함수(rewardOf · settle)로 계산 → 놓친 몫만 한 번
//   두 번 안 줌 = 끝 화면과 같은 「받음」 칸(gem · xp log 키) · settle 이 이미 받은 만큼 빼고 줌 · 보상 먼저(합계) → 받음 칸(log) 순서 (「했음 먼저 · 보상 나중」 금지)
//   🔁 연속 · 🎁 첫 출정 = 그 차시 「앞」 기록만 넣어 셈(끝 화면이 그때 봤을 것과 같게) · 하루 한도 없음(11/19)
import type { LessonPack, Room, Store } from '../model/types';
import { rewardOf, settle } from './reward';
import { addTo, isReady } from '../store/atomic';

/** 정식 출시(11/15 00:00 KST) 뒤 수업만 */
export const CATCH_SINCE = Date.UTC(2026, 10, 14, 15, 0);
export type RecRow = { code?: string; no?: number; at?: number; right?: number; firstXp?: number } | null;
type Log = Record<string, { g?: number; xp?: number } | undefined>;
type Wallet = { total?: number; day?: Record<string, number>; log?: Log };

/** 채울 차시 고르기 (서버를 더 묻지 않는 빠른 거름): 맞힌 것 있음 · 정식 뒤 · 그 수업 EXP 받음 칸 없음 · 이 기기에서 「채울 것 없음」으로 본 적 없음 */
export function missedRaids(records: Record<string, RecRow>, xpLog: Log, seen: Set<string> = new Set()): { lid: string; code: string; no: number }[] {
  const out: { lid: string; code: string; no: number }[] = [];
  for (const [lid, r] of Object.entries(records || {})) {
    if (!r || typeof r !== 'object' || !r.code || !(Number(r.right) > 0) || !(Number(r.at) >= CATCH_SINCE)) continue;
    const code = String(r.code);
    if (xpLog[`raid_${code}`] || seen.has(code)) continue;
    out.push({ lid, code, no: Number(r.no) || 0 });
  }
  return out.sort((a, b) => a.no - b.no);
}

/** 한 차시 계산 (끝 화면 payReward 와 같은 식 · 그 차시 앞 기록만) → 쓸 칸 · 💎 · EXP */
export function catchOne(L: LessonPack, R: Room, uid: string, code: string, records: Record<string, RecRow>, held: Record<string, unknown>, lessons: { id: string; no: number; eval?: boolean }[], st: { gem: number; xp: number; day?: Record<string, number>; gemLog: Log; xpLog: Log }, today: string, at: number) {
  const before = Object.fromEntries(Object.entries(records).filter(([k, v]) => !!v && k !== L.id && (Number(v.no) || 0) < L.no)) as Record<string, { code?: string; firstXp?: number }>;
  const mine = records[L.id];
  if (mine) (before as Record<string, unknown>)[L.id] = mine; // 🎁 첫 출정 = 그 차시 기록의 firstXp 그대로(이미 있으면)
  const heldB = Object.fromEntries(Object.entries(held || {}).filter(([k]) => { const l = lessons.find((x) => x.id === k); return !!l && l.no < L.no; }));
  const rw = rewardOf(L, R, uid, code, at, { records: before, held: heldB, lessons, xpTotal: st.xp });
  return settle(rw, { gem: st.gem, xp: st.xp, day: st.day, gemLog: st.gemLog, xpLog: st.xpLog }, today, at);
}

const SEEN_K = (cls: string, num: number) => `citadel-raidcatch-${cls}-${num}`;
const seenGet = (cls: string, num: number): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_K(cls, num)) || '[]')); } catch { return new Set(); } };
const seenAdd = (cls: string, num: number, code: string) => { try { const s = seenGet(cls, num); s.add(code); localStorage.setItem(SEEN_K(cls, num), JSON.stringify([...s].slice(-200))); } catch { /* 무시 */ } };

/** 캠프 들어올 때 (그 학생으로 로그인한 폰만 · 받기 전이면 다음에) → 채운 💎 · EXP 합 */
export async function raidCatchUp(S: Store, cls: string, num: number, opt: { packOf: (id: string) => LessonPack | null; lessons: { id: string; no: number; eval?: boolean }[]; uid: string; today: string; now: number }): Promise<{ gem: number; xp: number; n: number }> {
  const gp = `gem/${cls}/${num}`, xp = `xp/${cls}/${num}`, rp = `records/${cls}/${num}`;
  // 🔐 서버에서 바로 받음 (거울이 「받음」이라 해도 비어 있을 수 있음 · 빈 기록으로 계산하면 두 번 줌) · 못 받으면 다음에
  const get = async <T>(p: string): Promise<T | null | undefined> => (S.fetch ? S.fetch<T>(p).then((v) => v, () => undefined) : isReady(S, p) ? S.get<T>(p) : undefined);
  const [records0, xr0] = await Promise.all([get<Record<string, RecRow>>(rp), get<{ log?: Log }>(xp)]);
  if (records0 === undefined || xr0 === undefined) return { gem: 0, xp: 0, n: 0 };
  const records = records0 || {}, todo = missedRaids(records, xr0?.log || {}, seenGet(cls, num));
  let gem = 0, dxp = 0, n = 0, gw: Wallet | null = null, xw: Wallet | null = null;
  for (const m of todo) {
    const L = opt.packOf(m.lid); if (!L) continue;
    const R = (S.fetch ? await S.fetch<Room>(`rooms/${m.code}`).catch(() => null) : S.get<Room>(`rooms/${m.code}`)) as Room | null;
    if (!R || !R.players?.[opt.uid]) { seenAdd(cls, num, m.code); continue; } // 방이 없음 · 이 학생이 안 들어온 방 = 채울 것 없음
    if (!gw) { const [g0, x1] = await Promise.all([get<Wallet>(gp), get<Wallet>(xp)]); if (g0 === undefined || x1 === undefined) break; gw = { total: Number(g0?.total) || 0, day: { ...(g0?.day || {}) }, log: { ...(g0?.log || {}) } }; xw = { total: Number(x1?.total) || 0, log: { ...(x1?.log || {}) } }; } // 서버 값 한 번 · 차시마다 이 사본에 더해 감(쓰기가 서버에 닿기 전에 다시 읽어 두 번 주지 않게)
    const gr = gw, xr = xw!;
    if (xr.log?.[`raid_${m.code}`]) continue; // 기다리는 사이 다른 기기가 받음
    const held = S.get<Record<string, unknown>>(`held/${cls.replace(/[.#$/[\]]/g, '_')}`) || {};
    const r = catchOne(L, R, opt.uid, m.code, records, held, opt.lessons, { gem: Number(gr.total) || 0, xp: Number(xr.total) || 0, day: gr.day, gemLog: gr.log || {}, xpLog: xr.log || {} }, opt.today, opt.now);
    if (!r.gem && !r.xp) { seenAdd(cls, num, m.code); continue; }
    // 보상 먼저 (합계 · 날짜 칸) → 받음 칸(log) — 끝 화면과 같은 칸 · 같은 키
    if (r.gem) { addTo(S, `${gp}/total`, r.gem); for (const [d, v] of Object.entries(r.day)) if (v !== gr.day?.[d]) addTo(S, `${gp}/day/${d}`, v - (Number(gr.day?.[d]) || 0)); }
    if (r.xp) addTo(S, `${xp}/total`, r.xp);
    for (const [k, v] of Object.entries(r.writes)) S.set(`${k.startsWith('gem/') ? gp : xp}/${k.slice(k.indexOf('/') + 1)}`, v);
    gem += r.gem; dxp += r.xp; n++;
    gw.total = (gw.total || 0) + r.gem; gw.day = { ...r.day }; xw!.total = (xw!.total || 0) + r.xp;
    for (const [k, v] of Object.entries(r.writes)) ((k.startsWith('gem/') ? gw.log : xw!.log) as Log)[k.slice(k.indexOf('/log/') + 5)] = v as { g?: number; xp?: number };
  }
  return { gem, xp: dxp, n };
}
