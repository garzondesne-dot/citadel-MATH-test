// 🎥 #150 촬영 모드: 방 meta/film = true 인 동안 방에 올라가는 이름 = 가린 이름 · 끄면 다시 실명 · TV · 리모컨은 명단도 가림
import { describe, expect, it } from 'vitest';
import type { LessonPack, Room, Store } from '../src/model/types';
import pack from '../src/subjects/common-math2/lessons/set-06.json';
import { PROFILES } from '../src/model/profiles';
import { memoryStore } from '../src/store/device';
import { heartbeat, openRoom, roomPath } from '../src/raid/actions';
import { maskName } from '../src/school/school';
import { readFileSync } from 'node:fs';
const L = pack as unknown as LessonPack;

describe('#150 촬영 모드', () => {
  it('켜면 방 이름 = 김*수 꼴 · 끄면 실명 · 다른 방은 그대로', () => {
    const S: Store = memoryStore(); openRoom(S, L, 'F1', PROFILES.class); openRoom(S, L, 'F2', PROFILES.class);
    heartbeat(S, 'F1', 'a', 1, '김민수'); expect(S.get<Room>(roomPath('F1'))!.players!.a!.nick).toBe('김민수');
    S.set(`${roomPath('F1')}/meta/film`, true);
    heartbeat(S, 'F1', 'a', 1, '김민수'); heartbeat(S, 'F2', 'b', 2, '이영희');
    expect(S.get<Room>(roomPath('F1'))!.players!.a!.nick).toBe(maskName('김민수'));
    expect(maskName('김민수')).toBe('김*수');
    expect(S.get<Room>(roomPath('F2'))!.players!.b!.nick).toBe('이영희'); // 촬영 모드는 그 수업 방에만
    S.set(`${roomPath('F1')}/meta/film`, null); heartbeat(S, 'F1', 'a', 1, '김민수');
    expect(S.get<Room>(roomPath('F1'))!.players!.a!.nick).toBe('김민수');
  });
  it('TV · 리모컨 = 명단 이름도 가림 · TV 에는 촬영 표시 없음 · 교사 폰에 단추', () => {
    const tv = readFileSync(new URL('../src/ui/tv/TV.svelte', import.meta.url), 'utf8'), tl = readFileSync(new URL('../src/ui/teacher/TLive.svelte', import.meta.url), 'utf8');
    expect(tv).toMatch(/film \? maskName\(n\)/); expect(tv).not.toMatch(/촬영 중/);
    expect(tl).toMatch(/filmOn \? \{ \.\.\.p, name: maskName\(p\.name\) \}/); expect(tl).toMatch(/data-k="tl-film"/);
  });
  it('📜 11/24 종합실 ⚙ 설정에도 같은 스위치 = 같은 칸(방 meta/film)', () => {
    const tv = readFileSync(new URL('../src/ui/tv/TV.svelte', import.meta.url), 'utf8');
    expect(tv).toMatch(/data-k="tvfilm" onclick=\{\(\) => S\.set\(`\$\{roomPath\(code\)\}\/meta\/film`, film \? null : true\)\}/);
  });
});
