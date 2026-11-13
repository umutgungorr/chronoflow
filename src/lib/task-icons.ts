import {
  Atom,
  BarChart3,
  BookOpen,
  Brain,
  Briefcase,
  Calculator,
  Clock,
  Code2,
  Coffee,
  Compass,
  Dna,
  Dumbbell,
  FileCheck2,
  Flame,
  Footprints,
  Gamepad2,
  Globe,
  GraduationCap,
  Headphones,
  Landmark,
  Languages,
  Laptop,
  Lightbulb,
  Microscope,
  Moon,
  Mountain,
  PenTool,
  Rocket,
  Sigma,
  Sparkles,
  Target,
  Users,
  Utensils,
  FlaskConical,
  type LucideIcon,
} from 'lucide-react';

import type { TaskCategory } from '@/types';

export type TaskIconGroup = 'academic' | 'work' | 'life';

export type TaskIconId =
  | 'book-open'
  | 'sigma'
  | 'calculator'
  | 'compass'
  | 'globe'
  | 'mountain'
  | 'atom'
  | 'flask'
  | 'dna'
  | 'microscope'
  | 'landmark'
  | 'brain'
  | 'languages'
  | 'file-check'
  | 'graduation-cap'
  | 'pen-tool'
  | 'code'
  | 'laptop'
  | 'target'
  | 'lightbulb'
  | 'bar-chart'
  | 'briefcase'
  | 'flame'
  | 'rocket'
  | 'coffee'
  | 'utensils'
  | 'dumbbell'
  | 'footprints'
  | 'moon'
  | 'headphones'
  | 'gamepad'
  | 'users'
  | 'sparkles'
  | 'clock';

export type TaskIconMeta = {
  id: TaskIconId;
  label: string;
  group: TaskIconGroup;
  icon: LucideIcon;
  badgeClass: string;
};

export const TASK_ICON_GROUPS: { id: TaskIconGroup; label: string }[] = [
  { id: 'academic', label: 'Ders & Akademik' },
  { id: 'work', label: 'Çalışma & Genel' },
  { id: 'life', label: 'Yaşam & Mola' },
];

