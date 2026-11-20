// 🟣 벤 다이어그램 (정식 DS.UI.venn · vshade · opt · rich · plain 옮김 · #132 2 · 4 · 5차시)
//   문제 글 안 [[venn:이름|원소]] = 그림 · 보기 'venn:이름|원소' = 그림 · 'vshade:영역' = 색칠 그림(A-B · B-A · AnB · AuB · Ac)
//   📈 (📜 2026-11-20 함수 단원) 문제 글 안 [[graph:그림 글]] · 보기 'graph:그림 글' = 좌표평면 그래프 (graph.ts)
import { graphError, graphPlain } from './graph';
export type Part = { text: string } | { venn: [string, string] } | { graph: string };
const GRAPH = String.raw`\[\[graph:((?:[^\]]|\](?!\]))*\]?)\]\]`; // 그림 글 안 정의역 [a,b] 의 ] 도 받음
const SPLIT = new RegExp(String.raw`(\[\[venn:[^|\]]*\|[^\]]*\]\]|${GRAPH.replace('(', '(?:')})`);
export const richParts = (s: string): Part[] => String(s).split(SPLIT).filter(Boolean).map((p) => { const m = /^\[\[venn:([^|\]]*)\|([^\]]*)\]\]$/.exec(p), g = new RegExp(`^${GRAPH}$`).exec(p); return m ? { venn: [m[1]!, m[2]!] as [string, string] } : g ? { graph: g[1]! } : { text: p }; });
export type Opt = { venn: [string, string] } | { shade: string } | { graph: string } | { text: string };
export const optOf = (o: string): Opt => { const v = /^vshade:(.+)$/.exec(o), m = /^venn:([^|]*)\|(.*)$/.exec(o), g = /^graph:(.+)$/.exec(o); return v ? { shade: v[1]! } : m ? { venn: [m[1]!, m[2]!] } : g ? { graph: g[1]! } : { text: o }; };
const SHADE: Record<string, string> = { 'A-B': 'A 만', 'B-A': 'B 만', AnB: 'A ∩ B', AuB: 'A ∪ B', Ac: 'A 바깥' };
/** 글로만 보여 줄 때 (채점표 · 결과 목록) — 정식 DS.UI.plain */
export const plain = (s: string) => String(s).replace(/^vshade:(.+)$/, (_, r: string) => `[그림: ${SHADE[r] ?? r} 색칠]`).replace(/^venn:([^|]*)\|(.*)$/, '[벤 다이어그램 $1: $2]').replace(/^graph:(.+)$/, (_, g: string) => graphPlain(g)).replace(/\[\[venn:([^|\]]*)\|([^\]]*)\]\]/g, '[벤 다이어그램 $1: $2] ').replace(new RegExp(GRAPH, 'g'), (_, g: string) => `${graphPlain(g)} `);
/** 📦 팩 검사: 글(문제 · 보기) 안 그래프 그림 글이 안 읽히면 이유 (없으면 null) */
export const figError = (s: string): string | null => {
  const t = String(s), all = [...(/^graph:(.+)$/.exec(t) ? [/^graph:(.+)$/.exec(t)![1]!] : []), ...[...t.matchAll(new RegExp(GRAPH, 'g'))].map((m) => m[1]!)];
  for (const g of all) { const e = graphError(g); if (e) return `그래프 그림 글 「${g}」 — ${e}`; }
  return null;
};
