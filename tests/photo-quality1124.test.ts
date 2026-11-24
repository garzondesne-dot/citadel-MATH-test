// 🐞 11/24 학생 인터뷰 「샤프 · 지운 자국 · 번짐이면 AI 가 못 읽음 · 사진 화질이 깨져 글씨가 안 보임」 = 보낼 때 긴 변 1568 · 흐린 사진 대비 펴기
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { EDGE, QUAL, stretchLevels } from '../src/school/photo';
const px = (vals: number[]) => { const d = new Uint8ClampedArray(vals.length * 4); vals.forEach((v, i) => { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }); return d; };
describe('📷 사진 보내기 화질', () => {
  it('긴 변 1568 (AI 최대) · JPEG 0.85 · 서버 상한 base64 1.6M 안', () => {
    expect([EDGE, QUAL]).toEqual([1568, 0.85]);
    expect(readFileSync('tools/apps-script/photo-grade.gs', 'utf8')).toMatch(/IMG_MAX = 1600000/);
  });
  it('흐린 사진(회색 종이 170 · 연한 샤프 120) = 종이 255 · 글씨 0 쪽으로 펴짐', () => {
    const d = px([...Array(90).fill(170), ...Array(10).fill(120)]);
    expect(stretchLevels(d)).toBe(true);
    expect(d[0]).toBe(255); expect(d[90 * 4]).toBe(0);
  });
  it('이미 또렷한 사진 · 빈 종이 = 그대로', () => {
    const a = px([...Array(90).fill(250), ...Array(10).fill(20)]); expect(stretchLevels(a)).toBe(false); expect(a[0]).toBe(250);
    const b = px(Array(100).fill(200)); expect(stretchLevels(b)).toBe(false);
  });
  it('보내기 = 줄인 뒤 대비 펴기 (화면 고침이 PhotoSheet 에 있음)', () => {
    expect(readFileSync('src/ui/q/PhotoSheet.svelte', 'utf8')).toMatch(/stretchLevels\(im\.data\)/);
  });
});
