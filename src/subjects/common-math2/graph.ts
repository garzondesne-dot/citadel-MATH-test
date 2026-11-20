// 📈 그래프 그림 (📜 2026-11-20 머리 🔨 함수 단원 · 14차시~ · 기하 단원 낱말 더함) — 팩 글 → 그릴 것 (그림 파일 없음 · 코드가 SVG 로)
//   보기 'graph:<그림 글>' · 문제 글 안 '[[graph:<그림 글>]]'
//   그림 글 = 낱말 여러 개를 ; 로 · 끝에 @x1,x2,y1,y2 (없으면 @-5,5,-5,5) · 끝에 # (또는 nums) = 눈금 숫자
//     y=식 (x 의 식) · x=식 (y 의 식) · 뒤에 정의역 [a,b] (a,b) [a,b) (a,b] = 끝점 ● / ○ · 앞에 -- = 점선
//     x^2+y^2=4 처럼 x · y 가 섞인 식 = 그 곡선
//     pts (1,1) A(2,3) = 점(이름 붙일 수 있음) · circle (0,0) 2 = 원
//     seg (0,0) (3,4) = 선분 · poly A(0,0) B(4,0) C(0,3) = 닫힌 다각형 · arrow (1,1) (3,2) = 이동 화살표
//     y>2x-1 · y<=x^2 · x^2+y^2<4 = 부등식 영역 옅은 색칠(겹친 곳 진하게) · 경계 = 등호 있으면 실선 · 없으면 점선
//   식 = + − × ÷ * / ^ ( ) |x| sqrt( ) √( ) · 곱 생략(2x · 3(x+1) · x(x−1) · 2xy) · eval 없음(직접 읽음)

export type Fn = (v: number) => number;
export type Fn2 = (x: number, y: number) => number;
export type Dom = { a: number; b: number; ca: boolean; cb: boolean };
export type Pt = { at: [number, number]; name?: string };
export type Plot =
  | { kind: 'fn'; v: 'x' | 'y'; f: Fn; src: string; dom?: Dom; dash: boolean }
  | { kind: 'pts'; pts: [number, number][]; names?: (string | undefined)[]; dash: boolean }
  | { kind: 'circle'; c: [number, number]; r: number; dash: boolean }
  | { kind: 'seg'; pts: Pt[]; dash: boolean }
  | { kind: 'poly'; pts: Pt[]; dash: boolean }
  | { kind: 'arrow'; pts: Pt[]; dash: boolean }
  | { kind: 'curve'; g: Fn2; src: string; dash: boolean }
  | { kind: 'ineq'; g: Fn2; op: '<' | '<=' | '>' | '>='; src: string; dash: boolean };
export interface GraphSpec { plots: Plot[]; win: [number, number, number, number]; nums: boolean; src: string }
export const WIN: [number, number, number, number] = [-5, 5, -5, 5];