export const TASK_ICON_CATALOG: TaskIconMeta[] = [
  // Ders & Akademik
  {
    id: 'book-open',
    label: 'Kitap / Paragraf',
    group: 'academic',
    icon: BookOpen,
    badgeClass: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25',
  },
  {
    id: 'sigma',
    label: 'Matematik / Cebir',
    group: 'academic',
    icon: Sigma,
    badgeClass: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/25',
  },
  {
    id: 'calculator',
    label: 'Hesap / Sayısal',
    group: 'academic',
    icon: Calculator,
    badgeClass: 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/25',
  },
  {
    id: 'compass',
    label: 'Geometri / Analitik',
    group: 'academic',
    icon: Compass,
    badgeClass: 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/25',
  },
  {
    id: 'globe',
    label: 'Coğrafya / Dünya',
    group: 'academic',
    icon: Globe,
    badgeClass: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25',
  },
  {
    id: 'mountain',
    label: 'Dağ / Doğa / Arazi',
    group: 'academic',
    icon: Mountain,
    badgeClass: 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/25',
  },
  {
    id: 'atom',
    label: 'Fizik / Atom',
    group: 'academic',
    icon: Atom,
    badgeClass: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/25',
  },
  {
    id: 'flask',
    label: 'Kimya / Laboratuvar',
    group: 'academic',
    icon: FlaskConical,
    badgeClass: 'bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/25',
  },
  {
    id: 'dna',
    label: 'Biyoloji / DNA',
    group: 'academic',
    icon: Dna,
    badgeClass: 'bg-lime-500/15 text-lime-300 ring-1 ring-lime-500/25',
  },
  {
    id: 'microscope',
    label: 'Araştırma / Deney',
    group: 'academic',
    icon: Microscope,
    badgeClass: 'bg-green-500/15 text-green-300 ring-1 ring-green-500/25',
  },
  {
    id: 'landmark',
    label: 'Tarih / Medeniyet',
    group: 'academic',
    icon: Landmark,
    badgeClass: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/25',
  },
  {
    id: 'brain',
    label: 'Felsefe / Ezber',
    group: 'academic',
    icon: Brain,
    badgeClass: 'bg-pink-500/15 text-pink-300 ring-1 ring-pink-500/25',
  },
  {
    id: 'languages',
    label: 'Yabancı Dil / Kelime',
    group: 'academic',
    icon: Languages,
    badgeClass: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/25',
  },
  {
    id: 'file-check',
    label: 'Deneme / Sınav / Test',
    group: 'academic',
    icon: FileCheck2,
    badgeClass: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/25',
  },
  {
    id: 'graduation-cap',
    label: 'Ders / Akademik',
    group: 'academic',
    icon: GraduationCap,
    badgeClass: 'bg-primary/15 text-primary ring-1 ring-primary/25',
  },
  {
    id: 'pen-tool',
    label: 'Not / Özet / Yazı',
    group: 'academic',
    icon: PenTool,
    badgeClass: 'bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/25',
  },

  // Çalışma & Genel
  {
    id: 'code',
    label: 'Kodlama / Yazılım',
    group: 'work',
    icon: Code2,
    badgeClass: 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/25',
  },
  {
    id: 'laptop',
    label: 'Bilgisayar / Çalışma',
    group: 'work',
    icon: Laptop,
    badgeClass: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/25',
  },
  {
    id: 'target',
    label: 'Hedef / Odak',
    group: 'work',
    icon: Target,
    badgeClass: 'bg-primary/15 text-primary ring-1 ring-primary/25',
  },
  {
    id: 'lightbulb',
    label: 'Fikir / Planlama',
    group: 'work',
    icon: Lightbulb,
    badgeClass: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25',
  },
  {
    id: 'bar-chart',
    label: 'Analiz / Veri',
    group: 'work',
    icon: BarChart3,
    badgeClass: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25',
  },
  {
    id: 'briefcase',
    label: 'İş / Toplantı',
    group: 'work',
    icon: Briefcase,
    badgeClass: 'bg-slate-400/15 text-slate-300 ring-1 ring-slate-400/25',
  },
  {
    id: 'flame',
    label: 'Derin Odak / Acil',
    group: 'work',
    icon: Flame,
    badgeClass: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/25',
  },
  {
    id: 'rocket',
    label: 'Proje / Başlangıç',
    group: 'work',
    icon: Rocket,
    badgeClass: 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/25',
  },

  // Yaşam & Mola
  {
    id: 'coffee',
    label: 'Mola / Kahve',
    group: 'life',
    icon: Coffee,
    badgeClass: 'bg-stone-500/15 text-stone-300 ring-1 ring-stone-500/25',
  },
  {
    id: 'utensils',
    label: 'Yemek / Beslenme',
    group: 'life',
    icon: Utensils,
    badgeClass: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/25',
  },
  {
    id: 'dumbbell',
    label: 'Spor / Antrenman',
    group: 'life',
    icon: Dumbbell,
    badgeClass: 'bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/25',
  },
  {
    id: 'footprints',
    label: 'Yürüyüş / Koşu',
    group: 'life',
    icon: Footprints,
    badgeClass: 'bg-lime-500/15 text-lime-300 ring-1 ring-lime-500/25',
  },
  {
    id: 'moon',
    label: 'Uyku / Gece',
    group: 'life',
    icon: Moon,
    badgeClass: 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/25',
  },
  {
    id: 'headphones',
    label: 'Müzik / Podcast',
    group: 'life',
    icon: Headphones,
    badgeClass: 'bg-pink-500/15 text-pink-300 ring-1 ring-pink-500/25',
  },
  {
    id: 'gamepad',
    label: 'Oyun / Dizi / Film',
    group: 'life',
    icon: Gamepad2,
    badgeClass: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/25',
  },
  {
    id: 'users',
    label: 'Sosyal / Arkadaşlar',
    group: 'life',
    icon: Users,
    badgeClass: 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/25',
  },
  {
    id: 'sparkles',
    label: 'Rutin / Düzen',
    group: 'life',
    icon: Sparkles,
    badgeClass: 'bg-green-500/15 text-green-300 ring-1 ring-green-500/25',
  },
  {
    id: 'clock',
    label: 'Esnek Tampon',
    group: 'life',
    icon: Clock,
    badgeClass: 'bg-white/[0.06] text-muted-foreground ring-1 ring-white/10',
  },
];

const ICON_MAP = new Map<TaskIconId, TaskIconMeta>(
  TASK_ICON_CATALOG.map((item) => [item.id, item]),
);

