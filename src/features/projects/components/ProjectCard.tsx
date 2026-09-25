import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Star, Briefcase, Calendar, CheckCircle, PauseCircle, Activity } from 'lucide-react';
import type { Project, ProjectStatus } from '../types/project.types';
import { useProjectStore } from '../store/projectStore';
// 💡 اتصال به هر دو دیتابیس برای پشتیبانی از داده‌های قدیمی و جدید
import { useClientStore } from '../../../store/clientStore';
import { useCRMStore } from '../../../store/crmStore';

interface ProjectCardProps {
  project: Project & { isPinned?: boolean };
}

const getStatusConfig = (status: ProjectStatus) => {
  switch (status) {
    case 'IN_PROGRESS': return { label: 'در حال کار', icon: Activity, classes: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
    case 'FINISHED': return { label: 'تمام شده', icon: CheckCircle, classes: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' };
    case 'PAUSED': return { label: 'متوقف', icon: PauseCircle, classes: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
    default: return { label: 'نامشخص', icon: Activity, classes: 'bg-slate-100 text-slate-600' };
  }
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const toggleProjectPin = useProjectStore((state) => (state as any).toggleProjectPin);
  const [isPinned, setIsPinned] = useState(project.isPinned || false);

  const clients = useClientStore((state) => state.clients);
  const crmClients = useCRMStore((state) => state.clients);

  // 💡 جستجوی فوق هوشمند در هر دو دیتابیس
  const clientName = useMemo(() => {
    const client = clients.find(c => c.id === project.clientId) || crmClients.find(c => c.id === project.clientId);
    return client ? `${client.name} ${client.lastName || ''}`.trim() : project.clientId;
  }, [clients, crmClients, project.clientId]);

  const statusConfig = getStatusConfig(project.status);
  const StatusIcon = statusConfig.icon;

  const handlePinToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPinned(!isPinned);
    if (toggleProjectPin) toggleProjectPin(project.id);
  };

  return (
    <motion.div
      dir="rtl"
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="relative flex flex-col w-full rounded-[2rem] overflow-hidden cursor-pointer
                 backdrop-blur-2xl bg-white/50 dark:bg-slate-900/50 
                 border border-white/60 dark:border-slate-700/50 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10"
    >
      <div className="relative h-48 w-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0">
        {project.profilePhoto ? (
          <img src={project.profilePhoto} alt={project.name} className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 flex items-center justify-center">
            <Briefcase className="w-14 h-14 text-emerald-400/50 dark:text-emerald-500/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <button
          onClick={handlePinToggle}
          className="absolute top-4 right-4 z-10 p-2.5 rounded-2xl backdrop-blur-xl bg-white/20 dark:bg-black/30 hover:bg-white/40 border border-white/30 transition-colors"
        >
          <motion.div
            initial={false}
            animate={{
              rotate: isPinned ? 360 : 0,
              scale: isPinned ? [1, 1.8, 1.1] : 1,
            }}
            transition={{ duration: 0.6, type: 'spring', bounce: 0.6 }}
          >
            <Star
              className={`w-6 h-6 transition-all duration-300 ${
                isPinned
                  ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.9)]'
                  : 'fill-transparent text-white drop-shadow-md'
              }`}
            />
          </motion.div>
        </button>
      </div>

      <div className="p-6 flex flex-col flex-1 relative">
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 line-clamp-1 drop-shadow-sm">
          {project.name}
        </h3>
        
        <div className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 mb-6 bg-white/40 dark:bg-black/20 p-2 rounded-xl backdrop-blur-sm border border-white/30 dark:border-slate-700/50 w-fit">
          <Briefcase className="w-4 h-4 ml-2 text-emerald-500" />
          {/* 💡 نمایش نام ترجمه شده */}
          <span className="line-clamp-1">{clientName}</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
          <div className={`flex items-center px-3 py-1.5 rounded-xl border text-xs font-bold backdrop-blur-sm shadow-sm ${statusConfig.classes}`}>
            <StatusIcon className="w-3.5 h-3.5 ml-1.5" />
            {statusConfig.label}
          </div>
          <div className="flex items-center text-xs font-bold text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 ml-1.5 text-indigo-400" />
            {project.startDate}
          </div>
        </div>
      </div>
    </motion.div>
  );
}