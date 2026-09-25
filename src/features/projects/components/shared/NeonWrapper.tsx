import React from 'react';

export const NeonWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative rounded-xl group bg-white/10 dark:bg-slate-800/30 backdrop-blur-md overflow-hidden ${className}`}>
    <div 
      className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none group-focus-within:animate-pulse" 
      style={{ 
        padding: '2px', 
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', 
        WebkitMaskComposite: 'xor', 
        maskComposite: 'exclude' 
      }}
    >
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa,#8b5cf6,#06b6d4,#10b981,#f59e0b,#ff00aa)] animate-[spin_4s_linear_infinite] group-focus-within:bg-gradient-to-r group-focus-within:from-purple-500 group-focus-within:to-cyan-500 group-focus-within:animate-none" />
    </div>
    <div className="relative z-10 w-full h-full bg-transparent flex items-center">
      {children}
    </div>
  </div>
);