// ── 식 읽기 (재귀 하강) ──
type Tok = { t: 'num'; v: number } | { t: 'var'; v: 'x' | 'y' } | { t: 'op'; v: string } | { t: 'fn'; v: 'sqrt' };
const norm = (s: string) => s.replace(/[−–—]/g, '-').replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/\s+/g, '');
function lex(s0: string, vars: string): Tok[] {
  const s = norm(s0), out: Tok[] = [];
  for (let i = 0; i < s.length;) {
    const c = s[i]!;
    if (/[0-9.]/.test(c)) { const m = /^\d*\.?\d+|^\d+\.?/.exec(s.slice(i))!; out.push({ t: 'num', v: Number(m[0]) }); i += m[0].length; continue; }
    if (s.startsWith('sqrt', i)) { out.push({ t: 'fn', v: 'sqrt' }); i += 4; continue; }
    if (c === '√') { out.push({ t: 'fn', v: 'sqrt' }); i++; continue; }
    if (vars.includes(c) && (c === 'x' || c === 'y')) { out.push({ t: 'var', v: c }); i++; continue; }
    if ('+-*/^()|'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    throw new Error(`식에 읽을 수 없는 글자 「${c}」`);
  }
  return out;
}
/** x · y 식 → (x, y) 값 */
export function compile2(src: string, vars = 'xy'): Fn2 {
  const T = lex(src, vars); let i = 0, abs = 0;
  const peek = () => T[i], isOp = (v: string) => { const k = T[i]; return !!k && k.t === 'op' && k.v === v; };
  const eat = (v: string) => { if (!isOp(v)) throw new Error(`식에 「${v}」 가 빠졌어요`); i++; };
  const startsAtom = () => { const k = peek(); return !!k && (k.t === 'num' || k.t === 'var' || k.t === 'fn' || (k.t === 'op' && (k.v === '(' || (k.v === '|' && abs === 0)))); };
  function expr(): Fn2 { let f = term(); while (isOp('+') || isOp('-')) { const o = (T[i++] as { v: string }).v, a = f, b = term(); f = o === '+' ? (x, y) => a(x, y) + b(x, y) : (x, y) => a(x, y) - b(x, y); } return f; }
  function term(): Fn2 {
    let f = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) { const o = (T[i++] as { v: string }).v, a = f, b = unary(); f = o === '*' ? (x, y) => a(x, y) * b(x, y) : (x, y) => a(x, y) / b(x, y); continue; }
      if (startsAtom()) { const a = f, b = power(); f = (x, y) => a(x, y) * b(x, y); continue; } // 곱 생략
      return f;
    }
  }
  function unary(): Fn2 { if (isOp('-')) { i++; const a = unary(); return (x, y) => -a(x, y); } if (isOp('+')) { i++; return unary(); } return power(); }
  function power(): Fn2 { const a = atom(); if (isOp('^')) { i++; const b = unary(); return (x, y) => Math.pow(a(x, y), b(x, y)); } return a; }
  function atom(): Fn2 {
    const k = peek(); if (!k) throw new Error('식이 덜 끝났어요');
    if (k.t === 'num') { i++; const c = k.v; return () => c; }
    if (k.t === 'var') { i++; return k.v === 'x' ? (x) => x : (_x, y) => y; }
    if (k.t === 'fn') { i++; let a: Fn2; if (isOp('(')) { i++; a = expr(); eat(')'); } else a = power(); return (x, y) => Math.sqrt(a(x, y)); }
    if (isOp('(')) { i++; const e = expr(); eat(')'); return e; }
    if (isOp('|')) { i++; abs++; const e = expr(); abs--; eat('|'); return (x, y) => Math.abs(e(x, y)); }
    throw new Error(`식에 「${(k as { v?: string }).v ?? '?'}」 자리가 이상해요`);
  }
  const f = expr(); if (i < T.length) throw new Error('식 끝에 남은 글자가 있어요');
  return f;
}
/** 한 변수 식 (vn 만 씀) */
export function compile(src: string, vn: 'x' | 'y' = 'x'): Fn { const f = compile2(src, vn); return vn === 'x' ? (v) => f(v, 0) : (v) => f(0, v); }

