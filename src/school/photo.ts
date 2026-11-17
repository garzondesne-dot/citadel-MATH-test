import { castles } from './castles.svelte';
import { photoScroll } from '../raid/actions';
import { uidOf } from './school';
// 📷 서술형 사진 채점 (정식 js/raid/photo.js 그대로 옮김 · 📜 2026-11-15 선생님 「오늘 사진 채점 기능까지」 · 수치 · 문구 정식 그대로)
//   학생: 풀이 사진 → 자르기 · 돌리기 → 긴 변 1024 JPEG → Apps Script 중계소(gcfg/photo.url) → AI → pass(통과) · retry(점수 · 다시) · check(⏳ 선생님 확인 · 장 수 안 깎임)
//   서버: gcfg/photo = { url, on, daily, room, cool, raid, warnDay, warnMonth } · photo_rubric/{차시}/{방} · photo/{반}/{번호}/{차시_방}/{id}(중계소만 씀 · 사진 ✗) · photo_q/{반}/{번호}/{날짜}
//   사진은 이 폰에서 줄여 보내기만 하고 어디에도 저장하지 않는다 · 결과는 성적이 아니다
import { SUBJ } from '../engine/subject';
import type { LessonPack, Question, Store } from '../model/types';

export interface Rubric { on?: boolean; title: string; total: number; pass: number; ask?: string; raid?: boolean; steps?: { id: string; pts: number; desc: string; key?: string }[] }
export interface PhotoCfg { url?: string; on?: boolean; daily?: number; room?: number; cool?: number; raid?: number; warnDay?: number; warnMonth?: number }
export interface PhotoRes { ok: boolean; err?: string; sec?: number; status?: 'pass' | 'retry' | 'check'; score?: number; total?: number; pass?: number; steps?: Record<string, { id?: string; pts?: number; earned?: number; note?: string }>; feedback?: string; left?: number; roomLeft?: number; cool?: number; id?: string }
export const ck = (c: string) => String(c).replace(/[.#$/[\]]/g, '_');
export const EDGE = 1024, QUAL = 0.82;
export const ROOM0 = 2, COOL0 = 30, DAILY0 = 6, WARN_DAY0 = 150, WARN_MONTH0 = 3000, WON = 1.2;
export const day = (t = Date.now()) => { const d = new Date(t + 9 * 3600e3); return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`; };
export const cfgOf = (S: Store): PhotoCfg => S.get<PhotoCfg>('gcfg/photo') || {};
export const rubOf = (S: Store) => S.get<Record<string, Record<string, Rubric>>>('photo_rubric') || {};
/** 코드에 있는 기준표 (과목 팩 · 「📤 기준표 올리기」 원본) */
export const codeRubrics = (): Record<string, Record<string, Rubric>> => (SUBJ.rubrics as Record<string, Record<string, Rubric>> | undefined) || {};
export const daily = (c: PhotoCfg) => Number(c.daily) || DAILY0;
export const raidMax = (c: PhotoCfg) => Number(c.raid) || 2;
export const roomMax = (c: PhotoCfg) => Number(c.room) || ROOM0;
export const coolSec = (c: PhotoCfg) => (c.cool != null && (c.cool as unknown) !== '' ? Number(c.cool) : COOL0);
/** 기준표 차시 이름 (정식 = set-NN · 이 앱의 올린 차시 팩 = 다른 id → 차시 번호로 찾음 · 중계소는 이 이름으로 기준표를 읽음) */
export function rubricLesson(S: Store, L: Pick<LessonPack, 'id' | 'no'> & { partOf?: string }): string {
  const r = rubOf(S), c = codeRubrics(), has = (k?: string) => !!k && !!(r[k] || c[k]);
  if (has(L.id)) return L.id;
  const base = L.partOf || L.id.split('@')[0]; if (has(base)) return base!; // 쪼갠 팩(…@n) = 원래 차시
  const alt = `set-${String(L.no).padStart(2, '0')}`;
  return has(alt) ? alt : L.id;
}
/** 켜짐 · 주소 있음 (lid 없으면) / 그 방 기준표도 켜짐 */
export function ready(S: Store, lid?: string, rid?: string): boolean {
  const c = cfgOf(S); if (!(c.on && c.url)) return false;
  if (!lid) return true;
  return !!rubOf(S)[lid]?.[rid ?? '']?.on;
}
export const keyOf = (lid: string, rid: string) => `${lid}_${rid}`;
export const rubric = (S: Store, lid: string, rid: string): Rubric | null => rubOf(S)[lid]?.[rid] ?? codeRubrics()[lid]?.[rid] ?? null;
/** 문제 글 · 정답 · 모범 풀이 · 숫자 (학생이 지금 푼 그 숫자 그대로) */
export type PhItem = { question?: string; answer?: unknown; solution?: string; check?: Record<string, unknown> };
export function pack(items: PhItem[]) {
  const clean = (t: unknown) => String(t || '').replace(/\s*\(풀이는 학습지에\)\s*/g, ' ').replace(/^\d+\s+/, '').replace(/^\(이어서\)\s*/, '').trim();
  return { ask: items.map((q) => clean(q.question)).join(' / ').slice(0, 600), answer: items.map((q) => String(q.answer)).join(' / ').slice(0, 80), ref: items.map((q) => q.solution || '').join(' / ').slice(0, 600), params: Object.assign({}, ...items.map((q) => q.check || {})) };
}
export const ERR: Record<string, string> = { off: '선생님이 사진 채점을 잠깐 꺼 두었어요.', auth: '로그인이 풀렸어요. 다시 로그인해 주세요.', who: '이 기기의 로그인과 계정이 달라요. 다시 로그인해 주세요.', rubric: '이 문항은 아직 사진 채점을 준비 중이에요.', quota: '오늘 사진 채점을 다 썼어요 — 내일 또 해요!', busy: '지금 친구들이 한꺼번에 보내고 있어요. 30초 뒤 다시 보내 주세요.', api: '채점 서버가 잠깐 바빠요. 조금 뒤 다시 보내 주세요 (장 수는 그대로예요).', bad: '사진을 보내지 못했어요. 다시 찍어 주세요.', net: '인터넷이 끊겼거나 너무 오래 걸렸어요. 다시 보내 주세요.' };
export const errMsg = (res: PhotoRes | null, c: PhotoCfg) => (res && res.err === 'roomquota' ? `이 방은 오늘 ${roomMax(c)}번 다 해 봤어요 — 다른 방을 풀거나 내일 다시 도전해요!` : res && res.err === 'wait' ? `📷 ${Number(res.sec) || coolSec(c)}초 뒤에 다시 보낼 수 있어요 — 그동안 풀이를 고쳐 써요` : ERR[(res && res.err) || 'net'] || ERR.net!);
export const PRE_MSG: Record<string, string> = { dark: '🌑 너무 어두워요 — 밝은 곳에서 다시 찍어요', blank: '📄 글씨가 거의 안 보여요 — 빈 종이이거나 너무 흐려요 · 진하게 쓰고 밝은 곳에서 다시', notpaper: '🙈 학습지가 아닌 것 같아요 — 풀이를 쓴 종이만 보이게 찍어요', blur: '🌀 많이 흔들렸어요 — 폰을 멈추고 다시 찍어요', dup: '🔁 아까와 같은 사진이에요 — 풀이를 고친 뒤 새로 찍어요' };
/** 🧹 1차 거르기 판정 (글씨 양 · 밝기 · 알록달록) — 픽셀 통계에서 (정식 precheck 기준값 그대로) */
export function precheckOf(st: { mean: number; paper: number; sat: number; inkR: number }): string | null {
  if (st.paper < 110) return st.mean < 45 ? 'dark' : 'notpaper';
  if (st.sat > 0.35) return 'notpaper';
  if (st.inkR < 0.0015) return 'blank';
  if (st.inkR > 0.45) return 'notpaper';
  return null;
}
/** 중계소에 보내기 (text/plain = CORS 사전 요청 없음 · 90초) */
export async function post(url: string, body: unknown): Promise<PhotoRes> {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = setTimeout(() => ctl?.abort(), 90000);
  try { const r = await fetch(url, { method: 'POST', body: JSON.stringify(body), redirect: 'follow', signal: ctl?.signal }); return (await r.json()) as PhotoRes; }
  catch { return { ok: false, err: 'net' }; } finally { clearTimeout(t); }
}
export function leftToday(S: Store, c: PhotoCfg, cls: string, num: number, rk: string) {
  const q = S.get<{ n?: number; r?: Record<string, number>; last?: number }>(`photo_q/${ck(cls)}/${num}/${day()}`) || {};
  return { left: Math.max(0, daily(c) - (Number(q.n) || 0)), roomLeft: Math.max(0, roomMax(c) - (Number(q.r?.[rk]) || 0)), wait: Math.max(0, Math.ceil(((Number(q.last) || 0) + coolSec(c) * 1000 - Date.now()) / 1000)) };
}
/** 학생: 기다리던 확인 결과 → ok(처치 인정) · no(그대로) · wait — 결과 줄이 아직 거울에 없으면 wait (정식은 서버에 물어 no · 베타는 실시간 거울이라 늦게 올 수 있음) */
export function pendState(S: Store, cls: string, num: number, lid: string, rid: string, id: string): 'ok' | 'no' | 'wait' {
  const x = S.get<{ ok?: boolean }>(`photo/${ck(cls)}/${num}/${keyOf(lid, rid)}/${id}`);
  return !x ? 'wait' : x.ok === true ? 'ok' : x.ok === false ? 'no' : 'wait';
}
export const appealPath = (cls: string, num: number, lid: string, rid: string, id: string) => `photo/${ck(cls)}/${num}/${keyOf(lid, rid)}/${id}/appeal`;
/** 소레이드 채점용 문항 (학습지 숫자 · 단계별 중간값) — 정식 student.js wr-snap */
export function chainItems(rub: Rubric | null, stepTitle: string, items: Question[], says: string[]): PhItem[] {
  return [{ question: rub?.ask || stepTitle, answer: (items[items.length - 1] as { answer?: unknown } | undefined)?.answer, solution: says.join(' / '), check: Object.assign({}, ...items.map((x) => ((x as { check?: Record<string, unknown> }).check || {}))) }];
}
// ── 📜 #57 ✍ 혼자 다시 쓰기 = 숫자 바꾼 판 (학습지 숫자 📜 를 받은 뒤 문항당 한 번 더 · 소레이드 단계 없이 문제 → 손글씨 → 📷) ──
/** 학생 · 문항마다 늘 같은 판 (불통과 = 같은 숫자로 다시) · 1 ~ n−1 (판 0 = 학습지 숫자) */
export function rewriteVer(uid: string, mid: string, n: number): number {
  let h = 7; for (const c of `${uid}|${mid}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return n > 1 ? 1 + (h % (n - 1)) : 0;
}
const qText = (q: Question) => String((q as { question?: string }).question ?? '');
const ansText = (q: Question | undefined): string => {
  if (!q) return '';
  if (q.type === 'choice') return q.choices[q.answerIndex] ?? '';
  if (q.type === 'multi') { const ch = (q as { choices?: string[] }).choices || []; return (q.answer as number[]).map((i) => ch[i] ?? i).join(', '); }
  const a = (q as { answer?: unknown; answers?: string[] }).answer ?? (q as { answers?: string[] }).answers?.[0];
  return Array.isArray(a) ? a.join(', ') : String(a ?? '');
};
/** 그 판의 문제 = 공통 문제 글(단계 글 첫 줄이 모두 같으면) + 단계 질문들 · 사진 채점에 보낼 한 칸 (기준표 = 같은 문항 · 숫자만 그 판) */
export function rewriteOf(items: Question[]): { stem: string; lines: string[]; ph: PhItem[] } {
  const qs = items.map(qText), cut = qs.map((t) => t.indexOf('\n'));
  const head = cut.every((i) => i > 0) ? qs[0]!.slice(0, cut[0]) : '';
  const stem = head && qs.every((t) => t.startsWith(`${head}\n`)) ? head : '';
  const lines = qs.map((t) => (stem ? t.slice(stem.length + 1) : t).trim());
  const ask = `${[stem, ...lines].filter(Boolean).join(' / ')} (숫자 바꾼 판 · 기준표 단계는 같고 숫자만 이 문제 숫자)`;
  const sol = items.map((q) => (q as { say?: string; solution?: string }).say || (q as { solution?: string }).solution || '').filter(Boolean).join(' / ');
  return { stem, lines, ph: [{ question: ask, answer: ansText(items[items.length - 1]), solution: sol, check: Object.assign({}, ...items.map((x) => ((x as { check?: Record<string, unknown> }).check || {}))) }] };
}
/** 🏰 성채 방의 다시 쓰기 판 = 1 ~ 6 중 하나 · 문제 글이 판 0 과 같으면(숫자 없는 증명 · 3층 17) 판 0 */
export function rewriteCastle(vers: Question[][], uid: string, rid: string): Question[] {
  const k = rewriteVer(uid, rid, vers.length), v = vers[k] ?? vers[0] ?? [];
  return rewriteOf(v).stem && rewriteOf(v).stem === rewriteOf(vers[0] ?? []).stem ? (vers[0] ?? []) : v;
}
// ── 교사: 결과 모으기 · 확인할 것 · 사용량 ──
export interface PhotoRow { c: string; n: number; k: string; id: string; status: string; score?: number; total?: number; pass?: number; conf?: string; at?: number; ask?: string; right?: string; ans?: string; fb?: string; steps: { id?: string; pts?: number; earned?: number; note?: string }[]; flags: string[]; appeal?: { t?: string }; ok?: boolean; tok?: { in?: number; out?: number } }
export function allRows(S: Store): PhotoRow[] {
  const v = S.get<Record<string, Record<string, Record<string, Record<string, Record<string, unknown>>>>>>('photo') || {}, out: PhotoRow[] = [];
  for (const [c, byN] of Object.entries(v)) for (const [n, byK] of Object.entries(byN || {})) for (const [k, byId] of Object.entries(byK || {})) for (const [id, x] of Object.entries(byId || {})) if (x && (x as { status?: string }).status) out.push({ ...(x as object), steps: Object.values(((x as { steps?: object }).steps) || {}), flags: Object.values(((x as { flags?: object }).flags) || {}) as string[], c, n: Number(n), k, id } as PhotoRow);
  return out.sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0));
}
export const needs = (x: PhotoRow) => x.ok == null && (x.status === 'check' || !!x.appeal);
export function usage(S: Store) {
  const c = cfgOf(S), v = S.get<Record<string, number>>('photo_q/_all') || {}, d = day(), mon = d.slice(0, 6);
  const today = Number(v[d]) || 0, month = Object.entries(v).filter(([k]) => k.startsWith(mon)).reduce((a, [, n]) => a + (Number(n) || 0), 0);
  const wd = Number(c.warnDay) || WARN_DAY0, wm = Number(c.warnMonth) || WARN_MONTH0;
  return { today, month, won: Math.round(month * WON), wd, wm, warn: today >= wd || month >= wm, why: [today >= wd ? `오늘 학교 전체 ${today}장 (기준 ${wd})` : '', month >= wm ? `이번 달 ${month}장 ≈ ${Math.round(month * WON).toLocaleString()}원 (기준 ${wm}장)` : ''].filter(Boolean).join(' · ') };
}

