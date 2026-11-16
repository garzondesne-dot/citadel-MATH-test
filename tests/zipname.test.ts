// 🔤 zip 안 한글 파일 이름 (📜 2026-11-16 학교판 · UTF-8 표시 없는 zip · 윈도 EUC-KR)
import { describe, expect, it } from 'vitest';
import { fixZipName } from '../src/school/packUpload';
const latin1 = (b: Uint8Array) => String.fromCharCode(...b);
describe('🔤 zip 파일 이름', () => {
  it('UTF-8 바이트를 한 글자씩 읽은 이름 → 바른 한글', () => {
    const want = '(중1통계2차시) 01_대푯값.mp4';
    expect(fixZipName(latin1(new TextEncoder().encode(want)))).toBe(want);
  });
  it('윈도 EUC-KR 이름도', () => {
    const euc = new Uint8Array([0xc7, 0xd0, 0xbd, 0xc0, 0xc1, 0xf6, 0x2e, 0x70, 0x64, 0x66]); // 학습지.pdf
    expect(fixZipName(latin1(euc))).toBe('학습지.pdf');
  });
  it('이미 바른 이름 · 영문은 그대로', () => {
    expect(fixZipName('학습지.pdf')).toBe('학습지.pdf');
    expect(fixZipName('pack-01.json')).toBe('pack-01.json');
  });
});
