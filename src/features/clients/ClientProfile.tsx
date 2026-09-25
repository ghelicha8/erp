import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Star, Phone, Wallet, 
  CheckCircle, Layers, FileText, Activity, 
  Users, ShoppingCart, Truck, Image as ImageIcon, Edit2, Briefcase, Calculator,
  FileDown, FileUp,  
} from 'lucide-react';
import moment from 'moment-jalaali';

import { useClientStore } from '../../store/clientStore';
import { useFinanceStore } from '../../store/financeStore'; 
import { useProjectStore } from '../projects/store/projectStore'; 
import { useLogisticsStore } from '../../store/logisticsStore'; 
import { useLaborStore } from '../../store/laborStore';
import { usePurchaseStore } from '../../store/purchaseStore';

import ClientFormModal from './components/ClientFormModal';
import ClientFinanceTab from './components/ClientFinanceTab';
import ClientTransactionModal from './components/ClientTransactionModal';
import ClientProjectsTab from './components/ClientProjectsTab'; 
import ClientInvoicesTab from './components/ClientInvoicesTab'; 
import ClientDocumentsTab from './components/tabs/ClientDocumentsTab'; 
import ClientLogisticsTab from './components/tabs/ClientLogisticsTab'; 
import ClientLaborTab from './components/tabs/ClientLaborTab'; 
import ClientPurchasesTab from './components/tabs/ClientPurchasesTab';
import ClientAnalyticsTab from './components/tabs/ClientAnalyticsTab';

import NewProjectModal from '../projects/components/NewProjectModal';
import InvoiceBuilder from '../projects/components/InvoiceBuilder';
import AdvancedPurchaseModal from '../projects/components/AdvancedPurchaseModal';
import NewLogisticsModal from '../projects/components/NewLogisticsModal';
import GlassSelect from '../../components/ui/GlassSelect';

import ExportBuilder from '../../components/shared/ExportBuilder';
import ImportBuilder from '../../components/shared/ImportBuilder';

