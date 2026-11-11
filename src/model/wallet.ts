// 💰 지갑 (hero-v2 DECISIONS 「💰 경제 변경 규칙」 ④ · V1-DESIGN 7절): 산 것마다 { id, ver: 산 때의 경제 판 }
//   경제 판이 바뀌면 접속 때 게임이 자기 기록만 MIGRATE[ver] 로 새 판으로 한 번 옮김(기록 남김) · 값이 바뀐 것은 옮기지 않음
export const ECON_VER = 1;
export type Buy = { id: string; ver: number; at: number };
export interface Wallet { gem: number; scroll: number; buys: Buy[]; ver: number; log?: string[] }
/** 판별 이전 표: MIGRATE[옛 판] = { 옛 칸 id: 새 칸 id } (지금은 1판뿐 → 빈 표) */
export const MIGRATE: Record<number, Record<string, string>> = {};
export function migrate(w: Wallet): Wallet {
  let cur = { ...w, buys: w.buys.map((b) => ({ ...b })), log: [...(w.log || [])] };
  for (let v = w.ver; v < ECON_VER; v++) {
    const map = MIGRATE[v] || {};
    cur.buys = cur.buys.map((b) => (map[b.id] ? { id: map[b.id] as string, ver: v + 1, at: b.at } : { ...b, ver: v + 1 }));
    cur.log.push(`경제 ${v} → ${v + 1} 판 옮김`);
  }
  cur.ver = ECON_VER;
  return cur;
}
