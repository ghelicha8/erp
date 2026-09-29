import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, Layers } from 'lucide-react';

// ---------------------------------------------------------------
// تعداد نمایش مشترک همه تب‌ها: ۱۰ تا ۱۰۰ + همه
// ---------------------------------------------------------------
export const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '۱۰ ردیف' },
  { value: '20', label: '۲۰ ردیف' },
  { value: '30', label: '۳۰ ردیف' },
  { value: '40', label: '۴۰ ردیف' },
  { value: '50', label: '۵۰ ردیف' },
  { value: '100', label: '۱۰۰ ردیف' },
  { value: 'ALL', label: 'همه' },
];

export function paginate<T>(items: T[], page: number, pageSize: string): T[] {
  if (pageSize === 'ALL') return items;
  const n = Math.max(1, Number(pageSize) || 10);
  return items.slice((page - 1) * n, page * n);
}

export function pageCountOf(total: number, pageSize: string): number {
  if (pageSize === 'ALL') return 1;
  return Math.max(1, Math.ceil(total / Math.max(1, Number(pageSize) || 10)));
}

const faNum = (n: number) => n.toLocaleString('fa-IR');

interface NeonPaginationProps {
  id: string;
  page: number;
  pageCount: number;
  totalItems: number;
  pageSize: string;
  onChange: (p: number) => void;
}

export default function NeonPagination({ id, page, pageCount, totalItems, pageSize, onChange }: NeonPaginationProps) {
  const window_: (number | '…')[] = useMemo(() => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
    const set = new Set<number>([1, 2, page - 1, page, page + 1, pageCount - 1, pageCount]);
    const nums = [...set].filter(n => n >= 1 && n <= pageCount).sort((a, b) => a - b);
    const out: (number | '…')[] = [];
    nums.forEach((n, i) => {
      if (i > 0 && n - (nums[i - 1] as number) > 1) out.push('…');
      out.push(n);
    });
    return out;
  }, [page, pageCount]);

  if (pageCount <= 1) return null;

  const n = pageSize === 'ALL' ? Math.max(1, totalItems) : Math.max(1, Number(pageSize) || 10);
  const from = totalItems === 0 ? 0 : (page - 1) * n + 1;
  const to = Math.min(page * n, totalItems);

  const navBtn = (enabled: boolean) =>
    `p-2.5 rounded-xl border transition-all ${enabled
      ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white border-indigo-400/60 shadow-[0_3px_0_rgba(67,56,202,0.7),0_8px_20px_rgba(99,102,241,0.4)] hover:shadow-[0_3px_0_rgba(67,56,202,0.7),0_8px_28px_rgba(139,92,246,0.6)] cursor-pointer'
      : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-inner'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2"
    >
      <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] font-black text-slate-500 dark:text-slate-400 shadow-sm">
        <motion.span animate={{ rotate: [0, -12, 12, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
        </motion.span>
        نمایش
        <span className="text-indigo-600 dark:text-indigo-400" dir="ltr">{faNum(from)} تا {faNum(to)}</span>
        از
        <span dir="ltr">{faNum(totalItems)}</span>
        رکورد
      </div>

      <div dir="rtl" className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
        <motion.button
          whileHover={page > 1 ? { scale: 1.12, y: -2 } : {}}
          whileTap={page > 1 ? { scale: 0.88 } : {}}
          disabled={page <= 1}
          onClick={() => onChange(1)}
          title="صفحه اول"
          className={navBtn(page > 1)}
        >
          <ChevronsRight className="w-4 h-4" />
        </motion.button>

        <motion.button
          whileHover={page > 1 ? { scale: 1.12, y: -2 } : {}}
          whileTap={page > 1 ? { scale: 0.88 } : {}}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          title="صفحه قبلی"
          className={navBtn(page > 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </motion.button>

        <div className="w-px h-7 bg-slate-200 dark:bg-slate-700 mx-1" />

        {window_.map((item, idx) =>
          item === '…' ? (
            <span key={`gap-${idx}`} className="px-1 text-slate-400 font-black select-none">…</span>
          ) : (
            <motion.button
              key={item}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={item !== page ? { scale: 1.12, y: -2 } : {}}
              whileTap={item !== page ? { scale: 0.88 } : {}}
              onClick={() => item !== page && onChange(item)}
              title={`صفحه ${faNum(item)}`}
              className={`relative min-w-[40px] h-[40px] px-2 rounded-xl text-sm font-black transition-colors ${item === page
                ? 'text-white cursor-default'
                : 'text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-300 shadow-sm cursor-pointer'}`}
            >
              {item === page && (
                <motion.span
                  layoutId={`neon-page-pill-${id}`}
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-fuchsia-500 via-indigo-500 to-cyan-500 shadow-[0_3px_0_rgba(76,29,149,0.6),0_0_20px_rgba(139,92,246,0.65)]"
                />
              )}
              <span className="relative z-10" dir="ltr">{faNum(item)}</span>
            </motion.button>
          )
        )}

        <div className="w-px h-7 bg-slate-200 dark:bg-slate-700 mx-1" />

        <motion.button
          whileHover={page < pageCount ? { scale: 1.12, y: -2 } : {}}
          whileTap={page < pageCount ? { scale: 0.88 } : {}}
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          title="صفحه بعدی"
          className={navBtn(page < pageCount)}
        >
          <ChevronLeft className="w-4 h-4" />
        </motion.button>

        <motion.button
          whileHover={page < pageCount ? { scale: 1.12, y: -2 } : {}}
          whileTap={page < pageCount ? { scale: 0.88 } : {}}
          disabled={page >= pageCount}
          onClick={() => onChange(pageCount)}
          title="صفحه آخر"
          className={navBtn(page < pageCount)}
        >
          <ChevronsLeft className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}