const safeNum = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const parsed = Number(String(val).replace(/\D/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

const PROFILE_TABS = [
  { id: 'finance', label: 'مالی و کیف پول', icon: Wallet, color: 'text-emerald-500', activeClass: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'projects', label: 'پروژه‌ها و قراردادها', icon: Layers, color: 'text-blue-500', activeClass: 'text-blue-600 dark:text-blue-400' },
  { id: 'invoices', label: 'فاکتورها و صورت‌وضعیت', icon: FileText, color: 'text-purple-500', activeClass: 'text-purple-600 dark:text-purple-400' }, 
  { id: 'labor', label: 'نیروی کار', icon: Users, color: 'text-orange-500', activeClass: 'text-orange-600 dark:text-orange-400' },
  { id: 'procurement', label: 'خرید و تدارکات', icon: ShoppingCart, color: 'text-teal-500', activeClass: 'text-teal-600 dark:text-teal-400' },
  { id: 'logistics', label: 'لجستیک و ماشین‌آلات', icon: Truck, color: 'text-amber-500', activeClass: 'text-amber-600 dark:text-amber-400' },
  { id: 'documents', label: 'اسناد و مدارک', icon: ImageIcon, color: 'text-fuchsia-500', activeClass: 'text-fuchsia-600 dark:text-fuchsia-400' },
  { id: 'dashboard', label: 'گزارشات و نمودارها', icon: Activity, color: 'text-indigo-500', activeClass: 'text-indigo-600 dark:text-indigo-400' },
];

export default function ClientProfile({ clientId, onBack }: { clientId: string, onBack: () => void }) {
  const client = useClientStore(state => state.clients.find(c => c.id === clientId));
  const allTransactions = useFinanceStore(state => state.transactions);
  const allProjects = useProjectStore(state => state.projects); 
  const allLogs = useLogisticsStore(state => state.logs); 
  const allLaborLogs = useLaborStore(state => state.logs); 
  const allPurchases = usePurchaseStore(state => state.purchases);
  
  const [activeTab, setActiveTab] = useState('finance');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState<string | undefined>(undefined);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const currentYear = moment().jYear();
  const [yearFilter, setYearFilter] = useState('ALL');
  const yearOptions = [
    { value: 'ALL', label: 'تمام سال‌ها' },
    { value: currentYear.toString(), label: `سال ${currentYear} (امسال)` },
    { value: (currentYear - 1).toString(), label: `سال ${currentYear - 1}` },
    { value: (currentYear - 2).toString(), label: `سال ${currentYear - 2}` },
  ];

  const isInYear = (dateString?: string) => {
    if (yearFilter === 'ALL') return true;
    if (!dateString) return false;
    return dateString.startsWith(yearFilter);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (activeTab === 'finance') setIsTxModalOpen(true);
        if (activeTab === 'projects') setIsNewProjectModalOpen(true);
        if (activeTab === 'invoices') { setEditInvoiceId(undefined); setIsNewInvoiceModalOpen(true); } 
        if (activeTab === 'logistics') document.dispatchEvent(new CustomEvent('open-new-logistics-modal', { detail: { clientId, targetContext: 'CLIENT' } }));
        if (activeTab === 'labor') document.dispatchEvent(new CustomEvent('open-client-new-labor-modal'));
        if (activeTab === 'procurement') document.dispatchEvent(new CustomEvent('open-new-purchase-modal', { detail: { preSelectedClientId: clientId } }));
      }
    };
    const handleEditInvoice = (e: any) => { setEditInvoiceId(e.detail); setIsNewInvoiceModalOpen(true); };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('open-edit-invoice-modal', handleEditInvoice);
    return () => {
       window.removeEventListener('keydown', handleKeyDown);
       document.removeEventListener('open-edit-invoice-modal', handleEditInvoice);
    };
  }, [activeTab, clientId]);

  const stats = useMemo(() => {
    const clientProjects = allProjects.filter(p => p.clientId === clientId);
    const clientProjectIds = clientProjects.map(p => p.id);

    let globalDebt = 0;
    let globalBilled = 0;

    clientProjects.forEach(proj => {
      let projectPaid = 0;
      
      allTransactions.filter(t => t.direction === 'IN' && isInYear(t.date)).forEach(t => {
        let allocatedAmount = 0;
        const projAlloc = t.allocations?.find(a => a.projectId === proj.id);
        if (projAlloc) {
          allocatedAmount = projAlloc.amount || 0;
        } else if ((!t.allocations || t.allocations.length === 0) && t.referenceId === proj.id) {
          allocatedAmount = t.amount || 0;
        }
        const isCashed = t.type === 'CASH' || (t.type === 'CHEQUE' && ['CASHED','EXCHANGED','CASH_SETTLED'].includes(t.chequeDetails?.status || ''));
        if (allocatedAmount > 0 && isCashed) projectPaid += allocatedAmount;
      });

      let totalCost = 0;
      const pPurchases = allPurchases.filter(p => p.projectId === proj.id);
      pPurchases.filter((p:any) => isInYear(p.date)).forEach((p:any) => {
        totalCost += safeNum(p.billedCost) || safeNum(p.internalCost) || 0;
      });
      
      const pLabor = allLaborLogs.filter(l => l.projectId === proj.id);
      pLabor.filter((l:any) => isInYear(l.date)).forEach((l:any) => {
         totalCost += safeNum(l.billedCost) || safeNum(l.internalCost) || 0;
      });

      const pLogs = allLogs.filter(l => l.projectId === proj.id);
      pLogs.filter((l:any) => isInYear(l.date)).forEach((l:any) => {
         totalCost += safeNum(l.billedCost) || safeNum(l.internalCost) || 0;
      });

      let projCalculatedDebt = 0;
      const phases = proj.phases || [];
      const hasContract = phases.some((p:any) => ['CONTRAT', 'FIXED', 'METRI', 'METRE', 'PERCENTAGE', 'COST_ONLY'].includes(p.contractType));
      
      if (hasContract) {
        projCalculatedDebt = phases.reduce((acc: number, phase: any) => {
          if (phase.contractType === 'METRE' || phase.contractType === 'METRI') {
            const area = phase.dimensions?.reduce((sum: number, d: any) => sum + safeNum(d.area), 0) || safeNum(phase.area) || 0;
            return acc + Math.floor((area * safeNum(phase.unitPrice)) / 10);
          }
          if (phase.contractType === 'FIXED' || phase.contractType === 'CONTRAT') {
            return acc + Math.floor(safeNum(phase.fixedPrice) / 10);
          }
          if (phase.contractType === 'PERCENTAGE') {
            return acc + totalCost + Math.floor((totalCost * safeNum(phase.contractorPercentage)) / 100);
          }
          if (phase.contractType === 'COST_ONLY') {
            return acc + totalCost;
          }
          return acc;
        }, 0);
      } else {
         projCalculatedDebt = totalCost;
      }

      globalBilled += projCalculatedDebt;
      globalDebt += (projCalculatedDebt - projectPaid); 
    });

    allLaborLogs.filter(l => (!l.projectId || l.projectId === 'FREE') && l.clientId === clientId && isInYear(l.date)).forEach(l => {
       const cost = safeNum(l.billedCost) || safeNum(l.internalCost) || 0;
       globalBilled += cost;
       globalDebt += cost; 
    });

    allPurchases.filter(p => (!p.projectId || p.projectId === 'FREE') && p.clientId === clientId && isInYear(p.date)).forEach(p => {
       const cost = safeNum(p.billedCost) || safeNum(p.internalCost) || 0;
       globalBilled += cost;
       globalDebt += cost; 
    });

    allLogs.filter(l => (!l.projectId || l.projectId === 'FREE') && l.clientId === clientId && isInYear(l.date)).forEach(l => {
       const cost = safeNum(l.billedCost) || safeNum(l.internalCost) || 0;
       globalBilled += cost;
       globalDebt += cost; 
    });

    let totalPaidAll = 0;
    let totalConfirmedAll = 0;
    let walletBalance = 0;

    allTransactions.filter(t => t.direction === 'IN' && isInYear(t.date)).forEach(t => {
      const isCashed = t.type === 'CASH' || (t.type === 'CHEQUE' && ['CASHED','EXCHANGED','CASH_SETTLED'].includes(t.chequeDetails?.status || ''));
      let isForClient = false;
      let amountForClient = 0;

      if (t.clientId === clientId || t.referenceId === clientId) {
         isForClient = true;
         amountForClient = t.amount;
         const allocatedToProjects = t.allocations?.reduce((sum, a) => sum + (a.amount || 0), 0) || 0;
         walletBalance += Math.max(t.amount - allocatedToProjects, 0);
      } 
      else if (t.allocations && t.allocations.some(a => a.projectId && clientProjectIds.includes(a.projectId))) {
         isForClient = true;
         amountForClient = t.allocations.reduce((sum, a) => clientProjectIds.includes(a.projectId || '') ? sum + (a.amount || 0) : sum, 0);
      }
      else if (clientProjectIds.includes(t.referenceId)) {
         isForClient = true;
         amountForClient = t.amount;
      }

      if (isForClient && amountForClient > 0) {
         totalPaidAll += amountForClient;
         if (isCashed) totalConfirmedAll += amountForClient;
      }
    });

    globalDebt = globalDebt - walletBalance;

    return { totalPaid: totalPaidAll, confirmedPaid: totalConfirmedAll, walletBalance, globalBilled, debt: globalDebt };
  }, [allTransactions, allProjects, allPurchases, allLogs, allLaborLogs, clientId, yearFilter]);

  if (!client) return null;

  const isDebtor = stats.debt >= 0; 

  return (
    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.3, ease: "easeOut" }} className="w-full flex flex-col gap-6 pb-24 h-full relative">
      
      <div className="sticky top-4 z-[100] flex flex-col md:flex-row items-center justify-between gap-5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/80 dark:border-slate-700/80 shadow-[0_15px_40px_rgba(0,0,0,0.08)] rounded-[2.5rem] px-6 py-5">
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            onClick={onBack} 
            className="flex items-center justify-center p-3.5 rounded-[1.25rem] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-inner border border-slate-200 dark:border-slate-600 transition-all shrink-0 group" 
            title="بازگشت به لیست"
          >
            <ArrowRight className="w-6 h-6 text-slate-700 dark:text-slate-300 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="relative shrink-0 ml-1">
            {client.avatar ? (
              <img src={client.avatar} alt={client.name} className="w-[72px] h-[72px] rounded-2xl object-cover shadow-lg border-2 border-white dark:border-slate-700" />
            ) : (
              <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-lg border-2 border-white/80 dark:border-slate-700">
                {client.name.substring(0, 1)}
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 rounded-lg px-1.5 py-0.5 shadow-md border border-slate-100 dark:border-slate-700 flex items-center gap-1 text-[10px] font-black text-amber-500">
              {client.creditScore} <Star className="w-3 h-3 fill-amber-500" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <h2 className="text-xl font-black text-slate-800 dark:text-white drop-shadow-sm">
                {client.name} <span className="text-indigo-600 dark:text-indigo-400">{client.lastName}</span>
              </h2>
              <div className="flex items-center gap-1 bg-white/60 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button onClick={() => setIsEditModalOpen(true)} title="ویرایش اطلاعات شخص" className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-lg transition-colors text-indigo-500">
                  <Edit2 className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"/>
                <button onClick={() => setIsExportModalOpen(true)} title="گزارش‌گیری و خروجی پیشرفته" className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-lg transition-colors text-emerald-500">
                  <FileDown className="w-4 h-4" />
                </button>
                <button onClick={() => setIsImportModalOpen(true)} title="ورودی اطلاعات (Import)" className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors text-blue-500">
                  <FileUp className="w-4 h-4" />
                </button>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-1 opacity-90">
              <Phone className="w-3.5 h-3.5" /> {client.phone}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto justify-end">
          <AnimatePresence mode="wait">
            {activeTab === 'finance' && (
              <motion.button key="btn-finance" initial={{ opacity: 0, scale: 0.9, width: 0 }} animate={{ opacity: 1, scale: 1, width: 'auto' }} exit={{ opacity: 0, scale: 0.9, width: 0 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setIsTxModalOpen(true)} className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2.5 relative overflow-hidden group border border-emerald-400/50">
                <Wallet className="w-5 h-5" />
                <span className="text-sm whitespace-nowrap">ثبت تراکنش (Ctrl+N)</span>
              </motion.button>
            )}
            
            {activeTab === 'projects' && (
              <motion.button key="btn-projects" initial={{ opacity: 0, scale: 0.9, width: 0 }} animate={{ opacity: 1, scale: 1, width: 'auto' }} exit={{ opacity: 0, scale: 0.9, width: 0 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setIsNewProjectModalOpen(true)} className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(59,130,246,0.35)] flex items-center justify-center gap-2.5 relative overflow-hidden group border border-blue-400/50">
                <Briefcase className="w-5 h-5" />
                <span className="text-sm whitespace-nowrap">ثبت پروژه جدید (Ctrl+N)</span>
              </motion.button>
            )}

            {activeTab === 'invoices' && (
              <motion.button key="btn-invoices" initial={{ opacity: 0, scale: 0.9, width: 0 }} animate={{ opacity: 1, scale: 1, width: 'auto' }} exit={{ opacity: 0, scale: 0.9, width: 0 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => { setEditInvoiceId(undefined); setIsNewInvoiceModalOpen(true); }} className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-400 hover:to-fuchsia-400 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(168,85,247,0.35)] flex items-center justify-center gap-2.5 relative overflow-hidden group border border-purple-400/50">
                <FileText className="w-5 h-5" />
                <span className="text-sm whitespace-nowrap">صدور فاکتور (Ctrl+N)</span>
              </motion.button>
            )}

            {activeTab === 'labor' && (
              <motion.button key="btn-labor" initial={{ opacity: 0, scale: 0.9, width: 0 }} animate={{ opacity: 1, scale: 1, width: 'auto' }} exit={{ opacity: 0, scale: 0.9, width: 0 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => document.dispatchEvent(new CustomEvent('open-client-new-labor-modal'))} className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(249,115,22,0.35)] flex items-center justify-center gap-2.5 border border-orange-400/50">
                <Users className="w-5 h-5" />
                <span className="text-sm whitespace-nowrap">ثبت نیروی کار (Ctrl+N)</span>
              </motion.button>
            )}

            {activeTab === 'logistics' && (
              <motion.button key="btn-logistics" initial={{ opacity: 0, scale: 0.9, width: 0 }} animate={{ opacity: 1, scale: 1, width: 'auto' }} exit={{ opacity: 0, scale: 0.9, width: 0 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => document.dispatchEvent(new CustomEvent('open-new-logistics-modal', { detail: { clientId, targetContext: 'CLIENT' } }))} className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(245,158,11,0.35)] flex items-center justify-center gap-2.5 border border-amber-400/50">
                <Truck className="w-5 h-5" />
                <span className="text-sm whitespace-nowrap">ثبت سرویس لجستیک (Ctrl+N)</span>
              </motion.button>
            )}

            {activeTab === 'procurement' && (
              <motion.button key="btn-procurement" initial={{ opacity: 0, scale: 0.9, width: 0 }} animate={{ opacity: 1, scale: 1, width: 'auto' }} exit={{ opacity: 0, scale: 0.9, width: 0 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => document.dispatchEvent(new CustomEvent('open-new-purchase-modal', { detail: { preSelectedClientId: clientId } }))} className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white rounded-2xl font-black shadow-[0_10px_25px_rgba(20,184,166,0.35)] flex items-center justify-center gap-2.5 border border-teal-400/50">
                <ShoppingCart className="w-5 h-5" />
                <span className="text-sm whitespace-nowrap">ثبت فاکتور خرید (Ctrl+N)</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full relative z-[80] -mt-2">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3 px-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500 drop-shadow-md" />
            <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 drop-shadow-sm">داشبورد وضعیت مالی کل کارفرما</h3>
          </div>
          <div className="w-[180px] h-[40px] relative z-[90]">
            <GlassSelect options={yearOptions} value={yearFilter} onChange={setYearFilter} placeholder="سال مالی" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 w-full">
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border border-white/80 dark:border-slate-600/50 p-5 flex flex-col justify-between min-h-[120px]">
            <div className="flex justify-between items-center w-full mb-3">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">مجموع ارزش قرارداد/فاکتورها (بدهی کلی)</span>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-500/20 dark:to-slate-500/10 text-slate-600 border border-slate-200 dark:border-slate-500/30 shadow-inner"><Layers className="w-5 h-5" /></div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-slate-700 dark:text-slate-300 text-left font-mono" dir="ltr">{stats.globalBilled.toLocaleString('fa-IR')}</div>
          </div>

          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border border-white/80 dark:border-slate-600/50 p-5 flex flex-col justify-between min-h-[120px]">
            <div className="flex justify-between items-center w-full mb-3">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">دریافتی (نقد + کل چک‌ها)</span>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-500/20 dark:to-blue-500/10 text-blue-500 border border-blue-200 dark:border-blue-500/30 shadow-inner"><Wallet className="w-5 h-5" /></div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-blue-600 dark:text-blue-400 text-left font-mono" dir="ltr">{stats.totalPaid.toLocaleString('fa-IR')}</div>
          </div>

          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border border-white/80 dark:border-slate-600/50 p-5 flex flex-col justify-between min-h-[120px]">
            <div className="flex justify-between items-center w-full mb-3">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">دریافتی (فقط نقد + چک پاس شده)</span>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/20 dark:to-emerald-500/10 text-emerald-500 border border-emerald-200 dark:border-emerald-500/30 shadow-inner"><CheckCircle className="w-5 h-5" /></div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 text-left font-mono" dir="ltr">{stats.confirmedPaid.toLocaleString('fa-IR')}</div>
          </div>

          <div className={`bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border ${!isDebtor ? 'border-rose-400/50 shadow-[0_8px_30px_rgba(244,63,94,0.15)]' : 'border-white/80 dark:border-slate-600/50 shadow-[0_8px_30px_rgba(0,0,0,0.06)]'} p-5 flex flex-col justify-between min-h-[120px]`}>
            <div className="flex justify-between items-center w-full mb-3">
              <span className={`text-[11px] font-bold ${!isDebtor ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
                {!isDebtor ? 'وضعیت: پیش‌دریافت (ما بستانکاریم)' : 'مانده کل طلب ما از کارفرما'}
              </span>
              <div className={`p-2.5 rounded-xl shadow-inner ${!isDebtor ? 'bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-500/20 dark:to-rose-500/10 text-rose-500 border border-rose-200 dark:border-rose-500/30' : 'bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-500/20 dark:to-indigo-500/10 text-indigo-500 border border-indigo-200 dark:border-indigo-500/30'}`}><Calculator className="w-5 h-5" /></div>
            </div>
            <div className={`text-2xl lg:text-3xl font-black text-left font-mono ${!isDebtor ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}`} dir="ltr">{Math.abs(stats.debt).toLocaleString('fa-IR')}</div>
          </div>
        </div>
      </div>

      <div className="w-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/50 dark:border-slate-700/50 shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-[1.5rem] p-2 z-[90] sticky top-[130px] overflow-x-auto modal-scrollbar flex items-center gap-2 mt-4 transition-all">
        {PROFILE_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition-colors duration-300 shrink-0 ${
                isActive 
                  ? 'text-indigo-700 dark:text-indigo-300' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTabProfileIndicator" 
                  transition={{ type: "tween", ease: "easeInOut", duration: 0.25 }}
                  className="absolute inset-0 bg-white/90 dark:bg-slate-700/90 backdrop-blur-md rounded-xl border border-white dark:border-slate-500 shadow-[0_6px_12px_rgba(0,0,0,0.08),inset_0_2px_4px_rgba(255,255,255,0.9)] dark:shadow-[0_6px_12px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)] z-0" 
                />
              )}
              <Icon className={`w-4 h-4 relative z-10 transition-colors duration-300 ${isActive ? tab.activeClass : tab.color}`} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="w-full flex-1 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 shadow-xl rounded-[2.5rem] p-6 sm:p-8 z-[70] relative min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'finance' ? (
            <motion.div key="tab-finance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }} className="w-full h-full">
              <ClientFinanceTab clientId={client.id} />
            </motion.div>
          ) : activeTab === 'projects' ? (
            <motion.div key="tab-projects" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }} className="w-full h-full">
              <ClientProjectsTab clientId={client.id} />
            </motion.div>
          ) : activeTab === 'invoices' ? (
            <motion.div key="tab-invoices" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }} className="w-full h-full">
              <ClientInvoicesTab clientId={client.id} />
            </motion.div>
          ) : activeTab === 'documents' ? (
            <motion.div key="tab-documents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }} className="w-full h-full">
              <ClientDocumentsTab clientId={client.id} />
            </motion.div>
          ) : activeTab === 'logistics' ? (
            <motion.div key="tab-logistics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }} className="w-full h-full">
              <ClientLogisticsTab clientId={client.id} />
            </motion.div>
          ) : activeTab === 'labor' ? (
            <motion.div key="tab-labor" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }} className="w-full h-full">
              <ClientLaborTab clientId={client.id} />
            </motion.div>
          ) : activeTab === 'procurement' ? (
            <motion.div key="tab-procurement" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }} className="w-full h-full">
              <ClientPurchasesTab clientId={client.id} />
            </motion.div>
          ) : activeTab === 'dashboard' ? (
            <motion.div key="tab-analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }} className="w-full h-full">
              <ClientAnalyticsTab clientId={client.id} />
            </motion.div>
          ) : (
            <motion.div key={`placeholder-${activeTab}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15, ease: "easeOut" }} className="flex flex-col items-center justify-center w-full h-full text-slate-400 py-20">
              <div className="w-24 h-24 bg-white/50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center mb-6 shadow-inner">
                 <Layers className="w-10 h-10 text-slate-300 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-black text-slate-600 dark:text-slate-300 drop-shadow-sm">محتوای tab «{PROFILE_TABS.find(t=>t.id===activeTab)?.label}»</h3>
              <p className="text-sm font-bold mt-2 text-center max-w-md leading-relaxed">این بخش به زودی طراحی و متصل می‌شود.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ClientFormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} clientToEdit={client} />
      {isTxModalOpen && <ClientTransactionModal clientId={client.id} isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} />}
      <NewProjectModal isOpen={isNewProjectModalOpen} onClose={() => setIsNewProjectModalOpen(false)} preSelectedClientId={client.id} />
      <AnimatePresence>{isNewInvoiceModalOpen && (<InvoiceBuilder clientId={client.id} existingInvoiceId={editInvoiceId} onClose={() => { setIsNewInvoiceModalOpen(false); setEditInvoiceId(undefined); }} />)}</AnimatePresence>
      
      <AdvancedPurchaseModal />
      
      {/* 💡 این همون مودال مادر و اصلی لجستیکه که سر جاش برگشت و با زدن دکمه بالا باز میشه */}
      <NewLogisticsModal clientId={clientId} />
      
      <AnimatePresence>
        {isExportModalOpen && <ExportBuilder clientId={client.id} context="CLIENT" onClose={() => setIsExportModalOpen(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {isImportModalOpen && <ImportBuilder clientId={client.id} context="CLIENT" onClose={() => setIsImportModalOpen(false)} />}
      </AnimatePresence>

    </motion.div>
  );
}