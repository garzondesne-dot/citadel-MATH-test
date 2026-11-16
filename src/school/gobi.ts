// 📊 우리 반 고비 (📜 2026-11-17 #14 · 통일 용어 · DECISIONS 「📊 🔎 풀이 = 우리 반 오답 먼저 · 준비된 풀이 다음」)
//   칸(소문제 · 졸개 · 형성평가 문항)마다 반 합계 숫자만 — 처음에 틀린 친구 n명 · 쓴 재도전 합계 n번 · 💡 도움 n번 · 🙋 손 n번 · 다시 도전해서 해낸 친구 n명
//   많이 쓴 오답 = 같은 답 3명 이상일 때만 · 살아 있는 몬스터 = 오답 숨김(푸는 친구에게 답 힌트 막기) · 이름 · 학생 단위 숫자 없음 · 서술형(📷) 칸 뺌
//   고비 점수 = 처음 틀린 비율(동점 = 재도전 → 💡) · 참여 3명 미만 칸 = 뺌 · 머문 시간 = 칸별 시각 기록이 없어 뺌(「없는 숫자는 그 칸만 뺌」)
import type { Given, LessonPack, Room } from '../model/types';
import { activeIds, BOSS_ID, bossTries, chainRecord, cleared, isChain, plainRecord, bossHp, stepOf } from '../raid/raid';

export const GOBI_MIN = 3;
export interface GobiCell { mid: string; i: number; label: string; n: number; firstWrong: number; retries: number; help: number; hands: number; comeback: number; top: { ans: string; n: number } | null; rate: number }
export interface GobiCard { kind: 'monster' | 'boss' | 'day'; title: string; cells: GobiCell[]; worst: number; alive: boolean; thinking: number; firstWrong: number; comeback: number }

