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
  say?: string;
  tag?: string;
}
export type Question =
  | (QBase & { type: 'choice'; choices: string[]; answerIndex: number; answer?: string })
  | (QBase & { type: 'ox'; answer: boolean })
  | (QBase & { type: 'number'; answer: number })
  | (QBase & { type: 'text'; answers: string[] })
  | (QBase & { type: 'multi'; options: string[]; answer: number[] })
  | (QBase & { type: 'blanks'; items: { left?: string; right?: string; answer: string }[]; options: string[] })
  | (QBase & { type: 'subsets'; base: number[] });

/** 학생 답 (형식별): choice = 번호 · ox = 참거짓 · number = 수 · text = 글 · multi = 번호 배열 · blanks = 기호 배열 · subsets = 부분집합 배열 */
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
}

export interface Step {
  kind: 'intro' | 'concept' | 'monster' | 'boss';
  id: string;
  title: string;
  say?: string;
  img?: string;
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
  steps: Step[];
  monsters: Record<string, MonsterPack>;
}

// ── 던전 「다른 점 표」 (설계서 5절 · 이번엔 수업 · 테스트 모드 두 값) ──
export interface DungeonProfile {
  key: 'class' | 'test';
  label: string;
  /** 인원: 'class' = 접속한 학생 수 */
  players: 'class' | { fixed: number };
  concept: boolean;
  /** 재도전 횟수 (기회 = +1) */
  retries: number;
  /** 체력 기준 % (null = 차시 팩 defaultPct) */
  pct: number | null;
  /** 정찰 초 */
  scoutSec: number;
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
export interface RoomPlayer { num: number; nick: string; seen: number; teacher?: boolean }
export interface Room {
  meta: { code: string; lesson: string; version: number; created: number; pct?: number };
  state: { step: number; headcount?: number };
  players?: Record<string, RoomPlayer>;
  /** subs[mid][uid][attempt] = 학생 답 배열 */
  subs?: Record<string, Record<string, Record<string, Given[]>>>;
}
