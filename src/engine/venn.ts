// 🟣 벤 다이어그램 (정식 DS.UI.venn · vshade · opt · rich · plain 옮김 · #132 2 · 4 · 5차시)
//   문제 글 안 [[venn:이름|원소]] = 그림 · 보기 'venn:이름|원소' = 그림 · 'vshade:영역' = 색칠 그림(A-B · B-A · AnB · AuB · Ac)
export type Part = { text: string } | { venn: [string, string] };
export const richParts = (s: string): Part[] => String(s).split(/(\[\[venn:[^|\]]*\|[^\]]*\]\])/).filter(Boolean).map((p) => { const m = /^\[\[venn:([^|\]]*)\|([^\]]*)\]\]$/.exec(p); return m ? { venn: [m[1]!, m[2]!] as [string, string] } : { text: p }; });
export type Opt = { venn: [string, string] } | { shade: string } | { text: string };
export const optOf = (o: string): Opt => { const v = /^vshade:(.+)$/.exec(o), m = /^venn:([^|]*)\|(.*)$/.exec(o); return v ? { shade: v[1]! } : m ? { venn: [m[1]!, m[2]!] } : { text: o }; };
const SHADE: Record<string, string> = { 'A-B': 'A 만', 'B-A': 'B 만', AnB: 'A ∩ B', AuB: 'A ∪ B', Ac: 'A 바깥' };
/** 글로만 보여 줄 때 (채점표 · 결과 목록) — 정식 DS.UI.plain */
export const plain = (s: string) => String(s).replace(/^vshade:(.+)$/, (_, r: string) => `[그림: ${SHADE[r] ?? r} 색칠]`).replace(/^venn:([^|]*)\|(.*)$/, '[벤 다이어그램 $1: $2]').replace(/\[\[venn:([^|\]]*)\|([^\]]*)\]\]/g, '[벤 다이어그램 $1: $2] ');
