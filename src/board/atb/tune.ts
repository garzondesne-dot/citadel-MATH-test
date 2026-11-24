// ⚙ 게시판 던전 ATB — 숫자 한 곳 (📜 2026-11-20 설계 방 · docs/board-atb/design/정리.md · 전투설정표-초안.md · 용사수치-초안.md 0절)
//   모든 숫자 = 「출발값」 · 교사 연습방에서 선생님이 3판 해 본 뒤 여기만 고침 · 화면 · 엔진은 이 파일만 읽음
//   ⏳ 아직 안 정한 값 = null 또는 TODO 줄(설계 방이 보냄): 1 · 2인 판 숫자 · 역할 스킬 넣은 모의실험 · 3 · 4 · 6 · 8 · 9 · 10차시 설정

export type Diff = 'easy' | 'normal' | 'hard';
export type Fam = 'arms' | 'flame' | 'nature' | 'wisdom' | 'mystic';
export type Role = 'dealer' | 'tank' | 'healer' | 'support';

/** 🎚 난이도 = 일반에 곱함 (📜 11/20 요청 #5 ④ 출발값): 연습 = HP ×0.8 · 공격 ×0.6 / 도전 = HP ×1.1 · 공격 ×1.1 */
export const DIFF_MUL: Record<Diff, { hp: number; hit: number }> = { easy: { hp: 0.8, hit: 0.6 }, normal: { hp: 1, hit: 1 }, hard: { hp: 1.1, hit: 1.1 } }; // 도전 = 출발 ×1.2 · ×1.3 → 80% 봇 승률이 너무 낮아(평균 60%대 · 0% 칸도) ×1.1 · ×1.1 (봇 평균 85%)
/** 일반 보스 HP 기본 (인원 1 · 2 · 3 · 4) · 차시별 값(T.bossHpByNo)이 없을 때만 */
export const BOSS_HP_BASE: [number, number, number, number] = [299, 650, 1235, 1950];
/** 일반 보스 공격 (단일 / 광역) · 인원 1 · 2 · 3 · 4 = 설정표 v3 × 0.7 (📜 요청 #5 ① 「모의실험4 다」) */
export const HIT_NORMAL: [number, number][] = ([[6, 3], [11, 5.5], [14, 7], [14, 7]] as [number, number][]).map(([a, b]) => [+(a * 0.7).toFixed(2), +(b * 0.7).toFixed(2)]);
export const BOSS_HIT: Record<Diff, [number, number][]> = Object.fromEntries((['easy', 'normal', 'hard'] as Diff[]).map((d) => [d, HIT_NORMAL.map(([a, b]) => [+(a * DIFF_MUL[d].hit).toFixed(2), +(b * DIFF_MUL[d].hit).toFixed(2)])])) as Record<Diff, [number, number][]>;
export const T = {
  bossEvery: 12, // 보스 공격 간격(초)
  telegraph: 4, // 표적 예고(초 전) · 📜 요청 #35 2 → 4 (예고 중 반응 막기)
  aoeEvery: 3, // 세 번째마다 광역
  shieldAt: 0.7, // 보스 HP 70% 에서 실드
  shieldDmg: 0.3, // 실드가 남은 동안 받는 피해 ×0.3 (11차시 두꺼비 = 0.2 · 보스 설정)
  weak: { normal: 12, hard: 10, easy: 12 } as Record<Diff, number>, // 약점 시간(초)
  weakDmg: 2, weakAtb: 2,
  slow: { normal: 3, hard: 4, easy: 3 } as Record<Diff, number>, stun: { normal: 2, hard: 3, easy: 2 } as Record<Diff, number>,
  slowX: 0.5, // 감속 = ATB 차는 빠르기 ×0.5
  revives: 3, // 팀 부활 한 판 3번
  reviveHp: 0.3, // ⏳ 부활 HP = 최대의 30% (설계안 「테스트로 정함」)
  reviveCost: 1, // (옛) ⚡ 1개로 살림
  /** 📜 #92 부활 = 팀 횟수 제한 없음 · 누구나 ⚡2(힐러 ⚡1) · 한 판에서 살릴 때마다 +1 (최대 충전 칸까지) · 패배 = 전멸만(혼자 = 내가 쓰러지면) */
  revive2: { base: 2, healer: 1, step: 0 }, // 📜 #101 덧 = 구슬 2 고정 · 힐러만 1 · 살릴 때마다 +1 없앰
  /** 📜 #92 10분 상한 (전투 시간 · 조우 · 정찰 빼고): 7:00 현자 경고 + 보스 공격 간격 ×0.8 · 9:00 「1분 뒤 포털」 + 셈 · 10:00 강제 귀환 = 후퇴 */
  cap: { warn: 360, call: 420, end: 480, every: 0.8 }, /* 📜 #108 덧 선생님 「8분」 = 6:00 보스 말풍선 · 7:00 1분 뒤 도망 · 8:00 도망 */
  shieldHelpAfter: 90, // 실드가 뜬 뒤 90초 지나도 남은 칸 = 다른 사람이 완주 2번으로 대신
  shieldHelpRuns: 1, // 📜 #95 도움표 1장 = 팀에 없는 속성 칸 하나
  wrongSwap: 4, // 4번째 오답 = 같은 원문항 새 숫자 판
  /** ⚡ 충전 (📜 11/20 Y1 · 결정 14절): 원문항(한 문제)을 통째로 맞혀야 충전 · 최대 3 · 퍼펙트(오답 없이) · 재시도(오답 있었음) = ⏳ 임시값(설계 방 최종값 오면 바꿈) */
  charge: { max: 4, perSub: 1, perfect: 1, autoGap: 0.6, perfectOld: 3, retry: 2, /** 📜 요청 #49 찍기 막기 = 소문항 틀린 횟수 → 충전 (0번 1 · 1번 ½ · 2번 이상 0) */ byMiss: [1, 0.5, 0] as readonly number[] }, // 📜 요청 #41 선생님 「소문항 한 개에 충전 칸 한 개」 = 소문항 맞힘마다 +1 · 오답 없이 원문항 끝 = +1 더 · 최대 4 · 넘침 자동 스킬 사이 0.6초 (perfectOld · retry = 옛 값 · 화면 표시 안 씀)
  hitLockMs: 1000, // 📜 요청 #20 ① 몬스터 공격에 맞으면 문제 카드 잠금 1초(보스 HP 절반 아래도 같음)
  lowHp: 0.3, // 📜 요청 #18 체력 30% 아래 = 위험(빨갛게 깜박 · 🆘) · #75 = 빨강 맥박 1.2초 · 헐떡임 · 내 화면 가장자리
  lowHp2: 0.15, lowBeat: 1.2, // 📜 요청 #75 15% 아래 = 가장자리 조금 진하게 · 맥박 주기(초)
  chargeStart: 1, // 📜 요청 #6 ③ 판 시작 때 모든 용사 충전 1칸
  autoAtkDelay: 1.0, // 📜 요청 #11 문제 카드를 연 채 ATB 가 차면 이만큼(초) 뒤 자동 일반 공격 · 그 사이 스킬을 톡 할 틈 // 📜 요청 #5 ① 확정 (Y1′ · 모의실험4 「다」)
  /** 💠 스킬 비용 (Y2) */
  cost: { shield: 1, equip: 1, role: 1, revive: 1, tier4: 2, aura: 2, awk: 3, heal: 1 }, // heal = 🩹 응급 힐 (요청 #46) // tier4 = 요청 #19 로 단추 없앰(Ⅳ 장착 = 장착 스킬 피해에 단계 보너스 · G.tier)
  /** 💥 스킬 피해 비 (Y11): 장착 1 · 4레벨 2.3 · 각성 3.8(판당 1번) + 역할 덧효과 그대로 */
  ratio: { equip: 1, tier4: 1.7, awk: 3.8 }, // 📜 #101 스킬 1 = 장착 ×1 · 구슬 1 · 스킬 2(tier4 키) = ×1.7 · 구슬 2 · 누구나
  /** 🛡 오라 방패 (Y12 · +10 · 판당 1번): 다음 보스 공격 1번 팀 전체 막음 + 보스 석화 ⏳ 임시 6초(선생님 확인 전) */
  aura: { stone: 6, chance: 0.3 }, // 📜 #101 홀리 방패 = 단추 없음 · +10 용사(각성 포함)가 맞기 직전 30% · 판당 1번 · 그 공격 팀 전체 막음 + 보스 6초 석화
  skillBase: 140, attackBase: 12, // 스킬 기본(장착 = 140 · 📜 모의실험4 「55 → 140」) · 일반 공격 기본
  timing: { miss: 0, ok: 1, crit: 1.5 }, // 일반 공격 타이밍 바
  /** ⏳ 타이밍 바 (📜 11/20 요청 #3 ⑥): 판마다 성공 칸 폭 · 치명 칸 폭 · 바늘 한 번 지나는 시간(ms) 을 이 범위에서 고르고 칸 자리도 무작위
   *    치명 = 성공 칸 안의 좁은 칸 · 끝 여백 edge 안쪽에만 놓음 */
  timingZone: { okW: [0.22, 0.4] as [number, number], critW: [0.06, 0.12] as [number, number], ms: [1000, 1700] as [number, number], edge: 0.06 },
  critAtb: 0.2, // 타이밍 치명 = 다음 ATB +20% 채운 채
  perfectAtb: 1, // 원문항을 오답 없이 끝냄 = 내 ATB 즉시 가득
  /** ❤ 일반 보스 HP 차시별 (인원 1 · 2 · 3 · 4 · 📜 요청 #5 ② 봇으로 맞춤) · 연습 · 도전 = × DIFF_MUL.hp */
  /* 📜 #107 (11/22 · 선생님 「한 판 3.5분 안」): 4인 칸 · bossAtkByNo = 머리 LEN-35 출발값 → 실제 꼴 400판으로 다시 맞춤 · 일반 승률 ~70% · 이긴 판 3.0 ~ 3.7분 · 도전 28 ~ 39% (docs/board-atb/TUNE-107.md)
     📜 #101 (11/22 · 규칙 확정판 위에서 다시) · #87 (11/21 밤): 4인 칸 = 실제 꼴(사람 1 ~ 4 + 빈 속성 봇 botHeroes 로 4) 평균 일반 ~70% · 도전 ~35% 로 다시 맞춤 · 학생 판은 늘 4명 = 4인 칸만 씀 */
  bossHpByNo: {
    2: [1030, 1560, 3970, 3402], 3: [930, 1560, 2680, 3628], 4: [1170, 1760, 2210, 2492], 5: [980, 2320, 2780, 4139],
    6: [770, 1220, 2040, 2190], 7: [760, 1320, 1930, 2137], 8: [930, 1650, 3240, 3610], 9: [850, 1320, 2850, 2777],
    10: [1190, 1630, 2120, 3339], 11: [930, 1610, 3080, 3100], 12: [1150, 1590, 3000, 3237], 13: [950, 1600, 2340, 3276],
    14: [880, 1500, 2190, 2856], 15: [930, 1780, 3100, 3817], 16: [770, 1300, 2850, 3302], 17: [870, 1480, 2570, 2876],
  } as Partial<Record<number, [number, number, number, number]>>, // 📜 요청 #57 설정표 v4 = 2 ~ 17 다시 맞춤(차례 고침 · 새 보스 · 12 ~ 17 문제 = 10차시 팩 대신) · 📜 요청 #49 찍기 막기 뒤 5분으로 되돌림(기본 피해 · 배율 · 체력 다시) · 요청 #46 황금 밸런스 2차 (차시 기본 피해 + 인원 배율 1 ~ 2 · 한 방 상한 60% · 봇 응급 힐 35% · 일반 3 · 4인 승률 70% / 1 · 2인 65% · 판 1인 3 · 2인 3.5 · 3인 4.5 · 4인 5분)
  /** 🔥 도전 HP 배율 차시별 (인원 1 · 2 · 3 · 4 · 📜 요청 #71 선생님 「도전 4인 승률 30 ~ 40%」 · 1 ~ 3인도 같은 쪽 · 봇으로 맞춤 · 없으면 1) */
  hardHpByNo: {
    2: [1.12, 0.93, 0.66, 1.11], 3: [1.06, 0.91, 0.89, 1.09], 4: [1.06, 1.14, 1.14, 2.07], 5: [1.19, 0.91, 0.9, 1.09],
    6: [1.2, 1.07, 0.85, 1.72], 7: [1.18, 0.94, 0.84, 1.32], 8: [1.23, 0.98, 0.82, 1.07], 9: [1.04, 1.05, 0.78, 1.61],
    10: [1.04, 1.06, 0.88, 1.17], 11: [1.09, 0.92, 0.8, 1.04], 12: [1.01, 0.99, 0.73, 1.57], 13: [1.07, 0.87, 0.78, 1.19],
    14: [1.15, 0.93, 0.82, 1.21], 15: [1.14, 0.87, 0.81, 1.15], 16: [1.04, 0.94, 0.87, 1.16], 17: [1.11, 0.86, 0.91, 1.49],
  } as Partial<Record<number, [number, number, number, number]>>, // 봇 200판: 4인 31 ~ 43% · 1 ~ 3인 28 ~ 45% (× DIFF_MUL.hard.hp 1.1 위에) · 📜 11/24 선생님 「지금 표 그대로」(DECISIONS 7968385) = 정답률 80% 봇 4인 도전 70 ~ 85% → 3 · 4 · 6 · 9 차시 4인 칸만 다시 맞춤(tools/sim/atb-hard80.ts · docs/board-atb/TUNE-1124.md)
  /** 👹 보스 기본 피해 차시별 (📜 요청 #46 선생님 고름 2026-11-21 ②) = 피해 있는 공격 모두에 곱함 · 피해 0 공격(수면 · 물결 · 어둠 · 거울빛)이 많은 차시는 크게 → 아래 인원 배율은 1 ~ 2배 안 */
  bossAtkByNo: { 2: 0.96, 3: 1.07, 4: 2.24, 5: 1.28, 6: 1.9, 7: 1.85, 8: 1.9, 9: 1.82, 10: 2.53, 11: 1.69, 12: 2.54, 13: 1.63, 14: 1.83, 15: 1.09, 16: 1.59, 17: 1.99 } as Partial<Record<number, number>>,
  /** 🛡 보스 한 번 공격 피해 상한 = 그 용사 최대 체력의 60% (요청 #46 ① · 광역 · 분노 포함 · 반응 막기 · 결계 · 엄호 계산 뒤) = 한 방 쓰러짐 없음 */
  oneHitCap: 0.6,
  /** 👹 보스 공격 배율 차시별 (인원 1 · 2 · 3 · 4 · 📜 요청 #5 ③ 「HP 만으로 안 맞으면 그 보스 공격 숫자」 · 없으면 1) */
  bossHitByNo: {
    2: [1, 1, 1.62, 1.99], 3: [1.33, 1, 1.73, 1.76], 4: [1, 1, 1.93, 2], 5: [1.31, 1, 1.64, 1.55],
    6: [1, 1, 1.82, 2], 7: [1, 1.01, 1.89, 2], 8: [1.35, 1, 1.7, 1.64], 9: [1, 1, 1.65, 2],
    10: [1.1, 1, 1.8, 1.73], 11: [1, 1, 1.78, 2], 12: [1, 1, 1.89, 2], 13: [1, 1, 1.92, 2],
    14: [1, 1, 1.92, 2], 15: [1, 1, 1.82, 1.94], 16: [1, 1, 1.66, 2], 17: [1, 1, 2, 2],
  } as Partial<Record<number, [number, number, number, number]>>,
  downedAtbGift: 0.5, // 쓰러진 학생이 문제를 맞힘 = 고른 친구 ATB +50%
  role: {
    dealer: { hp: 1.0, def: 0, spd: 1.0, smash: 1.5 },
    tank: { hp: 1.3, def: 0.2, spd: 0.9, cover: 0.5 },
    healer: { hp: 0.9, def: 0, spd: 0.95, big: 0.9, atkHeal: 0.05, skillCost: 1, skillMul: 1, /* 📜 #101 힐러도 스킬 1 · 2 같은 구조 (전: 공격 스킬 구슬 2 · ×1.6) */ rescueAt: 0.3 }, // 📜 요청 #46 (선생님 2026-11-21) 💚 큰 힐 = 한 명 최대 체력 90% · 일반 공격 맞힘 = 팀 모두 5% · 공격 스킬 ⚡2 ×1.6 · 30% 아래 친구 살림 = 구조 (옛 +12 · 보스 공격 사이 1번 없앰)
    support: { hp: 0.95, def: 0, spd: 1.1 },
  },
  atbSec: 8, defCap: 0.4, crit: 1.5,
  awk: { dealerWeak: 3, tankCut: 0.3, healerBig: 0.15, supportAtb: 0.3, enhBonus: 0.03 }, // healerBig = 각성 힐러 큰 힐 +15%p (요청 #46 · 옛 팀 +15 옮김)
  /** 🩹 응급 힐 (요청 #46) = 힐러 아닌 용사 · ⚡1 · ATB · 고른 한 명(나 포함) 최대 체력 1/3 · 쓰러진 친구 안 됨 */
  firstAid: 1 / 3,
  practiceKeep: 5, // 교사 연습방 = 이 폰 최근 5판
} as const;

