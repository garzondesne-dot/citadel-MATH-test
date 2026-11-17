// 📖 기호 톡 시트 상태 (화면에 하나) · 본 기호 = 회색 형광펜 (이 탭에서만 기억)
import { setSymLesson, tapSym } from '../../school/symtap';
import { SUBJ } from '../../engine/subject';
export const symState = $state<{ open: string | null; seen: Record<string, true>; prop: boolean }>({ open: null, seen: {}, prop: false });
export function openSym(id: string) { symState.open = id; symState.seen[id] = true; tapSym(id); }
export function closeSym() { symState.open = null; }

/** 📖 지금 문제의 차시 = 누른 횟수 칸 + 명제 낱말 켜기(과목 팩 propOn · #49) */
export function setSymPack(L: { id: string; no?: number; kind?: string }) { setSymLesson(L.id); symState.prop = !!SUBJ.symtalk?.propOn?.(L); }
