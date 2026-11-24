// 🐾 둥지 = 동행 펫 (📜 2026-11-25 선생님 컨펌 · 머리 🔨 · 설계 gem-sinks DESIGN-v1 3절)
//   💎 로 알을 사고(종류를 보고 고름 · 뽑기 없음) · 수업 · 복습에서 얻는 「먹이」로 키움 · 💎 로는 못 키움 · 힘 없음(전투 · 정답 · 보상 영향 0)
//   먹이 = 수업 한 차시 끝까지 +5(차시마다 한 번) · 🎯 허수아비 문제 맞힘 +1(하루 5까지) · 데리고 다니는 펫 한 마리에게만 · 굶거나 죽지 않음
//   단계 = 🥚 알(0) → 🐣 새끼(15) → 🐲 다 큼(50) · 다 큰 펫만 꾸미기(모자 · 목 · 💎 80)
//   저장 = accounts/{반}/{번호}/pet { on, list{ id: { kind, food, name, cos } }, fed{ 차시: true }, day{ d, n } } (친구 · 종합실이 읽음 · 실명 없음 = 이름은 정해 둔 낱말 조합)
//   산 것 = 지갑 buys `pet_egg_{종류}_{시각}` · `petcos_{물건}_{펫}` · 💎 로그 g 0 · spend = 값
import { ECON_VER, type Wallet } from './wallet';

export type PetKind = 'dragon' | 'owl' | 'slime';
export interface Pet { kind: PetKind; food: number; name: string; /** 입은 꾸미기 「,」 (머리 하나 · 목 하나) */ cos?: string }
export interface PetState { on?: string; list?: Record<string, Pet>; /** 먹이 준 차시 (차시마다 한 번) */ fed?: Record<string, true>; /** 허수아비 먹이 오늘 수 (KST 날짜) */ day?: { d: string; n: number } }

/** 💎 · 먹이 값 = 이 표 한 곳 */
export const PET_CFG = { egg: 150, cos: 80, lesson: 5, scare: 1, scareDay: 5, baby: 15, adult: 50 } as const;
/** 👩‍🏫 체험판 (📜 11/25 선생님 #둥지-1 B) = 첫 알 1개 무료 · 먹이 ×5 (원래 수업은 알 💎 150 · 수업 +5 · 허수아비 +1) */
export const PET_TRIAL = { freeEggs: 1, foodMul: 5 } as const;
/** 알 값 (체험판 = 첫 알 0) */
export const eggPriceOf = (st: PetState | null | undefined, trial: boolean) => (trial && Object.keys(petClean(st).list || {}).length < PET_TRIAL.freeEggs ? 0 : PET_CFG.egg);
export const PET_KINDS: { k: PetKind; name: string; ic: string; src: string }[] = [
  { k: 'dragon', name: '아기 용', ic: '🐉', src: 'art/pet/pet-dragon-v1.webp' },
  { k: 'owl', name: '숫자 부엉이', ic: '🦉', src: 'art/pet/pet-owl-v1.webp' },
  { k: 'slime', name: '슬라임 고양이', ic: '🐱', src: 'art/pet/pet-slime-v1.webp' },
];
export const PET_BY = Object.fromEntries(PET_KINDS.map((p) => [p.k, p])) as Record<PetKind, (typeof PET_KINDS)[number]>;
/** 꾸미기 6 · slot = 머리 / 목 · 자리 = 다 큰 펫 그림 칸 기준 % (가운데 위 기준) */
export const PET_COS = [
  { id: 'pc_santa', name: '산타 모자', slot: 'head', src: 'art/pet/petcos-santa-v1.webp' },
  { id: 'pc_wizard', name: '마법사 모자', slot: 'head', src: 'art/pet/petcos-wizard-v1.webp' },
  { id: 'pc_crown', name: '왕관', slot: 'head', src: 'art/pet/petcos-crown-v1.webp' },
  { id: 'pc_flower', name: '꽃 화관', slot: 'head', src: 'art/pet/petcos-flower-v1.webp' },
  { id: 'pc_scarf', name: '목도리', slot: 'neck', src: 'art/pet/petcos-scarf-v1.webp' },
  { id: 'pc_ribbon', name: '리본', slot: 'neck', src: 'art/pet/petcos-ribbon-v1.webp' },
] as const;
export type PetCosId = (typeof PET_COS)[number]['id'];
export const PET_COS_BY = Object.fromEntries(PET_COS.map((c) => [c.id, c])) as Record<string, (typeof PET_COS)[number]>;
/** 머리 · 목 자리 (다 큰 그림 칸 % · 종류마다 머리 높이가 달라서) */
export const PET_SLOT: Record<PetKind, { head: [number, number, number]; neck: [number, number, number] }> = {
  dragon: { head: [52, 6, 34], neck: [52, 44, 28] },
  owl: { head: [50, 2, 34], neck: [50, 48, 30] },
  slime: { head: [46, 24, 32], neck: [46, 58, 28] },
};
/** 이름 = 정해 둔 낱말 조합 (자유 입력 없음 · 욕설 · 실명 막기) */
export const PET_NAME_A = ['반짝', '보송', '용감한', '졸린', '날쌘', '꼬마'] as const;
export const PET_NAME_B = ['별', '구름', '콩', '방울', '불꽃', '도토리'] as const;

