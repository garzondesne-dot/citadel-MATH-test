/* eslint-disable @typescript-eslint/no-explicit-any */
// ⚒ 모루 연성법 (#148 · 정식 lessons/unit-set.js 원문 그대로 · 고치지 않음) — 원문 글을 읽어 작은 window 안에서 실행 → DS.Unit
//   재료 13 · 연산 24 · 카드 54 · 엄격 연성(순서 · 자리) · 실수 메시지 · 마력 예제 · 정식 tests/unit.test.js 원문 = tests/forge.test.ts 가 그대로 돌림
//   카드 그림 틀 = 정식 manifest cardKit(v2 · card-frame-v3 · card-arts-v2 · 칸 위치 box) = cardkit.json
import SRC from './unit-set.js?raw';
import KIT from './cardkit.json';
import type { CardKit, ForgeUnit } from '../../../model/forge';
const win: any = { DS: {} };
new Function('window', `var DS = window.DS = window.DS || {};\n${SRC}`)(win);
export const UNIT = win.DS.Unit as ForgeUnit;
export const CARD_KIT = KIT as unknown as CardKit;
