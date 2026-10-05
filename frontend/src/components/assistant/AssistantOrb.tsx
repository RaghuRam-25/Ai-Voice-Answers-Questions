'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AssistantStatusType } from '@/types/assistant';

interface AssistantOrbProps {
  status: AssistantStatusType;
  audioLevel?: number;
  waveform?: number[];
}

const RING_CONFIG = [
  { size: '100%', duration: 13, delay: 0, color: '#3e9dff', opacity: 0.78 },
  { size: '92%', duration: 9, delay: -2.4, color: '#7d54ff', opacity: 0.9 },
  { size: '84%', duration: 17, delay: -6, color: '#23d9ff', opacity: 0.76 },
  { size: '80%', duration: 11, delay: -4, color: '#c450ff', opacity: 0.78 },
  { size: '74%', duration: 21, delay: -9, color: '#54bfff', opacity: 0.62 },
];

const PARTICLES = Array.from({ length: 16 }, (_, index) => ({
  angle: (index / 16) * 360,
  distance: 43 + (index % 4) * 8,
  size: 1.5 + (index % 3) * 1.2,
  delay: -(index % 7) * 0.4,
}));

interface WaveStrand {
  baseAmp: number;
  freq: number;
  harmFreq: number;
  harmWeight: number;
  speedMult: number;
  offsetY: number;
  phase: number;
  colorStart: string;
  colorMid: string;
  lineWidth: number;
  hasGlow: boolean;
  glowColor: string;
}

const TOTAL_STRANDS = 120;

// Pre-generate 120 richly-differentiated wave strands for each side
const WAVE_FIELD_CONFIGS: WaveStrand[] = Array.from({ length: TOTAL_STRANDS }, (_, i) => {
  const u = i / (TOTAL_STRANDS - 1); // 0 to 1
  const distFromCenter = Math.abs(u - 0.5) * 2; // 0 at center, 1 at outer edges

  // Vertical distribution: dense at center axis, feathered towards ±27px
  const sign = u >= 0.5 ? 1 : -1;
  const spread = Math.pow(Math.abs(u - 0.5) * 2, 1.25) * 25 * sign;
  const jitterY = (((i * 17) % 13) - 6) * 0.85;
  const offsetY = spread + jitterY;

  // Amplitude: higher in the core, tapering toward edge strands
  const baseAmp = 10 + (1 - distFromCenter * 0.45) * 17 + ((i * 7) % 11) * 1.1;

  // Wavelength & spatial frequency: varied to create interwoven ribbon dynamics
  const freq = 0.0075 + (((i * 19) % 29) / 28) * 0.0115;
  const harmFreq = 1.8 + (((i * 13) % 17) / 16) * 0.85;
  const harmWeight = 0.18 + (((i * 11) % 15) / 14) * 0.18;

  // Speed multiplier: 2.3 to 4.2 for rich parallax depth
  const speedMult = 2.4 + (((i * 23) % 31) / 30) * 1.8;

  // Golden ratio phase distribution ensures no two waves overlap in phase
  const phase = (i * 2.39996) % (Math.PI * 2);

  // Line width: thin and elegant (0.65px - 1.2px)
  const lineWidth = 0.65 + (1 - distFromCenter * 0.5) * 0.55;

  // Color palette: interweave cyan, sky blue, neon violet, royal blue, and lavender
  const colorCycle = i % 6;
  const opacity = 0.22 + (1 - distFromCenter * 0.55) * 0.45;

  let colorStart = `rgba(0, 245, 255, ${opacity.toFixed(2)})`;
  let colorMid = `rgba(59, 130, 246, ${(opacity * 0.7).toFixed(2)})`;
  let glowColor = 'rgba(0, 245, 255, 0.6)';

  if (colorCycle === 0) {
    // Vivid Cyan
    colorStart = `rgba(0, 245, 255, ${opacity.toFixed(2)})`;
    colorMid = `rgba(56, 189, 248, ${(opacity * 0.7).toFixed(2)})`;
    glowColor = 'rgba(0, 245, 255, 0.6)';
  } else if (colorCycle === 1) {
    // Electric Sky Blue
    colorStart = `rgba(56, 189, 248, ${opacity.toFixed(2)})`;
    colorMid = `rgba(99, 102, 241, ${(opacity * 0.7).toFixed(2)})`;
    glowColor = 'rgba(56, 189, 248, 0.55)';
  } else if (colorCycle === 2) {
    // Neon Violet
    colorStart = `rgba(168, 85, 247, ${(opacity * 0.95).toFixed(2)})`;
    colorMid = `rgba(192, 132, 252, ${(opacity * 0.65).toFixed(2)})`;
    glowColor = 'rgba(168, 85, 247, 0.65)';
  } else if (colorCycle === 3) {
    // Royal Electric Blue
    colorStart = `rgba(59, 130, 246, ${opacity.toFixed(2)})`;
    colorMid = `rgba(34, 211, 238, ${(opacity * 0.7).toFixed(2)})`;
    glowColor = 'rgba(59, 130, 246, 0.65)';
  } else if (colorCycle === 4) {
    // Lavender / Soft Purple
    colorStart = `rgba(192, 132, 252, ${(opacity * 0.9).toFixed(2)})`;
    colorMid = `rgba(129, 140, 248, ${(opacity * 0.65).toFixed(2)})`;
    glowColor = 'rgba(192, 132, 252, 0.55)';
  } else {
    // Deep Indigo Violet
    colorStart = `rgba(129, 140, 248, ${opacity.toFixed(2)})`;
    colorMid = `rgba(168, 85, 247, ${(opacity * 0.65).toFixed(2)})`;
    glowColor = 'rgba(129, 140, 248, 0.55)';
  }

  // Key accent strands get subtle neon glow
  const hasGlow = i % 5 === 0;

  return {
    baseAmp,
    freq,
    harmFreq,
    harmWeight,
    speedMult,
    offsetY,
    phase,
    colorStart,
    colorMid,
    lineWidth,
    hasGlow,
    glowColor,
  };
});

