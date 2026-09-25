import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, ContractType } from '../types/project.types';
import type { LaborRecord } from '../types/core.types';

export const rialToToman = (rialAmount: number | undefined): number => {
  if (!rialAmount) return 0;
  return Math.floor(rialAmount / 10);
};

// 💡 اینترفیس‌های قدیمی (خرید، لجستیک و نیرو) رو برای جلوگیری از ارور تایپ‌اسکریپت در فایل‌های دیگه نگه داشتم، اما توابعشون حذف شدن.
export interface PurchaseRecord {
  id: string; projectId: string; phaseId?: string; source: 'MARKET' | 'INVENTORY'; 
  title: string; vendor: string; date: string; quantity: number; unit: string;
  internalCost: number; billedCost: number; hasTransport?: boolean; transportInternalCost?: number; transportBilledCost?: number;
}

export interface LogisticsRecord {
  id: string; projectId: string; phaseId?: string; type: 'TRANSPORT' | 'EQUIPMENT'; 
  source: 'EXTERNAL' | 'INTERNAL'; title: string; provider: string; vehicleInfo?: string; 
  date: string; internalCost: number; billedCost: number; driverWage?: number; 
}

export interface ConsumeRecord {
  id: string;
  projectId: string;
  phaseId?: string;
  itemId: string;
  title: string;
  date: string;
  quantity: number;
  unit: string;
  reason: 'USE' | 'WASTE' | 'TRANSFER';
  isBillable: boolean;             
  destinationProjectId?: string;   
  internalCost: number;            
  billedCost: number;              
  note?: string;
}

// 💡 اینترفیس تنخواه‌گردان کارگاه
export interface PettyCashRecord {
  id: string;
  projectId: string;
  title: string;
  amount: number;
  date: string;
  category?: string;
  receiptImage?: string; 
  excludeFromTotal?: boolean; 
}

// 💡 اینترفیس پیشرفته برای بایگانی اسناد و نقشه‌ها
export interface ArchiveRecord {
  id: string;
  projectId: string;
  name: string;
  type: 'IMAGE' | 'PDF' | 'DOCUMENT';
  size: string;
  date: string;
  folder?: string;
  base64Data: string; 
  note?: string;      
  revision?: string;  
  tags?: string;      
}

interface ProjectState {
  projects: any[]; 
  addProject: (projectData: any) => void; 
  updateProject: (id: string, data: Partial<any>) => void;
  deleteProject: (id: string) => void;
  toggleProjectPin: (id: string) => void;
  
  // 💡 متدهای خرید، نیروی کار و لجستیک حذف شدند (منتقل شده به Store های مستقل)

  addConsumeRecord: (projectId: string, record: Omit<ConsumeRecord, 'id' | 'projectId'>) => void;
  updateConsumeRecord: (projectId: string, recordId: string, updatedData: Partial<ConsumeRecord>) => void;
  deleteConsumeRecord: (projectId: string, recordId: string) => void;

  // متدهای مدیریت تنخواه
  addPettyCashRecord: (projectId: string, record: Omit<PettyCashRecord, 'id' | 'projectId'>) => void;
  updatePettyCashRecord: (projectId: string, recordId: string, updatedData: Partial<PettyCashRecord>) => void;
  deletePettyCashRecord: (projectId: string, recordId: string) => void;

  // متدهای غول‌پیکر بایگانی اسناد
  addArchiveRecord: (projectId: string, record: Omit<ArchiveRecord, 'id' | 'projectId'>) => void;
  updateArchiveRecord: (projectId: string, recordId: string, updatedData: Partial<ArchiveRecord>) => void;
  deleteArchiveRecord: (projectId: string, recordId: string) => void;
  deleteMultipleArchiveRecords: (projectId: string, recordIds: string[]) => void; 

  recalculateProjectFinancials: (projectId: string) => void;
  startNewPhase: (projectId: string, contractType: ContractType, startDate: string) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      
      addProject: (projectData) => set((state) => {
        const newProject = {
          ...projectData,
          id: crypto.randomUUID(),
          financials: projectData.financials || { totalExpenditure: 0, estimatedProfit: 0 },
          phases: projectData.phases || [],
          consumptions: [], 
          inventory: [], 
          pettyCash: [], // مقداردهی اولیه صندوق تنخواه
          archive: [],   // مقداردهی اولیه بایگانی
          // 💡 آرایه‌های سنگین purchases, laborRecords و logistics برای همیشه حذف شدند 🚀
        };
        return { projects: [...state.projects, newProject] };
      }),
      
      updateProject: (id, data) => set((state) => ({
        projects: state.projects.map(p => p.id === id ? { ...p, ...data } : p)
      })),
      
      deleteProject: (id) => set((state) => ({
        projects: state.projects.filter(p => p.id !== id)
      })),
      
      toggleProjectPin: (id) => set((state) => ({
        projects: state.projects.map(p => p.id === id ? { ...p, isPinned: !p.isPinned } : p)
      })),

      // ==========================================
      // توابع انبار، تنخواه و بایگانی
      // ==========================================

