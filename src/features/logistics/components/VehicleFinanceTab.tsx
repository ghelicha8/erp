import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, Wallet, Layers,
  Truck, Wrench, ShieldAlert, Users, Edit, Trash2, Banknote, FileSignature
} from 'lucide-react';
import { toast } from 'sonner';

import { useFinanceStore } from '../../../store/financeStore';
import GlassDatePicker from '../../../components/ui/GlassDatePicker';
import GlassSelect from '../../../components/ui/GlassSelect';
import { NeonSearchWrapper } from '../../../components/ui/SharedLaborUI';

import VehicleTransactionModal from './VehicleTransactionModal';

export default function VehicleFinanceTab({ vehicleId }: { vehicleId: string }) {
  
  const { transactions, deleteTransaction } = useFinanceStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  // 💡 اتصال به دکمه‌ی هدر و کلیدهای میانبر از طریق Event
  useEffect(() => {
    const handleOpenModal = () => { 
      setEditData(null); 
      setIsModalOpen(true); 
    };
    document.addEventListener('open-new-vehicle-transaction-modal', handleOpenModal);
    return () => document.removeEventListener('open-new-vehicle-transaction-modal', handleOpenModal);
  }, []);

  const visibleTxs = useMemo(() => {
    let txs = transactions.filter(t => 
      t.allocations?.some(a => a.recordType === 'LOGISTICS' && a.recordId === vehicleId)
    );

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      txs = txs.filter(t => t.description?.toLowerCase().includes(q) || t.amount.toString().includes(q));
    }

    if (typeFilter !== 'ALL') {
      if (typeFilter === 'IN') txs = txs.filter(t => t.direction === 'IN');
      if (typeFilter === 'OUT') txs = txs.filter(t => t.direction === 'OUT');
      if (['REPAIR', 'INSURANCE', 'WAGE', 'INCIDENTAL'].includes(typeFilter)) {
        txs = txs.filter(t => t.allocations?.some(a => a.description === typeFilter));
      }
    }

    if (dateFrom) txs = txs.filter(t => t.date >= dateFrom);
    if (dateTo) txs = txs.filter(t => t.date <= dateTo);

    return txs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.date.localeCompare(a.date));
  }, [transactions, vehicleId, searchQuery, typeFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    visibleTxs.forEach(t => {
      const vehicleAllocation = t.allocations?.find(a => a.recordType === 'LOGISTICS' && a.recordId === vehicleId);
      const amount = vehicleAllocation?.amount || t.amount;
      
      if (t.direction === 'IN') totalIncome += amount;
      if (t.direction === 'OUT') totalExpense += amount;
    });
    return { totalIncome, totalExpense, net: totalIncome - totalExpense };
  }, [visibleTxs, vehicleId]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full flex flex-col gap-6 relative">
      
      {/* 💡 هدر داشبورد (دکمه ثبت کاملاً حذف شد) */}
      <div className="relative overflow-hidden bg-white/60 dark:bg-slate-800/50 backdrop-blur-2xl rounded-[2.5rem] p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-white/80 dark:border-slate-600/50 flex flex-col md:flex-row items-center justify-between gap-6 group z-10">
        <div className="flex items-center gap-5 w-full md:w-auto z-10">
          <div className={`p-4 rounded-2xl border shadow-inner transform transition-transform duration-500 ${stats.net >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 text-emerald-500' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 text-rose-500'}`}>
            <Wallet className="w-8 h-8" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-black text-slate-800 dark:text-white drop-shadow-sm">تراز مالی و سود خالص</h3>
            <div className="text-sm font-bold text-slate-500 mt-1 flex items-center gap-2">
              سود خالص ماشین: 
              <span className={`font-black text-lg ${stats.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} dir="ltr">
                {Math.abs(stats.net).toLocaleString('fa-IR')}
              </span> 
              <span className="text-[10px]">تومان {stats.net < 0 && '(زیان)'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm rounded-[2rem] px-4 py-4 z-50">
        <NeonSearchWrapper className="flex-[1_1_250px] h-[46px]">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input placeholder="جستجو در فیش‌ها..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-sm font-bold pl-2 pr-4 text-slate-800 dark:text-white" />
          {searchQuery && <button onClick={() => setSearchQuery('')}><X className="w-4 h-4 text-slate-400"/></button>}
        </NeonSearchWrapper>
        
        <div className="w-[140px] shrink-0 h-[46px]">
          <GlassSelect 
            options={[
              { value: 'ALL', label: 'همه موارد' }, 
              { value: 'IN', label: 'فقط درآمد (کرایه)' }, 
              { value: 'OUT', label: 'فقط خرج‌کرد' },
              { value: 'REPAIR', label: 'تعمیرات' },
              { value: 'WAGE', label: 'حقوق راننده' }
            ]} 
            value={typeFilter} onChange={setTypeFilter} placeholder="نوع" 
          />
        </div>
        <div className="w-[140px] shrink-0 h-[46px]"><GlassDatePicker placeholder="از تاریخ" value={dateFrom} onChange={setDateFrom} /></div>
        <div className="w-[140px] shrink-0 h-[46px]"><GlassDatePicker placeholder="تا تاریخ" value={dateTo} onChange={setDateTo} /></div>
      </div>

      <div className="w-full overflow-x-auto rounded-[2rem] bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 shadow-xl modal-scrollbar">
        <table className="w-full text-right border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">شرح و تاریخ</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white text-center">مبلغ کل (تومان)</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white">نوع / جزئیات</th>
              <th className="p-5 font-bold text-sm text-slate-800 dark:text-white text-center">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {visibleTxs.map((trx: any) => {
                const isIncome = trx.direction === 'IN';
                const logAlloc = trx.allocations?.find((a:any) => a.recordType === 'LOGISTICS' && a.recordId === vehicleId);
                const category = logAlloc?.description || 'UNKNOWN';
                const hasProject = trx.allocations?.some((a:any) => a.allocationType === 'PROJECT');
                const hasDriver = trx.allocations?.some((a:any) => a.recordType === 'LABOR');

                return (
                  <motion.tr key={trx.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                    
                    <td className="p-5 align-top w-[30%]">
                      <div className="flex flex-col pt-1">
                        <span className="font-bold text-slate-800 dark:text-white">{trx.description || 'بدون شرح'}</span>
                        <span className="text-xs font-bold text-slate-500 mt-2">{trx.date}</span>
                      </div>
                    </td>
                    
                    <td className="p-5 align-top w-[20%] text-center">
                      <div className="flex flex-col items-center gap-1.5 pt-1">
                        <span className={`font-black text-lg ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`} dir="ltr">
                          {isIncome ? '+' : '-'}{trx.amount.toLocaleString('fa-IR')}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md w-max ${isIncome ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'}`}>
                          {trx.type === 'CHEQUE' ? <FileSignature className="w-3 h-3 inline ml-1"/> : <Banknote className="w-3 h-3 inline ml-1"/>}
                          {trx.type === 'CHEQUE' ? 'چک / سفته' : 'نقدی / حواله'}
                        </span>
                      </div>
                    </td>
                    
                    <td className="p-5 align-top w-[35%]">
                      <div className="flex flex-wrap gap-2 pt-1">
                        {isIncome ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs font-bold">
                            <Truck className="w-3.5 h-3.5" /> درآمد کرایه (باربری)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-bold">
                            {category === 'WAGE' ? <Users className="w-3.5 h-3.5" /> : category === 'REPAIR' ? <Wrench className="w-3.5 h-3.5" /> : category === 'INSURANCE' ? <ShieldAlert className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                            {category === 'WAGE' ? 'پرداخت دستمزد راننده' : category === 'REPAIR' ? 'هزینه تعمیر و نگهداری' : category === 'INSURANCE' ? 'هزینه بیمه' : 'هزینه جانبی متفرقه'}
                          </span>
                        )}

                        {hasProject && <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400"><Layers className="w-3 h-3"/> پروژه مرتبط</span>}
                        {hasDriver && <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400"><Users className="w-3 h-3"/> راننده متصل</span>}
                      </div>
                    </td>

                    <td className="p-5 text-center align-top w-[15%]">
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button onClick={() => { setEditData(trx); setIsModalOpen(true); }} className="p-2 rounded-xl bg-slate-100 text-blue-500 hover:bg-blue-50 transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => { deleteTransaction(trx.id); toast.success('تراکنش حذف شد'); }} className="p-2 rounded-xl bg-slate-100 text-rose-500 hover:bg-rose-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>

                  </motion.tr>
                );
              })}
              {visibleTxs.length === 0 && <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}><td colSpan={4} className="p-16 text-center text-slate-500 font-bold">تراکنشی یافت نشد.</td></motion.tr>}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <VehicleTransactionModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditData(null); }} 
        vehicleId={vehicleId} 
        editData={editData} 
      />

    </motion.div>
  );
}