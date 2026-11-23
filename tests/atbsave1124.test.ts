import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

// 🐞 11/24 게시판 결과 저장 = 결과 화면이 뜨는 순간 · 판마다 한 번 · 다시 열면 되살림 (e2e = tools/e2e/atbsave1124-emu.cjs)
const B = fs.readFileSync('src/ui/board/Board.svelte', 'utf8'), N = fs.readFileSync('src/ui/board/atb/AtbNet.svelte', 'utf8');
describe('🐞 게시판 결과 저장', () => {
  it('A: AtbNet 결과가 정해지면 onresult → Board 가 바로 저장', () => {
    expect(N).toMatch(/store\.set\(`\$\{base\}\/end\/\$\{uid\}`, res\); phase = 'result';\s*onresult\?\.\(res\);/);
    expect(B).toContain('onresult={(r) =>');
  });
  it('한 번만: 앱 안 기억(ATB_SAVED) + 서버 기록 이름 「판id_」 확인 · 나감도 같은 문', () => {
    expect(B).toContain('const ATB_SAVED = new Set<string>()');
    expect(B).toMatch(/hasRec\(p\.pid\)\) ATB_SAVED\.add\(p\.pid\)/);
    expect(B).toMatch(/first = !ATB_SAVED\.has\(p\.pid\); ATB_SAVED\.add\(p\.pid\);/);
  });
  it('B: 게시판을 열면 판 끝 값은 있는데 기록 없는 내 판 = 한 번 저장 (나감 · 테스트 반 · 이 기기 빼고)', () => {
    expect(B).toContain('async function healAtb');
    expect(B).toMatch(/S\.fetch<AtbEnd>\(`atb\/\$\{p\.pid\}\/end\/\$\{uid\}`\)/);
    expect(B).toMatch(/if \(!r \|\| r\.left/);
    expect(B).toMatch(/isBeta\(S, cls\) \|\| S\.kind !== 'server'/);
  });
});
