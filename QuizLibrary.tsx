import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SavedQuiz, LibraryItem, Folder, FlashcardDeck, Settings, Stats, PausedQuizState, StudyPlanSession } from '../types.ts';
import { FolderIcon, FolderOpenIcon, WrenchScrewdriverIcon, ArrowPathIcon, PencilSquareIcon, TrashIcon, CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon, FolderPlusIcon, PlusCircleIcon, BookOpenIcon, QueueListIcon, PauseCircleIcon, DocumentArrowUpIcon, CalendarDaysIcon, SparklesIcon, XMarkIcon, TrophyIcon, MagnifyingGlassIcon, DocumentArrowDownIcon, PaperClipIcon, BarsArrowUpIcon, BarsArrowDownIcon, ChevronUpDownIcon, InboxStackIcon } from './Icons.tsx';
import * as libraryService from '../services/libraryService.ts';
import MoveItemsModal from './MoveItemsModal.tsx';

const findItem = (items: LibraryItem[], itemId: string): LibraryItem | null => {
  for (const item of items) {
    if (item.id === itemId) return item;
    if (item.type === 'folder') {
      const found = findItem(item.children, itemId);
      if (found) return found;
    }
  }
  return null;
};

const StatCard: React.FC<{
    icon: React.ReactNode;
    value: number;
    label: string;
    colorClass: string;
    onClick?: () => void;
}> = ({ icon, value, label, colorClass, onClick }) => {
    
    const isClickable = !!onClick;
    const Tag = isClickable ? 'button' : 'div';

    const cardContent = (
         <div className="flex items-center p-4">
            <div className={`mr-4 p-3 rounded-lg ${colorClass}`}>{icon}</div>
            <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 font-sans">{label}</p>
            </div>
        </div>
    );

    return (
        <Tag
            onClick={onClick}
            disabled={!isClickable}
            className={`w-full text-left bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 transition-transform duration-200 ${isClickable ? 'hover:scale-105 hover:shadow-lg hover:border-lime-300 dark:hover:border-lime-600 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100' : 'cursor-default'}`}
        >
            {cardContent}
        </Tag>
    );
};


const StatisticsDashboard: React.FC<{ 
    stats: Stats, 
    onStartPracticeConfiguration: (type: 'correct' | 'failed' | 'unanswered' | 'srs' | 'none') => void;
}> = ({ 
    stats, 
    onStartPracticeConfiguration,
}) => (
  <div className="mb-8 animate-fade-in">
    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-4">Progreso en esta Biblioteca</h3>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard 
        icon={<CheckCircleIcon className="h-6 w-6 text-green-700 dark:text-green-300" />} 
        value={stats.correct} 
        label="Acertadas" 
        colorClass="bg-green-200 dark:bg-green-800/60" 
        onClick={() => onStartPracticeConfiguration('correct')}
      />
      <StatCard 
        icon={<XCircleIcon className="h-6 w-6 text-red-700 dark:text-red-300" />} 
        value={stats.totalFailed} 
        label="Falladas" 
        colorClass="bg-red-200 dark:bg-red-800/60" 
        onClick={() => onStartPracticeConfiguration('failed')}
      />
      <StatCard 
        icon={<QuestionMarkCircleIcon className="h-6 w-6 text-sky-700 dark:text-sky-300" />} 
        value={stats.unanswered} 
        label="En Blanco" 
        colorClass="bg-sky-200 dark:bg-sky-800/60" 
        onClick={() => onStartPracticeConfiguration('unanswered')}
      />
      <StatCard 
        icon={<ArrowPathIcon className="h-6 w-6 text-amber-700 dark:text-amber-300" />} 
        value={stats.srsDue} 
        label="Para Repasar" 
        colorClass="bg-amber-200 dark:bg-amber-800/60" 
        onClick={() => onStartPracticeConfiguration('srs')} 
      />
    </div>
  </div>
);