      addConsumeRecord: (projectId, record) => {
        set((state) => ({
          projects: state.projects.map(p => p.id === projectId ? { ...p, consumptions: [...(p.consumptions || []), { ...record, id: crypto.randomUUID(), projectId }] } : p)
        }));
        get().recalculateProjectFinancials(projectId);
      },
      updateConsumeRecord: (projectId, recordId, updatedData) => {
        set((state) => ({
          projects: state.projects.map(p => p.id === projectId ? { ...p, consumptions: p.consumptions?.map((r: any) => r.id === recordId ? { ...r, ...updatedData } : r) || [] } : p)
        }));
        get().recalculateProjectFinancials(projectId);
      },
      deleteConsumeRecord: (projectId, recordId) => {
        set((state) => ({
          projects: state.projects.map(p => p.id === projectId ? { ...p, consumptions: p.consumptions?.filter((r: any) => r.id !== recordId) || [] } : p)
        }));
        get().recalculateProjectFinancials(projectId);
      },

      addPettyCashRecord: (projectId, record) => {
        set((state) => ({
          projects: state.projects.map(p => p.id === projectId ? { ...p, pettyCash: [...(p.pettyCash || []), { ...record, id: crypto.randomUUID(), projectId }] } : p)
        }));
        get().recalculateProjectFinancials(projectId);
      },
      updatePettyCashRecord: (projectId, recordId, updatedData) => {
        set((state) => ({
          projects: state.projects.map(p => p.id === projectId ? { ...p, pettyCash: p.pettyCash?.map((r: any) => r.id === recordId ? { ...r, ...updatedData } : r) || [] } : p)
        }));
        get().recalculateProjectFinancials(projectId);
      },
      deletePettyCashRecord: (projectId, recordId) => {
        set((state) => ({
          projects: state.projects.map(p => p.id === projectId ? { ...p, pettyCash: p.pettyCash?.filter((r: any) => r.id !== recordId) || [] } : p)
        }));
        get().recalculateProjectFinancials(projectId);
      },

      addArchiveRecord: (projectId, record) => {
        set((state) => ({
          projects: state.projects.map(p => p.id === projectId ? { ...p, archive: [...(p.archive || []), { ...record, id: crypto.randomUUID(), projectId }] } : p)
        }));
      },
      updateArchiveRecord: (projectId, recordId, updatedData) => {
        set((state) => ({
          projects: state.projects.map(p => p.id === projectId ? { ...p, archive: p.archive?.map((r: any) => r.id === recordId ? { ...r, ...updatedData } : r) || [] } : p)
        }));
      },
      deleteArchiveRecord: (projectId, recordId) => {
        set((state) => ({
          projects: state.projects.map(p => p.id === projectId ? { ...p, archive: p.archive?.filter((r: any) => r.id !== recordId) || [] } : p)
        }));
      },
      deleteMultipleArchiveRecords: (projectId, recordIds) => {
        set((state) => ({
          projects: state.projects.map(p => p.id === projectId ? { ...p, archive: p.archive?.filter((r: any) => !recordIds.includes(r.id)) || [] } : p)
        }));
      },

      // 💡 تابع محاسبه مجدد ساده‌سازی شد (چون هزینه‌های اصلی حالا از استورهای مستقل داینامیک محاسبه میشن)
      recalculateProjectFinancials: (projectId) => set((state) => ({
        projects: state.projects.map(p => {
          if (p.id === projectId) {
            const phasesExpenditure = p.phases?.reduce((total: number, phase: any) => total + (phase.financials?.expenditure || 0), 0) || 0;
            
            const pettyCashCost = p.pettyCash?.reduce((total: number, r: any) => {
              if (r.excludeFromTotal) return total; 
              return total + (r.amount || 0);
            }, 0) || 0;

            let consumptionsCost = 0;
            let consumptionsBilled = 0;

            if (p.consumptions) {
              p.consumptions.forEach((c: ConsumeRecord) => {
                if (c.reason === 'TRANSFER') {
                  consumptionsCost -= (c.internalCost || 0);
                  consumptionsBilled -= (c.billedCost || 0);
                } else if (c.reason === 'WASTE' && !c.isBillable) {
                  consumptionsBilled -= (c.billedCost || 0);
                }
              });
            }

            const totalInternalExpenditure = phasesExpenditure + pettyCashCost + consumptionsCost;
            const totalBilledExpenditure = phasesExpenditure + pettyCashCost + consumptionsBilled;
            const estimatedProfit = totalBilledExpenditure - totalInternalExpenditure;

            return {
              ...p,
              financials: {
                ...p.financials,
                totalExpenditure: totalInternalExpenditure,
                estimatedProfit: estimatedProfit
              }
            };
          }
          return p;
        })
      })),

      startNewPhase: (projectId, contractType, startDate) => set((state) => ({
        projects: state.projects.map(p => {
          if (p.id === projectId) {
            const updatedPhases = p.phases.map((phase: any) => ({
              ...phase,
              isCompleted: true,
              phaseStatus: 'COMPLETED' as const
            }));

            const newPhaseNumber = updatedPhases.length + 1;
            const newPhaseItem = {
              id: crypto.randomUUID(),
              name: `فاز ${newPhaseNumber}`,
              description: `شروع شده در تاریخ ${startDate}`,
              isCompleted: false,
              contractType: contractType,
              photos: [],
              financials: { expenditure: 0 },
              phaseStatus: 'IN_PROGRESS' as const,
              area: 0, length: 0, width: 0, height: 0,
              unitPrice: 0, contractorPercentage: 0, fixedPrice: 0
            };

            return { ...p, phases: [...updatedPhases, newPhaseItem] };
          }
          return p;
        })
      }))
    }),
    { name: 'project-storage' }
  )
);