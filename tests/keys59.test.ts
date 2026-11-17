// 🔑 #59 입장 열쇠 — 팩 v4 (11 · 12 · 13차시 + keys) 가 검사기를 통과 · 판 0 = 수업 소문제와 같은 물음 · 같은 답 · 한 소문제에 열쇠 하나 · 상자 셈
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import '../src/subjects/common-math2';
import type { LessonPack, Question, Room } from '../src/model/types';
import { checkUpload, revive } from '../src/school/packUpload';
import { answerText, chestsOf, keyBoard, keyFor, keyUses, keysOf, keyWindow, KEY_CHEST } from '../src/school/keys';
import { items } from '../src/engine/lessons';
const F = (f: string) => readFileSync(new URL(`../tools/pack-upload/keys/${f}`, import.meta.url), 'utf8');
const look = { sheet: () => true, theme: () => true, attack: () => true, builtIn: () => false };
const pack = (n: number) => { const c = checkUpload(F(`ex-${n}-v4.json`), look); return { c, L: revive(c.pack!) }; };
const norm = (q: Question) => JSON.stringify({ t: q.type, a: answerText(q) });

describe('🔑 #59 팩 v4', () => {
  for (const n of [11, 12, 13]) it(`${n}차시 = 검사 통과 · 열쇠 3 · 판 3 · 판 0 답 = 그 소문제 답`, () => {
    const { c, L } = pack(n);
    expect(c.issues.filter((i) => i.lvl === 'err')).toEqual([]);
    const ks = keysOf(L); expect(ks).toHaveLength(3);
    const raw = JSON.parse(F(`keys-${n}.json`)).keys as { id: string; vers: { same?: { at: string; n: number } }[] }[];
    for (const k of ks) {
      expect(k.vers).toHaveLength(3);
      const same = raw.find((x) => x.id === k.id)!.vers[0]!.same!;
      const sub = same.at === 'boss' ? null : items(L, same.at, 'check', 0)[same.n - 1]!;
      if (sub) { expect(norm(k.vers[0]!), `${n} ${k.id}`).toBe(norm(sub)); const last = (t: string) => t.split('\n').pop()!.replace(/^\s*\(\d+\)\s*/, '').replace(/\s+/g, ''), sq = last(sub.question), kq = last(k.vers[0]!.question); expect(kq.includes(sq.slice(0, 12)) || sq.includes(kq.slice(-12)), `${n} ${k.id} 물음 같음`).toBe(true); }
      expect(k.vers.every((q) => q.type === k.vers[0]!.type)).toBe(true);
      for (const u of k.uses) expect(keyFor(L, u.at, u.n)?.id).toBe(k.id);
    }
  });
  it('검사: 한 소문제에 열쇠 둘 = 오류 · 없는 몬스터 = 오류 · 4개 = 오류', () => {
    const p = JSON.parse(F('ex-13-v4.json'));
    p.keys[1].uses.push({ ...p.keys[0].uses[0] }); p.keys[2].uses.push({ at: 'm9', n: 1 });
    const c = checkUpload(JSON.stringify(p), look), msgs = c.issues.filter((i) => i.lvl === 'err').map((i) => i.msg).join(' | ');
    expect(msgs).toMatch(/한 소문제에 열쇠 하나/); expect(msgs).toMatch(/m9/);
    p.keys.push({ ...p.keys[0], id: 'k4' }); expect(checkUpload(JSON.stringify(p), look).issues.some((i) => /3개까지/.test(i.msg))).toBe(true);
  });
  it('열쇠 없는 팩 = 예전 그대로 (keys 칸 없음)', () => {
    const p = JSON.parse(F('ex-12-v4.json')); delete p.keys;
    const c = checkUpload(JSON.stringify(p), look); expect(c.issues.filter((i) => i.lvl === 'err')).toEqual([]); expect(keysOf(c.pack)).toEqual([]);
  });
  it('상자 = 열쇠 + 첫 시도 맞힘 · 한 차시 최대 3 · 재도전 맞힘 = 사용만 · 대기실 창 = 첫 몬스터 전까지', () => {
    const { L } = pack(11);
    const mk = (keys: Record<string, { ok: boolean }>, step = 0, lobby = false): Room => ({ meta: { code: 'T1', lesson: L.id, retries: 3, bossTries: 3, version: 4 }, state: { step: lobby ? -1 : step, stepAt: 0, phase: lobby ? 'lobby' : 'step' }, players: { u: { nick: 'a', keys } } } as unknown as Room);
    const R = mk({ k1: { ok: true }, k2: { ok: false }, k3: { ok: true } });
    const rows = keyUses(L, R, 'u'); expect(rows.length).toBe(7); expect(rows.every((r) => r.have && r.state === 'none' && !r.chest)).toBe(true);
    expect(chestsOf(L, R, 'u')).toBe(0); expect(KEY_CHEST).toEqual({ gem: 3, max: 3 });
    const b = keyBoard(L, R, ['u', 'v']); expect(b.all).toBe(1); expect(b.total).toBe(2); expect(b.worst?.id).toBe('k2');
    const firstMon = L.steps.findIndex((s) => s.kind === 'monster');
    expect(keyWindow(L, mk({}, firstMon - 1))).toBe(true); expect(keyWindow(L, mk({}, firstMon))).toBe(false);
  });
});
