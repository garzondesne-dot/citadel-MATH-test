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
export interface Format { grade(q: Question, g: Given): boolean; pen(q: Question, g: Given): string | null; empty(): Given; norm(g: Given): Given; filled(g: Given): boolean; Widget: Component<{ q: Question; value: Given; disabled?: boolean; onchange: (v: Given) => void }>;
  /** 정답 그대로의 답 (시연 · 미리 보기 · 시험 · 없으면 null) */ answer?(q: Question): Given;
  /** 가상 학생 답 (맞힘 / 일부러 틀림 · 없으면 정답 또는 빈 답) */ bot?(q: Question, right: boolean): Given;
  /** 정답 한 줄 (교사 · 틀린 뒤 보여 줌 · 없으면 pen(answer)) */ answerText?(q: Question): string;
  /** 📦 차시 팩 올리기: 팩 문항 칸 → 문항 (base = 문제 글 · 풀이 · 덧칸 · err = 검사 문구 · 이 꼴이 없으면 올릴 수 없음) */ fromPack?(it: Record<string, unknown>, base: Record<string, unknown>, err: (msg: string) => null): Question | null }
export interface Subject {
  id: string;
  /** 첫 화면 · 앱 이름에 붙는 과목 이름 */
  name: string;
  /** 차시를 모를 때 여는 차시 */
  defaultLesson: string;
  lessons: LessonPack[];
  generators: { gens: Record<string, Generator>; chains: Record<string, ChainGenerator>; boss: Record<string, BossGenerator> };
  /** 📖 기호 톡: 사전 + 문제 글에서 기호 찾기 (없으면 기호 톡 숨김) */
  symtalk?: { BY: Record<string, SymRow>; segments(t: string, o?: { prop?: boolean }): Seg[]; /** 단원 낱말(과목 팩 PROP)을 붙이는 차시인가 (#49) */ propOn?(L: { id: string; no?: number; kind?: string }): boolean };
  /** ⭐ 기호 → 모루 카드 */
  cards?: { bySym: Record<string, SymCard>; wishLeft(wishes: Record<string, true> | undefined, made: Record<string, true> | undefined): number };
  /** ⚒ 모루 연성법 (#148 · 정식 unit-set.js 원문) · 카드 그림 틀 */
  forge?: { unit: import('./forge').ForgeUnit; kit: import('./forge').CardKit; perks?: { id: number; a: number; b: number; skip?: string }[] };
  /** 오개념 사전 (세특 문구) */
  misconceptions: Record<string, { name?: string; seteuk: string; [k: string]: unknown }>;
  standards: { id: string; name: string; lessons: number[] }[];
  /** 대시보드 · 학생 시트 · 「준비 안 됨」 차시 목록 (개념 3개씩) */
  lessonList: { id: string; no: number; title: string; concs: string[] }[];
  /** 📊 지난 수업에서 반마다 실제로 연 칸 (정식 보관 서버 rooms 에서 뽑음 · { 반: { 차시: [칸] } } · 반 통계 자동값) */
  legacyOpened?: Record<string, Record<string, string[]>>;
  /** 📷 서술형 채점 기준표 (정식 lessons/rubrics.js · { 차시: { 방: 기준표 } } · 교사 「📤 기준표 올리기」 원본) */
  rubrics?: Record<string, Record<string, unknown>>;
  /** 🧹 옛 판 계산 오류 기록 = 대시보드에서 뺌 (차시 · 개념 칸 · 이 시각 전에 저장된 기록 · 이유 한 줄) · 서버 기록은 그대로 */
  badConc?: { lid: string; c: string; before: number; why: string }[];
  /** 🟪 옛 규칙 업적(정식 bonus.js LEGACY · 차시 → 옛 방 id) */
  sealLegacy?: Record<string, string[]>;
  /** 🔎 오개념 분류 (틀린 답 → 코드 · 형성평가 꼬리표) · 없으면 오개념 기록 안 함 */
  misLogic?: { classify(q: import('./types').Question | null, given: unknown, tag?: Record<string, unknown> | null): string[]; bossTag(lid: string, set: number, i: number): Record<string, unknown> | null };
  /** 과목 칭호 (엔진 칭호 목록의 after 뒤에 끼움) */
  titles: { after: string; list: { id: string; name: string; tier: 'w' | 'b' | 'p' | 'o'; cond: string }[] };
  /** ⭕ 쉼터 수학 OX 문장 (차시 · 문장 · 참 · 한 줄 해설) — 없으면 OX 놀이 안 보임 */
  funOx?: { no: number; t: string; a: boolean; why: string }[];
  /** 💥 던전 특수 공격 = 차시 번호 → 공격 id (그 차시 보스 셋째 공격 · ⚙ 스위치 틀 · 과목 팩으로 옮김) */
  specialAttacks?: Record<string, string>;
  /** ⚡ 파지직 공격이 잠깐 바꾸는 기호 (그 과목 기호 · 없으면 숫자만) */
  glitchSyms?: string;
  /** 스킬 이름 (용사 스킬 도감 · 엔진 기본 이름 대신) — 과목 팩 subject.json 의 skillNames */
  skillNames?: Record<string, string>;
  /** 캠프 · TV 이름표 글자 */
  camp: { castleSub: string; anvilSub: string; floors: { no: number; name: string; sub: string; off?: boolean }[] };
  /** 세특 초안 낱말 */
  seteuk: { unit: string; evalWord: string };
  /** 문제 글 · 보기 그림 (없으면 글 그대로) */
  rich?: { parts(t: string): RichPart[]; opt(o: string): RichPart; plain(t: string): string; Figure: Component<{ fig: unknown }>; /** 📦 팩 검사: 그림 글이 안 읽히면 이유 */ check?(t: string): string | null };
  formats: Record<string, Format>;
  /** 🧮 차시 팩 올리기 정답 재계산 (L1) — 문제 글을 다시 풀 수 있으면 맞음 · 틀림 · 못 풀면 ok = null(선생님 확인) */
  recheck?: (q: import('./types').Question) => { ok: boolean | null; want?: string };
  /** 몬스터 줄 · 던전 배경 (변환기가 만든 표) */
  themes: { sheets: Record<string, { src: string; cell: number; names: string[] }>; dungeons: Record<string, string> };
  /** 👩‍🏫 체험판 (📜 2026-11-17 #33): 차시 카드 · 단계 · 쉼터 자리 · 방 설정 · 같이 싣는 팩 글(차시 팩 json) — 없으면 체험판 없음 */
  trial?: TrialCfg;
  /** 테스트 판 가짜 자료 글 (소식 · 설문 · 서술형 · 기호 표) */
  demo: { inbox: { id: string; kind: 'idea' | 'photo' | 'quiz' | 'survey'; title: string; sub: string; body?: string; from?: { cls: string; num: number } }[]; syms: [string, string][]; photoWhere: string; surveyLesson: string; surveyHard: string };
}
/** 👩‍🏫 체험판 차시 설정 (과목 팩이 정함 · 엔진 src/trial 이 읽음) */
export interface TrialCfg {
  /** 첫 화면 차시 카드 (위 = 풀 체험) · id = 차시 id */
  cards: { id: string; ic: string; name: string; tag: string; sub: string }[];
  /** 같이 싣는 차시 팩 글 (id → json 글 · 올리기 검사와 같은 길) · 없는 id = 내장 차시 */
  raw?: Record<string, string>;
  /** 🏰 같이 싣는 성채 팩 글 (체험판 = 이 층만 · 방 모두 열림) */
  castle?: string;
  /** 차시마다 체험판에서 쓰는 단계 id (순서 그대로) */
  keep: Record<string, string[]>;
  /** 이 몬스터 다음 「다음 ▶」 = 🏕 쉼터 먼저 */
  restAfter: Record<string, string>;
  /** 방 설정: fresh1 = 첫 판 숫자 = 한 번 더 판 1 · sent = 🎯 복습으로 넘긴 것으로 둘 몬스터 · bossItems = 형성평가 문항 수 */
  room: Record<string, { fresh1?: boolean; sent?: string[]; bossItems?: number }>;
}
