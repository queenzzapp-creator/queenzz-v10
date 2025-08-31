import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { DocumentItem, DocumentFolder, StoredFileItem, StoredURLItem } from '../types.ts';
import { InboxStackIcon, ArrowPathIcon, FolderIcon, FolderOpenIcon, TrashIcon, PencilSquareIcon, CheckCircleIcon, XMarkIcon, FolderPlusIcon, DocumentArrowUpIcon, GlobeIcon, BarsArrowUpIcon, BarsArrowDownIcon, ChevronUpDownIcon, PlusCircleIcon } from './Icons.tsx';
import { fileToBase64, getFilePageCount } from '../utils/fileParser.ts';
import { getTextFromWeb } from '../services/geminiService.ts';
import * as libraryService from '../services/libraryService.ts';


// --- Context Menu Sub-component ---
interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  disabled?: boolean;
  isSeparator?: boolean;
  className?: string;
}

const ContextMenu: React.FC<{
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Adjust position if menu would go off-screen
  const adjustedStyle: React.CSSProperties = { top: y, left: x };
  if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      if (y + menuRect.height > window.innerHeight) {
          adjustedStyle.top = window.innerHeight - menuRect.height - 10;
      }
      if (x + menuRect.width > window.innerWidth) {
          adjustedStyle.left = window.innerWidth - menuRect.width - 10;
      }
  }


  return (
    <div
      ref={menuRef}
      style={adjustedStyle}
      className="fixed z-50 w-56 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-lg shadow-2xl border border-slate-200 dark:border-slate-600 p-2 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <ul className="space-y-1">
        {items.map((item, index) =>
          item.isSeparator ? (
            <hr key={index} className="my-1 border-slate-200 dark:border-slate-600" />
          ) : (
            <li key={index}>
              <button
                onClick={() => { item.action(); onClose(); }}
                disabled={item.disabled}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors 
                  ${item.disabled ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 
                  item.className ? item.className : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            </li>
          )
        )}
      </ul>
    </div>
  );
};


// --- Move Items Modal (Adapted for Documents) ---
const isDescendant = (parent: DocumentFolder, targetId: string): boolean => {
    return parent.children.some(child => {
        if (child.id === targetId) return true;
        if (child.type === 'folder') return isDescendant(child, targetId);
        return false;
    });
};

interface MoveItemsModalProps {
    documentLibrary: DocumentItem[];
    selectedIds: Set<string>;
    onMove: (targetFolderId: string | null) => void;
    onClose: () => void;
}

const DocumentMoveItemsModal: React.FC<MoveItemsModalProps> = ({ documentLibrary, selectedIds, onMove, onClose }) => {
    const [targetId, setTargetId] = useState<string | null>(null);

    const movableFolders = useMemo(() => {
        const folders: { id: string; name: string; level: number }[] = [];
        const selectedFolders = documentLibrary.filter(item => selectedIds.has(item.id) && item.type === 'folder') as DocumentFolder[];

        const recurse = (items: DocumentItem[], level: number, path: string) => {
            for (const item of items) {
                if (item.type === 'folder') {
                    const isInvalidTarget = selectedIds.has(item.id) || selectedFolders.some(sf => isDescendant(sf, item.id));
                    if (!isInvalidTarget) {
                        folders.push({ id: item.id, name: `${path}${item.name}`, level });
                    }
                    recurse(item.children, level + 1, `${path}${item.name} / `);
                }
            }
        };
        recurse(documentLibrary, 0, '');
        return folders;
    }, [documentLibrary, selectedIds]);

    return ( <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}> <div className="relative bg-[#FAF8F1] dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}> <header className="p-6 flex justify-between items-center border-b"> <h2 className="text-xl font-bold">Mover Elementos</h2> <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200"><XMarkIcon className="h-6 w-6" /></button> </header> <div className="p-6 flex-grow overflow-y-auto"> <div className="space-y-2"> <button onClick={() => setTargetId(null)} className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border-2 ${targetId === null ? 'bg-lime-50 border-lime-500' : 'border-transparent'}`}> <FolderIcon className="h-5 w-5 text-lime-600" /> <span className="font-semibold">Raíz del Gestor</span> </button> {movableFolders.map(({ id, name, level }) => ( <button key={id} onClick={() => setTargetId(id)} className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border-2 ${targetId === id ? 'bg-lime-50 border-lime-500' : 'border-transparent'}`} style={{ paddingLeft: `${level * 1.5 + 1}rem` }}> <FolderIcon className="h-5 w-5 text-lime-600" /> <span>{name.split(' / ').pop()}</span> </button> ))} </div> </div> <footer className="flex justify-end gap-4 p-6 border-t"> <button onClick={onClose} className="px-5 py-2 text-sm font-bold rounded-md bg-slate-200">Cancelar</button> <button onClick={() => onMove(targetId)} className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-md text-white bg-lime-600"> <CheckCircleIcon className="h-5 w-5" /> Mover aquí </button> </footer> </div> </div> );
};


