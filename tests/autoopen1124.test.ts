// ⏰ 📜 11/24 자동 열기 = 교사 폰 (안 2) · 종합실 PC 는 열지 않음 · done 으로 두 번 막음
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { memoryStore } from '../src/store/device';
import type { Store } from '../src/model/types';
import { PACKS } from '../src/engine/packs';
import { autoTick, setAuto, dayKey, AUTO_NOTE } from '../src/school/autoOpen';
import { openLesson } from '../src/school/openLesson';

const mk = (): Store => ({ ...memoryStore(), kind: 'memory' as const }) as Store;
const kst = (h: number, m: number) => Date.UTC(2026, 10, 16, h - 9, m); // 2026-11-16 월
describe('⏰ autoTick', () => {
  it('시작종 ~ 5분에 한 번 엶 · 두 번째 틱 = 안 엶 · 창 밖 = 안 엶', () => {
    const S = mk(); S.set('school/sched', { 1: { 3: '1-4' } }); setAuto(S, true);
    let n = 0; const open = (c: string, L: (typeof PACKS)[number]) => { n++; return openLesson(S, c, L); };
    expect(autoTick(S, kst(10, 59), PACKS, open)).toBe('');
    const code = autoTick(S, kst(11, 1), PACKS, open);
    expect(code).not.toBe(''); expect(n).toBe(1);
    expect(S.get(`school/auto/done/${dayKey(kst(11, 1))}/3`)).toBe(code);
    expect(autoTick(S, kst(11, 2), PACKS, open)).toBe(''); expect(n).toBe(1);
  });
  it('다른 수업이 열려 있으면 안 엶 · 스위치 끔 = 안 엶', () => {
    const S = mk(); S.set('school/sched', { 1: { 3: '1-4' } });
    let n = 0; const open = (c: string, L: (typeof PACKS)[number]) => { n++; return openLesson(S, c, L); };
    expect(autoTick(S, kst(11, 1), PACKS, open)).toBe(''); // 끔
    setAuto(S, true); openLesson(S, '1-3', PACKS[0]!); n = 0;
    expect(autoTick(S, kst(11, 1), PACKS, open)).toBe(''); expect(n).toBe(0);
  });
  it('화면: 종합실 PC 타이머 없음 · 교사 폰이 엶 · 안내 한 줄', () => {
    const hall = fs.readFileSync('src/ui/Hall.svelte', 'utf8'), ta = fs.readFileSync('src/ui/teacher/TeacherApp.svelte', 'utf8');
    expect(hall).not.toMatch(/dueSlot|setInterval\(\(\) => \{\s*if \(!feat\('schedule'\)/);
    expect(ta).toMatch(/autoTick\(S, Date\.now\(\), packs/);
    expect(ta).toContain("document.visibilityState === 'hidden'");
    expect(AUTO_NOTE).toBe('교사 폰 앱이 켜져 있어야 열려요');
    expect(fs.readFileSync('src/ui/tv/TV.svelte', 'utf8')).toContain('⏰ 다음 자동 열기 {nxa.hm}');
    expect(fs.readFileSync('src/ui/teacher/TToday.svelte', 'utf8')).toContain('data-k="auto-note"');
  });
});
