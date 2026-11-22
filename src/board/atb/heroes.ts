// 🧙 게시판 던전 ATB — 용사 → 역할 · 계열 · 전투 수치 (📜 용사수치-초안.md 0절 로그 식 · 결정 V2 · V3 · W1-b)
//   강화 · 레벨 = 계정 하나(용사를 바꿔도 같음) · 용사마다 다른 것 = 역할 · 계열 · 장착 스킬 등급
import { awkId, heroOf, isAwkId, ladder } from '../../model/hero';
import { FAM_OF_ATTR, G, roleOfName, T, type Fam, type Role } from './tune';

export interface HeroIn { hero: number; lv: number; enh: number; tier: number; grit?: number; focus?: number; name?: string; /** ✨ 각성 상태 (#83) */ awk?: boolean }
export interface Stats { hero: number; name: string; role: Role; fam: Fam; attr: string; lv: number; enh: number; tier: number; maxHp: number; def: number; atbSec: number; atkMul: number; skillMul: number; crit: number; /** ✨ 각성 상태 = 각성 스킬(Y3) */ awk: boolean; /** 🔨 +10 = 오라 방패(Y12) */ aura: boolean }

export const famOf = (hero: number): Fam => FAM_OF_ATTR[String(heroOf(hero).attr)] ?? 'arms';
export const roleOf = (hero: number): Role => roleOfName(String(heroOf(hero).name));
/** 장착 스킬 등급(1 ~ 4) = 그 속성 사다리에서 몇 번째 */
export const tierOf = (hero: number, skill?: string) => { const lad = ladder(hero) as string[]; const i = skill ? lad.indexOf(skill) : 0; return Math.max(1, Math.min(4, i + 1)); };

export function statsOf(h: HeroIn): Stats {
  const info = heroOf(h.hero), role = roleOfName(String(h.name ?? info.name)), R = T.role[role];
  const lv = G.lv(h.lv), enh = G.enh(h.enh), tier = G.tier(h.tier);
  return {
    hero: h.hero, name: String(h.name ?? info.name), role, fam: FAM_OF_ATTR[String(info.attr)] ?? 'arms', attr: String(info.attr), lv: h.lv, enh: h.enh, tier: h.tier,
    maxHp: Math.round(100 * R.hp * (1 + lv)),
    def: Math.min(T.defCap, R.def + G.grit(h.grit ?? 0)),
    atbSec: +(T.atbSec / (R.spd * (1 + G.spd(h.lv)))).toFixed(2),
    atkMul: 1 + lv + enh,
    skillMul: 1 + lv + enh + tier,
    crit: T.crit + G.focus(h.focus ?? 0),
    awk: !!h.awk,
    aura: h.enh >= 10,
  };
}
/** 👀 보이는 모습 id (📜 요청 #15 · 캠프 · 레이드와 같은 규칙): 각성 상태 + 각성 그림이 있는 용사 = 각성 모습(awkId) · 아니면 그대로(각성 연출 = 오라 · 이름 금빛) */
export const lookOfStats = (s: Pick<Stats, 'hero' | 'awk'>) => (s.awk && isAwkId(awkId(s.hero)) ? awkId(s.hero) : s.hero);
/** 고르는 창 숫자 줄 (선생님 W1-b 「여기서만 용사 수치」) · 방어 0 = 「0%」 */
/** 📊 고르는 창 수치 (📜 요청 #43 · #46): 배율 대신 실제 숫자 = 전투 피해 숫자와 같은 단위(치명 · 약점 · 덧효과 빼고 기본 한 방) · 배율은 옆에 작게(sub) */
export const statRows = (s: Stats): { k: string; label: string; v: string; sub?: string }[] => {
  const healer = s.role === 'healer', H = T.role.healer, sk = s.skillMul * (healer ? H.skillMul : 1);
  return [
    { k: 'hp', label: 'HP', v: String(s.maxHp) },
    { k: 'atk', label: '공격', v: String(Math.round(T.attackBase * s.atkMul)), sub: `×${s.atkMul.toFixed(2)}` },
    { k: 'skill', label: '스킬', v: String(Math.round(T.skillBase * sk)), sub: `×${sk.toFixed(2)}${healer ? ` · 구슬 ${H.skillCost}` : ''}` },
    { k: 'def', label: '방어', v: s.def ? `−${Math.round(s.def * 100)}%` : '0%' },
    { k: 'atb', label: 'ATB', v: `${s.atbSec.toFixed(1)}초` },
    { k: 'crit', label: '치명', v: `×${s.crit.toFixed(1)}` },
    healer
      ? { k: 'heal', label: '힐', v: `💚 큰 힐 ${Math.round((H.big + (s.awk ? T.awk.healerBig : 0)) * 100)}%`, sub: `공격 맞힘 = 팀 +${Math.round(H.atkHeal * 100)}%` }
      : { k: 'heal', label: '힐', v: `🩹 응급붕대 ${Math.round(s.maxHp * T.firstAid)}`, sub: '최대 체력 1/3 · 구슬 1' },
  ];
};
