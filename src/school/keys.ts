// 🔑 입장 열쇠 = 선수 학습 점검 (📜 #59 · DECISIONS 「🔑 입장 열쇠」 + 정정 2 · 설계 #6-3 · PACK-GUIDE 17)
//   팩 칸 keys = 열쇠 3개까지 { id, name, grade, help, vers: [판 0 = 수업 소문제와 같은 물음 · 숫자, 판 1, 판 2], uses: [{ at: 몬스터 id | 'boss', n: 소문제 번호(1부터) }] }
//   대기실(첫 몬스터 등장 전까지) = 판 0 한 문제씩 · 맞히면 🔑 · 틀리면 💡 한 줄 + 답 → 바로 🔑 (다시 풀기 없음)
//   수업 = 그 소문제 위 🔑(있음) / 🔒(없음) · 첫 시도에 맞히면 🎁 보물상자(💎 +3 · 한 차시 최대 3 · 하루 한도 안) · 재도전 정답 = 「🔑 사용」만
//   기록: 열쇠 = rooms/{방}/players/{학생}/keys/{열쇠} = { ok: 첫 번에 맞혔나, at } (학생 쓰기 칸 · 규칙 그대로) · 상자 = 방 기록에서 셈(쓰기 없음)
//   🎯 허수아비 「🔑 열쇠 연습」 = 판 1 · 2 · 기록 bonus/{반}/{번호}/{차시}/keys = { 열쇠: 맞힌 수 } · 보상 = 스위치(기본 = 기록만)
import type { Given, LessonPack, Question, Room } from '../model/types';
import { grade } from '../engine/grade';
import { feat } from './features.svelte';
import { bossState, chainRecord, isChain, isLobby, plainRecord } from '../raid/raid';

export interface KeyUse { at: string; n: number }
export interface EntryKey { id: string; name: string; grade?: string; help: string; vers: Question[]; uses: KeyUse[] }
export const KEY_CHEST = { gem: 3, max: 3 } as const;

export const keysOf = (L: LessonPack | null | undefined): EntryKey[] => ((L as { keys?: EntryKey[] } | null | undefined)?.keys || []).filter((k) => k && k.id && Array.isArray(k.vers) && k.vers.length > 0 && k.vers.every((q) => !!q && typeof (q as { question?: unknown }).question === 'string')); // 🔑 #60 엔진 꼴 아닌 열쇠 = 빼기(화면이 멈추지 않게)
/** 그 소문제를 쓰는 열쇠 (at = 몬스터 id | 'boss' · n = 1부터) */
export const keyFor = (L: LessonPack, at: string, n: number): EntryKey | null => keysOf(L).find((k) => k.uses.some((u) => u.at === at && u.n === n)) ?? null;

type KeyRec = Record<string, { ok?: boolean; at?: number; /** 🔑 B: 몇 번째에 맞혔나 */ n?: number }>;
export const myKeys = (R: Room | null | undefined, uid: string): KeyRec => (((R?.players?.[uid] as { keys?: KeyRec } | undefined)?.keys) || {});
export const hasKey = (R: Room | null | undefined, uid: string, kid: string) => !!myKeys(R, uid)[kid];

/** 열쇠는 수업(레이드)에서만 · 🎯 허수아비 · 🏰 성채 · 📋 게시판(혼자 방 = board) = 안 씀 */
export const keyRoom = (R: Room | null | undefined) => !!R && (R.meta as { profile?: string }).profile !== 'board' && feat('keys');
/** 열쇠를 얻을 수 있는 때 = 대기실 · 첫 몬스터 단계 전 (도입 · 개념) · 수업이 닫히지 않음 */
export function keyWindow(L: LessonPack, R: Room | null | undefined): boolean {
  if (!R?.state || !keyRoom(R) || R.state.closed || !keysOf(L).length) return false;
  if (isLobby(R)) return true;
  const first = L.steps.findIndex((s) => s.kind === 'monster' || s.kind === 'boss');
  return first >= 0 && Number(R.state.step) < first;
}
/** 대기실 열쇠 문제 = 판 0 · 답 확인 */
export const keyQ = (k: EntryKey, v = 0): Question => k.vers[v % k.vers.length]!;
/** 🔑 B (📜 2026-11-19 선생님 「맞혀야 지급」): 틀린 수 → 다음에 풀 판(숫자 바꾼 판 1 → 2 → 0 …) · 3번 틀리면 정답을 보여 줌 */
export const KEY_SHOW_AFTER = 3;
export const keyVer = (miss: number) => miss;
export const keyRight = (k: EntryKey, given: Given, v = 0) => grade(keyQ(k, v), given);
/** 정답 한 줄 (틀렸을 때 보여 줌) */
export function answerText(q: Question): string {
  if (q.type === 'choice') return q.choices[q.answerIndex] ?? '';
  if (q.type === 'ox') return q.answer ? 'O (참)' : 'X (거짓)';
  if (q.type === 'multi') return q.answer.map((i) => q.options[i]).join(', ');
  if (q.type === 'number') return String(q.answer);
  if (q.type === 'text') return (q.answers || [])[0] ?? '';
  if (q.type === 'blanks') return q.items.map((x) => x.answer).join(', ');
  return '';
}

