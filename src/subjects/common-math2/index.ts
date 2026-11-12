import type { LessonPack, Question } from '../../model/types';
import type { Subject } from '../../model/subject';
import DATA from './subject.json';
import THEMES from './themes.json';
import MIS from './mis-codes.json';
import { BY, segments } from './symtalk';
import { SYM_CARD, wishLeft } from './symcard';
import { optOf, plain, richParts } from './venn';
import { BOSS_GENS, CHAIN_GENS, GENS } from './gens';
import { FORMATS } from './formats';
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
  misconceptions: MIS,
  standards: DATA.standards,
  lessonList: DATA.lessonList,
  titles: DATA.titles as Subject['titles'],
  camp: DATA.camp,
  seteuk: DATA.seteuk,
  rich: { parts: (t) => richParts(t).map((p) => ('venn' in p ? { fig: { venn: p.venn } } : { text: p.text })), opt: (o) => toPart(optOf(o)), plain, Figure },
  formats: FORMATS,
  themes: THEMES as Subject['themes'],
  demo: DATA.demo as Subject['demo'],
};
export default SUBJECT;
export type { Question };
