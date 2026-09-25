export type TransactionDirection = 'IN' | 'OUT';
export type PaymentType = 'CASH' | 'CHEQUE';
export type ChequeStatus = 'PENDING' | 'CASH_SETTLED' | 'RETURNED' | 'EXCHANGED';

export interface TransactionHistory {
  id: string;
  date: string;
  description?: string;
  previousStatus?: ChequeStatus;
  newStatus?: ChequeStatus;
  previousType: PaymentType;
  newType: PaymentType;
  
  // فیلدهای جدید برای بایگانی رسیدها در تاریخچه
  attachments?: string[];
  textReceipt?: string;
  previousAttachments?: string[]; // (اختیاری) جهت مقایسه در صورت نیاز
}

export interface ChequeDetails {
  issuer?: string;        // صادرکننده
  sayyadId?: string;      // شناسه صیادی
  serialNumber?: string;  // شماره سریال
  series?: string;        // سری چک
  bank?: string;          // بانک
  issueDate?: string;     // تاریخ صدور
  dueDate?: string;       // تاریخ وصول / سررسید
  status: ChequeStatus;   // وضعیت
}

export interface Transaction {
  id: string;
  referenceId: string; 
  amount: number;
  date: string;
  description?: string;
  direction: TransactionDirection;
  type: PaymentType;
  chequeDetails?: ChequeDetails; 
  
  attachments?: string[]; // آرایه‌ای برای حداکثر ۲ تصویر پیوست (Base64)
  textReceipt?: string;   // فیلد رسید متنی
  
  history: TransactionHistory[]; // آرایه تاریخچه تغییرات تراکنش
}

export interface LaborRecord {
  id: string;
  projectId: string;
  workerName: string;
  wage: number;
  date: string;
  workType: string;
}