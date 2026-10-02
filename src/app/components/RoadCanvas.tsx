import { useEffect, useRef } from 'react';
import { ratioOf, speedKmh } from '../../engine/data/vehicle';
import { useEngine } from '../state/store';

/** Route défilant sous une silhouette de voiture, à la même échelle de ralenti que le moteur. */
export function RoadCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    let roadX = 0;
    let wheelA = 0;
    let colors = { line: '', fg: '', fg2: '', fg3: '', accent: '', surface: '' };
    let colorTick = 0;

    const readColors = () => {
      const cs = getComputedStyle(cv);
      const v = (n: string) => cs.getPropertyValue(n).trim();
      colors = {
        line: v('--color-label-tertiary'),
        fg: v('--color-label'),
        fg2: v('--color-label-secondary'),
        fg3: v('--color-label-tertiary'),
        accent: v('--color-accent'),
        surface: v('--color-bg-elevated'),
      };
    };

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (now - colorTick > 1000) {
        colorTick = now;
        readColors();
      }
      const { rpm, gear, slow, play } = useEngine.getState();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (w && h) {
        if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
          cv.width = Math.round(w * dpr);
          cv.height = Math.round(h * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        const ms = speedKmh(rpm, gear) / 3.6;
        const ratio = ratioOf(gear);
        const wheelRev = ratio ? rpm / ratio / 60 : 0;
        const PX = slow >= 50 ? 90 : 14;
        const lab = Math.ceil(70 / PX);
        if (play) {
          roadX += (ms / slow) * PX * dt;
          wheelA += (wheelRev / slow) * Math.PI * 2 * dt;
        }
        const gy = h - 18;

        ctx.strokeStyle = colors.line;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, gy + 0.5);
        ctx.lineTo(w, gy + 0.5);
        ctx.stroke();
        ctx.globalAlpha = 1;

        /* repères tous les 0,5 m, numérotés au mètre : la route défile vers la gauche */
        ctx.fillStyle = colors.fg3;
        ctx.font = '500 10px -apple-system, BlinkMacSystemFont, Inter, sans-serif';
        ctx.textAlign = 'left';
        const startM = Math.floor(roadX / PX);
        for (let m = startM - 1; m <= startM + Math.ceil(w / PX) + 1; m++) {
          for (let half = 0; half < (PX > 40 ? 2 : 1); half++) {
            const x = (m + half * 0.5) * PX - roadX + 130;
            if (x < -20 || x > w + 20) continue;
            ctx.strokeStyle = colors.line;
            ctx.globalAlpha = half ? 0.35 : 0.7;
            ctx.beginPath();
            ctx.moveTo(x, gy);
            ctx.lineTo(x, gy + (half ? 4 : 7));
            ctx.stroke();
            ctx.globalAlpha = 1;
            if (!half && x > 150 && m % lab === 0) ctx.fillText(`${m} m`, x + 3, gy + 13);
          }
        }

        /* voiture de profil, roulant vers la droite */
        const cx = 66;
        const wy = gy - 10;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = colors.fg2;
        ctx.fillStyle = colors.surface;
        ctx.beginPath();
        ctx.moveTo(cx - 52, wy - 2);
        ctx.lineTo(cx - 52, wy - 13);
        ctx.quadraticCurveTo(cx - 52, wy - 18, cx - 46, wy - 19);
        ctx.lineTo(cx - 24, wy - 21);
        ctx.quadraticCurveTo(cx - 14, wy - 33, cx - 6, wy - 33);
        ctx.lineTo(cx + 16, wy - 33);
        ctx.quadraticCurveTo(cx + 24, wy - 33, cx + 34, wy - 20);
        ctx.lineTo(cx + 49, wy - 17);
        ctx.quadraticCurveTo(cx + 54, wy - 16, cx + 54, wy - 11);
        ctx.lineTo(cx + 54, wy - 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        [-30, 30].forEach((dx) => {
          ctx.fillStyle = colors.surface;
          ctx.strokeStyle = colors.fg;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx + dx, wy, 9.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = colors.accent;
          ctx.lineWidth = 1.75;
          for (let k = 0; k < 5; k++) {
            const a = wheelA + k * 1.2566;
            ctx.beginPath();
            ctx.moveTo(cx + dx, wy);
            ctx.lineTo(cx + dx + Math.cos(a) * 7, wy + Math.sin(a) * 7);
            ctx.stroke();
          }
        });

        ctx.fillStyle = colors.fg3;
        ctx.textAlign = 'right';
        ctx.fillText(slow === 1 ? 'temps réel' : `ralenti 1/${slow}`, w - 8, 14);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className={className} aria-label="Route qui défile sous la voiture, au même ralenti que le moteur" role="img" />;
}
