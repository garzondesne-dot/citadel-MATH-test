// 📈 그래프 그림 (📜 2026-11-20 머리 🔨 함수 단원 · 14차시~) — 팩 글 → 그릴 선 (그림 파일 없음 · 코드가 SVG 로)
//   보기 'graph:<그림 글>' · 문제 글 안 '[[graph:<그림 글>]]'
//   그림 글 = 그래프 여러 개를 ; 로 · 끝에 @x1,x2,y1,y2 (없으면 @-5,5,-5,5)
//     y=식 (x 의 식) · x=식 (y 의 식) · 뒤에 정의역 [a,b] (a,b) [a,b) (a,b] = 끝점 ● / ○ · 앞에 -- = 점선
//     pts (1,1) (2,3) = 점만 · circle (0,0) 2 = 원
//   식 = + − × ÷ * / ^ ( ) |x| sqrt( ) √( ) · 곱 생략(2x · 3(x+1) · x(x−1)) · eval 없음(직접 읽음)

export type Fn = (v: number) => number;
export type Dom = { a: number; b: number; ca: boolean; cb: boolean };
export type Plot =
  | { kind: 'fn'; v: 'x' | 'y'; f: Fn; src: string; dom?: Dom; dash: boolean }
  | { kind: 'pts'; pts: [number, number][]; dash: boolean }
  | { kind: 'circle'; c: [number, number]; r: number; dash: boolean };
export interface GraphSpec { plots: Plot[]; win: [number, number, number, number]; src: string }
export const WIN: [number, number, number, number] = [-5, 5, -5, 5];

// ── 식 읽기 (재귀 하강) ──
type Tok = { t: 'num'; v: number } | { t: 'var' } | { t: 'op'; v: string } | { t: 'fn'; v: 'sqrt' };
function lex(s0: string, vn: string): Tok[] {
  const s = s0.replace(/[−–—]/g, '-').replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/\s+/g, ''), out: Tok[] = [];
  for (let i = 0; i < s.length;) {
    const c = s[i]!;
    if (/[0-9.]/.test(c)) { const m = /^\d*\.?\d+|^\d+\.?/.exec(s.slice(i))!; out.push({ t: 'num', v: Number(m[0]) }); i += m[0].length; continue; }
    if (s.startsWith('sqrt', i)) { out.push({ t: 'fn', v: 'sqrt' }); i += 4; continue; }
    if (c === '√') { out.push({ t: 'fn', v: 'sqrt' }); i++; continue; }
    if (c === vn) { out.push({ t: 'var' }); i++; continue; }
    if ('+-*/^()|'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    throw new Error(`식에 읽을 수 없는 글자 「${c}」`);
  }
  return out;
}
export function compile(src: string, vn: 'x' | 'y' = 'x'): Fn {
  const T = lex(src, vn); let i = 0, abs = 0;
  const peek = () => T[i], isOp = (v: string) => { const k = T[i]; return !!k && k.t === 'op' && k.v === v; };
  const eat = (v: string) => { if (!isOp(v)) throw new Error(`식에 「${v}」 가 빠졌어요`); i++; };
  const startsAtom = () => { const k = peek(); return !!k && (k.t === 'num' || k.t === 'var' || k.t === 'fn' || (k.t === 'op' && (k.v === '(' || (k.v === '|' && abs === 0)))); };
  function expr(): Fn { let f = term(); while (isOp('+') || isOp('-')) { const o = (T[i++] as { v: string }).v, a = f, b = term(); f = o === '+' ? (v) => a(v) + b(v) : (v) => a(v) - b(v); } return f; }
  function term(): Fn {
    let f = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) { const o = (T[i++] as { v: string }).v, a = f, b = unary(); f = o === '*' ? (v) => a(v) * b(v) : (v) => a(v) / b(v); continue; }
      if (startsAtom()) { const a = f, b = power(); f = (v) => a(v) * b(v); continue; } // 곱 생략
      return f;
    }
  }
  function unary(): Fn { if (isOp('-')) { i++; const a = unary(); return (v) => -a(v); } if (isOp('+')) { i++; return unary(); } return power(); }
  function power(): Fn { const a = atom(); if (isOp('^')) { i++; const b = unary(); return (v) => Math.pow(a(v), b(v)); } return a; }
  function atom(): Fn {
    const k = peek(); if (!k) throw new Error('식이 덜 끝났어요');
    if (k.t === 'num') { i++; const c = k.v; return () => c; }
    if (k.t === 'var') { i++; return (v) => v; }
    if (k.t === 'fn') { i++; let a: Fn; if (isOp('(')) { i++; a = expr(); eat(')'); } else a = power(); return (v) => Math.sqrt(a(v)); }
    if (isOp('(')) { i++; const e = expr(); eat(')'); return e; }
    if (isOp('|')) { i++; abs++; const e = expr(); abs--; eat('|'); return (v) => Math.abs(e(v)); }
    throw new Error(`식에 「${(k as { v?: string }).v ?? '?'}」 자리가 이상해요`);
  }
  const f = expr(); if (i < T.length) throw new Error('식 끝에 남은 글자가 있어요');
  return f;
}

