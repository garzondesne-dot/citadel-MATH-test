// 🔄 돌린 화면 좌표 (📜 2026-11-20 요청 #8 「게시판 던전에서만 가로 · 폰 설정 안 건드리고」)
//   세로 폰(회전 잠금)에서 게시판 던전 = 화면 전체를 CSS 로 시계 방향 90° 돌려 가로로 그림(뿌리 요소에 data-rot90)
//   누르기 · 꾹 · 타이밍 바 = 브라우저가 돌린 모양 그대로 판정 → 손댈 것 없음
//   화면 좌표로 자리를 계산하는 곳(공격 연출 · 구슬 · 충격파)만 이 함수 하나로 「돌린 안쪽 좌표」를 씀 (돌리지 않았으면 getBoundingClientRect 그대로)
export const ROT_ATTR = 'data-rot90';
export interface Box { left: number; top: number; width: number; height: number; right: number; bottom: number }
/** 요소 상자 = 돌린 뿌리의 안쪽 좌표 (뿌리 = 화면 오른쪽 위가 안쪽 (0, 0) · 안쪽 x = 화면 아래쪽 · 안쪽 y = 화면 왼쪽) */
export function rectIn(el: Element): Box {
  const r = el.getBoundingClientRect(), root = el.closest(`[${ROT_ATTR}]`);
  if (!root) return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  const R = root.getBoundingClientRect(), left = r.top - R.top, top = R.right - r.right, width = r.height, height = r.width;
  return { left, top, width, height, right: left + width, bottom: top + height };
}
