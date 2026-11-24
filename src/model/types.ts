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
  /** 📖 교과서 문항 번호 (🏰 성채 팩 · 덧칸 · 화면은 안 씀) */
  ref?: string;
  tag?: string;
  /** 💡 도움 3단 (📜 2026-11-15 · 팩 문항 선택 칸): 1단 concept(개념 한 줄) → 2단 first(빈칸 하나 남긴 풀이 첫 줄) → 3단 example(비슷한 예제 + 풀이) · 무료 · 기록만 */
  help?: Help;
  /** 🔎 익명 풀이 (📜 2026-11-15 · 팩 문항 선택 칸): 교사가 TV 에 띄우는 풀이 카드들 · lines = 풀이 줄 · focus = 「함께 살펴볼 줄」 번호(0부터) · ask = 질문 · wrong = 「검토할 풀이」 */
  review?: Review[];
  /** 🏷 문항 꼴 (📜 2026-11-16 · 도움 · 익명 풀이를 꼴별로: 몬스터 helps[꼴] · reviewsBy[꼴]) */
  kind?: string;
}
export interface ConceptCheck { type: 'ox' | 'choice'; q: string; ch?: string[]; a: number | boolean; why: string }
/** 💡 도움 3단 · first = 한 줄 또는 소문항마다 배열(첫 출제 판 숫자) · example.sol = 한 줄 또는 줄 배열 */
export interface Help { concept: string; first?: string | string[]; example?: { q: string; sol: string | string[] } }
/** 🔎 익명 풀이 · focus = 「함께 살펴볼 줄」 번호(1부터 · 13차시 덧칸 꼴) */
export interface Review { lines: string[]; focus?: number; ask?: string; wrong?: boolean }
export type Question =
  | (QBase & { type: 'choice'; choices: string[]; answerIndex: number; answer?: string })
  | (QBase & { type: 'ox'; answer: boolean })
  | (QBase & { type: 'number'; answer: number })
  | (QBase & { type: 'text'; answers: string[] })
  | (QBase & { type: 'multi'; options: string[]; answer: number[]; /** 두 칸 고르기 (칸 제목 · 보기 수) */ groups?: { label: string; n: number }[]; /** ∅ 단추 자리 (P8) */ empty?: number[] })
  | (QBase & { type: 'blanks'; items: { left?: string; right?: string; answer: string }[]; options: string[] })
  | (QBase & { type: 'subsets'; base: number[] })
  /** 🏹 대응 화살표 잇기 (과목 꼴 · SUBJ.formats.match): xs → ys · 정답 = 화살표 [X번, Y번] 목록(순서 무관) · alts = 정답 여러 벌일 때 나머지 벌 · xn · yn = 타원 이름 */
  | (QBase & { type: 'match'; xs: string[]; ys: string[]; answer: [number, number][]; alts?: [number, number][][]; xn?: string; yn?: string });

/** 학생 답 (형식별): choice = 번호 · ox = 참거짓 · number = 수 · text = 글 · multi = 번호 배열 · blanks = 기호 배열 · 과목 꼴 = 그 꼴이 정함(SUBJ.formats) */
export type Given = number | boolean | string | number[] | string[] | number[][] | null;

// ── 🧩 차시 팩 (설계서 6절 · 조사 #101 후보 1안) ──────────────
/** 숫자 바꾸기: pool = 미리 써 둔 판(엑셀 차시) · gen = 이름으로 등록된 생성기(코드 차시) */
export type Retry = { pool: Question[][] } | { gen: string; params?: Record<string, unknown> };

