import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateUUID } from '../core/utils/uuid';

// 💡 اصلاح مسیر برای projectStore
import { useProjectStore } from '../features/projects/store/projectStore'; 

// 💡 نکته مهم: اگر financeStore و inventoryStore را هم در مسیرهای مشابهی (داخل features) ساخته‌اید، 
// باید مسیر آن‌ها را هم مثل بالا بنویسید. 
// اما اگر آن‌ها را در همان پوشه src/store ساخته‌اید، همین کدهای پایین برایشان درست است:
import { useFinanceStore } from './financeStore';
import { useInventoryStore } from './inventoryStore';
import { useLogisticsStore, INSURANCE_TYPE_LABELS } from './logisticsStore';
import { useContractStore, calculateRetentionAmount } from './contractStore';
import moment from 'moment-jalaali';

export type AlertType = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertCategory = 'CHEQUE' | 'INVENTORY' | 'CUSTOM' | 'PROJECT' | 'INSURANCE' | 'LOGISTICS' | 'CONTRACT';

export interface Alert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  title: string;
  description: string;
  date: string;
  isRead: boolean;
  isArchived: boolean;
  actionText?: string;
}

interface AlertState {
  alerts: Alert[];
  addCustomAlert: (alert: Omit<Alert, 'id' | 'isRead' | 'isArchived'>) => void;
  markAsRead: (id: string) => void;
  archiveAlert: (id: string) => void;
  unarchiveAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  
  // 💎 موتور اسکنر هوشمند
  scanSystemAlerts: () => void;
}

// توابع کمکی برای محاسبات تاریخ شمسی با moment-jalaali
const getTodayShamsi = () => {
  return moment().format('jYYYY/jMM/jDD');
};

