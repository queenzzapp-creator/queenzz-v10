import React, { useState, useMemo, useCallback } from 'react';
import { LibraryItem } from '../types.ts';
import { DocumentArrowUpIcon, BookOpenIcon, FolderIcon, QueueListIcon, ArrowPathIcon } from './Icons.tsx';

// Reusable component to render a selectable item in the tree
const ItemCheckbox: React.FC<{
    item: LibraryItem;
    level: number;
    selection: Set<string>;
    onToggle: (id: string, item: LibraryItem, event: React.MouseEvent) => void;
}> = ({ item, level, selection, onToggle }) => {
    const isSelected = selection.has(item.id);

    return (
        <div style={{ paddingLeft: `${level * 1.5}rem` }}>
            <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-700/50 cursor-pointer">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onClick={(e) => onToggle(item.id, item, e)}
                    onChange={() => {}} // onChange is needed but logic is in onClick for shift
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


interface PdfExportConfiguratorProps {
  library: LibraryItem[];
  activeLibraryName: string;
  onExport: (selectedIds: string[], fileName: string) => void;
  onCancel: () => void;
}

const PdfExportConfigurator: React.FC<PdfExportConfiguratorProps> = ({ library, activeLibraryName, onExport, onCancel }) => {
  const [fileName, setFileName] = useState(`${activeLibraryName.replace(/\s+/g, '_')}_Test.pdf`);
  const [lastClickedId, setLastClickedId] = useState<string|null>(null);

  const quizzesAndFolders = useMemo(() => {
    const filter = (items: LibraryItem[]): LibraryItem[] => {
        return items.filter(item => item.type === 'quiz' || item.type === 'folder').map(item => {
            if (item.type === 'folder') {
                return { ...item, children: filter(item.children) };
            }
            return item;
        });
    };
    return filter(library);
  }, [library]);

  const flattenedItems = useMemo(() => {
        const flatList: LibraryItem[] = [];
        const recurse = (items: LibraryItem[]) => {
            items.forEach(item => {
                flatList.push(item);
                if (item.type === 'folder' && item.isOpen) {
                    recurse(item.children);
                }
            });
        };
        recurse(quizzesAndFolders);
        return flatList;
  }, [quizzesAndFolders]);
  
  const allItemIds = useMemo(() => new Set(flattenedItems.map(item => item.id)), [flattenedItems]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(allItemIds);
  
  const toggleItemSelection = useCallback((itemId: string, item: LibraryItem, event: React.MouseEvent) => {
    const newSelection = new Set(selectedIds);
    const isCurrentlySelected = newSelection.has(itemId);

    if (event.shiftKey && lastClickedId) {
        const lastIndex = flattenedItems.findIndex(i => i.id === lastClickedId);
        const currentIndex = flattenedItems.findIndex(i => i.id === itemId);

        if (lastIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            const targetState = !isCurrentlySelected;

            for (let i = start; i <= end; i++) {
                const itemInRange = flattenedItems[i];
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
  }, [selectedIds, lastClickedId, flattenedItems]);
  
  const handleSelectAll = () => setSelectedIds(allItemIds);
  const handleDeselectAll = () => setSelectedIds(new Set());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExport(Array.from(selectedIds), fileName);
  };

  const renderItemTree = (items: LibraryItem[], level = 0): React.ReactNode => {
    return items.map(item => (
      <React.Fragment key={item.id}>
        <ItemCheckbox item={item} level={level} selection={selectedIds} onToggle={toggleItemSelection} />
        {item.type === 'folder' && item.children.length > 0 && renderItemTree(item.children, level + 1)}
      </React.Fragment>
    ));
  };

  return (
    <div className="animate-fade-in w-full max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <DocumentArrowUpIcon className="h-8 w-8 text-lime-500 rotate-180" />
          Exportar a PDF
        </h2>
        <button onClick={onCancel} className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowPathIcon className="h-5 w-5" />
          Volver
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">1. Seleccionar Tests</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Elige qué tests o carpetas quieres incluir en el documento PDF.</p>
          <div className="flex gap-2 mb-3">
              <button type="button" onClick={handleSelectAll} className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">Seleccionar todo</button>
              <button type="button" onClick={handleDeselectAll} className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">Deseleccionar todo</button>
          </div>
          <div className="max-h-60 overflow-y-auto p-3 bg-white/50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
            {quizzesAndFolders.length > 0 ? renderItemTree(quizzesAndFolders) : <p className="text-sm text-center text-slate-500">No hay tests para exportar.</p>}
          </div>
        </div>

        <div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">2. Opciones de Exportación</h3>
            <div className="mt-3">
                 <label htmlFor="file-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nombre del archivo
                </label>
                <input
                    id="file-name"
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="w-full p-3 bg-white dark:bg-slate-700 border font-sans border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500 text-slate-900 dark:text-slate-100"
                />
            </div>
        </div>
        
        <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="submit"
            disabled={selectedIds.size === 0}
            className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 disabled:bg-slate-400 disabled:shadow-none"
          >
            Exportar PDF
          </button>
        </div>
      </form>
    </div>
  );
};

export default PdfExportConfigurator;