import type { Store } from '../model/types';
// ✏ 출제 공방 (📜 #75 · DECISIONS 「✏ 출제 공방 = 성채던전 문제를 바탕으로만」 · QUEST-PHOTO-PLAN 4절 보상 · design/quest/AI-JUDGE.md)
//   학생: 바탕 방(열린 성채 방만) + 객관식 / 주관식 + 무엇을 바꿨나 + 양식 뒷면 사진 1장(하루 3번) → 모서리 4개로 반듯이 · 맨 위 이름 띠 가림 → 중계소 「출제 분석」
//   중계소(사진 채점과 같은 Apps Script · kind 'quest') → quest/{반}/{번호}/{id} = 판단 결과 (중계소 · 교사만 씀 · 학생 읽기만) (사진 · 이름 저장 ✗)
//   등급: 🟢 green = 💎3 (하루 2 · 나만) · 🔵 blue = 선생님 확인 → 💎8 + 📜1 (하루 2) → 게시판 「친구 문제」 · 🟣 purple = 선생님 확인 → 💎20 + 📜2 + 칭호 → 🏛 명예의 전당 · ⚪ gray = 반려(이유 · 다시 내기)
//   그림 · 그래프 문제 = 몬스터로 만들지 않음(🟣 안건으로만) · 종이 = 수행평가(게임 기록과 섞지 않음)
export type Grade = 'green' | 'blue' | 'purple' | 'gray';
export type QStatus = 'done' | 'wait' | 'ok' | 'fix' | 'gray';
export interface QuestRec {
  at: number; grade: Grade; reason?: string; status: QStatus; fixNote?: string;
  base: { pack: string; room: string; floor?: number; no?: number; text?: string; answer?: string }; type: 'obj' | 'subj'; changed?: string[];
  problem?: string; choices?: string[]; answer?: string; steps?: string[]; hint?: string; monster?: string;
  solve1?: string; solve2?: string; agree?: boolean; selfCheckNote?: string; issues?: string[]; picture?: boolean; showName?: boolean; test?: boolean;
}
export const GRADE_IC: Record<Grade, string> = { green: '🟢', blue: '🔵', purple: '🟣', gray: '⚪' };
export const GRADE_NAME: Record<Grade, string> = { green: '숫자 바꿈', blue: '변형', purple: '독창 후보', gray: '반려' };
export const REASON: Record<string, string> = { not_from_base: '고른 성채 방 문제와 관계가 없어 보여요 — 바탕 방 문제를 바꿔서 만들어요', wrong_answer: '적은 정답이 AI 두 번 풀이와 달라요', unsolvable: '조건이 서로 부딪히거나 답이 하나로 안 나와요', unreadable: '사진 글씨를 읽기 어려워요 — 밝은 곳에서 반듯하게 다시 찍어요', inappropriate: '어울리지 않는 내용이 있어요' };
export const CHANGES: [string, string][] = [['num', '숫자'], ['cond', '조건'], ['ask', '묻는 것'], ['story', '상황 · 이야기']];
export const QUEST = { daily: 3, green: { g: 3, perDay: 2 }, blue: { g: 8, s: 1, perDay: 2 }, purple: { g: 20, s: 2 }, authorSolve: { g: 1, perWeek: 10 }, hallSolve: { g: 2, perDay: 5 } } as const;
export const questPath = (cls: string, num: number) => `quest/${String(cls).replace(/[.#$/[\]]/g, "_")}/${num}`;
const kday = (t: number) => { const d = new Date(t + 9 * 3600e3); return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`; };
/** 월요일 시작 주 (KST) */
export const kweek = (t: number) => { const d = new Date(t + 9 * 3600e3), wd = (d.getUTCDay() + 6) % 7; return kday(t - wd * 86400e3); };
export function uploadsToday(recs: Record<string, QuestRec>, now: number): number { const d = kday(now); return Object.values(recs || {}).filter((r) => r && !r.test && kday(Number(r.at) || 0) === d).length; }
/** 받을 보상 (gem log 키가 없을 때만 · 하루 · 주 상한) — key = quest_g_ · quest_b_ · quest_p_ (도전과제 「출제자」 = quest_ 로 셈) */
export function questClaim(id: string, r: QuestRec, log: Record<string, { at?: number } | null>, now: number): { key: string; g: number; s: number; why: string } | null {
  const d = kday(now), keys = Object.keys(log || {}), today = (p: string) => keys.filter((k) => k.startsWith(p) && kday(Number(log[k]?.at) || 0) === d).length;
  if (r.grade === 'green' && r.status === 'done') { const k = `quest_g_${id}`; if (log[k] || today('quest_g_') >= QUEST.green.perDay) return null; return { key: k, g: QUEST.green.g, s: 0, why: '✏ 출제 🟢' }; }
  if (r.grade === 'blue' && r.status === 'ok') { const k = `quest_b_${id}`; if (log[k] || today('quest_b_') >= QUEST.blue.perDay) return null; return { key: k, g: QUEST.blue.g, s: QUEST.blue.s, why: '✏ 출제 🔵 (친구 문제)' }; }
  if (r.grade === 'purple' && r.status === 'ok') { const k = `quest_p_${id}`; if (log[k]) return null; return { key: k, g: QUEST.purple.g, s: QUEST.purple.s, why: '✏ 출제 🟣 (명예의 전당)' }; }
  return null;
}
/** 내 문제를 친구가 풂 = 출제자 💎1 (주 10) · 받을 줄들 */
export function solveClaims(mine: { id: string; solved?: Record<string, number> }[], log: Record<string, { at?: number } | null>, now: number): { key: string; g: number }[] {
  const w = kweek(now), used = Object.keys(log || {}).filter((k) => k.startsWith('qsolve_') && kweek(Number(log[k]?.at) || 0) === w).length, out: { key: string; g: number }[] = [];
  for (const m of mine) for (const u of Object.keys(m.solved || {})) { const k = `qsolve_${m.id}_${u}`; if (log[k]) continue; if (used + out.length >= QUEST.authorSolve.perWeek) return out; out.push({ key: k, g: QUEST.authorSolve.g }); }
  return out;
}
/** 전당 문제를 풂 = 💎2 (하루 5) */
export function hallSolveClaim(id: string, log: Record<string, { at?: number } | null>, now: number): { key: string; g: number } | null {
  const k = `qhall_${id}`; if (log[k]) return null; const d = kday(now);
  if (Object.keys(log || {}).filter((x) => x.startsWith('qhall_') && kday(Number(log[x]?.at) || 0) === d).length >= QUEST.hallSolve.perDay) return null;
  return { key: k, g: QUEST.hallSolve.g };
}
/** 답 맞나 (객관식 = 번호 · 주관식 = 공백 · 쉼표 · 기호 정리) */
export function questRight(r: Pick<QuestRec, 'answer' | 'type' | 'choices'>, given: string): boolean {
  const norm = (s: unknown) => String(s ?? '').replace(/\s+/g, '').replace(/[①②③④⑤]/g, (c) => String('①②③④⑤'.indexOf(c) + 1)).replace(/,/g, ',').toLowerCase();
  const a = norm(r.answer), g = norm(given); if (!a || !g) return false;
  if (r.type === 'obj') { const ai = a.match(/^[1-5]/)?.[0], gi = g.match(/^[1-5]/)?.[0]; return !!ai && ai === gi; }
  return a === g || a.replace(/[{}]/g, '') === g.replace(/[{}]/g, '');
}
// ── 📸 사진: 모서리 표시 4개 찾기 → 반듯하게(사영 변환) → 맨 위 이름 띠 가리기 ─────────────
export type Pt = [number, number];
/** 흑백 픽셀(0~255)에서 네 모서리 표시(검은 ㄱ자)의 바깥 꼭짓점 · 못 찾으면 null
 *  종이 밝기(상위 10%)의 절반보다 어두운 점 = 진한 점 · 사진 가장자리에 닿은 진한 덩어리(책상 · 그림자) = 바탕으로 빼고 · 남은 진한 점 중 사진 네 귀퉁이에 가장 가까운 점 */
export function findMarks(gray: Uint8ClampedArray | number[], w: number, h: number): [Pt, Pt, Pt, Pt] | null {
  const hist = new Array(256).fill(0); for (let i = 0; i < gray.length; i += 3) hist[gray[i]! | 0]++;
  let acc = 0, tot = Math.ceil(gray.length / 3), p90 = 255; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= tot * 0.1) { p90 = v; break; } }
  if (p90 < 90) return null; // 너무 어두움
  const th = p90 * 0.5, n = w * h, dark = new Uint8Array(n);
  for (let i = 0; i < n; i++) dark[i] = gray[i]! < th ? 1 : 0;
  // 가장자리에 닿은 진한 덩어리 = 바탕 (2 로 표시)
  const st: number[] = []; const push = (i: number) => { if (dark[i] === 1) { dark[i] = 2; st.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); } for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (st.length) { const i = st.pop()!, x = i % w; if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); if (i >= w) push(i - w); if (i < n - w) push(i + w); }
  const rx = Math.round(w * 0.35), ry = Math.round(h * 0.35), corners: [number, number][] = [[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]], out: Pt[] = [];
  const isD = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && dark[y * w + x] === 1;
  for (const [cx, cy] of corners) {
    let best: Pt | null = null, bd = Infinity, cnt = 0;
    const x0 = cx === 0 ? 0 : w - rx, y0 = cy === 0 ? 0 : h - ry;
    for (let y = y0; y < y0 + ry; y += 2) for (let x = x0; x < x0 + rx; x += 2) {
      if (!isD(x, y)) continue;
      if (!(isD(x + 2, y) && isD(x - 2, y)) && !(isD(x, y + 2) && isD(x, y - 2))) continue; // 선 굵기가 있는 점만 (잡티 거름)
      cnt++; const d = Math.hypot(x - cx, y - cy); if (d < bd) { bd = d; best = [x, y]; }
    }
    if (!best || cnt < 12) return null; out.push(best);
  }
  const [a, b, c, d] = out as [Pt, Pt, Pt, Pt];
  const area = Math.abs((a[0] * b[1] - b[0] * a[1]) + (b[0] * c[1] - c[0] * b[1]) + (c[0] * d[1] - d[0] * c[1]) + (d[0] * a[1] - a[0] * d[1])) / 2;
  return area > w * h * 0.2 ? [a, b, c, d] : null;
}
/** 네 점(왼위 · 오른위 · 오른아래 · 왼아래) → 사각형 (0,0)-(W,H) 로 보내는 역변환 (H 좌표 → 원본 좌표) */
export function homography(src: [Pt, Pt, Pt, Pt], W: number, H: number): (x: number, y: number) => Pt {
  // 목표 단위 사각형 → 원본 사각형 (Heckbert 식)
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = src;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9, g = (dx3 * dy2 - dx2 * dy3) / den, h = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
  return (x, y) => { const u = x / W, v = y / H, z = g * u + h * v + 1; return [(a * u + b * v + c) / z, (d * u + e * v + f) / z]; };
}
/** 이름 띠 가림 높이 (반듯하게 편 뒤 · 위에서 이만큼 흰색) — 양식 뒷면: 모서리 표시 4 mm · 이름 띠 11 ~ 20 mm → 펴진 높이 289 mm 의 7 % */
export const NAME_BAND = 0.07;
// ── 👩‍🏫 교사: 출제 안건 (🔵 🟣 = 선생님 확인 · 소식 탭 「✏ 출제」) ─────────────────────────
export interface QRow extends QuestRec { c: string; n: number; id: string }
/** 게임 문제 하나 (친구 문제 · 명예의 전당 · 1:1 풀기) */
export interface QPlay { id: string; by: { cls: string; num: number }; grade: Grade; type: 'obj' | 'subj'; problem: string; choices?: string[]; answer: string; steps?: string[]; hint?: string; monster?: string; base?: QuestRec['base']; at: number; hero?: number; title?: string; name?: string; like?: Record<string, number>; solved?: Record<string, number> }
export const QBOARD = (cls: string) => `school/qboard/${String(cls).replace(/[.#$/[\]]/g, '_')}`;
export const HALL = 'school/hall';
export const nameOptPath = (cls: string, num: number) => `bonus/${String(cls).replace(/[.#$/[\]]/g, '_')}/${num}/questName`;
export function questRows(S: Store): QRow[] {
  const all = S.get<Record<string, Record<string, Record<string, QuestRec>>>>('quest') || {}, out: QRow[] = [];
  for (const [c, byN] of Object.entries(all)) if (c !== '_test') for (const [n, byId] of Object.entries(byN || {})) for (const [id, r] of Object.entries(byId || {})) if (r && r.grade) out.push({ ...r, c, n: Number(n), id });
  return out.sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0));
}
export const questNeeds = (S: Store, cls = '', num = 0) => questRows(S).filter((r) => r.status === 'wait' && (!cls || r.c === String(cls).replace(/[.#$/[\]]/g, '_')) && (!num || r.n === num));
/** 학생 한 명 출제 수 (PupilSheet 「✏ 출제 n (🟢a · 🔵b · 🟣c)」 · 🔵 🟣 = 선생님 확인 받은 것만) */
export function questCount(recs: Record<string, QuestRec> | null | undefined): { n: number; g: number; b: number; p: number } {
  const v = Object.values(recs || {}).filter((r) => r && !r.test);
  return { n: v.length, g: v.filter((r) => r.grade === 'green').length, b: v.filter((r) => r.grade === 'blue' && r.status === 'ok').length, p: v.filter((r) => r.grade === 'purple' && r.status === 'ok').length };
}
const playOf = (r: QRow, extra: Partial<QPlay> = {}): QPlay => ({ id: r.id, by: { cls: r.c, num: r.n }, grade: r.grade, type: r.type, problem: r.problem || '', ...(r.type === 'obj' ? { choices: r.choices || [] } : {}), answer: r.answer || '', steps: r.steps || [], hint: r.hint || '', monster: r.monster || '', base: r.base, at: Date.now(), ...extra });
/** ✔ 출제 승인: 🔵 → 반 「친구 문제」 · 🟣 → 🏛 명예의 전당(용사 · 칭호 · 반 · 이름은 학생이 켰을 때만) · 그림 문제 = 보상만(게임 문제로 안 만듦) → 저장됐나 */
export async function approveQuest(S: Store, r: QRow, note = ''): Promise<boolean> {
  const p = `quest/${r.c}/${r.n}/${r.id}`, set = async (k: string, v: unknown) => (S.trySet ? S.trySet(k, v) : (S.set(k, v), true));
  if (!(await set(`${p}/status`, 'ok'))) return false;
  if (note.trim()) await set(`${p}/fixNote`, note.trim().slice(0, 120));
  await set(`${p}/okAt`, Date.now());
  if (r.picture) return true;
  if (r.grade === 'blue') await set(`${QBOARD(r.c)}/${r.id}`, playOf(r));
  if (r.grade === 'purple') {
    const acc = S.get<{ hero?: number; title?: string }>(`accounts/${r.c}/${r.n}`) || {}, opt = S.get<boolean>(nameOptPath(r.c, r.n)) === true;
    const nm = opt ? (S.get<Record<string, string>>(`roster/${r.c}`) || {})[String(r.n)] : undefined;
    await set(`${HALL}/${r.id}`, playOf(r, { hero: Number(acc.hero) || 0, title: acc.title || '', ...(nm ? { name: nm } : {}) }));
  }
  return true;
}
/** ✏ 고쳐 주세요 (메모) — 벌이 아님 · 학생이 다시 낼 수 있음 */
export async function fixQuest(S: Store, r: QRow, note: string): Promise<boolean> {
  const p = `quest/${r.c}/${r.n}/${r.id}`;
  if (S.trySet) return (await S.trySet(`${p}/status`, 'fix')) && (await S.trySet(`${p}/fixNote`, note.trim().slice(0, 120) || '조금만 고쳐서 다시 내 봐요'));
  S.set(`${p}/status`, 'fix'); S.set(`${p}/fixNote`, note.trim().slice(0, 120) || '조금만 고쳐서 다시 내 봐요'); return true;
}