/** 성장 식 = 로그 (용사수치 초안 0절): 몫(x) = 기준 몫 × ln(1 + x) ÷ ln(1 + 기준 x) */
const logShare = (base: number, x: number, at: number) => (x <= 0 ? 0 : (base * Math.log(1 + x)) / Math.log(1 + at));
export const G = {
  lv: (lv: number) => logShare(0.2, Math.max(1, lv) - 1, 9), // Lv.10 → +20%
  enh: (e: number) => logShare(0.3, Math.max(0, e), 10) + (e >= 10 ? T.awk.enhBonus : 0), // +10 → +30% (+각성 3%)
  tier: (t: number) => logShare(0.25, Math.max(1, t) - 1, 3), // Ⅳ → +25%
  spd: (lv: number) => logShare(0.1, Math.max(1, lv) - 1, 9), // Lv.10 → ATB +10%
  grit: (n: number) => logShare(0.1, Math.max(0, n), 100), // 🛡 끈기 100 → 방어 +10%
  focus: (n: number) => logShare(0.2, Math.max(0, n), 100), // 🎯 집중 100 → 치명 +0.2
};

/** 5계열 (속성 → 계열) */
export const FAM_OF_ATTR: Record<string, Fam> = { cut: 'arms', smash: 'arms', sweep: 'arms', fire: 'flame', spark: 'flame', water: 'nature', frost: 'nature', wind: 'nature', magic: 'wisdom', math: 'wisdom', gear: 'wisdom', sun: 'mystic', dark: 'mystic', star: 'mystic' };
export const FAM_NAME: Record<Fam, string> = { arms: '무기', flame: '화염', nature: '자연', wisdom: '지혜', mystic: '신비' };
export const ROLE_NAME: Record<Role, string> = { dealer: '딜러', tank: '탱커', healer: '힐러', support: '서포터' };
export const ROLE_SKILL: Record<Role, string> = { dealer: '강타', tank: '엄호', healer: '힐', support: '격려' }; // 📜 요청 #17 힐러 = 레이드와 같은 「💚 힐」
/** 용사 → 역할 (설계안 v1 2절 표 · 33칸 · 각성 로안 = 로안 · 올드윈 = 서포터) */
const ROLE_BY_NAME: Record<string, Role> = {
  로안: 'dealer', 리아넬: 'dealer', 바루: 'dealer', 바르코: 'dealer', 녹스: 'dealer', 이그니: 'dealer', 케라운: 'dealer', 칼시: 'dealer', 아르발: 'dealer', 호버: 'dealer',
  시엔: 'tank', 하스타: 'tank', 보르간: 'tank', 발도르: 'tank', 에이라: 'tank',
  루멘: 'healer', 파셀: 'healer', 타미: 'healer', 칸델: 'healer',
  누아: 'support', 셰라: 'support', 리라: 'support', 글라세: 'support', 한수: 'support', 미지: 'support', 볼트: 'support', 핑: 'support', 아바쿠: 'support', 콤파: 'support', 마진: 'support', 폴라: 'support', 올드윈: 'support',
};
export const roleOfName = (name: string): Role => ROLE_BY_NAME[name] ?? 'dealer';

