import React, { useRef } from 'react';
import { motion } from 'framer-motion';

export type TabTheme = 'emerald' | 'blue' | 'indigo' | 'amber' | 'teal' | 'purple' | 'cyan' | 'rose';

export interface TabItem<T = any> {
  id: T;
  label: string;
  icon?: any;
  count?: number | string;
  badge?: string | number;
  color?: string;
  accentColor?: string; // رنگ اختصاصی اختیاری برای هر تب (مانند اصناف تدارکات)
}

// 💡 اکسپورت صریح TabItem جهت لود بدون ارور در محیط Vite و باندلرها
export const TabItem = {} as unknown as any;

export interface ThreeDTabsProps<T = any> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  theme?: TabTheme;
  layoutId?: string;
  className?: string;
  containerClassName?: string;
  showFadeMasks?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const THEME_CONFIGS: Record<TabTheme, {
  activeBorder: string;
  activeShadow: string;
  activeText: string;
  activeIcon: string;
  activeBadge: string;
  indicatorGradient: string;
}> = {
  emerald: {
    activeBorder: 'border-emerald-500/60 dark:border-emerald-400/80 ring-1 ring-emerald-400/40',
    activeShadow: 'shadow-[0_8px_25px_rgba(16,185,129,0.25)]',
    activeText: 'text-emerald-800 dark:text-emerald-300',
    activeIcon: 'text-emerald-600 dark:text-emerald-400',
    activeBadge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    indicatorGradient: 'from-white/95 to-emerald-50/80 dark:from-slate-700/90 dark:to-emerald-950/40',
  },
  blue: {
    activeBorder: 'border-cyan-500/60 dark:border-cyan-400/80 ring-1 ring-cyan-400/40',
    activeShadow: 'shadow-[0_8px_25px_rgba(6,182,212,0.25)]',
    activeText: 'text-cyan-800 dark:text-cyan-300',
    activeIcon: 'text-cyan-600 dark:text-cyan-400',
    activeBadge: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    indicatorGradient: 'from-white/95 to-cyan-50/80 dark:from-slate-700/90 dark:to-cyan-950/40',
  },
  indigo: {
    activeBorder: 'border-indigo-500/60 dark:border-indigo-400/80 ring-1 ring-indigo-400/40',
    activeShadow: 'shadow-[0_8px_25px_rgba(99,102,241,0.25)]',
    activeText: 'text-indigo-800 dark:text-indigo-300',
    activeIcon: 'text-indigo-600 dark:text-indigo-400',
    activeBadge: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    indicatorGradient: 'from-white/95 to-indigo-50/80 dark:from-slate-700/90 dark:to-indigo-950/40',
  },
  amber: {
    activeBorder: 'border-amber-500/60 dark:border-amber-400/80 ring-1 ring-amber-400/40',
    activeShadow: 'shadow-[0_8px_25px_rgba(245,158,11,0.25)]',
    activeText: 'text-amber-800 dark:text-amber-300',
    activeIcon: 'text-amber-600 dark:text-amber-400',
    activeBadge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
    indicatorGradient: 'from-white/95 to-amber-50/80 dark:from-slate-700/90 dark:to-amber-950/40',
  },
  teal: {
    activeBorder: 'border-teal-500/60 dark:border-teal-400/80 ring-1 ring-teal-400/40',
    activeShadow: 'shadow-[0_8px_25px_rgba(20,184,166,0.25)]',
    activeText: 'text-teal-800 dark:text-teal-300',
    activeIcon: 'text-teal-600 dark:text-teal-400',
    activeBadge: 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30',
    indicatorGradient: 'from-white/95 to-teal-50/80 dark:from-slate-700/90 dark:to-teal-950/40',
  },
  purple: {
    activeBorder: 'border-purple-500/60 dark:border-purple-400/80 ring-1 ring-purple-400/40',
    activeShadow: 'shadow-[0_8px_25px_rgba(168,85,247,0.25)]',
    activeText: 'text-purple-800 dark:text-purple-300',
    activeIcon: 'text-purple-600 dark:text-purple-400',
    activeBadge: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
    indicatorGradient: 'from-white/95 to-purple-50/80 dark:from-slate-700/90 dark:to-purple-950/40',
  },
  cyan: {
    activeBorder: 'border-cyan-500/60 dark:border-cyan-400/80 ring-1 ring-cyan-400/40',
    activeShadow: 'shadow-[0_8px_25px_rgba(6,182,212,0.25)]',
    activeText: 'text-cyan-800 dark:text-cyan-300',
    activeIcon: 'text-cyan-600 dark:text-cyan-400',
    activeBadge: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    indicatorGradient: 'from-white/95 to-cyan-50/80 dark:from-slate-700/90 dark:to-cyan-950/40',
  },
  rose: {
    activeBorder: 'border-rose-500/60 dark:border-rose-400/80 ring-1 ring-rose-400/40',
    activeShadow: 'shadow-[0_8px_25px_rgba(244,63,94,0.25)]',
    activeText: 'text-rose-800 dark:text-rose-300',
    activeIcon: 'text-rose-600 dark:text-rose-400',
    activeBadge: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30',
    indicatorGradient: 'from-white/95 to-rose-50/80 dark:from-slate-700/90 dark:to-rose-950/40',
  },
};

