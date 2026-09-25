import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, Activity, CheckCircle, PauseCircle, ChevronDown, 
  ArrowLeft, Layers, Banknote,
  X, LayoutGrid, Search
} from 'lucide-react';

import { useProjectStore } from '../../projects/store/projectStore';
import { useFinanceStore } from '../../../store/financeStore';

// 💡 اضافه کردن استورهای مستقل برای هماهنگی ۱۰۰٪ با گزارشات
import { usePurchaseStore } from '../../../store/purchaseStore';
import { useLaborStore } from '../../../store/laborStore';
import { useLogisticsStore } from '../../../store/logisticsStore';

import type { ProjectStatus, ContractType } from '../../projects/types/project.types';

import ProjectDashboard from '../../projects/components/ProjectDashboard';
import GlassSelect from '../../../components/ui/GlassSelect';

const safeNum = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const parsed = Number(String(val).replace(/\D/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

const NeonSearchWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl group bg-white/10 dark:bg-slate-800/30 backdrop-blur-md overflow-hidden shadow-sm hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all ${className}`}>
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse z-0" style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-blue-500 group-focus-within:to-indigo-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center px-4">{children}</div>
  </div>
);

const getStatusBadge = (status: ProjectStatus) => {
  switch (status) {
    case 'IN_PROGRESS': return { label: 'در حال کار', icon: Activity, colors: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' };
    case 'FINISHED': return { label: 'تمام شده', icon: CheckCircle, colors: 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30' };
    case 'PAUSED': return { label: 'متوقف', icon: PauseCircle, colors: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30' };
    default: return { label: 'نامشخص', icon: Activity, colors: 'bg-slate-100 text-slate-600' };
  }
};

const translateContractType = (type?: ContractType) => {
  switch (type) {
    case 'CONTRAT': return 'مقطوع (کنترات)';
    case 'METRI': return 'مقداری / متری';
    case 'PERCENTAGE': return 'پیمانکاری (درصدی)';
    case 'COST_ONLY': return 'فقط هزینه';
    case 'CUSTOM': return 'سفارشی';
    default: return 'نامشخص';
  }
};

export default function ClientProjectsTab({ clientId }: { clientId: string }) {
  const allProjects = useProjectStore((state) => state.projects);
  const allTransactions = useFinanceStore((state) => state.transactions);
  
  // 💡 استورهای جدید
  const allPurchases = usePurchaseStore((state) => state.purchases);
  const allLaborLogs = useLaborStore((state) => state.logs);
  const allLogisticsLogs = useLogisticsStore((state) => state.logs);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [contractFilter, setContractFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState('ALL');

  const clientProjects = useMemo(() => allProjects.filter(p => p.clientId === clientId), [allProjects, clientId]);

  const getCurrentContractType = (p: any) => {
    return p.contractType || 
           p.phases?.find((ph: any) => ph.phaseStatus === 'IN_PROGRESS' || !ph.isCompleted)?.contractType || 
           p.phases?.[p.phases?.length - 1]?.contractType || 
           p.phases?.[0]?.contractType;
  };

  const filteredProjects = useMemo(() => {
    let filtered = [...clientProjects];
    if (searchQuery) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (statusFilter !== 'ALL') filtered = filtered.filter(p => p.status === statusFilter);
    if (contractFilter !== 'ALL') filtered = filtered.filter(p => getCurrentContractType(p) === contractFilter);
    if (pageSize !== 'ALL') filtered = filtered.slice(0, parseInt(pageSize));
    return filtered;
  }, [clientProjects, searchQuery, statusFilter, contractFilter, pageSize]);

  // 💡 موتور ۱۰۰٪ سینک شده با ReportsTab (خواندن مستقیم از استورهای مستقل)
  const getProjectFinancialStats = (project: any) => {
    let confirmedPaid = 0; 
    allTransactions.filter(t => t.direction === 'IN').forEach(t => {
      let allocatedAmount = 0;
      const projAlloc = t.allocations?.find(a => a.projectId === project.id);
      if (projAlloc) {
        allocatedAmount = projAlloc.amount || 0;
      } else if ((!t.allocations || t.allocations.length === 0) && t.referenceId === project.id) {
        allocatedAmount = t.amount || 0;
      }

      if (allocatedAmount > 0) {
        const isCashed = t.type === 'CASH' || (t.type === 'CHEQUE' && ['CASHED','EXCHANGED','CASH_SETTLED'].includes(t.chequeDetails?.status || ''));
        if (isCashed) confirmedPaid += allocatedAmount;
      }
    });

    let totalCost = 0;
    
    // 💡 خواندن اطلاعات از استورهای گلوبال
    const projectPurchases = allPurchases.filter(p => p.projectId === project.id);
    projectPurchases.forEach((p:any) => {
      totalCost += safeNum(p.billedCost) || safeNum(p.internalCost) || safeNum(p.totalPrice) || safeNum(p.totalCost) || safeNum(p.amount) || 0;
    });

    const projectLabor = allLaborLogs.filter(l => l.projectId === project.id);
    projectLabor.forEach((l:any) => {
      totalCost += safeNum(l.billedCost) || safeNum(l.internalCost) || safeNum(l.totalWage) || safeNum(l.salary) || safeNum(l.totalPrice) || safeNum(l.amount) || 0;
    });

    const projectLogistics = allLogisticsLogs.filter(l => l.projectId === project.id);
    projectLogistics.forEach((l:any) => {
      totalCost += safeNum(l.billedCost) || safeNum(l.internalCost) || safeNum(l.totalCost) || safeNum(l.fee) || safeNum(l.amount) || 0;
    });

    const phases = project.phases || [];
    const hasContract = phases.some((p:any) => ['CONTRAT', 'FIXED', 'METRI', 'METRE', 'PERCENTAGE', 'COST_ONLY'].includes(p.contractType));

    let contractValue = 0;
    if (hasContract) {
      contractValue = phases.reduce((acc: number, phase: any) => {
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
      contractValue = totalCost;
    }

    const debt = contractValue - confirmedPaid;
    const financialProgress = contractValue > 0 ? Math.min((confirmedPaid / contractValue) * 100, 100) : 0;
    const completedPhases = phases.filter((p: any) => p.isCompleted || p.phaseStatus === 'COMPLETED').length;
    const physicalProgress = phases.length > 0 ? Math.min((completedPhases / phases.length) * 100, 100) : 0;

    return { contractValue, confirmedPaid, debt, financialProgress, physicalProgress, completedPhases, totalPhases: phases.length, totalCost };
  };

  const toggleAccordion = (id: string) => {
    setExpandedProjectId(prev => prev === id ? null : id);
  };

  return (
    <AnimatePresence mode="wait">
      {selectedProjectId ? (
        <motion.div key="project-dashboard-view" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="w-full">
          <ProjectDashboard projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
        </motion.div>
      ) : (
        <motion.div key="projects-list-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 p-4 sm:p-5 rounded-[2rem] shadow-sm">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-500/20 shadow-inner">
                <Layers className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-black text-slate-800 dark:text-white">پروژه‌ها و قراردادهای ثبت شده</h3>
                <p className="text-xs font-bold text-slate-500">لیست تمامی پروژه‌های مرتبط با این کارفرما</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm rounded-[2rem] px-6 py-4 z-[50] relative">
            <NeonSearchWrapper className="flex-1 w-full xl:w-auto min-w-[250px] h-[46px]">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input 
                placeholder="جستجو در نام پروژه‌ها..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full h-full bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-white pl-2 pr-4 transition-colors placeholder:text-slate-500" 
              />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /></button>}
            </NeonSearchWrapper>
            
            <div className="w-full xl:w-px h-px xl:h-8 bg-slate-300 dark:bg-slate-700 hidden xl:block" />
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto relative z-[100]">
              <div className="w-full sm:w-32 h-[46px]">
                <GlassSelect options={[{ value: 'ALL', label: 'نمایش همه' }, { value: '10', label: 'نمایش ۱۰' }, { value: '20', label: 'نمایش ۲۰' }]} value={pageSize} onChange={setPageSize} placeholder="تعداد" />
              </div>
              <div className="w-full sm:w-40 h-[46px]">
                <GlassSelect 
                  options={[
                    {value:'ALL', label:'همه وضعیت‌ها'},
                    {value:'IN_PROGRESS', label:'در حال کار'},
                    {value:'FINISHED', label:'تمام شده'},
                    {value:'PAUSED', label:'متوقف'}
                  ]} 
                  value={statusFilter} onChange={setStatusFilter} placeholder="وضعیت" 
                />
              </div>
              <div className="w-full sm:w-44 h-[46px]">
                <GlassSelect 
                  options={[
                    {value:'ALL', label:'همه قراردادها'},
                    {value:'CONTRAT', label:'مقطوع (کنترات)'},
                    {value:'METRI', label:'متری'},
                    {value:'PERCENTAGE', label:'پیمانکاری (درصدی)'},
                    {value:'COST_ONLY', label:'فقط هزینه'}
                  ]} 
                  value={contractFilter} onChange={setContractFilter} placeholder="نوع قرارداد" 
                />
              </div>
            </div>
          </div>

          {clientProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 bg-white/40 dark:bg-slate-800/40 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-slate-700 mt-2">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-4"><Layers className="w-10 h-10 text-slate-400" /></div>
              <h3 className="text-lg font-black text-slate-700 dark:text-slate-300">هیچ پروژه‌ای برای این شخص ثبت نشده است.</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10 mt-2">
              <AnimatePresence>
                {filteredProjects.map((project) => {
                  const stats = getProjectFinancialStats(project);
                  const badge = getStatusBadge(project.status);
                  const isExpanded = expandedProjectId === project.id;
                  const displayContractType = getCurrentContractType(project);

                  return (
                    <motion.div 
                      key={project.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl border border-white/80 dark:border-slate-600/50 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col transition-all hover:shadow-[0_15px_50px_rgba(0,0,0,0.08)]"
                    >
                      <div className="p-5 sm:p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex items-start justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                            {project.profilePhoto ? <img src={project.profilePhoto} className="w-full h-full object-cover" /> : <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500/50" />}
                          </div>
                          <div className="flex flex-col">
                            <h4 className="text-base sm:text-lg font-black text-slate-800 dark:text-white line-clamp-1">{project.name}</h4>
                            <span className="text-[11px] sm:text-xs font-bold text-slate-500 mt-1">قرارداد: {translateContractType(displayContractType)}</span>
                          </div>
                        </div>
                        
                        <div className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-[10px] sm:text-[11px] font-bold shadow-sm backdrop-blur-md relative z-10 whitespace-nowrap ${badge.colors}`}>
                          <badge.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1 sm:ml-1.5" /> {badge.label}
                        </div>
                      </div>

                      <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                        
                        <div className="flex flex-col justify-center space-y-2.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><Banknote className="w-4 h-4 text-emerald-500"/> پیشرفت مالی</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400" dir="ltr">{stats.financialProgress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${stats.financialProgress}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full" />
                          </div>
                          <div className="flex flex-col mt-2 gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                             <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-500">پرداختی:</span>
                                <div className="flex items-center gap-1"><span className="font-black text-slate-700 dark:text-slate-200 text-sm">{stats.confirmedPaid.toLocaleString('fa-IR')}</span> <span className="text-[10px] text-slate-400">تومان</span></div>
                             </div>
                             <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-500">{stats.debt > 0 ? 'طلب ما:' : 'پیش‌دریافت:'}</span>
                                <div className="flex items-center gap-1"><span className={`font-black text-sm ${stats.debt > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>{Math.abs(stats.debt).toLocaleString('fa-IR')}</span> <span className="text-[10px] text-slate-400">تومان</span></div>
                             </div>
                          </div>
                        </div>

                        <div className="flex flex-col justify-center space-y-2.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><LayoutGrid className="w-4 h-4 text-blue-500"/> پیشرفت فیزیکی (فازها)</span>
                            <span className="font-black text-blue-600 dark:text-blue-400" dir="ltr">{stats.physicalProgress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${stats.physicalProgress}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.2 }} className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mt-1">
                            <span>تکمیل شده: <span className="font-black text-slate-700 dark:text-slate-300">{stats.completedPhases}</span> فاز</span>
                            <span>کل: <span className="font-black text-slate-700 dark:text-slate-300">{stats.totalPhases}</span> فاز</span>
                          </div>
                        </div>

                      </div>

                      <div className="px-5 sm:px-6 pb-2">
                        <button onClick={() => toggleAccordion(project.id)} className="w-full flex items-center justify-between py-3 px-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors border border-slate-200/50 dark:border-slate-700/50">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">مشاهده جزئیات فازها و قرارداد</span>
                          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="py-4 space-y-3">
                                {project.phases?.map((phase: any, idx: number) => {
                                  let phasePrice = 0;
                                  if (phase.contractType === 'CONTRAT' || phase.contractType === 'FIXED') {
                                     phasePrice = Math.floor(safeNum(phase.fixedPrice) / 10);
                                  } else if (phase.contractType === 'METRI' || phase.contractType === 'METRE') {
                                    const area = phase.dimensions?.reduce((sum: number, d: any) => sum + safeNum(d.area), 0) || safeNum(phase.area) || 0;
                                    phasePrice = Math.floor((area * safeNum(phase.unitPrice)) / 10);
                                  } else if (phase.contractType === 'PERCENTAGE') {
                                    phasePrice = stats.totalCost + Math.floor((stats.totalCost * safeNum(phase.contractorPercentage)) / 100);
                                  } else if (phase.contractType === 'COST_ONLY') {
                                    phasePrice = stats.totalCost;
                                  }

                                  return (
                                    <div key={phase.id} className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${phase.isCompleted || phase.phaseStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                          {idx + 1}
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{phase.name}</span>
                                          <span className="text-[10px] font-bold text-slate-500">{translateContractType(phase.contractType)}</span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex flex-col sm:items-end w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                                        <span className="text-[10px] font-bold text-slate-400 mb-0.5">ارزش قراردادی/فاکتور این فاز:</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-lg font-black text-indigo-600 dark:text-indigo-400" dir="ltr">{phasePrice.toLocaleString('fa-IR')}</span>
                                          <span className="text-[10px] font-bold text-slate-500">تومان</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="mt-auto p-5 sm:p-6 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-end bg-slate-50/30 dark:bg-slate-900/30">
                        <button 
                          onClick={() => setSelectedProjectId(project.id)}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-95 transition-all group"
                        >
                          ورود به اتاق پروژه
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        </button>
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}