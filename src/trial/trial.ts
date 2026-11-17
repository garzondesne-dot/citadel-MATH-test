// 👩‍🏫 체험판 v1.0 엔진 (📜 2026-11-17 선생님 「체험판 만들자 · 테스트모드를 따로 만들어서 구동하게 만들면 체험판」 → 「12+3 · 규칙 그대로」 · 머리 🔨 #33)
//   차시 · 단계 · 쉼터 자리 · 방 설정 = 과목 팩 SUBJ.trial (엔진은 과목을 모름 · #136)
//   흐름 · 숫자 · 방 설정 = CLAUDE.md 「👩‍🏫 체험판 규칙」 목록만 다름 (목록에 없는 차이 = 버그)
import { checkUpload } from '../school/packUpload';
import { packOf } from '../engine/packs';
import { SUBJ } from '../engine/subject';
import { roomPath } from '../raid/actions';
import type { LessonPack, Store } from '../model/types';
import type { TrialCfg } from '../model/subject';
import { checkCastle, type CastlePack } from '../school/castle';

const CFG: TrialCfg = SUBJ.trial ?? { cards: [], keep: {}, restAfter: {}, room: {} };
/** 첫 화면 차시 카드 (위 = 풀 체험) */
export const CARDS = CFG.cards;
/** 🏕 쉼터 = 이 몬스터 다음 (학생 판 진행 리모컨 「다음 ▶」 = 쉼터 먼저) */
export const REST_AFTER = CFG.restAfter;
/** 영상 = 사이트에 같이 실은 파일 (서버 안 닿음) */
const vidMap = (L: LessonPack, raw: { at: string[]; file: string }[] | null): Record<string, string> => {
  const out: Record<string, string> = {};
  if (raw) for (const v of raw) for (const at of v.at) out[at] = `video/${v.file}.mp4`;
  else for (const [k, u] of Object.entries(L.videos || {})) { const m = /(v\d\d-\d+)\.mp4/.exec(String(u)); if (m) out[k] = `video/${m[1]}.mp4`; }
  return out;
};
const look = { sheet: () => true, theme: () => true, attack: () => true, builtIn: () => false };
function load(id: string): LessonPack {
  const raw = CFG.raw?.[id];
  let base: LessonPack, vids: { at: string[]; file: string }[] | null = null;
  if (raw) {
    const r = checkUpload(raw, look);
    if (!r.pack) throw new Error(`체험판 ${id} 팩 검사 실패: ${r.issues.filter((i) => i.lvl === 'err').map((i) => i.msg).join(' · ')}`);
    base = r.pack; vids = (JSON.parse(raw) as { video?: { at: string[]; file: string }[] }).video ?? null;
  } else {
    const p = packOf(id); if (!p) throw new Error(`체험판 ${id} 팩 없음`); base = p;
  }
  const keep = CFG.keep[id];
  let L: LessonPack = { ...base, steps: keep ? base.steps.filter((s) => keep.includes(s.id)) : base.steps, videos: vidMap(base, vids) };
  const n = CFG.room[id]?.bossItems;
  if (n && L.boss) { const b = L.boss; L = { ...L, boss: { ...b, items: n, hpItems: Math.min(n, b.hpItems || n), ...(b.tags ? { tags: b.tags.slice(0, n) } : {}), ...(b.links ? { links: b.links.slice(0, n) } : {}) } }; }
  return L;
}
let cache: LessonPack[] | null = null;
/** 체험판 차시 (카드 순서 · 팩 · 흐름 · 영상 · 형성평가 문항) */
export function trialPacks(): LessonPack[] { return (cache ??= CFG.cards.map((c) => load(c.id))); }
/** 체험판 방 = 🧪 테스트 방 + 정찰 5초 · 성취 기준 100 · (과목 팩이 정하면) 첫 판 = 한 번 더 판 1 · 🎯 복습으로 넘긴 몬스터 */
export function trialRoom(S: Store, L: LessonPack, code: string): void {
  const P = roomPath(code), r = CFG.room[L.id] ?? {};
  S.set(`${P}/meta/solve`, 5); // 몬스터 앞 정찰 5초 (원래 수업은 60초)
  S.set(`${P}/meta/pct`, 100); // 성취 기준 100 (원래 수업은 90 · 친구들이 먼저 쓰러뜨리지 않게)
  if (r.fresh1) S.set(`${P}/meta/fresh`, Object.fromEntries(L.steps.filter((s) => s.kind === 'monster').map((s) => [s.id, 1])));
  for (const m of r.sent ?? []) S.set(`${P}/state/sent/${m}`, S.now()); // 🎯 복습으로 넘긴 것으로 → 형성평가 짝 문항 빠짐 표시
}
/** 🏰 체험판 성채 = 과목 팩이 실은 층 하나 (원래 수업은 올린 성채 팩 전부) */
export function trialCastles(): CastlePack[] {
  if (!CFG.castle) return [];
  const r = checkCastle(CFG.castle, { sheet: () => true });
  return r.pack ? [r.pack] : [];
}
