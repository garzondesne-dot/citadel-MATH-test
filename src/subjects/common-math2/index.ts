import { CARD_KIT, PERKS, UNIT } from './forge';
import type { LessonPack, Question } from '../../model/types';
import type { Subject } from '../../model/subject';
import DATA from './subject.json';
import THEMES from './themes.json';
import MIS from './mis-codes.json';
import LEGACY_OPENED from './legacy-opened.json';
import RUBRICS from './rubrics.json';
import { bossTag as misBossTag, classify as misClassify } from './mis';
import { BY, segments } from './symtalk';
import { SYM_CARD, wishLeft } from './symcard';
import { optOf, plain, richParts } from './venn';
import { BOSS_GENS, CHAIN_GENS, GENS } from './gens';
import { FORMATS } from './formats';
import { recheck } from './recheck';
import Figure from './ui/Figure.svelte';

// 📦 공통수학2 풀 팩 (#136) — 이 과목의 모든 내용: 차시 팩 · 생성기 · 기호 톡 · 모루 카드 · 오개념 · 성취기준 · 차시 목록 · 칭호 · 캠프 이름표 · 세특 낱말 · 그림 · 문항 꼴 · 테스트 판 가짜 글
//   엔진은 engine/subject.ts 의 SUBJ 로만 읽음 (이 폴더 밖에 과목 낱말 · 차시 id 없음 · tests/engine-clean.test.ts)
const lessons = Object.values(import.meta.glob<LessonPack>('./lessons/*.json', { eager: true, import: 'default' }));
const toPart = (p: ReturnType<typeof optOf>) => ('venn' in p ? { fig: { venn: p.venn } } : 'shade' in p ? { fig: { shade: p.shade } } : { text: p.text });

const SUBJECT: Subject = {
  id: 'common-math2',
  name: DATA.name,
  defaultLesson: DATA.defaultLesson,
  lessons,
  generators: { gens: GENS, chains: CHAIN_GENS, boss: BOSS_GENS },
  symtalk: { BY, segments },
  cards: { bySym: SYM_CARD, wishLeft },
  forge: { unit: UNIT, kit: CARD_KIT, perks: PERKS },
  misconceptions: MIS,
  standards: DATA.standards,
  lessonList: DATA.lessonList,
  legacyOpened: LEGACY_OPENED as Record<string, Record<string, string[]>>,
  misLogic: { classify: misClassify, bossTag: misBossTag },
  rubrics: RUBRICS as Record<string, Record<string, unknown>>,
  // 🧹 6차시 「집합 한 장 정리」(c4 = 소레이드 4마리) = 정식이 2026-11-11 10:46 KST 에 고친 버그(대장까지 잡아도 첫 시도 0% 로 셈) 전 기록 → 대시보드에서 뺌 (📜 2026-11-15 선생님 답 A)
  badConc: [{ lid: 'set-06', c: 'c4', before: Date.UTC(2026, 10, 11, 1, 46, 36), why: '6차시 「집합 한 장 정리」 11/11 오전 전 기록 = 옛 판 계산 오류로 뺌' }],
  sealLegacy: { 'set-04': ['b1', 'b2', 'b3'], 'set-05': ['b1', 'b2', 'b3'], 'set-06': ['b1'], 'eval-1': ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'eb'] },
  titles: DATA.titles as Subject['titles'],
  camp: DATA.camp,
  skillNames: DATA.skillNames,
  funOx: DATA.funOx,
  specialAttacks: DATA.specialAttacks as Record<string, string>,
  glitchSyms: DATA.glitchSyms as string,
  seteuk: DATA.seteuk,
  rich: { parts: (t) => richParts(t).map((p) => ('venn' in p ? { fig: { venn: p.venn } } : { text: p.text })), opt: (o) => toPart(optOf(o)), plain, Figure },
  formats: FORMATS,
  recheck,
  themes: THEMES as Subject['themes'],
  demo: DATA.demo as Subject['demo'],
};
export default SUBJECT;
export type { Question };
