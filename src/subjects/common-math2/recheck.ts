// 🧮 차시 팩 정답 재계산 (L1 · 📜 2026-11-14 · 머리 🔨 「자동 검사기 = 정답 재계산」) — 문제 글을 다시 풀 수 있는 것만 대조
//   ① 원소 나열: U · A · B · C · X = {…} (「1, 2, …, 7」 범위 포함) → 「T 의 원소를 모두 고르시오」 T = ∪ ∩ ᶜ − 괄호 식
//   ② n( ) 식: 두 집합(U · A · B)의 주어진 n( ) 값 → 「n(T) = ?」 (네 칸 벤 다이어그램 연립 · 값이 하나로 정해질 때만)
//   ③ 부분집합 개수: 「집합 {…} 의 부분집합의 개수」 = 2ⁿ
//   못 풀면 null (= 선생님 확인) · 엔진은 SUBJ.recheck 로만 부름 (#136 과목 낱말은 과목 팩 안에)
import type { Question } from '../../model/types';

type S = Set<string>;
const norm = (t: string) => t.replace(/\s+/g, ' ').replace(/[−–]/g, '-').trim();

/** 「{1, 2, …, 7}」 「{a, b}」 → 원소 글자 목록 */
function elems(body: string): string[] | null {
  const xs = body.split(',').map((x) => x.trim()).filter((x) => x !== '');
  const out: string[] = [];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i]!;
    if (/^(…|\.\.\.)$/.test(x)) { const a = Number(xs[i - 1]), b = Number(xs[i + 1]); if (!Number.isInteger(a) || !Number.isInteger(b) || b - a > 500) return null; for (let k = a + 1; k < b; k++) out.push(String(k)); continue; }
    if (!/^-?[0-9a-z∅]+$/i.test(x)) return null; // 조건제시법({x | …}) · 글 원소 = 다시 못 풂
    out.push(x);
  }
  return out;
}
/** 문제 글에서 「X = {…}」 정의 모으기 */
function defs(t: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const m of t.matchAll(/\b([UABCX])\s*=\s*\{([^{}]*)\}/g)) { const e = elems(m[2]!); if (e) out[m[1]!] = e; }
  return out;
}
/** 집합 식 계산 (∪ ∩ − ᶜ · 괄호) — 원소 = 글자 집합 */
function evalExpr(src: string, env: Record<string, S>, U: S): S | null {
  const flat = src.replace(/\s+/g, ''), tk = flat.match(/[UABCX]|[∪∩\-()]|ᶜ/g);
  if (!tk || tk.join('') !== flat) return null;
  let i = 0;
  const peek = () => tk[i], eat = () => tk[i++];
  const post = (s: S): S => { while (peek() === 'ᶜ') { eat(); s = new Set([...U].filter((x) => !s.has(x))); } return s; };
  function atom(): S | null {
    const t = eat();
    if (t === '(') { const v = expr(); if (eat() !== ')' || !v) return null; return post(v); }
    if (t && env[t]) return post(new Set(env[t]));
    return null;
  }
  function expr(): S | null {
    let a = atom(); if (!a) return null;
    while (peek() === '∪' || peek() === '∩' || peek() === '-') {
      const op = eat(), b = atom(); if (!b) return null;
      a = op === '∪' ? new Set([...a, ...b]) : op === '∩' ? new Set([...a].filter((x) => b.has(x))) : new Set([...a].filter((x) => !b.has(x)));
    }
    return a;
  }
  const v = expr();
  return v && i === tk.length ? v : null;
}

