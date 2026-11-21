// 🔤 조사 붙이기 (#70 · {기사단} 이(가) · 과(와) · 을(를) · 은(는) · 에게) — 마지막 글자 받침으로 고름 · 한글이 아니면 앞 것(이 · 과 · 을 · 은)
export type Josa = '이/가' | '과/와' | '을/를' | '은/는' | '이다/다';
export function josa(word: string, j: Josa): string {
  const w = String(word).trim(), c = w.charCodeAt(w.length - 1);
  const has = c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 !== 0 : true;
  const [a, b] = j.split('/') as [string, string];
  return `${w}${has ? a : b}`;
}
