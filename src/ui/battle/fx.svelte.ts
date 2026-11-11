// ⚔ 채점 연출 상태 (화면 하나 · 데미지 · 기록과 상관없음 — 결과를 순서대로 보여 줄 뿐)
//   hold = 아직 안 뒤집힌 ✔ 만큼 몬스터 체력을 잠깐 덜 깎인 것처럼 · pose = 용사 베기 / 헛스윙
export const fx = $state<{ hold: number; pose: 'idle' | 'attack' | 'miss'; poseUntil: number }>({ hold: 0, pose: 'idle', poseUntil: 0 });
export function swing(ok: boolean) { fx.pose = ok ? 'attack' : 'miss'; fx.poseUntil = Date.now() + 320; }
