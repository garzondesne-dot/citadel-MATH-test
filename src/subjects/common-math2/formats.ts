import type { Format } from '../../model/subject';
import type { Given } from '../../model/types';
import { allSubsets, key } from './sets';
import SubsetBuilder from './ui/SubsetBuilder.svelte';
import MatchArrows from './ui/MatchArrows.svelte';
import { botMatch, gradeMatch, matchFromPack, pairsOf, penMatch } from './match';

// 공통수학2 고유 문항 꼴 (엔진 기본 꼴 밖) — 「부분집합 모두 쓰기」 (#99 ③ · 정식 DS.Quiz subsets)
export const FORMATS: Record<string, Format> = {
  subsets: {
    grade: (q, g) => {
      if (q.type !== 'subsets') return false;
      const a = (g as number[][]) || [], want = new Set(allSubsets(q.base).map(key)), got = new Set(a.map(key));
      return got.size === a.length && got.size === want.size && [...want].every((k) => got.has(k));
    },
    pen: (_q, g) => { const a = g as number[][] | null; if (!a || !a.length) return null; return a.map((s) => (s.length ? `{${s.join(', ')}}` : '∅')).join(', '); },
    empty: (): Given => [],
    norm: (g) => (Array.isArray(g) && (g as unknown[]).every((x) => Array.isArray(x)) ? g : []),
    filled: (g) => Array.isArray(g) && g.length > 0,
    Widget: SubsetBuilder,
  },
  // 🏹 대응 화살표 잇기 (📜 2026-11-20 함수 단원 · match.ts) — 답 = [X번, Y번][] · 정답 한 벌(alts 포함)과 화살표 집합이 같으면 맞음
  match: {
    grade: gradeMatch,
    pen: penMatch,
    empty: (): Given => [],
    norm: (g) => pairsOf(g),
    filled: (g) => pairsOf(g).length > 0,
    answer: (q) => (q.type === 'match' ? pairsOf(q.answer) : []),
    bot: botMatch,
    fromPack: matchFromPack,
    Widget: MatchArrows,
  },
};
