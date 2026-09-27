import { motion } from 'framer-motion';
import { Star, Trash2, Phone, MapPin, ShoppingCart, Wallet, Truck, Link2 } from 'lucide-react';
import { SECTION_CONFIG } from './vendorTypes';
import { useProcurementStore, type Vendor } from '../../../../store/procurementStore';

interface VendorCardProps {
  vendor: Vendor;
  purchaseCount: number;
  totalPaid: number;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}

export default function VendorCard({ vendor, purchaseCount, totalPaid, onTogglePin, onDelete, onClick }: VendorCardProps) {
  const cfg = SECTION_CONFIG[vendor.section];
  const SectionIcon = cfg.icon;
  const linkedVendor = useProcurementStore(s =>
    vendor.linkedVendorId ? s.vendors.find(v => v.id === vendor.linkedVendorId) : undefined
  );

  return (
    <motion.div
      layout="position"
      onClick={onClick}
      transition={{ layout: { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }, opacity: { duration: 0.2 } }}
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
      className={`relative backdrop-blur-2xl border rounded-[2rem] p-6 transition-colors duration-300 group overflow-hidden cursor-pointer ${
        vendor.isPinned
          ? 'bg-white/70 dark:bg-slate-800/70 border-amber-400/60 dark:border-amber-500/60 shadow-[0_15px_40px_rgba(245,158,11,0.2)]'
          : 'bg-white/50 dark:bg-slate-900/50 border-white/60 dark:border-slate-700/50 shadow-lg hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:border-indigo-300/50'
      }`}
    >
      {vendor.isPinned && (
        <motion.div
          animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.25, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/20 dark:bg-amber-500/20 rounded-full blur-3xl pointer-events-none"
        />
      )}

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            {vendor.photo ? (
              <img src={vendor.photo} alt={vendor.name} className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-white dark:border-slate-700" />
            ) : (
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white shadow-lg border-2 border-white/80 dark:border-slate-700`}>
                <SectionIcon className="w-7 h-7" />
              </div>
            )}
            <div className={`absolute -bottom-2 -right-2 rounded-lg px-1.5 py-0.5 shadow-md border border-white dark:border-slate-800 flex items-center gap-0.5 text-[9px] font-black text-white ${vendor.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-500'}`}>
              {vendor.status === 'ACTIVE' ? 'فعال' : 'غیرفعال'}
            </div>
          </div>

          <div className="flex flex-col">
            <h3 className="text-lg font-black text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {vendor.name}
            </h3>
            {vendor.section === 'LOGISTICS' ? (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/50 dark:border-slate-600 shadow-sm">
                  <Truck className="w-3.5 h-3.5" />
                  <span dir="ltr" className="tracking-widest">{vendor.plate || 'بدون پلاک'}</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/50 dark:border-slate-600 shadow-sm">
                  <span dir="ltr" className="tracking-widest">{vendor.phones?.[0] || 'ثبت نشده'}</span>
                </span>
                {vendor.phones?.[0] && (
                  <a href={`tel:${vendor.phones[0]}`} onClick={(e) => e.stopPropagation()} className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 rounded-md transition-colors shadow-sm cursor-pointer z-20">
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 z-20">
          <motion.button
            whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); onDelete(vendor.id); }}
            className="relative p-2 rounded-xl transition-all text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-5 h-5 transition-all" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); onTogglePin(vendor.id); }}
            className="relative p-2 rounded-xl transition-all cursor-pointer"
          >
            {vendor.isPinned && (
              <motion.div animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.5, 0.8] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 bg-amber-400/80 blur-[10px] rounded-full z-0" />
            )}
            <motion.div animate={vendor.isPinned ? { rotate: 360 } : { rotate: 0 }} transition={vendor.isPinned ? { duration: 8, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }} className="relative z-10">
              <Star className={`w-6 h-6 transition-all duration-300 ${vendor.isPinned ? 'fill-amber-300 text-amber-100 drop-shadow-[0_0_12px_rgba(251,191,36,1)]' : 'text-slate-300 hover:text-amber-400 drop-shadow-sm'}`} />
            </motion.div>
          </motion.button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2 mb-2 relative z-10">
        {vendor.section === 'LOGISTICS' && vendor.vehicleType && (
          <span className="px-2 py-1 rounded-md bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-600 text-[10px] font-black text-slate-600 dark:text-slate-300 shadow-sm">{vendor.vehicleType}</span>
        )}
        {vendor.section === 'LOGISTICS' && (vendor.driverName || vendor.ownerName) && (
          <span className="px-2 py-1 rounded-md bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-600 text-[10px] font-black text-slate-600 dark:text-slate-300 shadow-sm">
            {[vendor.driverName && `راننده: ${vendor.driverName}`, vendor.ownerName && `مالک: ${vendor.ownerName}`].filter(Boolean).join(' | ')}
          </span>
        )}
        {vendor.section === 'LOGISTICS' && vendor.linkType === 'VENDOR' && linkedVendor && (
          <span className="px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-600 dark:text-indigo-400 shadow-sm flex items-center gap-1">
            <Link2 className="w-3 h-3" /> {linkedVendor.name}
          </span>
        )}
        {vendor.section === 'MINES' && vendor.mineType && (
          <span className="px-2 py-1 rounded-md bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-600 text-[10px] font-black text-slate-600 dark:text-slate-300 shadow-sm">{vendor.mineType}</span>
        )}
        {vendor.section !== 'LOGISTICS' && vendor.phones?.[1] && (
          <span className="px-2 py-1 rounded-md bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-600 text-[10px] font-black text-slate-600 dark:text-slate-300 shadow-sm">
            <span dir="ltr">{vendor.phones[1]}</span>
          </span>
        )}
        {vendor.address && vendor.section !== 'LOGISTICS' && (
          <span className="px-2 py-1 rounded-md bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-600 text-[10px] font-black text-slate-500 shadow-sm flex items-center gap-1 max-w-full">
            <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{vendor.address}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700/50 relative z-10">
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-3 rounded-xl border border-white/80 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
          <span className="text-[10px] font-bold text-slate-500 block mb-1">خریدهای ثبت شده</span>
          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            <ShoppingCart className="w-4 h-4" /> {purchaseCount} <span className="text-[10px] font-bold">فاکتور</span>
          </span>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-3 rounded-xl border border-white/80 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
          <span className="text-[10px] font-bold text-slate-500 block mb-1">مجموع پرداختی</span>
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Wallet className="w-4 h-4" /> {totalPaid.toLocaleString('fa-IR')} <span className="text-[10px] opacity-80 font-bold">تومان</span>
          </span>
        </div>
      </div>

    </motion.div>
  );
}
