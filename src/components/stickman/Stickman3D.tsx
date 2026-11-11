'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  percent: number;
  totalGoals: number;
  completedGoals: number;
  /** Ardışık başarılı gün sayısı: 3+ alev aurası, 7+ taç. */
  streak?: number;
  level?: number;
};

type Vec3 = { x: number; y: number; z: number };

const STAGES = [
  { threshold: 0, label: 'Başlangıç' },
  { threshold: 25, label: 'Isınma' },
  { threshold: 50, label: 'Tempo' },
  { threshold: 75, label: 'Zirve Yolu' },
  { threshold: 100, label: '🕶️ Boss' },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function Stickman3D({ percent, totalGoals, completedGoals, streak = 0, level = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streakRef = useRef(streak);
  useEffect(() => {
    streakRef.current = streak;
  }, [streak]);
  const [bounce, setBounce] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [displayedPercent, setDisplayedPercent] = useState(percent);

  const isComplete = totalGoals > 0 && percent === 100;
  const isHalfway = percent >= 50;
  const isStarted = completedGoals > 0;

  // Hedef ilerleme (0..1) ve yavaşça ona yaklaşan anlık ilerleme (0..1)
  const targetProgressRef = useRef(totalGoals > 0 ? percent / 100 : 0);
  const smoothProgressRef = useRef(totalGoals > 0 ? percent / 100 : 0);
  const sunglassesDropRef = useRef(isComplete ? 1 : 0);

  // Fare rotasyonu
  const targetRot = useRef({ x: 0, y: 0 });
  const currentRot = useRef({ x: 0, y: 0 });
  const jumpOffset = useRef(0);
  const jumpVelocity = useRef(0);

  useEffect(() => {
    targetProgressRef.current = totalGoals > 0 ? percent / 100 : 0;
  }, [percent, totalGoals]);

  // Sayısal yüzdeyi de yavaş yavaş artır/azalt
  useEffect(() => {
    if (displayedPercent === percent) return;
    const timer = setTimeout(() => {
      setDisplayedPercent((prev) => {
        if (prev === percent) return prev;
        const diff = percent - prev;
        const step = Math.sign(diff) * Math.max(1, Math.ceil(Math.abs(diff) * 0.12));
        return Math.abs(diff) <= Math.abs(step) ? percent : prev + step;
      });
    }, 35);
    return () => clearTimeout(timer);
  }, [percent, displayedPercent]);

  const quotes = isComplete
    ? [
        'Adım adım zirveye ulaştık, gözlük yavaşça yerine oturdu! 😎🔥',
        'Bütün hedefler tamam! 3D Boss Modu aktif! 🏆',
        'Sabırla ilerledin ve günü fethettin şampiyon! 🚀',
      ]
    : isHalfway
      ? [
          'Yavaş yavaş zirveye yürüyoruz, gözlüğe az kaldı! 👀',
          'Yolun yarısını geçtik, adımlarımız hızlanıyor!',
          'Harika gidişat! Her kutucukta bir adım daha ilerliyorum! ⚡',
        ]
      : isStarted
        ? [
            'Yola çıktık! Sen kutucukları tikledikçe adım adım ilerliyorum! 💪',
            'Isınma adımları başladı, hedefe doğru yürüyoruz!',
            'Yavaş ve kararlı adımlarla zirveye! 🎯',
          ]
        : [
            'Başlangıç taşındayım... İlk kutucuğu tikle de yürümeye başlayayım! 😴',
            'Adım adım ilerlemek için ilk hedefini tamamla!',
            'Haftalık kutucukları doldurdukça hedefe yürüyeceğim! 🚀',
          ];

  const handleCanvasClick = () => {
    setBounce(true);
    setQuoteIdx((prev) => (prev + 1) % quotes.length);
    jumpVelocity.current = 8.5;
    setTimeout(() => setBounce(false), 600);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;
    let walkPhase = 0;

    const project = (p: Vec3, width: number, height: number, rotX: number, rotY: number) => {
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x1 = p.x * cosY + p.z * sinY;
      const z1 = -p.x * sinY + p.z * cosY;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y2 = p.y * cosX - z1 * sinX;
      const z2 = p.y * sinX + z1 * cosX;

      const cameraDistance = 360;
      const scale = cameraDistance / (cameraDistance + z2 + 90);

      return {
        x: width / 2 + x1 * scale,
        y: height / 2 + y2 * scale - jumpOffset.current,
        scale,
        z: z2,
      };
    };

    const drawSphere3D = (
      p: Vec3,
      radius: number,
      color: string,
      highlightColor: string,
      width: number,
      height: number,
      rotX: number,
      rotY: number,
      glowBlur: number,
    ) => {
      const proj = project(p, width, height, rotX, rotY);
      const r = Math.max(1, radius * proj.scale);

      const grad = ctx.createRadialGradient(
        proj.x - r * 0.35,
        proj.y - r * 0.4,
        r * 0.1,
        proj.x,
        proj.y,
        r,
      );
      grad.addColorStop(0, highlightColor);
      grad.addColorStop(0.38, color);
      grad.addColorStop(0.9, '#051119');
      grad.addColorStop(1, '#000000');

      ctx.save();
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.shadowColor = color;
      ctx.shadowBlur = glowBlur;
      ctx.fill();
      ctx.restore();
    };

    const drawBone3D = (
      p1: Vec3,
      p2: Vec3,
      thickness: number,
      color: string,
      width: number,
      height: number,
      rotX: number,
      rotY: number,
      glowBlur: number,
    ) => {
      const proj1 = project(p1, width, height, rotX, rotY);
      const proj2 = project(p2, width, height, rotX, rotY);
      const t = thickness * ((proj1.scale + proj2.scale) / 2);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(proj1.x, proj1.y);
      ctx.lineTo(proj2.x, proj2.y);
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, t);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = glowBlur;
      ctx.stroke();
      ctx.restore();
    };

    const render = () => {
      // Yavaş, dingin zaman akışı
      time += 0.015;

      // İlerleme değerini hedefe doğru YAVAŞ YAVAŞ yaklaştır
      const targetP = targetProgressRef.current;
      const diffP = targetP - smoothProgressRef.current;
      const isWalking = Math.abs(diffP) > 0.004;

      if (isWalking) {
        // Sabit ve yumuşak hızla adım adım ilerle
        const maxStep = 0.0045;
        const delta = clamp01(Math.abs(diffP)) * 0.025;
        const step = Math.sign(diffP) * Math.min(maxStep, Math.max(0.0012, delta));
        smoothProgressRef.current = clamp01(smoothProgressRef.current + step);
        walkPhase += 0.09;
      } else {
        smoothProgressRef.current = targetP;
      }

      const prog = smoothProgressRef.current; // 0.0 -> 1.0

      // Gözlük iniş animasyonu (yalnızca %100'e yaklaşınca yukarıdan yavaşça iner)
      const sunglassesTarget = targetP >= 0.999 && prog >= 0.92 ? 1 : 0;
      sunglassesDropRef.current += (sunglassesTarget - sunglassesDropRef.current) * 0.035;
      const glassDrop = clamp01(sunglassesDropRef.current);

      // Zıplama fiziği (daha yumuşak yerçekimi)
      if (jumpVelocity.current > 0 || jumpOffset.current > 0) {
        jumpOffset.current += jumpVelocity.current;
        jumpVelocity.current -= 0.55;
        if (jumpOffset.current < 0) {
          jumpOffset.current = 0;
          jumpVelocity.current = 0;
        }
      }

      // Yumuşak Fare Takibi
      currentRot.current.x += (targetRot.current.x - currentRot.current.x) * 0.045;
      currentRot.current.y += (targetRot.current.y - currentRot.current.y) * 0.045;

      // Sakin nefes alma + yürürken hafif adım salınımı
      const walkBob = isWalking ? Math.abs(Math.sin(walkPhase)) * -5 : 0;
      const idleY = Math.sin(time * 1.6) * 2.2 + walkBob;
      const breathRotY = currentRot.current.y + Math.sin(time * 0.9) * 0.04;
      const breathRotX = currentRot.current.x + Math.cos(time * 1.1) * 0.02;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Karakterin 3D yol üzerindeki konumu:
      // Sol-arkadan (-52, z: 35) -> Merkez-öne (0, z: -10) yavaşça yürür!
      const posX = lerp(-46, 0, prog);
      const posZ = lerp(32, -8, prog);

      // 1. 3D ADIM TAŞLARI YOLU (5 Aşamalı İlerleme Yolu)
      for (let i = 0; i < 5; i++) {
        const stoneT = i / 4;
        const sx = lerp(-46, 0, stoneT);
        const sz = lerp(32, -8, stoneT);
        const stoneProj = project({ x: sx, y: 112, z: sz }, width, height, breathRotX, breathRotY);
        const reached = prog + 0.02 >= stoneT;
        const r = (i === 4 ? 26 : 16) * stoneProj.scale;

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(stoneProj.x, stoneProj.y, r, r * 0.36, 0, 0, Math.PI * 2);
        ctx.fillStyle = reached
          ? 'rgba(46, 230, 184, 0.22)'
          : 'rgba(255, 255, 255, 0.04)';
        ctx.strokeStyle = reached
          ? 'rgba(46, 230, 184, 0.7)'
          : 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = reached ? 2 : 1;
        if (reached) {
          ctx.shadowColor = '#2ee6b8';
          ctx.shadowBlur = 10;
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Karakterin bastığı ana hologram halkası
      ctx.save();
      const platProj = project(
        { x: posX, y: 110, z: posZ },
        width,
        height,
        breathRotX,
        breathRotY,
      );
      const platRadius = lerp(42, 66, prog) * platProj.scale;

      ctx.beginPath();
      ctx.ellipse(platProj.x, platProj.y, platRadius, platRadius * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle =
        prog >= 0.98 ? 'rgba(46, 230, 184, 0.16)' : 'rgba(46, 230, 184, 0.07)';
      ctx.strokeStyle =
        prog >= 0.98 ? 'rgba(46, 230, 184, 0.65)' : 'rgba(46, 230, 184, 0.3)';
      ctx.lineWidth = 1.8;
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Karakter Renkleri
      const mainColor = prog >= 0.95 ? '#2ee6b8' : '#4ade80';
      const highlight = prog >= 0.95 ? '#d1fae5' : '#bbf7d0';
      const boneColor = prog >= 0.95 ? '#2ee6b8' : '#e2e8f0';
      const glowBlur = lerp(3, 12, prog);

      // 2. STICKMAN 3D İSKELETİ (İlerlemeye göre duruşu yavaşça dikleşir)
      const slouch = lerp(8, 0, prog); // %0'da hafif öne eğik, %100'de dimdik
      const headCenter: Vec3 = {
        x: posX,
        y: -58 + slouch + idleY,
        z: posZ - slouch * 0.5,
      };
      const neck: Vec3 = { x: posX, y: -34 + slouch + idleY, z: posZ };
      const pelvis: Vec3 = { x: posX, y: 35 + idleY * 0.6, z: posZ };

      // Yürüyüş kol/bacak salınımı
      const walkSwing = isWalking ? Math.sin(walkPhase) * 16 : Math.sin(time * 1.4) * 4;

      // Kolların hedef konumu: prog (0 -> 0.5 -> 1.0) arasında yumuşak geçiş
      const celebrateFactor = clamp01((prog - 0.82) / 0.18);
      const flexFactor = clamp01((prog - 0.4) / 0.35) * (1 - celebrateFactor);

      const wave = Math.sin(time * 2.2) * 4;

      const leftElbow: Vec3 = {
        x: posX + lerp(-22, lerp(-32, -36, celebrateFactor), flexFactor + celebrateFactor),
        y: lerp(-8, lerp(-12, -38, celebrateFactor), flexFactor + celebrateFactor) + idleY,
        z: posZ + lerp(4, 10, prog) + walkSwing * 0.35,
      };
      const rightElbow: Vec3 = {
        x: posX + lerp(22, lerp(32, 36, celebrateFactor), flexFactor + celebrateFactor),
        y: lerp(-8, lerp(-12, -38, celebrateFactor), flexFactor + celebrateFactor) + idleY,
        z: posZ + lerp(4, 10, prog) - walkSwing * 0.35,
      };

      const leftHand: Vec3 = {
        x: posX + lerp(-28, lerp(-36, -48, celebrateFactor), flexFactor + celebrateFactor),
        y:
          lerp(16, lerp(-42, -74 + wave, celebrateFactor), flexFactor + celebrateFactor) +
          idleY,
        z: posZ + lerp(8, 16, prog) + walkSwing * 0.7,
      };
      const rightHand: Vec3 = {
        x: posX + lerp(28, lerp(36, 48, celebrateFactor), flexFactor + celebrateFactor),
        y:
          lerp(16, lerp(-42, -74 - wave, celebrateFactor), flexFactor + celebrateFactor) +
          idleY,
        z: posZ + lerp(8, 16, prog) - walkSwing * 0.7,
      };

      // Bacaklar (Yürürken adım atar)
      const legStride = isWalking ? Math.sin(walkPhase) * 14 : 0;
      const leftKnee: Vec3 = {
        x: posX - 16,
        y: 70 + idleY * 0.4,
        z: posZ + 4 - legStride * 0.5,
      };
      const rightKnee: Vec3 = {
        x: posX + 16,
        y: 70 + idleY * 0.4,
        z: posZ + 4 + legStride * 0.5,
      };
      const leftFoot: Vec3 = {
        x: posX - lerp(20, 25, prog),
        y: 108 - Math.max(0, legStride * 0.35),
        z: posZ - legStride,
      };
      const rightFoot: Vec3 = {
        x: posX + lerp(20, 25, prog),
        y: 108 - Math.max(0, -legStride * 0.35),
        z: posZ + legStride,
      };

      // Seri (streak) aurası: 3+ gün turuncu alev ışıması, 7+ gün daha güçlü
      if (streakRef.current >= 3) {
        const auraProj = project({ x: posX, y: 20, z: posZ + 20 }, width, height, breathRotX, breathRotY);
        const flicker = 0.85 + Math.sin(time * 9) * 0.08 + Math.sin(time * 5.3) * 0.07;
        const auraR = (streakRef.current >= 7 ? 120 : 95) * auraProj.scale * flicker;
        const aura = ctx.createRadialGradient(auraProj.x, auraProj.y, 8, auraProj.x, auraProj.y, auraR);
        aura.addColorStop(0, streakRef.current >= 7 ? 'rgba(251,191,36,0.34)' : 'rgba(251,146,60,0.28)');
        aura.addColorStop(0.55, 'rgba(249,115,22,0.12)');
        aura.addColorStop(1, 'rgba(249,115,22,0)');
        ctx.save();
        ctx.fillStyle = aura;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // Omuz ve kalça eklemleri: gövde artık tek çizgi değil, hacimli
      const torsoColor = prog >= 0.95 ? '#14b894' : '#94a3b8';
      const shoulderL: Vec3 = { x: posX - 13, y: neck.y + 5, z: posZ };
      const shoulderR: Vec3 = { x: posX + 13, y: neck.y + 5, z: posZ };
      const hipL: Vec3 = { x: posX - 9, y: pelvis.y, z: posZ };
      const hipR: Vec3 = { x: posX + 9, y: pelvis.y, z: posZ };

      /*
       * Derinlik sıralaması (painter's algorithm): her parça kendi z değeriyle
       * kuyruğa girer, uzaktakiler önce çizilir. Fareyle döndürünce hangi
       * kol/bacak öndeyse gerçekten önde görünür.
       */
      const cmds: { z: number; draw: () => void }[] = [];
      const zOf = (...pts: Vec3[]) =>
        pts.reduce((sum, p) => sum + project(p, width, height, breathRotX, breathRotY).z, 0) /
        pts.length;
      const bone = (a: Vec3, b: Vec3, thickness: number, color: string) =>
        cmds.push({
          z: zOf(a, b),
          draw: () =>
            drawBone3D(a, b, thickness, color, width, height, breathRotX, breathRotY, glowBlur),
        });
      const ball = (p: Vec3, radius: number, color: string) =>
        cmds.push({
          z: zOf(p),
          draw: () =>
            drawSphere3D(p, radius, color, highlight, width, height, breathRotX, breathRotY, glowBlur),
        });

      // Gövde
      bone(neck, pelvis, 13, torsoColor);
      bone(shoulderL, shoulderR, 9, boneColor);
      bone(hipL, hipR, 9, boneColor);

      // Bacaklar
      bone(hipL, leftKnee, 7, boneColor);
      bone(leftKnee, leftFoot, 6, boneColor);
      ball(leftFoot, 6, boneColor);
      bone(hipR, rightKnee, 7, boneColor);
      bone(rightKnee, rightFoot, 6, boneColor);
      ball(rightFoot, 6, boneColor);

      // Kollar
      bone(shoulderL, leftElbow, 6, boneColor);
      bone(leftElbow, leftHand, 5, boneColor);
      ball(leftHand, 6, mainColor);
      bone(shoulderR, rightElbow, 6, boneColor);
      bone(rightElbow, rightHand, 5, boneColor);
      ball(rightHand, 6, mainColor);

      cmds.sort((a, b) => b.z - a.z);
      for (const cmd of cmds) cmd.draw();
      // 3. 3D KAFA
      drawSphere3D(
        headCenter,
        23,
        mainColor,
        highlight,
        width,
        height,
        breathRotX,
        breathRotY,
        glowBlur,
      );

      const headProj = project(headCenter, width, height, breathRotX, breathRotY);

      // 7+ gün seri: altın taç
      if (streakRef.current >= 7) {
        const s = headProj.scale;
        const cx = headProj.x;
        const base = headProj.y - 21 * s;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx - 17 * s, base);
        ctx.lineTo(cx - 19 * s, base - 17 * s);
        ctx.lineTo(cx - 9 * s, base - 8 * s);
        ctx.lineTo(cx, base - 21 * s);
        ctx.lineTo(cx + 9 * s, base - 8 * s);
        ctx.lineTo(cx + 19 * s, base - 17 * s);
        ctx.lineTo(cx + 17 * s, base);
        ctx.closePath();
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1.5 * s;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Normal Gözler (Gözlük tam inmeden önce görünür)
      if (glassDrop < 0.95) {
        ctx.save();
        ctx.fillStyle = '#000000';
        const eyeOffset = 7 * headProj.scale;
        const eyeY = headProj.y - 2 * headProj.scale;

        ctx.beginPath();
        ctx.arc(headProj.x - eyeOffset, eyeY, 2.4 * headProj.scale, 0, Math.PI * 2);
        ctx.arc(headProj.x + eyeOffset, eyeY, 2.4 * headProj.scale, 0, Math.PI * 2);
        ctx.fill();

        // İlerlemeye göre büyüyen gülümseme
        ctx.beginPath();
        ctx.arc(
          headProj.x,
          headProj.y + 7 * headProj.scale,
          lerp(4, 7.5, prog) * headProj.scale,
          0.15 * Math.PI,
          0.85 * Math.PI,
        );
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2 * headProj.scale;
        ctx.stroke();
        ctx.restore();
      }

      // 4. YUKARIDAN YAVAŞÇA İNEN 3D GÜNEŞ GÖZLÜĞÜ ("Deal With It" Efektli)
      if (glassDrop > 0.01) {
        const glassWidth = 36 * headProj.scale;
        const glassHeight = 15 * headProj.scale;
        // Yukarıdan (-45px) göz hizasına (-2px) yavaşça iner
        const dropOffsetY = lerp(-48, -2, glassDrop) * headProj.scale;

        ctx.save();
        ctx.globalAlpha = clamp01(glassDrop * 1.2);
        ctx.translate(headProj.x, headProj.y + dropOffsetY);
        ctx.rotate(breathRotY * 0.45);

        ctx.fillStyle = '#05070a';
        ctx.strokeStyle = '#2ee6b8';
        ctx.lineWidth = 2.5 * headProj.scale;
        ctx.shadowColor = '#2ee6b8';
        ctx.shadowBlur = 10;

        // Sol Cam
        ctx.beginPath();
        ctx.roundRect(
          -glassWidth * 0.52,
          -glassHeight * 0.45,
          glassWidth * 0.48,
          glassHeight,
          3 * headProj.scale,
        );
        ctx.fill();
        ctx.stroke();

        // Sağ Cam
        ctx.beginPath();
        ctx.roundRect(
          glassWidth * 0.04,
          -glassHeight * 0.45,
          glassWidth * 0.48,
          glassHeight,
          3 * headProj.scale,
        );
        ctx.fill();
        ctx.stroke();

        // Gözlük Köprüsü
        ctx.beginPath();
        ctx.moveTo(-glassWidth * 0.05, -glassHeight * 0.1);
        ctx.lineTo(glassWidth * 0.05, -glassHeight * 0.1);
        ctx.stroke();

        // Camlarda 3D Parlama
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.8 * headProj.scale;
        ctx.beginPath();
        ctx.moveTo(-glassWidth * 0.42, -glassHeight * 0.25);
        ctx.lineTo(-glassWidth * 0.22, glassHeight * 0.35);
        ctx.moveTo(glassWidth * 0.14, -glassHeight * 0.25);
        ctx.lineTo(glassWidth * 0.34, glassHeight * 0.35);
        ctx.stroke();

        ctx.restore();

        // Gözlük indikten sonra parlak gülüş
        if (glassDrop > 0.8) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(
            headProj.x,
            headProj.y + 9 * headProj.scale,
            8 * headProj.scale,
            0.2 * Math.PI,
            0.8 * Math.PI,
          );
          ctx.strokeStyle = '#2ee6b8';
          ctx.lineWidth = 2 * headProj.scale;
          ctx.stroke();
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width - 0.5;
      const my = (e.clientY - rect.top) / rect.height - 0.5;
      targetRot.current.y = mx * 0.65;
      targetRot.current.x = -my * 0.35;
    };

    const handleMouseLeave = () => {
      targetRot.current.x = 0;
      targetRot.current.y = 0;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="relative flex w-full select-none flex-col items-center justify-center">
      {/* Konuşma Balonu */}
      <div
        onClick={handleCanvasClick}
        className={cn(
          'relative mb-3 max-w-[320px] cursor-pointer rounded-2xl border px-4 py-2.5 text-center text-xs font-semibold shadow-xl backdrop-blur transition-all duration-700',
          isComplete
            ? 'border-primary/60 bg-primary/20 text-primary shadow-[0_0_24px_rgba(46,230,184,0.35)]'
            : 'border-white/10 bg-[#0e1620]/95 text-foreground hover:border-white/25',
        )}
      >
        <p className="text-[13px] leading-snug">{quotes[quoteIdx % quotes.length]}</p>
        <span className="mt-1 block text-[10px] text-muted-foreground opacity-75">
          (zıplatmak veya sözü değiştirmek için tıkla)
        </span>

        <div
          className={cn(
            'absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-b border-r',
            isComplete ? 'border-primary/60 bg-[#0b1117]' : 'border-white/10 bg-[#0e1620]',
          )}
        />
      </div>

      {/* 3D Canvas Konteyneri */}
      <div
        onClick={handleCanvasClick}
        className={cn(
          'relative flex size-72 cursor-pointer items-center justify-center rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#111923]/90 via-[#0a1017]/95 to-[#05080c] p-2 shadow-[0_16px_48px_rgba(0,0,0,0.6)] transition-all duration-500',
          bounce && 'scale-[1.03]',
          isComplete && 'ring-2 ring-primary/60 shadow-[0_0_40px_rgba(46,230,184,0.3)]',
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-1000',
            isComplete
              ? 'bg-[radial-gradient(ellipse_at_center,rgba(46,230,184,0.28),transparent_70%)] opacity-100'
              : 'bg-[radial-gradient(ellipse_at_center,rgba(74,222,128,0.1),transparent_70%)] opacity-60',
          )}
        />

        {isComplete && (
          <>
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-primary/50 bg-primary/25 px-2.5 py-1 text-xs font-bold text-primary shadow-[0_0_14px_var(--primary)]">
              <Trophy className="size-3.5" />
              3D BOSS
            </div>
            <Sparkles className="absolute left-3 top-3 size-5 text-primary/80" />
            <Sparkles className="absolute bottom-4 right-4 size-4 text-primary/80" />
          </>
        )}

        <canvas
          ref={canvasRef}
          width={280}
          height={280}
          className="size-full drop-shadow-[0_8px_20px_rgba(0,0,0,0.7)]"
        />
      </div>

      {/* 5 Aşamalı Yavaş İlerleme Yolu (Milestone Stepper) */}
      <div className="mt-4 w-full max-w-[310px] space-y-2">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-primary to-[#5eead4] shadow-[0_0_12px_var(--primary)] transition-all duration-1000 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px]">
          {STAGES.map((stage) => {
            const reached = displayedPercent >= stage.threshold && (totalGoals > 0 || stage.threshold === 0);
            return (
              <span
                key={stage.threshold}
                className={cn(
                  'font-medium transition-colors duration-700',
                  reached ? 'font-bold text-primary' : 'text-muted-foreground/50',
                )}
              >
                {stage.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Seri ve seviye */}
      <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold">
        <span
          className={cn(
            'rounded-full border px-2.5 py-1',
            streak >= 3
              ? 'border-orange-400/50 bg-orange-400/15 text-orange-300'
              : 'border-white/[0.08] bg-white/[0.04] text-muted-foreground',
          )}
        >
          🔥 {streak} gün seri{streak >= 7 ? ' · 👑' : streak >= 3 ? ' · alev' : ''}
        </span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-muted-foreground">
          Seviye {level}
        </span>
      </div>

      {/* Alt Seviye & Gözlük Durumu */}
      <div className="mt-3 flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 font-mono text-xs font-bold transition-all duration-700',
            isComplete
              ? 'border border-primary/40 bg-primary/20 text-primary shadow-[0_0_14px_rgba(46,230,184,0.35)]'
              : 'border border-white/[0.08] bg-white/[0.06] text-muted-foreground',
          )}
        >
          {isComplete
            ? '🕶️ 3D Havalı Gözlük Açıldı (Boss Mod)'
            : `🎯 İlerleme: %${displayedPercent} Tamamlandı`}
        </span>
      </div>
    </div>
  );
}
