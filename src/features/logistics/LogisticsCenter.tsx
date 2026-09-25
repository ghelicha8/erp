import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VehiclesView from './components/VehiclesView';
import ToolsView from './components/ToolsView';

export type LogisticsTab = 'VEHICLES' | 'TOOLS';

export default function LogisticsCenter() {
  const [activeTab, setActiveTab] = useState<LogisticsTab>('VEHICLES');

  return (
    <div className="w-full relative min-h-screen">
      <AnimatePresence mode="wait">
        {activeTab === 'VEHICLES' ? (
          <motion.div key="vehicles-tab" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="w-full">
            {/* پاس دادن تب به کامپوننت داخلی تا همونجا رندر بشه */}
            <VehiclesView activeTab={activeTab} setActiveTab={setActiveTab} />
          </motion.div>
        ) : (
          <motion.div key="tools-tab" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="w-full">
            <ToolsView activeTab={activeTab} setActiveTab={setActiveTab} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}