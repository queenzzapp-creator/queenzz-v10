import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { QuizQuestion, LibraryItem, SavedQuiz, Folder, QuestionFlag, LibraryData } from '../types.ts';
import { MagnifyingGlassIcon, ArrowPathIcon, BookOpenIcon, FolderIcon, CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon, FolderOpenIcon, DocumentMagnifyingGlassIcon, TrashIcon, XMarkIcon, PencilSquareIcon, FolderPlusIcon, FlagIcon } from './Icons.tsx';
import SearchBar from './SearchBar.tsx';
import ImageZoomModal from './ImageZoomModal.tsx';
import * as libraryService from '../services/libraryService.ts';
import Loader from './Loader.tsx';
import { useResizeObserver } from '../utils/hooks.ts';
// FIX: Changed to a named import for `VariableSizeList` to resolve module issues.
import { VariableSizeList } from 'react-window';


// --- Reusable Question Card for Duplicates ---
const DuplicateQuestionCard: React.FC<{ 
    question: QuizQuestion;
    quizTitle: string;
    isSelected: boolean;
    onToggle: () => void;
    onViewSource: (question: QuizQuestion) => void;
    onEdit: () => void;
}> = ({ question, quizTitle, isSelected, onToggle, onViewSource, onEdit }) => {
    const isSuspended = question.flag === 'suspendida';
    let cardClass = 'bg-white/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80';
    if (isSelected) {
        cardClass = 'bg-red-100/70 dark:bg-red-900/40 border-red-300 ring-2 ring-red-400';
    } else if (isSuspended) {
        cardClass = 'bg-yellow-100/70 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700';
    }

    return (
        <div className={`p-4 rounded-lg border transition-colors ${cardClass}`}>
            <div className="flex items-start gap-3">
                <input type="checkbox" checked={isSelected} onChange={onToggle} className="mt-1 h-4 w-4 rounded-sm text-lime-600 focus:ring-lime-500"/>
                <div className="flex-grow">
                     <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">En test: <span className="font-semibold">{quizTitle}</span></p>
                     {isSuspended && (
                        <div className="mb-2">
                            <span className="text-xs font-bold bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <FlagIcon className="h-3 w-3" />
                                Suspendida
                            </span>
                        </div>
                     )}
                     <div className="space-y-1 mt-2 text-sm">
                        {question.options.map((option, oIndex) => (
                             <div key={oIndex} className={`p-2 rounded-md border text-xs ${option === question.correctAnswer ? 'bg-green-100/70 dark:bg-green-900/40 border-green-200 dark:border-green-700 font-semibold' : 'bg-slate-50/60 dark:bg-slate-700/40'}`}>
                                <span>{option}</span>
                            </div>
                        ))}
                    </div>
                     {question.explanation && <div className="mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/50">
                        <p className="font-semibold text-lime-600 dark:text-lime-400 mb-1 text-xs">Explicación:</p>
                        <p className="text-slate-700 dark:text-slate-300 font-sans text-xs">{question.explanation}</p>
                    </div>}
                </div>
                <div className="flex-shrink-0 flex flex-col items-center">
                     {question.sourceFileId && (
                        <button onClick={() => onViewSource(question)} className="p-2 text-slate-400 hover:text-sky-500 rounded-full" title="Ver fuente">
                            <DocumentMagnifyingGlassIcon className="h-5 w-5" />
                        </button>
                    )}
                     <button onClick={onEdit} className="p-2 text-slate-400 hover:text-sky-500 rounded-full" title="Editar pregunta"><PencilSquareIcon className="h-5 w-5" /></button>
                </div>
            </div>
        </div>
    );
};


