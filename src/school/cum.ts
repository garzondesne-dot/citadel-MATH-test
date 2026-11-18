// 💰 누적 받은 💎 · 📜 (📜 #65 · 2026-11-18 선생님 「이걸로 얼마나 열심히 하는지 가늠」 · 교사 화면만)
//   옛 정식(~2026-11-15 서버 옮김) = gem.earned · gem.scrollEarned (정식 gem.js 가 받을 때마다 더함 · 옮긴 뒤로 멈춤)
//   v1.0(옮긴 뒤) = ① gem log 의 받은 것(g > 0 · 강화 · 해금 · 선물 보냄 · 되팔기 · 되돌려줌 빼고) ② 받은 선물(gifts got: 선생님 · 쉼터 · 우편 · 석화 · 도장 · 진필살기 📜)
//                  ③ log 없이 하루 한도 안에서 받은 것(게시판 · 성채 · 11/18 전) = gem.day(11/16~) − 한도 안 log − 석화 선물 ④ 📜 성채 ✍ 실력 쓰기 = 성채 기록 ph2
//   빠질 수 있는 것(11/15 ~ 이 판 배포 전 · log 없고 한도 밖): 모루 첫 카드 💎 3 · 성채 업적(봉인) 💎 → 이 판부터 log 에 남김(card_ · seal_c_)
export const CUM_T0 = 1794700000000; // 2026-11-15 08:46 KST · 옛 정식 서버를 옮긴 뒤(옛 log 마지막 06:20 · v1.0 첫 log 11/16 00:18)
export const CUM_DAY0 = '2026-11-16'; // ③ 은 이 날부터(11/15 은 옛 · 새 섞임)
const NOT_EARN = /^(enh|buy|fs|sell|refund)/; // 쓴 것 · 보낸 것 · 되돌림
/** 하루 한도 안 log 키 (gem.day 에 이미 들어간 것) */
export const IN_CAP = /^(raid_|perfect_|bossperfect_|keychest_|bossre_|firstreview|review_|note_|rescue_|rescued_|keyp_|petri_|board_|croom_|cph_)/;
type Log = Record<string, { g?: number; s?: number; at?: number } | null | undefined>;
export interface GemRowC { earned?: number; scrollEarned?: number; day?: Record<string, number>; log?: Log }
type Gifts = Record<string, { g?: number; s?: number; at?: number; got?: boolean } | null | undefined>;
const num = (v: unknown) => Number(v) || 0;
const kst0 = (d: string) => Date.parse(`${d}T00:00:00+09:00`);
export function cumOf(row: GemRowC | null | undefined, gifts: Gifts | null | undefined, ph2 = 0): { gem: number; scroll: number } {
  const r = row || {}, log = Object.entries(r.log || {}).filter(([, x]) => x && num(x.at) > CUM_T0) as [string, { g?: number; s?: number; at?: number }][];
  const gl = Object.entries(gifts || {}).filter(([, x]) => x && x.got && num(x.at) > CUM_T0) as [string, { g?: number; s?: number; at?: number }][];
  const logG = log.filter(([k, x]) => num(x.g) > 0 && !NOT_EARN.test(k)).reduce((a, [, x]) => a + num(x.g), 0);
  const gifG = gl.reduce((a, [, x]) => a + Math.max(0, num(x.g)), 0);
  const t1 = kst0(CUM_DAY0);
  const dayV = Object.entries(r.day || {}).filter(([d]) => d >= CUM_DAY0).reduce((a, [, v]) => a + num(v), 0);
  const inLog = log.filter(([k, x]) => IN_CAP.test(k) && num(x.at) >= t1).reduce((a, [, x]) => a + Math.max(0, num(x.g)), 0);
  const petri = gl.filter(([k, x]) => k.startsWith('petri_') && num(x.at) >= t1).reduce((a, [, x]) => a + Math.max(0, num(x.g)), 0);
  const noLog = Math.max(0, dayV - inLog - petri);
  const logS = log.filter(([, x]) => num(x.s) > 0).reduce((a, [, x]) => a + num(x.s), 0);
  const gifS = gl.reduce((a, [, x]) => a + Math.max(0, num(x.s)), 0);
  return { gem: num(r.earned) + logG + gifG + noLog, scroll: num(r.scrollEarned) + logS + gifS + ph2 };
}
