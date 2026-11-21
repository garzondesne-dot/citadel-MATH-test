// ⭐ 기호 톡 ↔ 모루 카드 (#129 · DECISIONS 「⭐ 기호 톡 ↔ 모루 연결 다시」) — 기호 톡 줄 id → 그 기호를 만드는 모루 카드
//   카드 id · 이름 · 수식 = 정식 lessons/unit-set.js 그대로 (집합 단원) · 짝이 없는 기호(U · 2ⁿ · n(A ∪ B))는 찜 단추 없음
import { UNIT } from './forge';
import MAP from './forge/symtalk-map.json';
export interface SymCard { id: string; name: string; fm: string; hint: string }
export const SYM_CARD: Record<string, SymCard> = {
  in: { id: 'belong', name: '속한다', fm: 'a ∈ A', hint: '원소가 집합 안에 쏙 들어간다' },
  notin: { id: 'notbelong', name: '속하지 않는다', fm: 'b ∉ A', hint: '원소가 집합 밖에 있다' },
  list: { id: 'roster', name: '원소나열법', fm: '{1, 2, 4, 8}', hint: '원소를 중괄호에 하나씩 넣어 보자' },
  build: { id: 'builder', name: '조건제시법', fm: '{x | x는 8의 약수}', hint: '성질(조건)을 중괄호에 담아 보자' },
  n: { id: 'count', name: '원소의 개수', fm: 'n(A)', hint: '집합에 n( ) 을 씌워 보자' },
  empty: { id: 'empty', name: '공집합', fm: '∅ , n(∅) = 0', hint: '원소가 하나도 없는 집합에 n( )' },
  sub: { id: 'subset', name: '부분집합', fm: 'A ⊂ B', hint: '두 집합 사이에 ⊂' },
  eq: { id: 'equal', name: '서로 같은 집합', fm: 'A = B', hint: '두 집합 사이에 =' },
  cap: { id: 'inter', name: '교집합', fm: 'A ∩ B', hint: '두 집합의 겹친 곳 ∩' },
  cup: { id: 'union', name: '합집합', fm: 'A ∪ B', hint: '두 집합을 합치는 ∪' },
  disj: { id: 'disjoint', name: '서로소', fm: 'A ∩ B = ∅', hint: '교집합 카드 = 공집합' },
  compl: { id: 'comp', name: '여집합', fm: 'Aᶜ = U − A', hint: '집합에 ᶜ 을 붙여 보자' },
  diff: { id: 'diff', name: '차집합', fm: 'A − B', hint: '두 집합 사이에 −' },
};
// 📜 #58 기호 톡 47줄 전부 = 「눌렀을 때 찜할 카드 하나」 (hero-v2 docs/handoff/forge-func/symtalk-map.json rowToCard · 집합 · 명제 34 + 함수 13) · 위 13줄은 문구 그대로 두고 나머지를 모루 카드에서 채움
for (const [row, id] of Object.entries((MAP as { rowToCard: Record<string, string> }).rowToCard)) {
  if (SYM_CARD[row]) continue;
  const c = UNIT.card(id); if (!c) continue;
  SYM_CARD[row] = { id: c.id, name: c.name, fm: c.mf || c.fm, hint: c.hint ?? '' };
}
/** 아직 안 만든 찜 수 (캠프 모루 이름표 ★n · 집합 + 함수 두 단원 합 · 같은 카드를 가리키는 줄 여럿 = 카드 하나로 셈) */
export const wishLeft = (wishes: Record<string, true> | undefined, made: Record<string, true> | undefined) => new Set(Object.keys(wishes || {}).map((sym) => SYM_CARD[sym]?.id).filter((id): id is string => !!id && !made?.[id])).size;
