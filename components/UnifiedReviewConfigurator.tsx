import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { QuizQuestion, LibraryItem, Folder } from '../types.ts';
import { SparklesIcon, ArrowPathIcon, CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon, BookOpenIcon, FolderIcon, FolderOpenIcon, MagnifyingGlassEyeIcon } from './Icons.tsx';

// Helper to get all questions from a selection of library items
const getQuestionsFromSelection = (library: LibraryItem[], selectedIds: Set<string>): QuizQuestion[] => {
    const questions = new Map<string, QuizQuestion>();
    
    const recurse = (items: LibraryItem[]) => {
        for (const item of items) {
            if (item.type === 'quiz' && selectedIds.has(item.id)) {
                item.questions.forEach(q => questions.set(q.id, q));
            } else if (item.type === 'folder') {
                if (selectedIds.has(item.id)) {
                    // If folder itself is selected, add all its children
                    const addAllChildren = (folderItems: LibraryItem[]) => {
                        folderItems.forEach(child => {
                            if (child.type === 'quiz') {
                                child.questions.forEach(q => questions.set(q.id, q));
                            } else if (child.type === 'folder') {
                                addAllChildren(child.children);
                            }
                        });
                    };
                    addAllChildren(item.children);
                } else {
                    // Otherwise, recurse to check if children are selected individually
                    recurse(item.children);
                }
            }
        }
    };
    
    recurse(library);
    return Array.from(questions.values());
};

const sortLibraryItems = (items: LibraryItem[]): LibraryItem[] => {
    const sorted = [...items].sort((a, b) => {
        const nameA = (a.type === 'folder' ? a.name : a.title).toLowerCase();
        const nameB = (b.type === 'folder' ? b.name : b.title).toLowerCase();
        return nameA.localeCompare(nameB);
    });

    return sorted.map(item => {
        if (item.type === 'folder') {
            return { ...item, children: sortLibraryItems(item.children) };
        }
        return item;
    });
};


interface UnifiedReviewConfiguratorProps {
    library: LibraryItem[];
    correctQuestions: QuizQuestion[];
    failedQuestions: QuizQuestion[];
    unansweredQuestions: QuizQuestion[];
    srsQuestions: QuizQuestion[];
    initialStatus: 'correct' | 'failed' | 'unanswered' | 'srs' | 'none';
    onCreate: (questions: QuizQuestion[]) => void;
    onCancel: () => void;
    onViewQuestions: (questions: QuizQuestion[], title: string) => void;
}