const KEYWORD_RULES: { icon: TaskIconId; keywords: string[] }[] = [
  { icon: 'globe', keywords: ['coğrafya', 'cografya', 'harita', 'iklim', 'yer şekil', 'nüfus'] },
  { icon: 'mountain', keywords: ['dağ', 'dag', 'doğa', 'doga', 'arazi', 'plato', 'vadi'] },
  {
    icon: 'book-open',
    keywords: ['paragraf', 'türkçe', 'turkce', 'edebiyat', 'kitap', 'okuma', 'roman', 'şiir', 'dil bilgisi'],
  },
  {
    icon: 'sigma',
    keywords: [
      'matematik',
      'mat ',
      'problem',
      'eşitsizlik',
      'esitsizlik',
      'türev',
      'turev',
      'integral',
      'limit',
      'fonksiyon',
      'polinom',
      'trigonometri',
      'logaritma',
      'olasılık',
      'cebir',
      'sayılar',
      'üslü',
      'köklü',
      'çarpan',
    ],
  },
  { icon: 'calculator', keywords: ['hesap', 'sayısal', 'sayisal', 'muhasebe', 'bütçe'] },
  { icon: 'compass', keywords: ['geometri', 'üçgen', 'ucgen', 'çember', 'cember', 'analitik', 'katı cisim'] },
  {
    icon: 'atom',
    keywords: ['fizik', 'optik', 'elektrik', 'kuvvet', 'manyetizma', 'dalga', 'mekanik', 'hareket', 'enerji'],
  },
  {
    icon: 'flask',
    keywords: ['kimya', 'organik', 'mol ', 'molü', 'tepkime', 'asit', 'baz', 'gazlar', 'çözelti'],
  },
  {
    icon: 'dna',
    keywords: ['biyoloji', 'biyo', 'hücre', 'hucre', 'genetik', 'dna', 'ekoloji', 'sistemler', 'enzim', 'kalıtım'],
  },
  { icon: 'microscope', keywords: ['araştırma', 'arastirma', 'deney', 'lab', 'makale'] },
  { icon: 'landmark', keywords: ['tarih', 'inkılap', 'inkilap', 'osmanlı', 'osmanli', 'çağdaş', 'medeniyet'] },
  { icon: 'brain', keywords: ['felsefe', 'psikoloji', 'sosyoloji', 'mantık', 'din ', 'ezber', 'hafıza'] },
  { icon: 'languages', keywords: ['ingilizce', 'almanca', 'fransızca', 'dil', 'kelime', 'vocab', 'yds', 'ielts', 'reading'] },
  { icon: 'file-check', keywords: ['deneme', 'sınav', 'sinav', 'test', 'soru', 'tyt', 'ayt', 'yks', 'kpss'] },
  { icon: 'pen-tool', keywords: ['not ', 'özet', 'ozet', 'tekrar', 'yazı', 'yazi', 'taslak'] },
  { icon: 'graduation-cap', keywords: ['ders', 'kurs', 'etüt', 'etut', 'ödev', 'odev', 'konu', 'video'] },
  { icon: 'code', keywords: ['kod', 'yazılım', 'yazilim', 'react', 'python', 'typescript', 'algoritma', 'api', 'dev'] },
  { icon: 'bar-chart', keywords: ['analiz', 'grafik', 'veri', 'rapor', 'istatistik'] },
  { icon: 'rocket', keywords: ['proje', 'lansman', 'yayın', 'deploy'] },
  { icon: 'lightbulb', keywords: ['plan', 'öncelik', 'oncelik', 'fikir', 'tasarım', 'tasarim'] },
  { icon: 'briefcase', keywords: ['toplantı', 'toplanti', 'sunum', 'ofis', 'mail', 'iş '] },
  { icon: 'coffee', keywords: ['mola', 'kahve', 'çay', 'cay', 'dinlen'] },
  { icon: 'utensils', keywords: ['yemek', 'kahvaltı', 'kahvalti', 'öğle', 'ogle', 'akşam yemeği', 'atıştırma'] },
  { icon: 'dumbbell', keywords: ['spor', 'antrenman', 'fitness', 'gym', 'yoga', 'pilates', 'egzersiz'] },
  { icon: 'footprints', keywords: ['yürüyüş', 'yuruyus', 'koşu', 'kosu', 'kardiyo', 'bisiklet'] },
  { icon: 'moon', keywords: ['uyku', 'gece', 'yatış', 'şekerleme'] },
  { icon: 'headphones', keywords: ['müzik', 'muzik', 'podcast', 'gitar', 'piyano', 'dinle'] },
  { icon: 'gamepad', keywords: ['oyun', 'film', 'dizi', 'sinema'] },
  { icon: 'users', keywords: ['arkadaş', 'arkadas', 'sosyal', 'buluşma', 'bulusma', 'aile'] },
  { icon: 'sparkles', keywords: ['rutin', 'temizlik', 'bakım', 'bakim', 'hazırlık', 'duş'] },
];

const CATEGORY_DEFAULT_ICON: Record<TaskCategory, TaskIconId> = {
  WORK: 'laptop',
  ROUTINE: 'sparkles',
  HEALTH: 'dumbbell',
  URGENT: 'flame',
  SOCIAL: 'users',
  BUFFER: 'clock',
};

export function isTaskIconId(value: string | undefined | null): value is TaskIconId {
  return typeof value === 'string' && ICON_MAP.has(value as TaskIconId);
}

/**
 * Görev başlığı, kategori ve (varsa) kullanıcının elle seçtiği ikona göre
 * görüntülenecek Notion imgesinin kimliğini belirler.
 */
export function resolveTaskIconId(
  title: string,
  category: TaskCategory,
  customIcon?: string | null,
): TaskIconId {
  if (isTaskIconId(customIcon)) {
    return customIcon;
  }

  const normalized = ` ${title.toLocaleLowerCase('tr-TR')} `;
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) {
      return rule.icon;
    }
  }

  return CATEGORY_DEFAULT_ICON[category] ?? 'laptop';
}

export function getTaskIconMeta(
  title: string,
  category: TaskCategory,
  customIcon?: string | null,
): TaskIconMeta {
  const id = resolveTaskIconId(title, category, customIcon);
  return ICON_MAP.get(id) ?? TASK_ICON_CATALOG[0]!;
}