/** 🧾 방 이름 (차시_방 → 「평가1 방 이름」) */
export function roomTitle(S: Store, k: string) { const i = k.indexOf('_'), l = k.slice(0, i), r = k.slice(i + 1), y = S.get<{ title?: string }>(`photo_rubric/${l}/${r}`) ?? codeRubrics()[l]?.[r]; return `${l.replace('eval-', '평가')} ${y?.title ?? r}`; }
/** ✔ 처치 인정 / ✖ 그대로 (정식 photo.js board 그대로 · 그 학생이 다음에 들어올 때 반영) → 저장됐나 */
export async function markPhoto(S: Store, x: Pick<PhotoRow, 'c' | 'n' | 'k' | 'id'>, ok: boolean): Promise<boolean> {
  const p = `photo/${x.c}/${x.n}/${x.k}/${x.id}`, at = S.now();
  const done = S.trySet ? (await S.trySet(`${p}/ok`, ok)) && (await S.trySet(`${p}/okAt`, at)) : (S.set(`${p}/ok`, ok), S.set(`${p}/okAt`, at), true);
  // 📜 #38 ① 선생님 ✔ 인정 = 교사 폰이 그 자리에서 📜 1 (학생 폰이 그 화면에 없어도 · 문제당 한 번 · 차시 문제만 = 성채는 성채 보상 길)
  if (done && ok) { const i = x.k.indexOf('_'), lid = x.k.slice(0, i), mid = x.k.slice(i + 1), num = Number(x.n); if (i > 0 && lessonKey(lid) && num) { const u = uidOf(String(x.c).replace(/_/g, '-'), num); if (!photoScroll(S, u, lid, mid)) photoScroll(S, u, lid, mid, true); } } // 📜 #57 학습지 숫자 📜 를 이미 받았으면 = ✍ 혼자 다시 쓰기(숫자 바꾼 판) 사진
  return done;
}
/** 성채 팩 문항이 아님 (성채 사진 = 성채 보상 길 · 📜 는 Castle 이 줌) */
const lessonKey = (lid: string) => !!lid && !castles.list.some((p) => p.id === lid);
/** 📜 #38 ① 서술형 사진 통과 = 결과가 온 그 자리에서 📜 1 (화면을 닫거나 새로 고쳐도 · 문제당 한 번 · 차시 문제만) */
export function passScroll(S: Store, cls: string, num: number, lid: string, mid: string, v = false): boolean {
  if (!cls || !num || !lessonKey(lid)) return false;
  return photoScroll(S, uidOf(cls, num), lid, mid, v); // v = 📜 #57 ✍ 혼자 다시 쓰기 (숫자 바꾼 판)
}
/** 📷 확인할 것 (⏳ 확신 낮음 · 🙋 이의 신청 · 아직 ✔ ✖ 안 함) · cls · num 으로 좁히기 (📜 2026-11-15 머리 🔨 「사진 승인 = 소식 탭 📷」) */
export const photoNeeds = (S: Store, cls = '', num = 0) => allRows(S).filter((x) => needs(x) && (!cls || x.c === ck(cls)) && (!num || Number(x.n) === num));
