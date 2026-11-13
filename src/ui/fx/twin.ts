// 🌙 쌍월 참 시제품 선택 (a · b · c) — 폰 띠(fx.ts) · TV 엔진(slash.ts) · 굽기가 같이 읽음 · Pixi 를 끌어오지 않게 따로 둔 작은 파일
export type TwinV = 'a' | 'b' | 'c';
let twinNow: TwinV = (() => { try { const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('twin') : null; const v = q || (typeof localStorage !== 'undefined' ? localStorage.getItem('citadel-twin') : null); return v === 'b' || v === 'c' ? v : 'a'; } catch { return 'a'; } })();
/** 갤러리 · TV(?twin=b) 가 고르는 쌍월 시제품 */
export const setTwin = (v: TwinV) => { twinNow = v; try { localStorage.setItem('citadel-twin', v); } catch { /* 무시 */ } };
export const twinOf = () => twinNow;
