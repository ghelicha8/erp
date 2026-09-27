import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ==========================================
// 💡 تایپ‌ها و اینترفیس‌های ماژول فاکتور
// ==========================================

export type InvoiceStatus = 
  | 'DRAFT'      
  | 'PROFORMA'   
  | 'SUBMITTED'  
  | 'OVERDUE'    
  | 'PAID';      

export type InvoiceItemType = 'LABOR' | 'MATERIAL' | 'EQUIPMENT' | 'LOGISTICS' | 'CUSTOM';

export interface InvoiceItem {
  id: string;
  type: InvoiceItemType;
  title: string;          
  quantity: number;
  unit: string;           
  unitPrice: number;      
  discount: number;       // 💡 تخفیف اختصاصی همین ردیف (تکی)
  totalPrice: number;     // قیمت کل این ردیف (پس از کسر تخفیف)
  
  isSyncedWithSystem: boolean; 
  referenceRecordId?: string;  
}

export interface InvoicePaymentDetails {
  cashAmount: number;         
  chequeAmount: number;       
  debtAmount: number;         
  
  globalDiscount: number;     // 💡 تخفیف کلی روی جمع نهایی فاکتور
  totalDiscount: number;      // 💡 جمع کل تخفیف‌ها (ردیفی + کلی) برای نمایش به کارفرما
  
  retentionAmount: number;    
  insuranceAmount: number;    
  taxAmount: number;          
  
  cheques: any[];             
}

export interface EditHistory {
  id: string;
  date: string;
  time: string;
  reason: string;
  previousSnapshot: any; 
}

export interface Invoice {
  id: string;
  invoiceNumber: string;      
  date: string;               
  dueDate?: string;           
  
  projectId?: string;         
  clientId?: string;          
  clientName: string;         
  clientPhone: string;
  
  status: InvoiceStatus;
  items: InvoiceItem[];
  
  subTotal: number;           
  grandTotal: number;         
  
  payment: InvoicePaymentDetails;
  
  isGlobalSyncEnabled: boolean; 
  
  attachments: string[];      
  editHistory: EditHistory[]; 
  
  shareToken: string;
  notes?: string;
  isOfficial?: boolean;
  terms?: string;
  signatures?: { client?: string; approver?: string; preparer?: string; }; 
}

interface InvoiceState {
  invoices: Invoice[];
  invoiceCounter: number; 

  addInvoice: (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'editHistory' | 'shareToken'>) => string;
  updateInvoice: (id: string, updates: Partial<Invoice>, editReason?: string) => void;
  deleteInvoice: (id: string) => void;
  duplicateInvoice: (id: string) => string; 
  
  attachDocument: (id: string, fileDataUrl: string) => void;
  changeStatus: (id: string, newStatus: InvoiceStatus) => void;
  bulkDelete: (ids: string[]) => void;
}

// ==========================================
// 💡 ایجاد Store با Zustand
// ==========================================

export const useInvoiceStore = create<InvoiceState>()(
  persist(
    (set, get) => ({
      invoices: [],
      invoiceCounter: 1000, 

      addInvoice: (invoiceData) => {
        const id = crypto.randomUUID();
        const currentCounter = get().invoiceCounter + 1;
        const invoiceNumber = `INV-${currentCounter}`;
        const shareToken = crypto.randomUUID().replace(/-/g, '').substring(0, 12);

        const newInvoice: Invoice = {
          ...invoiceData,
          id,
          invoiceNumber,
          shareToken,
          editHistory: [],
        };

        set((state) => ({
          invoices: [newInvoice, ...state.invoices],
          invoiceCounter: currentCounter,
        }));
        
        return id; 
      },

      updateInvoice: (id, updates, editReason) => {
        set((state) => {
          const invoiceIndex = state.invoices.findIndex((inv) => inv.id === id);
          if (invoiceIndex === -1) return state;

          const oldInvoice = state.invoices[invoiceIndex];
          const newHistory = [...oldInvoice.editHistory];

          if (editReason) {
            const d = new Date();
            newHistory.push({
              id: crypto.randomUUID(),
              date: d.toLocaleDateString('fa-IR'),
              time: d.toLocaleTimeString('fa-IR'),
              reason: editReason,
              previousSnapshot: { ...oldInvoice },
            });
          }

          const updatedInvoices = [...state.invoices];
          updatedInvoices[invoiceIndex] = {
            ...oldInvoice,
            ...updates,
            editHistory: newHistory,
          };

          return { invoices: updatedInvoices };
        });
      },

      deleteInvoice: (id) => {
        set((state) => ({
          invoices: state.invoices.filter((inv) => inv.id !== id),
        }));
      },

      bulkDelete: (ids) => {
        set((state) => ({
          invoices: state.invoices.filter((inv) => !ids.includes(inv.id)),
        }));
      },

      duplicateInvoice: (id) => {
        const oldInvoice = get().invoices.find((inv) => inv.id === id);
        if (!oldInvoice) return '';

        const newId = crypto.randomUUID();
        const currentCounter = get().invoiceCounter + 1;
        const newShareToken = crypto.randomUUID().replace(/-/g, '').substring(0, 12);

        const clonedInvoice: Invoice = {
          ...oldInvoice,
          id: newId,
          invoiceNumber: `INV-${currentCounter}`,
          date: new Date().toLocaleDateString('fa-IR'),
          status: 'DRAFT', 
          shareToken: newShareToken,
          editHistory: [],
          attachments: [], 
        };

        set((state) => ({
          invoices: [clonedInvoice, ...state.invoices],
          invoiceCounter: currentCounter,
        }));

        return newId;
      },

      attachDocument: (id, fileDataUrl) => {
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id
              ? { ...inv, attachments: [...inv.attachments, fileDataUrl] }
              : inv
          ),
        }));
      },

      changeStatus: (id, newStatus) => {
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id ? { ...inv, status: newStatus } : inv
          ),
        }));
      },
    }),
    {
      name: 'peyman-invoices-storage',
    }
  )
);