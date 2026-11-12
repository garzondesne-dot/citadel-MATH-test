import { SUBJ } from '../engine/subject';
import type { Store } from '../model/types';

// 🔔 교사 소식 받은 것 (#124 ⑱) — 의견 · 📷 사진 채점 대기 · ✏ 출제 확인 · 📝 설문 결과 · school/inbox/{id}
//   테스트 판 = 처음 열 때 가짜 소식 6줄을 한 번 넣음(읽음 · 처리 상태는 이 기기에 남음)
export interface InboxItem { id: string; kind: 'idea' | 'photo' | 'quiz' | 'survey'; title: string; sub: string; body?: string; at: number; read?: boolean; done?: string;
  /** 💬 학생 메시지 보낸 사람 (#130 답장) */ from?: { cls: string; num: number }; replied?: string }
const SEED: Omit<InboxItem, 'at'>[] = SUBJ.demo.inbox; // 테스트 판 가짜 소식 글 = 과목 팩 (#136)
export function inbox(S: Store): InboxItem[] {
  let all = S.get<Record<string, InboxItem>>('school/inbox');
  if (all && Object.values(all).some((x) => x.kind === 'idea' && !x.from)) all = null; // 옛 가짜 소식(보낸 사람 없음) → 다시 넣음
  if (!all) { const t = Date.now(); all = Object.fromEntries(SEED.map((x, i) => [x.id, { ...x, at: t - i * 3600e3 }])); S.set('school/inbox', all); }
  return Object.values(all).sort((a, b) => b.at - a.at);
}
export const unreadN = (S: Store) => inbox(S).filter((x) => !x.read).length;
