// 📤 공유 카드 = 정식 js/raid/sharecard.js battle · math 그대로 옮김 (📜 2026-11-15 머리 🔨 ⑦): 1080 × 1350 이미지 한 장 → 폰 공유 창(카카오톡 · 나와의 채팅) · 없으면 저장
//   ⚔ 오늘의 전투 기록 = 게임 결과(용사 · Lv · EXP · 몬스터 · PERFECT · 끈기 · 보스에 준 힘 · 출전) · 📘 오늘의 수학 노트 = 수학 내용만(개념 · 나의 이해 · 고친 문제 · 복습 · 다음 수업)
import type { LessonPack } from '../../model/types';
import { dungeonOf, heroGeo, heroUrl, HERO, spriteOf } from '../manifest';
import type { LootRows } from '../../school/loot';

const W = 1080, H = 1350;
const PIX = "'Galmuri11', 'Noto Sans KR', sans-serif", SANS = "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
const imgs: Record<string, Promise<HTMLImageElement | null>> = {};
const load = (src: string) => (imgs[src] ||= new Promise((res) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));
async function fonts() { try { await Promise.all([document.fonts.load(`700 40px ${PIX}`), document.fonts.load(`40px ${PIX}`)]); } catch { /* 무시 */ } }
const canvas = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
type G2 = CanvasRenderingContext2D;
async function hero(g: G2, id: number, row: number, x: number, y: number, s: number) {
  const im = await load(heroUrl(id)); if (!im) return; const geo = heroGeo(id), cw = geo.hd ? geo.cw : im.width / HERO.cols, ch = geo.hd ? geo.ch : im.height / HERO.rows;
  g.save(); g.imageSmoothingEnabled = false; g.drawImage(im, 0, row * ch, cw, ch, x, y + s * (1 - ch / cw), s, (s * ch) / cw); g.restore();
}
async function monster(g: G2, ref: string, pose: 'idle' | 'down', x: number, y: number, s: number) {
  let sp; try { sp = spriteOf(ref); } catch { return; }
  const im = await load(sp.url); if (!im) return; const c = sp.sheet.cell;
  g.save(); g.imageSmoothingEnabled = false; g.drawImage(im, sp.sheet.poses[pose] * c, sp.row * c, c, c, x, y, s, s); g.restore();
}
function wrap(g: G2, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 9) {
  const words = String(text || '').split(/(\s+)/); let line = '', n = 0;
  const flush = () => { g.fillText(line.trim(), x, y + n * lh); n++; line = ''; };
  for (const w of words) {
    if (g.measureText(line + w).width > maxW && line.trim()) { flush(); if (n >= maxLines) return n * lh; }
    if (g.measureText(w).width > maxW) { for (const ch of w) { if (g.measureText(line + ch).width > maxW) { flush(); if (n >= maxLines) return n * lh; } line += ch; } } else line += w;
  }
  if (line.trim()) flush();
  return n * lh;
}
const rr = (g: G2, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const today = () => { const d = new Date(); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`; };
const noT = (L: LessonPack) => (L.no ? `${L.no}차시 ` : '');

export type BattleIn = { L: LessonPack; r: LootRows; name: string; hero: number; lv: { lv: number; title: string; into: number; next: number } | null; gained: number; up: boolean; first: boolean; raids: number; words: string };
/** ⚔ 오늘의 전투 기록 */
export async function battleCard(o: BattleIn): Promise<HTMLCanvasElement> {
  await fonts();
  const c = canvas(), g = c.getContext('2d')!, { L, r } = o;
  g.fillStyle = '#070c1c'; g.fillRect(0, 0, W, H);
  const bg = await load(dungeonOf(L.theme)); if (bg) { const k = Math.max(W / bg.width, 760 / bg.height); g.drawImage(bg, (W - bg.width * k) / 2, 0, bg.width * k, bg.height * k); }
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#070c1c55'); gr.addColorStop(0.45, '#070c1caa'); gr.addColorStop(0.62, '#070c1cf5'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = '#ffcf5a'; g.font = `700 64px ${PIX}`; g.textAlign = 'center'; g.fillText('⚔ 오늘의 전투 기록', W / 2, 96);
  g.fillStyle = '#cfe0ff'; g.font = `30px ${PIX}`; g.fillText(`모두의 던전 · ${noT(L)}${L.title} · ${today()}`, W / 2, 146);
  g.fillStyle = '#ffcf5a33'; g.beginPath(); g.ellipse(270, 560, 170, 34, 0, 0, Math.PI * 2); g.fill();
  await hero(g, o.hero, HERO.atkRow, 90, 210, 360);
  g.textAlign = 'left'; g.fillStyle = '#ffffff'; g.font = `700 50px ${PIX}`; g.fillText(o.name || '용사', 500, 280);
  if (o.lv) {
    g.fillStyle = '#ffcf5a'; g.font = `700 46px ${PIX}`; g.fillText(`Lv.${o.lv.lv} ${o.lv.title}`, 500, 350);
    rr(g, 500, 380, 500, 38, 10); g.fillStyle = '#1d2640'; g.fill();
    rr(g, 500, 380, Math.max(20, (500 * o.lv.into) / o.lv.next), 38, 10); const eg = g.createLinearGradient(500, 0, 1000, 0); eg.addColorStop(0, '#ffb000'); eg.addColorStop(1, '#ffe48a'); g.fillStyle = eg; g.fill();
    g.fillStyle = '#fff'; g.font = `26px ${PIX}`; g.textAlign = 'center'; g.fillText(`${o.lv.into} / ${o.lv.next} EXP`, 750, 408); g.textAlign = 'left';
    if (o.gained) { g.fillStyle = '#9fffcf'; g.font = `700 40px ${PIX}`; g.fillText(`+${o.gained} EXP`, 500, 470); }
    if (o.up) { rr(g, 760, 436, 240, 50, 12); g.fillStyle = '#ff5a8a'; g.fill(); g.fillStyle = '#fff'; g.font = `700 32px ${PIX}`; g.textAlign = 'center'; g.fillText('LEVEL UP!', 880, 472); g.textAlign = 'left'; }
  }
  g.fillStyle = '#ffcf5a'; g.font = `700 34px ${PIX}`; g.fillText('무찌른 몬스터', 70, 650);
  const mons = r.mons.filter((m) => m.tried).slice(0, 5), n = mons.length + (r.boss?.tried ? 1 : 0), ms = Math.min(200, Math.floor((W - 100) / Math.max(1, n)));
  let mx = 50;
  for (const m of mons) { await monster(g, m.sprite, 'down', mx, 640, ms); mx += ms; }
  if (r.boss?.tried) { await monster(g, r.boss.sprite, r.boss.won ? 'down' : 'idle', mx, 630, ms); g.fillStyle = '#ffcf5a'; g.font = `700 26px ${PIX}`; g.textAlign = 'center'; g.fillText(r.boss.won ? '★ 보스 격파' : '보스', mx + ms / 2, 845); g.textAlign = 'left'; }
  const stat = (x: number, y: number, big: string, small: string, color: string) => { rr(g, x, y, 450, 130, 18); g.fillStyle = '#111a33'; g.fill(); g.strokeStyle = color; g.lineWidth = 3; g.stroke(); g.fillStyle = color; g.font = `700 52px ${PIX}`; g.fillText(big, x + 28, y + 66); g.fillStyle = '#cfd9ee'; g.font = `28px ${PIX}`; g.fillText(small, x + 28, y + 108); };
  stat(70, 870, `⚡ ${r.perfects}번`, 'PERFECT (한 번에 모두 맞힘)', '#ffe15a');
  stat(560, 870, `🔁 ${r.fixed}문제`, '끝까지 고친 문제 (끈기)', '#6fe0b0');
  stat(70, 1020, `👑 ${r.boss?.share ?? 0}%`, `${(r.boss?.title ?? '형성평가').replace(/^.*· /, '')} 체력을 내가 깎음`, '#ff8a6a');
  stat(560, 1020, `🔥 ${o.raids || 1}번째`, '출전 (모두의 던전 레이드)', '#8fb8ff');
  let y = 1210;
  if (o.first) { await hero(g, 9, HERO.atkRow, 70, y - 62, 110); g.fillStyle = '#ffcf5a'; g.font = `700 34px ${PIX}`; g.fillText('🎁 첫 출정 특전 — 새 용사 합류!', 190, y); y += 56; }
  if (o.words) { rr(g, 70, y - 10, 940, 80, 20); g.fillStyle = '#ffffff18'; g.fill(); g.fillStyle = '#ffffff'; g.font = `30px ${PIX}`; wrap(g, `💬 "${o.words}"`, 96, y + 40, 880, 36, 1); }
  g.fillStyle = '#ffffff66'; g.font = `24px ${PIX}`; g.textAlign = 'center'; g.fillText('모두의 던전', W / 2, H - 28);
  return c;
}

const LV: Record<string, [string, string, string]> = { good: ['처음부터 이해함', '#1f8a5b', '#e3f6ec'], mid: ['고쳐서 이해함', '#b8860b', '#fff4d6'], again: ['한 번 더 보기', '#c0392b', '#fde8e6'], none: ['아직 안 풀어 봄', '#7a7f8c', '#eef0f4'] };
const level3 = (v?: [number, number]) => (!v || !v[1] ? 'none' : v[0] / v[1] >= 0.8 ? 'good' : v[0] / v[1] >= 0.5 ? 'mid' : 'again');
/** 📘 오늘의 노트 (게임 낱말 없음) */
export async function mathCard(o: { L: LessonPack; r: LootRows; subject: string }): Promise<HTMLCanvasElement> {
  await fonts();
  const c = canvas(), g = c.getContext('2d')!, { L, r } = o;
  g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, W, H); g.fillStyle = '#2d4a8a'; g.fillRect(0, 0, W, 170);
  g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = `700 60px ${SANS}`; g.fillText(`오늘의 ${o.subject} 노트`, 64, 92);
  g.font = `30px ${SANS}`; g.fillStyle = '#dbe6ff'; g.fillText(`${noT(L)}${L.title} · ${today()}`, 64, 140);
  let y = 230;
  const head = (t: string) => { g.fillStyle = '#2d4a8a'; g.font = `700 36px ${SANS}`; g.fillText(t, 64, y); g.fillStyle = '#2d4a8a33'; g.fillRect(64, y + 14, W - 128, 3); y += 60; };
  head('오늘 배운 것');
  for (const cp of L.steps.filter((s) => s.kind === 'concept')) {
    const v = LV[level3(r.conc[cp.id])]!, name = cp.title.replace(/^개념 \d+ · /, '');
    g.fillStyle = '#1b2236'; g.font = `700 32px ${SANS}`; g.fillText(`■ ${name}`, 64, y);
    g.font = `26px ${SANS}`; const tw = g.measureText(v[0]).width + 36; rr(g, W - 64 - tw, y - 32, tw, 44, 22); g.fillStyle = v[2]; g.fill(); g.fillStyle = v[1]; g.textAlign = 'center'; g.fillText(v[0], W - 64 - tw / 2, y - 2); g.textAlign = 'left';
    g.fillStyle = '#3d4458'; g.font = `27px ${SANS}`; y += 12 + wrap(g, cp.say || '', 92, y + 36, W - 170, 38, 3) + 40;
  }
  if (r.fixEx && y < 880) {
    head('내가 고친 문제');
    const q = r.fixEx.q as { type: string; question: string; items?: { left: string; right: string }[]; solution?: string }, qt = q.type === 'blanks' ? `${q.question} ${(q.items || []).map((i) => `${i.left} □ ${i.right}`).join(', ')}` : q.question;
    g.fillStyle = '#1b2236'; g.font = `28px ${SANS}`; y += wrap(g, qt, 64, y, W - 128, 38, 3);
    g.fillStyle = '#1f8a5b'; g.font = `700 27px ${SANS}`; y += 6 + wrap(g, `바른 풀이: ${q.solution || ''}`, 64, y + 6, W - 128, 36, 3) + 26;
  }
  if (y < 1010) {
    head('복습할 것'); g.fillStyle = '#1b2236'; g.font = `28px ${SANS}`;
    const rv = r.weak.length ? r.weak.map((cid) => `· ${String(r.names[cid] || cid)} — 학습지 개념 정리 다시 보기${L.videos?.[cid] ? ' · 설명 영상' : ''}`) : ['· 오늘 개념을 고르게 이해했어요. 허수아비 문제로 한 번 더 다져 봐요.'];
    for (const t of rv) y += wrap(g, t, 64, y, W - 128, 38, 2);
    y += 24;
  }
  if (L.next) {
    const top = Math.max(y, 1040); rr(g, 48, top - 44, W - 96, H - top - 30, 22); g.fillStyle = '#eaf0ff'; g.fill();
    g.fillStyle = '#2d4a8a'; g.font = `700 34px ${SANS}`; g.fillText(`다음 수업 · ${L.next.title}`, 76, top + 4);
    g.fillStyle = '#1b2236'; g.font = `27px ${SANS}`; const yy = top + 50 + wrap(g, `생각해 보기: ${L.next.ask ?? ''}`, 76, top + 50, W - 152, 36, 2);
    g.fillStyle = '#4a5578'; wrap(g, L.next.link ?? '', 76, yy + 8, W - 152, 34, 2);
  }
  return c;
}
/** 💬 공유 창(카카오톡 · 나와의 채팅) → 안 되면 그림 저장 (정식 share) */
export async function shareCanvas(c: HTMLCanvasElement, name: string, text: string): Promise<'shared' | 'cancel' | 'saved'> {
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png')); if (!blob) return 'cancel';
  const file = new File([blob], `${name}.png`, { type: 'image/png' }), n = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (n.canShare && n.canShare({ files: [file] })) { try { await n.share({ files: [file], text, title: name }); return 'shared'; } catch (e) { if ((e as { name?: string })?.name === 'AbortError') return 'cancel'; } }
  saveCanvas(c, name); return 'saved';
}
export function saveCanvas(c: HTMLCanvasElement, name: string) { const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = `${name}.png`; document.body.appendChild(a); a.click(); a.remove(); }
