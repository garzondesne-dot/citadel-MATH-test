// 🛠 #98 개선단 (📜 선생님 「진행」 · DECISIONS 「🛠 방학 개선단」 · 「버그 스크린샷」)
//   저장 (반 = ck(반) · pid = 학생 uid(s1_3_5) · id = 무작위):
//     fbk/{반}/{번호}/{id}   = { k, t, at, info?, ph?: 사진 시각 | 0(지움), ad?: { g, at } }  ← 학생 = 새로 쓰기만 · 자기 것 읽기 · 교사 = 읽기 · 고치기 · 지우기
//     fbkph/{반}/{번호}/{id} = { d: JPEG dataURL, at }                                      ← 사진(따로) · 학생 = 새로 쓰기만 · 교사만 읽기 · 채택 · 지우기 · 30일 뒤 지움
//     fbkpub/{id}           = { k, t, at, ad? }                                             ← 🛠 개선단 게시판(이름 · 번호 · 반 없음) · 모두 읽기
//     fbkvote/{id}/{pid}    = true                                                          ← 👍 한 사람 한 번
//     artvote/{그림}/{pid}  = 1 (👍) | -1 (🔁 바꿈)                                          ← 🎨 그림마다
//     diff/{차시}/{몬스터}/{pid} = 1 쉬움 | 2 알맞음 | 3 어려움                               ← 📊 몬스터를 쓰러뜨린 뒤 한 번
//   채택 = 💎(30 · 50 · 100 · 하루 한도 밖) 메시지 mail/{pid}/fbk_{id} + 선물 gifts/{pid}/fbk_{id}m · 사진 지움 · 처음 채택 = 「🛠 개선단」 칭호(받을 때 💎 로그 fbk_{id})
import type { Store } from '../model/types';

