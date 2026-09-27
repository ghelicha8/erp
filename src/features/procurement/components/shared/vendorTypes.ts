import { Factory, Store, Truck, Mountain, Zap, CarFront, Package } from 'lucide-react';
import type { VendorSection } from '../../../../store/procurementStore';

export interface SectionConfig {
  id: VendorSection;
  label: string;
  singular: string;
  description: string;
  icon: any;
  // گرادیان آواتار و دکمه ثبت
  gradient: string;
  gradientHover: string;
  glowShadow: string;
  softBg: string;
  text: string;
  border: string;
}

export const SECTION_ORDER: VendorSection[] = [
  'FACTORIES', 'MATERIALS', 'LOGISTICS', 'MINES', 'INSTALLERS', 'REPAIR_SHOPS', 'MISC'
];

export const SECTION_CONFIG: Record<VendorSection, SectionConfig> = {
  FACTORIES: {
    id: 'FACTORIES',
    label: 'کارخانه‌جات، تولیدی و شرکت‌ها',
    singular: 'شرکت / کارخانه',
    description: 'کارخانه‌ها، تولیدی‌ها، شرکت‌ها و کارگاه‌های طرف قرارداد',
    icon: Factory,
    gradient: 'from-blue-500 to-indigo-600',
    gradientHover: 'hover:from-blue-400 hover:to-indigo-500',
    glowShadow: 'shadow-[0_10px_25px_rgba(59,130,246,0.35)]',
    softBg: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-400/50',
  },
  MATERIALS: {
    id: 'MATERIALS',
    label: 'مغازه‌ها و مصالح‌فروشی‌ها',
    singular: 'مصالح‌فروش',
    description: 'مغازه‌ها، مصالح‌فروشی‌ها و فروشگاه‌های طرف حساب',
    icon: Store,
    gradient: 'from-amber-500 to-orange-600',
    gradientHover: 'hover:from-amber-400 hover:to-orange-500',
    glowShadow: 'shadow-[0_10px_25px_rgba(245,158,11,0.35)]',
    softBg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-400/50',
  },
  LOGISTICS: {
    id: 'LOGISTICS',
    label: 'لجستیک بیرونی',
    singular: 'خودروی بیرونی',
    description: 'خودروها و رانندگان بیرونی (غیرخودی) — آزاد یا وابسته به یک پروفایل',
    icon: Truck,
    gradient: 'from-violet-500 to-purple-600',
    gradientHover: 'hover:from-violet-400 hover:to-purple-500',
    glowShadow: 'shadow-[0_10px_25px_rgba(139,92,246,0.35)]',
    softBg: 'bg-violet-500/10 border-violet-500/20',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-400/50',
  },
  MINES: {
    id: 'MINES',
    label: 'معادن',
    singular: 'معدن',
    description: 'معادن شن، ماسه، سنگ و سایر معادن تامین‌کننده مصالح',
    icon: Mountain,
    gradient: 'from-stone-500 to-stone-700',
    gradientHover: 'hover:from-stone-400 hover:to-stone-600',
    glowShadow: 'shadow-[0_10px_25px_rgba(120,113,108,0.35)]',
    softBg: 'bg-stone-500/10 border-stone-500/20',
    text: 'text-stone-600 dark:text-stone-400',
    border: 'border-stone-400/50',
  },
  INSTALLERS: {
    id: 'INSTALLERS',
    label: 'تاسیساتی‌ها',
    singular: 'تاسیساتی',
    description: 'مجریان تاسیسات برقی، مکانیکی و ساختمان',
    icon: Zap,
    gradient: 'from-cyan-500 to-sky-600',
    gradientHover: 'hover:from-cyan-400 hover:to-sky-500',
    glowShadow: 'shadow-[0_10px_25px_rgba(6,182,212,0.35)]',
    softBg: 'bg-cyan-500/10 border-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-400/50',
  },
  REPAIR_SHOPS: {
    id: 'REPAIR_SHOPS',
    label: 'تعمیرگاه‌ها',
    singular: 'تعمیرگاه',
    description: 'تعمیرگاه‌های طرف قرارداد برای تعمیر خودروها و ابزارآلات',
    icon: CarFront,
    gradient: 'from-rose-500 to-pink-600',
    gradientHover: 'hover:from-rose-400 hover:to-pink-500',
    glowShadow: 'shadow-[0_10px_25px_rgba(244,63,94,0.35)]',
    softBg: 'bg-rose-500/10 border-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-400/50',
  },
  MISC: {
    id: 'MISC',
    label: 'سایر تامین‌کنندگان',
    singular: 'تامین‌کننده',
    description: 'سایر اشخاص و مجموعه‌های بیرونی طرف حساب',
    icon: Package,
    gradient: 'from-slate-500 to-slate-700',
    gradientHover: 'hover:from-slate-400 hover:to-slate-600',
    glowShadow: 'shadow-[0_10px_25px_rgba(100,116,139,0.35)]',
    softBg: 'bg-slate-500/10 border-slate-500/20',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-400/50',
  },
};

export const getSectionLabel = (section?: VendorSection) =>
  section ? SECTION_CONFIG[section].label : '—';
