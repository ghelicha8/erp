import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ClientType = 'PERSON' | 'COMPANY';

// 💡 اینترفیس جدید برای اسناد کارفرما (با قابلیت اتصال به پروژه)
export interface ClientDocument {
  id: string;
  name: string;
  type: 'PDF' | 'IMAGE' | 'DOCUMENT';
  size: string;
  date: string;
  createdAt?: string;
  folder: string;
  base64Data: string;
  revision: string;
  tags: string;
  note: string;
  // 💡 فیلدهای جدید برای گره زدن سند به پروژه خاص
  linkedProjectId?: string;
  linkedProjectName?: string;
  isFromProjectTab?: boolean;
}

export interface Client {
  id: string;
  avatar?: string;         
  name: string;            
  lastName?: string;       
  phone: string;           
  nationalId?: string;     
  address?: string;
  type: ClientType;
  isPinned: boolean;       
  creditScore: number;     
  walletBalance: number;   
  isHiddenProfitEnabled?: boolean; 
  notes?: string;          
  // 💡 بایگانی اختصاصی کارفرما
  archive?: ClientDocument[]; 
}

interface ClientState {
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'isPinned' | 'creditScore' | 'archive'>) => string;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  
  togglePin: (id: string) => void;
  adjustWalletBalance: (id: string, amount: number, type: 'INCREASE' | 'DECREASE') => void;
  updateCreditScore: (id: string, newScore: number) => void;

  // توابع مدیریت اسناد
  addClientDocument: (clientId: string, documentData: Omit<ClientDocument, 'id'>) => void;
  updateClientDocument: (clientId: string, docId: string, data: Partial<ClientDocument>) => void;
  deleteClientDocument: (clientId: string, docId: string) => void;
  deleteMultipleClientDocuments: (clientId: string, docIds: string[]) => void;
}

export const useClientStore = create<ClientState>()(
  persist(
    (set) => ({
      clients: [
        { 
          id: 'default-client', 
          name: 'مشتری عمومی', 
          lastName: '(نقدی/آزاد)', 
          phone: '---', 
          type: 'PERSON',
          isPinned: false,
          creditScore: 5,
          walletBalance: 0,
          archive: [] 
        }
      ],
      
      addClient: (clientData) => {
        const id = crypto.randomUUID();
        set((state) => ({
          clients: [{
            ...clientData,
            id,
            isPinned: false,
            creditScore: 5,
            archive: []
          }, ...state.clients]
        }));
        return id;
      },
      
      updateClient: (id, data) => set((state) => ({
        clients: state.clients.map(c => c.id === id ? { ...c, ...data } : c)
      })),
      
      deleteClient: (id) => set((state) => ({
        clients: state.clients.filter(c => c.id !== id)
      })),

      togglePin: (id) => set((state) => ({
        clients: state.clients.map(c => c.id === id ? { ...c, isPinned: !c.isPinned } : c)
      })),

      adjustWalletBalance: (id, amount, actionType) => set((state) => ({
        clients: state.clients.map(c => {
          if (c.id === id) {
            const newBalance = actionType === 'INCREASE' ? c.walletBalance + amount : c.walletBalance - amount;
            return { ...c, walletBalance: newBalance };
          }
          return c;
        })
      })),

      updateCreditScore: (id, newScore) => set((state) => ({
        clients: state.clients.map(c => c.id === id ? { ...c, creditScore: Math.min(Math.max(newScore, 0), 5) } : c)
      })),

      // 💡 توابع جراحی‌شده بایگانی (بدون تداخل با بقیه کدها)
      addClientDocument: (clientId, documentData) => set((state) => ({
        clients: state.clients.map(c => {
          if (c.id === clientId) {
            const newDoc = { ...documentData, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
            return { ...c, archive: [...(c.archive || []), newDoc] };
          }
          return c;
        })
      })),

      updateClientDocument: (clientId, docId, data) => set((state) => ({
        clients: state.clients.map(c => {
          if (c.id === clientId) {
            return {
              ...c,
              archive: (c.archive || []).map(doc => doc.id === docId ? { ...doc, ...data } : doc)
            };
          }
          return c;
        })
      })),

      deleteClientDocument: (clientId, docId) => set((state) => ({
        clients: state.clients.map(c => {
          if (c.id === clientId) {
            return {
              ...c,
              archive: (c.archive || []).filter(doc => doc.id !== docId)
            };
          }
          return c;
        })
      })),

      deleteMultipleClientDocuments: (clientId, docIds) => set((state) => ({
        clients: state.clients.map(c => {
          if (c.id === clientId) {
            return {
              ...c,
              archive: (c.archive || []).filter(doc => !docIds.includes(doc.id))
            };
          }
          return c;
        })
      })),

    }),
    { name: 'client-storage' }
  )
);