import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 💡 اصلاح مسیر برای projectStore
import { useProjectStore } from '../features/projects/store/projectStore'; 

// 💡 نکته مهم: اگر financeStore و inventoryStore را هم در مسیرهای مشابهی (داخل features) ساخته‌اید، 
// باید مسیر آن‌ها را هم مثل بالا بنویسید. 
// اما اگر آن‌ها را در همان پوشه src/store ساخته‌اید، همین کدهای پایین برایشان درست است:
import { useFinanceStore } from './financeStore';
import { useInventoryStore } from './inventoryStore';
export type AlertType = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertCategory = 'CHEQUE' | 'INVENTORY' | 'CUSTOM' | 'PROJECT';

export interface Alert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  title: string;
  description: string;
  date: string;
  createdAt?: string;
  isRead: boolean;
  isArchived: boolean;
  actionText?: string;
}

interface AlertState {
  alerts: Alert[];
  addCustomAlert: (alert: Omit<Alert, 'id' | 'isRead' | 'isArchived'>) => void;
  markAsRead: (id: string) => void;
  archiveAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  
  // 💎 موتور اسکنر هوشمند
  scanSystemAlerts: () => void;
}

// توابع کمکی برای محاسبات تاریخ شمسی
const getTodayShamsi = () => {
  return new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(new Date());
};

const getDaysDiff = (futureDateStr: string) => {
  try {
    const today = getTodayShamsi().split('/').map(Number);
    const future = futureDateStr.split('/').map(Number);
    const todayDays = (today[0] * 365) + (today[1] * 30) + today[2];
    const futureDays = (future[0] * 365) + (future[1] * 30) + future[2];
    return futureDays - todayDays;
  } catch (e) {
    return 999; 
  }
};

export const useAlertStore = create<AlertState>()(
  persist(
    (set, get) => ({
      alerts: [],

      addCustomAlert: (alertData) => set((state) => ({
        alerts: [{
          ...alertData,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          isRead: false,
          isArchived: false,
        }, ...state.alerts]
      })),

      markAsRead: (id) => set((state) => ({
        alerts: state.alerts.map(a => a.id === id ? { ...a, isRead: true } : a)
      })),

      archiveAlert: (id) => set((state) => ({
        alerts: state.alerts.map(a => a.id === id ? { ...a, isArchived: true, isRead: true } : a)
      })),

      deleteAlert: (id) => set((state) => ({
        alerts: state.alerts.filter(a => a.id !== id)
      })),

      // ====================================================================
      // 💎 موتور اسکنر هوشمند سیستم 
      // ====================================================================
      scanSystemAlerts: () => {
        const { projects } = useProjectStore.getState();
        const { transactions } = useFinanceStore.getState();
        const { materials } = useInventoryStore.getState(); // 💡 دریافت دیتای زنده انبار مرکزی
        const currentAlerts = get().alerts;
        const newAutoAlerts: Alert[] = [];
        const today = getTodayShamsi();

        // -------------------------------------------------------------
        // ۱. اسکنر انبار مرکزی (متریال‌های پایه)
        // -------------------------------------------------------------
        materials.forEach((material) => {
          const ALERT_THRESHOLD = 50; // خط قرمز انبار
          
          if (material.currentStock < ALERT_THRESHOLD) {
            const alertId = `auto-inv-global-${material.id}`; 
            if (!currentAlerts.find(a => a.id === alertId)) {
              newAutoAlerts.push({
                id: alertId,
                type: material.currentStock === 0 ? 'CRITICAL' : 'WARNING',
                category: 'INVENTORY',
                title: `هشدار انبار مرکزی`,
                description: `موجودی "${material.name}" رو به اتمام است (${material.currentStock} ${material.unit} باقیمانده).`,
                date: today,
                isRead: false,
                isArchived: false,
                actionText: 'ثبت فاکتور خرید',
              });
            }
          }
        });

        // -------------------------------------------------------------
        // ۲. اسکنر انبار پروژه‌ها (خریدها و مصارف اختصاصی هر پروژه)
        // -------------------------------------------------------------
        projects.forEach(project => {
          const inventoryMap = new Map<string, { qty: number, unit: string }>();

          project.purchases?.forEach((p: any) => {
            if (p.source === 'MARKET') {
              const existing = inventoryMap.get(p.title) || { qty: 0, unit: p.unit };
              inventoryMap.set(p.title, { qty: existing.qty + p.quantity, unit: p.unit });
            }
          });

          project.consumptions?.forEach((c: any) => {
            const existing = inventoryMap.get(c.title);
            if (existing) {
              inventoryMap.set(c.title, { qty: existing.qty - c.quantity, unit: existing.unit });
            }
          });

          inventoryMap.forEach((data, itemName) => {
            const ALERT_THRESHOLD = 50; 
            if (data.qty < ALERT_THRESHOLD && data.qty > 0) {
              const alertId = `auto-inv-proj-${project.id}-${itemName}`; 
              if (!currentAlerts.find(a => a.id === alertId)) {
                newAutoAlerts.push({
                  id: alertId,
                  type: 'WARNING',
                  category: 'INVENTORY',
                  title: `هشدار متریال: ${project.name || 'پروژه'}`,
                  description: `موجودی "${itemName}" در پروژه به مرز هشدار رسیده است (${data.qty} ${data.unit}).`,
                  date: today,
                  isRead: false,
                  isArchived: false,
                  actionText: 'مدیریت انبار',
                });
              }
            }
          });
        });

        // -------------------------------------------------------------
        // ۳. اسکنر امور مالی و چک‌ها (اسکن تایم‌لاین)
        // -------------------------------------------------------------
        transactions.forEach(tx => {
          if (tx.type === 'CHEQUE' && tx.chequeDetails && tx.chequeDetails.status === 'PENDING' && tx.chequeDetails.dueDate) {
            const daysLeft = getDaysDiff(tx.chequeDetails.dueDate);
            
            if (daysLeft >= 0 && daysLeft <= 5) {
              const alertId = `auto-cheque-${tx.id}-${daysLeft}`; 
              
              if (!currentAlerts.find(a => a.id === alertId)) {
                const type: AlertType = daysLeft <= 1 ? 'CRITICAL' : 'WARNING';
                const directionText = tx.direction === 'IN' ? 'دریافتی' : 'پرداختی';
                
                newAutoAlerts.push({
                  id: alertId,
                  type: type,
                  category: 'CHEQUE',
                  title: `سررسید چک ${directionText} (${daysLeft === 0 ? 'امروز' : `${daysLeft} روز دیگر`})`,
                  description: `چک به مبلغ ${(tx.amount).toLocaleString('fa-IR')} تومان در تاریخ ${tx.chequeDetails.dueDate} سررسید می‌شود.`,
                  date: today,
                  isRead: false,
                  isArchived: false,
                  actionText: 'مشاهده تراکنش',
                });
              }
            }
          }
        });

        // اضافه کردن هشدارهای جدید
        if (newAutoAlerts.length > 0) {
          set((state) => ({
            alerts: [...newAutoAlerts.map(a => ({ ...a, createdAt: new Date().toISOString() })), ...state.alerts]
          }));
        }
      }
    }),
    { name: 'alerts-storage' }
  )
);