import React, { useState, useMemo, useCallback } from 'react';
import { LibraryItem, Folder } from '../types.ts';
import { DocumentArrowUpIcon, BookOpenIcon, FolderIcon, QueueListIcon, ArrowPathIcon, CheckCircleIcon, FolderOpenIcon } from './Icons.tsx';

// Reusable component to render a selectable item in the tree
const ItemCheckbox: React.FC<{
    item: LibraryItem;
    level: number;
    selection: Set<string>;
    onToggle: (id: string, item: LibraryItem, event: React.MouseEvent) => void;
    isOpen: boolean;
    onToggleFolder: () => void;
}> = ({ item, level, selection, onToggle, isOpen, onToggleFolder }) => {
    const isSelected = selection.has(item.id);
    const isFolder = item.type === 'folder';
    const Icon = isFolder ? (isOpen ? FolderOpenIcon : FolderIcon) : (item.type === 'deck' ? QueueListIcon : BookOpenIcon);
    const iconColor = isFolder ? 'text-lime-500' : (item.type === 'deck' ? 'text-sky-500' : 'text-slate-500');

    return (
        <div style={{ paddingLeft: `${level * 1.5}rem` }}>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-700/50">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onToggle(item.id, item, e as unknown as React.MouseEvent)}
                    onClick={(e) => onToggle(item.id, item, e)}
                    className="h-4 w-4 rounded-sm bg-slate-100 border-slate-300 text-lime-600 focus:ring-lime-500"
                />
                <div onClick={(e) => { e.stopPropagation(); if(isFolder) onToggleFolder(); }} className="cursor-pointer">
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <label className="text-sm font-medium text-slate-800 dark:text-slate-200 cursor-pointer flex-grow" onClick={(e) => onToggle(item.id, item, e)}>
                    {item.type === 'folder' ? item.name : item.title}
                </label>
            </div>
        </div>
    );
};


interface ExportConfiguratorProps {
  library: LibraryItem[];
  activeLibraryName: string;
  onExport: (selectedIds: Set<string>, fileName: string, includeProgress: boolean, includeDocuments: boolean) => void;
  onCancel: () => void;
}