function drawWaveSide(
  ctx: CanvasRenderingContext2D,
  options: {
    direction: 1 | -1;
    startX: number;
    endX: number;
    xc: number;
    yc: number;
    strand: WaveStrand;
    totalAmp: number;
    t: number;
    maxDist: number;
  },
) {
  const { direction, startX, endX, xc, yc, strand, totalAmp, t, maxDist } = options;
  const rStart = Math.abs(startX - xc);
  const step = 5;
  const numSteps = Math.floor(Math.abs(endX - startX) / step);
  if (numSteps < 2) return;

  ctx.beginPath();
  let first = true;

  for (let s = 0; s <= numSteps; s++) {
    const x = startX + direction * s * step;
    const d = Math.abs(x - xc);
    const deltaD = Math.max(0, d - rStart);

    // Smooth entrance from orb edge (first ~45px)
    const entrance = Math.min(1, Math.max(0, deltaD / 45));
    const smoothEntrance = entrance * entrance * (3 - 2 * entrance);

    // Smooth falloff toward outer boundary
    const distRatio = Math.min(1, Math.max(0, d / maxDist));
    const falloff = Math.max(0, 1 - Math.pow(distRatio, 1.85));

    const envelope = smoothEntrance * falloff;

    // Continuous outward flowing traveling wave equation
    const phase = strand.freq * d - strand.speedMult * t + strand.phase;
    const sineVal =
      Math.sin(phase) +
      strand.harmWeight * Math.sin(strand.harmFreq * phase + 0.6);

    const y = yc + strand.offsetY * (1 - 0.2 * distRatio) + sineVal * totalAmp * envelope;

    if (first) {
      ctx.moveTo(x, y);
      first = false;
    } else {
      ctx.lineTo(x, y);
    }
  }

  // Smooth outward linear gradient
  const grad = ctx.createLinearGradient(startX, yc, endX, yc);
  grad.addColorStop(0, strand.colorStart);
  grad.addColorStop(0.35, strand.colorStart);
  grad.addColorStop(0.68, strand.colorMid);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.strokeStyle = grad;
  ctx.lineWidth = strand.lineWidth;
  if (strand.hasGlow) {
    ctx.shadowColor = strand.glowColor;
    ctx.shadowBlur = 8;
  } else {
    ctx.shadowBlur = 0;
  }
  ctx.stroke();
}

