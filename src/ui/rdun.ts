// 🎲 랜덤 던전 입히기 (DECISIONS 「🎲 랜덤 던전 = 차시 추가 때 차례로 배정」 · 2026-11-14)
//   그림이 없는 차시(학습지 · 엑셀로 추가) → 랜덤 던전 목록에서 차례로 하나(한 던전 = 한 차시 · 끝까지 돌면 처음부터)
//   방 meta.rdun = 시험용으로 던전을 직접 고름(그림이 있는 차시라도 그 던전으로 입힘)
//   몬스터 = 단계 순서대로 5마리 · 6번째부터 색 돌리기(72도씩) · ⚔ 소레이드 = 대장(@e) · 👑 보스 = 보스 줄 → 보스 묶음(bossRef) → 없으면 마지막 몬스터 색 돌림 + 대장
//   배경 = 던전 배경(아직 없음 → 비슷한 기존 배경) · 몬스터 공격 = 던전 공격 2 번갈아 · 보스 공격 = 던전 보스 공격 3
//   몸 룬 원판 = 그 몬스터 문제의 첫 기호(없으면 차시 번호) · 그림 주소 끝 「@r기호」
import type { LessonPack, MonsterPack } from '../model/types';
import { PACKS } from '../engine/packs';
import { items } from '../engine/lessons';
import { RDUN, RDUN_IDS } from './manifest';

const monIds = (L: LessonPack) => L.steps.filter((s) => s.kind === 'monster' && L.monsters[s.id]).map((s) => s.id);
/** 그림 없는 차시 = 몬스터 단계마다 그림(sprite)이 비어 있음 */
export const artless = (L: LessonPack) => { const ms = monIds(L); return ms.length ? ms.every((id) => !L.monsters[id]?.sprite) : !L.boss?.sprite; };
/** 이 차시의 던전 (없으면 '' = 원래 그림 그대로) */
export function rdunOf(L: LessonPack, pick?: string | null): string {
  if (pick && RDUN[pick]) return pick;
  if (!artless(L)) return '';
  const list = PACKS.filter(artless).sort((a, b) => a.no - b.no), i = list.findIndex((p) => p.id === L.id);
  return RDUN_IDS[(i >= 0 ? i : Math.max(0, L.no - 1)) % RDUN_IDS.length] ?? '';
}
const SYM = /[∪∩ᶜ⊂⊄∈∉∅⇒⇔→≠≤≥~±√π∞∑∫⊥∥△]/;
/** 몸에 얹을 기호 = 그 몬스터 문제의 첫 수학 기호 · 없으면 차시 번호 */
export function runeOf(L: LessonPack, mid: string): string {
  try { for (const q of items(L, mid, 'rune', 0)) { const m = SYM.exec(q.question || ''); if (m) return m[0]; } } catch { /* 소레이드 · 엑셀 */ }
  return String(L.no);
}
const memo = new Map<string, LessonPack>();
/** 차시 팩에 랜덤 던전 그림 · 배경 · 공격을 입힌 사본 (그림 있는 차시 + 고른 던전 없음 = 그대로) */
export function dressed(L: LessonPack, pick?: string | null): LessonPack {
  const d = rdunOf(L, pick); if (!d) return L;
  const k = `${L.id}|${d}`, hit = memo.get(k); if (hit) return hit;
  const D = RDUN[d]!, ids = monIds(L), force = !!pick;
  const monsters: Record<string, MonsterPack> = { ...L.monsters };
  ids.forEach((id, i) => {
    const m = L.monsters[id]!, hue = Math.floor(i / 5) * 72;
    const sprite = `${d}:${i % 5}${hue ? `@h${hue}` : ''}${m.chain ? '@e' : ''}@r${runeOf(L, id)}`;
    monsters[id] = { ...m, sprite: force || !m.sprite ? sprite : m.sprite, attack: force || !m.attack ? D.attack[i % D.attack.length] : m.attack };
  });
  const bsym = runeOf(L, ids[ids.length - 1] ?? '') || String(L.no);
  const boss = L.boss ? { ...L.boss, sprite: force || !L.boss.sprite ? (D.boss != null ? `${d}:${D.boss}@r${bsym}` : D.bossRef ? `${D.bossRef}@r${bsym}` : `${d}:4@h180@e@r${bsym}`) : L.boss.sprite, attack: force || !L.boss.attack?.length ? D.bossAttack : L.boss.attack } : L.boss;
  const out: LessonPack = { ...L, theme: force || !L.theme ? D.bg : L.theme, monsters, boss };
  memo.set(k, out); return out;
}
