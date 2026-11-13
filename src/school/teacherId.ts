// ✉ B8 교사 로그인 아이디 칸 = 이메일도 받음 (정식 33ca5ab · 무안행복중 「여기서 막혔대」)
//   「@」가 있으면 ① 그 이메일 그대로(소문자 · 공백 정리) → 안 되면 ② 예전 꼴 t_<아이디>@citadel.class · 「@」 없으면 ②만
//   계정 만들기 = 「@」 있으면 그 이메일(v1.0 지금 그대로) · 없으면 예전 꼴
export const TEACHER_DOMAIN = 'citadel.class';
export const teacherEmail = (id: string) => `t_${String(id).trim().toLowerCase().replace(/[^0-9a-z._-]/g, '')}@${TEACHER_DOMAIN}`;
export const loginEmails = (id: string) => { const t = String(id).trim().toLowerCase().replace(/\s+/g, ''); return t.includes('@') ? [t, teacherEmail(id)] : [teacherEmail(id)]; };
export const makeEmail = (id: string) => loginEmails(id)[0]!;