/** 보스 설정 (차시 번호 → 몬스터) · 📜 설정표 v3 「차시별 한눈에」 · 선생님 확정 11/20 (대표 행동 9) · 숫자 = 어림값(연습방에서 맞춤)
 *  cycle = 공격 차례(되풀이) · tele = 표적 보여 주는 꼴(foot 발밑 · gaze 고개 돌리기 · scale 기우는 저울) · sig = 대표 행동 */
export type AtkKind = 'basic' | 'smash' | 'poison' | 'sleep' | 'fire' | 'fire13' | 'fog' | 'tongue' | 'ice' | 'confuse' | 'frost' | 'tail' | 'dark' | 'darkHit' | 'mirror' | 'bind' | 'scale' | 'aoe'
  /* 📜 요청 #57 설정표 v4 */ | 'pounce' | 'mace' | 'scaleAoe' | 'swallow' | 'falseHyp' | 'steam' | 'hammer' | 'reverse' | 'whip' | 'meteor' | 'breathAtk';
/** 대표 행동 · v4 새로: contra 12 거짓 가정 · eqMoment 13 등호의 순간 · chain 14 x 를 넣으면 y · order 15 하나씩 차례로 · compose 16 두 번 이어 치기 · inverse 17 되돌리기 */
export type Sig = 'footTarget' | 'gaze' | 'iceArmor' | 'fireBreath' | 'breath' | 'mirror' | 'lock' | 'scale' | 'ripple' | 'contra' | 'eqMoment' | 'chain' | 'order' | 'compose' | 'inverse';
/** 👹 차시별 분노 (📜 요청 #57 · 설정표 v4 2절) = 공통 분노 위에 한 가지 · 일반 · 도전만 (연습 = 공통 분노만)
 *  two = 그 공격이 두 명(둘째 ×mul) · late = 마지막 n초에 표적(저울 = 기울기) 다시 정함 · refreeze = 분노 들 때 마지막으로 깬 실드 칸 다시 얼음
 *  swap = 분노 차례에서 공격 바꿈 · cycle = 분노 차례 통째로(뒤에 특수 하나 붙음) · breathEvery = 숨 고르기 간격 · mirrorBack = 거울 되돌림 몫
 *  after = 그 공격 바로 뒤 이어 씀(low = 느려진 용사 중 HP 가장 낮은 한 명) · cutPct = 거짓 가정 끊기 몫 · eqSec = 등호의 순간 초
 *  orderRev = 차례 거꾸로 · markMax = 표식 겹 · revPct = 되돌리기 몫 */
