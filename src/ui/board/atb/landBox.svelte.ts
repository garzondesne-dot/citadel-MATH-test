// 📐 #118 게시판 가로 상자 비율 고정 (태블릿 · 접는 폰 펼침): 기준 판 844 × 390 을 가로 · 세로 같은 배율로 (최대 1.6배) · 남는 곳 = 어두운 띠 + 흐린 배경
//   켜짐 = 가로(돌린 화면이면 돌린 뒤) 비율이 2.16 : 1 보다 덜 길고 높이 480 이상 (가로 폰 = 높이 ≤ 430 이라 지금 그대로)
export const BOX = { w: 844, h: 390, max: 1.6, ratio: 2.16, minH: 480 } as const;
export const landBox = $state({ on: false, s: 1 });
/** 화면 (돌린 화면이면 돌린 뒤) 가로 · 세로 → 상자 켜짐 · 배율 */
export function boxOf(W: number, H: number): { on: boolean; s: number } {
  const on = W / H < BOX.ratio && H >= BOX.minH;
  return { on, s: on ? Math.min(W / BOX.w, H / BOX.h, BOX.max) : 1 };
}
