import type { Format } from '../../model/subject';
import type { Given } from '../../model/types';
import { allSubsets, key } from './sets';
import SubsetBuilder from './ui/SubsetBuilder.svelte';

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
};
