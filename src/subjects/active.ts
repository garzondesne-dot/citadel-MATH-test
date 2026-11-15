// 지금 켜는 과목 팩 (#136) — src/subjects/<id>/index.ts · 다른 과목을 더하면 이 한 줄만 바꿈
//   🏫 학교판 빌드(VITE_SCHOOL=<코드>) = 'school' (빈 과목 팩 · vite.config 가 VITE_SUBJECT 를 넣음)
export const ACTIVE_SUBJECT: string = ((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_SUBJECT) || 'common-math2';