// ── 그림 글 읽기 ──
const NUM = String.raw`[-−]?\d*\.?\d+`;
const PT = new RegExp(String.raw`\(\s*(${NUM})\s*,\s*(${NUM})\s*\)`, 'g');
const n = (s: string) => Number(s.replace('−', '-'));
const DOM = new RegExp(String.raw`\s([\[(])\s*(${NUM})\s*,\s*(${NUM})\s*([\])])\s*$`);
export function parseGraph(src: string): GraphSpec {
  let s = String(src).trim(), win = WIN;
  const w = /@\s*([^@;]+)$/.exec(s);
  if (w) { const v = w[1]!.split(',').map((x) => n(x.trim())); if (v.length !== 4 || v.some((x) => !Number.isFinite(x)) || v[0]! >= v[1]! || v[2]! >= v[3]!) throw new Error(`창 「@${w[1]}」 = @x1,x2,y1,y2 (작은 수 먼저)`); win = v as GraphSpec['win']; s = s.slice(0, w.index).replace(/;\s*$/, ''); }
  const plots = s.split(';').map((x) => x.trim()).filter(Boolean).map((p0): Plot => {
    const dash = p0.startsWith('--'), p = dash ? p0.slice(2).trim() : p0;
    if (/^pts\b/.test(p)) { const pts = [...p.matchAll(PT)].map((m) => [n(m[1]!), n(m[2]!)] as [number, number]); if (!pts.length) throw new Error(`점 「${p}」 = pts (1,2) (3,4) 꼴`); return { kind: 'pts', pts, dash }; }
    if (/^circle\b/.test(p)) { const m = new RegExp(String.raw`^circle\s*\(\s*(${NUM})\s*,\s*(${NUM})\s*\)\s*(${NUM})$`).exec(p); if (!m || n(m[3]!) <= 0) throw new Error(`원 「${p}」 = circle (0,0) 2 꼴`); return { kind: 'circle', c: [n(m[1]!), n(m[2]!)], r: n(m[3]!), dash }; }
    const m = /^([xy])\s*=\s*(.+)$/.exec(p); if (!m) throw new Error(`그래프 「${p}」 = y=식 · x=식 · pts … · circle … 중 하나`);
    let body = m[2]!, dom: Dom | undefined;
    const d = DOM.exec(body);
    if (d) { const a = n(d[2]!), b = n(d[3]!); if (!(a < b)) throw new Error(`정의역 「${d[0].trim()}」 = 작은 수 먼저`); dom = { a, b, ca: d[1] === '[', cb: d[4] === ']' }; body = body.slice(0, d.index); }
    const v = m[1] === 'y' ? 'x' : 'y'; // y=식 → 식은 x 의 식
    return { kind: 'fn', v, f: compile(body, v), src: `${m[1]}=${body.trim()}`, ...(dom ? { dom } : {}), dash };
  });
  if (!plots.length) throw new Error('그래프가 하나도 없어요');
  return { plots, win, src };
}
/** 검사용: 읽히면 null · 안 읽히면 이유 */
export const graphError = (src: string): string | null => { try { parseGraph(src); return null; } catch (e) { return (e as Error).message; } };

// ── 그릴 선 (좌표 = 수학 좌표 · 화면 변환은 그림 부품이) ──
export function samplePlot(p: Extract<Plot, { kind: 'fn' }>, win: GraphSpec['win'], N = 240): [number, number][][] {
  const [x1, x2, y1, y2] = win, [lo0, hi0] = p.v === 'x' ? [x1, x2] : [y1, y2], [olo, ohi] = p.v === 'x' ? [y1, y2] : [x1, x2], span = ohi - olo;
  const lo = Math.max(lo0, p.dom?.a ?? -Infinity), hi = Math.min(hi0, p.dom?.b ?? Infinity), segs: [number, number][][] = [];
  if (!(lo < hi)) return segs;
  let cur: [number, number][] = [], prev: number | null = null;
  for (let k = 0; k <= N; k++) {
    const t = lo + ((hi - lo) * k) / N, o = p.f(t), ok = Number.isFinite(o) && o > olo - span * 2 && o < ohi + span * 2;
    if (!ok || (prev != null && Math.abs(o - prev) > span)) { if (cur.length > 1) segs.push(cur); cur = []; prev = null; if (!ok) continue; } // 끊김 (1/x · √ 밖)
    cur.push(p.v === 'x' ? [t, o] : [o, t]); prev = o;
  }
  if (cur.length > 1) segs.push(cur);
  return segs;
}
/** 정의역 끝점 (● 닫힘 · ○ 열림 · 창 안 · 값이 있을 때만) */
export function endsOf(p: Extract<Plot, { kind: 'fn' }>): { at: [number, number]; closed: boolean }[] {
  if (!p.dom) return [];
  return ([[p.dom.a, p.dom.ca], [p.dom.b, p.dom.cb]] as [number, boolean][]).map(([t, closed]) => ({ t, o: p.f(t), closed })).filter((e) => Number.isFinite(e.o)).map((e) => ({ at: (p.v === 'x' ? [e.t, e.o] : [e.o, e.t]) as [number, number], closed: e.closed }));
}
/** 글로만 보여 줄 때 (채점표 · 결과 목록) */
export const graphPlain = (src: string) => `[그래프: ${String(src).replace(/@[^;]*$/, '').split(';').map((x) => x.trim().replace(/^--\s*/, '')).filter(Boolean).join(', ')}]`;