export const ck = (c: string) => String(c).replace(/[.#$/[\]]/g, '_');
export type Kind = 'bug' | 'idea' | 'art' | 'level';
export const KINDS: { k: Kind; icon: string; name: string; hint: string }[] = [
  { k: 'bug', icon: '🐞', name: '버그 · 불편한 화면', hint: '어디서 · 무엇을 눌렀더니 · 어떻게 됐는지' },
  { k: 'idea', icon: '💡', name: '새 기능 · 놀이', hint: '있으면 좋겠는 것 · 해 보고 싶은 놀이' },
  { k: 'art', icon: '🎨', name: '스킬 · 용사 그림', hint: '어떤 그림을 어떻게 바꾸면 좋을지' },
  { k: 'level', icon: '📊', name: '문제 난이도', hint: '몇 차시 어떤 문제가 쉽거나 어려웠는지' },
];
export const kindOf = (k: string) => KINDS.find((x) => x.k === k) ?? KINDS[1]!;
export const LIMIT = { text: 400, perDay: 5, photoPerDay: 1, photoEdge: 720, jpeg: 0.6, photoMax: 160_000, info: 2048, keepDays: 30 } as const;
export const ADOPT_GEMS = [30, 50, 100] as const;
export const DIFF = [{ v: 1, t: '쉬움' }, { v: 2, t: '알맞음' }, { v: 3, t: '어려움' }] as const;

export interface Fbk { k: Kind; t: string; at: number; info?: string; ph?: number; ad?: { g: number; at: number } }
export interface Pub { k: Kind; t: string; at: number; ad?: boolean }
export interface Row extends Fbk { id: string; cls: string; num: number }

const kst = (t: number) => new Date(t + 9 * 3600_000).toISOString().slice(0, 10);
const rid = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
const mine = async (S: Store, c: string, n: number) => (S.fetch ? await S.fetch<Record<string, Fbk>>(`fbk/${ck(c)}/${n}`).catch(() => null) : S.get<Record<string, Fbk>>(`fbk/${ck(c)}/${n}`)) || {}; // 실시간 거울 밖 칸 = 한 번 받기

/** 오늘 보낸 수 · 오늘 사진 수 (한국 날짜) */
export function today(list: Record<string, Fbk>, now: number) {
  const d = kst(now), xs = Object.values(list).filter((x) => x && kst(Number(x.at) || 0) === d);
  return { sent: xs.length, photos: xs.filter((x) => Number(x.ph) > 0 || x.ph === 0).length };
}
/** 보내기 전 확인 → 틀리면 문장 · 맞으면 '' */
export function check(k: string, t: string, list: Record<string, Fbk>, now: number, photo: boolean): string {
  if (!KINDS.some((x) => x.k === k)) return '종류를 골라 주세요.';
  const s = String(t || '').trim();
  if (s.length < 2) return '두 글자 이상 적어 주세요.';
  if (s.length > LIMIT.text) return `${LIMIT.text}자까지 적을 수 있어요.`;
  const d = today(list, now);
  if (d.sent >= LIMIT.perDay) return `오늘은 ${LIMIT.perDay}번 다 보냈어요. 내일 또 보내 주세요!`;
  if (photo && d.photos >= LIMIT.photoPerDay) return '사진은 하루에 1장만 보낼 수 있어요. 글만 보내 주세요.';
  return '';
}
type Writer = Store & { trySet?: (path: string, v: unknown) => Promise<boolean> };
const put = async (S: Writer, path: string, v: unknown) => {
  if (S.trySet) { if (!(await S.trySet(path, v))) throw Object.assign(new Error('보내지 못했어요. 인터넷을 확인하고 다시 눌러 주세요.'), { user: true }); } else S.set(path, v);
};
/** 💬 보내기 → id · 사진(dataURL)은 따로 · 게시판 줄(이름 없음)도 같이 */
export async function submit(S: Writer, c: string, n: number, f: { k: Kind; t: string; info?: string; photo?: string }): Promise<string> {
  const now = S.now(), list = await mine(S, c, n), err = check(f.k, f.t, list, now, !!f.photo);
  if (err) throw Object.assign(new Error(err), { user: true });
  const id = rid(), t = f.t.trim().slice(0, LIMIT.text), row: Fbk = { k: f.k, t, at: now };
  if (f.info) row.info = f.info.slice(0, LIMIT.info);
  if (f.photo) {
    if (f.photo.length > LIMIT.photoMax) throw Object.assign(new Error('사진이 너무 커요. 다른 사진을 골라 주세요.'), { user: true });
    await put(S, `fbkph/${ck(c)}/${n}/${id}`, { d: f.photo, at: now }); row.ph = now;
  }
  await put(S, `fbk/${ck(c)}/${n}/${id}`, row);
  await put(S, `fbkpub/${id}`, { k: f.k, t, at: now }); // 🛠 게시판 = 이름 · 번호 · 반 · 사진 · 자동 글 없이
  return id;
}
/** 내가 보낸 것 (최근 순) */
export const myList = async (S: Store, c: string, n: number) => Object.entries(await mine(S, c, n)).filter(([, x]) => x && x.t).map(([id, x]) => ({ id, ...x })).sort((a, b) => b.at - a.at);

// ── 🛠 개선단 게시판 ──
export interface BoardItem extends Pub { id: string; up: number; me: boolean }
const fetchOr = async <T,>(S: Store, p: string): Promise<T | null> => (S.fetch ? await S.fetch<T>(p).catch(() => null) : S.get<T>(p));
export async function board(S: Store, pid: string, sort: 'up' | 'new' = 'up'): Promise<BoardItem[]> {
  const [pub, votes] = await Promise.all([fetchOr<Record<string, Pub>>(S, 'fbkpub'), fetchOr<Record<string, Record<string, boolean>>>(S, 'fbkvote')]);
  return sortBoard(Object.entries(pub || {}).filter(([, x]) => x && x.t).map(([id, x]) => { const v = (votes || {})[id] || {}; return { id, ...x, up: Object.values(v).filter(Boolean).length, me: !!v[pid] }; }), sort);
}
export const sortBoard = (xs: BoardItem[], sort: 'up' | 'new') => xs.slice().sort((a, b) => (sort === 'up' ? b.up - a.up || b.at - a.at : b.at - a.at));
/** 👍 (한 사람 한 번 · 다시 누르면 취소) → 바뀐 뒤 내 표 */
export async function vote(S: Writer, id: string, pid: string, on: boolean): Promise<boolean> { await put(S, `fbkvote/${id}/${pid}`, on ? true : null); return on; }

// ── 🎨 그림 👍 · 🔁 바꿈 / 📊 난이도 ──
export const artKey = (kind: 'skill' | 'hero', id: string | number) => `${kind}_${String(id).replace(/[.#$/[\]]/g, '_')}`;
export const artMine = (S: Store, key: string, pid: string) => Number(S.get(`artvote/${key}/${pid}`)) || 0;
export async function artVote(S: Writer, key: string, pid: string, v: 1 | -1 | 0) { await put(S, `artvote/${key}/${pid}`, v || null); }
export async function rateDiff(S: Writer, lid: string, mon: string, pid: string, v: 1 | 2 | 3) { await put(S, `diff/${ck(lid)}/${ck(mon)}/${pid}`, v); }
/** 교사 표: 그림마다 👍 · 🔁 수 (바꿈 많은 순) */
export function artTable(v: Record<string, Record<string, number>> | null) {
  return Object.entries(v || {}).map(([key, m]) => { const xs = Object.values(m || {}); return { key, up: xs.filter((x) => x === 1).length, swap: xs.filter((x) => x === -1).length }; }).filter((r) => r.up + r.swap > 0).sort((a, b) => b.swap - a.swap || b.up - a.up);
}
/** 교사 표: 차시 · 몬스터마다 쉬움 · 알맞음 · 어려움 수 */
export function diffTable(v: Record<string, Record<string, Record<string, number>>> | null) {
  const out: { lid: string; mon: string; n: [number, number, number] }[] = [];
  for (const [lid, ms] of Object.entries(v || {})) for (const [mon, m] of Object.entries(ms || {})) { const xs = Object.values(m || {}); out.push({ lid, mon, n: [1, 2, 3].map((k) => xs.filter((x) => x === k).length) as [number, number, number] }); }
  return out.sort((a, b) => a.lid.localeCompare(b.lid, 'ko', { numeric: true }) || a.mon.localeCompare(b.mon, 'ko', { numeric: true }));
}

// ── 👩‍🏫 교사 ──
/** 반들 의견 (한 번 받기 · 최근 순) */
export async function rows(S: Store, classes: string[]): Promise<Row[]> {
  const out: Row[] = [];
  for (const c of classes) {
    const v = (await fetchOr<Record<string, Record<string, Fbk>>>(S, `fbk/${ck(c)}`)) || {};
    for (const [n, m] of Object.entries(v)) for (const [id, x] of Object.entries(m || {})) if (x && x.t) out.push({ id, cls: c, num: Number(n), ...x });
  }
  return out.sort((a, b) => b.at - a.at);
}
export async function photo(S: Store, r: Pick<Row, 'cls' | 'num' | 'id'>): Promise<string> { return ((await fetchOr<{ d?: string }>(S, `fbkph/${ck(r.cls)}/${r.num}/${r.id}`)) || {}).d || ''; }
/** 채택: 💎 선물 + 메시지 · 게시판 「✅ 채택」 · 사진 지움 */
export function adopt(S: Store, r: Row, uid: string, g: number) {
  const at = S.now(), c = ck(r.cls), gg = Math.max(0, Math.round(g));
  S.set(`fbk/${c}/${r.num}/${r.id}/ad`, { g: gg, at });
  if (r.ph) { S.set(`fbkph/${c}/${r.num}/${r.id}`, null); S.set(`fbk/${c}/${r.num}/${r.id}/ph`, 0); }
  S.set(`fbkpub/${r.id}/ad`, true);
  S.set(`gifts/${uid}/fbk_${r.id}m`, { g: gg, at, fun: '🛠 의견 채택', mail: true }); // ✉ 메시지 키 + m = 메시지를 받은 폰이 지갑에 (school/mail 과 같은 꼴)
  S.set(`mail/${uid}/fbk_${r.id}`, { text: `🛠 네 의견이 채택됐어! 「${r.t.slice(0, 40)}${r.t.length > 40 ? '…' : ''}」 고마워 · 💎 +${gg}`, g: gg, at, kind: 'msg' });
}
/** 지우기: 의견 · 사진 · 게시판 줄 · 👍 */
export function remove(S: Store, r: Pick<Row, 'cls' | 'num' | 'id'>) {
  const c = ck(r.cls);
  S.set(`fbkph/${c}/${r.num}/${r.id}`, null); S.set(`fbk/${c}/${r.num}/${r.id}`, null); S.set(`fbkpub/${r.id}`, null); S.set(`fbkvote/${r.id}`, null);
}
/** 30일 지난 사진 지우기 (교사 화면을 열 때 · 사진은 받지 않고 기록의 사진 시각만 봄) → 지운 수 */
export function sweep(S: Store, xs: Row[], now: number): number {
  let n = 0;
  for (const r of xs) if (Number(r.ph) > 0 && now - Number(r.ph) > LIMIT.keepDays * 86400_000) { S.set(`fbkph/${ck(r.cls)}/${r.num}/${r.id}`, null); S.set(`fbk/${ck(r.cls)}/${r.num}/${r.id}/ph`, 0); r.ph = 0; n++; }
  return n;
}
/** 학생: 받은 채택 선물 → 💎 로그 한 줄(칭호 「🛠 개선단」 근거 · 💎 는 선물로 이미 받아 g 0) */
export const adoptLog = (giftKey: string, at: number) => (giftKey.startsWith('fbk_') ? { key: giftKey.replace(/m$/, ''), row: { g: 0, at, why: '🛠 의견 채택' } } : null);