// --- Reusable Question Card for Search ---
const SearchResultCard: React.FC<{ 
    question: QuizQuestion; 
    quizTitle?: string;
    onToggle: () => void;
    onViewSource: (question: QuizQuestion) => void; 
    onImageClick: (url: string) => void;
    onEdit: () => void;
    isSelected: boolean;
}> = ({ question, quizTitle, onToggle, onViewSource, onImageClick, onEdit, isSelected }) => {
    const isSuspended = question.flag === 'suspendida';
    let cardClass = 'bg-white/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80';
    if (isSelected) {
        cardClass = 'bg-lime-100/70 dark:bg-lime-900/40 border-lime-300';
    } else if (isSuspended) {
        cardClass = 'bg-yellow-100/70 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700';
    }

    return (
        <div className={`p-5 rounded-lg border transition-colors h-full flex flex-col ${cardClass}`}>
            <div className="flex items-start gap-3">
                <input type="checkbox" checked={isSelected} onChange={onToggle} className="mt-1.5 h-4 w-4 rounded-sm text-lime-600 focus:ring-lime-500 flex-shrink-0"/>
                <div className="flex-grow min-w-0">
                     {quizTitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 truncate">
                            En test: <span className="font-semibold">{quizTitle}</span>
                        </p>
                    )}
                    {isSuspended && (
                        <span className="text-xs font-bold bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mb-2">
                            <FlagIcon className="h-3 w-3" />
                            Suspendida
                        </span>
                    )}
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex-grow">
                       {question.question}
                    </h3>
                </div>
                <div className="flex-shrink-0 flex items-center">
                    <button onClick={onEdit} className="p-2 text-slate-400 hover:text-sky-500 rounded-full" title="Editar pregunta"><PencilSquareIcon className="h-5 w-5" /></button>
                     {question.sourceFileId && (
                        <button 
                            onClick={() => onViewSource(question)}
                            className="p-2 text-slate-400 hover:text-sky-500 dark:text-slate-500 dark:hover:text-sky-400 transition-colors rounded-full"
                            title={question.sourcePage ? `Ver fuente (Página ${question.sourcePage})` : 'Ver fuente'}
                        >
                            <DocumentMagnifyingGlassIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
             {question.imageUrl && (
                <div className="my-4 flex justify-center bg-slate-100 dark:bg-slate-900/50 p-2 rounded-lg">
                    <button type="button" onClick={() => onImageClick(question.imageUrl!)} aria-label="Ampliar imagen">
                        <img src={question.imageUrl} alt="Pregunta" className="max-w-full max-h-60 rounded-md object-contain cursor-zoom-in" />
                    </button>
                </div>
            )}
            <div className="space-y-2 font-sans mb-4 text-sm mt-4">
                {question.options.map((option, oIndex) => (
                    <div
                        key={oIndex}
                        className={`p-3 rounded-md border ${
                        option === question.correctAnswer
                            ? 'bg-green-100/70 dark:bg-green-900/40 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200 font-semibold'
                            : 'bg-slate-50/60 dark:bg-slate-700/40 dark:border-slate-700/50 text-slate-700 dark:text-slate-300'
                        }`}
                    >
                        <span>{option}</span>
                    </div>
                ))}
            </div>
            {question.explanation && <div className="mt-auto pt-4 border-t border-slate-200/80 dark:border-slate-700/50">
                <p className="font-semibold text-lime-600 dark:text-lime-400 mb-1 text-sm">Explicación:</p>
                <p className="text-slate-700 dark:text-slate-300 font-sans text-sm">{question.explanation}</p>
            </div>}
        </div>
    );
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


const ItemCheckbox: React.FC<{
    item: LibraryItem;
    level: number;
    selection: Set<string>;
    onToggle: (item: LibraryItem, checked: boolean) => void;
    isOpen: boolean;
    onToggleFolder: () => void;
}> = ({ item, level, selection, onToggle, isOpen, onToggleFolder }) => {
    const isSelected = selection.has(item.id);
    const isFolder = item.type === 'folder';

    return (
        <div style={{ paddingLeft: `${level * 1}rem` }}>
            <div className="flex items-center gap-3 p-1 rounded-lg">
                <input
                    type="checkbox"
                    id={`search-item-${item.id}`}
                    checked={isSelected}
                    onChange={(e) => onToggle(item, e.target.checked)}
                    className="h-4 w-4 rounded-sm bg-slate-100 border-slate-300 text-lime-600 focus:ring-lime-500"
                />
                 <div className="flex-shrink-0 cursor-pointer" onClick={(e) => { if (isFolder) { e.preventDefault(); onToggleFolder(); } }}>
                    {isFolder ? (isOpen ? <FolderOpenIcon className="h-5 w-5 text-lime-500"/> : <FolderIcon className="h-5 w-5 text-lime-500"/>) : <BookOpenIcon className="h-5 w-5 text-slate-500"/>}
                </div>
                <label htmlFor={`search-item-${item.id}`} className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate cursor-pointer">
                    {item.type === 'folder' ? item.name : item.title}
                </label>
            </div>
        </div>
    );
};

const getQuizzesFromSelection = (library: LibraryItem[], selectedIds: Set<string>): SavedQuiz[] => {
    const quizzes: SavedQuiz[] = [];
    const visitedFolders = new Set<string>();

    const flattenQuizzes = (folderItems: LibraryItem[]): SavedQuiz[] => {
        const qs: SavedQuiz[] = [];
        folderItems.forEach(child => {
            if (child.type === 'quiz') qs.push(child);
            else if (child.type === 'folder') qs.push(...flattenQuizzes(child.children));
        });
        return qs;
    };

    const recurse = (items: LibraryItem[]) => {
        for (const item of items) {
            if (selectedIds.has(item.id)) {
                if (item.type === 'quiz') {
                    if (!quizzes.some(q => q.id === item.id)) quizzes.push(item);
                } else if (item.type === 'folder' && !visitedFolders.has(item.id)) {
                    visitedFolders.add(item.id);
                    flattenQuizzes(item.children).forEach(q => {
                        if (!quizzes.some(sq => sq.id === q.id)) quizzes.push(q);
                    });
                }
            } else if (item.type === 'folder' && !visitedFolders.has(item.id)) {
                recurse(item.children);
            }
        }
    };
    recurse(library);
    return quizzes;
};


interface AdvancedSearchViewProps {
    library: LibraryItem[];
    activeLibrary: LibraryData;
    onBack: () => void;
    onViewSource: (question: QuizQuestion) => void;
    reloadAppData: () => Promise<void>;
    onEditQuestion: (question: QuizQuestion, onSave: (updatedQuestion: QuizQuestion) => void) => void;
    onMoveQuestions: (questionIds: Set<string>, onMove: (targetQuizId: string) => void) => void;
    onDeleteQuestions: (questionIds: Set<string>) => Promise<void>;
    onFlagQuestions: (questionIds: Set<string>, flag: QuestionFlag | null) => Promise<void>;
}

const flagOptions: { label: string, value: QuestionFlag | 'all' }[] = [
    { label: 'Todas', value: 'all' }, { label: 'Buena', value: 'buena' },
    { label: 'Mala', value: 'mala' }, { label: 'Interesante', value: 'interesante' },
    { label: 'Revisar', value: 'revisar' }, { label: 'Suspendida', value: 'suspendida' },
];

const AdvancedSearchView: React.FC<AdvancedSearchViewProps> = ({ library, activeLibrary, onBack, onViewSource, reloadAppData, onEditQuestion, onMoveQuestions, onDeleteQuestions, onFlagQuestions }) => {
    const [query, setQuery] = useState('');
    const [searchIn, setSearchIn] = useState({ question: true, options: true, explanation: true });
    const [status, setStatus] = useState({ correct: false, failed: false, unanswered: false, srs: false });
    const [selectedFlag, setSelectedFlag] = useState<QuestionFlag | 'all'>('all');
    const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
    const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
    const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
    const [selectedDuplicateIds, setSelectedDuplicateIds] = useState<Set<string>>(new Set());
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
    const [searchResults, setSearchResults] = useState<QuizQuestion[]>([]);
    const [duplicateResults, setDuplicateResults] = useState<QuizQuestion[][]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const listContainerRef = useRef<HTMLDivElement>(null);
    // FIX: Use VariableSizeList type from the named import.
    const listRef = useRef<VariableSizeList>(null);
    const rowHeights = useRef<{ [key: number]: number }>({});
    const { width, height } = useResizeObserver(listContainerRef);

    const sortedLibrary = useMemo(() => sortLibraryItems(library), [library]);

    const allLibraryIds = useMemo(() => {
        const ids = new Set<string>();
        const recurse = (items: LibraryItem[]) => {
            items.forEach(item => { ids.add(item.id); if (item.type === 'folder') recurse(item.children); });
        };
        recurse(sortedLibrary);
        return ids;
    }, [sortedLibrary]);

    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(allLibraryIds);

    const quizzesMap = useMemo(() => {
        const map = new Map<string, string>();
        const quizzes = getQuizzesFromSelection(library, allLibraryIds);
        for (const quiz of quizzes) {
            map.set(quiz.id, quiz.title);
        }
        return map;
    }, [library, allLibraryIds]);
    
    useEffect(() => {
        const debounceTimeout = setTimeout(() => {
            setIsLoading(true);
            const quizIdsInScope = getQuizzesFromSelection(library, selectedItemIds).map(q => q.id);

            if (showDuplicatesOnly) {
                setSearchResults([]);
                const duplicates = libraryService.getDuplicateQuestions(activeLibrary, quizIdsInScope);
                setDuplicateResults(duplicates);
            } else {
                setDuplicateResults([]);
                const results = libraryService.searchQuestions(
                    activeLibrary,
                    {
                        query: query.trim(),
                        searchIn,
                        status,
                        flag: selectedFlag,
                        quizIds: quizIdsInScope,
                    }
                );
                setSearchResults(results);
            }
            setIsLoading(false);
        }, 300);

        return () => clearTimeout(debounceTimeout);
    }, [query, searchIn, status, selectedItemIds, showDuplicatesOnly, selectedFlag, library, activeLibrary]);
    
    // Reset height cache when search results change
    useEffect(() => {
        rowHeights.current = {};
        listRef.current?.resetAfterIndex(0);
    }, [searchResults]);


    const handleToggleItemSelection = useCallback((item: LibraryItem, checked: boolean) => {
        const newSelection = new Set(selectedItemIds);
        const processItem = (currentItem: LibraryItem, check: boolean) => {
            if (check) newSelection.add(currentItem.id); else newSelection.delete(currentItem.id);
            if (currentItem.type === 'folder') currentItem.children.forEach(child => processItem(child, check));
        };
        processItem(item, checked);
        setSelectedItemIds(newSelection);
    }, [selectedItemIds]);

    const handleDeleteDuplicates = async () => {
        if (selectedDuplicateIds.size === 0) return;
        if (window.confirm(`¿Seguro que quieres eliminar ${selectedDuplicateIds.size} pregunta(s) duplicada(s)?`)) {
            await onDeleteQuestions(selectedDuplicateIds);
            setSelectedDuplicateIds(new Set());
            // Manually trigger a re-search
            const duplicates = libraryService.getDuplicateQuestions(activeLibrary, getQuizzesFromSelection(library, selectedItemIds).map(q => q.id));
            setDuplicateResults(duplicates);
        }
    };
    
    const handleSuspendDuplicates = async () => {
        if (selectedDuplicateIds.size === 0) return;
        await onFlagQuestions(selectedDuplicateIds, 'suspendida');
        setSelectedDuplicateIds(new Set());
        const duplicates = libraryService.getDuplicateQuestions(activeLibrary, getQuizzesFromSelection(library, selectedItemIds).map(q => q.id));
        setDuplicateResults(duplicates);
    };

    const handleSelectRestForAction = (group: QuizQuestion[]) => {
        if(group.length <= 1) return;
        const idsToSelect = new Set(group.slice(1).map(q => q.id));
        setSelectedDuplicateIds(prev => new Set([...prev, ...idsToSelect]));
    }
    
    const handleToggleQuestionSelection = (questionId: string) => {
        setSelectedQuestionIds(prev => { const newSet = new Set(prev); if (newSet.has(questionId)) newSet.delete(questionId); else newSet.add(questionId); return newSet; });
    };

    const handleEditSelected = () => {
        if (selectedQuestionIds.size !== 1) return;
        const questionId = Array.from(selectedQuestionIds)[0];
        const question = searchResults.find(q => q.id === questionId);
        if (question) { onEditQuestion(question, async (updatedQuestion) => { await libraryService.updateQuestionInLibrary(updatedQuestion); await reloadAppData(); setSelectedQuestionIds(new Set()); }); }
    };

    const handleMoveSelected = () => {
        if (selectedQuestionIds.size === 0) return;
        onMoveQuestions(selectedQuestionIds, async (targetQuizId) => { await libraryService.moveQuestionsToQuiz(selectedQuestionIds, targetQuizId); await reloadAppData(); setSelectedQuestionIds(new Set()); });
    };

    const handleDeleteSelected = async () => {
        if (selectedQuestionIds.size === 0) return;
        if (window.confirm(`¿Seguro que quieres eliminar ${selectedQuestionIds.size} pregunta(s)?`)) { await onDeleteQuestions(selectedQuestionIds); setSelectedQuestionIds(new Set()); await reloadAppData(); }
    };
    
    const handleFlagSelected = async (flag: QuestionFlag | null) => {
        if (selectedQuestionIds.size === 0) return;
        await onFlagQuestions(selectedQuestionIds, flag);
        await reloadAppData();
    };

    const renderLibraryTree = (items: LibraryItem[], level = 0): React.ReactNode => {
        return items.map(item => (
            <React.Fragment key={item.id}>
                <ItemCheckbox item={item} level={level} selection={selectedItemIds} onToggle={handleToggleItemSelection} isOpen={openFolders.has(item.id)} onToggleFolder={() => setOpenFolders(p => { const n = new Set(p); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; })} />
                {item.type === 'folder' && openFolders.has(item.id) && renderLibraryTree(item.children, level + 1)}
            </React.Fragment>
        ));
    };
    
    const getRowHeight = useCallback((index: number) => {
        if (rowHeights.current[index]) return rowHeights.current[index];
        const question = searchResults[index];
        if (!question) return 150;

        let height = 40 + 32 + 32; // Paddings, margins
        height += Math.ceil(question.question.length / 50) * 24;
        if (question.imageUrl) height += 240 + 16;
        height += question.options.length * 44;
        if (question.explanation) height += (Math.ceil(question.explanation.length / 60) * 20) + 20;

        rowHeights.current[index] = height;
        return height;
    }, [searchResults]);

    const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
        const question = searchResults[index];
        if (!question) return null;
        const quizTitle = quizzesMap.get(question.quizId || '');
        return (
            <div style={style} className="py-2">
                 <SearchResultCard 
                    key={question.id} 
                    question={question} 
                    quizTitle={quizTitle}
                    isSelected={selectedQuestionIds.has(question.id)}
                    onToggle={() => handleToggleQuestionSelection(question.id)}
                    onViewSource={onViewSource} 
                    onImageClick={setZoomedImageUrl} 
                    onEdit={() => onEditQuestion(question, async (updated) => { await libraryService.updateQuestionInLibrary(updated); await reloadAppData(); })}
                />
            </div>
        );
    };

    return (
        <div className="animate-fade-in flex flex-col h-full w-full max-w-full mx-auto">
            <div className="flex-shrink-0 flex justify-between items-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                    <MagnifyingGlassIcon className="h-8 w-8 text-sky-500" /> Búsqueda
                </h2>
                <button onClick={onBack} className="inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-bold"><ArrowPathIcon className="h-5 w-5" /> Volver</button>
            </div>

            <div className="flex-grow flex flex-col lg:flex-row gap-8 min-h-0">
                <aside className="lg:w-[350px] flex-shrink-0 flex flex-col space-y-4 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-700 overflow-y-auto">
                    <SearchBar onSearch={setQuery} autoFocus />
                    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <fieldset>
                            <legend className="text-sm font-semibold mb-2">Buscar en:</legend>
                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                                {[{key: 'question', label: 'Enunciado'}, {key: 'options', label: 'Opciones'}, {key: 'explanation', label: 'Explicación'}].map(({key, label}) => (
                                    <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={searchIn[key as keyof typeof searchIn]} onChange={e => setSearchIn(s => ({ ...s, [key]: e.target.checked }))} className="h-4 w-4 rounded-sm" />{label}</label>
                                ))}
                            </div>
                        </fieldset>
                         <fieldset>
                            <legend className="text-sm font-semibold mb-2">Estado:</legend>
                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                                {[
                                    {key: 'correct', label: 'Acertadas'}, 
                                    {key: 'failed', label: 'Falladas'}, 
                                    {key: 'unanswered', label: 'En Blanco'},
                                    {key: 'srs', label: 'Para Repasar'}
                                ].map(({key, label}) => (
                                     <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={status[key as keyof typeof status]} onChange={e => setStatus(s => ({ ...s, [key]: e.target.checked }))} className="h-4 w-4 rounded-sm"/>{label}</label>
                                ))}
                            </div>
                        </fieldset>
                         <fieldset>
                            <legend className="text-sm font-semibold mb-2">Banderitas:</legend>
                            <div className="flex flex-wrap gap-x-3 gap-y-2">
                                {flagOptions.map(({label, value}) => (
                                     <label key={value} className="flex items-center gap-2 text-sm"><input type="radio" name="flag-filter" value={value} checked={selectedFlag === value} onChange={e => setSelectedFlag(e.target.value as QuestionFlag | 'all')} />{label}</label>
                                ))}
                            </div>
                        </fieldset>
                         <div>
                             <div className="flex justify-between items-center mb-2">
                                <legend className="text-sm font-semibold">Limitar a:</legend>
                                <div className="flex gap-2">
                                     <button onClick={() => setSelectedItemIds(allLibraryIds)} className="text-xs font-medium hover:underline">Todo</button>
                                     <button onClick={() => setSelectedItemIds(new Set())} className="text-xs font-medium hover:underline">Ninguno</button>
                                </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-100/50 dark:bg-slate-900/40">
                                {renderLibraryTree(sortedLibrary)}
                            </div>
                        </div>
                         <div>
                            <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-700/50 border dark:border-slate-600 rounded-lg cursor-pointer">
                                <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">Mostrar solo duplicadas</span>
                                <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${showDuplicatesOnly ? 'bg-lime-600' : 'bg-slate-300 dark:bg-slate-500'}`} onClick={(e) => { e.preventDefault(); setShowDuplicatesOnly(p => !p); }}>
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${showDuplicatesOnly ? 'translate-x-6' : 'translate-x-1'}`} />
                                </div>
                            </label>
                         </div>
                    </div>
                </aside>

                <main className="flex-grow flex flex-col min-h-0">
                    <div className="flex-shrink-0 flex items-center justify-between mb-4">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">
                            {isLoading ? 'Buscando...' : `${showDuplicatesOnly ? duplicateResults.length : searchResults.length} resultado(s)`}
                        </p>
                         {selectedQuestionIds.size > 0 && (
                            <div className="flex items-center gap-2 animate-fade-in">
                                <span className="text-sm font-bold">{selectedQuestionIds.size} selecc.</span>
                                <button onClick={handleEditSelected} disabled={selectedQuestionIds.size !== 1} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40" title="Editar"><PencilSquareIcon className="h-5 w-5"/></button>
                                <button onClick={handleMoveSelected} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700" title="Mover"><FolderPlusIcon className="h-5 w-5"/></button>
                                <button onClick={handleDeleteSelected} className="p-2 rounded-full text-red-500 hover:bg-red-100" title="Eliminar"><TrashIcon className="h-5 w-5"/></button>
                            </div>
                        )}
                    </div>

                    <div ref={listContainerRef} className="flex-grow bg-slate-100/50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {isLoading ? ( <Loader message="Cargando resultados..." /> ) : 
                        showDuplicatesOnly ? (
                           duplicateResults.length > 0 ? (
                            <div className="overflow-y-auto h-full space-y-6 p-2">
                                {duplicateResults.map((group, index) => (
                                    <div key={index} className="p-4 rounded-lg bg-white/50 dark:bg-slate-900/40 border border-slate-300 dark:border-slate-600">
                                        <p className="font-bold mb-2 text-slate-800 dark:text-slate-100">Duplicado: "{group[0].question}"</p>
                                        <div className="flex justify-end mb-2">
                                            <button onClick={() => handleSelectRestForAction(group)} className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline">Seleccionar Todas Menos una</button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {group.map(q => (
                                                <DuplicateQuestionCard 
                                                    key={q.id}
                                                    question={q}
                                                    quizTitle={quizzesMap.get(q.quizId || '') || 'Desconocido'}
                                                    isSelected={selectedDuplicateIds.has(q.id)}
                                                    onToggle={() => setSelectedDuplicateIds(p => { const n = new Set(p); if (n.has(q.id)) n.delete(q.id); else n.add(q.id); return n; })}
                                                    onViewSource={onViewSource}
                                                    onEdit={() => onEditQuestion(q, async (updated) => { await libraryService.updateQuestionInLibrary(updated); await reloadAppData(); })}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                           ) : <p className="text-center p-8 text-slate-500">No se encontraron preguntas duplicadas con los filtros actuales.</p>
                        ) : (
                           searchResults.length > 0 && height > 0 ? (
                            // FIX: Use VariableSizeList component directly after named import.
                            <VariableSizeList
                                ref={listRef}
                                height={height}
                                width={width}
                                itemCount={searchResults.length}
                                itemSize={getRowHeight}
                                estimatedItemSize={350}
                            >
                                {Row}
                            </VariableSizeList>
                           ) : <p className="text-center p-8 text-slate-500">No se encontraron preguntas. Prueba a cambiar los filtros o la búsqueda.</p>
                        )}
                    </div>
                     {showDuplicatesOnly && (
                        <div className="flex-shrink-0 flex justify-end gap-2 mt-4">
                            <button onClick={handleSuspendDuplicates} disabled={selectedDuplicateIds.size === 0} className="px-3 py-1.5 text-xs font-bold bg-yellow-400 text-yellow-900 rounded-md hover:bg-yellow-500 disabled:opacity-50">Suspender ({selectedDuplicateIds.size})</button>
                            <button onClick={handleDeleteDuplicates} disabled={selectedDuplicateIds.size === 0} className="px-3 py-1.5 text-xs font-bold bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50">Eliminar ({selectedDuplicateIds.size})</button>
                        </div>
                    )}
                </main>
            </div>
            {zoomedImageUrl && <ImageZoomModal imageUrl={zoomedImageUrl} onClose={() => setZoomedImageUrl(null)} />}
        </div>
    );
};

export default AdvancedSearchView;