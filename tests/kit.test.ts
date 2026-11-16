// 📦 차시 팩 만들기 꾸러미 (📜 2026-11-17 #22): 예시 차시 팩(06) = 「📦 차시 팩 올리기」 검사 통과 · 그림 칸 비어 있음 = 그림 없음(🎲 던전)
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { checkUpload } from '../src/school/packUpload';
import { SUBJ } from '../src/engine/subject';
import { ATTACKS } from '../src/raid/attacks';
import { PACKS } from '../src/engine/packs';
import { artless } from '../src/ui/rdun';

const look = { sheet: (r: string) => (r.split(':')[0]!.replace(/@.*$/, '') in SUBJ.themes.sheets), theme: (t: string) => !t || t in SUBJ.themes.dungeons, attack: (a: string) => a in ATTACKS, builtIn: (id: string) => PACKS.some((p) => p.id === id) };
describe('📦 꾸러미 예시 팩', () => {
  const f = readdirSync('kit').find((x) => x.startsWith('06_'))!;
  const r = checkUpload(readFileSync(`kit/${f}`, 'utf8'), look);
  it('검사 통과 (고칠 칸 0)', () => { expect(r.issues.filter((x) => x.lvl === 'err').map((x) => `${x.at} ${x.msg}`)).toEqual([]); expect(r.pack).toBeTruthy(); });
  it('그림 칸 비어 있음 = 그림 없음 → 🎲 던전', () => { expect(artless(r.pack!)).toBe(true); });
});
