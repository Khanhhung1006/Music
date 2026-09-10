import React, { useEffect, useRef } from 'react';
import { useTheme } from '../lib/ThemeProvider';

interface Props {
  data: Uint8Array | null;
  isPlaying: boolean;
}

export function MainVisualizer({ data, isPlaying }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<any[]>([]);
  const rotationRef = useRef(0);
  const { actualTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
         canvas.width = Math.floor(rect.width * dpr);
         canvas.height = Math.floor(rect.height * dpr);
         ctx.scale(dpr, dpr);
      }
      
      const width = rect.width;
      const height = rect.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Process data
      let arr = data;
      if (!arr) {
         arr = new Uint8Array(64);
      }

      let avgBass = 0;
      for(let i=0; i<8; i++) avgBass += arr[i] || 0;
      avgBass /= 8;
      const bassScale = avgBass / 255;

      // Particle Pulse logic
      // Spawn particles
      if (isPlaying && bassScale > 0.3 && Math.random() < 0.4) {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.min(width, height) * 0.3;
          particlesRef.current.push({
              x: cx + Math.cos(angle) * r,
              y: cy + Math.sin(angle) * r,
              vx: Math.cos(angle) * (1 + bassScale * 2),
              vy: Math.sin(angle) * (1 + bassScale * 2),
              life: 0,
              maxLife: 40 + Math.random() * 40,
              size: 2 + Math.random() * 3 * bassScale,
              hue: 200 + Math.random() * 80 // 200 (blue) to 280 (purple)
          });
      }
      
      // Draw album center glow (subtle)
      const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * 0.4);
      const intensityScale = actualTheme === 'light' ? 0.05 : 0.15;
      radGrad.addColorStop(0, `rgba(139, 92, 246, ${intensityScale * bassScale})`); // Violet
      radGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, width, height);
      
      // Update and draw particles
      ctx.save();
      // Use different composite operation for light mode to show up better
      ctx.globalCompositeOperation = actualTheme === 'light' ? 'source-over' : 'screen';
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life++;
          
          if (p.life >= p.maxLife) {
              particlesRef.current.splice(i, 1);
              continue;
          }
          
          const alpha = 1 - (p.life / p.maxLife);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${alpha})`;
          ctx.shadowBlur = p.size * 2;
          ctx.shadowColor = `hsla(${p.hue}, 80%, 60%, ${alpha})`;
          ctx.fill();
      }
      ctx.restore();
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [data, isPlaying, actualTheme]);

  return <canvas ref={canvasRef} className="w-full h-full pointer-events-none" />;
}
