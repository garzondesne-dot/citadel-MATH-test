// 📺 TV 개념 · 문제 카드 꼴 (머리 🔨 2026-11-14 「TV 를 컨펌 시안대로」 ②) — 순수 함수 · 학생 문항은 그대로(글자 배치만)
//   개념 = 제목 + 수식 상자(식만 있는 조각) + 요약 한 줄(나머지 말) · 「(먼저 말로 …)」 「(먼저 지난 시간 복습 …)」 같은 교사 말 조각은 뺌
//   문제 = 소문제마다 되풀이되는 「U = …, A = …, B = … 일 때」 를 위에 한 번 · 아래 (1)~(n) 은 짧게
const HANGUL = /[가-힣]/g;
const MATHY = /[=⊂⊄⇔⇒∅]/;
const isMath = (t: string) => MATHY.test(t) && (t.match(HANGUL)?.length ?? 0) <= 2;

export function conceptParts(say: string): { boxes: string[]; lines: string[] } {
  let s = (say || '').trim().replace(/^\((?:먼저|지난)[^)]*\)\s*/, '');
  s = s.replace(/^\((?:먼저|지난)[^)]*\)\s*/, '');
  const boxes: string[] = [], lines: string[] = [];
  for (const part of s.split(/\s+·\s+/).map((x) => x.trim()).filter(Boolean)) {
    const bits = part.split(/,\s+/);
    if (bits.length > 1 && bits.every(isMath)) boxes.push(...bits.map((b) => b.replace(/[.!]$/, '')));
    else if (isMath(part)) boxes.push(part.replace(/[.!]$/, ''));
    else lines.push(part);
  }
  return { boxes: boxes.slice(0, 3), lines: boxes.length ? lines.slice(0, 2) : lines.slice(0, 3) };
}

const LAB = /^(\(\d+\)(?:\s[①-⑨])?)\s+/;
export function problemParts(qs: string[]): { head: string[]; items: string[] } {
  const parts = qs.map((q) => { const m = LAB.exec(q); return { lab: m?.[1] ?? '', rest: m ? q.slice(m[0].length) : q }; });
  if (parts.length < 2) return { head: [], items: qs };
  // 공통 앞부분 = 「… 일 때」 로 끝나는 같은 글
  const first = parts[0]!.rest, cut = first.indexOf(' 일 때 ');
  const head = cut > 0 ? first.slice(0, cut + 5) : '';
  if (!head || !parts.every((p) => p.rest.startsWith(head))) return { head: [], items: qs };
  const cond = head.replace(/\s*일 때\s*$/, '');
  // 「U = {…}, A = {…}, B = {…}」 → 첫 조건 한 줄 · 나머지 한 줄
  const sets = cond.split(/,\s+(?=[A-Z][A-Za-z₀-₉]*\s*=)/);
  const lines = sets.length > 2 ? [sets[0]!, sets.slice(1).join(', ')] : [cond];
  return { head: lines, items: parts.map((p) => `${p.lab ? `${p.lab} ` : ''}${p.rest.slice(head.length)}`) };
}

/** 💬 교사용 말할 거리 = 개념 글 앞의 「(먼저 …)」 「(지난 …)」 괄호 속 (TV · 학생 폰엔 안 보임 · 교사 폰 리모컨 개념 단계 · 2026-11-14 선생님 「A 말할 거리로 보이게」) */
export function talkOf(say: string): string {
  const out: string[] = []; let s = (say || '').trim(), m: RegExpExecArray | null;
  while ((m = /^\(((?:먼저|지난)[^)]*)\)\s*/.exec(s))) { out.push(m[1]!.replace(/^먼저 말로:\s*/, '').trim()); s = s.slice(m[0].length); }
  return out.join(' · ');
}
