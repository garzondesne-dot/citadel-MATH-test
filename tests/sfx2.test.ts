import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { SFX } from '../src/ui/manifest';
const IDS = ['board', 'castle-open', 'chain-break', 'chain-lock', 'class-start', 'combo', 'countdown', 'dizzy', 'door-close', 'dummy-hit', 'energy-card', 'enh-fail', 'enh-great', 'enh-ok', 'fire-out', 'focus', 'fog-clear', 'game-no', 'game-ok', 'glitch', 'heart-break', 'heart-up', 'hero-pick', 'holy-on', 'ice-crack', 'ice-shatter', 'ink', 'lock', 'mail', 'mon-appear', 'mon-appear-boss', 'plus5', 'poison', 'portal', 'raise-hand', 'retry-start', 'scout-start', 'scroll', 'skill-unlock', 'star-bonus', 'true-ult', 'wake', 'yawn'];
describe('🔊 효과음 2차 (📜 2026-11-14 · 정식 round2 42종 + 보스 등장)', () => {
  it('manifest 에 모두 · 파일 있음', () => { for (const k of IDS) { expect(SFX[k], k).toBe(`sfx/r2/${k}-v1.mp3`); expect(fs.existsSync(`public/${SFX[k]}`), k).toBe(true); } });
});
