/* eslint-disable @typescript-eslint/no-explicit-any */
// ⚒ 모루 연성법 모양 (#148 · 정식 DS.Unit · cardKit) — 값은 과목 팩이 줌
export interface ForgeCard { /** 단원 (#58 · 'set' · 'func') */ unit?: string; id: string; no: number; sec: string; name: string; short?: string; fm: string; mf?: string; desc: string; grade: 1 | 2 | 3; art: number; page: string; op: string; in: string[]; ordered?: boolean; alt?: { op: string; in: string[] }[]; hint: string; ex: any }
export interface ForgeUnit {
  MATS: { id: string; sym: string; tip: string; unit?: string }[]; OPS: { id: string; sym: string; no: number; unary?: boolean; unit?: string }[]; CARDS: ForgeCard[]; MISTAKES: Record<string, string>;
  card(id: string): ForgeCard | undefined; opOf(id: string): { id: string; sym: string; no: number; unary?: boolean } | undefined; opens(no: number): ForgeCard[];
  forge(op: string | null, left: string | null, right: string | null, no: number): { ok: true; card: ForgeCard } | { ok: false; msg: string };
  recipes(c: ForgeCard): { op: string; in: string[]; ordered: boolean }[]; GRADES: Record<number, string>;
  /** 📦 모루 단원 탭 (#58 · 차례대로 · from = 그 단원 첫 차시) */ UNITS?: { id: string; name: string; icon: string; from: number }[];
}
export interface CardKit { frame: string; w: number; h: number; arts: { src: string; cols: number; rows: number; map: Record<string, number> }; box: Record<'top' | 'art' | 'desc' | 'fm' | 'plate' | 'gem', [number, number, number, number]> }