export interface RageMod { two?: { kinds: AtkKind[]; mul: number }; late?: number; refreeze?: boolean; swap?: Partial<Record<AtkKind, AtkKind>>; cycle?: AtkKind[]; breathEvery?: number; mirrorBack?: number;
  after?: { on: AtkKind; then: AtkKind; low?: boolean }; cutPct?: number; eqSec?: number; orderRev?: boolean; markMax?: number; revPct?: number }
export type MonPoseK = 'idle' | 'attack' | 'hit' | 'down';
export interface BossCfg { no: number; name: string; sprite: string; /** 🛡 📜 #95 실드 4칸 속성 (보스가 정함 · 약점 계열 둘 포함 · 다섯 중 하나 뺌) */ shield?: Fam[]; /** 🔄 그림이 오른쪽을 보는 자세 = 좌우 반전 (몬스터는 늘 왼쪽 · 용사 쪽을 봄 · 📜 11/20 선생님 「2차시 흑표범 방향 반대」) */ flip?: Partial<Record<MonPoseK, boolean>>;
  weak: [Fam, Fam]; type: string; cycle: AtkKind[]; tele: 'foot' | 'gaze' | 'scale'; sig: Sig; signature: string; shieldDmg?: number; draft?: boolean;
  /** 이 보스의 공격 이름 (같은 종류 · 다른 이름 · v4) */ names?: Partial<Record<AtkKind, string>>; /** 분노 들어갈 때 · 분노 차례에 붙는 특수 */ rageSpecial?: AtkKind; /** 차시별 분노 */ rageMod?: RageMod; /** 🏰 성채 레이드 층 보스 */ raid?: RaidCfg }
