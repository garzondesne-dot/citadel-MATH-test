// 🐞 11/21 버그 사냥 · 게시판 던전 엔진 훑기: 모든 차시 × 난이도 × 인원 · 봇 판 = 세트0 0 · 문항 생성 오류 0 · NaN 0 · 범위 밖 0 · 끝나지 않는 판 0 · 덧효과 6종 이상 발동
import { describe, expect, it } from 'vitest';
import { PACKS } from '../src/engine/packs';
import { HEROES } from '../src/model/hero';
import { newBattle, useSkill, type State } from '../src/board/atb/engine';
import { newBot, simulate } from '../src/board/atb/bots';
import { statsOf } from '../src/board/atb/heroes';
import { bossOf, fxOfAttr } from '../src/board/atb/tune';
import { atbLessons, atbReady } from '../src/board/atb/lessons';
import { originsOf, variantOf, questionsOf, VERS_N } from '../src/board/atb/quiz';
import { bossArt } from '../src/ui/board/atb/rdunBoss';

const Ls = atbLessons(PACKS, new Set()).filter(atbReady);
const out: string[] = [];
describe('게시판 던전 엔진 훑기', () => {
  it('세트0 · 문항 생성', () => {
    for (const L of Ls) for (const o of originsOf(L)) for (let v = 1; v <= 12; v++) {
      const k = variantOf(L, o.mid, v); if (k === 0) out.push(`SET0 ${L.id} ${o.mid} v${v}`);
      try { const qs = questionsOf(L, { mid: o.mid, ver: v }, 's1'); if (!qs?.length) out.push(`EMPTY ${L.id} ${o.mid} v${v}`); } catch (e) { out.push(`THROW ${L.id} ${o.mid} v${v} ${String(e).slice(0, 80)}`); }
    }
  });
  it('시뮬', () => {
    const ids = HEROES.map((h) => h.id).filter((i) => i < 40);
    const fxSeen = new Set<string>();
    for (const L of Ls) for (const diff of ['easy', 'normal', 'hard'] as const) for (let s = 1; s <= 4; s++) {
      const party = Array.from({ length: (s % 4) + 1 }, (_, i) => ids[(s * 7 + i * 5 + L.no) % ids.length]!).map((id) => statsOf({ hero: id, lv: 10, enh: 5, tier: 2 }));
      const S: State = newBattle({ boss: bossArt(bossOf(L.no), diff), diff, party, seed: s * 31 + L.no });
      const bots = S.heroes.map((h) => newBot(L, h.id, s % 2 ? 'normal' : 'random', s));
      try { simulate(L, S, bots, { maxT: 900 }); } catch (e) { out.push(`SIMTHROW ${L.no} ${diff} ${String(e).slice(0, 100)}`); continue; }
      for (const e of S.ev) if (e.k === 'fam') fxSeen.add((e as { fx: string }).fx);
      const bad = [S.bossHp, S.t, ...S.heroes.flatMap((h) => [h.hp, h.ch, h.atb])].some((x) => !Number.isFinite(x));
      if (bad) out.push(`NaN ${L.no} ${diff} s${s}`);
      if (S.bossHp < 0 || S.heroes.some((h) => h.hp < 0 || h.hp > h.s.maxHp + 1e-6)) out.push(`RANGE ${L.no} ${diff} s${s} boss ${S.bossHp} hp ${S.heroes.map((h) => `${h.hp}/${h.s.maxHp}`)}`);
      if (!S.end) out.push(`NOEND ${L.no} ${diff} s${s} t=${Math.round(S.t)} boss ${Math.round(S.bossHp)}/${S.bossMax}`);
    }
    const attrs = new Set(HEROES.map((h) => fxOfAttr(String(h.attr))));
    out.push(`FX seen ${[...fxSeen].sort()} / hero fx ${[...attrs].sort()} · lessons ${Ls.map((l) => l.no)}`);
  });
  it('결과 = 문제 없음', () => { const bad = out.filter((x) => !x.startsWith('FX seen')); expect(bad).toEqual([]); expect((out.find((x) => x.startsWith('FX seen')) ?? '').split(' / ')[0]?.split(',').length ?? 0).toBeGreaterThanOrEqual(6); });
});
