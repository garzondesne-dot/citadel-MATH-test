<script lang="ts">
  import qrcode from 'qrcode-generator';
  // 📱 수업 입장 QR (교실 TV 교사 캠프) — SVG 칸 그림 (밖 서버 없음)
  const { text, size = 220 }: { text: string; size?: number } = $props();
  const qr = $derived.by(() => { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q; });
  const n = $derived(qr.getModuleCount());
  const path = $derived.by(() => { let d = ''; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`; return d; });
</script>

<svg width={size} height={size} viewBox="-2 -2 {n + 4} {n + 4}" role="img" aria-label="수업 입장 QR"><rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" /><path d={path} fill="#111" /></svg>
