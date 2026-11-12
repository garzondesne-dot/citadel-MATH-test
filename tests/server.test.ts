// 🔌 #137 시험 서버(Firebase 에뮬레이터)에서 동시에 제출 30명 — 체력 계산이 학생마다 한 번씩만 · 다른 기기가 보는 값 = 같음
//   학생 30명 = Firebase 연결 30개(앱 30개 · 거울 30개) · 각자 접속 신호 → 같은 순간 정답 제출 → 지켜보는 기기(교사 · TV 자리)가 체력 계산
//   에뮬레이터가 안 떠 있으면 건너뜀 (cd firebase && firebase emulators:start --only database,auth --project demo-citadel-test)
import { describe, expect, it } from 'vitest';
import type { Store } from '../src/model/types';
import { serverStore } from '../src/store/server';
import { heartbeat, nextStep, openRoom, submit } from '../src/raid/actions';
import { answerOf, itemsFor, monsterHp, record } from '../src/raid/raid';
import { roomPath } from '../src/raid/actions';
import type { Room } from '../src/model/types';
const getRoom = (S: Store, code: string) => S.get<Room>(roomPath(code));
import { packOf } from '../src/engine/packs';
import { PROFILES } from '../src/model/profiles';
import { SUBJ } from '../src/engine/subject';

const NS = 'demo-citadel-test-default-rtdb';
const up = await fetch(`http://127.0.0.1:9000/.json?ns=${NS}&shallow=true`, { headers: { Authorization: 'Bearer owner' } }).then(() => true, () => false);
const mk = () => serverStore({ firebase: { apiKey: 'demo-key', projectId: 'demo-citadel-test', databaseURL: `http://127.0.0.1:9000/?ns=${NS}`, authDomain: 'x' }, emulator: { host: '127.0.0.1', db: 9000, auth: 9099 }, name: `t${Math.random()}` });
const until = async (f: () => boolean, ms = 8000) => { const t0 = Date.now(); while (!f() && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 50)); return f(); };

describe.skipIf(!up)('시험 서버 · 동시에 30명 (#137)', () => {
  it('제출 30 → 데미지 = 30 × 소문제 · 학생마다 기록 한 번 · 다른 기기 값 같음', async () => {
    const L = packOf(SUBJ.defaultLesson)!, code = `T${Date.now() % 1e6}`;
    const teacher = await mk();
    openRoom(teacher, L, code, PROFILES.test);
    nextStep(teacher, L, code); nextStep(teacher, L, code); // 개념 1 → 문제 1
    const mid = 'm1';
    const kids: Store[] = await Promise.all(Array.from({ length: 30 }, () => mk()));
    await until(() => kids.every((k) => !!getRoom(k, code)));
    kids.forEach((k, i) => heartbeat(k, code, `s1_3_${i + 1}`, i + 1, `학생${i + 1}`, { cls: '1-3' }));
    await until(() => Object.keys(getRoom(teacher, code)?.players || {}).length === 30);
    // 같은 순간 정답 제출 (각자 자기 칸만 씀)
    kids.forEach((k, i) => { const R = getRoom(k, code)!, u = `s1_3_${i + 1}`; submit(k, L, code, mid, u, itemsFor(L, R, mid, u, 0).map(answerOf)); });
    const n = itemsFor(L, getRoom(teacher, code)!, mid, '_', 0).length;
    await until(() => Object.keys(getRoom(teacher, code)?.subs?.[mid] || {}).length === 30);
    const R = getRoom(teacher, code)!, now = teacher.now(), hp = monsterHp(L, R, mid, now);
    expect(Object.keys(R.subs?.[mid] || {}).length).toBe(30);
    expect(hp.dmg).toBe(30 * n);
    expect(hp.max).toBe(Math.floor((30 * n * hp.pct) / 100));
    for (let i = 0; i < 30; i++) { const rec = record(L, R, mid, `s1_3_${i + 1}`) as { best: number; nextAttempt: number }; expect(rec.best).toBe(n); expect(rec.nextAttempt).toBe(1); }
    // 다른 기기(학생 한 명의 거울)도 같은 값
    const k0 = kids[0]!; await until(() => Object.keys(getRoom(k0, code)?.subs?.[mid] || {}).length === 30);
    expect(monsterHp(L, getRoom(k0, code)!, mid, now).dmg).toBe(hp.dmg);
  }, 60000);
});

describe.skipIf(!up)('시험 서버 규칙 · 학생 기록 칸은 그 학생만 (#141)', () => {
  it('익명 · 다른 학생 = 남의 💎 쓰기 거부 · 그 학생 = 됨', async () => {
    const { ref, set } = await import('firebase/database');
    const fa = await import('firebase/auth');
    const cls = '1-7', n1 = Math.floor(Math.random() * 1e6), n2 = n1 + 1;
    const own = await mk(), other = await mk(), anon = await mk();
    const c1 = await fa.createUserWithEmailAndPassword(own.auth, `r${n1}@t.local`, 'cdm-1234');
    await set(ref(own.db, `accounts/${cls}/${n1}`), { uid: c1.user.uid, at: 1 });
    const c2 = await fa.createUserWithEmailAndPassword(other.auth, `r${n2}@t.local`, 'cdm-1234');
    await set(ref(other.db, `accounts/${cls}/${n2}`), { uid: c2.user.uid, at: 1 });
    await expect(set(ref(own.db, `gem/${cls}/${n1}`), { total: 5 })).resolves.toBeUndefined();
    await expect(set(ref(other.db, `gem/${cls}/${n1}`), { total: 99999 })).rejects.toThrow();
    await expect(set(ref(anon.db, `gem/${cls}/${n1}`), { total: 99999 })).rejects.toThrow();
    await expect(set(ref(anon.db, `records/${cls}/${n1}/x`), { right: 9 })).rejects.toThrow();
  }, 30000);
});
