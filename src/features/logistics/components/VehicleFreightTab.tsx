import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Pencil, Trash2, Truck, Wallet, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { useLogisticsStore } from '../../../store/logisticsStore';
import type { LogisticsLog } from '../../../store/logisticsStore';
import { useLaborStore } from '../../../store/laborStore';
import { useProjectStore } from '../../projects/store/projectStore';
import { sortNewestFirst } from '../../../core/utils/sortHelpers';

const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl group bg-white/10 dark:bg-slate-800/30 backdrop-blur-md overflow-hidden shadow-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all ${className}`}>
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse z-0" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-purple-500 group-focus-within:to-cyan-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center px-4">{children}</div>
  </div>
);

export default function VehicleFreightTab({ vehicleId }: { vehicleId: string }) {
  const logs = useLogisticsStore(s => s.logs);
  const deleteLog = useLogisticsStore(s => s.deleteLog);
  const workers = useLaborStore(s => s.workers);
  const projects = useProjectStore(s => s.projects);
  const [searchQuery, setSearchQuery] = useState('');

  const freightLogs = useMemo(() => {
    const q = searchQuery.trim();
    const filtered = logs.filter(l => {
      if (l.vehicleInfo !== vehicleId) return false;
      if (!q) return true;
      const driver = workers.find(w => w.id === l.provider);
      const driverName = driver ? `${driver.name} ${driver.lastName}` : '';
      const projectName = projects.find(p => p.id === l.projectId)?.name || '';
      return l.title.includes(q) || driverName.includes(q) || projectName.includes(q) || (l.date || '').includes(q);
    });
    return sortNewestFirst(filtered, 'prepend');
  }, [logs, vehicleId, searchQuery, workers, projects]);

  const stats = useMemo(() => {
    const totalBilled = freightLogs.reduce((sum, l) => sum + (l.billedCost || 0), 0);
    const totalCost = freightLogs.reduce((sum, l) => sum + (l.internalCost || 0), 0);
    return { count: freightLogs.length, totalBilled, totalCost };
  }, [freightLogs]);

  const handleEdit = (log: LogisticsLog) => {
    document.dispatchEvent(new CustomEvent('open-new-logistics-modal', { detail: { ...log } }));
  };

  const handleDelete = (id: string) => {
    deleteLog(id);
    toast.success('بارنامه حذف شد');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full flex flex-col gap-6 relative">
      {/* 🧾 هدر آمار باربری */}
      <div className="relative overflow-hidden bg-white/60 dark:bg-slate-800/50 backdrop-blur-2xl rounded-[2.5rem] p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-white/80 dark:border-slate-600/50 flex flex-col md:flex-row items-center justify-between gap-6 z-10">
        <div className="flex items-center gap-5 w-full md:w-auto">
          <div className="p-4 rounded-2xl border shadow-inner bg-amber-50 dark:bg-amber-500/10 border-amber-100 text-amber-500">
            <Truck className="w-8 h-8" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">تاریخچه باربری خودرو</h3>
            <div className="text-sm font-bold text-slate-500 mt-1">{stats.count} بارنامه ثبت شده</div>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-none flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
            <Wallet className="w-5 h-5 text-rose-500" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500">مجموع هزینه</span>
              <span className="text-sm font-black text-slate-800 dark:text-white font-mono" dir="ltr">{stats.totalCost.toLocaleString('fa-IR')}</span>
            </div>
          </div>
          <div className="flex-1 md:flex-none flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
            <Receipt className="w-5 h-5 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500">مجموع کرایه</span>
              <span className="text-sm font-black text-slate-800 dark:text-white font-mono" dir="ltr">{stats.totalBilled.toLocaleString('fa-IR')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🔍 نوار جستجو */}
      <div className="flex flex-wrap items-center gap-3 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm rounded-[2rem] px-4 py-4 z-50">
        <NeonSearchWrapper className="flex-1 w-full min-w-0 h-[46px]">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input placeholder="جستجو در عنوان، راننده، پروژه..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full min-w-0 h-full bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-white pl-2 pr-4 transition-colors placeholder:text-slate-500" />
          {searchQuery && <button onClick={() => setSearchQuery('')}><X className="w-4 h-4 text-slate-400" /></button>}
        </NeonSearchWrapper>
      </div>

      {/* 📋 جدول بارنامه‌ها */}
      <div className="w-full overflow-x-auto rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 shadow-2xl modal-scrollbar relative min-h-[200px]">
        {freightLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="w-20 h-20 bg-white/50 dark:bg-slate-800/50 rounded-[1.5rem] border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center mb-4">
              <Truck className="w-8 h-8 text-slate-300 dark:text-slate-500" />
            </div>
            <p className="text-sm font-black text-slate-500 dark:text-slate-400">بارنامه‌ای برای این خودرو ثبت نشده است.</p>
            <p className="text-xs font-bold mt-1">از دکمه «ثبت بارنامه» بالای صفحه استفاده کنید.</p>
          </div>
        ) : (
          <table className="w-full text-right border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">شرح بار / تاریخ / پروژه</th>
                <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">راننده</th>
                <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">هزینه (تومان)</th>
                <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">کرایه (تومان)</th>
                <th className="p-5 font-bold text-sm text-slate-800 dark:text-white text-center">عملیات</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {freightLogs.map((log) => {
                  const driver = workers.find(w => w.id === log.provider);
                  const driverName = driver ? `${driver.name} ${driver.lastName}`.trim() : (log.provider || 'ناشناس');
                  const projectName = projects.find(p => p.id === log.projectId)?.name || 'آزاد';
                  return (
                    <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-5">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-bold text-slate-800 dark:text-white">{log.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500">{log.date}</span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">{projectName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300">{driverName}</td>
                      <td className="p-5 font-black text-sm text-slate-800 dark:text-slate-200 font-mono" dir="ltr">{(log.internalCost || 0).toLocaleString('fa-IR')}</td>
                      <td className="p-5 font-black text-sm text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">{(log.billedCost || 0).toLocaleString('fa-IR')}</td>
                      <td className="p-5">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEdit(log)} title="ویرایش" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(log.id)} title="حذف" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}
