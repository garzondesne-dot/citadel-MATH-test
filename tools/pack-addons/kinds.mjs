// 🏷 숫자 바뀐 판(retry pool) 문항 꼴 규칙 — 차시마다 (📜 2026-11-16 머리 🔨 · 덧칸 helps · reviews 를 꼴별로 찾게)
//   규칙 = (문항) => 꼴 이름 | null · 첫 판은 덧칸 mons.mN.kinds 배열로 붙임
const has = (o, k) => o && typeof o === 'object' && k in o;
export const KIND_RULES = {
  // 12차시 귀류법 (addons-12.json): m1 = 생성기 check.ass · m3 = check.irr[0] (3 = k√2 꼴 → √2 = a ÷ k = 곱 / 0 · 2 = ± 정수 꼴 = 덧셈) · m2 = 꼴 없음(몬스터 help)
  //   ass 5 는 지금 굳힌 판(pool 0 ~ 6)에 나오지 않음 → 나오면 꼴 없음(몬스터 help) · HANDOVER 에 적음
  'ex-12': {
    m1: (q) => { if (!has(q.check, 'ass')) return null; const a = Number(q.check.ass); return [0, 3, 6].includes(a) ? '루트' : a === 1 ? '소수' : [2, 10].includes(a) ? '부등식' : [4, 7].includes(a) ? '홀짝' : [8, 9, 11].includes(a) ? '인원' : null; },
    m3: (q) => { if (!has(q.check, 'irr')) return null; return Number(q.check.irr[0]) === 3 ? '곱' : '덧셈'; },
  },
};
