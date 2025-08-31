import React from 'react';
import { XMarkIcon } from './Icons.tsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, children, title }) => {
  return (
    <>
      {/* Overlay for mobile or when clicking outside */}
      <div
        className={`fixed inset-0 bg-black/30 dark:bg-black/50 z-30 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-full bg-[#FAF8F1] dark:bg-slate-900 z-40 shadow-2xl w-full max-w-2xl flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'transform translate-x-0' : 'transform translate-x-full'}`}
      >
        <div 
          className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0"
        >
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate pr-4">{title}</h2>
            <div className="flex items-center gap-2">
                <button onClick={onClose} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Cerrar">
                    <XMarkIcon className="h-6 w-6" />
                </button>
            </div>
        </div>
        <div className="flex-grow flex flex-col min-h-0">
           {children}
        </div>
      </div>
    </>
  );
};

export default Sidebar;