export function ThreeDTabs<T = any>({
  tabs,
  activeTab,
  onChange,
  theme = 'indigo',
  layoutId = 'threeDTabsActivePill',
  className = '',
  containerClassName = '',
  showFadeMasks = true,
  size = 'md',
}: ThreeDTabsProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const themeConfig = THEME_CONFIGS[theme] || THEME_CONFIGS.indigo;

  const sizeClasses = {
    sm: 'px-3.5 py-2 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-xs sm:text-sm gap-2',
    lg: 'px-6 py-3 text-sm gap-2.5',
  }[size];

  return (
    <div
      className={`relative w-full rounded-[1.75rem] p-1.5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-3xl border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden ${containerClassName}`}
    >
      {/* ماسک محوشدگی نرم لبه راست (Fade Mask) */}
      {showFadeMasks && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-20 bg-gradient-to-l from-white/90 dark:from-slate-900/90 to-transparent rounded-r-[1.75rem]" />
      )}

      {/* ماسک محوشدگی نرم لبه چپ (Fade Mask) */}
      {showFadeMasks && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-20 bg-gradient-to-r from-white/90 dark:from-slate-900/90 to-transparent rounded-l-[1.75rem]" />
      )}

      {/* کانتینر اسکرول افقی بدون بیرون‌زدگی اسکرول‌بار */}
      <div
        ref={scrollRef}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        className={`w-full overflow-x-auto no-scrollbar scrollbar-none flex items-center gap-2 p-1.5 scroll-smooth relative z-10 ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          // بررسی وجود رنگ اختصاصی (مثلاً برای اصناف ۷ گانه یا رنگ تب سفارشی)
          const customColor = tab.accentColor || tab.color;
          const hasCustomAccent = !!customColor;
          const customActiveShadow = hasCustomAccent
            ? `0 8px 25px ${customColor}35`
            : undefined;

          return (
            <button
              key={String(tab.id)}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative flex items-center rounded-2xl font-black transition-all duration-200 shrink-0 select-none cursor-pointer outline-none active:scale-[0.98] ${sizeClasses} ${
                isActive
                  ? `${themeConfig.activeText} z-10`
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/40 hover:scale-[1.02]'
              }`}
            >
              {/* نشانگر سه‌بعدی شناور (Active 3D Floating Pill) */}
              {isActive && (
                <motion.div
                  layoutId={layoutId}
                  transition={{
                    type: 'spring',
                    stiffness: 450,
                    damping: 32,
                    mass: 0.8,
                  }}
                  style={{
                    boxShadow: customActiveShadow,
                    borderColor: hasCustomAccent ? `${customColor}80` : undefined,
                  }}
                  className={`absolute inset-0 rounded-2xl backdrop-blur-2xl border z-0 bg-gradient-to-b shadow-[0_8px_20px_rgba(0,0,0,0.12),inset_0_2px_4px_rgba(255,255,255,0.9)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.2)] ${
                    hasCustomAccent
                      ? 'bg-white/95 dark:bg-slate-800/90'
                      : `${themeConfig.activeBorder} ${themeConfig.activeShadow} ${themeConfig.indicatorGradient}`
                  }`}
                />
              )}

              {/* آیکون تب */}
              {Icon && (
                <Icon
                  className={`w-4 h-4 relative z-10 transition-transform duration-200 shrink-0 ${
                    isActive ? 'scale-110 drop-shadow-sm' : ''
                  }`}
                  style={{
                    color: isActive && hasCustomAccent
                      ? customColor
                      : undefined,
                  }}
                />
              )}

              {/* متن برچسب تب */}
              <span className="relative z-10 pt-0.5 whitespace-nowrap">
                {tab.label}
              </span>

              {/* شمارنده / نشانگر نشان (Badge / Counter) */}
              {(tab.count !== undefined || tab.badge !== undefined) && (
                <span
                  style={{
                    backgroundColor: isActive && hasCustomAccent ? `${customColor}25` : undefined,
                    color: isActive && hasCustomAccent ? customColor : undefined,
                    borderColor: isActive && hasCustomAccent ? `${customColor}40` : undefined,
                  }}
                  className={`relative z-10 px-2 py-0.5 rounded-full text-[10px] font-mono font-black border transition-all ${
                    isActive && !hasCustomAccent
                      ? themeConfig.activeBadge
                      : !isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                        : ''
                  }`}
                >
                  {tab.count !== undefined ? tab.count : tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ThreeDTabs;