interface LibraryItemComponentProps {
    item: LibraryItem;
    level: number;
    isOpen: boolean;
    isMultiSelectActive: boolean;
    isSelected: boolean;
    isEditing: boolean;
    onActivateMultiSelect: (itemId: string) => void;
    onToggleMultiSelect: (itemId: string, event: React.MouseEvent) => void;
    onSingleClick: (item: LibraryItem) => void;
    onStartRename: () => void;
    onCommitRename: (newName: string) => void;
    onCancelRename: () => void;
    onViewFile: (fileId: string) => void;
}

const LibraryItemComponent: React.FC<LibraryItemComponentProps> = React.memo(({
    item, level, isOpen, isMultiSelectActive, isSelected, isEditing,
    onActivateMultiSelect, onToggleMultiSelect, onSingleClick,
    onStartRename, onCommitRename, onCancelRename, onViewFile
}) => {
    const [name, setName] = useState(item.type === 'folder' ? item.name : item.title);
    
    const longPressTimeout = useRef<number | null>(null);
    const pressStartPos = useRef<{ x: number, y: number } | null>(null);

    useEffect(() => {
        setName(item.type === 'folder' ? item.name : item.title);
    }, [item]);
    
    const handleRenameCommit = () => {
        if (name.trim() && name.trim() !== (item.type === 'folder' ? item.name : item.title)) {
            onCommitRename(name.trim());
        } else {
            onCancelRename();
        }
    };

    const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (isMultiSelectActive || isEditing) return;
        const pos = 'touches' in e ? e.touches[0] : e;
        pressStartPos.current = { x: pos.clientX, y: pos.clientY };

        longPressTimeout.current = window.setTimeout(() => {
            onActivateMultiSelect(item.id);
            longPressTimeout.current = null;
            pressStartPos.current = null;
        }, 500);
    };

    const handlePressMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!longPressTimeout.current || !pressStartPos.current) return;
        const pos = 'touches' in e ? e.touches[0] : e;
        const dx = Math.abs(pos.clientX - pressStartPos.current.x);
        const dy = Math.abs(pos.clientY - pressStartPos.current.y);

        if (dx > 10 || dy > 10) {
            if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
            longPressTimeout.current = null;
            pressStartPos.current = null;
        }
    };

    const handlePressEnd = () => {
        if (longPressTimeout.current) {
            clearTimeout(longPressTimeout.current);
            longPressTimeout.current = null;
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isEditing) {
            e.stopPropagation();
            return;
        }
        if (isMultiSelectActive) {
            onToggleMultiSelect(item.id, e);
        } else {
            onSingleClick(item);
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isEditing) return;
        if (isMultiSelectActive) {
            onToggleMultiSelect(item.id, e);
        } else {
            onActivateMultiSelect(item.id);
        }
    };

    const isFolder = item.type === 'folder';
    const isDeck = item.type === 'deck';
    const isQuiz = item.type === 'quiz';
    const Icon = isFolder ? (isOpen ? FolderOpenIcon : FolderIcon) : (isDeck ? QueueListIcon : BookOpenIcon);
    const sourceFileId = isQuiz ? (item as SavedQuiz).questions[0]?.sourceFileId : undefined;
    
    return (
        <div 
          onMouseDown={handlePressStart}
          onMouseMove={handlePressMove}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchMove={handlePressMove}
          onTouchEnd={handlePressEnd}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onDoubleClick={isMultiSelectActive ? undefined : onStartRename}
          className={`group flex items-center gap-3 p-3 rounded-lg transition-colors duration-200
            ${isSelected ? 'bg-lime-100/70 dark:bg-lime-900/40' : ''}
            ${!isMultiSelectActive ? 'hover:bg-slate-100/70 dark:hover:bg-slate-700/50' : ''}
          `}
          style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        >
             {isMultiSelectActive && (
                <div className="flex-shrink-0">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="h-5 w-5 rounded-sm bg-slate-100 border-slate-300 text-lime-600 focus:ring-lime-500 pointer-events-none"
                    />
                </div>
            )}
            <Icon className={`h-6 w-6 shrink-0 ${isFolder ? 'text-lime-500' : (isDeck ? 'text-sky-500' : 'text-slate-400 dark:text-slate-500')}`} />
            <div className="flex-grow flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={handleRenameCommit}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCommit(); if (e.key === 'Escape') onCancelRename(); }}
                            autoFocus
                            onClick={e => e.stopPropagation()}
                            className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-lime-500 rounded p-1 text-sm font-sans"
                        />
                    ) : (
                         <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{name}</h3>
                    )}
                    {!isEditing && sourceFileId && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewFile(sourceFileId);
                            }}
                            title="Ver archivo adjunto"
                            className="opacity-60 group-hover:opacity-100 text-slate-500 hover:text-sky-500 transition-opacity"
                        >
                            <PaperClipIcon className="h-4 w-4" />
                        </button>
                    )}
                </div>
                {!isEditing && (item.type === 'quiz' || item.type === 'deck') && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {isQuiz && `${(item as SavedQuiz).questions.length} preguntas`}
                        {isDeck && `${(item as FlashcardDeck).cards.length} fichas`}
                        &nbsp;&bull;&nbsp; {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                )}
            </div>
             {!isEditing && isQuiz && (item.completionCount === undefined || item.completionCount === 0) && (
                <span className="flex-shrink-0 text-xs font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 px-2 py-0.5 rounded-full">
                    Nuevo
                </span>
            )}
            {!isEditing && isQuiz && (item.completionCount || 0) > 0 && (
                <span className="flex-shrink-0 text-xs font-mono font-bold bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                    x{item.completionCount}
                </span>
            )}
        </div>
    );
});

