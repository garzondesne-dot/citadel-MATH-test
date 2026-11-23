// ✔ 개념 체크 (📜 2026-11-15 선생님 · DECISIONS 「✔ 개념 체크」 · 머리 🔨)
//   개념 단계에서 리모컨 「✔ 개념 체크」를 누를 때만 · 학생 폰 = 팩 개념 단계 check { type: 'ox' | 'choice', q, ch?, a, why } 한 문제 · 30초(교사 일찍 닫기)
//   체력 · 성취 기준 · 데미지 · 보상 모두 없음 · 틀리면 바로 💡 도움 1단(그 개념 한 줄 = why) · 리모컨 = 맞힘 n / 인원 · 많이 고른 오답 · TV = 「준비 완료 n / 인원」만
//   답 = rooms/{코드}/ready/cc_{단계}/{나} = { a, ok, at } (학생 자기 칸 · 정찰 「준비 완료」와 같은 칸이라 규칙 바꿀 일 없음) · 기록 = 수업 끝 records … /cc/{단계} = 1 · 0 (대시보드 개념별 이해 참고 칸)
import type { ConceptCheck, Room, Store, Step } from '../model/types';

export const CC_SEC = 30;
const key = (id: string) => `cc_${id.replace(/[.#$/[\]]/g, '_')}`;
/** 지금 열려 있나 (그 단계 · 닫는 시각 전) */
export const ccOpen = (R: Room | null | undefined, step: Step | null | undefined, now: number) => !!(R?.state.cc && step && R.state.cc.id === step.id && now < R.state.cc.end);
/** 이 단계에서 체크를 연 적이 있나 (닫힌 뒤에도 결과를 보여 줌) */
export const ccRan = (R: Room | null | undefined, step: Step | null | undefined) => !!(R?.state.cc && step && R.state.cc.id === step.id);
/** 🐞 11/23 「아, 또 떴지」: 이 단계 체크가 이미 끝났으면 단추 = 「끝」 · 누르면 「다시?」(3초) · 한 번 더 눌러야 다시 열림 — 끝난 뒤 한 번 누름으로 새 30초가 열리던 것 */
export const CC_ARM_MS = 3000;
export function ccTap(S: Store, code: string, R: Room, step: Step, now: number, armAt: number): number {
  if (ccOpen(R, step, now)) { closeCC(S, code, R); return 0; }
  if (ccRan(R, step) && !(armAt && now - armAt < CC_ARM_MS)) return now; // 1번째 누름 = 「다시?」
  openCC(S, code, step.id); return 0;
}
export const ccLabel = (R: Room, step: Step | null | undefined, now: number, armAt: number) => (ccOpen(R, step, now) ? `닫기 ${Math.max(0, Math.ceil(((R.state.cc?.end ?? 0) - now) / 1000))}` : ccRan(R, step) ? (armAt && now - armAt < CC_ARM_MS ? '다시?' : '끝') : '체크');
export const openCC = (S: Store, code: string, id: string) => { const t = S.now(); S.set(`rooms/${code}/state/cc`, { id, at: t, end: t + CC_SEC * 1000 }); };
export const closeCC = (S: Store, code: string, R: Room) => { if (R.state.cc) S.set(`rooms/${code}/state/cc/end`, S.now()); };
export const gradeCC = (c: ConceptCheck, a: number | boolean) => (c.type === 'ox' ? a === c.a : Number(a) === Number(c.a));
/** 학생 답 (한 번만 · 다시 내도 처음 답 그대로) */
export function answerCC(S: Store, code: string, uid: string, step: Step, a: number | boolean): boolean | null {
  if (!step.check) return null;
  const p = `rooms/${code}/ready/${key(step.id)}/${uid}`, had = S.get<{ ok?: boolean }>(p);
  if (had) return !!had.ok;
  const ok = gradeCC(step.check, a); S.set(p, { a, ok, at: S.now() }); return ok;
}
export const myCC = (R: Room | null | undefined, step: Step, uid: string) => ((R?.ready?.[key(step.id)] as Record<string, { a?: number | boolean; ok?: boolean } | true> | undefined)?.[uid] ?? null) as { a?: number | boolean; ok?: boolean } | null;
/** 리모컨 · TV 집계: 낸 수 · 맞힘 · 많이 고른 오답(보기 글자 · 수) */
export function ccStats(R: Room | null | undefined, step: Step): { n: number; ok: number; wrong: { label: string; n: number }[] } {
  const all = Object.values((R?.ready?.[key(step.id)] || {}) as Record<string, { a?: number | boolean; ok?: boolean } | true>).filter((x): x is { a?: number | boolean; ok?: boolean } => !!x && typeof x === 'object');
  const c = step.check, lab = (a: number | boolean | undefined) => (c?.type === 'ox' ? (a ? 'O' : 'X') : c?.ch?.[Number(a)] ?? String(a));
  const w: Record<string, number> = {}; for (const x of all) if (!x.ok) { const l = lab(x.a); w[l] = (w[l] || 0) + 1; }
  return { n: all.length, ok: all.filter((x) => x.ok).length, wrong: Object.entries(w).map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n) };
}
/** 수업 끝 기록 (records … /cc) = { 단계: 1(맞힘) | 0(틀림) } · 안 낸 단계는 없음 */
export function ccRecord(R: Room, steps: Step[], uid: string): Record<string, number> {
  const o: Record<string, number> = {};
  for (const s of steps) { if (!s.check) continue; const m = myCC(R, s, uid); if (m && typeof m.ok === 'boolean') o[s.id] = m.ok ? 1 : 0; }
  return o;
}
