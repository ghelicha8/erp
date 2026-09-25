import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ChequeStatus = 'PENDING' | 'CASHED' | 'CASH_SETTLED' | 'BOUNCED' | 'RETURNED' | 'EXCHANGED';
export type AllocationRecordType = 'NONE' | 'PURCHASE' | 'LABOR' | 'LOGISTICS' | 'INVOICE';

// 💡 اینترفیس جدید برای پشتیبانی از تخصیص‌های چندگانه و وصل شدن به خریدهای مختلف
export interface TransactionAllocation {
  id: string;
  amount: number;
  allocationType: 'PROJECT' | 'FREELANCE' | 'WALLET' | 'INVOICE';
  projectId?: string;
  phaseId?: string;
  recordType?: AllocationRecordType;
  recordId?: string;
  description?: string;
}

export interface ChequeHistory {
  id: string;
  date: string;
  previousStatus: ChequeStatus;
  newStatus: ChequeStatus;
  description?: string;
  attachments?: string[];
  snapshot?: any; 
}

export interface Transaction {
  id: string;
  referenceId: string;
  clientId?: string;
  projectId?: string;
  phaseId?: string;
  linkedPurchaseId?: string;
  allocations?: TransactionAllocation[]; // 💡 لیست تخصیص‌های جادویی
  isPurchaseSettlement?: boolean; 
  amount: number;
  date: string;
  createdAt?: string;
  description?: string;
  direction: 'IN' | 'OUT';
  type: 'CASH' | 'CHEQUE';
  attachments?: string[];
  textReceipt?: string;
  chequeDetails?: {
    issuer?: string;
    sayyadId?: string;
    serialNumber?: string;
    series?: string;
    bank?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    branch?: string;
    receiver?: string;
    issueDate?: string;
    dueDate?: string;
    status: ChequeStatus; 
    history: ChequeHistory[];
  };
}

interface FinanceState {
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  
  changeChequeStatus: (transactionId: string, newStatus: ChequeStatus, description?: string, date?: string, attachments?: string[]) => void;
  exchangeChequeForCash: (transactionId: string, cashAmount: number, date: string, description: string, attachments?: string[]) => void;
  deleteChequeHistory: (transactionId: string, historyId: string) => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      transactions: [],
      
      addTransaction: (tx) => set((state) => ({
        transactions: [...state.transactions, { ...tx, id: crypto.randomUUID(), createdAt: new Date().toISOString() }]
      })),
      
      updateTransaction: (id, data) => set((state) => ({
        transactions: state.transactions.map(t => (t.id === id ? { ...t, ...data } : t))
      })),
      
      deleteTransaction: (id) => set((state) => ({
        transactions: state.transactions.filter(t => t.id !== id)
      })),

      changeChequeStatus: (transactionId, newStatus, description, date = new Date().toLocaleDateString('fa-IR'), attachments = []) => {
        set((state) => ({
          transactions: state.transactions.map((t) => {
            if (t.id === transactionId && t.type === 'CHEQUE' && t.chequeDetails) {
              const previousStatus = t.chequeDetails.status;
              const { history, ...oldChequeDetails } = t.chequeDetails;
              const fullSnapshot = { ...oldChequeDetails, amount: t.amount, attachments: t.attachments, textReceipt: t.textReceipt, description: t.description };
              const newHistoryRecord: ChequeHistory = { id: crypto.randomUUID(), date, previousStatus, newStatus, description, attachments, snapshot: fullSnapshot };

              return {
                ...t,
                chequeDetails: {
                  ...t.chequeDetails,
                  status: newStatus,
                  history: [...t.chequeDetails.history, newHistoryRecord],
                },
              };
            }
            return t;
          }),
        }));
      },

      exchangeChequeForCash: (transactionId, cashAmount, date, description, attachments = []) => {
        const state = get();
        const originalTx = state.transactions.find(t => t.id === transactionId);
        if (!originalTx || originalTx.type !== 'CHEQUE') return;

        state.changeChequeStatus(transactionId, 'EXCHANGED', description || 'تبدیل به وجه نقد / حواله', date, attachments);

        state.addTransaction({
          referenceId: originalTx.referenceId,
          clientId: originalTx.clientId, 
          allocations: originalTx.allocations, 
          amount: cashAmount,
          date: date,
          description: description || `دریافت نقدی بابت تبدیل چک (سریال: ${originalTx.chequeDetails?.serialNumber || originalTx.id})`,
          direction: originalTx.direction,
          type: 'CASH',
        });
      },

      deleteChequeHistory: (transactionId, historyId) => {
        set((state) => ({
          transactions: state.transactions.map((t) => {
            if (t.id === transactionId && t.type === 'CHEQUE' && t.chequeDetails) {
              return { ...t, chequeDetails: { ...t.chequeDetails, history: t.chequeDetails.history.filter((h) => h.id !== historyId) } };
            }
            return t;
          }),
        }));
      },

    }),
    { name: 'finance-storage' }
  )
);