import React, { useState, useRef, useEffect } from 'react';
import { LibraryData } from '../types.ts';
import { ChevronLeftIcon, ChevronRightIcon, PlusCircleIcon, PencilSquareIcon, TrashIcon, CheckCircleIcon, XMarkIcon, DocumentArrowUpIcon, DocumentArrowDownIcon } from './Icons.tsx';

interface LibrarySwitcherProps {
  activeLibrary: LibraryData;
  allLibraries: { id: string; name: string }[];
  onSwitch: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onImport?: () => void;
  onExportJson?: () => void;
  onExportPdf?: () => void;
}

const LibrarySwitcher: React.FC<LibrarySwitcherProps> = ({
  activeLibrary,
  allLibraries,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
  onImport,
  onExportJson,
  onExportPdf,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'view' | 'creating' | 'renaming'>('view');
  const [inputValue, setInputValue] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimeout = useRef<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        if (mode !== 'renaming') {
            setIsOpen(false);
            setMode('view');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wrapperRef, mode]);

  useEffect(() => {
    if ((mode === 'creating' || mode === 'renaming') && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  const handleSelect = (id: string) => {
    if (id !== activeLibrary.id) {
        onSwitch(id);
    }
    setIsOpen(false);
  };
  
  const handleDoubleClickToRename = () => {
    setMode('renaming');
    setInputValue(activeLibrary.name);
    setIsOpen(false);
  };

  const handleClick = () => {
    if (clickTimeout.current) {
        clearTimeout(clickTimeout.current);
        clickTimeout.current = null;
        handleDoubleClickToRename();
    } else {
        clickTimeout.current = window.setTimeout(() => {
            setIsOpen(prev => !prev);
            clickTimeout.current = null;
        }, 250);
    }
  };

  const handleCreateClick = () => {
    setMode('creating');
    setInputValue('');
  };

  const handleCancelEdit = () => {
    setMode('view');
    setInputValue('');
  };
  
  const handleConfirmEdit = () => {
    const trimmedValue = inputValue.trim();

    if (mode === 'renaming') {
        if (trimmedValue && trimmedValue !== activeLibrary.name) {
            onRename(trimmedValue);
        }
    } else if (mode === 'creating') {
        if (trimmedValue) {
            onCreate(trimmedValue);
        }
    }

    setMode('view');
    setInputValue('');
    if (mode !== 'renaming') {
        setIsOpen(false); // Close dropdown on success
    }
  };

  const renderDropdownContent = () => {
    if (mode === 'creating') {
      return (
        <div className="p-2">
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmEdit(); if (e.key === 'Escape') handleCancelEdit(); }}
                onBlur={handleConfirmEdit}
                placeholder={'Nombre de la biblioteca...'}
                className="w-full px-2 py-1.5 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md focus:ring-2 focus:ring-lime-500 outline-none text-sm text-slate-800 dark:text-slate-100"
            />
            <div className="flex justify-end gap-2 mt-2">
                <button onClick={handleCancelEdit} className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors">
                    <XMarkIcon className="h-5 w-5" />
                </button>
                <button onClick={handleConfirmEdit} className="p-1 rounded-md text-lime-600 dark:text-lime-400 hover:bg-lime-100 dark:hover:bg-lime-900/50 transition-colors">
                    <CheckCircleIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
      );
    }

    return (
      <>
        <p className="px-4 pt-1 pb-2 text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Tus Bibliotecas</p>
        <div className="max-h-60 overflow-y-auto">
          {allLibraries.map(lib => (
            <button
              key={lib.id}
              onClick={() => handleSelect(lib.id)}
              className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${
                lib.id === activeLibrary.id
                  ? 'font-bold text-lime-600 bg-lime-50 dark:bg-lime-900/40'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600'
              }`}
            >
              <span>{lib.name}</span>
              {lib.id === activeLibrary.id && <CheckCircleIcon className="h-5 w-5 text-lime-500" />}
            </button>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
          <button onClick={handleCreateClick} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-3">
            <PlusCircleIcon className="h-5 w-5" /> Crear nueva biblioteca
          </button>
          {onImport && (
            <button onClick={() => { onImport(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-3">
                <DocumentArrowUpIcon className="h-5 w-5" /> Importar
            </button>
          )}
          {onExportJson && (
            <button onClick={() => { onExportJson(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-3">
                <DocumentArrowDownIcon className="h-5 w-5" /> Exportar a JSON
            </button>
          )}
          {onExportPdf && (
            <button onClick={() => { onExportPdf(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-3">
                <DocumentArrowDownIcon className="h-5 w-5" /> Exportar a PDF
            </button>
          )}
          <button onClick={onDelete} disabled={allLibraries.length <= 1} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40 flex items-center gap-3 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent disabled:cursor-not-allowed">
            <TrashIcon className="h-5 w-5" /> Eliminar actual
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {mode === 'renaming' ? (
        <div className="flex items-center gap-1.5 animate-fade-in">
           <input
               ref={inputRef}
               type="text"
               value={inputValue}
               onChange={(e) => setInputValue(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmEdit(); if (e.key === 'Escape') handleCancelEdit(); }}
               onBlur={handleConfirmEdit}
               className="px-3 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg focus:ring-2 focus:ring-lime-500 outline-none text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 w-auto"
           />
       </div>
      ) : (
        <button
            onClick={handleClick}
            title="Doble clic para renombrar"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100/70 dark:bg-slate-700/50 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors"
        >
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] sm:max-w-[200px]">
            {activeLibrary.name}
            </span>
            {isOpen ? <ChevronLeftIcon className="h-4 w-4 text-slate-600 dark:text-slate-400 transform -rotate-90 transition-transform" /> : <ChevronRightIcon className="h-4 w-4 text-slate-600 dark:text-slate-400 transform -rotate-90 transition-transform" />}
        </button>
      )}

      {isOpen && (
        <div className="absolute top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-600 py-2 z-50 animate-fade-in origin-top-left">
          {renderDropdownContent()}
        </div>
      )}
    </div>
  );
};

export default LibrarySwitcher;