import React, { useState, useMemo, useCallback } from 'react';
import { QuizQuestion, Flashcard, LibraryItem, Folder } from '../types.ts';
import { SparklesIcon, ArrowPathIcon, XCircleIcon, QuestionMarkCircleIcon, QueueListIcon, EyeIcon, BookOpenIcon, FolderIcon, FolderOpenIcon } from './Icons.tsx';

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
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {item.type === 'folder' ? item.name : item.title}
                </span>
            </label>
        </div>
    );
};

interface SmartReviewConfiguratorProps {
    library: LibraryItem[];
    failedQuestions: QuizQuestion[];
    unansweredQuestions: QuizQuestion[];
    failedFlashcards: Flashcard[];
    onCancel: () => void;
    onStartPractice: (config: any) => void; // Using any for simplicity as it's a mix of questions and cards
    onViewQuestions: (config: any) => void;
}

const SmartReviewConfigurator: React.FC<SmartReviewConfiguratorProps> = ({
    library,
    failedQuestions,
    unansweredQuestions,
    failedFlashcards,
    onCancel,
    onStartPractice,
    onViewQuestions,
}) => {
    
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [includeFailed, setIncludeFailed] = useState(true);
    const [failedCount, setFailedCount] = useState(Math.min(10, failedQuestions.length));
    const [includeUnanswered, setIncludeUnanswered] = useState(true);
    const [unansweredCount, setUnansweredCount] = useState(Math.min(10, unansweredQuestions.length));
    const [includeFlashcards, setIncludeFlashcards] = useState(true);
    const [flashcardCount, setFlashcardCount] = useState(Math.min(10, failedFlashcards.length));

    const toggleItemSelection = useCallback((itemId: string, item: LibraryItem, checked: boolean) => {
        const newSelection = new Set(selectedItemIds);
        const getAllChildIds = (currentItem: LibraryItem): string[] => {
            let ids: string[] = [currentItem.id];
            if (currentItem.type === 'folder') {
                currentItem.children.forEach(child => ids.push(...getAllChildIds(child)));
            }
            return ids;
        };
        const idsToToggle = getAllChildIds(item);
        idsToToggle.forEach(id => {
            if (checked) newSelection.add(id);
            else newSelection.delete(id);
        });
        setSelectedItemIds(newSelection);
    }, [selectedItemIds]);

    const renderItemTree = (items: LibraryItem[], level = 0): React.ReactNode => {
        return items.map(item => (
            <React.Fragment key={item.id}>
                <ItemCheckbox item={item} level={level} selection={selectedItemIds} onToggle={toggleItemSelection} />
                {item.type === 'folder' && item.isOpen && renderItemTree(item.children, level + 1)}
            </React.Fragment>
        ));
    };

    const buildAndStart = () => {
        onStartPractice({
            selectedItemIds,
            includeFailed,
            failedCount,
            includeUnanswered,
            unansweredCount,
            includeFlashcards,
            flashcardCount,
        });
    };
    
    const totalSelectedItems = (includeFailed ? failedCount : 0) + (includeUnanswered ? unansweredCount : 0) + (includeFlashcards ? flashcardCount : 0);

    return (
        <div className="animate-fade-in w-full max-w-3xl mx-auto flex flex-col h-full">
            <div className="flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <SparklesIcon className="h-8 w-8 text-amber-500" />
                        Repaso Inteligente
                    </h2>
                    <button onClick={onCancel} className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <ArrowPathIcon className="h-5 w-5" /> Volver
                    </button>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mb-8 font-sans">
                    Crea una sesión personalizada mezclando tests de tu biblioteca y repasando tus puntos débiles.
                </p>
            </div>

            <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-4 pb-4">
                {/* Library Selection */}
                <div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">1. Seleccionar de la Biblioteca</h3>
                     <div className="max-h-40 overflow-y-auto p-3 bg-white/50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
                        {library.length > 0 ? renderItemTree(library) : <p className="text-sm text-center text-slate-500">Tu biblioteca está vacía.</p>}
                    </div>
                </div>

                {/* Review Categories */}
                <div>
                     <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">2. Añadir Repaso</h3>
                    <div className="space-y-3">
                        {/* Falladas */}
                        <div className={`p-3 rounded-lg border transition-all duration-200 ${includeFailed ? 'bg-red-50/70 dark:bg-red-900/30 border-red-300 dark:border-red-800' : 'bg-white/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'}`}>
                            <div className="flex items-center gap-4">
                                <input type="checkbox" id="include-failed" checked={includeFailed} onChange={e => setIncludeFailed(e.target.checked)} disabled={failedQuestions.length === 0} className="h-5 w-5 rounded-sm border-slate-300 text-red-600 focus:ring-red-500 disabled:opacity-50" />
                                <div className="flex-grow">
                                    <label htmlFor="include-failed" className={`font-semibold text-slate-800 dark:text-slate-100 text-sm ${failedQuestions.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed text-slate-400 dark:text-slate-500'}`}><XCircleIcon className="inline h-5 w-5 mr-1 text-red-500" />Incluir preguntas falladas ({failedQuestions.length})</label>
                                </div>
                                {includeFailed && <input type="number" min="0" max={failedQuestions.length} value={failedCount} onChange={e => setFailedCount(Number(e.target.value))} className="w-20 p-1.5 bg-white dark:bg-slate-700 border font-sans border-slate-300 dark:border-slate-600 rounded-lg text-sm" />}
                            </div>
                        </div>
                        {/* En Blanco */}
                        <div className={`p-3 rounded-lg border transition-all duration-200 ${includeUnanswered ? 'bg-sky-50/70 dark:bg-sky-900/30 border-sky-300 dark:border-sky-800' : 'bg-white/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'}`}>
                            <div className="flex items-center gap-4">
                                <input type="checkbox" id="include-unanswered" checked={includeUnanswered} onChange={e => setIncludeUnanswered(e.target.checked)} disabled={unansweredQuestions.length === 0} className="h-5 w-5 rounded-sm border-slate-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50" />
                                <div className="flex-grow">
                                    <label htmlFor="include-unanswered" className={`font-semibold text-slate-800 dark:text-slate-100 text-sm ${unansweredQuestions.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed text-slate-400 dark:text-slate-500'}`}><QuestionMarkCircleIcon className="inline h-5 w-5 mr-1 text-sky-500" />Incluir preguntas en blanco ({unansweredQuestions.length})</label>
                                </div>
                                {includeUnanswered && <input type="number" min="0" max={unansweredQuestions.length} value={unansweredCount} onChange={e => setUnansweredCount(Number(e.target.value))} className="w-20 p-1.5 bg-white dark:bg-slate-700 border font-sans border-slate-300 dark:border-slate-600 rounded-lg text-sm" />}
                            </div>
                        </div>
                         {/* Fichas */}
                        <div className={`p-3 rounded-lg border transition-all duration-200 ${includeFlashcards ? 'bg-purple-50/70 dark:bg-purple-900/30 border-purple-300 dark:border-purple-800' : 'bg-white/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'}`}>
                            <div className="flex items-center gap-4">
                                <input type="checkbox" id="include-flashcards" checked={includeFlashcards} onChange={e => setIncludeFlashcards(e.target.checked)} disabled={failedFlashcards.length === 0} className="h-5 w-5 rounded-sm border-slate-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50" />
                                <div className="flex-grow">
                                    <label htmlFor="include-flashcards" className={`font-semibold text-slate-800 dark:text-slate-100 text-sm ${failedFlashcards.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed text-slate-400 dark:text-slate-500'}`}><QueueListIcon className="inline h-5 w-5 mr-1 text-purple-500" />Incluir fichas falladas ({failedFlashcards.length})</label>
                                </div>
                                {includeFlashcards && <input type="number" min="0" max={failedFlashcards.length} value={flashcardCount} onChange={e => setFlashcardCount(Number(e.target.value))} className="w-20 p-1.5 bg-white dark:bg-slate-700 border font-sans border-slate-300 dark:border-slate-600 rounded-lg text-sm" />}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-shrink-0 mt-auto pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-end gap-4">
                    <button type="button" onClick={buildAndStart} disabled={totalSelectedItems === 0 && selectedItemIds.size === 0} className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 font-sans disabled:bg-slate-400 disabled:shadow-none">
                        <BookOpenIcon className="h-5 w-5" /> Empezar Práctica ({totalSelectedItems + selectedItemIds.size})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SmartReviewConfigurator;