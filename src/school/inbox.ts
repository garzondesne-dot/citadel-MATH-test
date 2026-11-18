import { SUBJ } from '../engine/subject';
import type { Store } from '../model/types';
import { photoNeeds } from './photo';
import { questNeeds } from './quest';

// 🔔 교사 소식 받은 것 (#124 ⑱) — 의견 · 📷 사진 채점 대기 · ✏ 출제 확인 · 📝 설문 결과 · school/inbox/{id}
//   테스트 판 = 처음 열 때 가짜 소식 6줄을 한 번 넣음(읽음 · 처리 상태는 이 기기에 남음)
export interface InboxItem { id: string; kind: 'idea' | 'photo' | 'quiz' | 'survey' | 'news'; title: string; sub: string; body?: string; at: number; read?: boolean; done?: string;
  /** 💬 학생 메시지 보낸 사람 (#130 답장) */ from?: { cls: string; num: number }; replied?: string }
const SEED: Omit<InboxItem, 'at'>[] = SUBJ.demo.inbox; // 테스트 판 가짜 소식 글 = 과목 팩 (#136)
const SEED_IDS = new Set(SEED.map((x) => x.id));
export function inbox(S: Store): InboxItem[] {
  let all = S.get<Record<string, InboxItem>>('school/inbox');
  if (all && S.kind !== 'server' && Object.values(all).some((x) => x.kind === 'idea' && !x.from)) all = null; // 옛 가짜 소식(보낸 사람 없음) → 다시 넣음
  // 🐞 b207 (선생님 캡처 「받은 것 0 인데 가짜 같은 줄」): 가짜 소식 = 이 기기 체험(device)에서만 · 서버(베타 · 정식 = 같은 운영 서버)에는 절대 안 씀
  //   예전 = 서버에서도 칸이 비면 n1~n6 가짜 소식을 운영 서버 school/inbox 에 써 넣었음 (지우기 = 선생님 허락 뒤 손발이 n1~n6 만)
  // 🐞 11/17: 이 기기 체험에 「📢 바뀐 것」 소식이 먼저 들어가 있으면 가짜 소식이 안 들어가던 것 → 가짜 소식 칸이 하나도 없으면 더함
  if (S.kind !== 'server' && !Object.keys(all || {}).some((k) => SEED_IDS.has(k))) { const t = Date.now(); const seed = Object.fromEntries(SEED.map((x, i) => [x.id, { ...x, at: t - i * 3600e3 }])); all = { ...(all || {}), ...seed }; S.set('school/inbox', all); }
  if (!all) return [];
  if (S.kind === 'server') return Object.values(all).filter((x) => x && !SEED_IDS.has(x.id)).sort((a, b) => b.at - a.at); // 이미 써진 가짜 줄은 서버에서 안 보임
  return Object.values(all).sort((a, b) => b.at - a.at);
}
/** 🔔 빨간 점 = 안 본 소식 + 📷 확인할 사진(✔ ✖ 하기 전까지 · 서버) */
export const unreadN = (S: Store) => inbox(S).filter((x) => !x.read).length + (S.kind === 'server' ? photoNeeds(S).length : 0) + questNeeds(S).length; // ✏ #75 출제 안건