export const stageOf = (food: number) => (food >= PET_CFG.adult ? 2 : food >= PET_CFG.baby ? 1 : 0);
export const STAGE_NAME = ['🥚 알', '🐣 새끼', '🐲 다 큼'] as const;
/** 다음 단계까지 [지금, 목표] (다 큼 = null) */
export const nextOf = (food: number): [number, number] | null => (food >= PET_CFG.adult ? null : food >= PET_CFG.baby ? [food - PET_CFG.baby, PET_CFG.adult - PET_CFG.baby] : [food, PET_CFG.baby]);

/** 서버 값 → 믿을 수 있는 꼴만 */
export function petClean(v: unknown): PetState {
  if (!v || typeof v !== 'object') return {};
  const o = v as PetState, list: Record<string, Pet> = {};
  for (const [id, p] of Object.entries(o.list || {})) if (p && PET_BY[p.kind as PetKind] && /^[\w-]{1,40}$/.test(id)) list[id] = { kind: p.kind, food: Math.max(0, Math.floor(Number(p.food) || 0)), name: String(p.name || '').slice(0, 16), ...(p.cos ? { cos: String(p.cos).split(',').filter((c) => PET_COS_BY[c]).join(',') } : {}) };
  const on = o.on && list[o.on] ? o.on : Object.keys(list)[0];
  return { ...(on ? { on } : {}), list, ...(o.fed ? { fed: o.fed } : {}), ...(o.day ? { day: o.day } : {}) };
}
export const activePet = (s?: PetState | null): (Pet & { id: string }) | null => { const c = petClean(s); return c.on && c.list?.[c.on] ? { id: c.on, ...c.list[c.on]! } : null; };
export const petCosOf = (p?: Pick<Pet, 'cos'> | null): string[] => (p?.cos ? p.cos.split(',').filter((c) => PET_COS_BY[c]) : []);

/** 알 사기 → 새 펫 id 또는 까닭 */
export function buyEgg(w: Wallet, st: PetState, kind: PetKind, name: string, now: number, price: number = PET_CFG.egg): { id: string } | { err: string } {
  if (!PET_BY[kind]) return { err: '없는 알이에요' };
  if (w.gem < price) return { err: `💎 ${price - w.gem} 이 모자라요` };
  const id = `${kind}_${now.toString(36)}`;
  w.gem -= price; w.buys = [...w.buys, { id: `pet_egg_${id}`, ver: ECON_VER, at: now }];
  st.list = { ...(st.list || {}), [id]: { kind, food: 0, name } }; st.on = id;
  return { id };
}
/** 꾸미기 사기 (다 큰 펫만 · 펫마다 따로) */
export function buyPetCos(w: Wallet, st: PetState, petId: string, cosId: string, now: number): string | null {
  const p = st.list?.[petId], c = PET_COS_BY[cosId];
  if (!p || !c) return '없는 물건이에요';
  if (stageOf(p.food) < 2) return '다 큰 펫만 꾸밀 수 있어요';
  if (ownsPetCos(w, petId, cosId)) return '이미 가진 물건이에요';
  if (w.gem < PET_CFG.cos) return `💎 ${PET_CFG.cos - w.gem} 이 모자라요`;
  w.gem -= PET_CFG.cos; w.buys = [...w.buys, { id: `petcos_${cosId}_${petId}`, ver: ECON_VER, at: now }];
  return null;
}
export const ownsPetCos = (w: Pick<Wallet, 'buys'>, petId: string, cosId: string) => w.buys.some((b) => b.id === `petcos_${cosId}_${petId}`);
/** 꾸미기 입기 · 벗기 (자리마다 하나) */
export function togglePetCos(p: Pet, cosId: string): Pet {
  const c = PET_COS_BY[cosId]; if (!c) return p;
  const cur = petCosOf(p), has = cur.includes(cosId), nx = has ? cur.filter((x) => x !== cosId) : [...cur.filter((x) => PET_COS_BY[x]?.slot !== c.slot), cosId];
  return { ...p, cos: nx.join(',') };
}

/** 🍖 먹이 (데리고 다니는 펫 한 마리에게만) → 실제로 준 수 · st 를 고침 */
export function feed(st: PetState, why: { lesson: string } | { scare: string }, mul = 1): number {
  const a = st.on && st.list?.[st.on]; if (!a) return 0;
  if ('lesson' in why) {
    const k = why.lesson.replace(/[.#$/[\]]/g, '_'); if (st.fed?.[k]) return 0;
    st.fed = { ...(st.fed || {}), [k]: true }; a.food += PET_CFG.lesson * mul; return PET_CFG.lesson * mul;
  }
  const n = st.day?.d === why.scare ? st.day.n : 0; if (n >= PET_CFG.scareDay) return 0;
  st.day = { d: why.scare, n: n + 1 }; a.food += PET_CFG.scare * mul; return PET_CFG.scare * mul;
}
/** 방 명단 꼬리표 「종류|먹이|꾸미기」 → 펫 (종합실 대기 줄) */
export function petFromTag(tag: unknown): Pick<Pet, 'kind' | 'food' | 'cos'> | null {
  if (typeof tag !== 'string') return null;
  const [k, f, c] = tag.split('|'); if (!PET_BY[k as PetKind]) return null;
  return { kind: k as PetKind, food: Math.max(0, Number(f) || 0), ...(c ? { cos: c.split(',').filter((x) => PET_COS_BY[x]).join(',') } : {}) };
}
