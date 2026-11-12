import type { Store } from '../model/types';

// 🧑 학생 기록 서버 저장 (#141 · V1-DESIGN 7절 정식 경로) — 시험 서버에 「그 학생 계정으로 로그인한 폰」일 때만 묶임
//   accounts/{반}/{번호} = uid · at · hero · socket · title   (용사 · 끼운 스킬 · 고른 호칭)
//   gem/{반}/{번호}      = total(💎) · scroll(📜) · enh(강화) · buy(산 것 { id, ver, at }) · ver(경제 판) · log
//   xp/{반}/{번호}       = total
//   cards/{반}/{번호}    = { 카드 id: true }
//   records/{반}/{번호}/{차시} = 수업 끝 기록 (mons · boss · right · total · at · code)
//   폰에만 남기는 것(정식 7절 「옮기지 않음」과 같은 결): 눌러 본 물건(seen) · 찜(wishes) · 화면 설정
//   서버가 없거나(이 기기) · 그 계정으로 로그인하지 않은 폰(?as 시험 · 교사 · TV) = 묶이지 않음 → 이 기기 저장 그대로
type AuthStore = Store & { auth?: { currentUser: { uid: string } | null } };
export interface Bound { S: Store; cls: string; num: number }
let bound: Bound | null = null;
export const meBound = () => bound;
/** 묶기 (로그인한 그 학생 = 서버 계정 uid 가 지금 로그인 uid 와 같을 때만) → 묶였나 */
export function bindMe(S: Store, cls: string, num: number): boolean {
  const uid = (S as AuthStore).auth?.currentUser?.uid;
  const acc = S.get<{ uid?: string }>(`accounts/${cls}/${num}`);
  bound = S.kind === 'server' && uid && acc?.uid === uid ? { S, cls, num } : null;
  return !!bound;
}
export const unbindMe = () => { bound = null; };
export const p = (b: Bound, root: string) => `${root}/${b.cls}/${b.num}`;