export const BOSSES: Record<number, BossCfg> = {
  // 📜 요청 #57 설정표 v4: 차례 고침(모든 보스가 🎯 단일 · 💥 광역 · 🌀 특수를 다 씀) · 약점 = 5계열 6 ~ 7번씩 고르게 · 차시별 분노(rageMod)
  2: { no: 2, name: '숲의 수호자 흑표범', sprite: 'cm5-a:0', weak: ['arms', 'flame'], type: '공격형', cycle: ['smash', 'pounce', 'poison'], tele: 'foot', sig: 'footTarget', signature: '강타 표적', rageSpecial: 'pounce', rageMod: { two: { kinds: ['smash'], mul: 0.7 } } },
  3: { no: 3, name: '포함의 성주 보라 드래곤', sprite: 'cm5-a:1', weak: ['nature', 'mystic'], type: '공격형', cycle: ['smash', 'fire13', 'fire'], tele: 'gaze', sig: 'gaze', signature: '고개 돌리기', names: { fire: '화염 숨 모으기' }, rageSpecial: 'fire', rageMod: { late: 2 } },
  4: { no: 4, name: '서리 늑대', sprite: 'cm5-a:2', weak: ['flame', 'wisdom'], type: '방어형', cycle: ['ice', 'confuse', 'aoe'], tele: 'foot', sig: 'iceArmor', signature: '얼음 갑옷', shieldDmg: 0.2, rageSpecial: 'confuse', rageMod: { refreeze: true } },
  5: { no: 5, name: '흑요석 미노타우로스', sprite: 'cm5-a:3', weak: ['nature', 'wisdom'], type: '공격형(광역)', cycle: ['sleep', 'smash', 'fire'], tele: 'foot', sig: 'fireBreath', signature: '화염 숨 모으기', rageSpecial: 'fire', rageMod: { swap: { sleep: 'fire' } } },
  6: { no: 6, name: '청록 드래곤', sprite: 'cm5-a:4', weak: ['arms', 'flame'], type: '회복형', cycle: ['tail', 'frost', 'breathAtk'], tele: 'foot', sig: 'breath', signature: '숨 고르기', rageSpecial: 'breathAtk', rageMod: { breathEvery: 20 } },
  7: { no: 7, name: '청록 드래곤', sprite: 'cm5-a:4', weak: ['arms', 'flame'], type: '회복형', cycle: ['tail', 'frost', 'breathAtk'], tele: 'foot', sig: 'breath', signature: '숨 고르기 (6차시 이어하기)', rageSpecial: 'breathAtk', rageMod: { breathEvery: 20 } },
  8: { no: 8, name: '부정의 수정 여왕', sprite: 'cm5-b:0', weak: ['arms', 'mystic'], type: '교란형', cycle: ['ice', 'darkHit', 'mirror'] /* 📜 요청 #46 선생님 2026-11-21 어둠 = 광역 피해 + 느려짐 (전 dark) */, tele: 'foot', sig: 'mirror', signature: '거울빛', rageSpecial: 'mirror', rageMod: { mirrorBack: 0.4, after: { on: 'mirror', then: 'darkHit' } } },
  9: { no: 9, name: '열쇠 금고 문지기', sprite: 'cm5-b:1', weak: ['wisdom', 'flame'], type: '방어형(속박)', cycle: ['bind', 'mace', 'darkHit'], tele: 'foot', sig: 'lock', signature: '자물쇠', rageSpecial: 'bind', rageMod: { two: { kinds: ['bind'], mul: 1 } } },
  10: { no: 10, name: '필요충분의 천칭 수호자', sprite: 'cm5-b:2', weak: ['mystic', 'arms'], type: '교란형', cycle: ['scale', 'bind', 'scaleAoe'], tele: 'scale', sig: 'scale', signature: '기우는 저울', rageSpecial: 'bind', rageMod: { late: 2 } },
  11: { no: 11, name: '거울 웅덩이 두꺼비', sprite: 'cm5-b:3', weak: ['flame', 'nature'], type: '방어형', cycle: ['tongue', 'fog', 'swallow'], tele: 'foot', sig: 'ripple', signature: '물결', shieldDmg: 0.2, rageSpecial: 'swallow', rageMod: { after: { on: 'fog', then: 'tongue', low: true } } },
  12: { no: 12, name: '모순의 촛대 유령', sprite: 'd08:2', weak: ['nature', 'mystic'], type: '교란형', cycle: ['basic', 'darkHit', 'falseHyp'], tele: 'foot', sig: 'contra', signature: '거짓 가정', names: { basic: '촛농 튀기기' }, rageSpecial: 'falseHyp', rageMod: { cutPct: 0.06 } },
  13: { no: 13, name: '언제나 참인 별자리 사슴', sprite: 'd09:3', weak: ['wisdom', 'nature'], type: '방어형', cycle: ['mace', 'frost', 'sleep'], tele: 'foot', sig: 'eqMoment', signature: '등호의 순간', shieldDmg: 0.2, names: { mace: '뿔 받기', frost: '별가루', sleep: '별빛 잠' }, rageSpecial: 'sleep', rageMod: { eqSec: 2, swap: { frost: 'meteor' } } },
  14: { no: 14, name: '대응의 사슬 문지기', sprite: 'd12:2', weak: ['wisdom', 'flame'], type: '속박형', cycle: ['whip', 'aoe', 'bind'], tele: 'foot', sig: 'chain', signature: 'x 를 넣으면 y', names: { aoe: '사슬 휩쓸기', bind: '한 줄 대응' }, rageSpecial: 'bind', rageMod: { two: { kinds: ['bind'], mul: 1 } } },
  15: { no: 15, name: '그래프 능선의 용', sprite: 'd02:4', weak: ['nature', 'mystic'], type: '공격형(차례 읽기)', cycle: ['smash', 'fire13', 'smash', 'fire'], tele: 'foot', sig: 'order', signature: '하나씩 차례로', names: { fire: '능선 불길' }, rageSpecial: 'fire', rageMod: { orderRev: true, cycle: ['smash', 'smash', 'fire13', 'smash', 'smash'] } },
  16: { no: 16, name: '합성의 대기관', sprite: 'd07:3', weak: ['wisdom', 'arms'], type: '연계형', cycle: ['steam', 'hammer', 'aoe', 'bind'], tele: 'foot', sig: 'compose', signature: '두 번 이어 치기 (g∘f)', names: { aoe: '톱니 폭풍', bind: '톱니 물림' }, rageSpecial: 'bind', rageMod: { markMax: 2, cycle: ['steam', 'hammer', 'hammer', 'aoe'] } },
  17: { no: 17, name: '역함수의 거울 군주', sprite: 'd10:3', weak: ['mystic', 'arms'], type: '반사형', cycle: ['whip', 'darkHit', 'reverse'], tele: 'foot', sig: 'inverse', signature: '되돌리기 (f⁻¹)', names: { whip: '거울 조각' }, rageSpecial: 'reverse', rageMod: { revPct: 0.5 } },
};
/** 🛡 📜 #95 실드 = 속성 칸 4개 (선생님 「보스가 정함 · 도움표로 깨기」) · 약점 계열 둘 + 나머지 셋 중 둘 (보스 컨셉에 안 맞는 하나를 뺌) · 주인 없음
 *  같은 속성 용사 누구나 ⚡1 로 깸 · 약점 계열 용사 = 같은 칸 + 아무 칸 하나 · 팀에 그 속성이 없거나 다 쓰러짐 = 📜 도움표(실드 중 원문항 완주 1장) */
export const SHIELD: Record<number, Fam[]> = {
  2: ['arms', 'flame', 'wisdom', 'mystic'], 3: ['nature', 'mystic', 'arms', 'wisdom'], 4: ['flame', 'wisdom', 'arms', 'mystic'], 5: ['nature', 'wisdom', 'arms', 'mystic'],
  6: ['arms', 'flame', 'wisdom', 'mystic'], 7: ['arms', 'flame', 'wisdom', 'mystic'], 8: ['arms', 'mystic', 'flame', 'wisdom'], 9: ['wisdom', 'flame', 'nature', 'mystic'],
  10: ['mystic', 'arms', 'flame', 'nature'], 11: ['flame', 'nature', 'arms', 'wisdom'], 12: ['nature', 'mystic', 'arms', 'wisdom'], 13: ['wisdom', 'nature', 'arms', 'flame'],
  14: ['wisdom', 'flame', 'nature', 'mystic'], 15: ['nature', 'mystic', 'arms', 'wisdom'], 16: ['wisdom', 'arms', 'nature', 'mystic'], 17: ['mystic', 'arms', 'flame', 'nature'],
};
for (const [n, f] of Object.entries(SHIELD)) { const b = BOSSES[Number(n)]; if (b) b.shield = f; }

