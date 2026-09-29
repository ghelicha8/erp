import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ChevronLeft, Users, Wallet, Scale } from 'lucide-react';

import { useProcurementStore, type VendorSection } from '../../store/procurementStore';
import { useFinanceStore } from '../../store/financeStore';
import { usePurchaseStore } from '../../store/purchaseStore';
import { SECTION_CONFIG, SECTION_ORDER } from './components/shared/vendorTypes';

import FactoryDashboard from './components/factories/FactoryDashboard';
import MaterialDashboard from './components/materials/MaterialDashboard';
import LogisticsVendorDashboard from './components/logistics/LogisticsVendorDashboard';
import MineDashboard from './components/mines/MineDashboard';
import InstallerDashboard from './components/installers/InstallerDashboard';
import RepairShopDashboard from './components/repairshops/RepairShopDashboard';
import MiscVendorDashboard from './components/misc/MiscVendorDashboard';

export default function ProcurementCenter() {
  const [activeSection, setActiveSection] = useState<VendorSection | null>(null);
  const vendors = useProcurementStore(s => s.vendors);
  const allTransactions = useFinanceStore(s => s.transactions);
  const allPurchases = usePurchaseStore(s => s.purchases);

  const totals = useMemo(() => {
    const vendorIds = new Set(vendors.map(v => v.id));
    const vendorNames = new Set(vendors.map(v => v.name));
    const totalPaid = allTransactions.filter(t => vendorIds.has(t.referenceId) && t.direction === 'OUT').reduce((s, t) => s + (t.amount || 0), 0);
    const totalBilled = allPurchases.filter((p: any) => vendorNames.has(p.vendor)).reduce((s: number, p: any) => s + (p.billedCost || p.internalCost || 0), 0);
    return { totalPaid, totalBilled, debt: Math.max(0, totalBilled - totalPaid), count: vendors.length };
  }, [vendors, allTransactions, allPurchases]);

  const countBySection = useMemo(() => {
    const map: Record<string, number> = {};
    vendors.forEach(v => { map[v.section] = (map[v.section] || 0) + 1; });
    return map;
  }, [vendors]);

  if (activeSection === 'FACTORIES') return <FactoryDashboard onBack={() => setActiveSection(null)} />;
  if (activeSection === 'MATERIALS') return <MaterialDashboard onBack={() => setActiveSection(null)} />;
  if (activeSection === 'LOGISTICS') return <LogisticsVendorDashboard onBack={() => setActiveSection(null)} />;
  if (activeSection === 'MINES') return <MineDashboard onBack={() => setActiveSection(null)} />;
  if (activeSection === 'INSTALLERS') return <InstallerDashboard onBack={() => setActiveSection(null)} />;
  if (activeSection === 'REPAIR_SHOPS') return <RepairShopDashboard onBack={() => setActiveSection(null)} />;
  if (activeSection === 'MISC') return <MiscVendorDashboard onBack={() => setActiveSection(null)} />;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="w-full flex flex-col gap-6 pb-24">
      <div className="sticky top-4 z-[100] flex flex-col lg:flex-row items-center justify-between gap-5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/80 dark:border-slate-700/80 shadow-[0_15px_40px_rgba(0,0,0,0.08)] rounded-[2rem] px-6 py-5">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="p-3.5 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shrink-0">
            <ShoppingBag className="w-7 h-7" />
          </motion.div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">خرید و تدارکات</h2>
            <p className="text-[11px] font-bold text-slate-500 mt-1">مدیریت طرف‌های بیرونی: کارخانه‌ها، مصالح‌فروشی‌ها، لجستیک، معادن، تاسیساتی‌ها و تعمیرگاه‌ها</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <Users className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">پروفایل‌ها:</span>
            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{totals.count}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <Wallet className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">پرداختی:</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400" dir="ltr">{totals.totalPaid.toLocaleString('fa-IR')}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <Scale className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">مانده بدهی:</span>
            <span className="text-sm font-black text-amber-600 dark:text-amber-400" dir="ltr">{totals.debt.toLocaleString('fa-IR')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {SECTION_ORDER.map((sectionId, idx) => {
            const cfg = SECTION_CONFIG[sectionId];
            const Icon = cfg.icon;
            const count = countBySection[sectionId] || 0;
            return (
              <motion.button
                key={sectionId}
                layout="position"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05, type: 'spring', stiffness: 260, damping: 24 }}
                whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}
                onClick={() => setActiveSection(sectionId)}
                className="relative text-right backdrop-blur-2xl bg-white/50 dark:bg-slate-900/50 border border-white/60 dark:border-slate-700/50 hover:border-teal-300/60 dark:hover:border-teal-500/40 rounded-[2rem] p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(20,184,166,0.15)] transition-all group overflow-hidden cursor-pointer"
              >
                <div className={`absolute -top-16 -left-16 w-56 h-56 bg-gradient-to-br ${cfg.gradient} opacity-[0.07] group-hover:opacity-[0.14] rounded-full blur-3xl pointer-events-none transition-opacity`} />
                <div className="flex items-start justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <motion.div whileHover={{ rotate: [0, -12, 12, 0] }} transition={{ duration: 0.6 }} className={`p-4 rounded-2xl bg-gradient-to-br ${cfg.gradient} text-white shadow-lg shrink-0`}>
                      <Icon className="w-7 h-7" />
                    </motion.div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{cfg.label}</h3>
                      <p className="text-[11px] font-bold text-slate-500 mt-1 leading-relaxed">{cfg.description}</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-slate-300 group-hover:text-teal-500 group-hover:-translate-x-1 transition-all shrink-0 mt-1" />
                </div>
                <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-200/60 dark:border-slate-700/50 relative z-10">
                  <span className={`text-2xl font-black ${cfg.text}`}>{count}</span>
                  <span className="text-[11px] font-bold text-slate-500">پروفایل ثبت شده</span>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
