/* eslint-disable @typescript-eslint/no-explicit-any */
// ⚒ 모루 연성법 (#148 · 정식 lessons/unit-set.js 원문 그대로 · 고치지 않음) — 원문 글을 읽어 작은 window 안에서 실행 → DS.Unit
//   재료 13 · 연산 24 · 카드 54 · 엄격 연성(순서 · 자리) · 실수 메시지 · 마력 예제 · 정식 tests/unit.test.js 원문 = tests/forge.test.ts 가 그대로 돌림
//   카드 그림 틀 = 정식 manifest cardKit(v2 · card-frame-v3 · card-arts-v3(8 × 4 · 위 두 줄 = 정식 v2 그대로 · 16 ~ 25 = 함수 그림 #58) · 칸 위치 box) = cardkit.json
import SRC from './unit-set.js?raw';
import KIT from './cardkit.json';
import FUNC from './unit-func.json'; // 📈 #58 함수 단원 (14 ~ 17차시 · hero-v2 docs/handoff/forge-func/unit-func.json · 설계 방 #7 · 23장 · 레시피 29)
import type { CardKit, ForgeUnit } from '../../../model/forge';
const win: any = { DS: {} };
new Function('window', `var DS = window.DS = window.DS || {};\n${SRC}`)(win);
export const UNIT = win.DS.Unit as ForgeUnit;
// 📈 #58 함수 단원을 같은 연성법에 더함 (unit-set.js 함수들이 MATS · OPS · CARDS · MISTAKES 배열을 그대로 읽으므로 끝에 붙이면 같은 규칙 · 엄격 연성 · 실수 안내가 그대로)
//   단원 = 카드마다 unit ('set' 집합과 명제 2 ~ 13 · 'func' 함수 14 ~ 17) · 모루 탭이 이걸로 나눔
{
  const F = FUNC as unknown as Pick<ForgeUnit, 'MATS' | 'OPS' | 'CARDS' | 'MISTAKES'>;
  for (const c of UNIT.CARDS) (c as { unit?: string }).unit ??= 'set';
  UNIT.MATS.push(...F.MATS.filter((m) => !UNIT.MATS.some((x) => x.id === m.id)).map((m) => ({ ...m, unit: 'func' })));
  UNIT.OPS.push(...F.OPS.filter((o) => !UNIT.OPS.some((x) => x.id === o.id)).map((o) => ({ ...o, unit: 'func' })));
  UNIT.CARDS.push(...F.CARDS.map((c) => ({ ...c, unit: 'func' })));
  Object.assign(UNIT.MISTAKES, F.MISTAKES);
  UNIT.UNITS = [{ id: 'set', name: '집합과 명제', icon: '📦', from: 2 }, { id: 'func', name: '함수', icon: '📈', from: 14 }];
}
export const CARD_KIT = KIT as unknown as CardKit;
/** 📖 도감 특전 3줄 (정식 forge.js PERKS 그대로): 그 차시 카드를 다 모으면 용사 열림 · 💎 로 먼저 열었으면 다 모은 때 돌려받음 */
export const PERKS = [{ id: 8, a: 1, b: 3, skip: 'subcount' }, { id: 10, a: 4, b: 6 }, { id: 11, a: 8, b: 11 }];
