import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ایمپورت استورهای مالی و پروژه جهت پیاده‌سازی منطق Data Mirroring
import { useProjectStore } from '../features/projects/store/projectStore';
import { useFinanceStore } from './financeStore';

export interface ClientProfile {
  id: string;
  name: string;
  phone: string;
  nationalId: string; // کد ملی یا کد اقتصادی
  address?: string;
}

interface FinancialSummary {
  activeProjectsCount: number;
  totalReceived: number;       // مجموع مبالغ دریافتی از کارفرما (تراکنش‌های IN مربوط به پروژه‌های او)
  totalPaid: number;           // مجموع هزینه‌های انجام شده در پروژه‌های او (تراکنش‌های OUT)
  pendingChequesValue: number; // مجموع چک‌های دریافتی پاس‌نشده کارفرما
  finalBalance: number;        // تراز نهایی (دریافتی‌ها منهای پرداختی‌ها)
}

interface CRMState {
  clients: ClientProfile[];
  addClient: (client: Omit<ClientProfile, 'id'>) => void;
  updateClient: (id: string, data: Partial<ClientProfile>) => void;
  deleteClient: (id: string) => void;
  
  // تابع مادر و ویژه حسابداری برای تحلیل تراز مالی کل کارفرما از روی هسته مالی
  getClientFinancialSummary: (clientId: string) => FinancialSummary;
}

export const useCRMStore = create<CRMState>()(
  persist(
    (set, get) => ({
      clients: [],

      addClient: (client) => set((state) => ({
        clients: [...state.clients, { ...client, id: crypto.randomUUID() }]
      })),

      updateClient: (id, data) => set((state) => ({
        clients: state.clients.map(c => c.id === id ? { ...c, ...data } : c)
      })),

      deleteClient: (id) => set((state) => ({
        clients: state.clients.filter(c => c.id !== id)
      })),

      // منطق هوشمند آینه‌سازی داده‌ها (Data Mirroring Logic)
      getClientFinancialSummary: (clientId) => {
        // ۱. دریافت پروژه‌های متعلق به این کارفرما از استور پروژه
        const allProjects = useProjectStore.getState().projects || [];
        const clientProjects = allProjects.filter(p => p.clientId === clientId);
        const activeProjectsCount = clientProjects.filter(p => p.status === 'IN_PROGRESS').length;

        // استخراج آیدی پروژه‌ها برای فیلتر تراکنش‌ها
        const projectIds = clientProjects.map(p => p.id);

        // ۲. دریافت تمام تراکنش‌های متصل به پروژه‌های این کارفرما از هسته مالی
        const allTransactions = useFinanceStore.getState().transactions || [];
        const clientTransactions = allTransactions.filter(t => projectIds.includes(t.referenceId));

        let totalReceived = 0;
        let totalPaid = 0;
        let pendingChequesValue = 0;

        // ۳. محاسبات تراز مالی با یک بار پیمایش بهینه آرایه
        clientTransactions.forEach(t => {
          if (t.direction === 'IN') {
            totalReceived += t.amount;
          } else if (t.direction === 'OUT') {
            totalPaid += t.amount;
          }

          // سنجش ارزش چک‌های پاس نشده کارفرما
          if (t.type === 'CHEQUE' && t.chequeDetails?.status === 'PENDING') {
            pendingChequesValue += t.amount;
          }
        });

        // تراز نهایی کارفرما (طلب یا بدهی نهایی او به پیمانکار)
        const finalBalance = totalReceived - totalPaid;

        return {
          activeProjectsCount,
          totalReceived,
          totalPaid,
          pendingChequesValue,
          finalBalance
        };
      }
    }),
    { name: 'crm-storage' }
  )
);