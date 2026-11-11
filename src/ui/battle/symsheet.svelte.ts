// 📖 기호 톡 시트 상태 (화면에 하나) · 본 기호 = 회색 형광펜 (이 탭에서만 기억)
export const symState = $state<{ open: string | null; seen: Record<string, true> }>({ open: null, seen: {} });
export function openSym(id: string) { symState.open = id; symState.seen[id] = true; }
export function closeSym() { symState.open = null; }
