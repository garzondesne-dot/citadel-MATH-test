// 🔇 소리 = Web Audio 한 곳 (📜 2026-11-15 선생님 「긴급 패치」 · 학생 폰 무음 모드에선 안 나오게)
//   iOS: <audio> 로 재생하면 무음 스위치를 무시함 → 배경음 · 효과음 모두 Web Audio(AudioContext) + navigator.audioSession.type = 'ambient'(지원하면) = 무음 스위치 켜면 소리 없음
//   AudioContext 가 없는 브라우저 = null → 부르는 쪽이 예전 <audio> 로 (소리가 아예 안 나는 것보다 낫게)
type AC = AudioContext;
let ctx: AC | null = null, tried = false;
/** 공용 AudioContext (처음 부를 때 만듦 · 잠겨 있으면 첫 터치에 풀림) */
export function actx(): AC | null {
  if (!tried) {
    tried = true;
    try { const n = navigator as Navigator & { audioSession?: { type: string } }; if (n.audioSession) n.audioSession.type = 'ambient'; } catch { /* 지원 안 함 */ }
    try { const C = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (C) ctx = new C(); } catch { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}
const bufs = new Map<string, Promise<AudioBuffer | null>>();
/** 소리 파일 → AudioBuffer (한 번 받으면 기억) */
export function buffer(url: string): Promise<AudioBuffer | null> {
  let p = bufs.get(url);
  if (!p) {
    const c = actx();
    p = !c ? Promise.resolve(null) : fetch(url).then((r) => r.arrayBuffer()).then((ab) => new Promise<AudioBuffer | null>((ok) => { try { const r = c.decodeAudioData(ab, (b) => ok(b), () => ok(null)); if (r && typeof (r as Promise<AudioBuffer>).then === 'function') (r as Promise<AudioBuffer>).then(ok, () => ok(null)); } catch { ok(null); } })).catch(() => null);
    bufs.set(url, p);
  }
  return p;
}
/** 효과음 한 번 (Web Audio) → 됐나 (false = Web Audio 없음 → 예전 <audio>) */
export function playOnce(url: string, vol: number): boolean {
  const c = actx(); if (!c) return false;
  void buffer(url).then((b) => { if (!b) return; const s = c.createBufferSource(), g = c.createGain(); g.gain.value = vol; s.buffer = b; s.connect(g).connect(c.destination); s.start(); });
  return true;
}
/** 🎵 배경음 한 곡 = <audio> 와 같은 손잡이(volume · paused · play · pause · loop · ended)를 Web Audio 로 */
export class WebTrack {
  _k?: string; _fade?: number; loop = false; paused = true;
  private g: GainNode; private src: AudioBufferSourceNode | null = null; private buf: AudioBuffer | null = null; private at = 0; private off = 0; private onEnd: (() => void) | null = null;
  constructor(private c: AC, private url: string) { this.g = c.createGain(); this.g.gain.value = 0; this.g.connect(c.destination); }
  get volume(): number { return this.g.gain.value; }
  set volume(v: number) { this.g.gain.value = Math.max(0, Math.min(1, v)); }
  addEventListener(_e: 'ended', f: () => void): void { this.onEnd = f; }
  async play(): Promise<void> {
    this.paused = false; if (this.c.state === 'suspended') await this.c.resume().catch(() => {});
    if (!this.buf) this.buf = await buffer(this.url);
    if (!this.buf || this.paused || this.src) return;
    const s = this.c.createBufferSource(); s.buffer = this.buf; s.loop = this.loop; s.connect(this.g);
    const off = this.loop ? this.off % this.buf.duration : Math.min(this.off, this.buf.duration);
    s.onended = () => { if (this.src !== s) return; this.src = null; if (!this.loop) { this.paused = true; this.off = 0; this.onEnd?.(); } };
    this.at = this.c.currentTime - off; s.start(0, off); this.src = s;
  }
  pause(): void {
    this.paused = true; const s = this.src; this.src = null;
    if (s) { this.off = this.c.currentTime - this.at; try { s.stop(); } catch { /* 이미 멈춤 */ } }
  }
}
// 첫 터치 = 잠긴 AudioContext 풀기 (iOS · 크롬 자동 재생 막힘)
if (typeof document !== 'undefined') document.addEventListener('pointerdown', () => { if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {}); }, { capture: true });
