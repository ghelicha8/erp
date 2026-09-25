import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LayoutGrid, List, Activity, CheckCircle, PauseCircle, Briefcase, Plus, ChevronDown } from 'lucide-react';

import { useProjectStore, rialToToman } from '../store/projectStore';
// 💡 اضافه شدن استور کارفرمایان برای ترجمه آیدی به نام
import { useClientStore } from '../../../store/clientStore';
import ProjectCard from './ProjectCard';
import NewProjectModal from './NewProjectModal';
import ProjectDashboard from './ProjectDashboard';
import type { ProjectStatus, ContractType } from '../types/project.types';

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
    case 'CONTRAT': return 'مقطوع';
    case 'METRI': return 'متری';
    case 'PERCENTAGE': return 'درصدی';
    case 'COST_ONLY': return 'فقط هزینه';
    case 'CUSTOM': return 'سفارشی';
    default: return 'نامشخص';
  }
};

export default function ProjectList() {
  const projects = useProjectStore((state) => state.projects);
  // 💡 فراخوانی دیتابیس کارفرمایان
  const clients = useClientStore((state) => state.clients);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [displayLimit, setDisplayLimit] = useState<number>(20);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [showLimitDropdown, setShowLimitDropdown] = useState(false);
  const limitDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (limitDropdownRef.current && !limitDropdownRef.current.contains(event.target as Node)) {
        setShowLimitDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 💡 تابع هوشمند برای گرفتن نام کامل
  const getClientFullName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.name} ${client.lastName || ''}`.trim() : clientId;
  };

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter((p) => {
      const clientName = getClientFullName(p.clientId);
      // 💡 حالا جستجو هم روی نام پروژه و هم نام کامل کارفرما کار می‌کند
      return p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             clientName.toLowerCase().includes(searchQuery.toLowerCase());
    });
    
    filtered.sort((a, b) => {
      const aPinned = (a as any).isPinned ? 1 : 0;
      const bPinned = (b as any).isPinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      const aActive = a.status === 'IN_PROGRESS' ? 1 : 0;
      const bActive = b.status === 'IN_PROGRESS' ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return a.name.localeCompare(b.name, 'fa-IR');
    });
    return filtered.slice(0, displayLimit);
  }, [projects, searchQuery, displayLimit, clients]);

  const layoutSpring = { type: 'spring', stiffness: 300, damping: 25 };

  return (
    <AnimatePresence mode="wait">
      {selectedProjectId ? (
        <motion.div
          key="dashboard-view"
          initial={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: 30, filter: 'blur(10px)' }}
          transition={{ duration: 0.4, type: "spring", bounce: 0 }}
          className="w-full"
        >
          <ProjectDashboard 
            projectId={selectedProjectId} 
            onBack={() => setSelectedProjectId(null)} 
          />
        </motion.div>
      ) : (
        <motion.div
          key="list-view"
          initial={{ opacity: 0, x: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
          transition={{ duration: 0.4, type: "spring", bounce: 0 }}
          dir="rtl" 
          className="w-full font-sans pb-10"
        >
          <motion.div 
            layout
            className="mb-8 p-3 rounded-[2rem] backdrop-blur-2xl bg-white/50 dark:bg-slate-900/50 border border-white/60 dark:border-slate-700/50 shadow-xl flex flex-col lg:flex-row gap-4 items-center justify-between sticky top-0 z-40"
          >
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full lg:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_8px_20px_-6px_rgba(16,185,129,0.5)] hover:shadow-[0_12px_25px_-6px_rgba(16,185,129,0.6)] transition-all active:scale-95 group"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              <span>افزودن پروژه جدید</span>
            </button>

            <div className="relative w-full lg:max-w-md group flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text"
                placeholder="جستجو در پروژه‌ها یا کارفرمایان..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/60 dark:bg-black/20 border border-white/40 dark:border-slate-700/50 rounded-2xl pr-12 pl-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400 backdrop-blur-sm focus-within:scale-[1.02]"
              />
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
              <div className="relative" ref={limitDropdownRef}>
                <div 
                  onClick={() => setShowLimitDropdown(!showLimitDropdown)}
                  className="flex items-center gap-2 bg-white/50 dark:bg-black/20 px-4 py-2 rounded-2xl border border-white/40 dark:border-slate-700/50 backdrop-blur-sm cursor-pointer hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                >
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">نمایش:</span>
                  <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    {displayLimit}
                    <ChevronDown className={`w-3.5 h-3.5 text-emerald-500 transition-transform duration-300 ${showLimitDropdown ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                <AnimatePresence>
                  {showLimitDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                      className="absolute top-full left-0 mt-2 w-full min-w-[80px] backdrop-blur-2xl bg-white/90 dark:bg-slate-800/95 border border-white/50 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden z-50 py-1"
                    >
                      {[10, 20, 50].map((limit) => (
                        <div
                          key={limit}
                          onClick={() => {
                            setDisplayLimit(limit);
                            setShowLimitDropdown(false);
                          }}
                          className={`px-4 py-2.5 text-center text-sm font-bold cursor-pointer transition-colors ${displayLimit === limit ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                        >
                          {limit}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex bg-white/50 dark:bg-black/20 p-1 rounded-2xl border border-white/40 dark:border-slate-700/50 backdrop-blur-sm">
                <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}><LayoutGrid className="w-5 h-5" /></button>
                <button onClick={() => setViewMode('table')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}><List className="w-5 h-5" /></button>
              </div>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {viewMode === 'grid' && (
              <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredAndSortedProjects.map((project) => (
                    <motion.div 
                      key={project.id} 
                      layout 
                      transition={layoutSpring} 
                      initial={{ opacity: 0, scale: 0.9 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <ProjectCard project={project} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
            
            {viewMode === 'table' && (
              <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full overflow-x-auto rounded-[2rem] backdrop-blur-xl bg-white/50 dark:bg-slate-900/50 border border-white/60 dark:border-slate-700/50 shadow-xl modal-scrollbar">
                <table className="w-full text-right border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-white/40 dark:bg-black/20 border-b border-white/40 dark:border-slate-700/50">
                      <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300">پروژه</th>
                      <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300">کارفرما</th>
                      <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300">نوع</th>
                      <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300">وضعیت</th>
                      <th className="p-5 font-bold text-sm text-slate-700 dark:text-slate-300">سود / خرج‌کرد (تومان)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredAndSortedProjects.map((project) => {
                        const badge = getStatusBadge(project.status);
                        return (
                          <motion.tr 
                            key={project.id} 
                            layout 
                            transition={layoutSpring} 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setSelectedProjectId(project.id)}
                            className="border-b border-white/30 dark:border-slate-700/30 hover:bg-white/40 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                          >
                            <td className="p-5 flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/50 dark:bg-slate-800 shadow-sm shrink-0 border border-white/50 transition-transform group-hover:scale-105">
                                {project.profilePhoto ? <img src={project.profilePhoto} alt={project.name} className="w-full h-full object-cover" /> : <Briefcase className="w-6 h-6 m-3 text-slate-400" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                  {project.name}
                                  {(project as any).isPinned && <span className="text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)] text-lg">★</span>}
                                </span>
                              </div>
                            </td>
                            {/* 💡 جایگزینی آیدی خام با نام کامل کارفرما در جدول */}
                            <td className="p-5 text-sm font-medium text-slate-600 dark:text-slate-400">{getClientFullName(project.clientId)}</td>
                            <td className="p-5 text-sm font-bold text-slate-700 dark:text-slate-300">{translateContractType(project.phases?.[0]?.contractType)}</td>
                            <td className="p-5">
                              <div className={`inline-flex items-center px-3 py-1.5 rounded-xl border text-xs font-bold backdrop-blur-sm ${badge.colors}`}>
                                <badge.icon className="w-3.5 h-3.5 ml-1.5" />
                                {badge.label}
                              </div>
                            </td>
                            <td className="p-5 text-sm">
                              <div className="flex flex-col gap-1">
                                <span className="text-emerald-600 dark:text-emerald-400 font-black">+{rialToToman(project.financials.estimatedProfit).toLocaleString()}</span>
                                <span className="text-rose-500 dark:text-rose-400 text-xs font-bold">-{rialToToman(project.financials.totalExpenditure).toLocaleString()}</span>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
                {filteredAndSortedProjects.length === 0 && <div className="p-16 text-center text-slate-500 font-medium">موردی یافت نشد.</div>}
              </motion.div>
            )}
          </AnimatePresence>

          <NewProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}