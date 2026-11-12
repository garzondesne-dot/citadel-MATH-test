import type { Question } from '../../model/types';
// 채점표의 「문제 짧게」 = 묻는 부분만(「… 일 때」 앞 조건 · (n) 번호 · 「의 원소를 모두 고르시오」 뺌) · 넘치면 표가 … 으로 줄임
//   「Aᶜ ∩ Bᶜ 의 원소를 모두 고르시오.」 → 「Aᶜ ∩ Bᶜ」 · 「… 에 대하여 n(Aᶜ ∩ Bᶜ) 는?」 → 「n(Aᶜ ∩ Bᶜ)」 (일반 몬스터 · 형성평가 · 소레이드가 같이 씀)
import { plain } from '../../engine/venn';
export function shortQ(x: Question): string {
  const s = shortRaw(x);
  return plain(s).replace(/\s*\[벤 다이어그램[^\]]*\]\s*/g, ' ').trim() || plain(s);
}
function shortRaw(x: Question): string {
  if (x.type === 'blanks') return `${x.items[0]?.left ?? ''} □ ${x.items[0]?.right ?? ''}`.trim();
  const t = x.question.replace(/^\s*\(\d+\)\s*/, '').replace(/^\d+\.\s*/, '');
  const cut = [' 일 때, ', ' 일 때 ', '에 대하여 '].map((m) => { const k = t.lastIndexOf(m); return k > 0 ? k + m.length : -1; }).reduce((a, b) => Math.max(a, b), -1);
  const ask = cut > 0 ? t.slice(cut) : t, head = ask.replace(/\s+(의|을|를|은|는)(\s.*|\?)?$/, '');
  return head.length >= 2 ? head : ask;
}
