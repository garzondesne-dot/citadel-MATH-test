// 🐞 #127 교사 반 탭 = 「⚠ 서버 값이 덜 와서」: 서버 watch 는 값이 있으면 콜백을 바로 부름 → $effect 안에서 watch 를 걸고 콜백이 상태를 바꾸면
//   그 효과가 상태를 읽고 쓴 꼴이 되어 끝없이 다시 돎(effect_update_depth_exceeded). $effect 안 S.watch 는 untrack 으로 감쌀 것.
import { expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
const files = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(d, e.name)) : e.name.endsWith('.svelte') ? [path.join(d, e.name)] : []));
it('$effect 안에서 바로 S.watch 를 거는 줄 = untrack 으로 감쌈', () => {
  const bad = files('src').flatMap((f) => fs.readFileSync(f, 'utf8').split('\n').map((l, i) => ({ f, i: i + 1, l })).filter(({ l }) => /\$effect\(\s*\(\)\s*=>\s*\{?\s*[^;]*?\bS\.watch\(/.test(l) && !/untrack/.test(l)));
  expect(bad.map((b) => `${b.f}:${b.i}`)).toEqual([]);
});
