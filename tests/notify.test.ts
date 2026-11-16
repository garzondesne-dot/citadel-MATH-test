// 🔔 교사 알림 ① (📜 2026-11-16 · DECISIONS 「📲 교사 APK + 교사 알림」) — 알릴 것 고르기 · 이름 없음 · 첫 번 = 기준만
import { describe, expect, it } from 'vitest';
import { diffNotes, LOGIN_FAIL_N } from '../src/school/notify.svelte';
import { BUILD } from '../src/build';
import type { Store } from '../src/model/types';

const fake = (data: Record<string, unknown>): Store => ({ kind: 'server', get: (p: string) => p.split('/').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : null), data) ?? null } as unknown as Store);
const NOW = new Date('2026-11-16T10:00:00').getTime();

describe('🔔 교사 알림', () => {
  it('첫 번 = 알리지 않고 기준만', () => {
    const S = fake({ photo: { '1-3': { 2: { k: { a: { status: 'check' } } } } } });
    const r = diffNotes(S, null, NOW, BUILD);
    expect(r.notes).toEqual([]);
    expect(r.next.photo).toHaveLength(1);
  });
  it('새 사진 · 새 메시지 = 반별 한 줄 · 학생 이름 · 번호 없음', () => {
    const S0 = fake({});
    const base = diffNotes(S0, null, NOW, BUILD).next;
    const S = fake({ photo: { '1-3': { 2: { k: { a: { status: 'check' }, b: { status: 'check' } } } }, '1-5': { 7: { k: { c: { status: 'done' } } } } },
      school: { inbox: { m1: { id: 'm1', kind: 'idea', title: '홍길동', sub: '', at: NOW, from: { cls: '1-3', num: 2 } } } } });
    const { notes } = diffNotes(S, base, NOW, BUILD);
    const ph = notes.find((n) => n.kind === 'photo')!, msg = notes.find((n) => n.kind === 'hand')!;
    expect(ph.title).toBe('📷 사진 확인 2장');
    expect(ph.body).toContain('1-3반 2장');
    expect(msg.body).toContain('1-3반 1개');
    expect(JSON.stringify(notes)).not.toMatch(/홍길동|2번/);
  });
  it(`🔑 오늘 ${LOGIN_FAIL_N}번 이상 = 한 번만 · 어제 실패는 안 셈`, () => {
    const base = diffNotes(fake({}), null, NOW, BUILD).next;
    const today = NOW - 3600e3, yday = NOW - 30 * 3600e3;
    const S = fake({ loginFail: { '1-3': { 4: { a: today, b: today, c: today } }, '1-5': { 1: { a: yday, b: yday, c: today } } } });
    const r1 = diffNotes(S, base, NOW, BUILD);
    expect(r1.notes.map((n) => n.title)).toEqual(['🔑 로그인 실패 여러 번 · 1명']);
    expect(r1.notes[0]!.body).toContain('1-3반 1명');
    expect(diffNotes(S, r1.next, NOW, BUILD).notes).toEqual([]);
  });
  it('🆕 사이트 판이 바뀌면 한 번', () => {
    const base = diffNotes(fake({}), null, NOW, BUILD).next;
    const r = diffNotes(fake({}), base, NOW, 'b999');
    expect(r.notes.map((n) => n.kind)).toEqual(['deploy']);
    expect(diffNotes(fake({}), r.next, NOW, 'b999').notes).toEqual([]);
  });
});
