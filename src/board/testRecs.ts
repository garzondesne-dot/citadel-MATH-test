// 🧪 #86 테스트 계정 게시판 ⭐ (📜 선생님 「클리어해도 균열의 별이 차오르지 않음」 · CLAUDE.md 「🧪 테스트 모드 = 학생과 같은 과정」)
//   🧪 테스트 반(1-6) · 교사 계정 = 판 기록 · ⭐ 최고 별을 서버 대신 이 기기(테스트 저장소)에 → 지도 칸 · 「새 별 +n」 · ⭐3 반값이 학생처럼 · 반 공적 · 💎 · 운영 서버 기록 = 그대로 안 남김
const K = (who: string) => `citadel-v1-test-board:${who}`;
export interface TestBoard { recs: Record<string, Record<string, unknown>>; star: Record<string, number> }
export const testWho = (cls: string, num: number) => (cls && num ? `${cls}_${num}` : 'teacher');
export function testLoad(who: string): TestBoard {
  try { const x = JSON.parse(localStorage.getItem(K(who)) || 'null'); if (x && typeof x === 'object') return { recs: x.recs || {}, star: x.star || {} }; } catch { /* 저장 칸 막힘 */ }
  return { recs: {}, star: {} };
}
export const testStar = (who: string, lid: string) => Math.max(0, Math.min(3, Number(testLoad(who).star[lid]) || 0));
/** 판 하나 기록 · 최고 별 → 새로 얻은 별 수 */
export function testSaveRun(who: string, key: string, rec: Record<string, unknown> & { lid: string; stars: number }): number {
  const d = testLoad(who), was = Math.max(0, Math.min(3, Number(d.star[rec.lid]) || 0)), st = Math.max(0, Math.min(3, rec.stars | 0));
  d.recs[key] = rec; if (st > was) d.star[rec.lid] = st;
  const keys = Object.keys(d.recs).sort((a, b) => Number(d.recs[a]!.at) - Number(d.recs[b]!.at)); for (const k of keys.slice(0, Math.max(0, keys.length - 200))) delete d.recs[k]; // 200판까지
  try { localStorage.setItem(K(who), JSON.stringify(d)); } catch { /* */ }
  return Math.max(0, st - was);
}
