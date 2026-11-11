import { ECON_VER, migrate, type Wallet } from '../model/wallet';
// 🧑 학생 한 명의 기록 (테스트 버전 = 이 기기 · 서버 없음) — 출시 때 서버 꽂개로 바꿈
//   seen = 캠프에서 한 번이라도 눌러 본 물건 (#111 ② 이름표 규칙)
//   socket = 용사마다 끼운 스킬 · title = 고른 호칭 id(hero-data titles · 'none' = 안 닮) · 산 용사 · 스킬 = wallet.buys { id, ver } · test = 🧪 테스트 기록(「테스터」 배지)
export interface Me { nick: string; hero: number; enh: number; xp: number; socket: Record<string, string>; title: string; wallet: Wallet; seen: Record<string, true>; wish: number; test: boolean }
const KEY = 'citadel-v1-me';
const fresh = (gem: number, scroll: number, test: boolean): Me => ({ nick: '학생 01', hero: 0, enh: 0, xp: 0, socket: {}, title: 'none', wallet: { gem, scroll, buys: [], ver: ECON_VER }, seen: {}, wish: 0, test });
function load(gem: number, scroll: number, test: boolean): Me {
  try { const raw = localStorage.getItem(KEY); if (raw) { const m = JSON.parse(raw) as Me; m.wallet = migrate(m.wallet); return { ...fresh(gem, scroll, test), ...m, test }; } } catch { /* 이 기기 저장 막힘 */ }
  return fresh(gem, scroll, test);
}
export function useMe(gem: number, scroll: number, test = false) {
  const me = $state<Me>(load(gem, scroll, test));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(me)); } catch { /* 무시 */ } };
  return { me, save, mark(id: string) { if (!me.seen[id]) { me.seen[id] = true; save(); } } };
}
/** 이 기기에 저장된 출전 용사 · 강화 (전투 장면이 읽음 · 없으면 로안) */
export function savedLook(): { hero: number; enh: number } {
  try { const raw = localStorage.getItem(KEY); if (raw) { const m = JSON.parse(raw) as Partial<Me>; return { hero: Number(m.hero) || 0, enh: Number(m.enh) || 0 }; } } catch { /* 무시 */ }
  return { hero: 0, enh: 0 };
}
