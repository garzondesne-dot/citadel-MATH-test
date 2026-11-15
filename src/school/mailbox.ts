// 📮 학생 우편함 (정식 js/raid/mail.js 옮김 · 📜 2026-11-15 선생님 「우편 기능 활성화」 · 새 규칙 없음)
//   받은 소식 = 🎁 선물(gifts/{학생} · 선생님 선물 · 정식에서 옮긴 친구 선물 · 석화 · 쉼터 · 서술 조각) · ✉ 선생님 메시지 · 💌 답장(mail/{학생}) · 📢 공지(school/notice/{반})
//   받기 = 아직 안 받은 선물만 (got 표시로 두 번 안 받음 · 캠프에 들어올 때 저절로 받는 것과 같은 칸) · 읽음 = 이 기기 「마지막으로 연 시각」(정식 citadel-mail-seen 그대로)
import type { Store } from '../model/types';

export type MailKind = 'gift' | 'msg' | 'reply' | 'notice';
export interface MailItem { k: MailKind; id: string; at: number; text: string; g: number; s: number; got: boolean; sub: string }
type Gift = { g?: number; s?: number; x?: number; at?: number; fun?: string; got?: boolean; mail?: boolean; from?: string; code?: string };
const ck = (c: string) => String(c).replace(/[.#$/[\]]/g, '_');
export const seenKey = (cls: string, num: number) => `citadel-mail-seen-${ck(cls)}-${num}`;
export const seenGet = (cls: string, num: number) => { try { return Number(localStorage.getItem(seenKey(cls, num))) || 0; } catch { return 0; } };
export const seenSet = (cls: string, num: number, t: number) => { try { localStorage.setItem(seenKey(cls, num), String(t)); } catch { /* 이 기기만 */ } };
/** 선물 한 칸의 이름 */
export function giftName(k: string, x: Gift): string {
  if (x.fun) return x.fun;
  if (k.startsWith('petri_')) return '🗿 석화 찬스';
  if (k.startsWith('ult_')) return '🌟 진필살기 서술';
  return '🎁 선생님 선물';
}
/** 받은 소식 (최근 순) */
export function inbox(S: Store, uid: string, cls: string): MailItem[] {
  const out: MailItem[] = [];
  for (const [id, x] of Object.entries(S.get<Record<string, Gift>>(`gifts/${uid}`) || {})) {
    if (!x || x.mail) continue; // ✉ 메시지에 붙은 💎 = 메시지 줄에 함께
    out.push({ k: 'gift', id, at: Number(x.at) || 0, text: giftName(id, x), g: Number(x.g) || 0, s: Number(x.s) || 0, got: !!x.got, sub: x.from === 'release' ? '친구 선물 (정식에서 옮김)' : '선물' });
  }
  for (const [id, x] of Object.entries(S.get<Record<string, { text?: string; g?: number; at?: number; kind?: string; got?: boolean; q?: string }>>(`mail/${uid}`) || {})) {
    if (!x || !x.text) continue;
    if (x.kind === 'news') { out.push({ k: 'notice', id, at: Number(x.at) || 0, text: x.text, g: 0, s: 0, got: true, sub: '📢 새 소식' }); continue; } // 🆕 바뀐 것 (🎒 학생 새 소식)
    out.push({ k: x.kind === 'reply' ? 'reply' : 'msg', id, at: Number(x.at) || 0, text: x.text, g: Number(x.g) || 0, s: 0, got: true, sub: x.kind === 'reply' ? `선생님 답장${x.q ? ` · 내 편지 「${String(x.q).slice(0, 24)}」` : ''}` : '선생님 메시지' });
  }
  if (cls) for (const [id, x] of Object.entries(S.get<Record<string, { text?: string; at?: number }>>(`school/notice/${cls}`) || {})) {
    if (!x || !x.text) continue;
    out.push({ k: 'notice', id, at: Number(x.at) || 0, text: x.text, g: 0, s: 0, got: true, sub: '선생님 공지' });
  }
  return out.sort((a, b) => b.at - a.at);
}
/** 안 읽음 = 마지막으로 연 뒤 온 것 + 아직 안 받은 선물 */
export const unreadOf = (list: MailItem[], seen: number) => list.filter((x) => x.at > seen || (x.k === 'gift' && !x.got)).length;
/** 🎁 받기 (안 받은 것만 · got 먼저 확인 = 두 번 안 받음) → 받은 { g, s, x } (이미 받았으면 null) — 지갑에 넣는 건 부르는 쪽(캠프 지갑) */
export function claim(S: Store, uid: string, id: string): { g: number; s: number; x: number; petri: boolean } | null {
  const p = `gifts/${uid}/${id}`, x = S.get<Gift>(p);
  if (!x || x.got) return null;
  S.set(`${p}/got`, true);
  return { g: Number(x.g) || 0, s: Number(x.s) || 0, x: Number(x.x) || 0, petri: id.startsWith('petri_') };
}
export const md = (t: number) => { const d = new Date(Number(t) + 9 * 3600e3); return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
