'use client';

import { useState } from 'react';
import { Sparkles, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  percent: number;
  totalGoals: number;
  completedGoals: number;
};

export function StickmanFigure({ percent, totalGoals, completedGoals }: Props) {
  const [bounce, setBounce] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  const isComplete = totalGoals > 0 && percent === 100;
  const isStarted = completedGoals > 0;
  const isHalfway = percent >= 50;

  const quotes = isComplete
    ? [
        'GÖZLÜĞÜ TAKTIM KANKA! Sen bir efsanesin! 😎',
        'Hedefler bitti, boss mode devrede! 🔥',
        'Bugün tarih yazdın, tebrikler şampiyon! 🏆',
      ]
    : isHalfway
      ? [
          'Yarısı bitti bile! Gözlüğü kutusundan çıkarıyorum... 👀',
          'Harika tempo! Biraz daha basarsak gözlük geliyor!',
          'Ateş ediyorsun! Son hedefleri de temizle!',
        ]
      : isStarted
        ? [
            'İlk adım atıldı! Hadi devamını getir de gözlüğü takalım!',
            'Isınma turları bitti, şimdi vites yükseltme zamanı! 💪',
            'Sana inanıyorum kanka, hedefleri tek tek avla!',
          ]
        : [
            'Hadi kanka bir hedef bitir de gözlüğümü takabileyim! 😴',
            'Beklemedeyim... İlk hedefi bitir de canlanayım!',
            'Bugün senin günün olacak, ilk tiki at bakalım! 🎯',
          ];

  const triggerBounce = () => {
    setBounce(true);
    setQuoteIdx((prev) => (prev + 1) % quotes.length);
    setTimeout(() => setBounce(false), 600);
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Konuşma Balonu */}
      <div
        onClick={triggerBounce}
        className={cn(
          'relative mb-3 max-w-[280px] cursor-pointer rounded-2xl border px-3.5 py-2 text-center text-xs font-semibold shadow-lg backdrop-blur transition-all',
          isComplete
            ? 'border-primary/50 bg-primary/15 text-primary shadow-[0_0_20px_rgba(46,230,184,0.3)] animate-pulse'
            : 'border-white/10 bg-[#0e1620]/90 text-foreground hover:border-white/20',
        )}
      >
        <p className="leading-snug">{quotes[quoteIdx % quotes.length]}</p>
        <span className="text-[10px] text-muted-foreground block mt-0.5 opacity-70">
          (konuşturmak için tıkla)
        </span>

        {/* Konuşma Balonunun Alt Oku */}
        <div
          className={cn(
            'absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-3 rotate-45 border-r border-b',
            isComplete
              ? 'border-primary/50 bg-[#0b1117]'
              : 'border-white/10 bg-[#0e1620]',
          )}
        />
      </div>

      {/* Stickman Çizim Sahnesi */}
      <div
        onClick={triggerBounce}
        className={cn(
          'relative flex size-52 cursor-pointer items-center justify-center rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#101820]/80 to-[#070c10]/95 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-transform duration-300',
          bounce && 'scale-110 -rotate-2',
          isComplete && 'ring-2 ring-primary/60 shadow-[0_0_35px_rgba(46,230,184,0.25)]',
        )}
      >
        {/* Arkada parlama */}
        <div
          className={cn(
            'pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-500',
            isComplete
              ? 'bg-[radial-gradient(ellipse_at_center,rgba(46,230,184,0.25),transparent_70%)] opacity-100'
              : 'bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_70%)] opacity-50',
          )}
        />

        {/* 100% Tamamlandığında Çevreleyen Işıltılar ve Rozet */}
        {isComplete && (
          <>
            <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary shadow-[0_0_10px_var(--primary)] animate-bounce">
              <Trophy className="size-3" />
              BOSS
            </div>
            <Sparkles className="absolute top-3 left-3 size-5 text-primary/80 animate-spin" />
            <Sparkles className="absolute bottom-3 right-3 size-4 text-primary/80" />
          </>
        )}

        {/* STICKMAN SVG */}
        <svg
          viewBox="0 0 160 200"
          className="size-full overflow-visible drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
        >
          <g
            className={cn(
              'transition-transform duration-500',
              isComplete ? 'translate-y-1' : '',
            )}
          >
            {/* KAFA */}
            <circle
              cx="80"
              cy="52"
              r="24"
              fill="none"
              stroke={isComplete ? '#2ee6b8' : '#ffffff'}
              strokeWidth="4"
              className={isComplete ? 'drop-shadow-[0_0_8px_#2ee6b8]' : ''}
            />

            {/* GÖVDE */}
            <line
              x1="80"
              y1="76"
              x2="80"
              y2="132"
              stroke={isComplete ? '#2ee6b8' : '#ffffff'}
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* KOLLAR */}
            {isComplete ? (
              // Zafer pozu: Kollar yukarıda kutluyor! \o/
              <>
                <path
                  d="M 80 92 L 52 74 L 40 54"
                  fill="none"
                  stroke="#2ee6b8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 80 92 L 108 74 L 120 54"
                  fill="none"
                  stroke="#2ee6b8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ) : isHalfway ? (
              // Güç pozu: Kollar dirseklerden bükülü kas gösterisi
              <>
                <path
                  d="M 80 95 L 56 95 L 48 76"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 80 95 L 104 95 L 112 76"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ) : isStarted ? (
              // Çalışan poz: Kollar hafif yanda
              <>
                <line
                  x1="80"
                  y1="95"
                  x2="52"
                  y2="114"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <line
                  x1="80"
                  y1="95"
                  x2="108"
                  y2="114"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </>
            ) : (
              // Uykulu / Düşük omuzlu poz
              <>
                <path
                  d="M 80 95 Q 60 115 54 125"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M 80 95 Q 100 115 106 125"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </>
            )}

            {/* BACAKLAR */}
            {isComplete ? (
              // Geniş sağlam duruş
              <>
                <line
                  x1="80"
                  y1="132"
                  x2="54"
                  y2="180"
                  stroke="#2ee6b8"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <line
                  x1="80"
                  y1="132"
                  x2="106"
                  y2="180"
                  stroke="#2ee6b8"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </>
            ) : (
              // Normal duruş
              <>
                <line
                  x1="80"
                  y1="132"
                  x2="60"
                  y2="180"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <line
                  x1="80"
                  y1="132"
                  x2="100"
                  y2="180"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </>
            )}

            {/* YÜZ: GÖZLER & AĞIZ */}
            {isComplete ? (
              // GÖZLÜKLÜ COOL STICKMAN (İşte kullanıcının istediği meşhur gözlük!)
              <g className="animate-in fade-in zoom-in-75 duration-500">
                {/* Güneş Gözlüğü Çerçevesi ve Camları */}
                {/* Sol Cam */}
                <path
                  d="M 62 48 L 76 48 L 74 58 L 64 58 Z"
                  fill="#000000"
                  stroke="#2ee6b8"
                  strokeWidth="2"
                />
                {/* Sağ Cam */}
                <path
                  d="M 84 48 L 98 48 L 96 58 L 86 58 Z"
                  fill="#000000"
                  stroke="#2ee6b8"
                  strokeWidth="2"
                />
                {/* Gözlük Köprüsü */}
                <line
                  x1="76"
                  y1="50"
                  x2="84"
                  y2="50"
                  stroke="#2ee6b8"
                  strokeWidth="2.5"
                />
                {/* Gözlük Sapları */}
                <line
                  x1="62"
                  y1="50"
                  x2="56"
                  y2="49"
                  stroke="#2ee6b8"
                  strokeWidth="2"
                />
                <line
                  x1="98"
                  y1="50"
                  x2="104"
                  y2="49"
                  stroke="#2ee6b8"
                  strokeWidth="2"
                />
                {/* Camlardaki beyaz parlama / Cool reflection */}
                <line
                  x1="65"
                  y1="50"
                  x2="68"
                  y2="56"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="87"
                  y1="50"
                  x2="90"
                  y2="56"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />

                {/* Havalı Gülümseme */}
                <path
                  d="M 72 63 Q 80 69 88 63"
                  fill="none"
                  stroke="#2ee6b8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </g>
            ) : isHalfway ? (
              // Enerjik Gülen Yüz
              <g>
                <circle cx="72" cy="48" r="2.5" fill="#ffffff" />
                <circle cx="88" cy="48" r="2.5" fill="#ffffff" />
                <path
                  d="M 72 60 Q 80 67 88 60"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            ) : isStarted ? (
              // Odaklanmış Yüz
              <g>
                <circle cx="72" cy="50" r="2" fill="#ffffff" />
                <circle cx="88" cy="50" r="2" fill="#ffffff" />
                <line
                  x1="74"
                  y1="61"
                  x2="86"
                  y2="61"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            ) : (
              // Uykulu / Düz Çizgi Yüz (Zzz)
              <g>
                {/* Kısık gözler (- -) */}
                <line
                  x1="70"
                  y1="49"
                  x2="75"
                  y2="49"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="85"
                  y1="49"
                  x2="90"
                  y2="49"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Ufak O ağız */}
                <circle cx="80" cy="61" r="2.5" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                {/* Zzz */}
                <text
                  x="96"
                  y="40"
                  fill="#71717a"
                  fontSize="10"
                  fontFamily="monospace"
                  className="animate-pulse"
                >
                  zZ
                </text>
              </g>
            )}
          </g>
        </svg>
      </div>

      {/* Alt Durum Rozeti */}
      <div className="mt-3 flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-semibold transition-all',
            isComplete
              ? 'bg-primary/20 text-primary shadow-[0_0_12px_rgba(46,230,184,0.3)]'
              : 'bg-white/[0.06] text-muted-foreground',
          )}
        >
          {isComplete ? '🕶️ Gözlük Takıldı (Boss Mod)' : `🎯 Seviye: %${percent} Tamamlandı`}
        </span>
      </div>
    </div>
  );
}
