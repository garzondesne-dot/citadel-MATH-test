// 🥚 이스터에그 8개 (📜 #74 · DECISIONS 「🥚 이스터에그 8개 확정」 2026-11-18)
//   보상 = 칭호 + 🥚 비밀 도감 칸만(💎 · 📜 없음) · 캠프 · 첫 화면 · 허수아비에서만(수업 레이드 · TV 안 일어남)
//   찾음 기록 = 학생마다 bonus/{반}/{번호}/egg/{id} = 시각 (묶이지 않음 = 이 기기 me.seen egg-{id}) · 한 번 찾은 것도 다시 하면 연출은 다시 · 칭호는 한 번
//   힌트: 1 · 2 · 3 = 수수께끼 · 교사 「힌트 한 단계 더」(school/eggHint/{반} = 1) · 4 ~ 8 = 「??? 우연히 찾게 돼요」
export interface Egg { id: string; no: number; ic: string; name: string; title: string; how: string; hint?: string; hint2?: string }
export const EGGS: Egg[] = [
  { id: 'e1', no: 1, ic: '🔢', name: '일사일사 이일삼오육', title: 'egg_root2', how: '🚪 코드 칸에 1414', hint: '√2를 외울 때 부르는 그 주문, 앞 네 자리를 문에 말해 봐 (일사일사…)', hint2: '1.414…' },
  { id: 'e2', no: 2, ic: '💯', name: '참 잘했어요', title: 'egg_100', how: '🚪 코드 칸에 100', hint: '시험에서 가장 받고 싶은 점수를 문에 말해 봐', hint2: '세 자리 숫자' },
  { id: 'e3', no: 3, ic: '🌙', name: '원주율의 달', title: 'egg_pi', how: '오후 3:14 · 1:59 에 달 누르기', hint: '원주율의 첫 자리들이 시계에 뜨는 순간, 달을 봐', hint2: '오후 3시 14분' },
  { id: 'e4', no: 4, ic: '🔥', name: '피보나치 불꽃', title: 'egg_fib', how: '모닥불 8번 연달아' },
  { id: 'e5', no: 5, ic: '🪵', name: '넷이 둘러앉기', title: 'egg_round', how: '그루터기 4개 시계 방향 차례로' },
  { id: 'e6', no: 6, ic: '🍄', name: '빛 버섯 별자리', title: 'egg_inf', how: '빛나는 버섯 모두 누르기' },
  { id: 'e7', no: 7, ic: '🎯', name: '허수아비의 친구', title: 'dummyfriend', how: '복습 100판' },
  { id: 'e8', no: 8, ic: '🎬', name: '만든 이 크레딧', title: 'egg_credit', how: '첫 화면 「만든 이」 5번' },
];
export const eggOf = (id: string) => EGGS.find((e) => e.id === id);
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
/** 찾은 달걀 (bonus 한 학생 칸) */
export const eggsFound = (bonus: unknown): string[] => { const e = isObj(bonus) && isObj(bonus.egg) ? bonus.egg : {}; return EGGS.filter((x) => e[x.id]).map((x) => x.id); };
/** 수수께끼 힌트 (못 찾은 칸) · lv 1 = 한 단계 더 */
export const eggHint = (e: Egg, lv: number): string => (e.hint ? (lv >= 1 && e.hint2 ? `${e.hint} · 💡 ${e.hint2}` : e.hint) : '??? 우연히 찾게 돼요');
/** 🌙 원주율의 달: KST 오후 3:14 또는 1:59 (그 1분) */
export function piMinute(now: number): boolean { const d = new Date(now + 9 * 3600e3), h = d.getUTCHours(), m = d.getUTCMinutes(); return (h === 15 && m === 14) || (h === 13 && m === 59); }
/** 🔥 피보나치 불꽃: 2초 안 간격으로 8번 연달아 */
export function fibTap(times: number[], now: number): { taps: number[]; hit: boolean } {
  const t = [...times.filter((x) => now - x < 60e3), now]; let run = 1;
  for (let i = t.length - 1; i > 0 && t[i]! - t[i - 1]! < 2000; i--) run++;
  const taps = t.slice(-run);
  return run >= 8 ? { taps: [], hit: true } : { taps, hit: false };
}
/** 🪵 넷이 둘러앉기: 그루터기 0 → 1 → 2 → 3 (시계 방향 · 어디서 시작해도) 차례로 */
export function stumpStep(seq: number[], k: number): { seq: number[]; hit: boolean } {
  const s = seq.length && (seq[seq.length - 1]! + 1) % 4 === k ? [...seq, k] : [k];
  return s.length >= 4 ? { seq: [], hit: true } : { seq: s, hit: false };
}