export interface MonsterPack {
  title: string;
  /** 💥 몬스터 공격 종류 (#152 · 공격 등록 표 raid/attacks.ts 의 id · 없으면 pause) */
  attack?: string;
  /** 배치표 이름:칸 (예: 'mimic:0') — 그림 파일 이름을 직접 쓰지 않음 */
  sprite: string;
  note?: string;
  /** 판 0 = 학습지 원문 · 판 1~ = 숫자 바꾼 문제. gen 이면 판 0 도 생성기가 만든다(정식과 같은 값) */
  first?: Question[];
  retry: Retry;
  /** 💡 도움 3단 · 🔎 익명 풀이 (📜 2026-11-15 · 13차시 덧칸 꼴 = 몬스터 칸 · 덧칸 파일의 review 배열 = 엔진 reviews · review(불) = 옛 「지난 시간 복습」 몬스터 표시와 이름이 겹쳐서) — 문항 칸 help · review 가 있으면 그것이 먼저 */
  help?: Help; reviews?: Review[];
  /** 💡 🔎 꼴별 (📜 2026-11-16 · 덧칸 helps · reviews{꼴}): 문항 kind 로 찾음 · 찾는 순서 = 문항 help → helps[꼴] → help */
  helps?: Record<string, Help>; reviewsBy?: Record<string, Review[]>;
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
  /** ✔ 개념 체크 (📜 2026-11-15 · 개념 단계 선택 칸): 리모컨 「✔ 개념 체크」를 누를 때만 학생 폰에 한 문제 · 30초 · 체력 · 데미지 · 보상 없음 */
  check?: ConceptCheck;
  /** ⏱ 예상 분 (#132 · 선생님 입력판) — 대기실 「오늘 흐름」 · TV 흐름도 */
  min?: number;
  /** 보강 · 복습 몬스터 (정식 special · review) */
  special?: boolean;
  review?: boolean;
}

/** 👑 보스(형성평가): 문항마다 시도 0 = 원문 · 1~ = 생성기 새 값 · 체력 = hpItems 기준 */
export interface BossPack {
  title: string;
  /** 💥 보스 공격 = 차례로 돌아감 (#152) */
  attack?: string[];
  sprite: string;
  items: number;
  hpItems: number;
  /** 이름 등록 보스 생성기 (문항 번호, 시도, 난수) — 없으면 pool */
  gen?: string;
  /** 미리 쓴 재도전 판 (#135 ③ · 문항마다 판 목록 · 시도 a = pool[문항][(a − 1) % 판 수]) · 시도 0 = sets['1'] (없으면 pool[문항][0]) */
  pool?: Question[][];
  /** 문항별 개념 (개인 결과 · 복습 추천) */
  tags?: string[];
  /** 👑 형성평가 짝 (📜 2026-11-17 #27): 문항마다 확인하는 몬스터 id · '' = 개념만(늘 남음) · tags 와 같은 길이 → 그 몬스터를 🎯 복습으로 보내면 이 반 수업 형성평가에서 빠짐 */
  links?: string[];
  /** 🎯 허수아비에서 고른 문항만 풀 때 = 원래 문항 번호 (#27 · 판 · 숫자 그대로) */
  pick?: number[];
  /** 형성평가를 두 수업으로 나눌 때 이 수업의 첫 문항 번호 (원래 번호 i = first + 이 수업 번호 · 생성기 · 세트 · 재도전은 원래 번호 그대로) */
  first?: number;
  /** 정식 세트 (1 = 학습지 · 2 = 숫자 바꿈) — 데이터만 · 시도 0 = 세트 1 */
  sets?: Record<string, Question[]>;
}

