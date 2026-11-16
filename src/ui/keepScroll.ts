// 📜 스크롤 지키기 (📜 2026-11-17 #2 「문제 보기 누르면 여전히 맨 위로」 · CLAUDE.md 「다시 그릴 때 사라지는 상태는 공용 함수 한 곳에서」)
//   학생 전투 화면 하나(Student.svelte 맨 바깥)에만 붙임 — 레이드 · 게시판 · 성채 · 허수아비 · 체험판 · 시연이 같이 씀
//   손가락으로 누른 뒤(드래그 아님) 0.8초 안에 화면이 저절로 크게 위로 튀면(다시 그림 · 높이 잠깐 줄어듦 · 포커스) = 누르기 전 자리로 되돌림
//   스크롤 칸 = 창(window) + 누른 곳에서 가장 가까운 스크롤 상자(게시판 · 성채 .run 판) 둘 다
const JUMP = 40, WIN = 800;
type Mark = { el: Element | null; y: number; wy: number; at: number };
const scroller = (n: Element | null): Element | null => { for (let e = n; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (/auto|scroll/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 2) return e; } return null; };
export function keepScroll(node: HTMLElement) {
  let m: Mark | null = null, moved = false, raf = 0;
  const down = (e: PointerEvent) => { moved = false; const el = scroller(e.target as Element); m = { el, y: el ? el.scrollTop : 0, wy: window.scrollY, at: performance.now() }; };
  const move = () => { moved = true; };
  const fix = () => {
    raf = 0; if (!m || moved || performance.now() - m.at > WIN) return;
    if (m.wy - window.scrollY > JUMP && window.scrollY < 8) window.scrollTo(0, m.wy);
    if (m.el && m.el.isConnected && m.y - m.el.scrollTop > JUMP && m.el.scrollTop < 8) m.el.scrollTop = m.y;
  };
  const onScroll = () => { if (m && !moved && !raf) raf = requestAnimationFrame(fix); };
  node.addEventListener('pointerdown', down, true); node.addEventListener('touchmove', move, { passive: true }); window.addEventListener('wheel', move, { passive: true }); window.addEventListener('keydown', move);
  window.addEventListener('scroll', onScroll, true);
  return { destroy() { node.removeEventListener('pointerdown', down, true); node.removeEventListener('touchmove', move); window.removeEventListener('wheel', move); window.removeEventListener('keydown', move); window.removeEventListener('scroll', onScroll, true); if (raf) cancelAnimationFrame(raf); } };
}
