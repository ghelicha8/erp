import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Wallet, Scale, Truck, Receipt, CalendarDays, Wrench } from 'lucide-react';

import { useFinanceStore } from '../../../../store/financeStore';
import { useLogisticsStore } from '../../../../store/logisticsStore';
import { usePurchaseStore } from '../../../../store/purchaseStore';
import { useProcurementStore } from '../../../../store/procurementStore';
import NeonPagination, { PAGE_SIZE_OPTIONS, paginate, pageCountOf } from './NeonPagination';
import { PortalSelect } from '../../../../components/ui/SharedLaborUI';

interface VendorReportsTabProps {
  vendorId: string;
  vendorName: string;
}

const JALALI_MONTHS = ['', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

const monthLabel = (key: string) => {
  const [y, m] = key.split('/');
  const mi = parseInt(m || '0', 10);
  return `${JALALI_MONTHS[mi] || m} ${y || ''}`;
};

export default function VendorReportsTab({ vendorId, vendorName }: VendorReportsTabProps) {
  const allTransactions = useFinanceStore(s => s.transactions);
  const allLogs = useLogisticsStore(s => s.logs);
  const allPurchases = usePurchaseStore(s => s.purchases);
  const vendor = useProcurementStore(s => s.vendors.find(v => v.id === vendorId));
  const allRepairs = useLogisticsStore(s => s.repairs);
  const allVehicles = useLogisticsStore(s => s.vehicles);

  const [pageSize, setPageSize] = useState('10');
  const [purchasePage, setPurchasePage] = useState(1);
  const [payPage, setPayPage] = useState(1);
  const [repairPage, setRepairPage] = useState(1);

  const stats = useMemo(() => {
    const purchases = allPurchases.filter((p: any) => p.vendor === vendorName);
    const txs = allTransactions.filter(t => t.referenceId === vendorId && t.direction === 'OUT');
    const logs = allLogs.filter(l => l.vendorId === vendorId);

    const totalBilled = purchases.reduce((s: number, p: any) => s + ((p.billedCost || p.internalCost || 0)), 0);
    const totalPaid = txs.reduce((s, t) => s + (t.amount || 0), 0);
    const totalLogistics = logs.reduce((s, l) => s + (l.internalCost || 0), 0);

    const shopRepairs = allRepairs.filter(r => r.repairShopVendorId === vendorId);
    const repairTotal = shopRepairs.reduce((s, r) => s + (r.cost || 0), 0);

    const monthly: Record<string, { billed: number, paid: number }> = {};
    purchases.forEach((p: any) => {
      const key = String(p.date || '').slice(0, 7);
      if (!key) return;
      monthly[key] = monthly[key] || { billed: 0, paid: 0 };
      monthly[key].billed += (p.billedCost || p.internalCost || 0);
    });
    txs.forEach(t => {
      const key = String(t.date || '').slice(0, 7);
      if (!key) return;
      monthly[key] = monthly[key] || { billed: 0, paid: 0 };
      monthly[key].paid += (t.amount || 0);
    });
    const months = Object.keys(monthly).sort().slice(-6);

    return {
      totalBilled, totalPaid, totalLogistics,
      debt: Math.max(0, totalBilled - totalPaid),
      purchaseCount: purchases.length,
      logCount: logs.length,
      repairCount: shopRepairs.length,
      repairTotal,
      monthly, months,
      recentPurchases: [...purchases].sort((a: any, b: any) => String(b.date).localeCompare(String(a.date))),
      recentPayments: [...txs].sort((a, b) => String(b.date).localeCompare(String(a.date))),
      recentRepairs: [...shopRepairs].sort((a, b) => String(b.startDate).localeCompare(String(a.startDate))),
    };
  }, [allPurchases, allTransactions, allLogs, allRepairs, vendorId, vendorName]);

  const isRepairShop = vendor?.section === 'REPAIR_SHOPS';
  const vehicleNameOf = (id: string) => allVehicles.find(v => v.id === id)?.name || 'خودرو';

  const maxBar = Math.max(1, ...stats.months.map(m => Math.max(stats.monthly[m].billed, stats.monthly[m].paid)));

  const purCount = pageCountOf(stats.recentPurchases.length, pageSize);
  const purSafe = Math.min(purchasePage, purCount);
  const purRows = paginate(stats.recentPurchases, purSafe, pageSize);
  const payCount = pageCountOf(stats.recentPayments.length, pageSize);
  const paySafe = Math.min(payPage, payCount);
  const payRows = paginate(stats.recentPayments, paySafe, pageSize);
  const repCount = pageCountOf(stats.recentRepairs.length, pageSize);
  const repSafe = Math.min(repairPage, repCount);
  const repRows = paginate(stats.recentRepairs, repSafe, pageSize);

  const tiles = [
    { label: 'مجموع خریدها', value: stats.totalBilled, icon: ShoppingCart, color: 'text-rose-600 dark:text-rose-400', bg: 'from-rose-100 to-rose-50 dark:from-rose-500/20 dark:to-rose-500/10', border: 'border-rose-200 dark:border-rose-500/30' },
    { label: 'مجموع پرداختی‌ها', value: stats.totalPaid, icon: Wallet, color: 'text-emerald-600 dark:text-emerald-400', bg: 'from-emerald-100 to-emerald-50 dark:from-emerald-500/20 dark:to-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/30' },
    { label: 'مانده بدهی', value: stats.debt, icon: Scale, color: 'text-amber-600 dark:text-amber-400', bg: 'from-amber-100 to-amber-50 dark:from-amber-500/20 dark:to-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30' },
    { label: 'هزینه لجستیک', value: stats.totalLogistics, icon: Truck, color: 'text-indigo-600 dark:text-indigo-400', bg: 'from-indigo-100 to-indigo-50 dark:from-indigo-500/20 dark:to-indigo-500/10', border: 'border-indigo-200 dark:border-indigo-500/30' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 p-5 flex flex-col justify-between min-h-[120px] shadow-sm">
            <div className="flex justify-between items-center w-full mb-3">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{tile.label}</span>
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${tile.bg} ${tile.color} border ${tile.border} shadow-inner`}><tile.icon className="w-5 h-5" /></div>
            </div>
            <div className={`text-2xl font-black text-left font-mono ${tile.color}`} dir="ltr">{tile.value.toLocaleString('fa-IR')}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3">
        <span className="text-[11px] font-black text-slate-500">تعداد نمایش در لیست‌ها:</span>
        <div className="w-[150px]">
          <PortalSelect options={PAGE_SIZE_OPTIONS} value={pageSize} onChange={(v: string) => { setPageSize(v); setPurchasePage(1); setPayPage(1); setRepairPage(1); }} placeholder="تعداد..." />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 shadow-xl">
          <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-6">
            <CalendarDays className="w-4 h-4 text-indigo-500" /> خرید و پرداخت ۶ ماه اخیر
          </h4>
          {stats.months.length === 0 ? (
            <p className="text-center text-sm font-bold text-slate-400 py-10">داده‌ای برای نمایش نمودار وجود ندارد.</p>
          ) : (
            <div className="flex items-end justify-around gap-2 h-44" dir="ltr">
              {stats.months.map(m => (
                <div key={m} className="flex flex-col items-center gap-2 flex-1">
                  <div className="flex items-end gap-1.5 h-32">
                    <div className="flex flex-col items-center gap-1 h-full justify-end">
                      <div className="w-5 rounded-t-lg bg-gradient-to-t from-rose-500 to-pink-400 shadow-[0_0_10px_rgba(244,63,94,0.4)] transition-all" style={{ height: `${Math.max(4, (stats.monthly[m].billed / maxBar) * 110)}px` }} title={`خرید: ${stats.monthly[m].billed.toLocaleString()}`} />
                    </div>
                    <div className="flex flex-col items-center gap-1 h-full justify-end">
                      <div className="w-5 rounded-t-lg bg-gradient-to-t from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-all" style={{ height: `${Math.max(4, (stats.monthly[m].paid / maxBar) * 110)}px` }} title={`پرداخت: ${stats.monthly[m].paid.toLocaleString()}`} />
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-slate-500 whitespace-nowrap">{monthLabel(m)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-center gap-6 mt-4 text-[10px] font-bold text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gradient-to-t from-rose-500 to-pink-400" /> خرید</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gradient-to-t from-emerald-500 to-teal-400" /> پرداخت</span>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 shadow-xl">
            <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4">
              <Receipt className="w-4 h-4 text-rose-500" /> آخرین خریدها
            </h4>
            {stats.recentPurchases.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 text-center py-4">خریدی ثبت نشده است.</p>
            ) : (
              <div className="space-y-2.5">
                {purRows.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{p.title}</span>
                    <span className="text-xs font-black text-rose-600 dark:text-rose-400 shrink-0" dir="ltr">{((p.billedCost || p.internalCost || 0)).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <NeonPagination id="vendor-reports-purchases" page={purSafe} pageCount={purCount} totalItems={stats.recentPurchases.length} pageSize={pageSize} onChange={setPurchasePage} />
            </div>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 shadow-xl">
            <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4">
              <Wallet className="w-4 h-4 text-emerald-500" /> آخرین پرداختی‌ها
            </h4>
            {stats.recentPayments.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 text-center py-4">پرداختی ثبت نشده است.</p>
            ) : (
              <div className="space-y-2.5">
                {payRows.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{t.description || t.date}</span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0" dir="ltr">{(t.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <NeonPagination id="vendor-reports-payments" page={paySafe} pageCount={payCount} totalItems={stats.recentPayments.length} pageSize={pageSize} onChange={setPayPage} />
            </div>
          </div>
        </div>
      </div>

      {isRepairShop && (
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 shadow-xl">
          <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-1">
            <Wrench className="w-4 h-4 text-rose-500" /> تعمیرات انجام‌شده در این تعمیرگاه
          </h4>
          <p className="text-[11px] font-bold text-slate-500 mb-4">{stats.repairCount} تعمیر — مجموع <span className="font-black text-rose-600 dark:text-rose-400" dir="ltr">{stats.repairTotal.toLocaleString('fa-IR')}</span> تومان</p>
          {stats.recentRepairs.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 text-center py-4">تعمیرای برای این تعمیرگاه ثبت نشده است.</p>
          ) : (
            <div className="space-y-2.5">
              {repRows.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{vehicleNameOf(r.vehicleId)} — {r.description}</span>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0">{r.startDate}{r.endDate ? ` تا ${r.endDate}` : ''}</span>
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400 shrink-0" dir="ltr">{(r.cost || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
            <div className="mt-4">
              <NeonPagination id="vendor-reports-repairs" page={repSafe} pageCount={repCount} totalItems={stats.recentRepairs.length} pageSize={pageSize} onChange={setRepairPage} />
            </div>
        </div>
      )}
    </motion.div>
  );
}
