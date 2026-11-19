// 판 번호 (테스트 버전 b1 · b2 …) — 바꿀 때 package.json version 도 같이
export const BUILD = 'b232';
/** 🔖 #81 베타 커밋 짧은 해시 (빌드 때 넣음 · 정식 · 학교판 · 시험 = '') — 화면에만 붙임 · 판 비교(BUILD_ID) */
export const REV: string = ((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_REV) || '';
/** 사이트 version.json 과 맞춰 보는 값 = 판 번호 + 해시 (베타) */
export const BUILD_ID = REV ? `${BUILD}·${REV}` : BUILD;
