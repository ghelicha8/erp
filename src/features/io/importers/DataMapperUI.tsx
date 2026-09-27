import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Upload, Database, FileWarning, Trash2, ArrowRightLeft } from 'lucide-react';
import { SmartMergeEngine, type ImportStrategy } from './SmartMergeEngine';
import { PortalSelect } from '../../../components/ui/SharedLaborUI';

// فیلدهای استانداردی که دیتابیس ما نیاز دارد (بسته به ماژولی که کاربر انتخاب کرده)
const DB_SCHEMAS: Record<string, { key: string, label: string, required?: boolean }[]> = {
  CLIENTS: [
    { key: 'clientName', label: 'نام مشتری/کارفرما', required: true },
    { key: 'clientPhone', label: 'شماره تماس' },
    { key: 'nationalCode', label: 'کد ملی' },
    { key: 'address', label: 'آدرس' }
  ],
  INVENTORY: [
    { key: 'title', label: 'نام کالا / مصالح', required: true },
    { key: 'quantity', label: 'موجودی' },
    { key: 'unit', label: 'واحد (عدد، تن، روز)' },
    { key: 'unitPrice', label: 'فی خرید' }
  ]
};

export default function DataMapperUI({ onClose, onImportComplete }: { onClose: () => void, onImportComplete: (finalData: any[]) => void }) {
  const [targetModule, setTargetModule] = useState<'CLIENTS' | 'INVENTORY'>('CLIENTS');
  const [strategy, setStrategy] = useState<ImportStrategy>('SMART_MERGE');
  
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileData, setFileData] = useState<any[]>([]);
  
  // نگهداری وضعیت اتصال ستون‌ها (Key = فیلد دیتابیس، Value = هدر اکسل)
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // پردازش فایل (اکسل یا CSV)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setFileHeaders(results.meta.fields || []);
          setFileData(results.data);
          autoSuggestMapping(results.meta.fields || []);
        }
      });
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      if (data.length > 0) {
        const headers = Object.keys(data[0] as object);
        setFileHeaders(headers);
        setFileData(data);
        autoSuggestMapping(headers);
      }
    }
  };

  // هوش مصنوعی ساده برای حدس زدن ستون‌ها
  const autoSuggestMapping = (headers: string[]) => {
    const newMap: Record<string, string> = {};
    const schema = DB_SCHEMAS[targetModule];
    
    schema.forEach(field => {
      // اگر اسم ستون اکسل دقیقاً شامل کلمه‌ای از لیبل ما بود، متصلش کن
      const match = headers.find(h => h.includes(field.label.split(' ')[0]) || field.label.includes(h));
      if (match) newMap[field.key] = match;
    });
    
    setMapping(newMap);
  };

  const handleExecuteImport = () => {
    // ۱. استخراج داده‌ها و اعمال مپینگ
    const mappedData = SmartMergeEngine.mapData(fileData, 
      // برعکس کردن مپینگ برای موتور (Key=Excel, Value=DB)
      Object.fromEntries(Object.entries(mapping).map(([k, v]) => [v, k]))
    );

    // ۲. در یک سیستم واقعی، اینجا دیتای قبلی را از Zustand یا Dexie می‌گیریم
    // فعلاً آرایه خالی می‌دهیم چون این فقط رابط است.
    const existingData: any[] = []; 
    
    // کلید یکتا برای چک کردن تکراری‌ها (مثلاً اگر مشتری است نامش را چک کن)
    const uniqueKey = targetModule === 'CLIENTS' ? 'clientName' : 'title';

    // ۳. اجرای موتور هوشمند ادغام
    const finalData = SmartMergeEngine.applyStrategy(existingData, mappedData, {
      strategy,
      uniqueKey,
      mapping: {}
    });

    onImportComplete(finalData);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex bg-slate-900/95 backdrop-blur-xl p-4 md:p-8" dir="rtl">
      <div className="w-full max-w-5xl mx-auto bg-slate-800/50 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden h-full">
        
        {/* هدر */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Database className="text-indigo-400" />
              ورود و ادغام هوشمند اطلاعات
            </h2>
            <p className="text-sm text-slate-400 mt-1">فایل اکسل یا CSV خود را متصل کرده و ستون‌ها را هماهنگ کنید.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-xl hover:text-rose-500 transition-colors"><Trash2 className="w-5 h-5"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 modal-scrollbar">
          
          {/* گام ۱: تنظیمات اصلی و آپلود */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">۱. مقصد ورود اطلاعات</label>
              <PortalSelect
                options={[{ value: 'CLIENTS', label: 'پروفایل مشتریان / کارفرمایان' }, { value: 'INVENTORY', label: 'انبار و کالاها' }]}
                value={targetModule}
                onChange={(v: any) => setTargetModule(v)}
                placeholder="انتخاب کنید..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">۲. استراتژی ادغام</label>
              <PortalSelect
                options={[{ value: 'SMART_MERGE', label: 'ادغام هوشمند (فقط تکمیل فیلدهای خالی)' }, { value: 'OVERWRITE', label: 'جایگزینی کامل دیتای تکراری' }, { value: 'WIPE_INSERT', label: 'حذف کل قبلی‌ها و ورود جدید' }]}
                value={strategy}
                onChange={(v: any) => setStrategy(v as ImportStrategy)}
                placeholder="انتخاب کنید..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">۳. انتخاب فایل (Excel / CSV)</label>
              <div className="relative">
                <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div className="w-full bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-3 text-indigo-400 font-bold flex items-center justify-center gap-2 hover:bg-indigo-500/20 transition-colors">
                  <Upload className="w-4 h-4" /> {fileData.length > 0 ? 'فایل لود شد' : 'آپلود فایل...'}
                </div>
              </div>
            </div>
          </div>

          {/* گام ۲: اتصال فیلدها (Mapping) */}
          {fileHeaders.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-sm font-black text-slate-300 mb-4 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                اتصال ستون‌های اکسل به فیلدهای سیستم (Mapping)
              </h3>
              
              <div className="space-y-4">
                {DB_SCHEMAS[targetModule].map(field => (
                  <div key={field.key} className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                    <div className="flex-1">
                      <span className="text-sm font-bold text-white">{field.label}</span>
                      {field.required && <span className="text-rose-500 ml-1 text-xs">*</span>}
                    </div>
                    
                    <div className="text-slate-500"><ArrowRightLeft className="w-4 h-4" /></div>
                    
                    <div className="flex-1">
                      <PortalSelect
                        options={[{ value: '', label: '-- متصل نشود --' }, ...fileHeaders.map(h => ({ value: h, label: h }))]}
                        value={mapping[field.key] || ''}
                        onChange={(v: any) => setMapping(prev => ({ ...prev, [field.key]: v }))}
                        placeholder="انتخاب ستون..."
                        searchable
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* اطلاعات راهنمای استراتژی */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-200 text-sm">
            <FileWarning className="w-5 h-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-bold mb-1 text-amber-400">توجه درباره استراتژی {strategy === 'SMART_MERGE' ? 'ادغام هوشمند' : strategy === 'OVERWRITE' ? 'جایگزینی' : 'حذف و ورود'}:</p>
              {strategy === 'SMART_MERGE' && <p>در این حالت سیستم رکوردهای تکراری را نگه می‌دارد و فقط اگر فیلدی در برنامه خالی بود، آن را با دیتای اکسل پر می‌کند. (بدون خطر از دست رفتن دیتا)</p>}
              {strategy === 'OVERWRITE' && <p>در صورت یافتن مشتری یا کالای تکراری، اطلاعات اکسل دقیقاً جایگزین اطلاعات قبلی خواهد شد.</p>}
              {strategy === 'WIPE_INSERT' && <p className="text-rose-400">خطرناک: تمام اطلاعات فعلیِ این بخش پاک شده و فقط اطلاعات اکسل وارد سیستم می‌شود!</p>}
            </div>
          </div>
        </div>

        {/* فوتر */}
        <div className="p-6 border-t border-slate-700 bg-slate-900 flex justify-between items-center">
          <div className="text-slate-400 font-bold text-sm">
            {fileData.length > 0 ? `${fileData.length} ردیف آماده ورود` : 'منتظر آپلود فایل...'}
          </div>
          <button 
            disabled={fileData.length === 0}
            onClick={handleExecuteImport}
            className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white rounded-xl font-black shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
          >
            شروع پردازش و ورود اطلاعات
          </button>
        </div>

      </div>
    </div>
  );
}