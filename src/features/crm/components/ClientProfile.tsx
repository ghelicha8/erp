import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Printer, Briefcase, TrendingUp, Wallet, 
  CreditCard, AlertTriangle, Clock, CheckCircle, 
  ArrowLeftRight, Banknote, FileSignature, User, Phone, FileText
} from 'lucide-react';

import { useCRMStore } from '../../../store/crmStore';
import { useProjectStore, rialToToman } from '../../projects/store/projectStore';
import { useFinanceStore } from '../../../store/financeStore';

interface ClientProfileProps {
  clientId: string;
  onBack: () => void;
}

export default function ClientProfile({ clientId, onBack }: ClientProfileProps) {
  // فراخوانی امن اطلاعات کارفرما و پروژه‌ها
  const clients = useCRMStore(state => state.clients);
  const client = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);

  const allProjects = useProjectStore(state => state.projects);
  const clientProjects = useMemo(() => allProjects.filter(p => p.clientId === clientId), [allProjects, clientId]);
  const projectIds = useMemo(() => clientProjects.map(p => p.id), [clientProjects]);

  // فراخوانی تراکنش‌های کارفرما از کل پروژه‌ها با useMemo جهت جلوگیری از Infinite Loop
  const allTransactions = useFinanceStore(state => state.transactions);
  const clientTransactions = useMemo(() => {
    return allTransactions.filter(t => projectIds.includes(t.referenceId));
  }, [allTransactions, projectIds]);

  // دریافت پویای خلاصه وضعیت مالی از روی گتر هوشمند استور CRM
  const getClientFinancialSummary = useCRMStore(state => state.getClientFinancialSummary);
  const financialSummary = useMemo(() => getClientFinancialSummary(clientId), [getClientFinancialSummary, clientId, allTransactions, allProjects]);

  if (!client) return null;

  // تابع پرینت گزارش مالی به صورت بومی و شیشه‌ای
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div dir="rtl" className="w-full font-sans pb-16 space-y-8 animate-in fade-in zoom-in-95 duration-500 print:bg-white print:text-black print:p-0">
      
      {/* ----------------------------------------------------------------------
          هدر شناور داشبورد کارفرما
          ---------------------------------------------------------------------- */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 p-4 rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700/50 shadow-2xl flex flex-col sm:flex-row gap-4 items-center justify-between print:hidden"
      >
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={onBack}
            className="p-3 rounded-2xl bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-slate-800 border border-white/40 dark:border-slate-700/50 shadow-sm transition-all active:scale-95 text-slate-700 dark:text-slate-300"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
            <User className="w-6 h-6 text-violet-500" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-slate-900 dark:text-white drop-shadow-sm">{client.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {client.phone}</span>
              <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> کد ملی/اقتصادی: {client.nationalId}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={handlePrintReport}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 text-slate-800 dark:text-white font-bold py-3 px-6 rounded-2xl shadow-lg border border-white/40 dark:border-slate-700/50 transition-all active:scale-95 group shrink-0"
        >
          <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span>استخراج نسخه چاپی سند</span>
        </button>
      </motion.div>

      {/* نمای اختصاصی هدر در زمان پرینت */}
      <div className="hidden print:flex flex-col items-center border-b pb-6 mb-6 text-center">
        <h2 className="text-2xl font-black">گزارش مالی جامع وضعیت کارفرما</h2>
        <h1 className="text-xl font-bold mt-2">نام کارفرما: {client.name}</h1>
        <p className="text-sm mt-1 text-slate-500">تلفن: {client.phone} | کد ملی: {client.nationalId}</p>
      </div>

      {/* ----------------------------------------------------------------------
          کارت‌های مالی و شاخص‌های کلیدی (KPIs)
          ---------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { 
            title: 'پروژه‌های در حال اجرا', 
            value: financialSummary.activeProjectsCount, 
            unit: 'پروژه',
            color: 'text-blue-500', 
            shadow: 'drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]', 
            bg: 'from-blue-500/10 to-blue-500/5', 
            icon: Briefcase 
          },
          { 
            title: 'مجموع پرداختی کارفرما (دریافتی ما)', 
            value: rialToToman(financialSummary.totalReceived), 
            unit: 'تومان',
            color: 'text-emerald-500', 
            shadow: 'drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]', 
            bg: 'from-emerald-500/10 to-emerald-500/5', 
            icon: TrendingUp 
          },
          { 
            title: 'وضعیت تراز نهایی (حسابداری)', 
            value: rialToToman(Math.abs(financialSummary.finalBalance)), 
            unit: 'تومان',
            color: financialSummary.finalBalance >= 0 ? 'text-teal-500' : 'text-rose-500', 
            shadow: financialSummary.finalBalance >= 0 ? 'drop-shadow-[0_0_10px_rgba(20,184,166,0.5)]' : 'drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]', 
            bg: financialSummary.finalBalance >= 0 ? 'from-teal-500/10 to-teal-500/5' : 'from-rose-500/10 to-rose-500/5', 
            icon: Wallet,
            subText: financialSummary.finalBalance >= 0 ? 'بستانکار (تمدید بودجه)' : 'بدهکاری کارفرما'
          },
        ].map((kpi, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + (idx * 0.05) }}
            className={`p-6 rounded-[2rem] backdrop-blur-2xl bg-gradient-to-br ${kpi.bg} border border-white/60 dark:border-slate-700/50 shadow-lg print:border-slate-300 print:bg-none`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300 print:text-slate-700">{kpi.title}</span>
              <div className={`p-2.5 rounded-xl bg-white/60 dark:bg-black/20 shadow-sm backdrop-blur-md ${kpi.color} print:border`}>
                <kpi.icon className={`w-5 h-5 ${kpi.shadow} print:filter-none`} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black ${kpi.color} ${kpi.shadow} print:filter-none`}>{kpi.value.toLocaleString()}</span>
              <span className="text-xs font-bold text-slate-400 print:text-slate-600">{kpi.unit}</span>
            </div>
            {kpi.subText && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md mt-2 inline-block ${financialSummary.finalBalance >= 0 ? 'bg-teal-500/10 text-teal-600' : 'bg-rose-500/10 text-rose-600'}`}>
                {kpi.subText}
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* ----------------------------------------------------------------------
          جدول شیشه‌ای ریز تراکنش‌های کل کارفرما (Cross-Project Transactions)
          ---------------------------------------------------------------------- */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="w-full flex flex-col"
      >
        <div className="px-2 mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-500" />
            <span>دفتر معین تراکنش‌های یکپارچه کارفرما</span>
          </h3>
          <span className="text-xs font-bold text-slate-400 print:hidden">تعداد کل اسناد: {clientTransactions.length} فقره</span>
        </div>

        <div className="w-full overflow-x-auto rounded-[2rem] backdrop-blur-3xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700/50 shadow-2xl modal-scrollbar print:border-slate-300 print:bg-none print:shadow-none">
          <table className="w-full text-right border-collapse min-w-[950px] print:min-w-full">
            <thead>
              <tr className="bg-white/40 dark:bg-black/20 border-b border-white/40 dark:border-slate-700/50 print:bg-slate-100">
                <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300 print:text-black">پروژه مرجع</th>
                <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300 print:text-black">شرح و تاریخ سند</th>
                <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300 print:text-black">مبلغ تراکنش (تومان)</th>
                <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300 print:text-black">روش / جزئیات سند مالی</th>
                <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300 text-center print:text-black">وضعیت پاس‌شدن</th>
              </tr>
            </thead>
            <tbody>
              {clientTransactions.map((trx) => {
                // پیدا کردن نام پروژه بر اساس آیدی تراکنش مرجع
                const parentProject = clientProjects.find(p => p.id === trx.referenceId);
                
                return (
                  <tr key={trx.id} className="border-b border-white/30 dark:border-slate-700/30 hover:bg-white/50 dark:hover:bg-white/10 transition-colors print:hover:bg-none">
                    
                    {/* نام پروژه مرجع تراکنش */}
                    <td className="p-5 align-top">
                      <div className="flex items-center gap-2 pt-1">
                        <span className="font-black text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm print:border-slate-300 print:bg-none">
                          {parentProject ? parentProject.name : 'نامشخص'}
                        </span>
                      </div>
                    </td>

                    {/* شرح و تاریخ */}
                    <td className="p-5 align-top">
                      <div className="flex flex-col pt-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{trx.description || 'تراکنش بدون شرح'}</span>
                        <span className="text-[11px] font-bold text-slate-400 mt-2 font-mono">{trx.date}</span>
                      </div>
                    </td>

                    {/* مبلغ با رنگ جهت مالی */}
                    <td className={`p-5 align-top font-black text-base ${trx.direction === 'IN' ? 'text-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]' : 'text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.3)]'} print:filter-none`}>
                      <div className="pt-1">
                        {trx.direction === 'IN' ? '+' : '-'}
                        {rialToToman(trx.amount).toLocaleString()}
                      </div>
                    </td>

                    {/* نوع و جزئیات کپسولی (Micro-typography) */}
                    <td className="p-5 align-top w-[35%]">
                      <div className="flex items-start gap-3">
                        {trx.type === 'CASH' ? (
                          <>
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.2)] print:border">
                              <Banknote className="w-4 h-4 text-emerald-500" />
                            </div>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 pt-2">نقدی / حواله مستقیم</span>
                          </>
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(168,85,247,0.2)] print:border">
                              <FileSignature className="w-4 h-4 text-purple-500" />
                            </div>
                            <div className="flex flex-col gap-1.5 w-full">
                              <span className="text-xs font-black text-slate-800 dark:text-white pt-1">چک صیادی</span>
                              <div className="flex flex-wrap gap-1">
                                {trx.chequeDetails?.bank && <span className="px-2 py-0.5 bg-slate-100/60 dark:bg-slate-800/60 border border-white/20 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-400">بانک: {trx.chequeDetails.bank}</span>}
                                {trx.chequeDetails?.serialNumber && <span className="px-2 py-0.5 bg-slate-100/60 dark:bg-slate-800/60 border border-white/20 rounded-md text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">سریال: {trx.chequeDetails.serialNumber}</span>}
                                {trx.chequeDetails?.sayyadId && <span className="px-2 py-0.5 bg-slate-100/60 dark:bg-slate-800/60 border border-white/20 rounded-md text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">صیاد: {trx.chequeDetails.sayyadId}</span>}
                                {trx.chequeDetails?.dueDate && <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-[10px] font-black text-indigo-600 dark:text-indigo-400 shadow-[0_0_5px_rgba(99,102,241,0.1)]">سررسید: {trx.chequeDetails.dueDate}</span>}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>

                    {/* وضعیت سند */}
                    <td className="p-5 text-center align-top w-[12%]">
                      <div className="pt-1.5">
                        {trx.type === 'CHEQUE' ? (
                          trx.chequeDetails?.status === 'PENDING' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-xl border border-orange-500/40 bg-orange-500/15 text-orange-600 dark:text-orange-400 text-[11px] font-bold shadow-[0_0_10px_rgba(249,115,22,0.2)]"><Clock className="w-3 h-3 ml-1" /> درانتظار وصول</span>
                          ) : trx.chequeDetails?.status === 'CASH_SETTLED' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]"><CheckCircle className="w-3 h-3 ml-1" />وصول شده</span>
                          ) : trx.chequeDetails?.status === 'RETURNED' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-xl border border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[11px] font-bold shadow-[0_0_10px_rgba(244,63,94,0.2)]"><AlertTriangle className="w-3 h-3 ml-1" />برگشت خورده</span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-xl border border-indigo-500/40 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold"><ArrowLeftRight className="w-3 h-3 ml-1" />تعویض شده</span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold"><CheckCircle className="w-3 h-3 ml-1" />موفق</span>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
              {clientTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-500 font-bold">هیچ سابقه تراکنشی برای پروژه‌های این کارفرما ثبت نشده است.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

    </div>
  );
}