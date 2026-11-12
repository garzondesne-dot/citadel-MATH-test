import type { Store } from '../model/types';

// 🔔 교사 소식 받은 것 (#124 ⑱) — 의견 · 📷 사진 채점 대기 · ✏ 출제 확인 · 📝 설문 결과 · school/inbox/{id}
//   테스트 판 = 처음 열 때 가짜 소식 6줄을 한 번 넣음(읽음 · 처리 상태는 이 기기에 남음)
export interface InboxItem { id: string; kind: 'idea' | 'photo' | 'quiz' | 'survey'; title: string; sub: string; body?: string; at: number; read?: boolean; done?: string;
  /** 💬 학생 메시지 보낸 사람 (#130 답장) */ from?: { cls: string; num: number }; replied?: string }
const SEED: Omit<InboxItem, 'at'>[] = [
  { id: 'n1', kind: 'photo', title: '사진 채점 대기 3장', sub: '1-3반 · 6차시 문제 4 서술형', body: '학생 손글씨 풀이 3장 · AI 1차 채점 「근거 줄 빠짐」 1장' },
  { id: 'n2', kind: 'idea', title: '버그 · 「박쥐가 안 사라져요」', sub: '1-2반 4번 · 오늘 11:20', body: '황금 박쥐를 맞혔는데 화면에 남아 있어요', from: { cls: '1-2', num: 4 } },
  { id: 'n3', kind: 'quiz', title: '출제 확인 · 새 문제 2개', sub: '1-3반 12번 · 1-1반 3번', body: 'A = {1, 2, 3} 일 때 부분집합의 개수는? (답 8)' },
  { id: 'n4', kind: 'survey', title: '설문 결과 · 6차시', sub: '1-3반 응답 11 / 13', body: '재밌었다 9 · 어려웠다 3 · 한 번 더 7' },
  { id: 'n5', kind: 'idea', title: '아이디어 · 「쉼터에 놀이 더」', sub: '1-1반 7번 · 어제', body: '쉼터에 놀이가 하나 더 있으면 좋겠어요', from: { cls: '1-1', num: 7 } },
  { id: 'n6', kind: 'idea', title: '선생님께 · 「오늘 재밌었어요」', sub: '1-4반 2번 · 어제', body: '오늘 수업 재밌었어요!', from: { cls: '1-4', num: 2 } },
];
export function inbox(S: Store): InboxItem[] {
  let all = S.get<Record<string, InboxItem>>('school/inbox');
  if (all && Object.values(all).some((x) => x.kind === 'idea' && !x.from)) all = null; // 옛 가짜 소식(보낸 사람 없음) → 다시 넣음
  if (!all) { const t = Date.now(); all = Object.fromEntries(SEED.map((x, i) => [x.id, { ...x, at: t - i * 3600e3 }])); S.set('school/inbox', all); }
  return Object.values(all).sort((a, b) => b.at - a.at);
}
export const unreadN = (S: Store) => inbox(S).filter((x) => !x.read).length;