const ExportConfigurator: React.FC<ExportConfiguratorProps> = ({ library, activeLibraryName, onExport, onCancel }) => {
  const [fileName, setFileName] = useState(`${activeLibraryName.replace(/\s+/g, '_')}_export.json`);
  const [includeProgress, setIncludeProgress] = useState(true);
  const [includeDocuments, setIncludeDocuments] = useState(true);
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  const flattenedLibrary = useMemo(() => {
        const flatList: LibraryItem[] = [];
        const recurse = (items: LibraryItem[]): void => {
            items.forEach(item => {
                flatList.push(item);
                if (item.type === 'folder' && openFolders.has(item.id)) {
                    recurse(item.children);
                }
            });
        };
        recurse(library);
        return flatList;
  }, [library, openFolders]);

  const allItemIds = useMemo(() => {
      const ids = new Set<string>();
      const addIds = (items: LibraryItem[]) => {
          items.forEach(item => {
              ids.add(item.id);
              if(item.type === 'folder') addIds(item.children);
          });
      };
      addIds(library);
      return ids;
  }, [library]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(allItemIds);
  
  const toggleItemSelection = useCallback((itemId: string, item: LibraryItem, event: React.MouseEvent) => {
    const newSelection = new Set(selectedIds);
    const isCurrentlySelected = newSelection.has(itemId);

    if (event.shiftKey && lastClickedId) {
        const lastIndex = flattenedLibrary.findIndex(i => i.id === lastClickedId);
        const currentIndex = flattenedLibrary.findIndex(i => i.id === itemId);

        if (lastIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            const targetState = !isCurrentlySelected;

            for (let i = start; i <= end; i++) {
                const itemInRange = flattenedLibrary[i];
                if (targetState) newSelection.add(itemInRange.id);
                else newSelection.delete(itemInRange.id);
            }
            setSelectedIds(newSelection);
            return;
        }
    }
    
    if (isCurrentlySelected) newSelection.delete(itemId);
    else newSelection.add(itemId);
    
    setSelectedIds(newSelection);
    setLastClickedId(itemId);
  }, [selectedIds, lastClickedId, flattenedLibrary]);
  
  const handleSelectAll = () => setSelectedIds(allItemIds);
  const handleDeselectAll = () => setSelectedIds(new Set());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExport(selectedIds, fileName, includeProgress, includeDocuments);
  };

  const renderItemTree = (items: LibraryItem[], level = 0): React.ReactNode => {
    return items.map(item => (
      <React.Fragment key={item.id}>
        <ItemCheckbox 
            item={item} 
            level={level} 
            selection={selectedIds} 
            onToggle={toggleItemSelection}
            isOpen={item.type === 'folder' ? openFolders.has(item.id) : false}
            onToggleFolder={() => setOpenFolders(prev => {
                const newSet = new Set(prev);
                if(newSet.has(item.id)) newSet.delete(item.id);
                else newSet.add(item.id);
                return newSet;
            })}
        />
        {item.type === 'folder' && openFolders.has(item.id) && item.children.length > 0 && renderItemTree(item.children, level + 1)}
      </React.Fragment>
    ));
  };

  return (
    <div className="animate-fade-in w-full max-w-4xl mx-auto flex flex-col h-full">
      <header className="flex-shrink-0 flex justify-between items-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <DocumentArrowUpIcon className="h-8 w-8 text-sky-500 rotate-180" />
          Exportar Biblioteca
        </h2>
        <button onClick={onCancel} className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowPathIcon className="h-5 w-5" />
          Volver
        </button>
      </header>

      <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
        <main className="flex-grow flex flex-col lg:flex-row gap-8 min-h-0">
            {/* Left Column: Content */}
            <div className="lg:w-1/2 flex flex-col space-y-4">
                 <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">1. Seleccionar Contenido</h3>
                 <div className="flex gap-2">
                    <button type="button" onClick={handleSelectAll} className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">Seleccionar todo</button>
                    <button type="button" onClick={handleDeselectAll} className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">Deseleccionar todo</button>
                </div>
                <div className="flex-grow max-h-80 overflow-y-auto p-3 bg-white/50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
                    {library.length > 0 ? renderItemTree(library) : <p className="text-sm text-center text-slate-500">Tu biblioteca está vacía.</p>}
                </div>
            </div>

            {/* Right Column: Options */}
            <div className="lg:w-1/2 flex flex-col space-y-4">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">2. Opciones de Exportación</h3>
                <div className="space-y-4 p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer">
                        <input type="checkbox" checked={includeProgress} onChange={(e) => setIncludeProgress(e.target.checked)} className="h-4 w-4 rounded-sm bg-slate-100 border-slate-300 text-lime-600 focus:ring-lime-500" />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Incluir progreso de estudio</span>
                    </label>
                     <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer">
                        <input type="checkbox" checked={includeDocuments} onChange={(e) => setIncludeDocuments(e.target.checked)} className="h-4 w-4 rounded-sm bg-slate-100 border-slate-300 text-lime-600 focus:ring-lime-500" />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Incluir archivos del Gestor</span>
                    </label>
                    <div>
                         <label htmlFor="file-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del archivo</label>
                        <input id="file-name" type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-700 border font-sans border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500 text-slate-900 dark:text-slate-100" />
                    </div>
                </div>
            </div>
        </main>
        
        <footer className="flex-shrink-0 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button type="submit" disabled={selectedIds.size === 0} className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 disabled:bg-slate-400 disabled:shadow-none">
            <CheckCircleIcon className="h-5 w-5"/>
            Exportar Copia de Seguridad
          </button>
        </footer>
      </form>
    </div>
  );
};

export default ExportConfigurator;