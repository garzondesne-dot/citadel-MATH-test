import type { Store } from '../model/types';

// 🎲 던전 = 교사 설정 (📜 2026-11-17 #22 ③ · DECISIONS 「📦 준비 탭 → 「📦 차시 팩」 탭」 4): school/rdun/{차시} = { m: 'pack' | 'auto' | 'pick', d?: 던전 }
//   🖼 팩 그대로(pack) · 🎲 자동(auto · 팩을 올릴 때 한 번 정해 고정) · 고르기(pick · 12곳 통째) — 팩 파일은 바뀌지 않음 · 학생 · TV · 테스트가 같은 값
//   (예전 = 그림 없는 차시를 차시 번호순으로 그때그때 다시 계산 → 새 팩이 들어오면 던전이 바뀜 · 이제 없앰)
export type RdMode = 'pack' | 'auto' | 'pick';
export interface RdCfg { m: RdMode; d?: string }
export const RD_PATH = 'school/rdun';
/** 앱 전체가 읽는 설정 (bindFeatures 가 서버 값을 채움 · 시험은 직접) */
export const RD: Record<string, RdCfg> = {};
export function applyRd(v: Record<string, RdCfg> | null | undefined) { for (const k of Object.keys(RD)) delete RD[k]; Object.assign(RD, v || {}); }
const key = (id: string) => id.replace(/[.#$/[\]]/g, '_');
export const rdOf = (id: string): RdCfg | null => RD[key(id)] ?? null;
export function setRd(S: Store, id: string, c: RdCfg | null) { S.set(`${RD_PATH}/${key(id)}`, c); if (c) RD[key(id)] = c; else delete RD[key(id)]; }
