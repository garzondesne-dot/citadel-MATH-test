import type { LessonPack } from '../model/types';
import { SUBJ } from './subject';
// 🧩 차시 팩 목록 (#132 · #136) — 과목 팩의 차시 모두(SUBJ.lessons) · 차시 번호 순
//   한 차시 팩을 두 수업으로 (parts): parts 하나 = 목록에 차시 하나 더 (id 「<팩>@<번호>」 · 단계 = from 부터 · 문항 · 생성기 = 같은 팩)
//   #149 앞수업(팩 id 그대로) = 첫 나눔 칸 앞까지 · 형성평가를 나누면(part.boss = [시작, 끝)) 앞 = [0, 시작) · 뒤 = [시작, 끝) · 안 나누면 형성평가는 뒷수업에만
const cutBoss = (b: LessonPack['boss'], s: number, e: number): LessonPack['boss'] => (b ? { ...b, first: (b.first || 0) + s, items: e - s, hpItems: e - s, ...(b.tags ? { tags: b.tags.slice(s, e) } : {}) } : b);
function headOf(p: LessonPack): LessonPack {
  const pt = p.parts?.[0], k = pt ? p.steps.findIndex((s) => s.id === pt.from) : -1;
  if (!pt || k < 0) return p;
  const bossStep = p.steps.find((s) => s.kind === 'boss'), split = pt.boss && p.boss;
  return { ...p, steps: [...p.steps.slice(0, k), ...(split && bossStep ? [bossStep] : [])], boss: split ? cutBoss(p.boss, 0, pt.boss![0]!) : undefined };
}
const raw = SUBJ.lessons;
const base = raw.map(headOf);
const parts = raw.flatMap((p) => (p.parts || []).map((pt): LessonPack | null => {
  const k = p.steps.findIndex((s) => s.id === pt.from);
  if (k < 0) return null;
  const part: LessonPack = { ...p, id: `${p.id}@${pt.no}`, no: pt.no, title: pt.title, partOf: p.id, steps: p.steps.slice(k), parts: undefined, ...(pt.boss && p.boss ? { boss: cutBoss(p.boss, pt.boss[0]!, pt.boss[1]!) } : {}) };
  if (pt.attack && part.boss) part.boss = { ...part.boss, attack: pt.attack }; // 💥 나눈 수업 보스 공격 (짝 표 「@7」)
  return part;
}).filter((x): x is LessonPack => !!x));
export const PACKS: LessonPack[] = [...base, ...parts].sort((a, b) => a.no - b.no);
export const packOf = (id: string | null | undefined): LessonPack | null => PACKS.find((p) => p.id === id) ?? null;
/** 📦 올린 차시 팩 더하기 (L1 · prep/packs) — 같은 id 는 올린 판이 대신함 · 차시 번호 순 유지 (PACKS 는 같은 배열을 고침) */
export function addPacks(list: LessonPack[]): void {
  for (const p of list) { const k = PACKS.findIndex((x) => x.id === p.id); if (k >= 0) PACKS.splice(k, 1, p); else PACKS.push(p); }
  PACKS.sort((a, b) => a.no - b.no);
}
