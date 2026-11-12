import MIS_CODES from './mis-codes.json';

// 📝 세특 초안 = 생기부 낱말 (#127 · DECISIONS 「📝 세특 초안 = 생기부 낱말」 cf64373 = 원본 표)
//   정식 #126 js/raid/dash.js memoParts 를 같은 문장으로 옮김 (같은 기록 = 같은 초안 · tests/fixtures/memo126.json 로 비교)
//   대시보드 「세특 메모」 · 학생 시트 「📝 세특 초안」 · 엑셀 세특 시트가 이 함수 하나(seteukDraft)를 씀
//   순서 고정: 참여 → 이해 → 협력 · 지원 → 오류 수정 · 피드백 → 자기주도 → 성찰 · 문장 끝 -함 · -임 · -보임 · 본문 최대 6문장 · 500자 · 남는 문장 = 「더 보기」
//   기록에 없는 칭찬은 쓰지 않음(사실 · 횟수 · % 만)
export const MEMO_MAX = 6, MEMO_LEN = 500;
/** 쓰지 않는 낱말 (상수 하나 · 시험이 초안 전체에 0개인지 확인) */
export const SETEUK_BAN = ['레이드', '몬스터', '보스', '던전', '성채', '허수아비', '모루', '용사', '마정석', '서술 조각', '레벨', 'EXP', '콤보', '랭킹', '처치', '💎', '📜', '등수', 'Lv'] as const;
export const MIS: Record<string, { name: string; seteuk: string }> = MIS_CODES;
/** 세특에 쓰는 기록 (정식 build() 학생 꼴 중 필요한 칸) */
export interface SeteukIn {
  went: number; heldN?: number; conc?: Record<string, { name: string; ok: number; total: number }>; std?: Record<string, [number, number]>; boss?: number | null;
  hg?: number; fixed?: number; mis?: Record<string, [number, number]>; photoN?: number; photoRev?: number; hints?: number;
  tryEval?: number; trySet?: number; noteDone?: number; cards?: number; symN?: number; symt?: Record<string, Record<string, number>>; surveyed?: boolean;
}
const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
/** 오개념 가장 오래 남은 것부터 (정식 DS.Mis.top) */
export function misTop(acc: Record<string, [number, number]> | undefined, n = 1) {
  return Object.entries(acc || {}).filter(([c]) => MIS[c]).sort((x, y) => y[1][0] - y[1][1] - (x[1][0] - x[1][1]) || y[1][0] - x[1][0]).slice(0, n).map(([c, v]) => ({ code: c, ...(MIS[c] as { name: string; seteuk: string }), wrong: v[0], fixed: v[1] }));
}
const symCount = (s: SeteukIn) => s.symN ?? Object.values(s.symt || {}).reduce((a, by) => a + Object.values(by || {}).reduce((b, v) => b + (Number(v) || 0), 0), 0);

/** 세특 초안 → { main: 본문 한 문단, more: 더 보기 문장들 } · stdName = 성취기준 이름 찾기 */
export function seteukDraft(s: SeteukIn, stdName: (id: string) => string | null = () => null): { main: string; more: string[] } {
  if (!s || !s.went) return { main: '저장된 수업 기록이 없음.', more: [] };
  const S: [number, string][] = [];
  // ① 참여
  S.push([1, `모둠 협동학습 형태의 수학 수업(집합과 명제 단원) ${s.heldN}차시 중 ${s.went}차시에 참여함${s.went === s.heldN ? '(전 차시 참여)' : ''}`]);
  // ② 이해
  const cs = Object.values(s.conc || {}).filter((c) => c.total >= 2).map((c) => ({ ...c, p: pct(c.ok, c.total) }));
  const best = cs.filter((c) => c.p >= 80).sort((a, b) => b.p - a.p || b.total - a.total)[0];
  if (best) S.push([2, `'${best.name}' 개념에서 첫 시도 정답률 ${best.p}%로 정확한 이해를 보임`]);
  const good = Object.entries(s.std || {}).filter(([, v]) => v[1] >= 4 && pct(v[0], v[1]) >= 80).map(([id, v]) => ({ name: stdName(id), p: pct(v[0], v[1]) })).filter((x) => x.name).sort((a, b) => b.p - a.p);
  if (good.length) S.push([2, `${good.slice(0, 2).map((g) => `'${g.name}'`).join('과 ')} 성취기준에 안정적으로 도달함(첫 시도 정답률 ${good[0]!.p}%)`]);
  if (s.boss != null) S.push([2, `형성평가에서 평균 ${s.boss}%의 정답률을 보임`]);
  // ③ 협력 · 지원
  if (s.hg) S.push([3, '어려워하는 친구를 돕고 격려하는 모습을 보임']);
  S.push([3, '학급 공동의 목표를 위해 친구들과 협력하며 문제를 해결함']);
  // ④ 오류 수정 · 피드백
  if (s.fixed) S.push([4, `틀린 문제를 유사 문항으로 다시 풀며 오류를 스스로 바로잡음(${s.fixed}개)`]);
  const t = misTop(s.mis, 3).find((x) => x.fixed > 0);
  if (t) S.push([4, `초기에 ${t.seteuk}을(를) 혼동하였으나 재도전과 보충 학습을 통해 바로잡음`]);
  if (s.photoRev) S.push([4, `풀이 과정을 근거와 함께 서술하고 교사의 피드백을 반영하여 고쳐 씀(${s.photoRev}회)`]);
  else if (s.photoN) S.push([4, `풀이 과정을 근거와 함께 서술함(${s.photoN}회)`]);
  if (s.hints) S.push([4, '교사가 제시한 단서를 활용해 풀이를 보완함']);
  // ⑤ 자기주도
  if (s.tryEval) S.push([5, `수업 외 시간에 단원 평가 문항에 ${s.tryEval}회 도전하며 스스로 단원을 정리함`]);
  if (s.trySet) S.push([5, `배운 내용을 유사 문항으로 반복 연습함(${s.trySet}회)`]);
  if (s.noteDone) S.push([5, `오답을 다시 풀어 보완을 완료함(${s.noteDone}문항)`]);
  if (s.cards) S.push([5, `기호와 개념의 뜻을 연결하여 정리하는 활동을 ${s.cards}회 완료함`]);
  if (symCount(s)) S.push([5, '낯선 기호의 뜻을 스스로 찾아보며 학습함']);
  // ⑥ 성찰
  if (s.surveyed) S.push([6, '수업 후 배운 점과 어려웠던 점을 돌아보는 성찰에 참여함']);
  // 본문 = 단계마다 첫 문장부터 고르게(순서 그대로) · 6문장 · 500자 안 → 남는 문장 = 더 보기
  const pick = new Set<number>(), len = (ids: number[]) => ids.reduce((a, i) => a + (S[i] as [number, string])[1].length + 2, 0);
  for (let round = 0; round < 3 && pick.size < MEMO_MAX; round++) {
    const firstOf: Record<number, number> = {};
    S.forEach(([k], i) => { if (pick.has(i)) return; if (firstOf[k] == null) firstOf[k] = i; });
    for (const i of Object.values(firstOf).sort((a, b) => a - b)) { if (pick.size >= MEMO_MAX) break; if (len([...pick, i]) <= MEMO_LEN) pick.add(i); }
  }
  const main = S.map((_, i) => i).filter((i) => pick.has(i)).map((i) => (S[i] as [number, string])[1]);
  const more = S.map((_, i) => i).filter((i) => !pick.has(i)).map((i) => (S[i] as [number, string])[1]);
  return { main: main.join('. ') + '.', more: more.map((x) => x + '.') };
}
