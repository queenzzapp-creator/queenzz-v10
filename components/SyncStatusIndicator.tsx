import React from 'react';
import { SyncStatus } from '../types.ts';
import { CloudIcon, CloudArrowUpIcon, ArrowPathIcon } from './Icons.tsx';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  onSave: () => void;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ status, onSave }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'syncing':
        return {
          icon: <CloudArrowUpIcon className="h-5 w-5 text-sky-500 animate-pulse" />,
          text: 'Guardando...',
          color: 'text-sky-600 dark:text-sky-400',
          bgColor: 'bg-sky-100/60 dark:bg-sky-700/60',
          title: 'Guardando datos...',
          disabled: true,
        };
       case 'unsaved':
        return {
          icon: <CloudArrowUpIcon className="h-5 w-5 text-amber-500" />,
          text: 'Guardar',
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-100/60 dark:bg-amber-700/60 hover:bg-amber-200/80 dark:hover:bg-amber-600/80',
          title: 'Hay cambios sin guardar. Haz clic para guardar.',
          disabled: false,
        };
      case 'error':
        return {
          icon: <ArrowPathIcon className="h-5 w-5 text-red-500" />,
          text: 'Reintentar',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100/60 dark:bg-red-700/60 hover:bg-red-200/80 dark:hover:bg-red-600/80',
          title: 'Error al guardar. Haz clic para reintentar.',
          disabled: false,
        };
      case 'offline':
         return {
          icon: <CloudIcon className="h-5 w-5 text-slate-400" />,
          text: 'Offline',
          color: 'text-slate-500 dark:text-slate-400',
          bgColor: 'bg-slate-200/60 dark:bg-slate-800/60',
          title: 'Estás offline. No se pueden guardar los cambios.',
          disabled: true,
        };
      case 'synced':
      default:
        return {
          icon: <CloudIcon className="h-5 w-5 text-green-500" />,
          text: 'Guardado',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100/60 dark:bg-green-700/60',
          title: 'Todos los cambios guardados. Haz clic para forzar un guardado.',
          disabled: true,
        };
    }
  };

  const { icon, text, color, bgColor, title, disabled } = getStatusInfo();

  return (
    <button 
        onClick={onSave}
        disabled={disabled}
        title={title}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${color} ${bgColor} disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {icon}
      <span className="hidden sm:inline">{text}</span>
    </button>
  );
};

export default SyncStatusIndicator;