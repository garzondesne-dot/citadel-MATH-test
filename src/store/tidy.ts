// 🐞 ⓪ 11/19 · ③ 11/20 반쪽 데이터 = 서버에 늦게 온 쓰기(접속 신호 등)만 남은 칸 → 화면이 읽기 전에 거름 (서버 거울 · 이 기기 저장 같은 규칙)
//   방(rooms/{코드}) = state · meta 둘 다 객체여야 방 · 방 안 players/{uid} = 객체이고 nick 이나 num 이 있어야 사람 (seen 만 남은 줄 = 나간 뒤 늦게 온 접속 신호)
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
export const halfRoom = (v: unknown) => !!v && (!isObj(v) || !(isObj(v.state) && isObj(v.meta)));
function roomOk(r: Obj): Obj {
  const pl = r.players;
  if (pl == null || !isObj(pl)) return pl == null ? r : { ...r, players: {} };
  const bad = Object.entries(pl).filter(([, x]) => !isObj(x) || (x.nick == null && x.num == null));
  if (!bad.length) return r;
  return { ...r, players: Object.fromEntries(Object.entries(pl).filter(([, x]) => isObj(x) && (x.nick != null || x.num != null))) };
}
export function tidy(parts: string[], v: unknown): unknown {
  if (parts[0] !== 'rooms' || !v) return v;
  if (parts.length === 2) return halfRoom(v) ? null : roomOk(v as Obj);
  if (parts.length === 1 && isObj(v)) return Object.fromEntries(Object.entries(v).filter(([, r]) => r != null && !halfRoom(r)).map(([k, r]) => [k, roomOk(r as Obj)]));
  if (parts.length === 3 && parts[2] === 'players' && isObj(v)) return (roomOk({ players: v }).players as Obj) ?? v;
  return v;
}
