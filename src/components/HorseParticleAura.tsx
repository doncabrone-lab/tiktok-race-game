import React, { useEffect, useRef } from 'react';

interface Props {
  trailType: string;
  isRacing: boolean;
  isNitro: boolean;
  color: string;
  horseLevel?: number;
}

export const HorseParticleAura: React.FC<Props> = ({ trailType, isRacing, isNitro, color, horseLevel = 1 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      length?: number;
      alpha: number;
      color: string;
      life: number;
      maxLife: number;
      rotation?: number;
      vRot?: number;
      shape?: 'circle' | 'leaf' | 'line' | 'star' | 'nebula';
    }> = [];

    const width = 160;
    const height = 80;
    canvas.width = width;
    canvas.height = height;

    // Hoof anchor point on canvas: hooves are centered at x: 100, y: 72
    const hoofX = 100;
    const hoofY = 72;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Level 4 / 11 Golden Glow Ground Shadow Base
      if (horseLevel === 4 || trailType === 'golden_sparkles') {
        ctx.save();
        const grad = ctx.createRadialGradient(hoofX - 10, hoofY + 5, 2, hoofX - 10, hoofY + 5, 38);
        grad.addColorStop(0, 'rgba(250, 204, 21, 0.45)');
        grad.addColorStop(0.6, 'rgba(234, 179, 8, 0.2)');
        grad.addColorStop(1, 'rgba(234, 179, 8, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(hoofX - 10, hoofY + 5, 38, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Level 5 Cosmic Galaxy / Nebula Base Pulse
      if (horseLevel === 5 || trailType === 'cosmic_galaxy') {
        ctx.save();
        const time = Date.now() / 400;
        const pulse = Math.sin(time) * 4;
        const grad = ctx.createRadialGradient(hoofX - 15, hoofY + 4, 3, hoofX - 15, hoofY + 4, 32 + pulse);
        grad.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
        grad.addColorStop(0.5, 'rgba(129, 140, 248, 0.25)');
        grad.addColorStop(1, 'rgba(99, 102, 241, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(hoofX - 15, hoofY + 4, 34 + pulse, 12 + pulse * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Level 7 Shadow Void Base Pulse
      if (horseLevel === 7 || trailType === 'shadow_smoke') {
        ctx.save();
        const time = Date.now() / 350;
        const pulse = Math.sin(time) * 3;
        const grad = ctx.createRadialGradient(hoofX - 15, hoofY + 5, 2, hoofX - 15, hoofY + 5, 30 + pulse);
        grad.addColorStop(0, 'rgba(99, 102, 241, 0.5)');
        grad.addColorStop(0.7, 'rgba(20, 15, 35, 0.35)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(hoofX - 15, hoofY + 5, 30 + pulse, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Spawn rate based on state
      const spawnCount = isNitro ? 5 : isRacing ? 3 : 1;
      for (let i = 0; i < spawnCount; i++) {
        let pColor = color;
        let pSize = Math.random() * 3 + 2;
        let vy = (Math.random() - 0.5) * 1.5;
        let vx = -(Math.random() * 2.5 + 1.2);
        let shape: 'circle' | 'leaf' | 'line' | 'star' | 'nebula' = 'circle';
        let lineLength = 0;
        let rotation = 0;
        let vRot = 0;
        let pMaxLife = isNitro ? 30 : 22;

        const startX = hoofX + (Math.random() * 16 - 8);
        const startY = hoofY + (Math.random() * 10 - 5);

        if (isNitro) {
          pColor = Math.random() > 0.4 ? '#ef4444' : '#f97316';
          pSize = Math.random() * 5 + 3;
          vx = -(Math.random() * 4.5 + 3);
          vy = (Math.random() - 0.5) * 3;
          shape = 'circle';
          pMaxLife = 32;
        } else if (trailType === 'dust' || horseLevel === 1) {
          pColor = '#b45309';
          pSize = Math.random() * 3.5 + 1.5;
          vx = -(Math.random() * 2 + 1);
          vy = -Math.random() * 1.2;
        } else if (trailType === 'electric_blue' || horseLevel === 2) {
          // Level 2: Cyan speed lines behind horse
          pColor = Math.random() > 0.3 ? '#06b6d4' : '#38bdf8';
          shape = 'line';
          lineLength = Math.random() * 22 + 12;
          vx = -(Math.random() * 5 + 3.5);
          vy = (Math.random() - 0.5) * 0.8;
          pMaxLife = 18;
        } else if (trailType === 'emerald_leaves' || horseLevel === 3) {
          // Level 3: Soft green leaf/sparkle aura
          pColor = Math.random() > 0.4 ? '#10b981' : '#34d399';
          shape = Math.random() > 0.4 ? 'leaf' : 'circle';
          pSize = Math.random() * 4 + 2;
          vx = -(Math.random() * 1.8 + 0.8);
          vy = -Math.random() * 1.6;
          rotation = Math.random() * Math.PI;
          vRot = (Math.random() - 0.5) * 0.1;
        } else if (trailType === 'golden_sparkles' || horseLevel === 4) {
          // Level 4: Golden glow & stardust
          pColor = Math.random() > 0.3 ? '#facc15' : '#fef08a';
          shape = 'star';
          pSize = Math.random() * 4.5 + 2;
          vx = -(Math.random() * 2.2 + 1);
          vy = (Math.random() - 0.6) * 2;
        } else if (trailType === 'cosmic_galaxy' || horseLevel === 5) {
          // Level 5: Pulsing nebula & stardust
          pColor = Math.random() > 0.5 ? '#c084fc' : '#818cf8';
          pSize = Math.random() * 4 + 2;
          vx = -(Math.random() * 2 + 1);
          vy = (Math.random() - 0.5) * 2;
        } else if (trailType === 'magenta_scanlines' || horseLevel === 6) {
          pColor = '#f472b6';
          shape = 'line';
          lineLength = Math.random() * 16 + 8;
          vx = -(Math.random() * 4 + 2);
          vy = 0;
        } else if (trailType === 'shadow_smoke' || horseLevel === 7) {
          pColor = '#6366f1';
          pSize = Math.random() * 5 + 2;
          vx = -(Math.random() * 1.6 + 0.8);
          vy = -Math.random() * 1.8;
        } else if (trailType === 'frost_snow' || horseLevel === 8) {
          pColor = Math.random() > 0.4 ? '#bae6fd' : '#e0f2fe';
          shape = 'star';
          pSize = Math.random() * 3.5 + 1.5;
          vx = -(Math.random() * 2 + 1);
          vy = (Math.random() - 0.5) * 1.5;
        } else if (trailType === 'magma_embers' || horseLevel === 9) {
          pColor = Math.random() > 0.5 ? '#ea580c' : '#fbbf24';
          pSize = Math.random() * 4 + 2;
          vx = -(Math.random() * 2.5 + 1);
          vy = -Math.random() * 2.2;
        } else if (trailType === 'prism_diamond' || horseLevel === 10) {
          const colors = ['#22d3ee', '#f472b6', '#a78bfa', '#fde047', '#4ade80'];
          pColor = colors[Math.floor(Math.random() * colors.length)];
          shape = 'star';
          pSize = Math.random() * 4 + 2;
          vx = -(Math.random() * 2.5 + 1);
          vy = (Math.random() - 0.5) * 2;
        } else if (trailType === 'sun_flare' || horseLevel === 11) {
          pColor = Math.random() > 0.5 ? '#fbbf24' : '#f59e0b';
          pSize = Math.random() * 5 + 2.5;
          vx = -(Math.random() * 3 + 1.5);
          vy = -Math.random() * 2.2;
        } else if (trailType === 'pyro_flames' || horseLevel === 12) {
          pColor = Math.random() > 0.6 ? '#ef4444' : Math.random() > 0.3 ? '#f97316' : '#eab308';
          pSize = Math.random() * 6 + 2.5;
          vx = -(Math.random() * 3.5 + 2);
          vy = -Math.random() * 2.5;
        }

        particles.push({
          x: startX,
          y: startY,
          vx,
          vy,
          size: pSize,
          length: lineLength,
          alpha: 1,
          color: pColor,
          life: 0,
          maxLife: pMaxLife,
          shape,
          rotation,
          vRot,
        });
      }

      // Update & Draw particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (p.rotation !== undefined && p.vRot) {
          p.rotation += p.vRot;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = isNitro ? 10 : 6;

        if (p.shape === 'line') {
          ctx.lineWidth = Math.max(1.5, p.size * 0.5);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + (p.length || 15), p.y);
          ctx.stroke();
        } else if (p.shape === 'leaf') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation || 0);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'star') {
          ctx.translate(p.x, p.y);
          ctx.beginPath();
          for (let s = 0; s < 4; s++) {
            ctx.rotate(Math.PI / 2);
            ctx.lineTo(p.size, 0);
            ctx.lineTo(p.size * 0.3, p.size * 0.3);
          }
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      particles = particles.filter((p) => p.life < p.maxLife && p.x > -20);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [trailType, isRacing, isNitro, color, horseLevel]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute pointer-events-none z-0 left-1/2 -translate-x-[62%] -bottom-1"
      style={{ width: '160px', height: '80px' }}
    />
  );
};