/** 🏰 성채 레이드 (📜 11/24 선생님 · DECISIONS 7968385 · 14415bc · 설계 castle-raid/DESIGN-v1 10절 컨펌 8 그대로)
 *  실드 2막(80% 3칸 ×0.3 → 50% 4칸 ×0.2) · 2막이 뜨는 순간 분노 · 큰 구슬(첫 시도 +2 · 한 번 틀림 +1 · 두 번 이상 0) · 보스 공격 ×1.1 · 체력 ×1.5 · 도망 10분
 *  🕯 균열 = 사람마다 그 층에서 지거나 도망친 횟수 · 판 = 들어온 사람 중 가장 큰 균열 · 한 번에 체력 −10% (최대 −30%) · 이기면 0 · 균열로 이긴 판 ⭐ 최대 2 */
export interface RaidAct { at: number; fams: Fam[]; dmg: number; rage?: boolean }
export interface RaidCfg { floor: 1 | 2 | 3; pack: string; acts: [RaidAct, RaidAct] }
export const RAID = {
  orb: [2, 1, 0] as readonly number[],
  atk: 1.1, hp: 1.5,
  /** 층마다 체력 맞춤 (봇 보통 50% · 일반 70% · 이긴 판 5.5 ~ 6분 · tools/sim/atb-raid.ts) */
  floorHp: { 1: 2.03, 2: 1.82, 3: 2.22 } as Record<1 | 2 | 3, number>,
  /** 층마다 공격 (📜 11/24 선생님 A · DECISIONS 274cb46 · ×1.1 위에 곱함 = 1층 ×0.66 · 2층 ×1.43 · 3층 ×0.88 · docs/board-atb/TUNE-RAID-1124.md) */
  floorAtk: { 1: 0.6, 2: 1.3, 3: 0.8 } as Record<1 | 2 | 3, number>,
  cap: { warn: 420, call: 540, end: 600, every: 0.8 }, // 7:00 경고 · 9:00 1분 뒤 · 10:00 도망
  crack: { step: 0.1, max: 0.3, star: 2 },
  no: { 1: 101, 2: 102, 3: 103 } as Record<1 | 2 | 3, number>,
};
/** 🏰 층 보스 3 (이름 = 컨펌 8 · 그림 = ⏳ 임시: 지금 보스 시트 + 붉은 빛 · 선생님 14415bc ④) */
export const RAID_BOSSES: Record<1 | 2 | 3, BossCfg> = {
  1: { no: 101, name: '겹침의 성문지기', sprite: 'bg2:0', weak: ['arms', 'wisdom'], type: '레이드', cycle: ['smash', 'aoe', 'poison'], tele: 'foot', sig: 'footTarget', signature: '실드 2막',
    raid: { floor: 1, pack: 'eval-1', acts: [{ at: 0.8, fams: ['arms', 'wisdom', 'nature'], dmg: 0.3 }, { at: 0.5, fams: ['flame', 'mystic', 'wisdom', 'arms'], dmg: 0.2, rage: true }] } },
  2: { no: 102, name: '참과 거짓의 쌍두 기사', sprite: 'bg3:0', weak: ['flame', 'mystic'], type: '레이드', cycle: ['mace', 'confuse', 'aoe'], tele: 'foot', sig: 'footTarget', signature: '실드 2막',
    raid: { floor: 2, pack: 'eval-2', acts: [{ at: 0.8, fams: ['flame', 'mystic', 'arms'], dmg: 0.3 }, { at: 0.5, fams: ['wisdom', 'nature', 'mystic', 'flame'], dmg: 0.2, rage: true }] } },
  3: { no: 103, name: '증명의 용왕', sprite: 'bg2:3', weak: ['nature', 'wisdom'], type: '레이드', cycle: ['fire', 'tail', 'aoe'], tele: 'foot', sig: 'footTarget', signature: '실드 2막',
    raid: { floor: 3, pack: 'eval-3', acts: [{ at: 0.8, fams: ['nature', 'wisdom', 'flame'], dmg: 0.3 }, { at: 0.5, fams: ['arms', 'mystic', 'nature', 'wisdom'], dmg: 0.2, rage: true }] } },
};
for (const b of Object.values(RAID_BOSSES)) b.shield = b.raid!.acts[1].fams;
/* 🏰 층 보스 기본 체력 · 공격 = 일반 차시 평균 × 1.5 · × 1.1 (인원 칸 4개 · 층 맞춤 RAID.floorHp 는 판 시작 때 곱함) */
{
  const avg = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length), nos = Object.keys(T.bossHpByNo).map(Number).filter((n) => n < 100);
  for (const f of [1, 2, 3] as const) {
    const no = RAID.no[f];
    T.bossHpByNo[no] = [0, 1, 2, 3].map((i) => Math.round(avg(nos.map((n) => T.bossHpByNo[n]![i]!)) * RAID.hp)) as [number, number, number, number];
    T.bossAtkByNo[no] = +(avg(nos.map((n) => T.bossAtkByNo[n] ?? 1)) * RAID.atk * RAID.floorAtk[f]).toFixed(2);
    T.bossHitByNo[no] = [0, 1, 2, 3].map((i) => +avg(nos.map((n) => T.bossHitByNo[n]?.[i] ?? 1)).toFixed(2)) as [number, number, number, number];
  }
}
/** 🕯 균열 체력 배율 (사람마다 균열 n → 판 = 가장 큰 값) */
export const crackMul = (n: number) => 1 - Math.min(RAID.crack.max, Math.max(0, n) * RAID.crack.step);
/** 실드 칸 속성 (설정 없으면 약점 둘 + 나머지 앞 둘) */
/** 📜 #101 실드 = 2칸 = 보스 약점 계열 2개 (SHIELD 표 앞 둘과 같음) */
export const shieldOf = (b: BossCfg): Fam[] => b.weak.slice(0, 2);
export const shieldOf4 = (b: BossCfg): Fam[] => b.shield ?? [...b.weak, ...(['arms', 'flame', 'nature', 'wisdom', 'mystic'] as Fam[]).filter((f) => !b.weak.includes(f))].slice(0, 4);
/** 공격 종류 → 효과 (배율 = 그 판 기본 단일 · 광역 값에 곱 · 0 = HP 피해 없음) · 설계안 5절 묶음: HP · HP+감속 · 감속 · 행동 불능 */
export const ATK: Record<AtkKind, { name: string; mul: number; aoe?: boolean; status?: 'slow' | 'stun'; wake?: boolean; split?: number; warn?: number; special?: 'mirror' | 'scale' | 'breath' | 'contra' | 'reverse' | 'hammer'; /** 행동 불능 초 (없으면 T.stun) */ stunSec?: number; /** 🔩 맞은 용사에게 표식 (16) */ mark?: boolean }> = {
  basic: { name: '공격', mul: 1 },
  aoe: { name: '광역', mul: 1, aoe: true },
  smash: { name: '강타', mul: 1.5 },
  poison: { name: '독', mul: 1, aoe: true, split: 3 },
  sleep: { name: '수면', mul: 0, status: 'stun', wake: true }, // 맞으면 깸
  fire: { name: '화염 숨', mul: 1.5, aoe: true, warn: 4 }, // 5차시 · 예고 중 실드를 다 깨면 취소
  fire13: { name: '화염', mul: 1.3, aoe: true },
  fog: { name: '물결', mul: 0.5, aoe: true, status: 'slow' }, // 📜 #57 차례 고침 = 피해 ×0.5
  tongue: { name: '혀 치기', mul: 1 },
  ice: { name: '얼음', mul: 1, status: 'slow' },
  confuse: { name: '혼란', mul: 0, status: 'slow' },
  frost: { name: '냉기', mul: 1, aoe: true, status: 'slow' },
  tail: { name: '꼬리치기', mul: 1 },
  dark: { name: '어둠', mul: 0, aoe: true, status: 'slow' },
  darkHit: { name: '어둠', mul: 1, aoe: true, status: 'slow' }, // 📜 11/20 요청 #6 ① 9차시 = 광역 피해 + 느려짐(T.slow) · 8차시 어둠은 그대로(피해 0)
  mirror: { name: '거울빛', mul: 0, aoe: true, warn: 4, special: 'mirror' },
  bind: { name: '속박', mul: 0, status: 'stun' },
  scale: { name: '저울', mul: 1, status: 'slow', special: 'scale' }, // 기울면 단일(그 쪽 용사) · 수평이면 광역
  // 📜 요청 #57 설정표 v4 (🌀 특수 = warn 4 · 딜러가 끊음)
  pounce: { name: '포효 도약', mul: 2, warn: 4 }, // 2 · 단일 ×2
  mace: { name: '철퇴', mul: 1.3 }, // 9 · 13 뿔 받기
  scaleAoe: { name: '수평 저울', mul: 1, aoe: true, status: 'slow' }, // 10 · 광역 고정
  swallow: { name: '삼키기', mul: 1, warn: 4, status: 'stun', stunSec: 3 }, // 11 · 한 명 행동 불능 3초 + 단일 ×1
  falseHyp: { name: '거짓 가정', mul: 0, aoe: true, warn: 4, status: 'slow', special: 'contra' }, // 12 · 전원 혼란(느려짐) · 끊으면 보스 최대 HP 3%
  steam: { name: '증기 뿜기', mul: 0.8, mark: true }, // 16 f · 맞으면 표식
  hammer: { name: '망치', mul: 1, special: 'hammer' }, // 16 g · 표식 있는 용사를 노림 ×1.6
  reverse: { name: '되돌리기', mul: 0, warn: 4, special: 'reverse' }, // 17 · 방금 가장 큰 스킬 피해 30% 를 그 용사에게 · 끊으면 보스가 맞음
  whip: { name: '사슬 채찍', mul: 1.2 }, // 14 · 17 거울 조각
  meteor: { name: '유성', mul: 1.3, aoe: true }, // 13 분노 · 별가루 대신
  breathAtk: { name: '숨 고르기', mul: 0, warn: 4, special: 'breath' }, // 6 · 7 차례 안 숨 고르기 · 다 모으면 보스 HP 8% 회복 · 끊으면 없음
};
/** 😵 용사 상태 그림 자리 (📜 요청 #40 ②) = 공격 종류 → 상태 6가지 · 풀릴 때까지 머리 위에서 돎 · 그림(atb-status-hero 6줄 = 이 순서)이 오기 전엔 이모지 */
export type StatusLook = 'sleep' | 'bind' | 'confuse' | 'fog' | 'dark' | 'frost';
export const STATUS_ROWS: StatusLook[] = ['sleep', 'bind', 'confuse', 'fog', 'dark', 'frost'];
export const STATUS_LOOK: Record<StatusLook, { ic: string; txt: string }> = { sleep: { ic: '💤', txt: '수면' }, bind: { ic: '⛓', txt: '속박' }, confuse: { ic: '🌀', txt: '혼란' }, fog: { ic: '🌊', txt: '느려짐' }, dark: { ic: '🌑', txt: '느려짐' }, frost: { ic: '❄️', txt: '느려짐' } };
export const ATK_STATUS: Partial<Record<AtkKind, StatusLook>> = { sleep: 'sleep', bind: 'bind', confuse: 'confuse', fog: 'fog', dark: 'dark', darkHit: 'dark', frost: 'frost', ice: 'frost', swallow: 'bind', falseHyp: 'confuse', scaleAoe: 'fog' };
/** 👹 보스 공격 3종 (📜 요청 #35 선생님 확정 2026-11-21) = 🎯 단일 → 🛡 탱커 엄호 · 💥 광역 → 🎵 서포터 격려(+ 💚 힐러 뒤 힐) · 🌀 특수(모으기) → ⚔ 딜러 강타로 끊음
 *  저울 = 기울면 단일 · 수평이면 광역 · 숨 고르기(SIG.breath) = 특수 */
