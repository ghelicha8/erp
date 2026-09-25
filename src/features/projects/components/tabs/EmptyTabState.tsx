import React from 'react';
import { motion } from 'framer-motion';
import { FileText, ShoppingCart, Truck, Notebook } from 'lucide-react';

export default function EmptyTabState({ activeTab, TABS }: { activeTab: string, TABS: any[] }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full min-h-[300px] flex flex-col items-center justify-center p-10 text-center">
      <div className="w-24 h-24 mb-6 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-inner">
        {activeTab === 'invoice' && <FileText className="w-10 h-10 text-indigo-500 opacity-60" />}
        {activeTab === 'purchases' && <ShoppingCart className="w-10 h-10 text-indigo-500 opacity-60" />}
        {activeTab === 'transport' && <Truck className="w-10 h-10 text-indigo-500 opacity-60" />}
        {activeTab === 'notes' && <Notebook className="w-10 h-10 text-indigo-500 opacity-60" />}
      </div>
      <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-2">این ماژول در حال توسعه است</h3>
      <p className="text-slate-500 font-bold max-w-sm">
        در آپدیت‌های بعدی سیستم ERP، بخش یکپارچه {TABS.find((t: any) => t.id === activeTab)?.label} با رابط کاربری اختصاصی به این فضا اضافه خواهد شد.
      </p>
    </motion.div>
  );
}