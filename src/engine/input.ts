import { SUBJ } from './subject';
const plain = (t: string) => (SUBJ.rich ? SUBJ.rich.plain(t) : t);
/** 과목 고유 꼴 (SUBJ.formats · #136) */
const fmt = (q: Question) => SUBJ.formats[q.type];
import type { Given, Question } from '../model/types';

// 답 칸 계산 (화면과 분리 · 시험에서 그대로 씀)

/** ⌨ 룬 키패드 (정식 DS.UI.runeNext #92 · #97): 지금 값 + 누른 룬 → 새 값 (null = 비어 있음 · '-' = − 만 누름)
 *  len = 자리 수(몬스터 2 = 0~99 · 문제 창 4) · 0 다음 숫자 = 바꿔 씀 · 자리 수 넘음 = 그대로 */
export function runeNext(cur: number | string | null | undefined, key: string, opt: { len?: number } = {}): number | '-' | null {
  const len = opt.len || 2, s0 = cur == null || cur === '' ? '' : String(cur), neg = s0.startsWith('-'), d = neg ? s0.slice(1) : s0;
  let nd = d, nn = neg;
  if (key === 'x') { if (d) nd = d.slice(0, -1); else nn = false; }
  else if (key === 'm') nn = !neg;
  else { if (d.length >= len && d !== '0') return cur == null || cur === '' ? null : (cur as number | '-'); nd = d === '0' ? String(key) : d + key; }
  if (!nd) return nn ? '-' : null;
  return Number((nn ? '-' : '') + nd);
}

/** 🔘 칩 (정식 DS.Quiz.chipToggle · P8): ∅ 단추(q.empty)와 다른 칩은 같은 칸 안에서 서로 지움 */
export function chipToggle(q: Extract<Question, { type: 'multi' }>, given: number[] | null | undefined, n: number): number[] {
  const s = new Set(given || []), E = new Set(q.empty || []);
  const span = (k: number): [number, number] => { if (!q.groups || !q.groups.length) return [0, q.options.length]; let b0 = 0; for (const g of q.groups) { if (k < b0 + g.n) return [b0, b0 + g.n]; b0 += g.n; } return [0, q.options.length]; };
  if (s.has(n)) s.delete(n);
  else { const [a, b] = span(n); if (E.has(n)) { for (let k = a; k < b; k++) s.delete(k); } else { for (let k = a; k < b; k++) if (E.has(k)) s.delete(k); } s.add(n); }
  return [...s].sort((a, b) => a - b);
}

/** 빈 답 (정식: 숫자 칸 = null · 고르기 = [] · 글 = '' · 과목 꼴 = 그 꼴이 정함) */
export const emptyOf = (q: Question): Given => (fmt(q) ? fmt(q)!.empty() : q.type === 'multi' ? [] : q.type === 'text' ? '' : null);
/** 그 꼴에 맞는 답만 통과 (문항이 바뀌는 순간 앞 문항의 답이 새 칸에 들어가 깨지지 않게) */
export function normFor(q: Question, g: Given): Given {
  const f = fmt(q); if (f) return f.norm(g);
  switch (q.type) {
    case 'multi': return Array.isArray(g) && g.every((x) => typeof x === 'number') ? g : [];
    case 'choice': return typeof g === 'number' && g >= 0 && g < q.choices.length ? g : null;
    case 'ox': return typeof g === 'boolean' ? g : null;
    case 'number': return typeof g === 'number' || g === '-' ? g : null;
    case 'blanks': return Array.isArray(g) && typeof g[0] === 'string' ? g : null;
    case 'text': return typeof g === 'string' ? g : '';
    default: return null;
  }
}
/** 다 채웠나 (빈 칸 내기 막음) */
export function filled(q: Question, g0: Given): boolean {
  const g = normFor(q, g0);
  const f = fmt(q); if (f) return f.filled(g);
  if (q.type === 'multi') return Array.isArray(g) && g.length > 0;
  if (q.type === 'text') return String(g ?? '').trim() !== '';
  if (q.type === 'number') return g != null && g !== '-' && g !== '';
  if (q.type === 'blanks') return Array.isArray(g) && g[0] != null;
  return g != null;
}
/** 내기 직전 모양 (숫자 칸 = Number) */
export const finalOf = (q: Question, g: Given): Given => { const v = normFor(q, g); return q.type === 'number' ? Number(v) : v; };
/** 숫자 답에 − 룬이 필요한가 (정식 #97: 음수 답만) */
export const needNeg = (q: Question) => q.type === 'number' && q.answer < 0;

const NO_RE = /^\s*(\([^)]*\)|\d+-\(\d+\)|문제 \d+ \(\d+\)|문제 \d+\)|\d+\.)\s*/;
/** ✍ 나의 답 한 줄 (정식 penLine) — 아직 안 골랐으면 null */
export function penLine(q: Question, g: Given, i: number): string | null {
  const no = (NO_RE.exec(q.question || '') || [])[1]?.trim() || `(${i + 1})`;
  let v = '';
  if (q.type === 'multi') {
    const arr = (g as number[]) || []; if (!arr.length) return null;
    const pick = (ks: number[]) => { const o = ks.map((k) => q.options[k] as string); return o.some((x) => /^∅/.test(x)) ? '∅' : `{${o.join(', ')}}`; };
    if (q.groups && q.groups.length) { let b0 = 0; v = q.groups.map((gr) => { const ks = arr.filter((k) => k >= b0 && k < b0 + gr.n); b0 += gr.n; return ks.length ? `${gr.label} → ${pick(ks)}` : ''; }).filter(Boolean).join(' · '); }
    else v = pick(arr);
  } else if (q.type === 'choice') { if (g == null) return null; v = plain(String(q.choices[g as number])); } // 그림 보기 = 글로 (#132 · SUBJ.rich)
  else if (q.type === 'ox') { if (g == null) return null; v = g ? 'O' : 'X'; }
  else if (q.type === 'blanks') { const a = g as string[] | null; if (!a || a[0] == null) return null; v = String(a[0]); }
  else if (q.type === 'text') { if (!String(g || '').trim()) return null; v = String(g).trim(); }
  else if (fmt(q)) { const t = fmt(q)!.pen(q, g); if (t == null) return null; v = t; }
  else { if (g == null || g === '-') return null; v = String(g).replace('-', '−'); }
  return `${no} ${v}`;
}
export const stripNo = (t: string) => t.replace(NO_RE, '');