// --- Document Item Component ---
interface DocumentItemProps {
    item: DocumentItem;
    level: number;
    isMultiSelectActive: boolean;
    isSelected: boolean;
    isEditing: boolean;
    onToggleSelection: (id: string, event: React.MouseEvent) => void;
    onStartRename: () => void;
    onCommitRename: (newName: string) => void;
    onCancelRename: () => void;
    onPrimaryAction: (item: DocumentItem) => void;
    onContextMenu: (event: React.MouseEvent, item: DocumentItem) => void;
}

const DocumentItemComponent: React.FC<DocumentItemProps> = React.memo(({ item, level, isMultiSelectActive, isSelected, isEditing, onToggleSelection, onStartRename, onCommitRename, onCancelRename, onPrimaryAction, onContextMenu }) => {
    const [name, setName] = useState(item.type === 'folder' || item.type === 'file' ? item.name : item.title);

    useEffect(() => {
        setName(item.type === 'folder' || item.type === 'file' ? item.name : item.title);
    }, [item]);

    const handleRenameCommit = () => {
        const currentName = item.type === 'folder' || item.type === 'file' ? item.name : item.title;
        if (name.trim() && name.trim() !== currentName) {
            onCommitRename(name.trim());
        } else {
            onCancelRename();
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isEditing) { e.stopPropagation(); return; }
        if (isMultiSelectActive) {
            onToggleSelection(item.id, e);
        } else {
            onPrimaryAction(item);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
    };

    const Icon = item.type === 'folder' ? (item.isOpen ? FolderOpenIcon : FolderIcon) : item.type === 'file' ? DocumentArrowUpIcon : GlobeIcon;
    const iconColor = item.type === 'folder' ? 'text-lime-500' : item.type === 'file' ? 'text-sky-500' : 'text-purple-500';

    return (
        <div 
            onDoubleClick={isMultiSelectActive ? undefined : onStartRename}
            onClick={handleClick}
            onContextMenu={(e) => onContextMenu(e, item)}
            className={`group flex items-center gap-3 p-3 rounded-lg transition-colors duration-200
                ${isSelected ? 'bg-lime-100/70 dark:bg-lime-900/40' : ''}
                ${!isMultiSelectActive ? 'hover:bg-slate-100/70 dark:hover:bg-slate-700/50' : ''}
            `}
            style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        >
            {isMultiSelectActive && (
                <div className="flex-shrink-0">
                    <input type="checkbox" checked={isSelected} readOnly className="h-5 w-5 rounded-sm bg-slate-100 border-slate-300 text-lime-600 focus:ring-lime-500 pointer-events-none" />
                </div>
            )}
            <Icon className={`h-6 w-6 shrink-0 ${iconColor}`} />
            <div className="flex-grow flex flex-col min-w-0">
                {isEditing ? (
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={handleRenameCommit} onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCommit(); if (e.key === 'Escape') onCancelRename(); }} autoFocus onClick={e => e.stopPropagation()} className="w-full bg-white dark:bg-slate-800 border border-lime-500 rounded p-1 text-sm" />
                ) : (
                    <>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{name}</h3>
                        {(item.type === 'file' || item.type === 'url') && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {item.type === 'file' ? formatFileSize(item.size) : item.url.substring(0, 40) + '...'} &bull; {new Date(item.createdAt).toLocaleDateString()}
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
});


// --- Main Component ---
interface DocumentLibraryProps {
    documentLibrary: DocumentItem[];
    onUpdateLibrary: (updatedLibrary: DocumentItem[]) => void;
    onDeleteSelected: (itemIds: Set<string>) => void;
    onRenameItem: (itemId: string, newName: string) => Promise<void>;
    onMoveItems: (itemIds: Set<string>, targetFolderId: string | null) => Promise<void>;
    onBack: () => void;
    onViewFile: (fileId: string) => void;
}

const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ documentLibrary, onUpdateLibrary, onDeleteSelected, onRenameItem, onMoveItems, onBack, onViewFile }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [isUrlInputVisible, setUrlInputVisible] = useState(false);
    const [lastClickedId, setLastClickedId] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'default' | 'az' | 'za'>('az');
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
    const newFolderInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isMultiSelectActive = selectedIds.size > 0;

    const sortItems = useCallback((items: DocumentItem[], order: 'default' | 'az' | 'za'): DocumentItem[] => {
        if (order === 'default') return items;
        const sorted = [...items].sort((a, b) => {
            const nameA = (a.type === 'url' ? a.title : a.name).toLowerCase();
            const nameB = (b.type === 'url' ? b.title : b.name).toLowerCase();
            return order === 'az' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
        return sorted.map(item => item.type === 'folder' ? { ...item, children: sortItems(item.children, order) } : item);
    }, []);

    const sortedDocumentLibrary = useMemo(() => sortItems(documentLibrary, sortOrder), [documentLibrary, sortOrder, sortItems]);
    
    const flattenedItems = useMemo(() => {
        const flatList: DocumentItem[] = [];
        const recurse = (items: DocumentItem[]) => {
            items.forEach(item => {
                flatList.push(item);
                if (item.type === 'folder' && item.isOpen) recurse(item.children);
            });
        };
        recurse(sortedDocumentLibrary);
        return flatList;
    }, [sortedDocumentLibrary]);

    const findItem = (items: DocumentItem[], itemId: string): DocumentItem | null => {
        for (const item of items) {
          if (item.id === itemId) return item;
          if (item.type === 'folder') {
            const found = findItem(item.children, itemId);
            if (found) return found;
          }
        }
        return null;
    };
    
    const handleToggleSelection = (itemId: string, event: React.MouseEvent) => {
        const newSelection = new Set(selectedIds);
        if (event.shiftKey && lastClickedId) {
            const lastIndex = flattenedItems.findIndex(i => i.id === lastClickedId);
            const currentIndex = flattenedItems.findIndex(i => i.id === itemId);
            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);
                for (let i = start; i <= end; i++) newSelection.add(flattenedItems[i].id);
            }
        } else {
            if (newSelection.has(itemId)) newSelection.delete(itemId);
            else newSelection.add(itemId);
        }
        setSelectedIds(newSelection);
        setLastClickedId(itemId);
    };

    const handleContextMenu = useCallback((e: React.MouseEvent, item?: DocumentItem) => {
        e.preventDefault();
        e.stopPropagation();
        let currentSelection = selectedIds;
        if (item && !selectedIds.has(item.id)) {
            currentSelection = new Set([item.id]);
            setSelectedIds(currentSelection);
        } else if (!item) {
            currentSelection = new Set();
            setSelectedIds(new Set());
        }
        const singleItem = currentSelection.size === 1 ? findItem(documentLibrary, Array.from(currentSelection)[0]) : null;
        let menuItems: ContextMenuItem[] = [];
        if (singleItem) menuItems.push({ label: 'Renombrar', icon: <PencilSquareIcon className="h-4 w-4" />, action: () => setEditingItemId(singleItem.id) });
        if (currentSelection.size > 0) {
            menuItems.push({ label: 'Mover', icon: <FolderPlusIcon className="h-4 w-4" />, action: () => setIsMoveModalOpen(true) });
            menuItems.push({ isSeparator: true, label: '-', action: () => {} });
            menuItems.push({ label: `Eliminar (${currentSelection.size})`, icon: <TrashIcon className="h-4 w-4" />, action: () => { onDeleteSelected(currentSelection); setSelectedIds(new Set()); }, className: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50' });
        } else {
            menuItems.push({ label: 'Nueva Carpeta', icon: <FolderPlusIcon className="h-4 w-4" />, action: () => setIsCreatingFolder(true) });
        }
        setContextMenu({ x: e.clientX, y: e.clientY, items: menuItems });
    }, [selectedIds, documentLibrary, onDeleteSelected]);

    const handleAddNewFolder = (name: string) => {
        if (name.trim()) {
            const newFolder: DocumentFolder = { id: crypto.randomUUID(), type: 'folder', name: name.trim(), children: [], isOpen: true };
            onUpdateLibrary([newFolder, ...documentLibrary]);
        }
        setIsCreatingFolder(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const newFileItems: StoredFileItem[] = await Promise.all(Array.from(files).map(async file => {
            const { count, isApproximation } = await getFilePageCount(file);
            return {
                id: crypto.randomUUID(), type: 'file', name: file.name, mimeType: file.type, size: file.size,
                createdAt: new Date().toISOString(), pageCount: count, isPageCountApprox: isApproximation,
            };
        }));
        for (let i = 0; i < files.length; i++) await libraryService.saveFileContent(newFileItems[i].id, await fileToBase64(files[i]));
        onUpdateLibrary([...newFileItems, ...documentLibrary]);
        e.target.value = '';
    };

    const handleAddUrl = async () => {
        if (!newUrl.trim()) return;
        try {
            const { title } = await getTextFromWeb(newUrl.trim());
            const newUrlItem: StoredURLItem = {
                id: crypto.randomUUID(), type: 'url', url: newUrl.trim(), title, createdAt: new Date().toISOString()
            };
            onUpdateLibrary([newUrlItem, ...documentLibrary]);
            setNewUrl('');
            setUrlInputVisible(false);
        } catch (e) { console.error("Failed to add URL", e); }
    };

    const onToggleFolder = (folderId: string) => {
        const toggle = (items: DocumentItem[]): DocumentItem[] => items.map(item => {
            if (item.id === folderId && item.type === 'folder') return { ...item, isOpen: !item.isOpen };
            if (item.type === 'folder') return { ...item, children: toggle(item.children) };
            return item;
        });
        onUpdateLibrary(toggle(documentLibrary));
    };

    const renderTree = (items: DocumentItem[], level = 0): React.ReactNode => items.map(item => (
        <React.Fragment key={item.id}>
            <DocumentItemComponent 
                item={item} level={level} isMultiSelectActive={isMultiSelectActive} isSelected={selectedIds.has(item.id)} isEditing={editingItemId === item.id}
                onToggleSelection={handleToggleSelection}
                onPrimaryAction={(it) => { if (it.type === 'file') onViewFile(it.id); if (it.type === 'folder') onToggleFolder(it.id); }}
                onStartRename={() => setEditingItemId(item.id)}
                onCommitRename={async (name) => { await onRenameItem(item.id, name); setEditingItemId(null); }}
                onCancelRename={() => setEditingItemId(null)}
                onContextMenu={handleContextMenu}
            />
            {item.type === 'folder' && item.isOpen && renderTree(item.children, level + 1)}
        </React.Fragment>
    ));

    const SortIcon = sortOrder === 'az' ? BarsArrowUpIcon : sortOrder === 'za' ? BarsArrowDownIcon : ChevronUpDownIcon;

    return (
        <div className="animate-fade-in w-full max-w-7xl mx-auto flex flex-col h-full">
            <header className="flex-shrink-0 flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">ARCHIVOS</h2>
                <div className="flex items-center gap-2">
                    <button onClick={() => setUrlInputVisible(p => !p)} title="Añadir URL" className="p-2.5 rounded-full bg-purple-100/80 hover:bg-purple-200/70 dark:bg-purple-800/30 dark:hover:bg-purple-700/50 transition-colors"><GlobeIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" /></button>
                    <button onClick={() => fileInputRef.current?.click()} title="Subir Archivo" className="p-2.5 rounded-full bg-sky-100/80 hover:bg-sky-200/70 dark:bg-sky-800/30 dark:hover:bg-sky-700/50 transition-colors"><DocumentArrowUpIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" /></button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple accept=".pdf,.docx,.txt" />
                    <button onClick={onBack} className="inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-bold"><ArrowPathIcon className="h-5 w-5" /> Volver</button>
                </div>
            </header>

            {isUrlInputVisible && (
                <div className="flex items-stretch gap-2 my-2 animate-fade-in">
                    <input type="url" value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="Añadir URL de referencia..." className="flex-grow p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-lime-500" onKeyDown={e => e.key === 'Enter' && handleAddUrl()} />
                    <button onClick={handleAddUrl} className="px-4 py-2 font-bold bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors">Añadir</button>
                </div>
            )}
            
            <div className="flex-grow bg-white/40 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200/80 dark:border-slate-700/60 min-h-[300px] flex flex-col relative">
                <div className="flex-shrink-0">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button onClick={() => setIsCreatingFolder(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"><FolderPlusIcon className="h-5 w-5 text-sky-500" /> Nueva Carpeta</button>
                        </div>
                        <button onClick={() => setSortOrder(s => s === 'az' ? 'za' : 'az')} title={`Ordenar: ${sortOrder === 'az' ? 'A-Z' : 'Z-A'}`} className="p-2.5 rounded-full bg-slate-100/80 dark:bg-slate-700/50 hover:bg-slate-200/80 dark:hover:bg-slate-700"><SortIcon className="h-5 w-5 text-slate-600" /></button>
                    </div>
                    <hr className="my-4 border-slate-200/80 dark:border-slate-700/60" />
                </div>
                
                {isMultiSelectActive && (
                    <div className="flex-shrink-0 flex items-center justify-between gap-2 p-2 mb-4 rounded-lg bg-lime-100 dark:bg-lime-900/40 border border-lime-200 dark:border-lime-700">
                        <span className="text-sm font-bold px-2">{selectedIds.size} seleccionado(s)</span>
                        <div className="flex items-center gap-1">
                            <button title="Mover" onClick={() => setIsMoveModalOpen(true)} className="p-2 rounded-md"><FolderPlusIcon className="h-5 w-5" /></button>
                            <button title="Eliminar" onClick={() => onDeleteSelected(selectedIds)} className="p-2 rounded-md text-red-500"><TrashIcon className="h-5 w-5" /></button>
                            <button title="Cancelar Selección" onClick={() => setSelectedIds(new Set())} className="p-2 rounded-full"><XMarkIcon className="h-5 w-5" /></button>
                        </div>
                    </div>
                )}

                <div className="flex-grow overflow-y-auto -mx-4 px-4" onContextMenu={(e) => { if ((e.target as HTMLElement).closest('.group') === null) handleContextMenu(e); }}>
                    {isCreatingFolder && (
                        <div className="flex items-center gap-2 p-2" style={{ paddingLeft: '0.5rem' }}>
                            <FolderIcon className="h-6 w-6 shrink-0 text-lime-500" />
                            <input ref={newFolderInputRef} type="text" placeholder="Nombre de la carpeta..." onBlur={(e) => handleAddNewFolder(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddNewFolder(e.currentTarget.value); if (e.key === 'Escape') setIsCreatingFolder(false); }} className="w-full bg-white dark:bg-slate-800 border border-lime-500 rounded p-1 text-sm" />
                        </div>
                    )}
                    {sortedDocumentLibrary.length > 0 ? renderTree(sortedDocumentLibrary) : !isCreatingFolder && (<div className="text-center py-12"><p className="text-slate-500">Tu gestor está vacío.</p></div>)}
                </div>
            </div>
            
            {isMoveModalOpen && <DocumentMoveItemsModal documentLibrary={documentLibrary} selectedIds={selectedIds} onClose={() => setIsMoveModalOpen(false)} onMove={(folderId) => { onMoveItems(selectedIds, folderId); setIsMoveModalOpen(false); setSelectedIds(new Set()); }} />}
            {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />}
        </div>
    );
};

export default DocumentLibrary;