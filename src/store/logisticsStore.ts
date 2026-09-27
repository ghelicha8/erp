import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ---------------------------------------------------------
// 💡 اینترفیس‌های پایه‌ی پروفایل‌ها (جدید)
// ---------------------------------------------------------
export type VehicleStatus = 'ACTIVE' | 'REPAIR' | 'INACTIVE';
export type ToolStatus = 'ACTIVE' | 'REPAIR' | 'RENTED' | 'UNAVAILABLE'; 

export interface VehicleProfile {
  id: string;
  name: string; 
  plate: string; 
  photo?: string; 
  status: VehicleStatus;
  insuranceDate?: string; 
  insuranceType?: string; 
  isPinned: boolean; 
  createdAt: string;
}

export interface ToolProfile {
  id: string;
  name: string; 
  serialNumber: string; 
  photo?: string; 
  status: ToolStatus;
  isPinned: boolean; 
  createdAt: string;
}

// ---------------------------------------------------------
// 💡 اینترفیس ثبت لاگ‌های کارکرد (اصلاح شده)
// ---------------------------------------------------------
export interface LogisticsLog {
  id: string;
  projectId: string | null; 
  clientId?: string;
  phaseId?: string;
  type: 'TRANSPORT' | 'EQUIPMENT';
  source: 'INTERNAL' | 'EXTERNAL';
  title: string;
  provider: string; // ID راننده
  vehicleInfo: string; // ID ماشین
  date: string;
  createdAt?: string;
  internalCost: number;
  billedCost: number;
  driverWage: number;
  // 💡 این دو فیلد اضافه شدند تا تعداد و قیمت واحد ذخیره بشه
  unit?: string;
  qty?: number; 
  unitPrice?: number; 
}

interface LogisticsState {
  logs: LogisticsLog[];
  vehicles: VehicleProfile[]; 
  tools: ToolProfile[];       
  
  addLog: (log: Omit<LogisticsLog, 'id'>) => void;
  updateLog: (id: string, data: Partial<LogisticsLog>) => void;
  deleteLog: (id: string) => void;
  deleteMultipleLogs: (ids: string[]) => void;

  addVehicle: (vehicle: Omit<VehicleProfile, 'id' | 'createdAt'>) => void;
  updateVehicle: (id: string, data: Partial<VehicleProfile>) => void;
  deleteVehicle: (id: string) => void;
  toggleVehiclePin: (id: string) => void;

  addTool: (tool: Omit<ToolProfile, 'id' | 'createdAt'>) => void;
  updateTool: (id: string, data: Partial<ToolProfile>) => void;
  deleteTool: (id: string) => void;
  toggleToolPin: (id: string) => void;
}

export const useLogisticsStore = create<LogisticsState>()(
  persist(
    (set) => ({
      logs: [],
      vehicles: [],
      tools: [],
      
      addLog: (log) => set((state) => ({
        logs: [{ ...log, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...state.logs]
      })),
      updateLog: (id, data) => set((state) => ({
        logs: state.logs.map(l => l.id === id ? { ...l, ...data } : l)
      })),
      deleteLog: (id) => set((state) => ({
        logs: state.logs.filter(l => l.id !== id)
      })),
      deleteMultipleLogs: (ids) => set((state) => ({
        logs: state.logs.filter(l => !ids.includes(l.id))
      })),

      addVehicle: (vehicle) => set((state) => ({
        vehicles: [{ ...vehicle, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...state.vehicles]
      })),
      updateVehicle: (id, data) => set((state) => ({
        vehicles: state.vehicles.map(v => v.id === id ? { ...v, ...data } : v)
      })),
      deleteVehicle: (id) => set((state) => ({
        vehicles: state.vehicles.filter(v => v.id !== id)
      })),
      toggleVehiclePin: (id) => set((state) => ({
        vehicles: state.vehicles.map(v => v.id === id ? { ...v, isPinned: !v.isPinned } : v)
      })),

      addTool: (tool) => set((state) => ({
        tools: [{ ...tool, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...state.tools]
      })),
      updateTool: (id, data) => set((state) => ({
        tools: state.tools.map(t => t.id === id ? { ...t, ...data } : t)
      })),
      deleteTool: (id) => set((state) => ({
        tools: state.tools.filter(t => t.id !== id)
      })),
      toggleToolPin: (id) => set((state) => ({
        tools: state.tools.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t)
      })),
    }),
    { name: 'logistics-storage' }
  )
);