const getDaysDiff = (futureDateStr: string) => {
  try {
    const todayMom = moment().startOf('day');
    const futureMom = moment(futureDateStr, 'jYYYY/jMM/jDD').startOf('day');
    return futureMom.diff(todayMom, 'days');
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
          id: generateUUID(),
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

      unarchiveAlert: (id) => set((state) => ({
        alerts: state.alerts.map(a => a.id === id ? { ...a, isArchived: false } : a)
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
        const { items, batches } = useInventoryStore.getState(); // دریافت دیتای زنده اقلام و پارت‌های انبار مرکزی
        const currentAlerts = get().alerts;
        const newAutoAlerts: Alert[] = [];
        const today = getTodayShamsi();

        // -------------------------------------------------------------
        // -------------------------------------------------------------
        // ۱. اسکنر جامع انبار مرکزی (موجودی صفر، حداقل، حداکثر و تاریخ انقضا)
        // -------------------------------------------------------------
        (items || []).forEach((item) => {
          const unitLabel = item.displayUnit || item.baseUnit || item.primaryUnit || 'واحد';

          // ۱-الف: هشدار بحرانی موجودی صفر (Out of Stock)
          if (item.currentStock === 0) {
            const zeroAlertId = `auto-inv-zero-${item.id}`;
            if (!currentAlerts.find(a => a.id === zeroAlertId)) {
              newAutoAlerts.push({
                id: zeroAlertId,
                type: 'CRITICAL',
                category: 'INVENTORY',
                title: `موجودی صفر در انبار`,
                description: `موجودی کالای "${item.name}" کاملاً به پایان رسیده است (۰ ${unitLabel}).`,
                date: today,
                isRead: false,
                isArchived: false,
                actionText: 'ثبت خرید فوری',
              });
            }
          } 
          // ۱-ب: هشدار حداقل موجودی و نقطه سفارش (minStockLevel)
          else if (item.currentStock <= (item.minStockLevel || 10)) {
            const minAlertId = `auto-inv-min-${item.id}`;
            if (!currentAlerts.find(a => a.id === minAlertId)) {
              newAutoAlerts.push({
                id: minAlertId,
                type: 'WARNING',
                category: 'INVENTORY',
                title: `هشدار کسری انبار (نقطه سفارش)`,
                description: `موجودی "${item.name}" به کمتر از حد نصاب رسیده است (${item.currentStock} از حداقل ${item.minStockLevel || 10} ${unitLabel}).`,
                date: today,
                isRead: false,
                isArchived: false,
                actionText: 'ثبت فاکتور خرید',
              });
            }
          }

          // ۱-ج: هشدار حداکثر موجودی و انباشت کالا (maxStockLevel)
          if (item.maxStockLevel && item.currentStock > item.maxStockLevel) {
            const maxAlertId = `auto-inv-max-${item.id}`;
            if (!currentAlerts.find(a => a.id === maxAlertId)) {
              newAutoAlerts.push({
                id: maxAlertId,
                type: 'INFO',
                category: 'INVENTORY',
                title: `هشدار تکمیل سقف انبار`,
                description: `موجودی "${item.name}" از سقف تعیین‌شده فراتر رفته است (${item.currentStock} از سقف ${item.maxStockLevel} ${unitLabel}).`,
                date: today,
                isRead: false,
                isArchived: false,
                actionText: 'مشاهده کاردکس',
              });
            }
          }
        });

        // ۱-د: اسکنر تاریخ انقضای پارت‌ها (Batches / Lots) در بازه‌های ۱۰، ۵، ۳، ۲، ۱ و روز انقضا
        (batches || []).forEach((batch) => {
          if (batch.expirationDate && batch.remainingQtyBase > 0) {
            const diff = getDaysDiff(batch.expirationDate);
            const parentItem = (items || []).find(it => it.id === batch.itemId);
            const itemName = parentItem?.name || 'کالای انبار';
            const unitLabel = parentItem?.baseUnit || parentItem?.primaryUnit || 'واحد';

            if (diff <= 0) {
              const expAlertId = `auto-batch-expired-${batch.id}`;
              if (!currentAlerts.find(a => a.id === expAlertId)) {
                newAutoAlerts.push({
                  id: expAlertId,
                  type: 'CRITICAL',
                  category: 'INVENTORY',
                  title: `هشدار انقضای مصالح در انبار`,
                  description: `پارت "${batch.batchNumber || batch.id}" از کالای "${itemName}" منقضی شده است (${batch.remainingQtyBase.toLocaleString('fa-IR')} ${unitLabel} باقیمانده).`,
                  date: today,
                  isRead: false,
                  isArchived: false,
                  actionText: 'ثبت ضایعات / مرجوعی',
                });
              }
            } else if (diff <= 10) {
              const expWarnAlertId = `auto-batch-exp-warn-${batch.id}-${diff}`;
              if (!currentAlerts.find(a => a.id === expWarnAlertId)) {
                newAutoAlerts.push({
                  id: expWarnAlertId,
                  type: diff <= 3 ? 'CRITICAL' : 'WARNING',
                  category: 'INVENTORY',
                  title: `هشدار نزدیک شدن به تاریخ انقضا`,
                  description: `تنها ${diff} روز تا انقضای پارت "${batch.batchNumber || batch.id}" از کالای "${itemName}" باقی مانده است (${batch.remainingQtyBase.toLocaleString('fa-IR')} ${unitLabel}).`,
                  date: today,
                  isRead: false,
                  isArchived: false,
                  actionText: 'اولویت خروج فوری',
                });
              }
            }
          }
        });
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

        // -------------------------------------------------------------
        // ۴. اسکنر سررسید انقضای بیمه‌نامه و اقساط ناوگان (logisticsStore)
        // -------------------------------------------------------------
        const { insurances, vehicles } = useLogisticsStore.getState();

        (insurances || []).forEach(ins => {
          const vehicle = vehicles.find(v => v.id === ins.vehicleId);
          const vehicleName = vehicle?.name || 'خودرو / دستگاه';
          const vehiclePlate = vehicle?.plate || 'بدون پلاک';
          const insTypeTitle = INSURANCE_TYPE_LABELS[ins.insuranceType] || ins.insuranceType;

          // ۴.۱ هشدارهای پایان اعتبار کل بیمه‌نامه
          if (ins.endDate) {
            const daysLeft = getDaysDiff(ins.endDate);
            const shouldAlert = ins.paymentMode === 'LUMP_SUM'
              ? [10, 5, 3, 1, 0].includes(daysLeft)
              : [5, 2, 1, 0].includes(daysLeft);

            if (shouldAlert) {
              const alertId = `auto-ins-expiry-${ins.id}-${daysLeft}`;
              if (!currentAlerts.find(a => a.id === alertId)) {
                newAutoAlerts.push({
                  id: alertId,
                  type: 'CRITICAL',
                  category: 'INSURANCE',
                  title: `سررسید انقضای بیمه‌نامه (${daysLeft === 0 ? 'امروز' : `${daysLeft} روز دیگر`})`,
                  description: `بیمه‌نامه ${ins.companyName} (${insTypeTitle}) برای خودروی «${vehicleName}» (پلاک: ${vehiclePlate}) در تاریخ ${ins.endDate} منقضی می‌شود.`,
                  date: today,
                  isRead: false,
                  isArchived: false,
                  actionText: 'تمدید بیمه‌نامه',
                });
              }
            }
          }

          // ۴.۲ هشدارهای سررسید اقساط پرداخت‌نشده
          if (ins.paymentMode === 'INSTALLMENT' && ins.installments) {
            ins.installments.forEach(inst => {
              if (!inst.isPaid && inst.dueDate) {
                const daysLeft = getDaysDiff(inst.dueDate);
                if ([5, 2, 1, 0].includes(daysLeft)) {
                  const alertId = `auto-ins-inst-${ins.id}-${inst.id}-${daysLeft}`;
                  if (!currentAlerts.find(a => a.id === alertId)) {
                    newAutoAlerts.push({
                      id: alertId,
                      type: 'WARNING',
                      category: 'INSURANCE',
                      title: `یادآوری سررسید قسط بیمه (${daysLeft === 0 ? 'امروز' : `${daysLeft} روز دیگر`})`,
                      description: `قسط شماره ${inst.installmentNumber} بیمه ${ins.companyName} برای خودروی «${vehicleName}» (پلاک: ${vehiclePlate}) به مبلغ ${(inst.amount).toLocaleString('fa-IR')} تومان در تاریخ ${inst.dueDate} سررسید می‌شود.`,
                      date: today,
                      isRead: false,
                      isArchived: false,
                      actionText: 'ثبت پرداخت قسط',
                    });
                  }
                }
              }
            });
          }
        });

        // -------------------------------------------------------------
        // ۵. اسکنر سرویس‌های دوره‌ای ناوگان (logisticsStore)
        // -------------------------------------------------------------
        const { periodicServices } = useLogisticsStore.getState();

        (periodicServices || []).forEach(record => {
          const vehicle = vehicles.find(v => v.id === record.vehicleId);
          const vehicleName = vehicle?.name || 'خودرو / دستگاه';
          const vehiclePlate = vehicle?.plate || 'بدون پلاک';
          const vehicleOdometer = vehicle?.odometerOrHours || record.currentOdometer || 0;

          (record.services || []).forEach(svc => {
            // ۵.۱ هشدار مبتنی بر تاریخ سررسید (۱۰، ۵، ۳، ۲، ۱، ۰ روز)
            if (svc.nextDueDate) {
              const daysLeft = getDaysDiff(svc.nextDueDate);
              if ([10, 5, 3, 2, 1, 0].includes(daysLeft)) {
                const alertId = `auto-periodic-date-${record.id}-${svc.id}-${daysLeft}`;
                if (!currentAlerts.find(a => a.id === alertId)) {
                  newAutoAlerts.push({
                    id: alertId,
                    type: daysLeft <= 2 ? 'CRITICAL' : 'WARNING',
                    category: 'LOGISTICS',
                    title: `یادآوری سرویس دوره‌ای خودرو (${daysLeft === 0 ? 'امروز' : `${daysLeft} روز دیگر`})`,
                    description: `موعد انجام «${svc.serviceType}» برای خودروی «${vehicleName}» (پلاک: ${vehiclePlate}) در تاریخ ${svc.nextDueDate} فرا می‌رسد.`,
                    date: today,
                    isRead: false,
                    isArchived: false,
                    actionText: 'ثبت سرویس دوره‌ای',
                  });
                }
              }
            }

            // ۵.۲ هشدار مبتنی بر کیلومتر (رسیدن به ۹۰٪ کیلومتر هدف)
            if (svc.nextDueKm && vehicleOdometer > 0) {
              const thresholdKm = Math.round(svc.nextDueKm * 0.9);
              if (vehicleOdometer >= thresholdKm) {
                const isOverdue = vehicleOdometer >= svc.nextDueKm;
                const alertId = `auto-periodic-km-${record.id}-${svc.id}-${isOverdue ? 'over' : '90'}`;
                if (!currentAlerts.find(a => a.id === alertId)) {
                  newAutoAlerts.push({
                    id: alertId,
                    type: isOverdue ? 'CRITICAL' : 'WARNING',
                    category: 'LOGISTICS',
                    title: isOverdue ? 'هشدار انقضای کیلومتر سرویس دوره‌ای' : 'هشدار کارکرد ۹۰٪ سرویس دوره‌ای',
                    description: `کارکرد خودروی «${vehicleName}» (${vehicleOdometer.toLocaleString('fa-IR')} کیلومتر) به محدوده سرویس «${svc.serviceType}» (کیلومتر هدف: ${svc.nextDueKm.toLocaleString('fa-IR')}) رسیده است.`,
                    date: today,
                    isRead: false,
                    isArchived: false,
                    actionText: 'بررسی سرویس دوره‌ای',
                  });
                }
              }
            }
          });
        });

        // -------------------------------------------------------------
        // ۶. اسکنر هوشمند قراردادها (پایان مهلت، آزادسازی حسن انجام کار و تضامین)
        // -------------------------------------------------------------
        try {
          const { contracts } = useContractStore.getState();
          (contracts || []).forEach(contract => {
            if (contract.status === 'ACTIVE') {
              // ۶-الف: اسکن تاریخ پایان قرارداد
              const endDate = contract.currentEndDate || contract.initialEndDate;
              if (endDate) {
                const daysLeft = getDaysDiff(endDate);
                if (daysLeft <= 0) {
                  const endAlertId = `auto-contract-expired-${contract.id}`;
                  if (!currentAlerts.find(a => a.id === endAlertId)) {
                    newAutoAlerts.push({
                      id: endAlertId,
                      type: 'CRITICAL',
                      category: 'CONTRACT',
                      title: `هشدار انقضای مهلت قرارداد`,
                      description: `مهلت قرارداد "${contract.title}" (شماره: ${contract.contractNumber}) در تاریخ ${endDate} به پایان رسیده است. نیاز به تمدید متمم یا تسویه نهایی.`,
                      date: today,
                      isRead: false,
                      isArchived: false,
                      actionText: 'مشاهده و ثبت الحاقیه',
                    });
                  }
                } else if (daysLeft <= 15) {
                  const endWarnAlertId = `auto-contract-end-warn-${contract.id}-${daysLeft}`;
                  if (!currentAlerts.find(a => a.id === endWarnAlertId)) {
                    newAutoAlerts.push({
                      id: endWarnAlertId,
                      type: daysLeft <= 5 ? 'CRITICAL' : 'WARNING',
                      category: 'CONTRACT',
                      title: `یادآوری نزدیک شدن به پایان قرارداد (${daysLeft} روز)`,
                      description: `تنها ${daysLeft} روز تا سررسید اتمام قرارداد "${contract.title}" (طرف حساب: ${contract.partyName}) باقی مانده است.`,
                      date: today,
                      isRead: false,
                      isArchived: false,
                      actionText: 'بررسی قرارداد',
                    });
                  }
                }
              }

              // ۶-ب: اسکن سررسید آزادسازی سپرده حسن انجام کار
              if (!contract.retentionReleased && contract.retentionReleaseDate && contract.retentionPercent > 0) {
                const daysToRelease = getDaysDiff(contract.retentionReleaseDate);
                const retentionAmount = calculateRetentionAmount(contract);
                if (daysToRelease <= 0) {
                  const retAlertId = `auto-retention-due-${contract.id}`;
                  if (!currentAlerts.find(a => a.id === retAlertId)) {
                    newAutoAlerts.push({
                      id: retAlertId,
                      type: 'CRITICAL',
                      category: 'CONTRACT',
                      title: `موعد آزادسازی سپرده حسن انجام کار`,
                      description: `تاریخ آزادسازی سپرده حسن انجام کار قرارداد "${contract.title}" (${retentionAmount.toLocaleString('fa-IR')} تومان - ${contract.retentionPercent}٪) فرا رسیده است.`,
                      date: today,
                      isRead: false,
                      isArchived: false,
                      actionText: 'آزادسازی سپرده',
                    });
                  }
                } else if (daysToRelease <= 15) {
                  const retWarnAlertId = `auto-retention-warn-${contract.id}-${daysToRelease}`;
                  if (!currentAlerts.find(a => a.id === retWarnAlertId)) {
                    newAutoAlerts.push({
                      id: retWarnAlertId,
                      type: 'WARNING',
                      category: 'CONTRACT',
                      title: `نزدیک شدن به موعد آزادسازی سپرده حسن انجام کار`,
                      description: `${daysToRelease} روز تا تاریخ سررسید آزادسازی سپرده حسن انجام کار قرارداد "${contract.title}" (مبلغ: ${retentionAmount.toLocaleString('fa-IR')} تومان) باقی مانده است.`,
                      date: today,
                      isRead: false,
                      isArchived: false,
                      actionText: 'مشاهده پرونده',
                    });
                  }
                }
              }

              // ۶-ج: اسکن تضامین باز (چک‌های صیادی و سفته‌های در جریان ضمانت)
              (contract.guarantees || []).forEach(g => {
                if (g.status === 'HELD' && g.dueDate) {
                  const daysToGuar = getDaysDiff(g.dueDate);
                  if (daysToGuar <= 10) {
                    const guarAlertId = `auto-guarantee-due-${g.id}-${daysToGuar}`;
                    if (!currentAlerts.find(a => a.id === guarAlertId)) {
                      newAutoAlerts.push({
                        id: guarAlertId,
                        type: daysToGuar <= 3 ? 'CRITICAL' : 'WARNING',
                        category: 'CONTRACT',
                        title: `سررسید ضمانت‌نامه / چک قرارداد (${daysToGuar <= 0 ? 'امروز' : `${daysToGuar} روز دیگر`})`,
                        description: `موعد ${g.type === 'CHEQUE' ? 'چک صیادی' : g.type === 'PROMISSORY_NOTE' ? 'سفته' : 'ضمانت‌نامه'} قرارداد "${contract.title}" به مبلغ ${g.amount.toLocaleString('fa-IR')} تومان در تاریخ ${g.dueDate} فرا می‌رسد.`,
                        date: today,
                        isRead: false,
                        isArchived: false,
                        actionText: 'تعیین تکلیف ضمانت',
                      });
                    }
                  }
                }
              });
            }
          });
        } catch (e) {
          console.warn('Contracts alert scan skipped:', e);
        }

        // اضافه کردن هشدارهای جدید
        if (newAutoAlerts.length > 0) {
          set((state) => ({
            alerts: [...newAutoAlerts, ...state.alerts]
          }));
        }
      }
    }),
    { name: 'alerts-storage' }
  )
);