export interface LessonPack {
  v: 1;
  id: string;
  no: number;
  /** 👀 학생 캠프(게시판 · 허수아비 · 성채 목록)에서 숨김 · 수업 · 교사 화면은 그대로 (📜 2026-11-15 🗑 안전장치 ①) */ hide?: boolean;
  title: string;
  unit: string;
  theme?: string;
  defaultPct: number;
  videos?: Record<string, string>;
  /** 🎬 덧영상 = 칸마다 둘째 영상 (앱 안 video/ · school/video.ts ADDON_VIDS · 서버 팩에는 안 씀) */ addVids?: Record<string, string>;
  /** 🔑 입장 열쇠 = 선수 학습 점검 (📜 #59 · PACK-GUIDE 17 · school/keys.ts) */ keys?: { id: string; name: string; grade?: string; help: string; vers: Question[]; uses: { at: string; n: number }[] }[];
  /** 🧩 #132 정식 차시에서 옮긴 칸 */
  sheet?: string;
  goal?: string;
  std?: string;
  /** 한 팩을 두 수업으로 (#132 · #149): from = 뒷수업 첫 칸 · boss = 형성평가를 나눌 때 뒷수업이 가질 문항 [시작, 끝) (앞수업 = [0, 시작)) */
  parts?: { no: number; from: string; title: string; boss?: number[]; /** 💥 나눈 수업 보스 공격 (짝 표 「@번호」) */ attack?: string[] }[];
  /** 이 팩이 parts 로 나뉜 다른 팩의 뒷부분이면 그 팩 id (예: 7차시 = 6차시 팩의 문제 4부터) */
  partOf?: string;
  /** 📦 B 넘어온 몬스터 (school/carry.ts withCarry 가 붙임 · 단계 id → 원래 차시 · 몬스터) */
  carryOf?: Record<string, { from: string; mid: string }>;
  next?: { title: string; ask?: string; link?: string };
  crops?: Record<string, unknown>;
  /** 🖼 차시 팩 올리기: 학습지 칸 그림 목록(칸 = 단계 id 또는 단계 img) · imgOf = 그 그림을 가진 차시(prep/{imgOf}/img) */
  imgCells?: string[];
  imgOf?: string;
  /** ✂ 학습지 PDF 자동 자르기: 칸 → 찾을 글자 (단계 제목 · ★ · STEP 으로 못 찾는 칸만) */
  find?: Record<string, string>;
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
  /** 한 번 받아 오기 — 실시간 거울 밖 칸(prep 학습지 그림 등 · 서버만) · 없으면 get 과 같음 */
  fetch?<T = unknown>(path: string): Promise<T | null>;
  /** 써 보고 서버가 받았는지 (서버만 · 규칙에 막히면 false) */
  trySet?(path: string, value: unknown): Promise<boolean>;
  /** 그 칸 덩어리의 첫 값을 서버에서 받았는지 (서버만 · 🐞 11/19 ② 명단 받기 전 구별) */
  loaded?(path: string): boolean;
  /** 🐞 11/20 ② 수 칸에 더하기 (서버 = increment · 두 기기가 같이 써도 서로 지우지 않음) */
  add?(path: string, n: number): void;
  /** 🐞 11/20 ② 그 칸을 서버 최신 값에서 고쳐 씀 (서버 = transaction) · fn 이 undefined 를 돌려주면 그만둠 */
  tx?<T = unknown>(path: string, fn: (cur: T | null) => T | null | undefined, /** 기다릴 ms (기본 8000 · 0 = 서버 답이 올 때까지 · 🐞 #83-11 선물 받기) */ ms?: number): Promise<boolean>;
  /** 🐞 #83-12 서버 값과 합쳐 쓰기 (registerTx 로 등록한 kind · 보관함에 남아 끊겨도 다시 · 서버만) */
  merge?(path: string, v: unknown, kind: string): void;
}