const ans = (g: Given | undefined): string => (Array.isArray(g) ? `{${[...g].map(String).sort().join(', ')}}` : g == null ? '' : String(g)).trim();
const ck = (s: string) => s.replace(/[.#$/[\]]/g, '_');
const nameOf = (L: LessonPack, mid: string) => (mid === BOSS_ID ? '👑 형성평가' : L.steps.find((s) => s.id === mid)?.title ?? mid);
function topWrong(list: string[]): { ans: string; n: number } | null {
  const m: Record<string, number> = {}; list.filter(Boolean).forEach((a) => (m[a] = (m[a] || 0) + 1));
  const best = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= GOBI_MIN ? { ans: best[0], n: best[1] } : null;
}
function finish(cells: GobiCell[]): GobiCell[] {
  return cells.map((c) => ({ ...c, rate: c.n ? c.firstWrong / c.n : 0 }));
}
/** 고비 점수 순 (높을수록 힘들었던 칸) */
export const byScore = (a: GobiCell, b: GobiCell) => b.rate - a.rate || b.retries - a.retries || b.help - a.help;

/** 몬스터 하나의 칸별 고비 */
export function gobiMonster(L: LessonPack, R: Room, mid: string): GobiCell[] {
  const ids = Object.keys(R.players || {}).filter((u) => (R.subs?.[mid]?.[u] || R.chain?.[mid]?.[u]));
  const players = (R.players || {}) as Record<string, { hp?: Record<string, number>; hand?: { mid?: string } | null }>;
  if (isChain(L, R, mid)) {
    const recs = ids.map((u) => chainRecord(L, R, mid, u, true)), n = Math.max(0, ...recs.map((r) => r.n));
    return finish(Array.from({ length: n }, (_, i) => {
      const tried = recs.filter((r) => r.stage > i || (r.stage === i && r.wrong > 0));
      const fw = tried.filter((r) => !r.stFirst[i]);
      return { mid, i, label: i < n - 1 ? `졸개 ${'①②③④⑤⑥⑦⑧'[i]}` : '대장', n: tried.length, firstWrong: fw.length, retries: fw.length, help: ids.filter((u) => Number(players[u]?.hp?.[ck(`${mid}_${i}`)]) > 0).length, hands: i === 0 ? ids.filter((u) => players[u]?.hand?.mid === mid).length : 0, comeback: fw.filter((r) => r.stOk[i]).length, top: null, rate: 0 };
    }));
  }
  const recs = ids.map((u) => ({ u, r: plainRecord(L, R, mid, u) })).filter((x) => x.r.tries.length);
  const total = Math.max(0, ...recs.map((x) => x.r.total));
  return finish(Array.from({ length: total }, (_, i) => {
    let n = 0, firstWrong = 0, retries = 0, comeback = 0; const wrongAns: string[] = [];
    for (const { r } of recs) {
      const pre = r.perfectAt >= 0 ? r.tries.slice(0, r.perfectAt + 1) : r.tries; if (!pre.length || pre[0]!.marks[i] == null) continue;
      n++;
      if (!pre[0]!.marks[i]) { firstWrong++; wrongAns.push(ans(pre[0]!.given[i])); const k = pre.findIndex((t) => t.marks[i]); retries += k < 0 ? pre.length - 1 : k; if (k > 0) comeback++; }
    }
    const help = recs.filter((x) => Number(players[x.u]?.hp?.[ck(`${mid}_${i}`)]) > 0).length;
    return { mid, i, label: `${i + 1}번`, n, firstWrong, retries, help, hands: i === 0 ? recs.filter((x) => players[x.u]?.hand?.mid === mid).length : 0, comeback, top: topWrong(wrongAns), rate: 0 };
  }));
}
/** 👑 형성평가 문항별 고비 */
export function gobiBoss(L: LessonPack, R: Room): GobiCell[] {
  const n = L.boss?.items || 0, ids = Object.keys(R.bossTry || {});
  const all = ids.map((u) => bossTries(L, R, u));
  return finish(Array.from({ length: n }, (_, i) => {
    let cnt = 0, firstWrong = 0, retries = 0, comeback = 0; const wrongAns: string[] = [];
    for (const tr of all) {
      const mine = tr.filter((t) => t.i === i).sort((a, b) => a.a - b.a); if (!mine.length) continue;
      cnt++; if (!mine[0]!.ok) { firstWrong++; wrongAns.push(ans(mine[0]!.given)); const k = mine.findIndex((t) => t.ok); retries += k < 0 ? mine.length - 1 : k; if (k > 0) comeback++; }
    }
    return { mid: BOSS_ID, i, label: `${i + 1}번`, n: cnt, firstWrong, retries, help: 0, hands: 0, comeback, top: topWrong(wrongAns), rate: 0 };
  }));
}
/** 리모컨 「🔎 풀이」 첫 장 = 지금 단계의 고비 (몬스터 · 👑 · 마무리 = 오늘 고비 3곳) · 참여 3명 미만 칸 뺌 */
export function gobiCard(L: LessonPack, R: Room, target: string, now: number): GobiCard {
  const pick = (cs: GobiCell[]) => cs.filter((c) => c.n >= GOBI_MIN);
  let kind: GobiCard['kind'], cells: GobiCell[], alive: boolean, title: string;
  if (target === '_day') {
    const mons = L.steps.filter((s) => s.kind === 'monster' && L.monsters[s.id]).flatMap((s) => pick(gobiMonster(L, R, s.id)));
    cells = [...mons, ...(L.boss ? pick(gobiBoss(L, R)) : [])].filter((c) => c.firstWrong > 0).sort(byScore).slice(0, 3);
    kind = 'day'; alive = false; title = '오늘 우리 반 고비 3곳';
  } else if (target === BOSS_ID) {
    cells = pick(gobiBoss(L, R)); kind = 'boss'; alive = !bossHp(L, R, now).won; title = '👑 형성평가 · 우리 반 고비';
  } else {
    cells = pick(gobiMonster(L, R, target)); kind = 'monster'; alive = !cleared(L, R, target, now); title = `${nameOf(L, target)} · 우리 반 고비`;
  }
  if (alive) cells = cells.map((c) => ({ ...c, top: null })); // 살아 있는 동안 = 오답 숨김
  const worst = cells.length ? cells.indexOf([...cells].sort(byScore)[0]!) : -1;
  const ids = activeIds(R, now);
  const thinking = kind === 'monster' && alive ? ids.filter((u) => { const r = plainRecord(L, R, target, u); return !isChain(L, R, target) && r.tries.length > 0 && r.perfectAt < 0; }).length : 0;
  return { kind, title, cells, worst, alive, thinking, firstWrong: cells.reduce((a, c) => a + c.firstWrong, 0), comeback: cells.reduce((a, c) => a + c.comeback, 0) };
}
/** 지금 단계의 고비 대상 (몬스터 id · 👑 · 마무리 = '_day' · 없음 = null) */
export function gobiTarget(L: LessonPack, R: Room): string | null {
  const st = stepOf(L, R);
  if (!st) return Object.keys(R.subs || {}).length || Object.keys(R.bossTry || {}).length ? '_day' : null;
  if (st.kind === 'monster' && L.monsters[st.id]) return st.id;
  if (st.kind === 'boss' && L.boss) return BOSS_ID;
  return null;
}
/** 반이 몬스터를 하나라도 풀었나 (🔎 단추 = 그때부터 모든 차시에서 늘 보임) */
export const anySolved = (R: Room | null | undefined) => !!R && (Object.keys(R.subs || {}).length > 0 || Object.keys(R.chain || {}).length > 0 || Object.keys(R.bossTry || {}).length > 0);
