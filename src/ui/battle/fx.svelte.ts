// ⚔ 채점 연출 상태 (화면 하나 · 데미지 · 기록과 상관없음 — 결과를 순서대로 보여 줄 뿐)
//   hold = 아직 안 뒤집힌 ✔ 만큼 몬스터 체력을 잠깐 덜 깎인 것처럼 · pose = 용사 베기 / 헛스윙
//   block = 💥 몬스터 공격으로 입력 멈춤(#151 · 주요 단추 = 같은 자리 흐린 「⏳ 막는 중…」)
//   ice = 🧊 얼음 공격으로 주요 단추가 얼어 있는 동안 남은 톡 수(0 = 없음) · fire = 🔥 화염 공격 중(주요 단추 자리 = 🧯 꾹 눌러 끄기) (#152)
export const fx = $state<{ hold: number; pose: 'idle' | 'attack' | 'miss'; poseUntil: number; block: boolean; ice: number; fire: boolean; lock: boolean }>({ hold: 0, pose: 'idle', poseUntil: 0, block: false, ice: 0, fire: false, lock: false });
export function swing(ok: boolean) { heroAtk({ miss: !ok }); }
/** ⚔ 용사 공격 한 번 (정식 DS.Attack.play 를 장면 띠가 부름 · 🔨 용사 fx): miss = 틀림(튕겨냄) · hits = 연타 수(Ⅲ · Ⅳ 근접) · ult = ⚡ 필살기(첫 시도 퍼펙트 + 내 속성 Ⅲ↑ · 장면이 판정) · finish = 끈기의 일격 · noDmg = 연습 */
/** prac = 🔥 한 판 더 · 연습 공격에서 맞힌 수 (데미지 0 · 회색 「🔥 +1」 흔적) */
export type HeroAtk = { id: number; miss: boolean; hits?: number; ult?: boolean; finish?: boolean; noDmg?: boolean; win?: boolean; prac?: number };
let atkN = 0;
export const atkQ = $state<{ v: HeroAtk | null }>({ v: null });
export function heroAtk(o: Omit<HeroAtk, 'id'>) { atkQ.v = { ...o, id: ++atkN }; fx.pose = o.miss ? 'miss' : 'attack'; fx.poseUntil = Date.now() + 320; }

/** 🛡 홀리 방패 막기 연출 요청 (장면 띠가 날개 · 방패를 그림 · 정식 Aura.guard) */
export const guardQ = $state<{ v: number }>({ v: 0 });
