import type { Component } from 'svelte';
import type { Given, LessonPack, Question } from './types';
import type { Rng } from '../engine/rng';

// 📦 과목 팩 (#136 · 「풀 팩」) — 엔진은 과목을 모르고, 과목 내용은 모두 이 꼴 하나로 들어옴 (입구 = engine/subject.ts 의 SUBJ)
//   데이터는 코드 없는 JSON 이 기본 · 생성기 · 문항 꼴(그림 · 채점)만 코드(이름 등록)
export type Generator = (variant: number, rng: Rng, params?: Record<string, unknown>) => Question[];
export type BossGenerator = (i: number, attempt: number, rng: Rng) => Question;
export type ChainGenerator = (pass: number, rng: Rng, seed?: string) => Question[];
export interface SymRow { id: string; sym: string; easy: string; def: string; memo: string }
export type Seg = { text: string; id?: string };
export interface SymCard { id: string; name: string; fm: string; hint: string }
/** 문제 글 · 보기 안 그림 (과목이 정함) — 글 조각 또는 그림 자료 */
export type RichPart = { text: string } | { fig: unknown };
/** 과목 고유 문항 꼴 (엔진의 기본 꼴 = choice · ox · number · multi · blanks · text 밖) */
export interface Format { grade(q: Question, g: Given): boolean; pen(q: Question, g: Given): string | null; empty(): Given; norm(g: Given): Given; filled(g: Given): boolean; Widget: Component<{ q: Question; value: Given; disabled?: boolean; onchange: (v: Given) => void }> }
export interface Subject {
  id: string;
  /** 첫 화면 · 앱 이름에 붙는 과목 이름 */
  name: string;
  /** 차시를 모를 때 여는 차시 */
  defaultLesson: string;
  lessons: LessonPack[];
  generators: { gens: Record<string, Generator>; chains: Record<string, ChainGenerator>; boss: Record<string, BossGenerator> };
  /** 📖 기호 톡: 사전 + 문제 글에서 기호 찾기 (없으면 기호 톡 숨김) */
  symtalk?: { BY: Record<string, SymRow>; segments(t: string): Seg[] };
  /** ⭐ 기호 → 모루 카드 */
  cards?: { bySym: Record<string, SymCard>; wishLeft(wishes: Record<string, true> | undefined, made: Record<string, true> | undefined): number };
  /** 오개념 사전 (세특 문구) */
  misconceptions: Record<string, { name?: string; seteuk: string; [k: string]: unknown }>;
  standards: { id: string; name: string; lessons: number[] }[];
  /** 대시보드 · 학생 시트 · 「준비 안 됨」 차시 목록 (개념 3개씩) */
  lessonList: { id: string; no: number; title: string; concs: string[] }[];
  /** 과목 칭호 (엔진 칭호 목록의 after 뒤에 끼움) */
  titles: { after: string; list: { id: string; name: string; tier: 'w' | 'b' | 'p' | 'o'; cond: string }[] };
  /** ⭕ 쉼터 수학 OX 문장 (차시 · 문장 · 참 · 한 줄 해설) — 없으면 OX 놀이 안 보임 */
  funOx?: { no: number; t: string; a: boolean; why: string }[];
  /** 스킬 이름 (용사 스킬 도감 · 엔진 기본 이름 대신) — 과목 팩 subject.json 의 skillNames */
  skillNames?: Record<string, string>;
  /** 캠프 · TV 이름표 글자 */
  camp: { castleSub: string; anvilSub: string; floors: { no: number; name: string; sub: string; off?: boolean }[] };
  /** 세특 초안 낱말 */
  seteuk: { unit: string; evalWord: string };
  /** 문제 글 · 보기 그림 (없으면 글 그대로) */
  rich?: { parts(t: string): RichPart[]; opt(o: string): RichPart; plain(t: string): string; Figure: Component<{ fig: unknown }> };
  formats: Record<string, Format>;
  /** 몬스터 줄 · 던전 배경 (변환기가 만든 표) */
  themes: { sheets: Record<string, { src: string; cell: number; names: string[] }>; dungeons: Record<string, string> };
  /** 테스트 판 가짜 자료 글 (소식 · 설문 · 서술형 · 기호 표) */
  demo: { inbox: { id: string; kind: 'idea' | 'photo' | 'quiz' | 'survey'; title: string; sub: string; body?: string; from?: { cls: string; num: number } }[]; syms: [string, string][]; photoWhere: string; surveyLesson: string; surveyHard: string };
}
