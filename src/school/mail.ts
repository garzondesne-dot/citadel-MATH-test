import type { Store } from '../model/types';
import { CLASSES, roster, uidOf } from './school';

// ✉ 선생님 → 학생 메시지 · 답장 (#130 ⑱) — mail/{uid}/{t}_{r}{i} = { text, g, at, kind }
//   💎 를 같이 보내면 gifts/{uid} 에도 같은 값(mail: true) → 캠프 · 수업 중 폰이 지갑에 넣음 · 알림은 메시지 한 줄에 합침(선물 알림 따로 안 띄움)
//   테스트 판 = 학생 우편함이 없어 받은 학생 폰에 알림 한 줄 · 모두 이 기기 저장
export interface Mail { text: string; g: number; at: number; kind: 'reply' | 'msg'; got?: boolean }
export const GEMS = [5, 10, 20, 50] as const; // 리모컨 💎 선물과 같은 값
export const QUICK = ['👍 고마워!', '확인했어', '고칠게', '내일 이야기하자'] as const;

export function sendMail(S: Store, uids: string[], text: string, g: number, kind: Mail['kind']): number {
  const t = S.now(), r = Math.random().toString(36).slice(2, 6), n = Math.max(0, Math.round(g)), tx = text.trim();
  if (!tx || !uids.length) return 0;
  uids.forEach((u, i) => {
    if (n) S.set(`gifts/${u}/${t}_${r}${i}m`, { g: n, at: t, code: 'mail', mail: true }); // 💎 먼저 → 메시지를 받은 폰이 바로 지갑에 넣음
    S.set(`mail/${u}/${t}_${r}${i}`, { text: tx, g: n, at: t, kind });
  });
  return uids.length;
}
/** 받는 사람: 반 전체 = 그 반 명단 전부 · 모든 반 = 8반 명단 전부 */
export const classUids = (S: Store, c: string) => roster(c, S).map((p) => p.uid);
export const allUids = (S: Store) => CLASSES.flatMap((c) => classUids(S, c));
export { uidOf };
/** 학생 폰 알림 한 줄 */
export const mailLine = (m: Pick<Mail, 'kind' | 'text'>, g: number) => `✉ 선생님 ${m.kind === 'reply' ? '답장' : '메시지'} · 「${m.text}」${g ? ` · 💎 +${g}` : ''}`;
