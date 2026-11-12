// 🧱 v1.0 데이터 모양 — 모든 모양은 이 한 곳 (설계서 2절 「규칙」)
// 정식(Citadel-MATH) 의 DS.Quiz 문항 · 차시 파일 꼴을 타입으로 옮긴 것

// ── 문항 (정식 DS.Quiz 형식 그대로) ─────────────────────────
interface QBase {
  question: string;
  solution?: string;
  /** 📜 숫자가 바뀐 원문 (재도전 문항에 붙음) */
  problem?: string;
  /** 독립 검산용 정보 (시험만 읽음 · 화면은 안 씀) */
  check?: Record<string, unknown>;
  /** ⚔ 소레이드: 맞힌 뒤 「📜 나의 풀이」에 붙는 한 줄 */
  say?: string;
  /** 💡 근거 줄 (그 단계를 맞힌 뒤 · 첫 판 = 완성 문장 · 한 판 더 = 빈칸 고르기) */
  why?: { pre: string; post: string; choices: string[]; answer: number; text: string };
  tag?: string;
}
export type Question =
  | (QBase & { type: 'choice'; choices: string[]; answerIndex: number; answer?: string })
  | (QBase & { type: 'ox'; answer: boolean })
  | (QBase & { type: 'number'; answer: number })
  | (QBase & { type: 'text'; answers: string[] })
  | (QBase & { type: 'multi'; options: string[]; answer: number[]; /** 두 칸 고르기 (칸 제목 · 보기 수) */ groups?: { label: string; n: number }[]; /** ∅ 단추 자리 (P8) */ empty?: number[] })
  | (QBase & { type: 'blanks'; items: { left?: string; right?: string; answer: string }[]; options: string[] })
  | (QBase & { type: 'subsets'; base: number[] });

/** 학생 답 (형식별): choice = 번호 · ox = 참거짓 · number = 수 · text = 글 · multi = 번호 배열 · blanks = 기호 배열 · 과목 꼴 = 그 꼴이 정함(SUBJ.formats) */
export type Given = number | boolean | string | number[] | string[] | number[][] | null;

// ── 🧩 차시 팩 (설계서 6절 · 조사 #101 후보 1안) ──────────────
/** 숫자 바꾸기: pool = 미리 써 둔 판(엑셀 차시) · gen = 이름으로 등록된 생성기(코드 차시) */
export type Retry = { pool: Question[][] } | { gen: string; params?: Record<string, unknown> };

export interface MonsterPack {
  title: string;
  /** 배치표 이름:칸 (예: 'mimic:0') — 그림 파일 이름을 직접 쓰지 않음 */
  sprite: string;
  note?: string;
  /** 판 0 = 학습지 원문 · 판 1~ = 숫자 바꾼 문제. gen 이면 판 0 도 생성기가 만든다(정식과 같은 값) */
  first?: Question[];
  retry: Retry;
  /** ⚔ 소레이드 (졸개 → 대장 단계) — 방 version ≥ 3 이면 이 꼴로 진행 */
  /** 판 0 = 첫 판 · 1~ = 한 판 더. gen = 이름 등록 생성기 · pool = 미리 쓴 판(엑셀 · 가벼운 판 #135 ③) */
  chain?: { gen: string } | { pool: Question[][] };
  /** 문제 화면 위 💡 한 줄 */
  noteText?: string;
  special?: boolean;
  review?: boolean;
}

export interface Step {
  kind: 'intro' | 'concept' | 'monster' | 'boss';
  id: string;
  title: string;
  say?: string;
  img?: string;
  /** 다음 판에서 만들 자리 — 단계 목록에 보이고 진행은 건너뜀 */
  later?: boolean;
  /** ⏱ 예상 분 (#132 · 선생님 입력판) — 대기실 「오늘 흐름」 · TV 흐름도 */
  min?: number;
  /** 보강 · 복습 몬스터 (정식 special · review) */
  special?: boolean;
  review?: boolean;
}