export const AssistantOrb: React.FC<AssistantOrbProps> = ({ status, audioLevel = 0, waveform = [] }) => {
  const active = status === 'listening' || status === 'processing' || status === 'responding' || status === 'speaking';
  const speed = status === 'processing' ? 0.52 : status === 'listening' ? 0.78 : status === 'responding' ? 0.68 : 1;
  const energy = Math.min(1, audioLevel * 1.9 + (active ? 0.12 : 0));
  const stateClass = `orb-state-${status}`;

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = React.useRef<number>(0);
  const stateRef = React.useRef({
    time: 0,
    smoothedAudio: 0,
    status,
    audioLevel,
    waveform,
  });

  stateRef.current.status = status;
  stateRef.current.audioLevel = audioLevel;
  stateRef.current.waveform = waveform;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.floor(rect.width * dpr);
      const targetH = Math.floor(rect.height * dpr);

      if (targetW > 0 && targetH > 0 && (canvas.width !== targetW || canvas.height !== targetH)) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const current = stateRef.current;
      current.smoothedAudio += ((current.audioLevel || 0) - current.smoothedAudio) * 0.18;
      const audioEnergy = current.smoothedAudio;

      let speedBase = 1.0;
      let ampBase = 1.0;
      if (current.status === 'listening') {
        speedBase = 1.6 + audioEnergy * 1.8;
        ampBase = 1.35 + audioEnergy * 2.4;
      } else if (current.status === 'processing') {
        speedBase = 2.2;
        ampBase = 1.45 + Math.sin(current.time * 5) * 0.25;
      } else if (current.status === 'responding' || current.status === 'speaking') {
        speedBase = 2.6;
        ampBase = 1.75 + (audioEnergy || 0.4) * 1.6;
      } else {
        // IDLE: slow, smooth, continuous flowing motion
        speedBase = 1.15;
        ampBase = 1.0 + Math.sin(current.time * 1.1) * 0.09;
      }

      current.time += dt * speedBase;
      const t = current.time;

      const cssWidth = rect.width;
      const cssHeight = rect.height;
      if (cssWidth <= 0 || cssHeight <= 0) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const xc = cssWidth / 2;
      const yc = cssHeight / 2;
      // Start wave just behind the orb shell perimeter
      const orbStartOffset = 76;
      const maxDist = cssWidth / 2;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'screen';

      WAVE_FIELD_CONFIGS.forEach((strand, i) => {
        const wf = current.waveform.length > 0 ? (current.waveform[i % current.waveform.length] || 0) : audioEnergy;
        const totalAmp = (strand.baseAmp + wf * 28) * ampBase;

        // RIGHT side waves: flow outward to the right
        drawWaveSide(ctx, {
          direction: 1,
          startX: xc + orbStartOffset,
          endX: cssWidth,
          xc,
          yc,
          strand,
          totalAmp,
          t,
          maxDist,
        });

        // LEFT side waves: flow outward to the left
        drawWaveSide(ctx, {
          direction: -1,
          startX: xc - orbStartOffset,
          endX: 0,
          xc,
          yc,
          strand,
          totalAmp,
          t,
          maxDist,
        });
      });

      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className={`assistant-orb-shell holographic-orb ${stateClass}`} style={{ '--orb-energy': energy } as React.CSSProperties}>
      {/* Dynamic multi-layered glowing waveform ribbons behind the orb */}
      <canvas
        ref={canvasRef}
        className="orb-waveform-canvas"
        aria-hidden="true"
      />

      <motion.div
        className="orb-bloom orb-bloom-outer"
        style={{ position: 'absolute', left: '50%', top: '50%', x: '-50%', y: '-50%' }}
        animate={{ scale: [1, 1.06 + energy * 0.16, 1], opacity: [0.55, 0.9, 0.55] }}
        transition={{ duration: status === 'listening' ? 1.2 : 3.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="orb-bloom orb-bloom-inner"
        style={{ position: 'absolute', left: '50%', top: '50%', x: '-50%', y: '-50%' }}
        animate={{ scale: [1, 1.04 + energy * 0.1, 1] }}
        transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="orb-holographic-rings" aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
        {RING_CONFIG.map((ring, index) => (
          <motion.span
            key={index}
            className={`orb-holo-ring orb-holo-ring-${index}`}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              x: '-50%',
              y: '-50%',
              width: ring.size,
              height: ring.size,
              borderColor: ring.color,
              opacity: ring.opacity,
            }}
            animate={{ rotate: index % 2 ? -360 : 360, scale: [1, 1 + energy * .035, 1] }}
            transition={{ rotate: { duration: ring.duration * speed, repeat: Infinity, ease: 'linear', delay: ring.delay }, scale: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } }}
          />
        ))}
      </div>

      <div className="orb-particle-field" aria-hidden="true">
        {PARTICLES.map((particle, index) => {
          const radians = (particle.angle * Math.PI) / 180;
          const x = Math.cos(radians) * particle.distance;
          const y = Math.sin(radians) * particle.distance;
          return <motion.i key={index} className="orb-particle" style={{ width: particle.size, height: particle.size, left: `calc(50% + ${x}%)`, top: `calc(50% + ${y}%)`, animationDelay: `${particle.delay}s` }} animate={{ x: status === 'processing' ? [0, -x * .12, 0] : [0, x * .12, 0], y: status === 'processing' ? [0, -y * .12, 0] : [0, y * .12, 0], opacity: [0.2, 0.95, 0.2], scale: [0.7, 1.4 + energy, 0.7] }} transition={{ duration: (2 + (index % 4) * .5) * speed, repeat: Infinity, delay: particle.delay, ease: 'easeInOut' }} />;
        })}
      </div>

      <motion.div
        className="assistant-orb-core holographic-core"
        style={{ position: 'absolute', left: '50%', top: '50%', x: '-50%', y: '-50%' }}
        animate={{ scale: [1, 1 + energy * .055, 1] }}
        transition={{ duration: status === 'listening' ? 1.1 : 3.1, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="core-glass-shell" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
          <div className="core-liquid-glow" style={{ transform: `scale(${1 + energy * .22})` }} />
          <div className="core-highlight" />
          <div className="assistant-orb-eyes" aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}><span /><span /></div>
        </div>
      </motion.div>

      <div className="orb-side-node orb-side-node-left" />
      <div className="orb-side-node orb-side-node-right" />
      <div className="orb-wave-reactivity" aria-hidden="true">{waveform.slice(0, 16).map((value, index) => <span key={index} style={{ height: `${4 + value * 22}px`, opacity: .35 + value * .65 }} />)}</div>
    </div>
  );
};
