// ⚔ 채점 연출 상태 (화면 하나 · 데미지 · 기록과 상관없음 — 결과를 순서대로 보여 줄 뿐)
//   hold = 아직 안 뒤집힌 ✔ 만큼 몬스터 체력을 잠깐 덜 깎인 것처럼 · pose = 용사 베기 / 헛스윙
//   block = 💥 몬스터 공격으로 입력 멈춤(#151 · 주요 단추 = 같은 자리 흐린 「⏳ 막는 중…」)
export const fx = $state<{ hold: number; pose: 'idle' | 'attack' | 'miss'; poseUntil: number; block: boolean }>({ hold: 0, pose: 'idle', poseUntil: 0, block: false });
export function swing(ok: boolean) { fx.pose = ok ? 'attack' : 'miss'; fx.poseUntil = Date.now() + 320; }
