// 🎖 「버그 사냥꾼」 호칭 (📜 2026-11-24 선생님 「버그사냥꾼 칭호 만들어.」 · 머리 🔨) — 선생님이 직접 주기만 · 자동 지급 없음 · 호칭만(💎 · 꾸미기 없음)
//   주기 = 우편 한 통(mail/{uid}/bughOn_{시각}) + 💎 0 선물(gifts/{uid}/bughOn_{시각}m) → 학생 폰이 캠프에서 받을 때 💎 로그 bughOn_{시각} 한 줄
//   회수(실수로 줬을 때) = 같은 길로 bughOff_{시각} · 호칭 = 가장 늦은 줄이 On 이면 가짐 · 학생은 ⚙ 설정에서 고름(자동으로 달지 않음)
import type { Store } from '../model/types';

export const BUGH_ID = 'bughunter';
export const BUGH_TEXT = { on: '🎖 선생님이 「버그 사냥꾼」 호칭을 주셨어요 · 설정에서 달 수 있어요', off: '🎖 「버그 사냥꾼」 호칭을 선생님이 거둬들였어요' } as const;
const RE = /^bugh(On|Off)_([0-9a-z]+)$/;

/** 선생님: 주기(on) · 회수(off) */
export function giveBugHunter(S: Store, uid: string, on: boolean): string {
  const at = S.now(), k = `bugh${on ? 'On' : 'Off'}_${at.toString(36)}`;
  S.set(`gifts/${uid}/${k}m`, { g: 0, at, fun: on ? '🎖 버그 사냥꾼' : '🎖 호칭 회수', mail: true });
  S.set(`mail/${uid}/${k}`, { text: on ? BUGH_TEXT.on : BUGH_TEXT.off, g: 0, at, kind: 'msg' });
  return k;
}
/** 열쇠 목록(우편 · 💎 로그) → 지금 가짐? (가장 늦은 On / Off) */
export function bughHeld(keys: Iterable<string>): boolean {
  let best = -1, on = false;
  for (const k of keys) { const m = RE.exec(k); if (!m) continue; const t = parseInt(m[2]!, 36); if (t >= best) { best = t; on = m[1] === 'On'; } }
  return on;
}
/** 학생: 받은 선물 → 💎 로그 한 줄 (호칭 근거 · 💎 0) */
export const bughLog = (giftKey: string, at: number) => { const k = giftKey.replace(/m$/, ''); return RE.test(k) ? { key: k, row: { g: 0, at, why: k.startsWith('bughOn') ? '🎖 버그 사냥꾼' : '🎖 호칭 회수' } } : null; };
