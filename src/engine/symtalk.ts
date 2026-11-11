// 📖 기호 톡 — 정식 js/engine/symtalk.js (문구 원본 = hero-v2 docs/SYMBOL-TALK.md · 집합 단원 16줄 + 개념 톡) 을 그대로 옮김
//   pick(줄, 자리) = 문맥으로 기호 고르기 (A ∩ B = ∅ → 서로소 · n(A ∪ B) → 개수 공식 · Aᶜ → 여집합 …) · 명제 단원 낱말은 그 차시가 생길 때
export interface SymRow { id: string; sym: string; easy: string; def: string; memo: string }
export const ROWS: SymRow[] = [
  { id: 'in', sym: 'a ∈ A', easy: 'a 는 A 팀 소속!', def: '「a 는 집합 A 에 속한다」 · a 가 집합 A 의 원소일 때', memo: '∈ = 원소(element)의 e 를 바꾼 기호 · 왼쪽 = 원소, 오른쪽 = 집합' },
  { id: 'notin', sym: 'b ∉ A', easy: 'b 는 A 팀 소속이 아니다', def: '「b 는 집합 A 에 속하지 않는다」 · b 가 A 의 원소가 아닐 때', memo: '' },
  { id: 'list', sym: '{1, 2, 4, 8}', easy: '원소를 하나하나 다 적기 (원소나열법)', def: '집합에 속하는 모든 원소를 { } 안에 나열', memo: '순서는 상관없음 · 같은 원소는 한 번만' },
  { id: 'build', sym: '{x | 조건}', easy: '{ 누구 | 어떤 애들 } · 조건에 맞는 x 를 다 모은 것 (조건제시법)', def: '원소들이 갖는 공통된 성질을 조건으로 제시 · x = 원소를 대표하는 문자', memo: '| 는 「그중에서 이런 것」이라고 읽으면 쉬움' },
  { id: 'n', sym: 'n(A)', easy: 'A 안에 원소가 몇 개?', def: '유한집합 A 의 원소의 개수', memo: 'n = 개수(number)의 첫 글자 · 예 n({1, 2, 4, 8}) = 4' },
  { id: 'empty', sym: '∅', easy: '텅 빈 집합 (원소 0개)', def: '원소가 하나도 없는 집합 = 공집합', memo: 'n(∅) = 0 · {0} 은 0 이 들어 있으니 공집합 아님' },
  { id: 'sub', sym: 'A ⊂ B', easy: 'A 가 B 안에 쏙 들어간다 (A 의 원소는 모두 B 에도 있다)', def: 'A 의 모든 원소가 B 에 속할 때 A 는 B 의 부분집합 · 「A 는 B 에 포함된다」', memo: '자기 자신도 부분집합(A ⊂ A) · ∅ 은 모든 집합의 부분집합 · 원소 n 개 → 부분집합 2ⁿ 개' },
  { id: 'nsub', sym: 'A ⊄ B', easy: 'A 에 B 밖으로 삐져나온 원소가 있다', def: 'A 가 B 의 부분집합이 아닐 때', memo: '하나만 삐져나와도 ⊄' },
  { id: 'eq', sym: 'A = B', easy: '원소가 똑같은 두 집합', def: 'A ⊂ B 이고 B ⊂ A 일 때 서로 같다', memo: '순서가 달라도 같은 집합' },
  { id: 'cap', sym: 'A ∩ B', easy: 'A 와 B 가 겹친 곳 (둘 다 있는 원소)', def: 'A 에도 속하고 B 에도 속하는 모든 원소로 이루어진 집합 = 교집합', memo: '「그리고」 · 모양이 아래로 열린 ∩ = 좁아진다' },
  { id: 'cup', sym: 'A ∪ B', easy: 'A 와 B 를 합친 것 (겹친 건 한 번만)', def: 'A 에 속하거나 B 에 속하는 모든 원소로 이루어진 집합 = 합집합', memo: '「또는」 · 위로 열린 ∪ = 담는 그릇' },
  { id: 'disj', sym: 'A ∩ B = ∅', easy: 'A 와 B 는 하나도 안 겹친다 (서로소)', def: '공통인 원소가 하나도 없을 때 A 와 B 는 서로소', memo: '서로소면 n(A ∪ B) = n(A) + n(B)' },
  { id: 'ncup', sym: 'n(A ∪ B)', easy: '합친 개수 = 더하고, 겹친 만큼 한 번 빼기', def: 'n(A ∪ B) = n(A) + n(B) − n(A ∩ B)', memo: '겹친 곳을 두 번 세지 않게' },
  { id: 'U', sym: 'U', easy: '지금 다루는 원소 전부 (전체집합)', def: '부분집합을 생각할 때 처음의 집합', memo: 'U = universal set 의 첫 글자' },
  { id: 'compl', sym: 'Aᶜ', easy: 'U 안에서 A 밖에 있는 것 전부 (여집합)', def: 'U 의 원소 중 A 에 속하지 않는 모든 원소로 이루어진 집합', memo: 'C = complement 의 첫 글자 · Aᶜ = U − A · 「A 가 아니다」' },
  { id: 'diff', sym: 'A − B', easy: 'A 에서 B 를 빼고 남은 것 (A 쪽만)', def: 'A 에 속하지만 B 에는 속하지 않는 모든 원소로 이루어진 집합 = A 에 대한 B 의 차집합', memo: 'A − B ≠ B − A · A − B = A ∩ Bᶜ' },
];
export const CONCEPTS: (SymRow & { where: RegExp })[] = [
  { id: '2^n', sym: '2ⁿ', easy: '원소마다 「넣을까 뺄까」 2가지씩 → 2 × 2 × … (원소 수만큼)', def: '원소가 n 개인 집합의 부분집합의 개수는 2ⁿ 개', memo: '2³ = 2 × 2 × 2 = 8 · 2⁵ = 2 × 2 × 2 × 2 × 2 = 32 (25 아님) · 지수 n = 원소의 개수', where: /집합 X 의 개수는\?|부분집합의 개수/ },
];
export const BY: Record<string, SymRow> = Object.fromEntries([...ROWS, ...CONCEPTS].map((r) => [r.id, r]));

