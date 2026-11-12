import type { FirebaseOptions } from 'firebase/app';
import type { Store } from '../model/types';
import { deviceStore } from './device';

// 🔌 「어느 서버」 설정 하나 (#137 · V1-DESIGN 7절 · L0 ④) — 값은 코드에 박지 않고 사이트의 server.json 한 곳
//   server.json = { "mode": "device" }                                   ← 이 기기(두 탭 시험 · 기본)
//               = { "mode": "server", "firebase": { apiKey, authDomain, databaseURL, projectId, appId } }  ← 시험 서버
//   시험(에뮬레이터): 주소에 ?emu=127.0.0.1 → 이 브라우저에 기억 · ?emu=off 로 끔 (Firebase 에뮬레이터 · 프로젝트 demo-citadel-test)
//   ⚠ 운영 프로젝트(citadel-math)는 절대 연결하지 않음 → 이 기기로 돌아가고 붉은 띠
export const FORBIDDEN_PROJECTS = ['citadel-math'];
export type Where = { kind: 'device' | 'server' | 'emulator'; label: string; blocked?: string };
export interface ServerJson { mode?: 'device' | 'server'; firebase?: FirebaseOptions }
const EMU_KEY = 'citadel-v1-emu';

/** 설정값이 운영 서버를 가리키는가 (projectId · databaseURL · authDomain 어느 하나라도) */
export function isForbidden(f: FirebaseOptions | undefined): boolean {
  if (!f) return false;
  const txt = [f.projectId, f.databaseURL, f.authDomain].filter(Boolean).join(' ').toLowerCase();
  return FORBIDDEN_PROJECTS.some((id) => f.projectId === id || new RegExp(`(^|[/. ])${id}(-default-rtdb)?[.]`).test(txt));
}

export async function chooseStore(): Promise<{ S: Store; where: Where }> {
  const q = new URLSearchParams(location.search);
  try { const e = q.get('emu'); if (e === 'off') localStorage.removeItem(EMU_KEY); else if (e) localStorage.setItem(EMU_KEY, e); } catch { /* 저장 막힘 */ }
  let emu: string | null = null;
  try { emu = localStorage.getItem(EMU_KEY); } catch { /* 무시 */ }
  let cfg: ServerJson = { mode: 'device' };
  if (!emu) { try { const r = await fetch(`./server.json?t=${Date.now()}`, { cache: 'no-store' }); if (r.ok) cfg = (await r.json()) as ServerJson; } catch { /* 없음 = 이 기기 */ } }
  if (emu) {
    const { serverStore } = await import('./server');
    const S = await serverStore({ firebase: { apiKey: 'demo-key', projectId: 'demo-citadel-test', databaseURL: `http://${emu}:9000/?ns=demo-citadel-test-default-rtdb`, authDomain: 'demo-citadel-test.firebaseapp.com' }, emulator: { host: emu, db: 9000, auth: 9099 } });
    return { S, where: { kind: 'emulator', label: '🔌 시험 서버(에뮬레이터)' } };
  }
  if (cfg.mode === 'server' && cfg.firebase) {
    if (isForbidden(cfg.firebase)) return { S: deviceStore(), where: { kind: 'device', label: '이 기기', blocked: `운영 서버(${cfg.firebase.projectId}) 설정이라 연결하지 않았어요 · server.json 을 시험 프로젝트로 바꿔 주세요` } };
    const { serverStore } = await import('./server');
    try { const S = await serverStore({ firebase: cfg.firebase }); return { S, where: { kind: 'server', label: '🔌 시험 서버' } }; }
    catch (e) { return { S: deviceStore(), where: { kind: 'device', label: '이 기기', blocked: `시험 서버에 닿지 못했어요 (${(e as Error).message})` } }; }
  }
  return { S: deviceStore(), where: { kind: 'device', label: '이 기기' } };
}