/** 그 소문제의 결과 (첫 시도 맞힘 · 나중에 맞힘 · 아직) */
export function subState(L: LessonPack, R: Room, uid: string, at: string, n: number): 'first' | 'later' | 'none' {
  const i = n - 1;
  if (at === 'boss') { if (!L.boss) return 'none'; const b = bossState(L, R, uid)[i]; return !b ? 'none' : b.first ? 'first' : b.ok ? 'later' : 'none'; }
  if (!L.monsters[at]) return 'none';
  if (isChain(L, R, at)) { const c = chainRecord(L, R, at, uid); return c.stFirst[i] ? 'first' : c.stOk[i] ? 'later' : 'none'; }
  const p = plainRecord(L, R, at, uid), t0 = p.tries[0];
  if (t0 && t0.attempt === 0 && t0.marks[i]) return 'first';
  return p.tries.some((t) => t.marks[i]) ? 'later' : 'none';
}
export interface KeyUseRow { kid: string; name: string; at: string; n: number; have: boolean; state: 'first' | 'later' | 'none'; chest: boolean }
/** 수업 순서대로 열쇠가 걸린 소문제 · 상자 = 열쇠 있음 + 첫 시도 맞힘 · 앞에서부터 한 차시 최대 3 */
export function keyUses(L: LessonPack, R: Room, uid: string): KeyUseRow[] {
  const order = (at: string) => (at === 'boss' ? 1e3 : L.steps.findIndex((s) => s.id === at));
  const rows = keysOf(L).flatMap((k) => k.uses.map((u) => ({ kid: k.id, name: k.name, at: u.at, n: u.n, have: hasKey(R, uid, k.id), state: subState(L, R, uid, u.at, u.n), chest: false })))
    .sort((a, b) => order(a.at) - order(b.at) || a.n - b.n);
  let c = 0; for (const r of rows) if (r.have && r.state === 'first' && c < KEY_CHEST.max) { r.chest = true; c++; }
  return rows;
}
export const chestsOf = (L: LessonPack, R: Room, uid: string) => keyUses(L, R, uid).filter((r) => r.chest).length;

/** 리모컨 · TV 대기실: 열쇠 얻은 학생 수 / 들어온 인원 · 많이 틀린 열쇠 */
export function keyBoard(L: LessonPack, R: Room, uids: string[]) {
  const ks = keysOf(L);
  const per = ks.map((k) => { const got = uids.filter((u) => myKeys(R, u)[k.id]); return { id: k.id, name: k.name, got: got.length, first: got.filter((u) => myKeys(R, u)[k.id]!.ok).length, wrong: got.filter((u) => { const r = myKeys(R, u)[k.id]! as { ok?: boolean; n?: number }; return r.ok === false || (Number(r.n) || 1) >= 2; }).length }; /* 🔑 B: 두 번째 이상에 맞힘(n ≥ 2) · 옛 「틀려도 지급」(ok:false) 도 셈 */ });
  const all = uids.filter((u) => ks.length && ks.every((k) => myKeys(R, u)[k.id])).length;
  const worst = per.filter((x) => x.wrong > 0).sort((a, b) => b.wrong - a.wrong)[0] ?? null;
  return { n: ks.length, all, total: uids.length, per, worst };
}

