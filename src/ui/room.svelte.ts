import type { Room, Store } from '../model/types';
import { roomPath } from '../raid/actions';

// 방 상태를 화면에 잇는 반응형 값 (Svelte 5 runes) — 저장소 구독만 (시계는 clock.svelte.ts 하나)
export function liveRoom(S: Store, code: string) {
  const v = $state<{ room: Room | null }>({ room: S.get<Room>(roomPath(code)) });
  const stop = S.watch<Room>(roomPath(code), (r) => { v.room = r; });
  return { v, stop };
}
/** 저장소 한 갈래를 반응형으로 (school/live · gifts 등) */
export function liveValue<T>(S: Store, path: string) {
  const v = $state<{ val: T | null }>({ val: S.get<T>(path) });
  const stop = S.watch<T>(path, (x) => { v.val = x; });
  return { v, stop };
}