// ── 그림 글 읽기 ──
const NUM = String.raw`[-−]?\d*\.?\d+`;
const NAME = String.raw`[A-Za-z가-힣][A-Za-z0-9']*`;
const PT = new RegExp(String.raw`(${NAME})?\s*\(\s*(${NUM})\s*,\s*(${NUM})\s*\)`, 'g');
const n = (s: string) => Number(s.replace('−', '-'));
const DOM = new RegExp(String.raw`\s([\[(])\s*(${NUM})\s*,\s*(${NUM})\s*([\])])\s*$`);
const ptsOf = (p: string): Pt[] => [...p.matchAll(PT)].map((m) => ({ at: [n(m[2]!), n(m[3]!)] as [number, number], ...(m[1] ? { name: m[1] } : {}) }));
/** 점 목록 낱말 (pts · seg · poly · arrow): 글이 점 꼴로만 이루어졌나 */
const onlyPts = (body: string) => body.replace(PT, '').trim() === '';
const INEQ = /^(.+?)(<=|>=|<|>)(.+)$/;
export function parseGraph(src: string): GraphSpec {
  let s = String(src).trim(), win = WIN, nums = false;
  const flag = /(?:^|[\s;])(#|nums)\s*$/.exec(s); if (flag) { nums = true; s = s.slice(0, flag.index).replace(/;\s*$/, '').trim(); }
  const w = /@\s*([^@;]+)$/.exec(s);
  if (w) { const v = w[1]!.split(',').map((x) => n(x.trim())); if (v.length !== 4 || v.some((x) => !Number.isFinite(x)) || v[0]! >= v[1]! || v[2]! >= v[3]!) throw new Error(`창 「@${w[1]}」 = @x1,x2,y1,y2 (작은 수 먼저)`); win = v as GraphSpec['win']; s = s.slice(0, w.index).replace(/;\s*$/, ''); }
  const plots = s.split(';').map((x) => x.trim()).filter(Boolean).map((p0): Plot => {
    const dash = p0.startsWith('--'), p = dash ? p0.slice(2).trim() : p0;
    const word = /^(pts|seg|poly|arrow)\b\s*(.*)$/.exec(p);
    if (word) {
      const [, k, body] = word, pts = ptsOf(body!), need = k === 'pts' ? 1 : k === 'poly' ? 3 : 2;
      if (!onlyPts(body!) || pts.length < need) throw new Error(`${k} 「${p}」 = ${k} ${k === 'poly' ? 'A(0,0) B(4,0) C(0,3)' : k === 'pts' ? '(1,2) A(3,4)' : '(0,0) (3,4)'} 꼴 · 점 ${need}개 이상`);
      if ((k === 'seg' || k === 'arrow') && pts.length !== 2) throw new Error(`${k} 「${p}」 = 점 2개`);
      if (k === 'pts') return { kind: 'pts', pts: pts.map((q) => q.at), ...(pts.some((q) => q.name) ? { names: pts.map((q) => q.name) } : {}), dash };
      return { kind: k as 'seg' | 'poly' | 'arrow', pts, dash };
    }
    if (/^circle\b/.test(p)) { const m = new RegExp(String.raw`^circle\s*\(\s*(${NUM})\s*,\s*(${NUM})\s*\)\s*(${NUM})$`).exec(p); if (!m || n(m[3]!) <= 0) throw new Error(`원 「${p}」 = circle (0,0) 2 꼴`); return { kind: 'circle', c: [n(m[1]!), n(m[2]!)], r: n(m[3]!), dash }; }
    const iq = INEQ.exec(norm(p));
    if (iq) { const l = compile2(iq[1]!), r = compile2(iq[3]!); return { kind: 'ineq', g: (x, y) => l(x, y) - r(x, y), op: iq[2] as '<' | '<=' | '>' | '>=', src: p, dash }; }
    const m = /^([xy])\s*=\s*(.+)$/.exec(p);
    if (m) {
      let body = m[2]!, dom: Dom | undefined;
      const d = DOM.exec(body);
      if (d) { const a = n(d[2]!), b = n(d[3]!); if (!(a < b)) throw new Error(`정의역 「${d[0].trim()}」 = 작은 수 먼저`); dom = { a, b, ca: d[1] === '[', cb: d[4] === ']' }; body = body.slice(0, d.index); }
      const v = m[1] === 'y' ? 'x' : 'y'; // y=식 → 식은 x 의 식
      const other = m[1] === 'y' ? 'y' : 'x';
      if (!norm(body).includes(other)) return { kind: 'fn', v, f: compile(body, v), src: `${m[1]}=${body.trim()}`, ...(dom ? { dom } : {}), dash };
    }
    const eq = /^([^=]+)=([^=]+)$/.exec(p);
    if (eq) { const l = compile2(eq[1]!), r = compile2(eq[2]!); return { kind: 'curve', g: (x, y) => l(x, y) - r(x, y), src: p, dash }; }
    throw new Error(`그래프 「${p}」 = y=식 · x=식 · 식=식 · 부등식 · pts · seg · poly · arrow · circle 중 하나`);
  });
  if (!plots.length) throw new Error('그래프가 하나도 없어요');
  return { plots, win, nums, src };
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
/** g(x, y) = 0 곡선 (사각 칸 나눠 찾기 · 선분 조각들) */
export function contour(g: Fn2, win: GraphSpec['win'], N = 96): [[number, number], [number, number]][] {
  const [x1, x2, y1, y2] = win, dx = (x2 - x1) / N, dy = (y2 - y1) / N, out: [[number, number], [number, number]][] = [];
  const V: number[][] = []; for (let i = 0; i <= N; i++) { V.push([]); for (let j = 0; j <= N; j++) V[i]!.push(g(x1 + i * dx, y1 + j * dy)); }
  const lerp = (a: number, b: number) => (Math.abs(a - b) < 1e-12 ? 0.5 : a / (a - b));
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const a = V[i]![j]!, b = V[i + 1]![j]!, c = V[i + 1]![j + 1]!, d = V[i]![j + 1]!;
    if (![a, b, c, d].every(Number.isFinite)) continue;
    const x = x1 + i * dx, y = y1 + j * dy, cross: [number, number][] = [];
    if ((a > 0) !== (b > 0)) cross.push([x + lerp(a, b) * dx, y]);
    if ((b > 0) !== (c > 0)) cross.push([x + dx, y + lerp(b, c) * dy]);
    if ((d > 0) !== (c > 0)) cross.push([x + lerp(d, c) * dx, y + dy]);
    if ((a > 0) !== (d > 0)) cross.push([x, y + lerp(a, d) * dy]);
    if (cross.length >= 2) out.push([cross[0]!, cross[1]!]);
    if (cross.length === 4) out.push([cross[2]!, cross[3]!]);
  }
  return out;
}
/** 곡선 조각 → 이어진 줄들 (점선이 조각마다 다시 시작하지 않게) */
export function chains(segs: [[number, number], [number, number]][]): [number, number][][] {
  const key = (p: [number, number]) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`, by = new Map<string, number[]>(), used = new Array(segs.length).fill(false), out: [number, number][][] = [];
  segs.forEach((s, i) => { for (const p of s) { const k = key(p); by.set(k, [...(by.get(k) || []), i]); } });
  const next = (p: [number, number]) => (by.get(key(p)) || []).find((i) => !used[i]);
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue; used[i] = true;
    const line: [number, number][] = [segs[i]![0], segs[i]![1]];
    for (const end of [1, 0]) { // 뒤로 · 앞으로 늘림
      for (;;) { const tip = end ? line[line.length - 1]! : line[0]!, j = next(tip); if (j == null) break; used[j] = true; const s = segs[j]!, o = key(s[0]) === key(tip) ? s[1] : s[0]; if (end) line.push(o); else line.unshift(o); }
    }
    out.push(line);
  }
  return out;
}
/** 부등식 영역 = 칸 줄마다 이어 붙인 직사각형 [x, y(아래), w, h] */
export function fillRects(p: Extract<Plot, { kind: 'ineq' }>, win: GraphSpec['win'], N = 80): [number, number, number, number][] {
  const [x1, x2, y1, y2] = win, dx = (x2 - x1) / N, dy = (y2 - y1) / N, out: [number, number, number, number][] = [];
  const ok = (v: number) => (p.op === '<' ? v < 0 : p.op === '<=' ? v <= 0 : p.op === '>' ? v > 0 : v >= 0);
  for (let j = 0; j < N; j++) {
    let start = -1; const y = y1 + (j + 0.5) * dy;
    for (let i = 0; i <= N; i++) {
      const on = i < N && ok(p.g(x1 + (i + 0.5) * dx, y));
      if (on && start < 0) start = i;
      if (!on && start >= 0) { out.push([x1 + start * dx, y1 + j * dy, (i - start) * dx, dy]); start = -1; }
    }
  }
  return out;
}
/** 눈금 간격 (창 너비 → 1 · 2 · 5 · 10 …) */
export function tickStep(a: number, b: number): number { const r = b - a; for (const s of [1, 2, 5, 10, 20, 50, 100]) if (r / s <= 12) return s; return 200; }
/** 이름표 자리 (점 오른쪽 위부터 · 다른 이름표 · 점과 겹치면 비켜 감) — 화면 좌표(px) 안에서 */
export function placeLabels(items: { at: [number, number]; text: string }[], avoid: [number, number][], box: [number, number, number, number], fs = 7, taken: [number, number, number, number][] = []): { x: number; y: number; text: string; anchor: 'start' | 'end' }[] {
  const tw = (t: string) => t.length * fs * 0.62 + 1, H = fs, placed: [number, number, number, number][] = [...taken]; // taken = 눈금 숫자 자리
  const hit = (r: [number, number, number, number]) => placed.some((q) => r[0] < q[0] + q[2] && q[0] < r[0] + r[2] && r[1] < q[1] + q[3] && q[1] < r[1] + r[3]) || avoid.some(([ax, ay]) => ax > r[0] - 2 && ax < r[0] + r[2] + 2 && ay > r[1] - 2 && ay < r[1] + r[3] + 2);
  const inBox = (r: [number, number, number, number]) => r[0] >= box[0] && r[1] >= box[1] && r[0] + r[2] <= box[2] && r[1] + r[3] <= box[3];
  const D = 3.2, tries: [number, number][] = [[D, -D], [-D, -D], [D, D], [-D, D], [D, 0], [-D, 0], [0, -D - 2], [0, D + 2], [D * 2, -D * 2], [-D * 2, D * 2]];
  return items.map(({ at: [px, py], text }) => {
    const w = tw(text);
    let best: [number, number, number, number] | null = null;
    for (const [ox, oy] of tries) {
      const x = ox >= 0 ? px + ox : px + ox - w, y = oy <= 0 ? py + oy - H : oy > 0 ? py + oy : py - H / 2, r: [number, number, number, number] = [ox === 0 ? px - w / 2 : x, y, w, H];
      if (inBox(r) && !hit(r)) { best = r; break; }
      if (!best && inBox(r)) best = r;
    }
    const r = best ?? [px + D, py - D - H, w, H]; placed.push(r);
    return { x: r[0], y: r[1] + H * 0.85, text, anchor: 'start' as const };
  });
}
/** 화면 읽기 · 접근성 한 줄 */
export function describe(s: GraphSpec): string {
  const P = (q: Pt) => `${q.name ?? ''}(${q.at.join(', ')})`;
  return s.plots.map((p) => {
    switch (p.kind) {
      case 'fn': return p.src;
      case 'pts': return `점 ${p.pts.map((q, k) => `${p.names?.[k] ?? ''}(${q.join(', ')})`).join(' ')}`;
      case 'circle': return `원 중심 (${p.c.join(', ')}) 반지름 ${p.r}`;
      case 'seg': return `선분 ${p.pts.every((q) => q.name) ? p.pts.map((q) => q.name).join('') : p.pts.map(P).join(' ')}`;
      case 'poly': return `다각형 ${p.pts.every((q) => q.name) ? p.pts.map((q) => q.name).join('') : p.pts.map(P).join(' ')}`;
      case 'arrow': return `이동 화살표 ${P(p.pts[0]!)} → ${P(p.pts[1]!)}`;
      case 'curve': return p.src;
      case 'ineq': return `영역 ${p.src}`;
    }
  }).join(', ') + (s.nums ? ' (눈금 숫자)' : '');
}
/** 글로만 보여 줄 때 (채점표 · 결과 목록) */
export const graphPlain = (src: string) => `[그래프: ${String(src).replace(/(?:^|[\s;])(#|nums)\s*$/, '').replace(/@[^;]*$/, '').split(';').map((x) => x.trim().replace(/^--\s*/, '')).filter(Boolean).join(', ')}]`;
