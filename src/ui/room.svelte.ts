import type { Room, Store } from '../model/types';
import { roomPath } from '../raid/actions';

// 방 상태를 화면에 잇는 반응형 값 (Svelte 5 runes) — 저장소 구독 + 1초 시계(접속 판정용)
export function liveRoom(S: Store, code: string) {
  const v = $state<{ room: Room | null; now: number }>({ room: S.get<Room>(roomPath(code)), now: S.now() });
  const unsub = S.watch<Room>(roomPath(code), (r) => { v.room = r; });
  const t = setInterval(() => { v.now = S.now(); }, 1000);
  return { v, stop: () => { unsub(); clearInterval(t); } };
}