const SETR = /[A-ZU)ᶜ}∅]$/;
const before = (t: string, i: number) => t.slice(0, i).replace(/\s+$/, ''), after = (t: string, i: number, n = 1) => t.slice(i + n).replace(/^\s+/, '');
const inNum = (t: string, i: number) => /n\(\s*[^()]*$/.test(t.slice(0, i));
const isDisj = (t: string, i: number) => { const m = /[A-Z](?:ᶜ)?\s*∩\s*[A-Z](?:ᶜ)?\s*=\s*∅/g; let x; while ((x = m.exec(t))) { if (i >= x.index && i < x.index + x[0].length) return true; } return false; };
const setLeft = (t: string, i: number) => { const b = before(t, i); if (!SETR.test(b)) return false; if (/\)$/.test(b)) { const k = b.lastIndexOf('('); if (k > 0 && /n$/.test(b.slice(0, k).replace(/\s+$/, ''))) return false; } return true; };
const setRight = (t: string, i: number, n = 1) => /^[A-Z(∅{]/.test(after(t, i, n)) && !/^n\(/.test(after(t, i, n));
/** 정식 pick: 줄 t 의 i 번째 글자가 어떤 기호인지 (null = 누를 수 없음) */
export function pick(t: string, i: number): string | null {
  const c = t[i];
  if (c === '∈') return 'in';
  if (c === '∉') return 'notin';
  if (c === '⊂') return 'sub';
  if (c === '⊄') return 'nsub';
  if (c === '∅') return isDisj(t, i) ? 'disj' : 'empty';
  if (c === '∩') return isDisj(t, i) ? 'disj' : 'cap';
  if (c === '∪') return inNum(t, i) ? 'ncup' : 'cup';
  if (c === 'ᶜ') return 'compl';
  if (c === '=') { if (isDisj(t, i)) return 'disj'; return setLeft(t, i) && !inNum(t, i) && setRight(t, i) && !/^\{[^}]*\|/.test(after(t, i)) ? 'eq' : null; }
  if (c === '−') return setLeft(t, i) && setRight(t, i) && !inNum(t, i) ? 'diff' : null;
  if (c === 'U') return /[A-Za-z가-힣]/.test(t[i - 1] || '') || /[A-Za-z]/.test(t[i + 1] || '') ? null : 'U';
  if (c === 'n' && t[i + 1] === '(' && !/[A-Za-z]/.test(t[i - 1] || '')) { const close = t.indexOf(')', i); return /∪/.test(t.slice(i, close < 0 ? undefined : close)) ? 'ncup' : 'n'; }
  if (c === '{') { const close = t.indexOf('}', i), inner = t.slice(i + 1, close < 0 ? undefined : close); if (/\|/.test(inner)) return 'build'; return /,/.test(inner) || /^\s*[0-9a-z]/.test(inner) ? 'list' : null; }
  if (c === '|') { const o = t.lastIndexOf('{', i), cl = t.lastIndexOf('}', i); return o > cl ? 'build' : null; }
  return null;
}
const CH = /[∈∉⊂⊄∅∩∪=−U{|ᶜ]|n(?=\()/g;
export type Seg = { text: string; id?: string };
/** 문제 글 → 글 조각 · 기호 조각 (기호 = 한 글자 · ᶜ 는 앞 글자와 함께 「Aᶜ」 로 묶어 누르는 칸을 넓힘) · 끝에 개념 톡 칩 */
export function segments(t: string): Seg[] {
  const hits: { i: number; len: number; id: string }[] = [];
  CH.lastIndex = 0; let m;
  while ((m = CH.exec(t))) {
    const id = pick(t, m.index); if (!id) continue;
    if (id === 'compl' && m.index > 0 && /[A-Z]/.test(t[m.index - 1] as string)) { const prev = hits[hits.length - 1]; if (prev && prev.i === m.index - 1) hits.pop(); hits.push({ i: m.index - 1, len: 2, id }); continue; }
    hits.push({ i: m.index, len: 1, id });
  }
  const out: Seg[] = []; let at = 0;
  for (const h of hits) { if (h.i < at) continue; if (h.i > at) out.push({ text: t.slice(at, h.i) }); out.push({ text: t.slice(h.i, h.i + h.len), id: h.id }); at = h.i + h.len; }
  if (at < t.length) out.push({ text: t.slice(at) });
  const c = CONCEPTS.find((x) => x.where.test(t)); if (c) out.push({ text: ' ' }, { text: c.sym, id: c.id });
  return out;
}
