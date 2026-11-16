// ⏱ 몬스터 공격 게이지 글 (📜 2026-11-17 #3 선생님 「다시 이모지표현 넣어줘봐」 = 옛 정식 hall.js hallAtk · student.js atkTick 표시)
//   TV(Arena) · 학생 폰(Scene) 이 같은 함수 — 막대 % · 「⏱ 남은 초」 · 「⛓ n초」(묶임) · 「⏸ 집중모드」(멈춤) · 80% 넘으면 빨강 깜빡 · 묶임 · 멈춤 = 파랑
//   주기 공식(일반 20→45초 · 보스 30→60초 · 체력이 닳을수록 느려짐)은 raid.ts atkClock 그대로 → 남은 초가 커지는 것이 숫자로 보임
import type { LessonPack, Room } from '../../model/types';
import { atkClock } from '../../raid/raid';
import { bindLeft } from '../../raid/combo';
export type GaugeView = { p: number; txt: string; hot: boolean; blue: boolean };
export function gaugeView(L: LessonPack, R: Room, now: number): GaugeView | null {
  const c = atkClock(L, R, now); if (!c) return null;
  if (c.paused) return { p: c.p, txt: c.focus ? '⏸ 집중모드' : '⏸ 멈춤', hot: false, blue: true };
  const b = bindLeft(L, R, c.mid, now);
  return { p: c.p, txt: `⏱ ${Math.max(0, Math.ceil((1 - c.p) * c.per))}${b ? ` · ⛓ ${b}초` : ''}`, hot: !b && c.p > 0.8, blue: b > 0 };
}