const UnifiedReviewConfigurator: React.FC<UnifiedReviewConfiguratorProps> = ({
    library,
    correctQuestions,
    failedQuestions,
    unansweredQuestions,
    srsQuestions,
    initialStatus,
    onCreate,
    onCancel,
    onViewQuestions,
}) => {
    const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
    const [isEditingCount, setIsEditingCount] = useState(false);
    const [lastClickedId, setLastClickedId] = useState<string|null>(null);

    const [selectedStatuses, setSelectedStatuses] = useState({
        correct: initialStatus === 'correct',
        failed: initialStatus === 'failed',
        unanswered: initialStatus === 'unanswered',
        srs: initialStatus === 'srs',
    });

    const sortedLibrary = useMemo(() => sortLibraryItems(library), [library]);

    const flattenedLibrary = useMemo(() => {
        const flatList: LibraryItem[] = [];
        const recurse = (items: LibraryItem[]) => {
            items.forEach(item => {
                flatList.push(item);
                if (item.type === 'folder' && openFolders.has(item.id)) { // Only consider visible items
                    recurse(item.children);
                }
            });
        };
        recurse(sortedLibrary);
        return flatList;
    }, [sortedLibrary, openFolders]);

    const allIds = useMemo(() => new Set(flattenedLibrary.map(item => item.id)), [flattenedLibrary]);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(allIds);

    const questionsInScope = useMemo(() => {
        return getQuestionsFromSelection(library, selectedItemIds);
    }, [library, selectedItemIds]);

    const statusCountsInScope = useMemo(() => {
        const questionIdsInScope = new Set(questionsInScope.map(q => q.id));
        return {
            correct: correctQuestions.filter(q => questionIdsInScope.has(q.id)).length,
            failed: failedQuestions.filter(q => questionIdsInScope.has(q.id)).length,
            unanswered: unansweredQuestions.filter(q => questionIdsInScope.has(q.id)).length,
            srs: srsQuestions.filter(q => questionIdsInScope.has(q.id)).length,
        };
    }, [questionsInScope, correctQuestions, failedQuestions, unansweredQuestions, srsQuestions]);


    const availableQuestions = useMemo(() => {
        const isStatusFilterActive = selectedStatuses.correct || selectedStatuses.failed || selectedStatuses.unanswered || selectedStatuses.srs;

        if (!isStatusFilterActive) {
            return questionsInScope;
        }

        const questionIdsInScope = new Set(questionsInScope.map(q => q.id));
        const pool = new Set<QuizQuestion>();

        if (selectedStatuses.correct) {
            correctQuestions.forEach(q => {
                if (questionIdsInScope.has(q.id)) pool.add(q);
            });
        }
        if (selectedStatuses.failed) {
            failedQuestions.forEach(q => {
                if (questionIdsInScope.has(q.id)) pool.add(q);
            });
        }
        if (selectedStatuses.unanswered) {
            unansweredQuestions.forEach(q => {
                if (questionIdsInScope.has(q.id)) pool.add(q);
            });
        }
        if (selectedStatuses.srs) {
            srsQuestions.forEach(q => {
                if (questionIdsInScope.has(q.id)) pool.add(q);
            });
        }
        
        return Array.from(pool);
    }, [questionsInScope, selectedStatuses, correctQuestions, failedQuestions, unansweredQuestions, srsQuestions]);


    const [questionCount, setQuestionCount] = useState(0);

    useEffect(() => {
        setQuestionCount(prev => Math.min(prev, availableQuestions.length));
    }, [availableQuestions.length]);
    
    useEffect(() => {
        setQuestionCount(Math.min(20, availableQuestions.length));
    }, [availableQuestions.length]);

    const toggleItemSelection = useCallback((item: LibraryItem, event: React.MouseEvent) => {
        const newSelection = new Set(selectedItemIds);
        const isCurrentlySelected = newSelection.has(item.id);
    
        if (event.shiftKey && lastClickedId) {
            const lastIndex = flattenedLibrary.findIndex(i => i.id === lastClickedId);
            const currentIndex = flattenedLibrary.findIndex(i => i.id === item.id);
    
            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);
                const targetState = !isCurrentlySelected;
    
                for (let i = start; i <= end; i++) {
                    const itemInRange = flattenedLibrary[i];
                    if (targetState) newSelection.add(itemInRange.id);
                    else newSelection.delete(itemInRange.id);
                }
                setSelectedItemIds(newSelection);
                return;
            }
        }
    
        const processItem = (currentItem: LibraryItem, check: boolean) => {
            if (check) newSelection.add(currentItem.id);
            else newSelection.delete(currentItem.id);
            if (currentItem.type === 'folder') currentItem.children.forEach(child => processItem(child, check));
        };
        processItem(item, !isCurrentlySelected);
        setSelectedItemIds(newSelection);
        setLastClickedId(item.id);
    }, [selectedItemIds, lastClickedId, flattenedLibrary]);
    
    
    const handleSelectAll = () => setSelectedItemIds(allIds);
    const handleDeselectAll = () => setSelectedItemIds(new Set());

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
        const finalQuestions = shuffled.slice(0, questionCount);
        onCreate(finalQuestions);
    };

    const handleViewStatusQuestions = (status: 'correct' | 'failed' | 'unanswered' | 'srs') => {
        let questionsToView: QuizQuestion[] = [];
        let title = '';
        const questionIdsInScope = new Set(questionsInScope.map(q => q.id));

        if (status === 'correct') {
            questionsToView = correctQuestions.filter(q => questionIdsInScope.has(q.id));
            title = 'Preguntas Acertadas';
        } else if (status === 'failed') {
            questionsToView = failedQuestions.filter(q => questionIdsInScope.has(q.id));
            title = 'Preguntas Falladas';
        } else if (status === 'unanswered'){
            questionsToView = unansweredQuestions.filter(q => questionIdsInScope.has(q.id));
            title = 'Preguntas en Blanco';
        } else {
             questionsToView = srsQuestions.filter(q => questionIdsInScope.has(q.id));
             title = 'Preguntas para Repasar';
        }
        
        onViewQuestions(questionsToView, title);
    };

    const handleCountInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const newCount = parseInt(e.target.value, 10);
        if (!isNaN(newCount)) {
            setQuestionCount(Math.max(0, Math.min(newCount, availableQuestions.length)));
        }
        setIsEditingCount(false);
    };

    const handleCountInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const newCount = parseInt(e.currentTarget.value, 10);
            if (!isNaN(newCount)) {
                setQuestionCount(Math.max(0, Math.min(newCount, availableQuestions.length)));
            }
            setIsEditingCount(false);
        } else if (e.key === 'Escape') {
            setIsEditingCount(false);
        }
    };


    const renderItemTree = (items: LibraryItem[], level = 0): React.ReactNode => {
        return items.map(item => (
          <div key={item.id} style={{ paddingLeft: `${level * 1.5}rem`}}>
            <div className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-700/50">
              <input type="checkbox" checked={selectedItemIds.has(item.id)} onChange={() => {}} onClick={(e) => toggleItemSelection(item, e)} className="h-4 w-4 rounded text-lime-600 focus:ring-lime-500"/>
              <div className="flex-shrink-0 cursor-pointer" onClick={(e) => { e.preventDefault(); if(item.type === 'folder') setOpenFolders(p => { const n = new Set(p); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; }); }}>
                {item.type === 'folder' ? (openFolders.has(item.id) ? <FolderOpenIcon className="h-5 w-5 text-lime-500" /> : <FolderIcon className="h-5 w-5 text-lime-500" />) : <BookOpenIcon className="h-5 w-5 text-slate-500" />}
              </div>
              <span>{item.type === 'folder' ? item.name : item.title}</span>
            </div>
            {item.type === 'folder' && openFolders.has(item.id) && renderItemTree(item.children, level + 1)}
          </div>
        ));
    };


    return (
        <div className="animate-fade-in flex flex-col h-full w-full max-w-5xl mx-auto">
            <div className="flex-shrink-0">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <SparklesIcon className="h-8 w-8 text-amber-500" /> Test Personalizado
                    </h2>
                    <button type="button" onClick={onCancel} className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <ArrowPathIcon className="h-5 w-5" /> Volver
                    </button>
                </div>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col lg:flex-row gap-8 min-h-0">
                {/* Left Column */}
                <div className="lg:w-1/2 flex flex-col min-h-0 space-y-4">
                    <div className="flex-shrink-0">
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">1. Filtrar Contenido</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Selecciona los tests o carpetas de los que quieres incluir preguntas.</p>
                        <div className="flex gap-2">
                            <button type="button" onClick={handleSelectAll} className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">Seleccionar todo</button>
                            <button type="button" onClick={handleDeselectAll} className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">Deseleccionar todo</button>
                        </div>
                    </div>
                     <div className="flex-grow overflow-y-auto p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        {sortedLibrary.length > 0 ? renderItemTree(sortedLibrary) : <p className="text-center text-sm text-slate-500 p-4">Tu biblioteca está vacía.</p>}
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:w-1/2 flex flex-col">
                    <div className="flex-grow space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">2. Filtrar por Estado</h3>
                             <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Si no seleccionas ninguno, se incluirán todas las preguntas del contenido elegido.</p>
                            <div className="space-y-2 p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                 <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-700/50">
                                    <label className="flex items-center gap-3 cursor-pointer flex-grow">
                                        <input type="checkbox" checked={selectedStatuses.srs} onChange={() => setSelectedStatuses(s => ({...s, srs: !s.srs}))} className="h-4 w-4 rounded-sm text-amber-600 focus:ring-amber-500"/>
                                        <ArrowPathIcon className="h-5 w-5 text-amber-500"/>
                                        <span className="text-sm font-medium">Para Repasar ({statusCountsInScope.srs})</span>
                                    </label>
                                    <button type="button" onClick={() => handleViewStatusQuestions('srs')} disabled={statusCountsInScope.srs === 0} className="p-1.5 text-slate-400 hover:text-sky-500 rounded-full disabled:opacity-30" title="Ver preguntas"><MagnifyingGlassEyeIcon className="h-5 w-5"/></button>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-700/50">
                                    <label className="flex items-center gap-3 cursor-pointer flex-grow">
                                        <input type="checkbox" checked={selectedStatuses.correct} onChange={() => setSelectedStatuses(s => ({...s, correct: !s.correct}))} className="h-4 w-4 rounded-sm text-green-600 focus:ring-green-500"/>
                                        <CheckCircleIcon className="h-5 w-5 text-green-500"/>
                                        <span className="text-sm font-medium">Acertadas ({statusCountsInScope.correct})</span>
                                    </label>
                                    <button type="button" onClick={() => handleViewStatusQuestions('correct')} disabled={statusCountsInScope.correct === 0} className="p-1.5 text-slate-400 hover:text-sky-500 rounded-full disabled:opacity-30" title="Ver preguntas"><MagnifyingGlassEyeIcon className="h-5 w-5"/></button>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-700/50">
                                    <label className="flex items-center gap-3 cursor-pointer flex-grow">
                                        <input type="checkbox" checked={selectedStatuses.failed} onChange={() => setSelectedStatuses(s => ({...s, failed: !s.failed}))} className="h-4 w-4 rounded-sm text-red-600 focus:ring-red-500"/>
                                        <XCircleIcon className="h-5 w-5 text-red-500"/>
                                        <span className="text-sm font-medium">Falladas ({statusCountsInScope.failed})</span>
                                    </label>
                                    <button type="button" onClick={() => handleViewStatusQuestions('failed')} disabled={statusCountsInScope.failed === 0} className="p-1.5 text-slate-400 hover:text-sky-500 rounded-full disabled:opacity-30" title="Ver preguntas"><MagnifyingGlassEyeIcon className="h-5 w-5"/></button>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-700/50">
                                     <label className="flex items-center gap-3 cursor-pointer flex-grow">
                                        <input type="checkbox" checked={selectedStatuses.unanswered} onChange={() => setSelectedStatuses(s => ({...s, unanswered: !s.unanswered}))} className="h-4 w-4 rounded-sm text-sky-600 focus:ring-sky-500"/>
                                        <QuestionMarkCircleIcon className="h-5 w-5 text-sky-500"/>
                                        <span className="text-sm font-medium">En Blanco ({statusCountsInScope.unanswered})</span>
                                    </label>
                                    <button type="button" onClick={() => handleViewStatusQuestions('unanswered')} disabled={statusCountsInScope.unanswered === 0} className="p-1.5 text-slate-400 hover:text-sky-500 rounded-full disabled:opacity-30" title="Ver preguntas"><MagnifyingGlassEyeIcon className="h-5 w-5"/></button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">3. Número de Preguntas</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Elige cuántas preguntas quieres en esta sesión de práctica.</p>
                            <div className="p-4 rounded-lg bg-white/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Preguntas disponibles: {availableQuestions.length}</span>
                                    {isEditingCount ? (
                                        <input
                                            type="number"
                                            value={questionCount}
                                            onChange={e => setQuestionCount(parseInt(e.target.value, 10) || 0)}
                                            onBlur={handleCountInputBlur}
                                            onKeyDown={handleCountInputKeyDown}
                                            autoFocus
                                            className="w-20 text-right p-1 rounded-md border border-lime-500 text-lg font-bold text-lime-600 dark:text-lime-400 bg-white dark:bg-slate-700"
                                        />
                                    ) : (
                                        <span onDoubleClick={() => setIsEditingCount(true)} className="text-lg font-bold text-lime-600 dark:text-lime-400 cursor-pointer" title="Doble clic para editar">
                                            {questionCount}
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max={availableQuestions.length}
                                    value={questionCount}
                                    onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                                    className="w-full h-2 mt-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-lime-500"
                                />
                            </div>
                        </div>
                    </div>
                    <footer className="flex-shrink-0 mt-auto pt-6 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex justify-end">
                            <button type="submit" disabled={questionCount === 0} className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 disabled:bg-slate-400 disabled:shadow-none">
                                Empezar Práctica ({questionCount})
                            </button>
                        </div>
                    </footer>
                </div>
            </form>
        </div>
    );
};

export default UnifiedReviewConfigurator;