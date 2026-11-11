'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  percent: number;
  totalGoals: number;
  completedGoals: number;
};

// 3D Vektör Tipi
type Vec3 = { x: number; y: number; z: number };

export function Stickman3D({ percent, totalGoals, completedGoals }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bounce, setBounce] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  const isComplete = totalGoals > 0 && percent === 100;
  const isHalfway = percent >= 50;
  const isStarted = completedGoals > 0;

  // Fare rotasyonu (Kullanıcı fareyi hareket ettirdikçe 3D karakter o yöne bakar)
  const targetRot = useRef({ x: 0, y: 0 });
  const currentRot = useRef({ x: 0, y: 0 });
  const jumpOffset = useRef(0);
  const jumpVelocity = useRef(0);

  const quotes = isComplete
    ? [
        'GÖZLÜĞÜ TAKTIM KANKA! 3D Boss Mode açık! 😎🔥',
        'Bu haftanın kralı sensin! Bütün hedefler darmadağın! 🏆',
        'Karizma seviyemiz tavan yaptı, tebrikler şampiyon! 🚀',
      ]
    : isHalfway
      ? [
          'Haftalık gidişat süper! Gözlüğü hazırlıyorum kanka! 👀',
          'Yarısı cepte! Biraz daha basarsak gözlük kafaya inecek!',
          'Harika bir ivme yakaladın, sakın gazı kesme! ⚡',
        ]
      : isStarted
        ? [
            'Güzel başlangıç! Kutucukları doldurmaya devam et! 💪',
            'Isınma tamamlandı! Birkaç hedef sonra gözlüğü takıyoruz!',
            'Gidişat hareketlendi, hadi hedefleri tek tek avlayalım! 🎯',
          ]
        : [
            'Hadi kanka birkaç hedef bitir de şu 3D gözlüğü takayım! 😴',
            'Kutucuklar seni bekliyor, ilk adımı at da canlanayım!',
            'Haftalık planını yap ve beni havalı moda geçir! 🚀',
          ];

  const handleCanvasClick = () => {
    setBounce(true);
    setQuoteIdx((prev) => (prev + 1) % quotes.length);
    jumpVelocity.current = 12; // 3D zıplama
    setTimeout(() => setBounce(false), 600);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // 3D Perspektif Matrisi
    const project = (p: Vec3, width: number, height: number, rotX: number, rotY: number) => {
      // Y ekseni rotasyonu (Yatay bakış)
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x1 = p.x * cosY + p.z * sinY;
      const z1 = -p.x * sinY + p.z * cosY;

      // X ekseni rotasyonu (Dikey bakış)
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y2 = p.y * cosX - z1 * sinX;
      const z2 = p.y * sinX + z1 * cosX;

      // Perspektif izdüşümü
      const cameraDistance = 350;
      const scale = cameraDistance / (cameraDistance + z2 + 80);

      return {
        x: width / 2 + x1 * scale,
        y: height / 2 + y2 * scale - jumpOffset.current,
        scale,
        z: z2,
      };
    };

    // 3D Küre Çizimi (Derinlik ve Işık Parlaması ile)
    const drawSphere3D = (
      p: Vec3,
      radius: number,
      color: string,
      highlightColor: string,
      width: number,
      height: number,
      rotX: number,
      rotY: number,
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
      grad.addColorStop(0.35, color);
      grad.addColorStop(0.9, '#051119');
      grad.addColorStop(1, '#000000');

      ctx.save();
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.shadowColor = color;
      ctx.shadowBlur = isComplete ? 14 : 4;
      ctx.fill();
      ctx.restore();
    };

    // 3D Silindir / Boru Çizimi (Uzuvlar için)
    const drawBone3D = (
      p1: Vec3,
      p2: Vec3,
      thickness: number,
      color: string,
      width: number,
      height: number,
      rotX: number,
      rotY: number,
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
      ctx.shadowBlur = isComplete ? 8 : 2;
      ctx.stroke();
      ctx.restore();
    };

    const render = () => {
      time += 0.035;

      // Zıplama Fiziği
      if (jumpVelocity.current > 0 || jumpOffset.current > 0) {
        jumpOffset.current += jumpVelocity.current;
        jumpVelocity.current -= 1.2;
        if (jumpOffset.current < 0) {
          jumpOffset.current = 0;
          jumpVelocity.current = 0;
        }
      }

      // Yumuşak Fare Takibi (Lerp)
      currentRot.current.x += (targetRot.current.x - currentRot.current.x) * 0.08;
      currentRot.current.y += (targetRot.current.y - currentRot.current.y) * 0.08;

      // Nefes alma / hafif salınım
      const idleY = Math.sin(time * 2) * 3;
      const breathRotY = currentRot.current.y + Math.sin(time) * 0.06;
      const breathRotX = currentRot.current.x + Math.cos(time * 1.5) * 0.03;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // 1. ZEMİN HOLOGRAMI (3D Dönen Platform)
      ctx.save();
      const platformY = 110;
      const platProj = project({ x: 0, y: platformY, z: 0 }, width, height, breathRotX, breathRotY);
      const platRadius = 70 * platProj.scale;

      ctx.beginPath();
      ctx.ellipse(platProj.x, platProj.y, platRadius, platRadius * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = isComplete
        ? 'rgba(46, 230, 184, 0.12)'
        : 'rgba(255, 255, 255, 0.04)';
      ctx.strokeStyle = isComplete
        ? 'rgba(46, 230, 184, 0.45)'
        : 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.shadowColor = isComplete ? '#2ee6b8' : '#ffffff';
      ctx.shadowBlur = isComplete ? 15 : 4;
      ctx.fill();
      ctx.stroke();

      // Platform İç Halkası
      ctx.beginPath();
      ctx.ellipse(platProj.x, platProj.y, platRadius * 0.65, platRadius * 0.22, 0, 0, Math.PI * 2);
      ctx.strokeStyle = isComplete ? 'rgba(46, 230, 184, 0.6)' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Karakter Renkleri
      const mainColor = isComplete ? '#2ee6b8' : '#4ade80';
      const highlight = isComplete ? '#d1fae5' : '#bbf7d0';
      const boneColor = isComplete ? '#2ee6b8' : '#e2e8f0';

      // 2. STICKMAN 3D EKLEMLERİ (İskelet Noktaları)
      const headCenter: Vec3 = { x: 0, y: -58 + idleY, z: 0 };
      const neck: Vec3 = { x: 0, y: -34 + idleY, z: 0 };
      const pelvis: Vec3 = { x: 0, y: 35 + idleY, z: 0 };

      // Kolların duruşu (Moda göre 3D poz)
      let leftHand: Vec3;
      let rightHand: Vec3;
      let leftElbow: Vec3;
      let rightElbow: Vec3;

      if (isComplete) {
        // Zafer Pozu: Kollar yukarıda ve önde kutluyor!
        const wave = Math.sin(time * 4) * 6;
        leftHand = { x: -48, y: -75 + wave, z: 15 };
        rightHand = { x: 48, y: -75 - wave, z: 15 };
        leftElbow = { x: -36, y: -38, z: 10 };
        rightElbow = { x: 36, y: -38, z: 10 };
      } else if (isHalfway) {
        // Kas Pozu: Dirsekler bükülü
        leftHand = { x: -36, y: -45, z: 18 };
        rightHand = { x: 36, y: -45, z: 18 };
        leftElbow = { x: -34, y: -10, z: 8 };
        rightElbow = { x: 34, y: -10, z: 8 };
      } else {
        // Normal Dinamik Poz
        const swing = Math.sin(time * 2) * 8;
        leftHand = { x: -30, y: 15 + swing, z: 8 };
        rightHand = { x: 30, y: 15 - swing, z: 8 };
        leftElbow = { x: -22, y: -10, z: 4 };
        rightElbow = { x: 22, y: -10, z: 4 };
      }

      // Bacaklar
      const leftKnee: Vec3 = { x: -16, y: 70 + idleY * 0.5, z: 4 };
      const rightKnee: Vec3 = { x: 16, y: 70 + idleY * 0.5, z: 4 };
      const leftFoot: Vec3 = { x: -24, y: 108, z: 0 };
      const rightFoot: Vec3 = { x: 24, y: 108, z: 0 };

      // Gövde
      drawBone3D(neck, pelvis, 7, boneColor, width, height, breathRotX, breathRotY);

      // Bacaklar
      drawBone3D(pelvis, leftKnee, 6, boneColor, width, height, breathRotX, breathRotY);
      drawBone3D(leftKnee, leftFoot, 5, boneColor, width, height, breathRotX, breathRotY);
      drawSphere3D(leftFoot, 5, boneColor, highlight, width, height, breathRotX, breathRotY);

      drawBone3D(pelvis, rightKnee, 6, boneColor, width, height, breathRotX, breathRotY);
      drawBone3D(rightKnee, rightFoot, 5, boneColor, width, height, breathRotX, breathRotY);
      drawSphere3D(rightFoot, 5, boneColor, highlight, width, height, breathRotX, breathRotY);

      // Kollar
      drawBone3D(neck, leftElbow, 5, boneColor, width, height, breathRotX, breathRotY);
      drawBone3D(leftElbow, leftHand, 4.5, boneColor, width, height, breathRotX, breathRotY);
      drawSphere3D(leftHand, 5.5, mainColor, highlight, width, height, breathRotX, breathRotY);

      drawBone3D(neck, rightElbow, 5, boneColor, width, height, breathRotX, breathRotY);
      drawBone3D(rightElbow, rightHand, 4.5, boneColor, width, height, breathRotX, breathRotY);
      drawSphere3D(rightHand, 5.5, mainColor, highlight, width, height, breathRotX, breathRotY);

      // 3. 3D KAFA (Büyük, Hacimli 3D Küre)
      drawSphere3D(headCenter, 23, mainColor, highlight, width, height, breathRotX, breathRotY);

      // 4. HAVALI 3D GÜNEŞ GÖZLÜĞÜ (COOL SUNGLASSES - İşte kullanıcının istediği!)
      if (isComplete) {
        const headProj = project(headCenter, width, height, breathRotX, breathRotY);
        const glassWidth = 36 * headProj.scale;
        const glassHeight = 15 * headProj.scale;

        ctx.save();
        ctx.translate(headProj.x, headProj.y - 2 * headProj.scale);
        ctx.rotate(breathRotY * 0.45);

        // Gözlük Çerçevesi
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

        // Camlarda 3D Neon Işık Yansıması (Diagonal Cool Glare)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.8 * headProj.scale;
        ctx.beginPath();
        ctx.moveTo(-glassWidth * 0.42, -glassHeight * 0.25);
        ctx.lineTo(-glassWidth * 0.22, glassHeight * 0.35);
        ctx.moveTo(glassWidth * 0.14, -glassHeight * 0.25);
        ctx.lineTo(glassWidth * 0.34, glassHeight * 0.35);
        ctx.stroke();

        // Havalı 3D Gülüş
        ctx.beginPath();
        ctx.arc(0, 11 * headProj.scale, 8 * headProj.scale, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.strokeStyle = '#2ee6b8';
        ctx.lineWidth = 2 * headProj.scale;
        ctx.stroke();

        ctx.restore();
      } else {
        // Normal Yüz Gözleri
        const headProj = project(headCenter, width, height, breathRotX, breathRotY);
        ctx.save();
        ctx.fillStyle = '#000000';
        const eyeOffset = 7 * headProj.scale;
        const eyeY = headProj.y - 2 * headProj.scale;

        ctx.beginPath();
        ctx.arc(headProj.x - eyeOffset, eyeY, 2.5 * headProj.scale, 0, Math.PI * 2);
        ctx.arc(headProj.x + eyeOffset, eyeY, 2.5 * headProj.scale, 0, Math.PI * 2);
        ctx.fill();

        // Hafif Gülüş
        ctx.beginPath();
        ctx.arc(headProj.x, headProj.y + 7 * headProj.scale, 6 * headProj.scale, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2 * headProj.scale;
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    // Fare Takip Olayı
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width - 0.5;
      const my = (e.clientY - rect.top) / rect.height - 0.5;
      targetRot.current.y = mx * 0.7; // Sağa-sola bakış
      targetRot.current.x = -my * 0.4; // Yukarı-aşağı bakış
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
  }, [isComplete, isHalfway, isStarted]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full">
      {/* Konuşma Balonu */}
      <div
        onClick={handleCanvasClick}
        className={cn(
          'relative mb-3 max-w-[320px] cursor-pointer rounded-2xl border px-4 py-2.5 text-center text-xs font-semibold shadow-xl backdrop-blur transition-all',
          isComplete
            ? 'border-primary/60 bg-primary/20 text-primary shadow-[0_0_24px_rgba(46,230,184,0.35)] animate-pulse'
            : 'border-white/10 bg-[#0e1620]/95 text-foreground hover:border-white/25',
        )}
      >
        <p className="leading-snug text-[13px]">{quotes[quoteIdx % quotes.length]}</p>
        <span className="text-[10px] text-muted-foreground block mt-1 opacity-75">
          (karakteri zıplatmak için tıkla)
        </span>

        {/* Konuşma Balonu Alt Oku */}
        <div
          className={cn(
            'absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-3 rotate-45 border-r border-b',
            isComplete ? 'border-primary/60 bg-[#0b1117]' : 'border-white/10 bg-[#0e1620]',
          )}
        />
      </div>

      {/* 3D Canvas Konteyneri */}
      <div
        onClick={handleCanvasClick}
        className={cn(
          'relative flex size-72 cursor-pointer items-center justify-center rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#111923]/90 via-[#0a1017]/95 to-[#05080c] p-2 shadow-[0_16px_48px_rgba(0,0,0,0.6)] transition-all duration-300',
          bounce && 'scale-105',
          isComplete && 'ring-2 ring-primary/60 shadow-[0_0_40px_rgba(46,230,184,0.3)]',
        )}
      >
        {/* Arka Plan 3D Hologram Parıltısı */}
        <div
          className={cn(
            'pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-700',
            isComplete
              ? 'bg-[radial-gradient(ellipse_at_center,rgba(46,230,184,0.3),transparent_70%)] opacity-100'
              : 'bg-[radial-gradient(ellipse_at_center,rgba(74,222,128,0.1),transparent_70%)] opacity-60',
          )}
        />

        {/* Boss Rozeti & 3D Parıltılar */}
        {isComplete && (
          <>
            <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-primary/25 border border-primary/50 px-2.5 py-1 text-xs font-bold text-primary shadow-[0_0_14px_var(--primary)] animate-bounce">
              <Trophy className="size-3.5" />
              3D BOSS
            </div>
            <Sparkles className="absolute top-3 left-3 size-5 text-primary/80 animate-spin" />
            <Sparkles className="absolute bottom-4 right-4 size-4 text-primary/80" />
          </>
        )}

        {/* Gerçek 3D Render Canvas */}
        <canvas
          ref={canvasRef}
          width={280}
          height={280}
          className="size-full drop-shadow-[0_8px_20px_rgba(0,0,0,0.7)]"
        />
      </div>

      {/* Alt Seviye & Gözlük Durumu */}
      <div className="mt-4 flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 font-mono text-xs font-bold transition-all',
            isComplete
              ? 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_14px_rgba(46,230,184,0.35)]'
              : 'bg-white/[0.06] text-muted-foreground border border-white/[0.08]',
          )}
        >
          {isComplete ? '🕶️ 3D Havalı Gözlük Açıldı (Boss Mod)' : `🎯 Seviye: %${percent} Tamamlandı`}
        </span>
      </div>
    </div>
  );
}