export type AtkClass = 'single' | 'aoe' | 'special';
export const ATK_SPECIAL: ReadonlySet<AtkKind> = new Set<AtkKind>(['fire', 'sleep', 'bind', 'mirror', 'confuse', 'pounce', 'swallow', 'falseHyp', 'reverse', 'breathAtk']);
/** 이 보스가 부르는 공격 이름 (v4 = 같은 종류 · 보스마다 이름) */
export const atkName = (b: BossCfg, k: AtkKind): string => b.names?.[k] ?? ATK[k].name;
export const atkClass = (k: AtkKind, aoe: boolean): AtkClass => (ATK_SPECIAL.has(k) ? 'special' : aoe ? 'aoe' : 'single');
/** 반응 막기 = 예고 중 그 역할 스킬을 ATB 없이 ⚡1 로 · 단일 = 탱커 대신 맞음(cover) · 광역 = 서포터 결계(피해 ×0.7 · 느려짐 없음) · 특수 = 딜러 강타로 끊음 */
export const REACT: Record<AtkClass, Role> = { single: 'tank', aoe: 'support', special: 'dealer' };
export const REACT_CFG = { barrier: 0.3, botChance: 0.7 };
/** 👹 보스 분노 (📜 요청 #37 선생님 「몬스터도 분노 상태 · 긴장감」) = HP 30% 아래에서 한 번 들어감 · 공격 간격 · 피해 배율(난이도별) · 들어갈 때 특수 한 번 바로 · 그 뒤 차례마다 특수 하나 더
 *  진정 = 분노 중 팀 퍼펙트 2번 → 8초 공격 안 함 → 다시 분노 */
