import React, { useEffect, useRef } from 'react';
import { soundEngine } from '../utils/audioEngine';

interface EcgMonitorProps {
  heartRate: number;
  spo2: number;
  rhythm?: 'NSR' | 'SINUS_TACHY' | 'SINUS_BRADY' | 'AFIB' | 'VFIB' | 'ASYSTOLE';
  height?: number;
  className?: string;
  enableSound?: boolean;
}

export const EcgMonitor: React.FC<EcgMonitorProps> = ({
  heartRate,
  spo2,
  rhythm = 'NSR',
  height = 70,
  className = '',
  enableSound = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const xRef = useRef<number>(0);
  const lastBeatTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width;
    let ch = canvas.height;
    const midY = ch / 2;

    // Draw initial medical grid lines
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, ch);

    let currentX = 0;
    let cyclePhase = 0; // 0 to 1

    const render = (time: number) => {
      // Calculate beat period in milliseconds based on HR
      const beatPeriodMs = (60 / Math.max(30, Math.min(220, heartRate))) * 1000;
      
      const speed = 2.2; // pixels per frame
      const prevX = currentX;
      currentX += speed;
      if (currentX >= width) {
        currentX = 0;
      }

      // Clear cursor band ahead
      ctx.fillStyle = '#090d16';
      ctx.fillRect(currentX, 0, 16, ch);

      // Redraw faint background grid on cleared strip
      ctx.strokeStyle = 'rgba(15, 118, 110, 0.12)';
      ctx.lineWidth = 1;
      for (let y = 0; y < ch; y += 15) {
        ctx.beginPath();
        ctx.moveTo(currentX, y);
        ctx.lineTo(currentX + 16, y);
        ctx.stroke();
      }

      // Compute voltage waveform offset based on cyclePhase and rhythm
      const cycleMs = time % beatPeriodMs;
      cyclePhase = cycleMs / beatPeriodMs;

      let yOffset = 0;

      if (rhythm === 'VFIB') {
        // Chaotic fibrillation waveform
        yOffset = (Math.sin(time * 0.03) * 12) + (Math.cos(time * 0.05) * 8) + (Math.random() - 0.5) * 6;
      } else if (rhythm === 'ASYSTOLE') {
        // Flatline with minimal noise
        yOffset = (Math.random() - 0.5) * 1.5;
      } else {
        // Standard P-Q-R-S-T wave complex
        if (cyclePhase > 0.15 && cyclePhase < 0.22) {
          // P-wave (atrial depolarization)
          const pP = (cyclePhase - 0.15) / 0.07;
          yOffset = -Math.sin(pP * Math.PI) * 5;
        } else if (cyclePhase >= 0.22 && cyclePhase < 0.25) {
          // PR segment
          yOffset = 0;
        } else if (cyclePhase >= 0.25 && cyclePhase < 0.27) {
          // Q-wave (small dip)
          yOffset = 3;
        } else if (cyclePhase >= 0.27 && cyclePhase < 0.32) {
          // R-wave (sharp systolic spike)
          const rP = (cyclePhase - 0.27) / 0.05;
          yOffset = -Math.sin(rP * Math.PI) * (ch * 0.38);

          // Audio beep triggered at apex of R wave
          if (time - lastBeatTimeRef.current > beatPeriodMs * 0.7) {
            lastBeatTimeRef.current = time;
            if (enableSound) {
              soundEngine.playHeartbeat(spo2);
            }
          }
        } else if (cyclePhase >= 0.32 && cyclePhase < 0.35) {
          // S-wave (negative deflection)
          yOffset = 6;
        } else if (cyclePhase >= 0.35 && cyclePhase < 0.42) {
          // ST segment
          yOffset = 0;
        } else if (cyclePhase >= 0.42 && cyclePhase < 0.55) {
          // T-wave (ventricular repolarization)
          const tP = (cyclePhase - 0.42) / 0.13;
          yOffset = -Math.sin(tP * Math.PI) * 7;
        } else {
          // Baseline isoelectric line
          yOffset = (Math.random() - 0.5) * 0.8;
        }
      }

      const targetY = midY + yOffset;

      // Draw glowing ECG trace line
      ctx.beginPath();
      ctx.strokeStyle = rhythm === 'VFIB' ? '#f43f5e' : (heartRate > 120 || heartRate < 45 ? '#f59e0b' : '#10b981');
      ctx.lineWidth = 1.8;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 4;
      ctx.moveTo(prevX, midY + (xRef.current || 0));
      ctx.lineTo(currentX, targetY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      xRef.current = yOffset;
      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [heartRate, spo2, rhythm, enableSound]);

  return (
    <div className={`relative overflow-hidden rounded bg-slate-950 border border-slate-800 ${className}`}>
      <canvas
        ref={canvasRef}
        width={360}
        height={height}
        className="w-full h-full block"
      />
      <div className="absolute top-1 left-2 flex items-center gap-2 text-[10px] font-mono tracking-wider text-emerald-400">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>LEAD II · {rhythm.replace('_', ' ')}</span>
      </div>
      <div className="absolute top-1 right-2 text-[11px] font-mono tabular-nums text-slate-300">
        <span className="font-bold text-emerald-400">{heartRate}</span>
        <span className="text-[9px] text-slate-500 ml-0.5">BPM</span>
      </div>
    </div>
  );
};