// ── 방 상태 (정식 rooms/{code} 의 첫 한 바퀴에 필요한 부분) ──
export interface RoomPlayer { num: number; nick: string; seen: number; teacher?: boolean; /** 반 · 들어온 판(BUILD) — 🔄 옛 판 확인 */ cls?: string; ver?: string; /** 출전 용사 (TV 이름표 그림 · 🌟 #29 = 보이는 모습) */ hero?: number; /** 🌟 #29 고른 용사 (각성한 로안이면 0) */ base?: number; /** ⚔ 끼운 스킬 · 강화 (TV 공격 이펙트 · 오라 · 🔨 용사 fx) */ fx?: string; enh?: number; /** 🧪 통계 · 체력 머릿수에서 빠짐 (베타 반 · 시험 계정 · #123) */ x?: boolean; /** 🔥 한 판 더 시작한 판 수 (소레이드) */ pr?: Record<string, number> }
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
  meta: { code: string; lesson: string; version: number; created: number; deadline?: number | null; /** 반 · 종합실 키(숫자 4) */ cls?: string; key?: string; /** 수업 시간 제한(50분 · 교시 끝) */ limit?: boolean; /** ⏯ 이어서: 수업 시작 단계 · 숫자 바꾼 판으로 시작할 몬스터 */ resumeFrom?: number; fresh?: Record<string, boolean | number>; /** 🏰 성채 방 (📜 2026-11-14) = 틀린 소문제만 다음 판 숫자로 */ castle?: boolean; /** ⏱ 수업 시작 시각 (실측) */ t0?: number; /** ⚔ 선제 공격 (📜 2026-11-16 · school/pre.ts) */ pre?: { mid: string; fixed: number; who: number } } & RoomRules;
  /** step −1 = 입장(대기) · 0.. = 단계 · steps.length 이상 = 결과 */
  state: {
    step: number; stepAt: number; headcount?: number; solveEnd?: Record<string, number>;
    /** 🌫 정찰 늘리고 줄인 합(ms · 리모컨 ±30초) */ solveAdd?: Record<string, number>;
    /** ⏸ 집중 · 🏕 쉼터 = 게임 시계 멈춤 (#118) · holdAt = 멈추기 시작한 시각 · pauseMs = 이 단계에서 멈춘 합 */
    focus?: boolean; rest?: { at: number; min: number } | null; holdAt?: number | null; pauseMs?: number | null;
    /** 📊 길잡이 ⑤ TV 에 다시 띄운 개념 칸 (단계 id · 단계를 옮기면 null) */ recall?: string | null;
    /** ⏱ 수업 마감 시각 · 늘린 분 (정식 같은 이름 · 한 번) · 문 닫기 장면 */ deadline?: number | null; extend?: number; door?: { at: number; ask: boolean } | null; doorExt?: number | null;
    /** 🎬 영상 · 📄 문제 창 (단계 id) · 💬 TV 대기실 선생님 말 · 🎁 마지막 선물(TV 표시) · 🔄 새로 고침 보낸 시각 */
    /** ✔ 개념 체크 열림 (리모컨 · 30초 · 교사 일찍 닫기) = 단계 id · 연 시각 · 닫는 시각 */ cc?: { id: string; at: number; end: number } | null;
    /** 🎯 복습으로 보낸 몬스터 · 형성평가 (📜 2026-11-16) */ sent?: Record<string, number>;
    /** 🔎 익명 풀이 (📜 2026-11-15 · 리모컨 띄우기 / 내리기 · TV 양피지 카드) = 몬스터 · 문항 · 풀이 번호 */ review?: { mid: string; i: number; k: number } | null;
    video?: string | null; /** 📷 종합실 입장 QR (🔨 #9) */ qr?: boolean | null; sheet?: string | null; bubble?: string | null; gift?: { at: number; n: number; g: number } | null; reload?: Record<string, number>;
    /** 수업 끝 (닫힘) · ⏯ 닫힌 그때 이어서 자리 */ closed?: boolean; stop?: { step: number; fresh: string | null; done: boolean } | null;
    /** 교실 TV: 교사 캠프 → 「⚔ 던전 입장」 누르면 던전 대기실 */ hall?: 'lobby' | null;
  };
  /** absent[uid] = 결석 (대기실에서 안 온 번호를 누름 · 인원에서 빠짐) */
  absent?: Record<string, boolean>;
  /** ✅ 도장 (📜 2026-11-16 · 🌊 ⑤) stamp[uid] = 찍은 시각 · 한 수업에 한 번 · 📜 +1 은 gifts 로 */
  stamp?: Record<string, number>;
  /** 💬 마지막 한마디 (정식 rooms/{코드}/words/{학생} = { t, bad, n }) · hide = 선생님이 숨김 */ words?: Record<string, { t?: string; bad?: boolean | null; n?: number } | null>;
  wordHide?: Record<string, boolean>;
  players?: Record<string, RoomPlayer>;
  /** subs[mid][uid][attempt] = 학생 답 배열 */
  subs?: Record<string, Record<string, Record<string, Given[]>>>;
  /** heals[mid][준 학생][k] = 받는 학생 (💚 힐 · 정식과 같은 꼴) */
  heals?: Record<string, Record<string, Record<string, string>>>;
  /** bossTry[uid][문항][시도] = 답 */
  bossTry?: Record<string, Record<string, Record<string, Given>>>;
  /** v4 👑 형성평가 한 번 제출 = bossSub[uid][k] = { 문항: 시도 } (그 제출에 낸 문항들 · ❤ 셈 · 재도전 판) */
  bossSub?: Record<string, Record<string, Record<string, number>>>;
  /** chain[mid][uid][k] = 소레이드 답 줄 */
  chain?: Record<string, Record<string, Record<string, ChainSub>>>;
  /** ready[몬스터 · boss][uid] = 정찰 「준비 완료」 */
  ready?: Record<string, Record<string, boolean>>;
  /** chainOk[mid][uid] = 선생님 「✔ 풀어주기」 */
  chainOk?: Record<string, Record<string, boolean>>;
}
