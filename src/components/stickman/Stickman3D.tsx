'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Trophy } from 'lucide-react';
import * as THREE from 'three';

import {
  buildStaircase,
  buildStickmanRig,
  STAIR_COUNT,
  STAIR_DX,
  STAIR_RISE,
  STAIR_X0,
} from '@/components/stickman/buildStickmanRig';
import { cn } from '@/lib/utils';

type Props = {
  percent: number;
  totalGoals: number;
  completedGoals: number;
  /** Ardışık başarılı gün sayısı: 3+ alev aurası, 7+ taç. */
  streak?: number;
  level?: number;
};

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

function smoothstep(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function Stickman3D({ percent, totalGoals, completedGoals, streak = 0, level = 1 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Hedef ve yumuşak geçiş ref'leri (animasyon döngüsünden okunur)
  const targetProgressRef = useRef(totalGoals > 0 ? percent / 100 : 0);
  const smoothProgressRef = useRef(totalGoals > 0 ? percent / 100 : 0);
  const sunglassesDropRef = useRef(isComplete ? 1 : 0);

  const targetTilt = useRef({ x: 0, y: 0 });
  const currentTilt = useRef({ x: 0, y: 0 });
  const jumpOffset = useRef(0);
  const jumpVelocity = useRef(0);
  const spinBoost = useRef(0);

  useEffect(() => {
    targetProgressRef.current = totalGoals > 0 ? percent / 100 : 0;
  }, [percent, totalGoals]);

  // Sayısal yüzdeyi de adım adım güncelle
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
        'Basamakları tek tek çıktık, gözlük yavaşça yerine oturdu! 😎🔥',
        'Bütün hedefler tamam! 3D Boss Modu aktif! 🏆',
        'Zirveye tırmandın şampiyon! 🚀',
      ]
    : isHalfway
      ? [
          'Merdivenleri adım adım tırmanıyoruz, gözlüğe az kaldı! 👀',
          'Yarıyı geçtik, üst basamaklar parlamaya başladı!',
          'Her tamamladığın görevde bir basamak daha yukarı çıkıyorum! ⚡',
        ]
      : isStarted
        ? [
            'İlk basamaktan yola çıktık! Tikledikçe tırmanıyorum! 💪',
            'Adım adım yukarı çıkıyoruz, hız kesmek yok!',
            'Sabırla her kutucuk bir basamak demek! 🎯',
          ]
        : [
            'İlk basamaktayım... Bir hedef tikle de merdiveni çıkmaya başlayayım! 😴',
            'Adım adım zirveye tırmanmak için ilk görevini tamamla!',
            'Haftalık kutucukları doldurdukça yukarı çıkacağım! 🚀',
          ];

  const handleCanvasClick = () => {
    setBounce(true);
    setQuoteIdx((prev) => (prev + 1) % quotes.length);
    jumpVelocity.current = 0.082;
    if (targetProgressRef.current >= 0.999) {
      spinBoost.current = Math.PI * 2;
    }
    setTimeout(() => setBounce(false), 500);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      const ctx2d = canvas.getContext('2d');
      if (ctx2d) {
        canvas.width = 280;
        canvas.height = 280;
        ctx2d.fillStyle = '#94a3b8';
        ctx2d.font = '12px sans-serif';
        ctx2d.textAlign = 'center';
        ctx2d.fillText('3D WebGL bu tarayıcıda desteklenmiyor', 140, 140);
      }
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    const camPivot = new THREE.Group();
    camPivot.position.set(0.05, 1.38, 0);
    scene.add(camPivot);
    camera.position.set(0.1, 1.05, 6.75);
    camera.lookAt(0, 0.05, 0);
    camPivot.add(camera);

    // Sahne Işıkları (3 noktalı stüdyo aydınlatması + neon rim)
    const hemiLight = new THREE.HemisphereLight('#a7f3d0', '#09111a', 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#ffffff', 2.2);
    keyLight.position.set(3.2, 6.5, 4.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 16;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -2;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#2ee6b8', 1.6);
    rimLight.position.set(-4.0, 3.2, -3.5);
    scene.add(rimLight);

    const followGlow = new THREE.PointLight('#2ee6b8', 1.4, 5.5);
    followGlow.position.set(0, 2.2, 1.6);
    scene.add(followGlow);

    // Zemin diski (hafif yansıyan karanlık platform)
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    const floorGeo = new THREE.CylinderGeometry(3.2, 3.4, 0.12, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#060a0f',
      roughness: 0.65,
      metalness: 0.4,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.41, 0);
    floor.receiveShadow = true;
    stageGroup.add(floor);

    const ringGeo = new THREE.RingGeometry(2.85, 2.9, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#2ee6b8',
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    const floorRing = new THREE.Mesh(ringGeo, ringMat);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.set(0, -0.345, 0);
    stageGroup.add(floorRing);

    // 3D Merdiven ve Karakter
    const stairs = buildStaircase();
    stageGroup.add(stairs.group);

    const rig = buildStickmanRig();
    stageGroup.add(rig.root);

    // 3D Seri Alev Parçacıkları (3+ gün seride aktif)
    const emberCount = 16;
    const emberGroup = new THREE.Group();
    rig.root.add(emberGroup);
    const emberGeo = new THREE.SphereGeometry(0.032, 8, 8);
    const emberMat = new THREE.MeshBasicMaterial({
      color: '#fb923c',
      transparent: true,
      opacity: 0.85,
    });
    const embers: { mesh: THREE.Mesh; phase: number; radius: number; speed: number }[] = [];
    for (let i = 0; i < emberCount; i++) {
      const m = new THREE.Mesh(emberGeo, emberMat);
      emberGroup.add(m);
      embers.push({
        mesh: m,
        phase: (i / emberCount) * Math.PI * 2,
        radius: 0.36 + (i % 3) * 0.08,
        speed: 1.4 + (i % 4) * 0.35,
      });
    }

    // Boyutlandırma
    const syncSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(180, Math.round(rect.width));
      const h = Math.max(180, Math.round(rect.height));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(container);

    let animId = 0;
    let time = 0;
    let walkPhase = 0;
    let facingYaw = 0.25;

    const greenLow = new THREE.Color('#4ade80');
    const turquoiseBoss = new THREE.Color('#2ee6b8');

    const renderFrame = () => {
      time += 0.016;

      // Yavaş ve adım adım ilerleme (0..1)
      const targetP = targetProgressRef.current;
      const diffP = targetP - smoothProgressRef.current;
      const isWalking = Math.abs(diffP) > 0.003;

      if (isWalking) {
        const maxStep = 0.0028;
        const delta = clamp01(Math.abs(diffP)) * 0.022;
        const step = Math.sign(diffP) * Math.min(maxStep, Math.max(0.001, delta));
        smoothProgressRef.current = clamp01(smoothProgressRef.current + step);
        walkPhase += 0.11;
      } else {
        smoothProgressRef.current = targetP;
      }

      const prog = smoothProgressRef.current;

      // Basamak matematiği: önce yatay yürü, sonra diz kaldırıp bir üst basamağa çık
      const idxF = prog * (STAIR_COUNT - 1);
      const baseStep = Math.min(STAIR_COUNT - 1, Math.floor(idxF + 1e-6));
      const frac = idxF - baseStep;
      const climbFrac = smoothstep((frac - 0.28) / 0.72);
      const climbedSteps = baseStep + climbFrac;

      const posX = STAIR_X0 + idxF * STAIR_DX;
      const posY = climbedSteps * STAIR_RISE;

      // Zıplama & kutlama dönüşü fiziği
      if (jumpVelocity.current !== 0 || jumpOffset.current > 0) {
        jumpOffset.current += jumpVelocity.current;
        jumpVelocity.current -= 0.0052;
        if (jumpOffset.current <= 0) {
          jumpOffset.current = 0;
          jumpVelocity.current = 0;
        }
      }
      if (spinBoost.current > 0.01) {
        spinBoost.current *= 0.88;
      } else {
        spinBoost.current = 0;
      }

      // Merdiven ışıklarını yak
      for (let i = 0; i < stairs.steps.length; i++) {
        const reached = idxF + 0.02 >= i;
        const stepObj = stairs.steps[i]!;
        stepObj.topMat.emissiveIntensity = lerp(stepObj.topMat.emissiveIntensity, reached ? 0.35 : 0.05, 0.08);
        stepObj.trimMat.emissiveIntensity = lerp(stepObj.trimMat.emissiveIntensity, reached ? 1.4 : 0.15, 0.08);
      }

      // Zirve bayrağı parlaması
      const atTop = prog >= 0.995;
      stairs.flagMat.color.set(atTop ? '#2ee6b8' : '#475569');
      stairs.flagMat.emissiveIntensity = atTop ? 1.3 + Math.sin(time * 4) * 0.3 : 0.1;
      stairs.flagMesh.position.y = (STAIR_COUNT - 1) * STAIR_RISE + 0.82 + (atTop ? Math.sin(time * 3) * 0.02 : 0);

      // Karakter rengi (%100'de turkuaza geçer)
      const colorMix = smoothstep((prog - 0.8) / 0.2);
      rig.materials.body.color.copy(greenLow).lerp(turquoiseBoss, colorMix);
      rig.materials.core.emissiveIntensity = lerp(0.7, 1.6, prog);
      rig.chestCore.rotation.y = time * 1.4;

      // Karakter yönü: yürürken merdivene doğru (+X, hafif öne), durunca kameraya dönük
      const walkDir = diffP >= 0 ? Math.PI * 0.36 : -Math.PI * 0.36;
      const idleFacing = atTop ? 0.05 : 0.24;
      const targetYaw = isWalking ? walkDir : idleFacing;
      facingYaw = lerp(facingYaw, targetYaw, 0.08);

      // Karakter pozisyonu
      const walkBob = isWalking ? Math.abs(Math.sin(walkPhase)) * 0.045 : 0;
      rig.root.position.set(posX, posY + jumpOffset.current + walkBob, 0);
      rig.root.rotation.y = facingYaw + spinBoost.current;

      // Duruş: %0'da hafif kambur, %100'de dik
      const slouch = lerp(0.16, 0, prog);
      rig.spine.rotation.x = slouch + Math.sin(time * 1.6) * 0.02;
      rig.head.rotation.x = -slouch * 0.5 + Math.sin(time * 1.4) * 0.03;

      // Bacak animasyonu (merdivende diz yukarı kalkar)
      const stride = isWalking ? Math.sin(walkPhase) : 0;
      const leftLift = isWalking ? Math.max(0, stride) : 0;
      const rightLift = isWalking ? Math.max(0, -stride) : 0;

      rig.leftHip.rotation.x = isWalking ? -stride * 0.55 - leftLift * 0.35 : 0.03;
      rig.leftKnee.rotation.x = isWalking ? leftLift * 0.95 + 0.08 : 0.04;
      rig.rightHip.rotation.x = isWalking ? stride * 0.55 - rightLift * 0.35 : -0.03;
      rig.rightKnee.rotation.x = isWalking ? rightLift * 0.95 + 0.08 : 0.04;

      // Kol animasyonu: yürüme salınımı -> yarıda özgüven -> %100'de Boss kutlaması
      const celebrate = smoothstep((prog - 0.86) / 0.14);
      const wave = Math.sin(time * 3.2) * 0.14;

      if (isWalking) {
        rig.leftShoulder.rotation.x = stride * 0.52;
        rig.leftShoulder.rotation.z = -0.14;
        rig.leftElbow.rotation.x = -0.45 - Math.max(0, -stride) * 0.35;

        rig.rightShoulder.rotation.x = -stride * 0.52;
        rig.rightShoulder.rotation.z = 0.14;
        rig.rightElbow.rotation.x = -0.45 - Math.max(0, stride) * 0.35;
      } else {
        // Bekleme / kutlama geçişi
        rig.leftShoulder.rotation.x = lerp(0.05, -0.35, celebrate);
        rig.leftShoulder.rotation.z = lerp(-0.15, -2.55 + wave, celebrate);
        rig.leftElbow.rotation.x = lerp(-0.22, -0.4, celebrate);

        rig.rightShoulder.rotation.x = lerp(0.05, -0.35, celebrate);
        rig.rightShoulder.rotation.z = lerp(0.15, 2.55 - wave, celebrate);
        rig.rightElbow.rotation.x = lerp(-0.22, -0.4, celebrate);
      }

      // 3D Güneş Gözlüğü inişi (yalnızca %100 hedefe ulaşınca)
      const glassesTarget = targetP >= 0.999 && prog >= 0.93 ? 1 : 0;
      sunglassesDropRef.current += (glassesTarget - sunglassesDropRef.current) * 0.045;
      const glassDrop = clamp01(sunglassesDropRef.current);

      if (glassDrop > 0.01) {
        rig.sunglasses.visible = true;
        rig.sunglasses.position.y = lerp(0.42, 0.0, smoothstep(glassDrop));
        rig.sunglasses.rotation.x = lerp(-0.35, 0, glassDrop);
      } else {
        rig.sunglasses.visible = false;
      }

      // Gülümseme genişliği
      const smileScale = lerp(0.75, 1.3, prog);
      rig.mouth.scale.set(smileScale, smileScale, 1);

      // 7+ gün seri: 3D altın taç
      rig.crown.visible = streakRef.current >= 7;
      if (rig.crown.visible) {
        rig.crown.rotation.y = time * 0.5;
      }

      // 3+ gün seri: 3D alev parçacıkları
      const hasAura = streakRef.current >= 3;
      emberGroup.visible = hasAura;
      if (hasAura) {
        emberMat.color.set(streakRef.current >= 7 ? '#fbbf24' : '#fb923c');
        for (const e of embers) {
          const t = time * e.speed + e.phase;
          const hNorm = (t * 0.45) % 1;
          e.mesh.position.set(
            Math.cos(t * 1.8) * e.radius * (1 - hNorm * 0.35),
            0.2 + hNorm * 1.9,
            Math.sin(t * 1.8) * e.radius * (1 - hNorm * 0.35),
          );
          const s = Math.sin(hNorm * Math.PI);
          e.mesh.scale.setScalar(0.6 + s * 0.9);
        }
      }

      // Işık karakteri takip etsin
      followGlow.position.set(posX, posY + 1.8, 1.6);

      // Kamera hafif fare/parmak eğimini ve nefes salınımını uygulasın
      currentTilt.current.x += (targetTilt.current.x - currentTilt.current.x) * 0.06;
      currentTilt.current.y += (targetTilt.current.y - currentTilt.current.y) * 0.06;
      camPivot.rotation.y = currentTilt.current.y + Math.sin(time * 0.55) * 0.05;
      camPivot.rotation.x = currentTilt.current.x + Math.cos(time * 0.7) * 0.02;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    const updateTilt = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const nx = (clientX - rect.left) / rect.width - 0.5;
      const ny = (clientY - rect.top) / rect.height - 0.5;
      targetTilt.current.y = nx * 0.75;
      targetTilt.current.x = -ny * 0.32;
    };

    const handlePointerMove = (e: PointerEvent) => updateTilt(e.clientX, e.clientY);
    const handlePointerLeave = () => {
      targetTilt.current.x = 0;
      targetTilt.current.y = 0;
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      for (const d of rig.disposables) d.dispose();
      for (const d of stairs.disposables) d.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      emberGeo.dispose();
      emberMat.dispose();
      renderer.dispose();
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
          (zıplatmak için dokun · döndürmek için sürükle)
        </span>

        <div
          className={cn(
            'absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-b border-r',
            isComplete ? 'border-primary/60 bg-[#0b1117]' : 'border-white/10 bg-[#0e1620]',
          )}
        />
      </div>

      {/* Gerçek WebGL 3D Sahne Konteyneri */}
      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        className={cn(
          'relative flex h-[290px] w-full max-w-[340px] cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#101924]/95 via-[#090f16]/95 to-[#05080c] shadow-[0_16px_48px_rgba(0,0,0,0.65)] transition-all duration-500 sm:h-[310px]',
          bounce && 'scale-[1.02]',
          isComplete && 'ring-2 ring-primary/60 shadow-[0_0_40px_rgba(46,230,184,0.3)]',
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-1000',
            isComplete
              ? 'bg-[radial-gradient(ellipse_at_center,rgba(46,230,184,0.24),transparent_70%)] opacity-100'
              : 'bg-[radial-gradient(ellipse_at_center,rgba(74,222,128,0.09),transparent_70%)] opacity-70',
          )}
        />

        {isComplete && (
          <>
            <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-primary/50 bg-primary/25 px-2.5 py-1 text-xs font-bold text-primary shadow-[0_0_14px_var(--primary)]">
              <Trophy className="size-3.5" />
              3D BOSS
            </div>
            <Sparkles className="pointer-events-none absolute left-3 top-3 z-10 size-5 text-primary/80" />
            <Sparkles className="pointer-events-none absolute bottom-4 right-4 z-10 size-4 text-primary/80" />
          </>
        )}

        <canvas ref={canvasRef} className="size-full touch-none" />
      </div>

      {/* 5 Aşamalı İlerleme Yolu */}
      <div className="mt-4 w-full max-w-[320px] space-y-2">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-primary to-[#5eead4] shadow-[0_0_12px_var(--primary)] transition-all duration-1000 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px]">
          {STAGES.map((stage) => {
            const reached =
              displayedPercent >= stage.threshold && (totalGoals > 0 || stage.threshold === 0);
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