/** 👑 보스(형성평가): 문항마다 시도 0 = 원문 · 1~ = 생성기 새 값 · 체력 = hpItems 기준 */
export interface BossPack {
  title: string;
  sprite: string;
  items: number;
  hpItems: number;
  /** 이름 등록 보스 생성기 (문항 번호, 시도, 난수) — 없으면 pool */
  gen?: string;
  /** 미리 쓴 재도전 판 (#135 ③ · 문항마다 판 목록 · 시도 a = pool[문항][(a − 1) % 판 수]) · 시도 0 = sets['1'] (없으면 pool[문항][0]) */
  pool?: Question[][];
  /** 문항별 개념 (개인 결과 · 복습 추천) */
  tags?: string[];
  /** 형성평가를 두 수업으로 나눌 때 이 수업의 첫 문항 번호 (원래 번호 i = first + 이 수업 번호 · 생성기 · 세트 · 재도전은 원래 번호 그대로) */
  first?: number;
  /** 정식 세트 (1 = 학습지 · 2 = 숫자 바꿈) — 데이터만 · 시도 0 = 세트 1 */
  sets?: Record<string, Question[]>;
}

export interface LessonPack {
  v: 1;
  id: string;
  no: number;
  title: string;
  unit: string;
  theme?: string;
  defaultPct: number;
  videos?: Record<string, string>;
  /** 🧩 #132 정식 차시에서 옮긴 칸 */
  sheet?: string;
  goal?: string;
  std?: string;
  /** 한 팩을 두 수업으로 (#132 · #149): from = 뒷수업 첫 칸 · boss = 형성평가를 나눌 때 뒷수업이 가질 문항 [시작, 끝) (앞수업 = [0, 시작)) */
  parts?: { no: number; from: string; title: string; boss?: number[] }[];
  /** 이 팩이 parts 로 나뉜 다른 팩의 뒷부분이면 그 팩 id (예: 7차시 = 6차시 팩의 문제 4부터) */
  partOf?: string;
  next?: { title: string; ask?: string; link?: string };
  crops?: Record<string, unknown>;
  /** 어디서 왔나: 정식 파일 · 커밋 · 입력판을 읽은 때 */
  source?: { file: string; commit: string; board: string | null };
  steps: Step[];
  monsters: Record<string, MonsterPack>;
  boss?: BossPack;
}

// ── 던전 「다른 점 표」 (설계서 5절 · 이번엔 수업 · 테스트 모드 두 값) ──
export interface DungeonProfile {
  key: 'class' | 'test' | 'board';
  label: string;
  /** 인원: 'class' = 접속한 학생 수 */
  players: 'class' | { fixed: number };
  concept: boolean;
  /** 재도전 횟수 (기회 = +1) */
  retries: number;
  /** 💚 힐로 받는 기회 상한 (몬스터마다) */
  healMax: number;
  /** 👑 보스 문항마다 기회 */
  bossTries: number;
  /** 체력 기준 % (null = 차시 팩 defaultPct) */
  pct: number | null;
  /** 정찰 초 */
  scoutSec: number;
  /** 틀린 뒤 생각 시간 초 */
  thinkSec: number;
  timeLimit: boolean;
  reward: { gem: number | 'earn'; scroll: number | 'earn' };
  storage: 'server' | 'device' | 'memory';
}

// ── 저장 꽂개 (서버 · 이 기기 · 메모리 — 이번엔 이 기기/두 탭만) ──
export type Unsub = () => void;
export interface Store {
  readonly kind: 'server' | 'device' | 'memory';
  get<T = unknown>(path: string): T | null;
  set(path: string, value: unknown): void;
  /** path 아래(자신 포함)가 바뀌면 부름. 처음 한 번 바로 부름 */
  watch<T = unknown>(path: string, fn: (v: T | null) => void): Unsub;
  now(): number;
}

