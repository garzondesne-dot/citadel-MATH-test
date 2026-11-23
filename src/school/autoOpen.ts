import type { LessonPack, Store } from '../model/types';
import { addMin, BELLS, kst, lessonLen, P7, at } from './bells';
import { CLASSES, isBeta, week, type Live } from './school';

// ⏰ 오늘 시간표 · 자동 열기 (📜 2026-11-17 #21 E · DECISIONS 「⚔ 교사 수업 탭 정리 3」 · 「📅 시간표 화면 정리」 바뀜)
//   ⚔ 수업 탭 맨 위 「📅 오늘 시간표」(시간표를 쓸 때만) · 바로 다음 수업 = 「▶ 바로 열기」 · 「⏰ 자동 열기」 스위치(기본 끔)
//   켜면 저장된 수업 모두 시작종에 열림: 그 반 ⭐ 다음 차시 · 넘어온 몬스터는 수동 열기 기본값 그대로(안 함 = 🎯 허수아비) · 종합실 키 방식 그대로
//   1분 전 교사 폰 🔔 [취소] · [다른 차시] · 그 반이 이미 열려 있으면 열지 않음 · 끝날 때 닫지 않음 · 🧪 · 테스트 반 없음
//   여는 기기 = 종합실 PC 입장 대기 화면(교사 로그인한 PC · 서버 중계 없음) · 「오늘 건너뛰기」(칸) · 「이날은 자동 끔」(날짜)
export const AUTO = 'school/auto';
export interface AutoCfg { on?: boolean; skip?: Record<string, Record<string, boolean>>; off?: Record<string, boolean>; pick?: Record<string, Record<string, string>>; done?: Record<string, Record<string, string>> }
export const dayKey = (now: number) => { const k = kst(now); return `${k.y}-${String(k.m).padStart(2, '0')}-${String(k.d).padStart(2, '0')}`; };
export const autoCfg = (S: Store): AutoCfg => S.get<AutoCfg>(AUTO) || {};
export { nextNo } from './progress'; // 📚 #25 진도 하나 (진행한 최대 차시 + 1 · 옛 school/prog 아래로 안 내려감)
import { nextNo } from './progress';
/** ⭐ 그 반 다음 차시 팩 (진도 맞추기 · 없으면 지난 차시 + 1 · 팩이 없으면 그다음 있는 차시) */
export const starPack = (S: Store, c: string, packs: LessonPack[]) => { const n = nextNo(S, c); return [...packs].sort((a, b) => a.no - b.no).find((p) => p.no >= n) ?? null; };
export interface Slot { p: number; start: number; end: number; hm: string; cls: string; L: LessonPack | null; done: boolean; next: boolean; skip: boolean; auto: boolean; opened: boolean }
/** 오늘 칸 (월~금 · 7교시 · 반이 있는 칸만 · 테스트 반 빠짐) */
export function todaySlots(S: Store, now: number, packs: LessonPack[]): Slot[] {
  const k = kst(now), W = week(S)[String(k.dow)] || {}, cfg = autoCfg(S), day = dayKey(now), len = lessonLen(S);
  if (k.dow > 5) return [];
  const rows = P7.map((p) => {
    const cls = W[String(p)] || ''; if (!cls || !CLASSES.includes(cls) || isBeta(S, cls)) return null;
    const hm = BELLS[p]?.[0] ?? addMin('09:00', (p - 1) * 60), [h, m] = hm.split(':').map(Number), start = at(now, (h ?? 0) * 60 + (m ?? 0)), end = start + len * 60e3;
    const pickId = cfg.pick?.[day]?.[String(p)], L = (pickId && packs.find((x) => x.id === pickId)) || starPack(S, cls, packs);
    return { p, start, end, hm, cls, L, done: now >= end, next: false, skip: !!cfg.skip?.[day]?.[String(p)], auto: !!cfg.on && !cfg.off?.[day], opened: !!cfg.done?.[day]?.[String(p)] };
  }).filter((x): x is Slot => !!x);
  const nx = rows.find((r) => !r.done); if (nx) nx.next = true;
  return rows;
}
/** ⏰ 지금 열어야 할 칸 (시작종 ~ 시작종 + 5분 · 건너뛰기 아님 · 이미 연 칸 아님) */
export const dueSlot = (S: Store, now: number, packs: LessonPack[]) => todaySlots(S, now, packs).find((r) => r.auto && !r.skip && !r.opened && r.L && now >= r.start && now < r.start + 5 * 60e3) ?? null;
/** 🔔 1분 전 알림 칸 */
export const soonSlot = (S: Store, now: number, packs: LessonPack[]) => todaySlots(S, now, packs).find((r) => r.auto && !r.skip && !r.opened && r.L && now >= r.start - 60e3 && now < r.start) ?? null;
/** 다음 자동 열기 칸 (TV 입장 대기 화면 「⏰ 10:50 자동으로 열려요」) */
export const nextAuto = (S: Store, now: number, packs: LessonPack[]) => todaySlots(S, now, packs).find((r) => r.auto && !r.skip && !r.opened && r.L && now < r.start + 5 * 60e3) ?? null;
export const setAuto = (S: Store, on: boolean) => S.set(`${AUTO}/on`, on);
export const skipToday = (S: Store, now: number, p: number, v: boolean) => S.set(`${AUTO}/skip/${dayKey(now)}/${p}`, v || null);
export const dayOff = (S: Store, day: string, v: boolean) => S.set(`${AUTO}/off/${day}`, v || null);
export const pickToday = (S: Store, now: number, p: number, id: string | null) => S.set(`${AUTO}/pick/${dayKey(now)}/${p}`, id);
export const markOpened = (S: Store, now: number, p: number, code: string) => S.set(`${AUTO}/done/${dayKey(now)}/${p}`, code);
/** 그 반이 지금 열려 있나 (열려 있으면 자동으로 새로 열지 않음) */
export const isOpenCls = (S: Store, live: Live | null, cls: string) => !!live && !live.test && live.cls === cls && !S.get<boolean>(`rooms/${live.code}/state/closed`);

/** ⏰ 📜 11/24 자동 열기 한 번 보기 (교사 폰이 10초마다 · 종합실 PC 는 안 엶 = 교사 계정을 두지 않음)
 *  시작종 ~ +5분 · 그 반이 이미 열려 있으면 「열었음」 표시만 · 다른 수업이 열려 있으면 열지 않음 · done 칸 = 두 번 열림 막음
 *  돌려주는 값 = 새로 연 방 코드 (없으면 '') */
export function autoTick(S: Store, now: number, packs: LessonPack[], open: (cls: string, L: LessonPack) => string): string {
  const d = dueSlot(S, now, packs); if (!d?.L) return '';
  const lv0 = S.get<Live>('school/live');
  if (isOpenCls(S, lv0, d.cls)) { markOpened(S, now, d.p, lv0!.code); return ''; }
  if (lv0 && !S.get<boolean>(`rooms/${lv0.code}/state/closed`)) return '';
  const code = open(d.cls, d.L); if (code) markOpened(S, now, d.p, code);
  return code;
}
/** 화면 안내 한 줄 */
export const AUTO_NOTE = '교사 폰 앱이 켜져 있어야 열려요';