interface QuizLibraryProps {
    library: LibraryItem[];
    openFolders: Set<string>;
    onToggleFolder: (folderId: string) => void;
    // FIX: Add onMoveItems prop to align with the pure function pattern in App.tsx.
    onMoveItems: (itemIds: Set<string>, targetFolderId: string | null) => void;
    pausedQuiz: PausedQuizState | null;
    onResumeQuiz: () => void;
    plannedSessions: StudyPlanSession[];
    onStartPlannedQuiz: (session: StudyPlanSession) => void;
    activeLibraryName: string;
    settings: Settings;
    stats: Stats;
    onViewDetails: (quiz: SavedQuiz) => void;
    onStudyDeck: (deck: FlashcardDeck) => void;
    onEdit: (quiz: SavedQuiz) => void;
    onUpdateLibrary: (updatedLibrary: LibraryItem[]) => void;
    onDeleteSelected: (itemIds: Set<string>) => void;
    onStartCustomConfiguration: () => void;
    onStartCreation: () => void;
    onSelectImportFile: (file: File) => void;
    reloadAppData: () => Promise<void>;
    onViewDocuments: () => void;
    onStartChallenge: (type: 'weekly' | 'monthly') => void;
    onOpenAdvancedSearch: () => void;
    isWeeklyAvailable: boolean;
    isMonthlyAvailable: boolean;
    onStartPracticeConfiguration: (type: 'correct' | 'failed' | 'unanswered' | 'srs' | 'none') => void;
    onStartExport: () => void;
    onStartPdfExport: () => void;
    onAttachFile: (itemIds: Set<string>) => void;
    onViewFile: (fileId: string) => void;
    importInputRef: React.RefObject<HTMLInputElement>;
}

