import type { Subject } from '../../model/subject';
import BASE from '../common-math2/index';

// 🏫 학교판 과목 팩 (📜 머리 🔨 「학교판 = v1.0 표준 판 + 그 학교 Firebase 공개 설정」 · CLAUDE.md 「🏫 학교판 규칙」)
//   코드에 if(학교판) 없음 — 이 「빈 과목 팩」 하나로 갈림: 우리 차시 · 모루 · 도감 · 📖 기호 톡 · 🏰 성채 · 오개념 · 성취기준 · ⭕ OX · 성채 칭호 = 없음
//   → 스위치(features)가 「과목 팩에 없음」으로 잠그고 화면이 저절로 숨김 · 차시 = 그 학교가 올린 📊 엑셀 차시 · 차시 팩만
//   과목 이름 = 빌드 때 그 학교 것(VITE_SCHOOL_SUBJECT · tools/school/schools.json) · 문항 꼴 · 몬스터 그림 · 배경 = 엔진 공용으로 빌려 씀
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const SUBJECT: Subject = {
  ...BASE,
  id: 'school',
  name: env.VITE_SCHOOL_SUBJECT || '수학',
  defaultLesson: '',
  lessons: [],
  symtalk: undefined,
  cards: undefined,
  forge: undefined,
  misconceptions: {},
  standards: [],
  lessonList: [],
  legacyOpened: undefined,
  misLogic: undefined,
  rubrics: undefined,
  sealLegacy: {},
  badConc: [],
  titles: { after: BASE.titles.after, list: [] },
  camp: { ...BASE.camp, floors: BASE.camp.floors.map((f) => ({ ...f, off: true })) },
  funOx: [],
  specialAttacks: {},
  seteuk: { unit: '', evalWord: '평가' },
};
export default SUBJECT;
