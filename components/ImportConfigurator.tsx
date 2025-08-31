import React, { useState, useMemo, useCallback } from 'react';
import { LibraryData, LibraryItem, Folder, DocumentItem } from '../types.ts';
import { ArrowPathIcon, BookOpenIcon, FolderIcon, FolderOpenIcon, QueueListIcon, DocumentArrowUpIcon, PlusCircleIcon, CheckCircleIcon } from './Icons.tsx';
import * as libraryService from '../services/libraryService.ts';


const ItemCheckbox: React.FC<{
    item: LibraryItem;
    level: number;
    selection: Set<string>;
    onToggle: (id: string, item: LibraryItem, checked: boolean) => void;
}> = ({ item, level, selection, onToggle }) => {
    const isSelected = selection.has(item.id);

    return (
        <div style={{ paddingLeft: `${level * 1.5}rem` }}>
            <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-700/50 cursor-pointer">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onToggle(item.id, item, e.target.checked)}
                    className="h-4 w-4 rounded-sm bg-slate-100 border-slate-300 text-lime-600 focus:ring-lime-500"
                />
                {item.type === 'folder' && <FolderIcon className="h-5 w-5 text-lime-500" />}
                {item.type === 'quiz' && <BookOpenIcon className="h-5 w-5 text-slate-500" />}
                {item.type === 'deck' && <QueueListIcon className="h-5 w-5 text-sky-500" />}
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {item.type === 'folder' ? item.name : item.title}
                </span>
            </label>
        </div>
    );
};


interface ImportConfiguratorProps {
  importData: LibraryData;
  libraries: { id: string; name: string }[];
  activeLibraryId: string;
  onImportIntoLibrary: (targetLibraryId: string, data: LibraryData, includeProgress: boolean, includeDocuments: boolean) => void;
  onImportAsNew: (data: LibraryData, includeProgress: boolean, includeDocuments: boolean) => void;
  onCancel: () => void;
}