// ② 두 집합 n( ) — 칸 a = A만 · b = B만 · c = A∩B · d = 바깥
const REG: Record<string, S> = { a: new Set(['A']), b: new Set(['B']), c: new Set(['A', 'B']), d: new Set() };
function vecOf(expr: string): number[] | null {
  const U = new Set(Object.keys(REG));
  const env = { U, A: new Set(['a', 'c']), B: new Set(['b', 'c']) } as Record<string, S>;
  const v = evalExpr(expr, env, U);
  return v ? ['a', 'b', 'c', 'd'].map((k) => (v.has(k) ? 1 : 0)) : null;
}
/** 연립: rows · vals 로 target 이 하나로 정해지면 그 값 */
function solveFor(rows: number[][], vals: number[], target: number[]): number | null {
  const M = rows.map((r, k) => [...r, vals[k]!]), n = 4;
  let rk = 0; const piv: number[] = [];
  for (let col = 0; col < n && rk < M.length; col++) {
    let p = -1; for (let r = rk; r < M.length; r++) if (Math.abs(M[r]![col]!) > 1e-9) { p = r; break; }
    if (p < 0) continue;
    [M[rk], M[p]] = [M[p]!, M[rk]!];
    const pv = M[rk]![col]!; M[rk] = M[rk]!.map((x) => x / pv);
    for (let r = 0; r < M.length; r++) if (r !== rk) { const f = M[r]![col]!; if (f) M[r] = M[r]!.map((x, j) => x - f * M[rk]![j]!); }
    piv.push(col); rk++;
  }
  // target = Σ λ_k · row_k ? → 행 공간 안이면 값 = Σ λ_k · val_k
  let t = [...target, 0];
  piv.forEach((col, k) => { const f = t[col]!; if (f) t = t.map((x, j) => x - f * M[k]![j]!); });
  if (t.slice(0, n).some((x) => Math.abs(x) > 1e-9)) return null;
  const v = -t[n]!;
  return Math.abs(v - Math.round(v)) < 1e-9 ? Math.round(v) : null;
}
function nCount(t: string): number | null {
  const s = norm(t).replace(/ᶜ/g, 'ᶜ');
  const given = [...s.matchAll(/n\(([^=?]+?)\)\s*=\s*(\d+)/g)];
  const ask = /n\(([^=?]+?)\)\s*(?:=\s*\?|은\?|는\?|의 값|=\s*\(\s*\))/.exec(s) ?? /(?:^|\s)n\(([^=]+?)\)\s*$/.exec(s.replace(/[.?]\s*$/, ''));
  if (!given.length || !ask) return null;
  const rows: number[][] = [], vals: number[] = [];
  for (const g of given) { const v = vecOf(g[1]!.replace(/\s+/g, '')); if (!v) return null; rows.push(v); vals.push(Number(g[2])); }
  const tv = vecOf(ask[1]!.replace(/\s+/g, '')); if (!tv) return null;
  return solveFor(rows, vals, tv);
}

export type Recheck = { ok: boolean | null; want?: string };
/** 문항 하나 다시 풀기 — ok = 맞음 · 틀림 · null(다시 못 풂 · 선생님 확인) */
export function recheck(q: Question): Recheck {
  const t = norm(q.question || '');
  if (q.type === 'multi') {
    const m = /(?:^|\s)(\(?[UABCX ∪∩\-()ᶜ]+\)?ᶜ?)\s*의 원소를 모두/.exec(t), d = defs(t);
    if (!m || !Object.keys(d).length || (!d.U && /ᶜ/.test(m[1]!))) return { ok: null };
    const U = new Set(d.U ?? Object.values(d).flat()), env: Record<string, S> = { U }; for (const [k, v] of Object.entries(d)) env[k] = new Set(v);
    const v = evalExpr(m[1]!.trim(), env, U); if (!v) return { ok: null };
    const picked = new Set(q.answer.map((i) => q.options[i]!.trim())), want = [...v].sort((a, b) => Number(a) - Number(b));
    if (want.some((x) => !q.options.some((o) => o.trim() === x))) return { ok: false, want: `{${want.join(', ')}} · 보기에 없는 원소` };
    const ok = picked.size === v.size && [...v].every((x) => picked.has(x));
    return { ok, want: `{${want.join(', ')}}` };
  }
  if (q.type === 'number') {
    const sub = /집합\s*\{([^{}]*)\}\s*의 부분집합의 개수/.exec(t);
    if (sub && !/반드시|않는|진부분/.test(t)) { const e = elems(sub[1]!); if (e) { const w = 2 ** e.length; return { ok: w === q.answer, want: String(w) }; } }
    const w = nCount(t);
    return w == null ? { ok: null } : { ok: w === q.answer, want: String(w) };
  }
  return { ok: null };
}