// ── 📦 팩 검사 (PACK-GUIDE 17 초안 규칙 1 ~ 5) ──
export interface KeyIssue { at: string; msg: string; lvl: 'err' | 'ask' }
/** toQ = 팩 문항 꼴(q · a · ch) → Question (이미 Question 이면 그대로) */
export function parseKeys(raw: unknown, L: LessonPack, toQ: (it: unknown, at: string, out: KeyIssue[]) => Question | null, out: KeyIssue[]): EntryKey[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) { out.push({ at: '🔑 열쇠(keys)', msg: 'keys 는 목록이어야 해요', lvl: 'err' }); return null; }
  if (raw.length > 3) out.push({ at: '🔑 열쇠(keys)', msg: `열쇠 ${raw.length}개 — 3개까지`, lvl: 'err' });
  const seen = new Set<string>(), cell = new Map<string, string>(), res: EntryKey[] = [];
  raw.forEach((k0, i) => {
    const k = (k0 || {}) as Record<string, unknown>, id = String(k.id ?? ''), at = `🔑 열쇠 ${i + 1}번${id ? ` (${id})` : ''}`;
    if (!/^k\d+$/.test(id)) out.push({ at, msg: `id 「${id}」 — k1 · k2 · k3`, lvl: 'err' });
    if (seen.has(id)) out.push({ at, msg: `id 「${id}」 가 겹쳐요`, lvl: 'err' }); seen.add(id);
    const name = String(k.name ?? '').trim(), help = String(k.help ?? '').trim();
    if (!name) out.push({ at, msg: '이름(name)이 비었어요', lvl: 'err' }); else if ([...name.replace(/\s/g, '')].length > 12) out.push({ at, msg: `이름 「${name}」 — 12자 안쪽 권장`, lvl: 'ask' });
    if (!help) out.push({ at, msg: '💡 한 줄(help)이 비었어요', lvl: 'err' });
    const vs = Array.isArray(k.vers) ? (k.vers as unknown[]) : [];
    if (!vs.length) out.push({ at, msg: '문제(vers)가 하나도 없어요 (판 0 + 다시 풀 판 2 = 3개 권장)', lvl: 'err' });
    else if (vs.length < 3) out.push({ at, msg: `판 ${vs.length}개 — 판 3개 권장 (판 1 · 2 = 허수아비 열쇠 연습)`, lvl: 'ask' });
    const qs = vs.map((v, j) => (v && typeof v === 'object' && 'question' in (v as object) ? (v as Question) : toQ(v, `${at} · 판 ${j}`, out))).filter((q): q is Question => !!q);
    if (qs.length > 1 && qs.some((q) => q.type !== qs[0]!.type)) out.push({ at, msg: `판마다 꼴이 달라요 (${qs.map((q) => q.type).join(' · ')})`, lvl: 'err' });
    const uses = (Array.isArray(k.uses) ? (k.uses as unknown[]) : []).map((u) => ({ at: String((u as KeyUse)?.at ?? ''), n: Number((u as KeyUse)?.n) }));
    if (!uses.length) out.push({ at, msg: '쓰이는 칸(uses)이 비었어요', lvl: 'err' });
    uses.forEach((u) => {
      const where = `${at} · uses ${u.at} ${u.n}`;
      const cnt = u.at === 'boss' ? (L.boss?.items ?? 0) : L.monsters[u.at] ? subCount(L, u.at) : -1;
      if (cnt < 0) out.push({ at: where, msg: `몬스터 「${u.at}」 가 이 팩에 없어요`, lvl: 'err' });
      else if (!(Number.isInteger(u.n) && u.n >= 1 && u.n <= cnt)) out.push({ at: where, msg: `소문제 번호 ${u.n} — 1 ~ ${cnt}`, lvl: 'err' });
      const c = `${u.at}#${u.n}`; if (cell.has(c) && cell.get(c) !== id) out.push({ at: where, msg: `이 소문제에 열쇠 「${cell.get(c)}」 도 있어요 — 한 소문제에 열쇠 하나(상자가 두 번 열림)`, lvl: 'err' }); cell.set(c, id);
    });
    if (uses.length && !uses.some((u) => u.at !== 'boss')) out.push({ at, msg: '형성평가만 가리켜요 — 몬스터 칸 하나는 있어야 수업에서 쓰여요', lvl: 'ask' });
    if (uses.length && uses.every((u) => u.at === 'boss' || L.steps.find((s) => s.id === u.at)?.later)) out.push({ at, msg: '허수아비(later) 몬스터만 가리켜요 — 수업에서 쓰일 일이 없어요', lvl: 'ask' });
    if (id && name && help && qs.length) res.push({ id, name, ...(k.grade ? { grade: String(k.grade) } : {}), help, vers: qs, uses });
  });
  return res;
}
/** 몬스터 칸 소문제 수 (소레이드 = 단계 수 · 판 0) */
function subCount(L: LessonPack, mid: string): number {
  const m = L.monsters[mid] as { first?: Question[]; chain?: { pool?: Question[][] } } | undefined;
  if (m?.chain?.pool?.[0]) return m.chain.pool[0].length;
  if (m?.chain) return 99; // 생성기 소레이드 = 단계 수를 미리 모름
  return m?.first?.length ?? 0;
}
