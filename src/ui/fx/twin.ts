// 🌙 쌍월 참 시제품 선택 (a · b · c) — 폰 띠(fx.ts) · TV 엔진(slash.ts) · 굽기가 같이 읽음 · Pixi 를 끌어오지 않게 따로 둔 작은 파일
export type TwinV = 'a' | 'b' | 'c' | 'd';
/** 🌙 쌍월 v3 (d) = 다시 만듦 (📜 2026-11-14 평가 「대표 스킬 신경 써 줘」 · A 👍 방향 왼 → 오 + B 👍 X 교차 · 큰 번쩍 · 파편 · 「크기를 키우는 건」) = 기본 */
const TW_KEY = 'citadel-twin2';
let twinNow: TwinV = (() => { try { const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('twin') : null; const v = q || (typeof localStorage !== 'undefined' ? localStorage.getItem(TW_KEY) : null); return v === 'a' || v === 'b' || v === 'c' ? v : 'd'; } catch { return 'a'; } })();
/** 갤러리 · TV(?twin=b) 가 고르는 쌍월 시제품 */
export const setTwin = (v: TwinV) => { twinNow = v; try { localStorage.setItem(TW_KEY, v); } catch { /* 무시 */ } };
export const twinOf = () => twinNow;
/** 🗡 👎 다시 만든 스킬 이름 (slash.ts SKILLS 와 같은 목록 · Pixi 를 끌어오지 않게 여기에 · tests/layer.test.ts 가 맞춰 봄) */
export const NEW_SKILLS = ['slash', 'hammer', 'quake', 'spin', 'reap', 'wblade', 'radiant', 'shade', 'claw', 'phantom', 'eclipse', 'bulwark', 'holysword', 'skylance'];