// ── 방 상태 (정식 rooms/{code} 의 첫 한 바퀴에 필요한 부분) ──
export interface RoomPlayer { num: number; nick: string; seen: number; teacher?: boolean; /** 반 · 들어온 판(BUILD) — 🔄 옛 판 확인 */ cls?: string; ver?: string; /** 출전 용사 (TV 이름표 그림) */ hero?: number; /** 🧪 통계 · 체력 머릿수에서 빠짐 (베타 반 · 시험 계정 · #123) */ x?: boolean; /** 🔥 한 판 더 시작한 판 수 (소레이드) */ pr?: Record<string, number> }
/** ⚔ 소레이드 답 한 줄: s = 단계 · p = 판(0 진짜 · 1~ 연습) · g = 답 · w = 근거 빈칸 · ph = 서술형 통과 */
export interface ChainSub { s: number; p: number; g: Given | ''; w?: 1; ph?: 1 }
/** 방을 만들 때 다른 점 표에서 옮겨 적는 값 — 엔진은 이 값만 읽는다 (모드 이름으로 가르지 않음) */
export interface RoomRules {
  profile: DungeonProfile['key'];
  retries: number;
  healMax: number;
  bossTries: number;
  /** 정찰 초 (모든 몬스터 · 보스 앞) */
  solve: number;
  /** 틀린 뒤 생각 시간 초 (정식 meta.think 기본 5) */
  think: number;
  pct?: number;
}
export interface Room {
  meta: { code: string; lesson: string; version: number; created: number; deadline?: number | null; /** 반 · 종합실 키(숫자 4) */ cls?: string; key?: string; /** 수업 시간 제한(50분 · 교시 끝) */ limit?: boolean; /** ⏯ 이어서: 수업 시작 단계 · 숫자 바꾼 판으로 시작할 몬스터 */ resumeFrom?: number; fresh?: Record<string, boolean> } & RoomRules;
  /** step −1 = 입장(대기) · 0.. = 단계 · steps.length 이상 = 결과 */
  state: {
    step: number; stepAt: number; headcount?: number; solveEnd?: Record<string, number>;
    /** 🌫 정찰 늘리고 줄인 합(ms · 리모컨 ±30초) */ solveAdd?: Record<string, number>;
    /** ⏸ 집중 · 🏕 쉼터 = 게임 시계 멈춤 (#118) · holdAt = 멈추기 시작한 시각 · pauseMs = 이 단계에서 멈춘 합 */
    focus?: boolean; rest?: { at: number; min: number } | null; holdAt?: number | null; pauseMs?: number | null;
    /** ⏱ 수업 마감 시각 · 늘린 분 (정식 같은 이름 · 한 번) · 문 닫기 장면 */ deadline?: number | null; extend?: number; door?: { at: number; ask: boolean } | null; doorExt?: number | null;
    /** 🎬 영상 · 📄 문제 창 (단계 id) · 💬 TV 대기실 선생님 말 · 🎁 마지막 선물(TV 표시) · 🔄 새로 고침 보낸 시각 */
    video?: string | null; sheet?: string | null; bubble?: string | null; gift?: { at: number; n: number; g: number } | null; reload?: Record<string, number>;
    /** 수업 끝 (닫힘) · ⏯ 닫힌 그때 이어서 자리 */ closed?: boolean; stop?: { step: number; fresh: string | null; done: boolean } | null;
    /** 교실 TV: 교사 캠프 → 「⚔ 던전 입장」 누르면 던전 대기실 */ hall?: 'lobby' | null;
  };
  /** absent[uid] = 결석 (대기실에서 안 온 번호를 누름 · 인원에서 빠짐) */
  absent?: Record<string, boolean>;
  players?: Record<string, RoomPlayer>;
  /** subs[mid][uid][attempt] = 학생 답 배열 */
  subs?: Record<string, Record<string, Record<string, Given[]>>>;
  /** heals[mid][준 학생][k] = 받는 학생 (💚 힐 · 정식과 같은 꼴) */
  heals?: Record<string, Record<string, Record<string, string>>>;
  /** bossTry[uid][문항][시도] = 답 */
  bossTry?: Record<string, Record<string, Record<string, Given>>>;
  /** chain[mid][uid][k] = 소레이드 답 줄 */
  chain?: Record<string, Record<string, Record<string, ChainSub>>>;
  /** ready[몬스터 · boss][uid] = 정찰 「준비 완료」 */
  ready?: Record<string, Record<string, boolean>>;
  /** chainOk[mid][uid] = 선생님 「✔ 풀어주기」 */
  chainOk?: Record<string, Record<string, boolean>>;
}