const QuizLibrary: React.FC<QuizLibraryProps> = ({
    library,
    openFolders,
    onToggleFolder,
    onMoveItems,
    pausedQuiz,
    onResumeQuiz,
    plannedSessions,
    onStartPlannedQuiz,
    settings,
    stats,
    onViewDetails,
    onStudyDeck,
    onEdit,
    onUpdateLibrary,
    onDeleteSelected,
    onStartCustomConfiguration,
    onStartCreation,
    onSelectImportFile,
    reloadAppData,
    onViewDocuments,
    onStartChallenge,
    onOpenAdvancedSearch,
    isWeeklyAvailable,
    isMonthlyAvailable,
    onStartPracticeConfiguration,
    onStartExport,
    onStartPdfExport,
    onAttachFile,
    onViewFile,
    importInputRef,
}) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [isChallengeMenuOpen, setChallengeMenuOpen] = useState(false);
    const [isExportModalOpen, setExportModalOpen] = useState(false);
    const [sortOrder, setSortOrder] = useState<'default' | 'az' | 'za'>('az');
    const newFolderInputRef = useRef<HTMLInputElement>(null);
    const [lastClickedId, setLastClickedId] = useState<string | null>(null);
    
    const isMultiSelectActive = selectedIds.size > 0;
    const singleSelectedItem = isMultiSelectActive && selectedIds.size === 1 ? findItem(library, Array.from(selectedIds)[0]) : null;

    const handleActivateMultiSelect = (itemId: string) => {
        setSelectedIds(new Set([itemId]));
        setLastClickedId(itemId);
    };

    const handleClearSelection = () => {
        setSelectedIds(new Set());
        setLastClickedId(null);
    };

    const updateItemInTree = useCallback((items: LibraryItem[], itemId: string, updateFn: (item: LibraryItem) => LibraryItem): LibraryItem[] => {
        return items.map(item => {
            if (item.id === itemId) return updateFn(item);
            if (item.type === 'folder') return { ...item, children: updateItemInTree(item.children, itemId, updateFn) };
            return item;
        });
    }, []);
    
    const flattenedLibraryForShift = useMemo(() => {
        const flatList: LibraryItem[] = [];
        const recurse = (items: LibraryItem[]) => {
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
    
    const handleCommitRename = (newName: string) => {
        if (editingItemId) {
            onUpdateLibrary(updateItemInTree(library, editingItemId, item => ({
                ...item,
                [item.type === 'folder' ? 'name' : 'title']: newName
            })));
        }
        setEditingItemId(null);
    };

    const handleDeleteSelected = async () => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar ${selectedIds.size} elemento(s)? Esta acción es irreversible.`)) {
            await onDeleteSelected(selectedIds);
            handleClearSelection();
        }
    };
    
    // FIX: Refactor handleMoveSelected to use the 'onMoveItems' prop for moving items,
    // aligning with the application's pure function pattern for state management.
    const handleMoveSelected = (targetFolderId: string | null) => {
        onMoveItems(selectedIds, targetFolderId);
        handleClearSelection();
        setIsMoveModalOpen(false);
    };

    const handleAddNewFolder = (name: string) => {
        if (name.trim()) {
            const newFolder: Folder = { id: crypto.randomUUID(), type: 'folder', name: name.trim(), children: [], isOpen: true };
            onUpdateLibrary([newFolder, ...library]);
        }
        setIsCreatingFolder(false);
    };
    
    useEffect(() => {
        if (isCreatingFolder && newFolderInputRef.current) {
            newFolderInputRef.current.focus();
        }
    }, [isCreatingFolder]);

    const sortItems = useCallback((items: LibraryItem[], order: 'default' | 'az' | 'za'): LibraryItem[] => {
        if (order === 'default') {
            return items;
        }

        const sorted = [...items].sort((a, b) => {
            const nameA = (a.type === 'folder' ? a.name : a.title).toLowerCase();
            const nameB = (b.type === 'folder' ? b.name : b.title).toLowerCase();
            if (order === 'az') {
                return nameA.localeCompare(nameB);
            } else { // 'za'
                return nameB.localeCompare(nameA);
            }
        });

        return sorted.map(item => {
            if (item.type === 'folder') {
                return { ...item, children: sortItems(item.children, order) };
            }
            return item;
        });
    }, []);

    const sortedLibrary = useMemo(() => sortItems(library, sortOrder), [library, sortOrder, sortItems]);
    
    const handleToggleMultiSelect = (itemId: string, event: React.MouseEvent) => {
        const newSelection = new Set(selectedIds);
        const isCurrentlySelected = newSelection.has(itemId);

        if (event.shiftKey && lastClickedId) {
            const flatItemsForShift = flattenedLibraryForShift;
            const lastIndex = flatItemsForShift.findIndex(i => i.id === lastClickedId);
            const currentIndex = flatItemsForShift.findIndex(i => i.id === itemId);

            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);
                const targetState = !isCurrentlySelected;

                for (let i = start; i <= end; i++) {
                    const itemInRange = flatItemsForShift[i];
                    if (targetState) {
                        newSelection.add(itemInRange.id);
                    } else {
                        newSelection.delete(itemInRange.id);
                    }
                }
                setSelectedIds(newSelection);
                return;
            }
        }
        
        if (isCurrentlySelected) {
            newSelection.delete(itemId);
        } else {
            newSelection.add(itemId);
        }
        setSelectedIds(newSelection);
        setLastClickedId(itemId);
    };

    const cycleSortOrder = () => {
        setSortOrder(current => {
            if (current === 'default') return 'az';
            if (current === 'az') return 'za';
            return 'default';
        });
    };

    const SortIcon = sortOrder === 'az' ? BarsArrowUpIcon : sortOrder === 'za' ? BarsArrowDownIcon : ChevronUpDownIcon;
    const sortLabel = sortOrder === 'az' ? 'A-Z' : sortOrder === 'za' ? 'Z-A' : 'Orden por Defecto';
    
    const renderLibraryTree = (items: LibraryItem[], level = 0): React.ReactNode => {
        return items.map(item => (
            <React.Fragment key={item.id}>
                 <LibraryItemComponent 
                    item={item} 
                    level={level}
                    isOpen={item.type === 'folder' ? openFolders.has(item.id) : false}
                    isMultiSelectActive={isMultiSelectActive}
                    isSelected={selectedIds.has(item.id)}
                    isEditing={editingItemId === item.id}
                    onActivateMultiSelect={handleActivateMultiSelect}
                    onToggleMultiSelect={handleToggleMultiSelect}
                    onSingleClick={(clickedItem) => {
                        if (clickedItem.type === 'quiz') onViewDetails(clickedItem as SavedQuiz);
                        if (clickedItem.type === 'deck') onStudyDeck(clickedItem as FlashcardDeck);
                        if (clickedItem.type === 'folder') onToggleFolder(clickedItem.id);
                    }}
                    onStartRename={() => setEditingItemId(item.id)}
                    onCommitRename={handleCommitRename}
                    onCancelRename={() => setEditingItemId(null)}
                    onViewFile={onViewFile}
                />
                {item.type === 'folder' && openFolders.has(item.id) && renderLibraryTree(item.children, level + 1)}
            </React.Fragment>
        ));
    };


    return (
        <div className="animate-fade-in w-full max-w-7xl mx-auto flex flex-col h-full">
             {settings.showStats && <StatisticsDashboard 
                stats={stats} 
                onStartPracticeConfiguration={(type) => onStartPracticeConfiguration(type as 'correct' | 'failed' | 'unanswered' | 'srs' | 'none')}
             />}
            
            <div className="flex-shrink-0 mb-4 flex justify-between items-center gap-4">
                 <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Mi Colección</h3>
                    <button onClick={cycleSortOrder} title={`Ordenar por: ${sortLabel}`} className="p-2.5 rounded-full bg-slate-100/80 dark:bg-slate-700/50 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors">
                        <SortIcon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    {settings.showDocumentManager &&
                        <button onClick={onViewDocuments} title="Gestor de Contenido" className="p-2.5 rounded-full bg-purple-100/80 dark:bg-purple-800/30 hover:bg-purple-200/70 dark:hover:bg-purple-700/50 transition-colors">
                            <InboxStackIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </button>
                    }
                    <button onClick={onStartCreation} title="Añadir Contenido" className="p-2.5 rounded-full bg-lime-100/80 dark:bg-lime-800/30 hover:bg-lime-200/70 dark:hover:bg-lime-700/50 transition-colors shadow-sm shadow-lime-500/10">
                        <PlusCircleIcon className="h-5 w-5 text-lime-600 dark:text-lime-400" />
                    </button>
                     <button onClick={onOpenAdvancedSearch} title="Buscar" className="p-2.5 rounded-full bg-sky-100/80 dark:bg-sky-800/30 hover:bg-sky-200/70 dark:hover:bg-sky-700/50 transition-colors">
                        <MagnifyingGlassIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                    </button>
                </div>
            </div>

            <div className="flex-grow bg-white/40 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200/80 dark:border-slate-700/60 min-h-[300px] flex flex-col">
                <div className="flex-shrink-0">
                    {isMultiSelectActive ? (
                        <div className="flex items-center justify-between gap-2 sm:gap-4 p-2 rounded-lg bg-lime-50 dark:bg-lime-900/40 border border-lime-200 dark:border-lime-700 animate-fade-in">
                            <span className="text-sm font-bold px-2 text-lime-800 dark:text-lime-200">{selectedIds.size} seleccionado(s)</span>
                            <div className="flex items-center gap-1">
                                <button title="Mover" onClick={() => setIsMoveModalOpen(true)} className="p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><FolderPlusIcon className="h-5 w-5" /></button>
                                <button title="Editar Contenido" disabled={!singleSelectedItem || singleSelectedItem.type !== 'quiz'} onClick={() => onEdit(singleSelectedItem as SavedQuiz)} className="p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><PencilSquareIcon className="h-5 w-5" /></button>
                                <button title="Eliminar" onClick={handleDeleteSelected} className="p-2 rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"><TrashIcon className="h-5 w-5" /></button>
                            </div>
                            <button title="Cancelar Selección" onClick={handleClearSelection} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><XMarkIcon className="h-5 w-5" /></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button onClick={() => setIsCreatingFolder(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                <FolderPlusIcon className="h-5 w-5 text-sky-500" />
                                <span>Nueva Carpeta</span>
                            </button>
                            <button onClick={onStartCustomConfiguration} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                <SparklesIcon className="h-5 w-5 text-amber-500" />
                                <span>Test Personalizado</span>
                            </button>
                            <button onClick={() => setChallengeMenuOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                <TrophyIcon className="h-5 w-5 text-purple-500" />
                                <span>Reto</span>
                            </button>
                        </div>
                    )}
                    <hr className="my-4 border-slate-200/80 dark:border-slate-700/60" />
                </div>
                {pausedQuiz && (
                    <div className="mb-4 p-4 bg-yellow-100/70 dark:bg-yellow-800/40 border border-yellow-300 dark:border-yellow-700 rounded-lg flex items-center justify-between gap-4">
                        <div>
                            <p className="font-bold text-yellow-800 dark:text-yellow-200">Test en Pausa</p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">{pausedQuiz.quizTitle}</p>
                        </div>
                        <button onClick={onResumeQuiz} className="px-4 py-2 text-sm font-bold bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">Reanudar</button>
                    </div>
                )}
                 {plannedSessions.length > 0 && (
                    <div className="mb-4 p-4 bg-purple-100/70 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700 rounded-lg space-y-3">
                         <h3 className="font-bold text-purple-800 dark:text-purple-200 flex items-center gap-2"><CalendarDaysIcon className="h-5 w-5"/>Plan de Hoy</h3>
                         {plannedSessions.map(session => (
                            <div key={session.id} className="flex items-center justify-between gap-2">
                                <p className="text-sm text-purple-700 dark:text-purple-300 flex-grow">
                                  <span className="font-bold">{session.blockName}:</span> {session.fileName} (p. {session.startPage}-{session.endPage})
                                </p>
                                <button onClick={() => onStartPlannedQuiz(session)} className="px-3 py-1 text-xs font-bold bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors">Empezar</button>
                            </div>
                         ))}
                    </div>
                )}
                 <div className="flex-grow overflow-y-auto -mx-4 px-4">
                    {isCreatingFolder && (
                        <div className="flex items-center gap-2 p-2" style={{ paddingLeft: '0.5rem' }}>
                            <FolderIcon className="h-6 w-6 shrink-0 text-lime-500" />
                            <input
                                ref={newFolderInputRef}
                                type="text"
                                placeholder="Nombre de la carpeta..."
                                onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleAddNewFolder(e.currentTarget.value)}
                                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleAddNewFolder(e.currentTarget.value); if (e.key === 'Escape') setIsCreatingFolder(false); }}
                                className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-lime-500 rounded p-1 text-sm"
                            />
                        </div>
                    )}
                    
                    {sortedLibrary.length > 0 ? renderLibraryTree(sortedLibrary) : !isCreatingFolder && (
                        <div className="text-center py-12 px-6">
                            <p className="text-slate-500 dark:text-slate-400 font-sans">Tu biblioteca está vacía.</p>
                            <p className="text-slate-500 dark:text-slate-400 font-sans mt-1">Usa el botón '+' para empezar a crear contenido.</p>
                        </div>
                    )}
                </div>
            </div>
            
            {isMoveModalOpen && <MoveItemsModal library={library} selectedIds={selectedIds} onClose={() => setIsMoveModalOpen(false)} onMove={handleMoveSelected} />}
            
             <div className="flex-shrink-0 mt-auto pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-center items-center gap-4">
                <button onClick={() => importInputRef.current?.click()} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg bg-white/50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <DocumentArrowUpIcon className="h-5 w-5" /> Importar
                </button>
                <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={(e) => { if (e.target.files?.[0]) onSelectImportFile(e.target.files[0]); e.target.value = ''; }} />
                
                <button onClick={() => setExportModalOpen(true)} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg bg-white/50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <DocumentArrowDownIcon className="h-5 w-5" /> Exportar
                </button>
            </div>

            {/* Challenge Menu Modal */}
            {isChallengeMenuOpen && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setChallengeMenuOpen(false)}>
                    <div className="relative bg-[#FAF8F1] dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center">Elige un Reto</h3>
                        <button 
                            onClick={() => { onStartChallenge('weekly'); setChallengeMenuOpen(false); }}
                            disabled={!isWeeklyAvailable}
                            className="w-full text-left flex items-center gap-4 p-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <TrophyIcon className="h-8 w-8 text-amber-500 flex-shrink-0" />
                            <div>
                                <span className="font-bold text-slate-800 dark:text-slate-100">Reto de la Semana</span>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Un test rápido para mantenerte en forma.</p>
                                {!isWeeklyAvailable && <span className="text-xs text-green-500 font-semibold mt-1 block">Completado esta semana</span>}
                            </div>
                        </button>
                        <button 
                            onClick={() => { onStartChallenge('monthly'); setChallengeMenuOpen(false); }}
                            disabled={!isMonthlyAvailable}
                            className="w-full text-left flex items-center gap-4 p-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <TrophyIcon className="h-8 w-8 text-indigo-500 flex-shrink-0" />
                            <div>
                                <span className="font-bold text-slate-800 dark:text-slate-100">Reto del Mes</span>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Un desafío más largo para probar tu conocimiento.</p>
                                {!isMonthlyAvailable && <span className="text-xs text-green-500 font-semibold mt-1 block">Completado este mes</span>}
                            </div>
                        </button>
                    </div>
                </div>
            )}

             {/* Export Menu Modal */}
            {isExportModalOpen && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setExportModalOpen(false)}>
                    <div className="relative bg-[#FAF8F1] dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center">Elige un formato de exportación</h3>
                        <button 
                            onClick={() => { onStartExport(); setExportModalOpen(false); }}
                            className="w-full text-left flex items-center gap-4 p-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600"
                        >
                            <DocumentArrowDownIcon className="h-8 w-8 text-sky-500 flex-shrink-0" />
                            <div>
                                <span className="font-bold text-slate-800 dark:text-slate-100">Exportar a JSON</span>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Ideal para copias de seguridad y compartir.</p>
                            </div>
                        </button>
                        <button 
                            onClick={() => { onStartPdfExport(); setExportModalOpen(false); }}
                            className="w-full text-left flex items-center gap-4 p-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600"
                        >
                            <DocumentArrowDownIcon className="h-8 w-8 text-red-500 flex-shrink-0" />
                            <div>
                                <span className="font-bold text-slate-800 dark:text-slate-100">Exportar a PDF</span>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Crea un documento imprimible de tus tests.</p>
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizLibrary;