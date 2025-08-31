import React, { useState, useMemo, useCallback } from 'react';
import { LibraryItem, SavedQuiz, CustomQuizSettings, QuizQuestion, Folder } from '../types.ts';
import { SparklesIcon, XCircleIcon, QuestionMarkCircleIcon, ChevronDownIcon, ChevronUpIcon, ArrowPathIcon, BookOpenIcon, FolderIcon, FolderOpenIcon } from './Icons.tsx';

interface CustomQuizConfiguratorProps {
  library: LibraryItem[];
  failedQuestions: QuizQuestion[];
  unansweredQuestions: QuizQuestion[];
  onCreate: (config: CustomQuizSettings) => void;
  onCancel: () => void;
}

const getAllQuestionsInFolder = (folder: Folder): QuizQuestion[] => {
    let questions: QuizQuestion[] = [];
    for (const item of folder.children) {
        if (item.type === 'quiz') {
            questions.push(...item.questions);
        } else if (item.type === 'folder') {
            questions.push(...getAllQuestionsInFolder(item));
        }
    }
    return questions;
};

const CustomTestConfigurator: React.FC<CustomQuizConfiguratorProps> = ({ library, failedQuestions, unansweredQuestions, onCreate, onCancel }) => {
  const failedTopics = useMemo(() => Array.from(new Set(failedQuestions.map(q => q.sourceQuizTitle || 'Desconocido'))), [failedQuestions]);
  const unansweredTopics = useMemo(() => Array.from(new Set(unansweredQuestions.map(q => q.sourceQuizTitle || 'Desconocido'))), [unansweredQuestions]);

  const [config, setConfig] = useState<CustomQuizSettings>({
    itemEntries: [],
    smartReview: {
      failed: { enabled: false, count: 0, selectedTopics: failedTopics },
      unanswered: { enabled: false, count: 0, selectedTopics: unansweredTopics },
    },
  });
  
  const [isFailedTopicsVisible, setFailedTopicsVisible] = useState(false);
  const [isUnansweredTopicsVisible, setUnansweredTopicsVisible] = useState(false);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);

  const flattenedLibrary = useMemo(() => {
    const flatList: LibraryItem[] = [];
    const recurse = (items: LibraryItem[]) => {
        items.forEach(item => {
            if (item.type !== 'deck') {
                flatList.push(item);
                if (item.type === 'folder' && openFolders.has(item.id)) {
                    recurse(item.children);
                }
            }
        });
    };
    recurse(library);
    return flatList;
  }, [library, openFolders]);

  const itemEntriesMap = useMemo(() => {
    return new Map(config.itemEntries.map(e => [e.itemId, e.questionCount]));
  }, [config.itemEntries]);

  const filteredFailedCount = useMemo(() => {
    return failedQuestions.filter(q => config.smartReview.failed.selectedTopics.includes(q.sourceQuizTitle || 'Desconocido')).length;
  }, [failedQuestions, config.smartReview.failed.selectedTopics]);
  
  const filteredUnansweredCount = useMemo(() => {
    return unansweredQuestions.filter(q => config.smartReview.unanswered.selectedTopics.includes(q.sourceQuizTitle || 'Desconocido')).length;
  }, [unansweredQuestions, config.smartReview.unanswered.selectedTopics]);


  const handleCheckboxChange = (item: LibraryItem, isChecked: boolean, event?: React.MouseEvent) => {
    const newItemEntries = new Map(itemEntriesMap);

    if (event?.shiftKey && lastClickedId) {
        const lastIndex = flattenedLibrary.findIndex(i => i.id === lastClickedId);
        const currentIndex = flattenedLibrary.findIndex(i => i.id === item.id);
        if (lastIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            for (let i = start; i <= end; i++) {
                const itemInRange = flattenedLibrary[i];
                const maxQuestions = itemInRange.type === 'quiz' ? itemInRange.questions.length : (itemInRange.type === 'folder' ? getAllQuestionsInFolder(itemInRange).length : 0);
                if (isChecked) {
                    newItemEntries.set(itemInRange.id, maxQuestions);
                } else {
                    newItemEntries.delete(itemInRange.id);
                }
            }
        }
    } else {
        const maxQuestions = item.type === 'quiz' ? item.questions.length : (item.type === 'folder' ? getAllQuestionsInFolder(item).length : 0);
        if (isChecked) {
          newItemEntries.set(item.id, maxQuestions);
        } else {
          newItemEntries.delete(item.id);
        }
    }
    setLastClickedId(item.id);
    setConfig(prev => ({...prev, itemEntries: Array.from(newItemEntries.entries()).map(([itemId, questionCount]) => ({ itemId, questionCount }))}));
  };

  const handleCountChange = (itemId: string, count: number, maxQuestions: number) => {
    const newItemEntries = new Map(itemEntriesMap);
    let newCount = Math.max(0, count);
    if (newCount > maxQuestions) newCount = maxQuestions;
    newItemEntries.set(itemId, newCount);
    setConfig(prev => ({...prev, itemEntries: Array.from(newItemEntries.entries()).map(([itemId, questionCount]) => ({ itemId, questionCount }))}));
  };

  const handleSmartReviewChange = (type: 'failed' | 'unanswered', field: 'enabled' | 'count', value: boolean | number) => {
    setConfig(prev => {
        const newSmartReview = { ...prev.smartReview };
        const currentConfig = newSmartReview[type];

        if (field === 'enabled') {
            currentConfig.enabled = value as boolean;
            if (currentConfig.enabled) {
                // If enabling, set count to a default value, respecting the max available
                const max = type === 'failed' ? filteredFailedCount : filteredUnansweredCount;
                currentConfig.count = Math.min(10, max);
            } else {
                currentConfig.count = 0;
            }
        } else if (field === 'count') {
            const max = type === 'failed' ? filteredFailedCount : filteredUnansweredCount;
            currentConfig.count = Math.max(0, Math.min(Number(value), max));
        }
        return { ...prev, smartReview: newSmartReview };
    });
  };
  
  const handleSmartReviewTopicToggle = (type: 'failed' | 'unanswered', topic: string) => {
    setConfig(prev => {
        const newConfig = { ...prev };
        const topicSet = new Set(newConfig.smartReview[type].selectedTopics);
        if (topicSet.has(topic)) {
            topicSet.delete(topic);
        } else {
            topicSet.add(topic);
        }
        newConfig.smartReview[type].selectedTopics = Array.from(topicSet);

        // Adjust count if it exceeds new max
        const newMax = (type === 'failed' ? failedQuestions : unansweredQuestions)
            .filter(q => newConfig.smartReview[type].selectedTopics.includes(q.sourceQuizTitle || 'Desconocido')).length;
        if (newConfig.smartReview[type].count > newMax) {
            newConfig.smartReview[type].count = newMax;
        }
        
        return newConfig;
    });
  };


  const totalSelectedQuestions = useMemo(() => {
    let total: number = Array.from(itemEntriesMap.values()).reduce((sum: number, count: number) => sum + count, 0);
    if (config.smartReview.failed.enabled) total += config.smartReview.failed.count;
    if (config.smartReview.unanswered.enabled) total += config.smartReview.unanswered.count;
    return total;
  }, [config, itemEntriesMap]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(config);
  };

  const renderTopicFilter = (
    type: 'failed' | 'unanswered',
    isVisible: boolean,
    toggleVisibility: () => void,
    allTopics: string[],
    selectedTopics: string[]
  ) => {
    return (
        <div className="mt-2 pl-10">
            <button type="button" onClick={toggleVisibility} className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1">
                Filtrar por Tema {isVisible ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
            </button>
            {isVisible && (
                <div className="mt-2 p-3 bg-slate-100/50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg max-h-32 overflow-y-auto space-y-1">
                    {allTopics.map(topic => (
                        <label key={topic} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-700/50 cursor-pointer text-sm">
                            <input
                                type="checkbox"
                                checked={selectedTopics.includes(topic)}
                                onChange={() => handleSmartReviewTopicToggle(type, topic)}
                                className="h-4 w-4 rounded-sm bg-slate-100 border-slate-300 text-lime-600 focus:ring-lime-500"
                            />
                            <span className="text-slate-700 dark:text-slate-200">{topic}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
  };
  
  const renderItemTree = (items: LibraryItem[], level = 0): React.ReactNode => {
    return items.map(item => {
        if (item.type === 'deck') return null; // Can't add flashcards to a quiz

        const maxQuestions = item.type === 'quiz' ? item.questions.length : (item.type === 'folder' ? getAllQuestionsInFolder(item).length : 0);
        if (maxQuestions === 0 && item.type === 'folder') return null; // Don't show empty folders

        const isOpen = item.type === 'folder' && openFolders.has(item.id);
        const Icon = item.type === 'folder' ? (isOpen ? FolderOpenIcon : FolderIcon) : BookOpenIcon;

        return (
            <React.Fragment key={item.id}>
                <div className={`p-4 rounded-lg border transition-all duration-200 ${itemEntriesMap.has(item.id) ? 'bg-lime-50/70 dark:bg-lime-900/40 border-lime-300 dark:border-lime-700' : 'bg-white/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100/50'}`}>
                    <div className="flex items-start gap-4" style={{ paddingLeft: `${level * 1.5}rem`}}>
                        <input type="checkbox" id={`quiz-select-${item.id}`} checked={itemEntriesMap.has(item.id)} onClick={(e) => handleCheckboxChange(item, (e.target as HTMLInputElement).checked, e)} onChange={(e) => { /* Logic handled by onClick */ }} className="mt-1 h-5 w-5 rounded-sm bg-slate-100 border-slate-300 text-lime-600 focus:ring-lime-500" />
                        <div className="flex-shrink-0 cursor-pointer" onClick={() => { if (item.type === 'folder') setOpenFolders(p => { const n = new Set(p); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; }); }}>
                           <Icon className={`h-5 w-5 ${item.type === 'folder' ? 'text-lime-500' : 'text-slate-500'}`} />
                        </div>
                        <div className="flex-grow">
                            <label htmlFor={`quiz-select-${item.id}`} className="font-semibold text-slate-800 dark:text-slate-100 cursor-pointer">{item.type === 'folder' ? item.name : item.title}</label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">{maxQuestions} preguntas disponibles</p>
                        </div>
                        {itemEntriesMap.has(item.id) && (
                            <div className="flex items-center gap-2">
                                <input type="number" min="1" max={maxQuestions} value={String(itemEntriesMap.get(item.id) || '')} onChange={(e) => handleCountChange(item.id, parseInt(e.target.value) || 0, maxQuestions)} className="w-24 p-2 bg-white dark:bg-slate-700 border font-sans border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500 text-slate-900 dark:text-slate-100" />
                            </div>
                        )}
                    </div>
                </div>
                {item.type === 'folder' && isOpen && renderItemTree(item.children, level + 1)}
            </React.Fragment>
        );
    });
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in flex flex-col h-full w-full max-w-4xl mx-auto">
      <div className="flex-shrink-0">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <SparklesIcon className="h-8 w-8 text-amber-500" />
            Test Personalizado
          </h2>
          <button type="button" onClick={onCancel} className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <ArrowPathIcon className="h-5 w-5" />
              Volver
          </button>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mb-2 font-sans">
          Mezcla preguntas de tus tests, añade preguntas de repaso inteligente, ¡o ambas cosas!
        </p>
        <p className="text-lg font-bold text-lime-600 dark:text-lime-400 font-sans mb-8">{totalSelectedQuestions} Preguntas en Total</p>
      </div>

      <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-6 pb-4">
        <div>
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-3">1. Seleccionar de Tests</h3>
            <div className="max-h-[30vh] overflow-y-auto pr-4 space-y-3">
            {library.length > 0 ? renderItemTree(library) : (
                <div className="text-center py-12 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400 font-sans">No tienes tests en tu biblioteca.</p>
                </div>
            )}
            </div>
        </div>

        <div>
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-3">2. Repaso Inteligente</h3>
            <div className="space-y-3">
                <div className={`p-4 rounded-lg border transition-all duration-200 ${config.smartReview.failed.enabled ? 'bg-red-50/70 dark:bg-red-900/30 border-red-300 dark:border-red-800' : 'bg-white/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'}`}>
                    <div className="flex items-start gap-4">
                        <input type="checkbox" id="smart-failed" checked={config.smartReview.failed.enabled} onChange={e => handleSmartReviewChange('failed', 'enabled', e.target.checked)} disabled={failedQuestions.length === 0} className="mt-1 h-5 w-5 rounded-sm border-slate-300 text-red-600 focus:ring-red-500 disabled:opacity-50" />
                        <div className="flex-grow">
                            <label htmlFor="smart-failed" className={`font-semibold text-slate-800 dark:text-slate-100 ${failedQuestions.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed text-slate-400 dark:text-slate-500'}`}><XCircleIcon className="inline h-5 w-5 mr-1 text-red-500" />Incluir preguntas falladas</label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">{filteredFailedCount} de {failedQuestions.length} disponibles (según filtro)</p>
                        </div>
                        {config.smartReview.failed.enabled && (
                            <input type="number" min="0" max={filteredFailedCount} value={config.smartReview.failed.count} onChange={e => handleSmartReviewChange('failed', 'count', parseInt(e.target.value) || 0)} className="w-24 p-2 bg-white dark:bg-slate-700 border font-sans border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-slate-100" />
                        )}
                    </div>
                    {config.smartReview.failed.enabled && renderTopicFilter('failed', isFailedTopicsVisible, () => setFailedTopicsVisible(p => !p), failedTopics, config.smartReview.failed.selectedTopics)}
                </div>
                 <div className={`p-4 rounded-lg border transition-all duration-200 ${config.smartReview.unanswered.enabled ? 'bg-sky-50/70 dark:bg-sky-900/30 border-sky-300 dark:border-sky-800' : 'bg-white/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'}`}>
                    <div className="flex items-start gap-4">
                        <input type="checkbox" id="smart-unanswered" checked={config.smartReview.unanswered.enabled} onChange={e => handleSmartReviewChange('unanswered', 'enabled', e.target.checked)} disabled={unansweredQuestions.length === 0} className="mt-1 h-5 w-5 rounded-sm border-slate-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50" />
                        <div className="flex-grow">
                             <label htmlFor="smart-unanswered" className={`font-semibold text-slate-800 dark:text-slate-100 ${unansweredQuestions.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed text-slate-400 dark:text-slate-500'}`}><QuestionMarkCircleIcon className="inline h-5 w-5 mr-1 text-sky-500" />Incluir preguntas en blanco</label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">{filteredUnansweredCount} de {unansweredQuestions.length} disponibles (según filtro)</p>
                        </div>
                        {config.smartReview.unanswered.enabled && (
                            <input type="number" min="0" max={filteredUnansweredCount} value={config.smartReview.unanswered.count} onChange={e => handleSmartReviewChange('unanswered', 'count', parseInt(e.target.value) || 0)} className="w-24 p-2 bg-white dark:bg-slate-700 border font-sans border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-slate-100" />
                        )}
                    </div>
                     {config.smartReview.unanswered.enabled && renderTopicFilter('unanswered', isUnansweredTopicsVisible, () => setUnansweredTopicsVisible(p => !p), unansweredTopics, config.smartReview.unanswered.selectedTopics)}
                </div>
            </div>
        </div>
      </div>

      <div className="flex-shrink-0 mt-auto pt-6 border-t border-slate-200 dark:border-slate-700">
        <div className="flex justify-end gap-4">
            <button type="submit" disabled={totalSelectedQuestions === 0} className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-500 focus:ring-offset-stone-50 transition-all duration-200 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none font-sans">
            <SparklesIcon className="h-5 w-5" />
            Empezar Test ({totalSelectedQuestions})
            </button>
        </div>
      </div>
    </form>
  );
};

export default CustomTestConfigurator;