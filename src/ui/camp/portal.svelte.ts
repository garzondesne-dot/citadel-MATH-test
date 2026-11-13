// 🌀 게시판 포털 상태 (학생 캠프 · TV 교사 캠프 같은 규칙): 모집 글(wait) 있음 = recruit · 보고 있는 동안 팀이 출발(wait → play) = 4초 open · 그 밖 = idle
//   출발 시각 칸을 새로 만들지 않음(서버 규칙 그대로) → 글의 단계가 바뀌는 순간을 이 화면이 알아챔
import type { Store } from '../../model/types';
import { POSTS } from '../../board/team';
import { liveValue } from '../room.svelte';
type P = { phase?: string; mem?: unknown };
export function portalOf(S: Store) {
  const v = liveValue<Record<string, P>>(S, POSTS);
  const st = $state({ openUntil: 0, now: Date.now() });
  let prev: Record<string, string | undefined> = {};
  const t = setInterval(() => {
    const cur = Object.fromEntries(Object.entries(v.v.val || {}).map(([k, p]) => [k, p?.phase]));
    if (Object.entries(cur).some(([k, ph]) => ph === 'play' && prev[k] === 'wait')) st.openUntil = Date.now() + 4000;
    prev = cur; st.now = Date.now();
  }, 250);
  return {
    get phase(): 'idle' | 'recruit' | 'open' {
      if (st.now < st.openUntil) return 'open';
      return Object.values(v.v.val || {}).some((p) => p && p.mem && p.phase === 'wait') ? 'recruit' : 'idle';
    },
    /** 시험 · 미리 보기: 포털을 지금 열어 봄 */
    burst() { st.openUntil = Date.now() + 4000; st.now = Date.now(); },
    stop() { clearInterval(t); v.stop(); },
  };
}
