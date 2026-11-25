// 💡 실마리 말풍선 (📜 2026-11-25 머리 🔨 · DECISIONS a9ef715 · 💡 계속 = 선생님 11/25 저녁)
//   같은 소문제(소레이드 = 같은 단계)를 2번 틀리면 💡 단추가 빛나며 「막히면 눌러 봐」 말풍선
//   학생이 💡(힌트 · 도움)를 한 번이라도 누르면 그 기기에서는 다시 안 띄움(이미 아는 학생)
//   레이드 · 허수아비 · 성채 · 게시판 = 같은 부품(MonsterForm · ChainView) · 🧪 테스트 · 체험판도 같은 길
export const NUDGE_AT = 2;
const KEY = 'citadel-hint-used';

/** 이 기기에서 💡 를 써 본 적 있나 */
export function hintUsed(): boolean { try { return !!localStorage.getItem(KEY); } catch { return false; } }
/** 💡 를 눌렀음 = 다음부터 말풍선 없음 */
export function markHintUsed(): void { try { localStorage.setItem(KEY, '1'); } catch { /* 저장 못 해도 화면은 그대로 */ } }

/** 일반 몬스터: 소문제 i 를 틀린 횟수 (낸 차례마다 그 칸이 ✘) */
export function wrongTimes(tries: { marks?: boolean[] }[], i: number): number {
  return tries.reduce((a, t) => a + (Array.isArray(t.marks) && t.marks[i] === false ? 1 : 0), 0);
}

/** 말풍선을 띄울까 */
export const nudgeOn = (wrong: number, used: boolean) => !used && wrong >= NUDGE_AT;