const ImportConfigurator: React.FC<ImportConfiguratorProps> = ({ importData, libraries, activeLibraryId, onImportIntoLibrary, onImportAsNew, onCancel }) => {
  const NEW_LIBRARY_OPTION_VALUE = '--new--';
  const [targetLibraryId, setTargetLibraryId] = useState(activeLibraryId || libraries[0]?.id || NEW_LIBRARY_OPTION_VALUE);
  const [includeProgress, setIncludeProgress] = useState(true);
  const [includeDocuments, setIncludeDocuments] = useState(true);

  const hasProgressData = useMemo(() => {
    return (importData.failedQuestions && importData.failedQuestions.length > 0) ||
           (importData.answeredQuestionIds && importData.answeredQuestionIds.length > 0) ||
           (importData.failedFlashcards && importData.failedFlashcards.length > 0);
  }, [importData]);

  const hasDocuments = useMemo(() => {
    if (!importData.documentLibrary) return false;
    const checkItems = (items: DocumentItem[]): boolean => {
        return items.some(item => {
            if (item.type === 'file') return true;
            if (item.type === 'folder') return checkItems(item.children);
            return false;
        });
    };
    return checkItems(importData.documentLibrary);
  }, [importData]);

  const allItemIds = useMemo(() => {
    const ids = new Set<string>();
    const recurse = (items: LibraryItem[]) => {
      items.forEach(item => {
        ids.add(item.id);
        if (item.type === 'folder') {
          recurse(item.children);
        }
      });
    };
    recurse(importData.library);
    return ids;
  }, [importData.library]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(allItemIds);
  
  const toggleItemSelection = useCallback((itemId: string, item: LibraryItem, checked: boolean) => {
    const newSelection = new Set(selectedIds);
    const getAllChildIds = (currentItem: LibraryItem): string[] => {
        let ids: string[] = [currentItem.id];
        if (currentItem.type === 'folder') {
            currentItem.children.forEach(child => {
                ids = [...ids, ...getAllChildIds(child)];
            });
        }
        return ids;
    };
    
    const idsToToggle = getAllChildIds(item);
    idsToToggle.forEach(id => {
        if (checked) {
            newSelection.add(id);
        } else {
            newSelection.delete(id);
        }
    });
    setSelectedIds(newSelection);
  }, [selectedIds]);

  const handleConfirmImport = () => {
    if (!targetLibraryId || selectedCount === 0) return;
    const filteredData = libraryService.filterLibraryData(importData, selectedIds, includeProgress);
    if (targetLibraryId === NEW_LIBRARY_OPTION_VALUE) {
        onImportAsNew(filteredData, includeProgress, includeDocuments);
    } else {
        onImportIntoLibrary(targetLibraryId, filteredData, includeProgress, includeDocuments);
    }
  };

  const renderItemTree = (items: LibraryItem[], level = 0) => {
    return items.map(item => (
      <React.Fragment key={item.id}>
        <ItemCheckbox item={item} level={level} selection={selectedIds} onToggle={toggleItemSelection} />
        {item.type === 'folder' && item.children.length > 0 && renderItemTree(item.children, level + 1)}
      </React.Fragment>
    ));
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="animate-fade-in w-full max-w-4xl mx-auto flex flex-col h-full">
      <header className="flex-shrink-0 flex justify-between items-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
          <DocumentArrowUpIcon className="h-8 w-8 text-sky-500" />
          Asistente de Importación
        </h2>
        <button onClick={onCancel} className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowPathIcon className="h-5 w-5" />
          Volver
        </button>
      </header>
      
      <main className="flex-grow flex flex-col lg:flex-row gap-8 min-h-0">
        {/* Left Column: Destination */}
        <div className="lg:w-1/3 flex flex-col space-y-4">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">1. Elige un Destino</h3>
            <div className="flex-grow space-y-2 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 overflow-y-auto">
                <button type="button" onClick={() => setTargetLibraryId(NEW_LIBRARY_OPTION_VALUE)} className={`w-full text-left p-3 rounded-lg border-2 flex items-center gap-3 transition-colors ${targetLibraryId === NEW_LIBRARY_OPTION_VALUE ? 'bg-lime-100/80 dark:bg-lime-900/40 border-lime-500' : 'bg-white dark:bg-slate-700/50 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                    <PlusCircleIcon className="h-5 w-5 text-lime-600 dark:text-lime-400" />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">Importar como Colección Nueva</span>
                </button>
                <hr className="my-2 border-slate-200 dark:border-slate-600"/>
                {libraries.map(lib => (
                     <button key={lib.id} type="button" onClick={() => setTargetLibraryId(lib.id)} className={`w-full text-left p-3 rounded-lg border-2 flex items-center gap-3 transition-colors ${targetLibraryId === lib.id ? 'bg-lime-100/80 dark:bg-lime-900/40 border-lime-500' : 'bg-white dark:bg-slate-700/50 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                        <FolderIcon className="h-5 w-5 text-slate-500" />
                        <span className="font-medium text-slate-700 dark:text-slate-200">{lib.name}</span>
                    </button>
                ))}
            </div>
        </div>
        
        {/* Right Column: Content */}
        <div className="lg:w-2/3 flex flex-col space-y-4">
             <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">2. Selecciona el Contenido</h3>
             <div className="flex-grow flex flex-col p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Elige qué importar de <span className="font-semibold">"{importData.name}"</span> ({selectedCount} de {allItemIds.size} seleccionados).</p>
                <div className="flex-grow max-h-48 overflow-y-auto p-3 bg-slate-100/50 dark:bg-slate-900/40 rounded-md border border-slate-200 dark:border-slate-600">
                  {importData.library.length > 0 ? renderItemTree(importData.library) : <p className="text-sm text-center text-slate-500">El archivo no contiene elementos para importar.</p>}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600 space-y-2">
                    {hasProgressData && (
                        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-700/50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeProgress}
                                onChange={(e) => setIncludeProgress(e.target.checked)}
                                className="h-4 w-4 rounded-sm bg-slate-100 border-slate-300 text-lime-600 focus:ring-lime-500"
                            />
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                Importar también el progreso de estudio
                            </span>
                        </label>
                    )}
                     {hasDocuments && (
                        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-700/50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeDocuments}
                                onChange={(e) => setIncludeDocuments(e.target.checked)}
                                className="h-4 w-4 rounded-sm bg-slate-100 border-slate-300 text-lime-600 focus:ring-lime-500"
                            />
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                Importar también los archivos del Gestor de Contenido
                            </span>
                        </label>
                    )}
                </div>
             </div>
        </div>
      </main>

       <footer className="flex-shrink-0 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
         <button onClick={handleConfirmImport} disabled={!targetLibraryId || selectedCount === 0} className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 disabled:bg-slate-400 disabled:shadow-none">
            <CheckCircleIcon className="h-5 w-5" />
            {targetLibraryId === NEW_LIBRARY_OPTION_VALUE ? 'Importar como Nueva Colección' : 'Añadir a Colección'}
        </button>
      </footer>
    </div>
  );
};

export default ImportConfigurator;