export const rage = { at: 0.3, every: { easy: 10, normal: 9, hard: 8 } as Record<Diff, number>, mul: { easy: 1.1, normal: 1.2, hard: 1.3 } as Record<Diff, number>, calmPerfect: 2, calmSec: 8 };
/** 🌈 속성 덧효과 (📜 요청 #36′ 선생님 「속성별 8가지로」 · 2026-11-21) = 장착 · 각성 스킬이 보스에 맞을 때만 · 일반 공격 · 역할 스킬 없음 · 숫자 = 이 한 곳
 *  관통 = 실드가 있을 때 피해 줄임을 1.5배 덜 받음 · 화상 = 3초 동안 피해 30% 나눠 · 감전 +1초 · 얼림 +2초 = 보스 다음 공격 늦춤(둘 합쳐 최대 4초)
 *  순풍 = 내 ATB +30% · 약점 노출 = 약점 시간 +3초(없으면 다음) · 축복 = 체력 비율 가장 낮은 친구 +5 · 저주 = 3초 동안 보스가 받는 피해 +15%
 *  (보스 실드 약점 칸 = 계열 5 그대로 · #28) */
export type AttrFx = 'pierce' | 'burn' | 'shock' | 'freeze' | 'gust' | 'expose' | 'bless' | 'curse';
export const attrFx = { pierce: 1.5, burn: { pct: 0.3, sec: 3 }, shock: 1, freeze: 2, delayMax: 4, gust: 0.3, expose: 3, bless: 5, curse: { pct: 0.15, sec: 3 } };
export const ATTR_FX: Record<string, AttrFx> = { cut: 'pierce', sweep: 'pierce', smash: 'pierce', fire: 'burn', spark: 'shock', frost: 'freeze', water: 'freeze', wind: 'gust', magic: 'expose', math: 'expose', gear: 'expose', sun: 'bless', star: 'bless', dark: 'curse' };
export const fxOfAttr = (attr: string): AttrFx => ATTR_FX[attr] ?? 'pierce';
export const ATTR_FX_TXT: Record<AttrFx, { emo: string; name: string; desc: string }> = {
  pierce: { emo: '🗡', name: '관통', desc: '실드가 있어도 피해 덜 줄어듦 (×1.5)' },
  burn: { emo: '🔥', name: '화상', desc: '3초 동안 피해 30% 더' },
  shock: { emo: '⚡', name: '감전', desc: '보스 다음 공격 1초 늦춤 (얼림과 합쳐 최대 4초)' },
  freeze: { emo: '🧊', name: '얼림', desc: '보스 다음 공격 2초 늦춤 (최대 4초)' },
  gust: { emo: '🌪', name: '순풍', desc: '내 ATB +30% 바로' },
  expose: { emo: '📖', name: '약점 노출', desc: '약점 시간 +3초 (없으면 다음 약점 시간)' },
  bless: { emo: '✨', name: '축복', desc: '가장 다친 친구 HP +5' },
  curse: { emo: '🌑', name: '저주', desc: '3초 동안 보스가 받는 피해 +15%' },
};
/** 대표 행동 숫자 (어림값 · 📜 설정표 v3 「⚠ ×0.2 · 8% · 30% · 30초 = 모의실험에 안 넣은 값」) */
export const SIG = {
  breath: { every: 30, warn: 4, heal: 0.08, healMax: 0.32 }, // healMax = 판 전체 회복 합 상한 32% (📜 #57 뒤 엔진 훑기: 끊을 수 없는 1인 · 찍기 봇 판이 900초에도 안 끝남) // 6 · 7 숨 고르기: 실드가 뜬 뒤 30초마다 3초 예고 → HP 8% 회복 · 예고 중 실드 칸을 깨면 끊김
  mirror: { sec: 10, back: 0.3 }, // 8 거울빛: 다음 10초 일반 공격 피해 30% 가 공격한 용사에게 (스킬은 안 돌아옴)
  scaleTilt: 0.5, // 10 기우는 저울: 기울(단일) 확률
  // 📜 요청 #57 설정표 v4 대표 행동
  contra: 0.03, // 12 거짓 가정을 끊으면 보스 최대 HP 3% (분노 6% = rageMod.cutPct)
  eq: { sec: 3, mul: 1.3 }, // 13 등호의 순간: 보스 공격 뒤 3초 받는 피해 +30% (실드 중 ×0.2 = shieldDmg)
  chain: 0.2, // 14 속박 중 소문항 정답 = 장착 스킬 피해의 20% 가 사슬로
  mark: [1, 1.6, 2] as number[], // 16 표식 겹 → 망치 배율
  reverse: 0.3, // 17 되돌리기 몫 (분노 50% = rageMod.revPct)
  revCap: 2, // 17 되돌리기 상한 = 그 판 보스 기본 단일 ×2 (📜 #57 봇 모의: 1인 판 = 스킬 30% 가 늘 한 방 상한 60% → 상한을 인원 비례로)
};

/** 🎚 균형 표 한 곳 (📜 11/20 「보스 HP · 공격 · 역할 수치를 코드 한 곳(표 하나)에 · 나중에 균형 도구가 그 표만 바꿈」)
 *  엔진은 쓰는 순간 이 표의 값을 읽음 → 도구가 칸 값을 바꾸면 다음 판부터 그대로 (읽기 전용 표시는 타입만) */
export const TUNE = { BOSS_HP_BASE, DIFF_MUL, BOSS_HIT, T, BOSSES, ATK, SIG } as const;
/** 👹 설정표(보스 · 대표 행동)가 없는 차시 = 기본 보스 표 (📜 2026-11-20 선생님 「서버 팩 = 11 · 12 · 13 ~ 17차시가 앱 고침 없이 게시판 던전에」) · 약점 = 차시 번호로 돌림 · 초안 표시 */
const FAM_RING: Fam[] = ['arms', 'flame', 'nature', 'mystic', 'wisdom'];
export const bossOf = (no: number): BossCfg => BOSSES[no] ?? (no >= 101 && no <= 103 ? RAID_BOSSES[(no - 100) as 1 | 2 | 3] : undefined) ?? { no, name: `${no}차시 던전 수호자`, sprite: 'new6:0', weak: [FAM_RING[no % 5]!, FAM_RING[(no + 2) % 5]!], type: '공격형', cycle: ['smash', 'smash', 'aoe'], tele: 'foot', sig: 'footTarget', signature: '강타 표적 (기본 보스 표)', draft: true };
