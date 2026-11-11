import { ECON_VER, migrate, type Wallet } from '../model/wallet';
// 🧑 학생 한 명의 기록 (테스트 버전 = 이 기기 · 서버 없음) — 출시 때 서버 꽂개로 바꿈
//   seen = 캠프에서 한 번이라도 눌러 본 물건 (#111 ② 이름표 규칙)
export interface Me { nick: string; hero: number; enh: number; xp: number; owned: string[]; equip: string; title: string; wallet: Wallet; seen: Record<string, true>; wish: number }
const KEY = 'citadel-v1-me';
const fresh = (gem: number, scroll: number): Me => ({ nick: '학생 01', hero: 0, enh: 0, xp: 0, owned: [], equip: 'cut', title: '', wallet: { gem, scroll, buys: [], ver: ECON_VER }, seen: {}, wish: 0 });
function load(gem: number, scroll: number): Me {
  try { const raw = localStorage.getItem(KEY); if (raw) { const m = JSON.parse(raw) as Me; m.wallet = migrate(m.wallet); return { ...fresh(gem, scroll), ...m }; } } catch { /* 이 기기 저장 막힘 */ }
  return fresh(gem, scroll);
}
export function useMe(gem: number, scroll: number) {
  const me = $state<Me>(load(gem, scroll));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(me)); } catch { /* 무시 */ } };
  return { me, save, mark(id: string) { if (!me.seen[id]) { me.seen[id] = true; save(); } } };
}
