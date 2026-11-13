<script lang="ts">
  import { onMount } from 'svelte';
  import { FX2, spec } from '../fx/fx';
  import { artUrl, spriteOf, dungeonOf } from '../manifest';
  // 🍳 새 스킬 fx 굽기 · 비교 (?role=fxbake · TV 쪽 · 시험 · 도구 tools/fxbake 가 씀): slash.ts SlashFx.draw(t) = t 의 순수 함수 → 칸마다 정확히 그림
  //   __bake.frame(단계, t) = 새 것 한 칸(투명 · 낮은 해상도 그대로 = 폰 띠용) · __bake.scene(단계, t, 'new' | 'old') = 같은 장면(배경 · 몬스터 · 용사)에서 새 것 / 지금 띠 같은 순간 → 나란히 캡처
  //   폰 띠엔 화면 전체 연출(충격파 · 흔들림 · Glow)은 못 들어감 → 궤적 · 번쩍 · 입자만
  const W = 480, H = 300, BODY = { x: 330, y: 170, w: 150, h: 150 }, HERO = { x: 120, y: 236 };
  let host: HTMLDivElement, ready = $state(false);
  onMount(async () => {
    const PIXI = await import('pixi.js'), { SlashFx, NUM } = await import('./arena/slash');
    const app = new PIXI.Application(); await app.init({ width: W, height: H, backgroundAlpha: 0, antialias: false, preference: 'webgl', preserveDrawingBuffer: true });
    host.appendChild(app.canvas);
    const P = NUM.PIXEL, lowW = Math.ceil(W / P), lowH = Math.ceil(H / P), rt = PIXI.RenderTexture.create({ width: lowW, height: lowH, scaleMode: 'nearest' });
    const bgC = new PIXI.Container(), out = new PIXI.Sprite(rt), old = new PIXI.Sprite(); out.scale.set(P); app.stage.addChild(bgC, old, out);
    const load = (u: string) => PIXI.Assets.load(u);
    const mon = spriteOf('new0:0'), monTex = await load(mon.url), bgTex = await load(dungeonOf('02-deep-forest'));
    const bg = new PIXI.Sprite(bgTex); bg.width = W; bg.height = H; const ms = new PIXI.Sprite(new PIXI.Texture({ source: monTex.source, frame: new PIXI.Rectangle(0, 0, mon.sheet.cell, mon.sheet.cell) }));
    ms.anchor.set(0.5, 1); ms.width = ms.height = 180; ms.x = BODY.x; ms.y = BODY.y + BODY.h / 2 + 10;
    const heroTex = await load(`${import.meta.env.BASE_URL}art/heroes/hero-sword-v3c.webp`), hs = new PIXI.Sprite(new PIXI.Texture({ source: heroTex.source, frame: new PIXI.Rectangle(2 * 80, 2 * 64, 80, 64) })); hs.anchor.set(0.5, 1); hs.scale.set(2); hs.x = HERO.x; hs.y = HERO.y;
    for (const t of [bgTex, monTex, heroTex]) t.source.scaleMode = 'nearest';
    bgC.addChild(bg, ms, hs);
    const oldKind = ['cut', 'moon', 'slash', 'twin'];
    const fxAt = (tier: number, t: number) => { const f = new SlashFx({ x: BODY.x / P, y: BODY.y / P, w: BODY.w / P, h: BODY.h / P, dir: 1, tier, fam: 'cut', seed: 7 }); let tt = 0; while (tt < t) { tt = Math.min(t, tt + 1 / 60); f.t = tt; f.draw(tt, true, false); } if (t >= f.impactT && f.T.hitstop) { /* 굽기 = 히트 스톱 없음(칸 순서로 표현) */ } return f; };
    const drawNew = (tier: number, t: number) => { const f = fxAt(tier, t); app.renderer.render({ container: f.g, target: rt, clear: true }); f.g.destroy(); out.visible = true; };
    const drawOld = (tier: number, t: number) => { const k = oldKind[tier]!, sp = spec(k)!; const n = Math.min(sp.n - 1, Math.floor(t * sp.fps)); if (t > sp.n / sp.fps) { old.visible = false; return; } PIXI.Assets.load(artUrl(`art/${sp.src}`)).then(() => {}); };
    (window as unknown as { __bake: unknown }).__bake = {
      NUM, W, H, BODY,
      /** 새 것 한 칸 (투명 · 낮은 해상도 그대로) → dataURL */
      async frame(tier: number, t: number) { drawNew(tier, t); const c = app.renderer.extract.canvas({ target: rt }) as HTMLCanvasElement; return c.toDataURL('image/png'); },
      low: { w: lowW, h: lowH, px: BODY.x / P, py: BODY.y / P, bb: [(BODY.x - BODY.w / 2) / P, (BODY.y - BODY.h / 2) / P, (BODY.x + BODY.w / 2) / P, (BODY.y + BODY.h / 2) / P] },
      /** 같은 장면 · 새 것 */
      async sceneNew(tier: number, t: number) { bgC.visible = true; old.visible = false; drawNew(tier, t); app.render(); },
      /** 같은 장면 · 지금 띠 같은 순간 (정식 띠 칸 · 몸통에 맞춘 크기 근사) */
      async sceneOld(tier: number, t: number) {
        bgC.visible = true; out.visible = false; const k = oldKind[tier]!, sp = spec(k)!, tex = await PIXI.Assets.load(artUrl(`art/${sp.src}`)); tex.source.scaleMode = 'nearest';
        const n = Math.floor(t * sp.fps); if (n >= sp.n) { old.visible = false; app.render(); return; }
        old.texture = new PIXI.Texture({ source: tex.source, frame: new PIXI.Rectangle(n * sp.w, 0, sp.w, sp.h) }); const s = Math.max(1, Math.round(((BODY.w * 1.1) / sp.w) * [1, 1.15, 1.3, 1.5][tier]! * 4) / 4);
        old.scale.set(s); old.anchor.set(0.5); old.x = BODY.x; old.y = BODY.y; old.visible = true; app.render();
      },
    };
    void drawOld; void FX2;
    ready = true;
  });
</script>

<div class="bake" bind:this={host} data-ready={ready}></div>

<style>
  .bake { width: 480px; height: 300px; background: #111; }
  .bake :global(canvas) { display: block; image-rendering: pixelated; }
</style>
