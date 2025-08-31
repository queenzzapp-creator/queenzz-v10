

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { QuizQuestion, AppState, GeneratedQuiz, SavedQuiz, LibraryItem, Folder, LibraryData, FlashcardDeck, Settings, GeneratedFlashcardDeck, QuizSettings, SyncStatus, UserAnswersMap, Flashcard, PausedQuizState, StoredFile, StudyPlanSession, MnemonicRule, StudyPlanConfig, QuizDifficulty, AppData, ScoreRecord, ActiveQuizType, StoredURL, DocumentItem, StoredFileItem, StoredURLItem, QuestionFlag, FailedQuestionEntry } from './types.ts';
import { generateQuizFromContent, generateQuizFromText, parseQuizFromText, generateQuizFromWeb, generateFlashcardsFromContent, generateFlashcardsFromText, generateFlashcardsFromWeb, getTextFromWeb, createOmniCoachChatSession } from './services/geminiService.ts';
import * as libraryService from './services/libraryService.ts';
import * as settingsService from './services/settingsService.ts';
import * as plannerService from './services/plannerService.ts';
import { fileToBase64, parseFileToText, getFilePageCount, parseTextFromContent } from './utils/fileParser.ts';
import { generatePdfBlob } from './utils/pdfGenerator.ts';
import * as pdfjsLib from 'pdfjs-dist';
import useHistory from './hooks/useHistory.ts';


import QuizInput from './components/QuizInput.tsx';
import QuizView from './components/QuizView.tsx';
import QuizResults from './components/QuizResults.tsx';
import Loader from './components/Loader.tsx';
import QuizLibrary from './components/QuizLibrary.tsx';
import QuizEditor from './components/QuizEditor.tsx';
import QuestionListViewer from './components/QuestionListViewer.tsx';
import { AppLogoIcon, Cog6ToothIcon, ExclamationTriangleIcon, AcademicCapIcon, BrainIcon, CalendarDaysIcon, ChartBarIcon, ArrowPathIcon, CheckCircleIcon, XMarkIcon, InboxStackIcon } from './components/Icons.tsx';
import LibrarySwitcher from './components/LibrarySwitcher.tsx';
import FlashcardView from './components/FlashcardView.tsx';
import SettingsModal from './components/SettingsModal.tsx';
import QuizStartConfigurator from './components/QuizStartConfigurator.tsx';
import SyncStatusIndicator from './components/SyncStatusIndicator.tsx';
import FlashcardReviewConfigurator from './components/FlashcardReviewConfigurator.tsx';
import ImportConfigurator from './components/ImportConfigurator.tsx';
import ExportConfigurator from './components/ExportConfigurator.tsx';
import PdfExportConfigurator from './components/PdfExportConfigurator.tsx';
import ProgressView from './components/ProgressView.tsx';
import DocumentLibrary from './components/DocumentLibrary.tsx';
import DuplicateQuestionModal from './components/DuplicateQuestionModal.tsx';
import { PlannerView } from './components/PlannerView.tsx';
import PlannedQuizConfigurator from './components/PlannedQuizConfigurator.tsx';
import MnemonicHelper from './components/MnemonicHelper.tsx';
import PdfViewerModal from './components/PdfViewerModal.tsx';
import MnemonicSuggestionModal from './components/MnemonicSuggestionModal.tsx';
import ViewMnemonicModal from './components/ViewMnemonicModal.tsx';
import AdvancedSearchView from './components/AdvancedSearchView.tsx';
import StudyCoach from './components/StudyCoach.tsx';
import Sidebar from './components/Sidebar.tsx';
import UnifiedReviewConfigurator from './components/UnifiedReviewConfigurator.tsx';
import AddQuestionsModal from './components/AddQuestionsModal.tsx';
import QuestionEditorModal from './components/QuestionEditorModal.tsx';
import MoveQuestionsModal from './components/MoveQuestionsModal.tsx';
import HelpModal from './components/HelpModal.tsx';
import QuizDetailsView from './components/QuizDetailsView.tsx';

// --- Type definition for duplicate resolution promise ---
interface DuplicateResolutionData {
    quizData: GeneratedQuiz;
    fileId?: string;
    duplicates: { existing: QuizQuestion, new: QuizQuestion }[];
    onResolve: (resolvedQuestions: QuizQuestion[], fileId?: string) => void;
    onCancel: () => void;
}

type NumberOfOptions = 2 | 3 | 4 | 5 | 'variable';

const cropImage = (imageBase64: string, box: { x: number; y: number; width: number; height: number; }): Promise<string> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const sourceX = image.naturalWidth * box.x;
            const sourceY = image.naturalHeight * box.y;
            const sourceWidth = image.naturalWidth * box.width;
            const sourceHeight = image.naturalHeight * box.height;
            
            canvas.width = sourceWidth;
            canvas.height = sourceHeight;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('No se pudo obtener el contexto del canvas para recortar'));
            }
            
            ctx.drawImage(
                image,
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                0, 0,
                sourceWidth,
                sourceHeight
            );
            
            resolve(canvas.toDataURL('image/jpeg'));
        };
        image.onerror = (err) => reject(err);
        image.src = imageBase64;
    });
};

const saveFile = async (blob: Blob, fileName: string, types: { description: string, accept: { [key: string]: string[] } }[]) => {
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await (window as any).showSaveFilePicker({ suggestedName: fileName, types });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            console.error('Error using showSaveFilePicker, falling back.', err);
        }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};


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

const flattenItems = (items: LibraryItem[]): LibraryItem[] => {
    let flatList: LibraryItem[] = [];
    items.forEach(item => {
        flatList.push(item);
        if (item.type === 'folder') {
            flatList = flatList.concat(flattenItems(item.children));
        }
    });
    return flatList;
};

const flattenDocuments = (items: DocumentItem[]): (StoredFileItem | StoredURLItem)[] => {
    let flatList: (StoredFileItem | StoredURLItem)[] = [];
    items.forEach(item => {
        if (item.type === 'file' || item.type === 'url') {
            flatList.push(item);
        } else if (item.type === 'folder') {
            flatList = flatList.concat(flattenDocuments(item.children));
        }
    });
    return flatList;
};


const flattenQuizzes = (items: LibraryItem[]): SavedQuiz[] => {
    const quizzes: SavedQuiz[] = [];
    const recurse = (currentItems: LibraryItem[]) => {
        for (const item of currentItems) {
            if (item.type === 'quiz') quizzes.push(item);
            else if (item.type === 'folder') recurse(item.children);
        }
    };
    recurse(items);
    return quizzes;
};

const getQuizzesFromSelection = (library: LibraryItem[], selectedIds: Set<string>): SavedQuiz[] => {
    const quizzes: SavedQuiz[] = [];
    const visitedFolders = new Set<string>();
    const recurse = (items: LibraryItem[]) => {
        for (const item of items) {
            if (selectedIds.has(item.id)) {
                if (item.type === 'quiz') {
                    if(!quizzes.some(q => q.id === item.id)) quizzes.push(item);
                } else if (item.type === 'folder' && !visitedFolders.has(item.id)) {
                    visitedFolders.add(item.id);
                    flattenQuizzes(item.children).forEach(q => {
                         if(!quizzes.some(sq => sq.id === q.id)) quizzes.push(q);
                    })
                }
            } else if (item.type === 'folder' && !visitedFolders.has(item.id)) {
                recurse(item.children);
            }
        }
    };
    recurse(library);
    return quizzes;
};

const getISOWeek = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const QUESTIONS_PER_API_CHUNK = 2;


const parsePageRange = (rangeStr: string, maxPage: number): number[] => {
  const pages = new Set<number>();
  if (!rangeStr) return [];
  const parts = rangeStr.replace(/\s/g, '').split(',');

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          if (i > 0 && i <= maxPage) {
            pages.add(i);
          }
        }
      }
    } else {
      const page = Number(part);
      if (!isNaN(page) && page > 0 && page <= maxPage) {
        pages.add(page);
      }
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
};

const getAllQuizzesFromFolder = (folder: Folder): SavedQuiz[] => {
    let quizzes: SavedQuiz[] = [];
    for (const item of folder.children) {
        if (item.type === 'quiz') {
            quizzes.push(item);
        } else if (item.type === 'folder') {
            quizzes.push(...getAllQuizzesFromFolder(item));
        }
    }
    return quizzes;
};


const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.VIEWING_LIBRARY);
  const [previousAppState, setPreviousAppState] = useState<AppState | null>(null);
  const [isMigrating, setIsMigrating] = useState(true);

  const [settings, setSettings] = useState<Settings>(settingsService.getSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');

  const [appData, setAppData, undo, redo, canUndo, canRedo] = useHistory<AppData | null>(null);

  const allLibraries = useMemo(() => appData ? Object.values(appData.libraries).map(({ id, name }) => ({ id, name })) : [], [appData]);
  const activeLibrary = useMemo(() => appData && appData.activeLibraryId ? appData.libraries[appData.activeLibraryId] : null, [appData]);
  
  const library = useMemo(() => activeLibrary?.library || [], [activeLibrary]);
  const openFolderIds = useMemo(() => new Set(activeLibrary?.openFolderIds || []), [activeLibrary]);
  const documentLibrary = useMemo(() => activeLibrary?.documentLibrary || [], [activeLibrary]);
  const srsEntries = useMemo(() => activeLibrary?.failedQuestions || [], [activeLibrary]);
  const answeredQuestionIds = useMemo(() => new Set(activeLibrary?.answeredQuestionIds || []), [activeLibrary]);
  const failedFlashcards = useMemo(() => activeLibrary?.failedFlashcards || [], [activeLibrary]);
  const allTimeFailedIds = useMemo(() => new Set(activeLibrary?.allTimeFailedQuestionIds || []), [activeLibrary]);
  const allTimeUnansweredIds = useMemo(() => new Set(activeLibrary?.allTimeUnansweredQuestionIds || []), [activeLibrary]);
  const pausedQuizState = useMemo(() => activeLibrary?.pausedQuizState, [activeLibrary]);
  
  const allDocuments = useMemo(() => flattenDocuments(documentLibrary), [documentLibrary]);
  const storedFiles = useMemo(() => allDocuments.filter((d): d is StoredFileItem => d.type === 'file'), [allDocuments]);
  const storedURLs = useMemo(() => allDocuments.filter((d): d is StoredURLItem => d.type === 'url'), [allDocuments]);

  const studyPlanConfig = useMemo(() => activeLibrary?.studyPlanConfig, [activeLibrary]);
  const studyPlanSessions = useMemo(() => activeLibrary?.studyPlanSessions || [], [activeLibrary]);
  const mnemonics = useMemo(() => activeLibrary?.mnemonics || [], [activeLibrary]);
  
  const [currentQuiz, setCurrentQuiz] = useState<GeneratedQuiz | SavedQuiz | null>(null);
  const [activeQuizType, setActiveQuizType] = useState<ActiveQuizType>('normal');
  const [currentDeck, setCurrentDeck] = useState<FlashcardDeck | { title: string; cards: Flashcard[] } | null>(null);
  const [configuringQuiz, setConfiguringQuiz] = useState<SavedQuiz | null>(null);
  const [viewingQuizDetails, setViewingQuizDetails] = useState<SavedQuiz | null>(null);
  const [quizSettings, setQuizSettings] = useState<QuizSettings | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[] | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswersMap | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [loaderMessage, setLoaderMessage] = useState('');
  const [editingQuiz, setEditingQuiz] = useState<SavedQuiz | null>(null);
  const [viewingQuestions, setViewingQuestions] = useState<QuizQuestion[] | null>(null);
  const [viewingTitle, setViewingTitle] = useState('');
  const [sessionFailedQuestions, setSessionFailedQuestions] = useState<QuizQuestion[]>([]);
  const [sessionUnansweredQuestions, setSessionUnansweredQuestions] = useState<QuizQuestion[]>([]);
  
  const [todaysSessions, setTodaysSessions] = useState<StudyPlanSession[]>([]);
  const [configuringPlannedSession, setConfiguringPlannedSession] = useState<StudyPlanSession | null>(null);

  const [configuringImportData, setConfiguringImportData] = useState<{fileName: string; data: LibraryData} | null>(null);
  const [duplicateResolutionData, setDuplicateResolutionData] = useState<DuplicateResolutionData | null>(null);
  
  const [pdfViewerState, setPdfViewerState] = useState<{ file: StoredFile, page: number, highlightText?: string } | null>(null);
  const [mnemonicSuggestionForQuestion, setMnemonicSuggestionForQuestion] = useState<QuizQuestion | null>(null);
  const [viewingMnemonic, setViewingMnemonic] = useState<MnemonicRule | null>(null);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [practiceConfigInitialStatus, setPracticeConfigInitialStatus] = useState<'correct' | 'failed' | 'unanswered' | 'srs' | 'none'>('failed');
  const [addQuestionsModalState, setAddQuestionsModalState] = useState<{ targetQuiz: SavedQuiz; newQuestions: QuizQuestion[] } | null>(null);
  const [questionEditorState, setQuestionEditorState] = useState<{ question: QuizQuestion, onSave: (q: QuizQuestion) => void } | null>(null);
  const [moveQuestionsState, setMoveQuestionsState] = useState<{ questionIds: Set<string>, onMove: (targetQuizId: string) => void } | null>(null);


  const importInputRef = useRef<HTMLInputElement>(null);

  const allQuestions = useMemo(() => flattenQuizzes(library).flatMap(q => q.questions), [library]);
  const mnemonicsByQuestionId = useMemo(() => new Map(mnemonics.map(m => [m.id, m])), [mnemonics]);

  const allFailedQuestions = useMemo(() => allQuestions.filter(q => allTimeFailedIds.has(q.id)), [allQuestions, allTimeFailedIds]);
  const allUnansweredQuestions = useMemo(() => allQuestions.filter(q => allTimeUnansweredIds.has(q.id) && !allTimeFailedIds.has(q.id)), [allQuestions, allTimeUnansweredIds, allTimeFailedIds]);
  const correctlyAnsweredQuestions = useMemo(() => allQuestions.filter(q => answeredQuestionIds.has(q.id) && !allTimeFailedIds.has(q.id) && !allTimeUnansweredIds.has(q.id)), [allQuestions, answeredQuestionIds, allTimeFailedIds, allTimeUnansweredIds]);
  
  const dueSrsQuestions = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      return srsEntries.filter(entry => entry.nextReviewDate <= today && entry.question.flag !== 'suspendida').map(entry => entry.question);
  }, [srsEntries]);

  const stats = useMemo(() => ({
        correct: correctlyAnsweredQuestions.length, srsDue: dueSrsQuestions.length,
        totalFailed: allFailedQuestions.length, unanswered: allUnansweredQuestions.length,
        failedFlashcards: failedFlashcards.length,
        reviewItems: dueSrsQuestions.length + failedFlashcards.length,
    }), [correctlyAnsweredQuestions, dueSrsQuestions, allFailedQuestions, allUnansweredQuestions, failedFlashcards]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    document.documentElement.classList.toggle('minimalist', settings.vision === 'minimalist');
  }, [settings.theme, settings.vision]);

  const updateAppDataAndMarkDirty = useCallback((updater: (currentData: AppData) => AppData) => {
      if (!appData) return;
      const newData = updater(appData);
      setAppData(newData);
      setSyncStatus('unsaved');
  }, [appData, setAppData]);

  // Fix: Implement reloadAppData callback to refresh app data from the service layer.
  const reloadAppData = useCallback(async () => {
    try {
      const loadedData = await libraryService.loadAppData();
      setAppData(loadedData, true); // Re-initialize history with fresh data
    } catch(e) {
      console.error("Failed to reload app data", e);
      setError("No se pudo recargar los datos de la aplicación.");
    }
  }, [setAppData]);

  useEffect(() => {
    const handleSaveStart = () => setSyncStatus('syncing');
    const handleSaveSuccess = () => setSyncStatus('synced');
    const handleSaveError = () => setSyncStatus('error');
    
    window.addEventListener('savestart', handleSaveStart);
    window.addEventListener('savesuccess', handleSaveSuccess);
    window.addEventListener('saveerror', handleSaveError);

    const initializeApp = async () => {
      setIsMigrating(true);
      setLoaderMessage("Realizando mantenimiento...");
      try {
          const loadedData = await libraryService.loadAppData();
          setAppData(loadedData, true); // Initialize history
      } catch(e) {
          console.error("Data loading/migration failed", e);
          setError("No se pudo cargar o actualizar la base de datos.");
      }
      setIsMigrating(false);
    };
    initializeApp();

    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            if (appData && syncStatus !== 'synced') {
                libraryService.saveAppData(appData);
            }
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        window.removeEventListener('savestart', handleSaveStart);
        window.removeEventListener('savesuccess', handleSaveSuccess);
        window.removeEventListener('saveerror', handleSaveError);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); 

   useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Global Undo/Redo
      if (isCtrlOrCmd && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      }
      if (isCtrlOrCmd && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      }

      // Open new content
       if (isCtrlOrCmd && e.key.toLowerCase() === 'n' && !e.shiftKey) {
          e.preventDefault();
          if (appState !== AppState.CREATING_CONTENT) {
              setNavState(AppState.CREATING_CONTENT);
          }
       }
      
      // Close modals with Escape
      if (e.key === 'Escape') {
          if (isSettingsOpen) { setIsSettingsOpen(false); return; }
          if (isHelpModalOpen) { setIsHelpModalOpen(false); return; }
          if (pdfViewerState) { setPdfViewerState(null); return; }
          if (duplicateResolutionData) { setDuplicateResolutionData(null); return; }
          // ... handle other modals ...
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
   }, [canUndo, canRedo, undo, redo, isSettingsOpen, isHelpModalOpen, pdfViewerState, duplicateResolutionData, appState]);

  useEffect(() => {
      if (activeLibrary?.studyPlanSessions) {
          setTodaysSessions(plannerService.getTodaysSessions(activeLibrary.studyPlanSessions));
      }
  }, [activeLibrary?.studyPlanSessions]);

  const setNavState = (newState: AppState) => { setPreviousAppState(appState); setAppState(newState); };
  const handleBack = () => { setAppState(previousAppState || AppState.VIEWING_LIBRARY); setPreviousAppState(null); };
  const handleResetToLibrary = () => { setAppState(AppState.VIEWING_LIBRARY); setCurrentQuiz(null); setActiveQuestions(null); setUserAnswers(null); setCurrentQuestionIndex(0); setPreviousAppState(null); };
  
  const handleSaveSettings = (newSettings: Settings) => { setSettings(newSettings); settingsService.saveSettings(newSettings); };
  
  const handleUpdateLibrary = useCallback((newLibrary: LibraryItem[]) => { 
      // Fix: Use the new pure function `getAppDataWithUpdatedLibrary` to update app state.
      if (!appData) return;
      updateAppDataAndMarkDirty(currentData => libraryService.getAppDataWithUpdatedLibrary(currentData, newLibrary));
  }, [appData, updateAppDataAndMarkDirty]);

  const handleToggleFolder = useCallback((folderId: string) => {
    if (!appData) return;
    updateAppDataAndMarkDirty(currentData => libraryService.getAppDataWithToggledFolder(currentData, folderId));
  }, [appData, updateAppDataAndMarkDirty]);

  const handleMoveItems = useCallback((itemIds: Set<string>, targetFolderId: string | null) => {
    if (!appData) return;
    updateAppDataAndMarkDirty(currentData => libraryService.getAppDataWithMovedItems(currentData, itemIds, targetFolderId));
  }, [appData, updateAppDataAndMarkDirty]);

  const handleUpdateDocumentLibrary = useCallback((newDocLibrary: DocumentItem[]) => {
      // Fix: Use the new pure function `getAppDataWithNewDocLibrary` to update app state.
      if (!appData) return;
      updateAppDataAndMarkDirty(currentData => libraryService.getAppDataWithNewDocLibrary(currentData, newDocLibrary));
  }, [appData, updateAppDataAndMarkDirty]);


  const handleManualSave = async () => {
    if (!appData) return;
    setSyncStatus('syncing');
    try {
        await libraryService.saveAppData(appData);
        setSyncStatus('synced');
    } catch (e) {
        console.error("Manual save failed:", e);
        setSyncStatus('error');
        setError("El guardado manual ha fallado.");
    }
  };

  const handleResetProgress = () => {
    if (!activeLibrary || !appData) return;

    if (window.confirm(`¿Estás seguro de que quieres restablecer todo el progreso de la biblioteca "${activeLibrary.name}"? Esta acción es irreversible.`)) {
        // Fix: Use the new pure function `getAppDataWithResetProgress` to update app state.
        updateAppDataAndMarkDirty(currentData => libraryService.getAppDataWithResetProgress(currentData, currentData.activeLibraryId!));
        setIsSettingsOpen(false);
    }
  };

  const handleUpdateSingleItem = (updatedItem: LibraryItem) => {
    const updateInTree = (items: LibraryItem[]): LibraryItem[] => {
        return items.map(item => {
            if (item.id === updatedItem.id) return updatedItem;
            if (item.type === 'folder') return { ...item, children: updateInTree(item.children) };
            return item;
        });
    };
    handleUpdateLibrary(updateInTree(library));
  };

  const handleSaveQuiz = useCallback((quizData: GeneratedQuiz, fileId?: string) => {
    if(!appData) return;
    const allQuestionsMap = new Map(allQuestions.map(q => [libraryService.getQuestionSignature(q), q]));
    const duplicates = quizData.questions.map(newQ => ({ new: newQ, existing: allQuestionsMap.get(libraryService.getQuestionSignature(newQ)) })).filter(d => d.existing) as { existing: QuizQuestion, new: QuizQuestion }[];
    
    const saveFinalQuiz = (questions: QuizQuestion[], fileId?: string) => {
        if (questions.length === 0) { setNavState(AppState.CREATING_CONTENT); return; }
        const newQuiz: SavedQuiz = {
            ...quizData, questions: questions.map(q => ({...q, sourceFileId: fileId })),
            id: crypto.randomUUID(), type: 'quiz', createdAt: new Date().toISOString(),
        };
        handleUpdateLibrary([newQuiz, ...library]);
        setNavState(AppState.VIEWING_LIBRARY);
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 3000);
    };

    if (duplicates.length > 0) {
        setDuplicateResolutionData({
            quizData, fileId, duplicates,
            onResolve: (resolvedQs, fId) => { setDuplicateResolutionData(null); saveFinalQuiz(resolvedQs, fId); },
            onCancel: () => { setDuplicateResolutionData(null); setNavState(AppState.CREATING_CONTENT); }
        });
    } else {
        saveFinalQuiz(quizData.questions, fileId);
    }
  }, [appData, allQuestions, library, handleUpdateLibrary]);
  
  const handleSaveDeck = useCallback((deckData: GeneratedFlashcardDeck) => {
    const newDeck: FlashcardDeck = {
        ...deckData,
        id: crypto.randomUUID(),
        type: 'deck',
        createdAt: new Date().toISOString(),
        cards: deckData.cards.map(c => {
            const cardData = c as any; // Handle AI sometimes using anverso/reverso
            return {
                id: crypto.randomUUID(),
                question: cardData.question || cardData.anverso || '',
                answer: cardData.answer || cardData.reverso || ''
            };
        })
    };
    handleUpdateLibrary([newDeck, ...library]);
    setNavState(AppState.VIEWING_LIBRARY);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  }, [library, handleUpdateLibrary]);

    const handleGenerateQuiz = useCallback(async (text: string, questionCount: number, difficulty: QuizDifficulty, numberOfOptions: NumberOfOptions, file?: File, instructions?: string, pageRange?: string, useImages?: boolean) => {
        setNavState(AppState.GENERATING);
        try {
            let storedFileId: string | undefined = undefined;
            if (file) {
                setLoaderMessage('Guardando archivo...');
                const { count, isApproximation } = await getFilePageCount(file);
                const newFile: StoredFileItem = {
                    id: crypto.randomUUID(), name: file.name, type: 'file', mimeType: file.type, 
                    size: file.size, createdAt: new Date().toISOString(),
                    pageCount: count, isPageCountApprox: isApproximation
                };
                await libraryService.saveFileContent(newFile.id, await fileToBase64(file));
                handleUpdateDocumentLibrary([newFile, ...documentLibrary]);
                storedFileId = newFile.id;
            }

            let finalQuiz: GeneratedQuiz;
            const isPdf = file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));

            if (isPdf) {
                setLoaderMessage('Procesando PDF para la IA...');
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                const pagesToParse = parsePageRange(pageRange || `1-${pdf.numPages}`, pdf.numPages);
                if (pagesToParse.length === 0) throw new Error("Rango de páginas no válido.");

                const pageImages: string[] = [];
                let combinedText = "";

                for (const pageNum of pagesToParse) {
                    setLoaderMessage(`Procesando página ${pageNum} de ${pagesToParse.length}...`);
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    combinedText += textContent.items.map(item => 'str' in item ? item.str : '').join('\n') + '\n\n';

                    if (useImages) {
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        const viewport = page.getViewport({ scale: 1.5 });
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        if (context) {
                            await page.render({ canvasContext: context, viewport, canvas }).promise;
                            pageImages.push(canvas.toDataURL('image/jpeg', 0.9));
                        }
                    }
                }
                setLoaderMessage('La IA está creando tu test...');
                if (useImages) {
                    finalQuiz = await generateQuizFromContent(combinedText, pageImages, questionCount, difficulty, instructions, numberOfOptions);
                } else {
                    finalQuiz = await generateQuizFromText(combinedText, questionCount, difficulty, instructions, numberOfOptions);
                }
            } else {
                setLoaderMessage('La IA está creando tu test...');
                finalQuiz = await generateQuizFromText(text, questionCount, difficulty, instructions, numberOfOptions);
            }
            
            handleSaveQuiz(finalQuiz, storedFileId);
        } catch (err: any) { 
            setError(`Error al generar el test: ${err.message}`); 
            setNavState(AppState.CREATING_CONTENT); 
        }
    }, [handleSaveQuiz, documentLibrary, handleUpdateDocumentLibrary]);

    const handleGenerateDeck = useCallback(async (text: string, cardCount: number, difficulty: QuizDifficulty, file?: File, instructions?: string, pageRange?: string, useImages?: boolean) => {
        setNavState(AppState.GENERATING);
        try {
            if (file) {
                 // The file is only used for its content; it's saved in the quiz flow.
                 // Here, we just ensure it's processed if it's a PDF.
            }
            
            let finalDeck: GeneratedFlashcardDeck;
            const isPdf = file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    
            if (isPdf) {
                setLoaderMessage('Procesando PDF para la IA...');
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                const pagesToParse = parsePageRange(pageRange || `1-${pdf.numPages}`, pdf.numPages);
                if (pagesToParse.length === 0) throw new Error("Rango de páginas no válido.");
    
                const pageImages: string[] = [];
                let combinedText = "";
    
                for (const pageNum of pagesToParse) {
                    setLoaderMessage(`Procesando página ${pageNum} de ${pagesToParse.length}...`);
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    combinedText += textContent.items.map(item => 'str' in item ? item.str : '').join('\n') + '\n\n';
    
                    if (useImages) {
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        const viewport = page.getViewport({ scale: 1.5 });
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        if (context) {
                            await page.render({ canvasContext: context, viewport, canvas }).promise;
                            pageImages.push(canvas.toDataURL('image/jpeg', 0.9));
                        }
                    }
                }
                setLoaderMessage('La IA está creando tus fichas...');
                if (useImages) {
                    finalDeck = await generateFlashcardsFromContent(combinedText, pageImages, cardCount, difficulty, instructions);
                } else {
                    finalDeck = await generateFlashcardsFromText(combinedText, cardCount, difficulty, instructions);
                }
            } else {
                setLoaderMessage('La IA está creando tus fichas...');
                finalDeck = await generateFlashcardsFromText(text, cardCount, difficulty, instructions);
            }
            
            await handleSaveDeck(finalDeck);
        } catch (err: any) { 
            setError(`Error al generar las fichas: ${err.message}`); 
            setNavState(AppState.CREATING_CONTENT); 
        }
    }, [handleSaveDeck]);

  const handleGenerateFromWeb = useCallback(async (topic: string, questionCount: number, difficulty: QuizDifficulty, numberOfOptions: NumberOfOptions, url?: string, instructions?: string) => {
      setNavState(AppState.GENERATING);
      setLoaderMessage('Buscando en la web y creando tu test...');
      try {
          const generatedQuiz = await generateQuizFromWeb(topic, questionCount, difficulty, url, instructions, numberOfOptions);
          handleSaveQuiz(generatedQuiz);
      } catch (err: any) { setError(`Error al generar desde la web: ${err.message}`); setNavState(AppState.CREATING_CONTENT); }
  }, [handleSaveQuiz]);

  const handleGenerateDeckFromWeb = useCallback(async (topic: string, cardCount: number, difficulty: QuizDifficulty, url?: string, instructions?: string) => {
      setNavState(AppState.GENERATING);
      setLoaderMessage('Buscando en la web y creando tus fichas...');
      try {
          const generatedDeck = await generateFlashcardsFromWeb(topic, cardCount, difficulty, url, instructions);
          await handleSaveDeck(generatedDeck);
      } catch (err: any) { setError(`Error al generar fichas desde la web: ${err.message}`); setNavState(AppState.CREATING_CONTENT); }
  }, [handleSaveDeck]);

    const handleBatchParse = useCallback(async (groups: { questionsFile: File; answersFile?: File, pageRange?: string, referenceFile?: File, contextImageFiles?: File[], contextText?: string, requiresImage?: boolean }[]) => {
        setNavState(AppState.GENERATING);
        let successCount = 0;
        let totalInvalidCount = 0;

        const newLibraryItems: LibraryItem[] = [];
        const newDocumentItems: StoredFileItem[] = [];
        const currentStoredFiles: StoredFileItem[] = [...storedFiles];

        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            const sourceFile = group.questionsFile;
            setLoaderMessage(`Procesando archivo ${i + 1} de ${groups.length}: ${sourceFile.name}...`);
            
            try {
                let storedFileId: string | undefined;
                setLoaderMessage(`Guardando archivo ${sourceFile.name}...`);

                const existingFile = currentStoredFiles.find(f => f.name === sourceFile.name && f.size === sourceFile.size);
                if (existingFile) {
                    storedFileId = existingFile.id;
                } else {
                    const { count, isApproximation } = await getFilePageCount(sourceFile);
                    const newFile: StoredFileItem = {
                        id: crypto.randomUUID(), name: sourceFile.name, type: 'file', mimeType: sourceFile.type,
                        size: sourceFile.size, createdAt: new Date().toISOString(),
                        pageCount: count, isPageCountApprox: isApproximation
                    };
                    await libraryService.saveFileContent(newFile.id, await fileToBase64(sourceFile));
                    newDocumentItems.push(newFile);
                    currentStoredFiles.unshift(newFile);
                    storedFileId = newFile.id;
                }

                let contextImageBase64s: string[] = [];
                if (group.contextImageFiles && group.contextImageFiles.length > 0) {
                    contextImageBase64s = await Promise.all(
                        group.contextImageFiles.map(file => fileToBase64(file))
                    );
                }
                
                let fileTitle = sourceFile.name.replace(/\.[^/.]+$/, "");
                const isPdf = sourceFile.type === 'application/pdf' || sourceFile.name.toLowerCase().endsWith('.pdf');

                const referenceText = group.referenceFile ? `\n\n--- DOCUMENTO DE REFERENCIA ---\n\n${await parseFileToText(group.referenceFile)}` : '';
                const answersText = group.answersFile ? `\n\n--- CLAVE DE RESPUESTAS ---\n\n${await parseFileToText(group.answersFile)}` : '';

                if (isPdf) {
                    setLoaderMessage(`Analizando PDF: ${sourceFile.name}...`);
                    const arrayBuffer = await sourceFile.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                    const pagesToParse = parsePageRange(group.pageRange || `1-${pdf.numPages}`, pdf.numPages);
                    const parsedQuestionTextsInFile = new Set<string>();

                    // Streaming variables
                    let streamingBuffer: QuizQuestion[] = [];
                    const STREAMING_BUFFER_SIZE = 30;
                    let streamingChunkCounter = 1;
                    let streamingFolder: Folder | null = null;

                    for (let pageIdx = 0; pageIdx < pagesToParse.length; pageIdx++) {
                        const chunkPageNumbers = pagesToParse.slice(pageIdx, pageIdx + 2);
                        if (chunkPageNumbers.length === 0) break;
                        
                        setLoaderMessage(`Procesando páginas ${chunkPageNumbers[0]}-${chunkPageNumbers[chunkPageNumbers.length - 1]} de "${sourceFile.name}"...`);

                        let chunkText = "";
                        const chunkImages: { pageNum: number, image: string }[] = [];

                        if (group.requiresImage) {
                            for (const pageNum of chunkPageNumbers) {
                                const page = await pdf.getPage(pageNum);
                                const canvas = document.createElement('canvas');
                                const context = canvas.getContext('2d');
                                const viewport = page.getViewport({ scale: 1.2 }); // Optimized scale
                                canvas.height = viewport.height;
                                canvas.width = viewport.width;
                                if (context) {
                                    await page.render({ canvas, canvasContext: context, viewport: viewport }).promise;
                                    chunkImages.push({ pageNum, image: canvas.toDataURL('image/jpeg', 0.85) }); // Optimized compression
                                }
                            }
                        }
                        
                        // Always get text content
                        for (const pageNum of chunkPageNumbers) {
                            const page = await pdf.getPage(pageNum);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items.map(item => 'str' in item ? item.str : '').join('\n');
                            chunkText += `\n\n--- INICIO PÁGINA ${pageNum} ---\n\n${pageText}`;
                        }

                        if (chunkText.trim().length > 10 || (group.requiresImage && chunkImages.length > 0)) {
                            const combinedText = `--- DOCUMENTO DEL TEST ---\n\n${chunkText}${referenceText}${answersText}`;
                            
                            const { quiz: parsedQuizChunk, invalidCount } = await parseQuizFromText(combinedText, group.requiresImage ? chunkImages.find(ci => ci.pageNum === chunkPageNumbers[0])?.image : undefined, contextImageBase64s, group.contextText, group.requiresImage);
                            totalInvalidCount += invalidCount;

                            if (pageIdx === 0 && parsedQuizChunk.title) {
                                fileTitle = parsedQuizChunk.title;
                            }

                            if (parsedQuizChunk.questions.length > 0) {
                                const processedQuestions = await Promise.all(
                                    parsedQuizChunk.questions.map(async (q_raw: any) => {
                                        const correctAnswer = q_raw.options[q_raw.correctAnswerIndex];
                                        const sourcePageNum = q_raw.pageNumberInDocument || chunkPageNumbers[0];
                                        const sourcePageImage = chunkImages.find(ci => ci.pageNum === sourcePageNum)?.image;
                                        let finalImageUrl: string | undefined = undefined;
                            
                                        if (sourcePageImage && q_raw.boundingBox) {
                                            try { finalImageUrl = await cropImage(sourcePageImage, q_raw.boundingBox); } catch (cropError) { console.error("Could not crop image", cropError); finalImageUrl = sourcePageImage; }
                                        }
                                        
                                        return { id: crypto.randomUUID(), question: q_raw.question.replace(/\s*\[\d+\]\s*/g, ' ').trim(), options: q_raw.options, correctAnswer, explanation: q_raw.explanation.replace(/\s*\[\d+\]\s*/g, ' ').trim(), imageUrl: finalImageUrl, sourcePageImage: sourcePageImage, sourcePage: sourcePageNum } as QuizQuestion;
                                    })
                                );
                                
                                const newUniqueQuestions = processedQuestions.filter(q => !parsedQuestionTextsInFile.has(q.question.trim().toLowerCase()));
                                newUniqueQuestions.forEach(q => parsedQuestionTextsInFile.add(q.question.trim().toLowerCase()));
                                streamingBuffer.push(...newUniqueQuestions);

                                // Streaming save logic
                                while (streamingBuffer.length >= STREAMING_BUFFER_SIZE) {
                                    if (!streamingFolder) {
                                        streamingFolder = { id: crypto.randomUUID(), type: 'folder', name: fileTitle, children: [], isOpen: true };
                                        newLibraryItems.push(streamingFolder);
                                    }
                                    const questionsForChunk = streamingBuffer.splice(0, STREAMING_BUFFER_SIZE);
                                    const quizChunk: SavedQuiz = { title: `${fileTitle} (Parte ${streamingChunkCounter++})`, questions: questionsForChunk.map(q => ({...q, sourceFileId: storedFileId})), id: crypto.randomUUID(), type: 'quiz', createdAt: new Date().toISOString() };
                                    streamingFolder.children.push(quizChunk);
                                }
                            }
                        }
                    }

                    // After loop, handle remaining questions
                    if (streamingFolder) {
                        if (streamingBuffer.length > 0) {
                            const finalQuizChunk: SavedQuiz = { title: `${fileTitle} (Parte ${streamingChunkCounter++})`, questions: streamingBuffer.map(q => ({...q, sourceFileId: storedFileId})), id: crypto.randomUUID(), type: 'quiz', createdAt: new Date().toISOString() };
                            streamingFolder.children.push(finalQuizChunk);
                        }
                        successCount++;
                    } else if (streamingBuffer.length > 0) {
                        const finalQuiz: GeneratedQuiz = { title: fileTitle, questions: streamingBuffer };
                        const MAX_QUESTIONS_PER_QUIZ_IN_LIBRARY = 40;
                        if (finalQuiz.questions.length > MAX_QUESTIONS_PER_QUIZ_IN_LIBRARY) {
                            const newFolder: Folder = { id: crypto.randomUUID(), type: 'folder', name: finalQuiz.title, children: [], isOpen: true };
                            newFolder.children = libraryService.splitLargeQuiz(finalQuiz).map(chunk => ({ ...chunk, questions: chunk.questions.map(q => ({...q, sourceFileId: storedFileId})), id: crypto.randomUUID(), type: 'quiz', createdAt: new Date().toISOString() }));
                            newLibraryItems.push(newFolder);
                        } else {
                            newLibraryItems.push({ ...finalQuiz, questions: finalQuiz.questions.map(q => ({...q, sourceFileId: storedFileId})), id: crypto.randomUUID(), type: 'quiz', createdAt: new Date().toISOString() });
                        }
                        successCount++;
                    } else if (totalInvalidCount === 0) {
                         throw new Error("No se pudieron extraer preguntas válidas del documento.");
                    }

                } else { // Non-PDF files
                    const allParsedQuestions: QuizQuestion[] = [];
                    setLoaderMessage(`Analizando y dividiendo ${sourceFile.name}...`);
                    const questionsText = await parseFileToText(group.questionsFile, group.pageRange);
                    const questionChunks = questionsText.split(/(?=\n\d{1,3}[.-]\s)/g);
                    
                    for (let j = 0; j < questionChunks.length; j += QUESTIONS_PER_API_CHUNK) {
                        setLoaderMessage(`Procesando lote ${Math.floor(j / QUESTIONS_PER_API_CHUNK) + 1} de ${Math.ceil(questionChunks.length / QUESTIONS_PER_API_CHUNK)}...`);
                        
                        const batchText = questionChunks.slice(j, j + QUESTIONS_PER_API_CHUNK).join('');
                        if (batchText.trim().length === 0) continue;

                        const combinedText = `--- DOCUMENTO DEL TEST ---\n\n${batchText}${referenceText}${answersText}`;
                        
                        const { quiz: parsedQuizChunk, invalidCount } = await parseQuizFromText(combinedText, undefined, contextImageBase64s, group.contextText, group.requiresImage);
                        totalInvalidCount += invalidCount;

                        if (parsedQuizChunk.questions.length > 0) {
                        const processedQuestions = parsedQuizChunk.questions.map((q_raw: any) => ({ id: crypto.randomUUID(), question: q_raw.question.replace(/\s*\[\d+\]\s*/g, ' ').trim(), options: q_raw.options, correctAnswer: q_raw.options[q_raw.correctAnswerIndex], explanation: q_raw.explanation.replace(/\s*\[\d+\]\s*/g, ' ').trim() } as QuizQuestion));
                        allParsedQuestions.push(...processedQuestions);
                        }
                        if (j === 0 && parsedQuizChunk.title) {
                            fileTitle = parsedQuizChunk.title;
                        }
                    }
                    
                    if (allParsedQuestions.length === 0) throw new Error("No se pudieron extraer preguntas válidas del documento.");
                    
                    const finalQuiz: GeneratedQuiz = { title: fileTitle, questions: allParsedQuestions };
                    const MAX_QUESTIONS_PER_QUIZ_IN_LIBRARY = 40;
                    if (finalQuiz.questions.length > MAX_QUESTIONS_PER_QUIZ_IN_LIBRARY) {
                        const newFolder: Folder = { id: crypto.randomUUID(), type: 'folder', name: finalQuiz.title, children: [], isOpen: true };
                        newFolder.children = libraryService.splitLargeQuiz(finalQuiz).map(chunk => ({ ...chunk, questions: chunk.questions.map(q => ({...q, sourceFileId: storedFileId})), id: crypto.randomUUID(), type: 'quiz', createdAt: new Date().toISOString() }));
                        newLibraryItems.push(newFolder);
                    } else {
                        newLibraryItems.push({ ...finalQuiz, questions: finalQuiz.questions.map(q => ({...q, sourceFileId: storedFileId })), id: crypto.randomUUID(), type: 'quiz', createdAt: new Date().toISOString() });
                    }
                    successCount++;
                }

            } catch (err: any) {
                setError(`Error procesando "${sourceFile.name}": ${err.message}`);
            }
        }
        
        if (newDocumentItems.length > 0) {
            handleUpdateDocumentLibrary([...newDocumentItems, ...documentLibrary]);
        }
        if (newLibraryItems.length > 0) {
            handleUpdateLibrary([...newLibraryItems.reverse(), ...library]);
        }

        let finalMessage = `${successCount} de ${groups.length} archivos importados.`;
        if (totalInvalidCount > 0) {
            finalMessage += ` Se omitieron ${totalInvalidCount} preguntas.`;
        }
        setLoaderMessage(finalMessage);
        
        setTimeout(() => {
            setNavState(AppState.VIEWING_LIBRARY);
            if (totalInvalidCount > 0) {
                setError(`${totalInvalidCount} preguntas no pudieron ser procesadas por formato incorrecto.`);
            }
        }, 2000);
  }, [storedFiles, documentLibrary, library, handleUpdateLibrary, handleUpdateDocumentLibrary]);
  
    const handleGenerateFromStoredFile = useCallback(async (fileId: string, count: number, difficulty: QuizDifficulty, genType: 'quiz' | 'deck', numberOfOptions: NumberOfOptions, instructions?: string, pageRange?: string, useImages?: boolean) => {
        const fileItem = storedFiles.find(f => f.id === fileId);
        if (!fileItem) { setError("Archivo no encontrado."); return; }
        
        setNavState(AppState.GENERATING);
        setLoaderMessage(`Generando desde "${fileItem.name}"...`);
        try {
            const content = await libraryService.getFileContent(fileItem.id);
            if (!content) throw new Error("No se pudo cargar el contenido del archivo.");

            const file = new File([Uint8Array.from(atob(content.split(',')[1]), c => c.charCodeAt(0))], fileItem.name, { type: fileItem.mimeType });
            
            // Re-use the main generation logic
            if (genType === 'quiz') {
                await handleGenerateQuiz('', count, difficulty, numberOfOptions, file, instructions, pageRange, useImages);
            } else {
                await handleGenerateDeck('', count, difficulty, file, instructions, pageRange, useImages);
            }
        } catch (err: any) {
            setError(`Error al generar desde el archivo: ${err.message}`);
            setNavState(AppState.CREATING_CONTENT);
        }
    }, [storedFiles, handleGenerateQuiz, handleGenerateDeck]);

  const handleStartQuiz = (quiz: SavedQuiz | GeneratedQuiz, settings: QuizSettings, type: ActiveQuizType = 'normal') => {
    let questions = [...quiz.questions.filter(q => q.flag !== 'suspendida')];
    if(settings.shuffleQuestions) questions.sort(() => Math.random() - 0.5);
    if(settings.shuffleOptions) questions.forEach(q => q.options.sort(() => Math.random() - 0.5));
    
    setActiveQuestions(questions);
    setCurrentQuiz(quiz);
    setQuizSettings(settings);
    setActiveQuizType(type);
    setUserAnswers(new Map());
    setCurrentQuestionIndex(0);
    setSessionFailedQuestions([]);
    setSessionUnansweredQuestions([]);
    setTimeLeft(settings.mode === 'total' ? settings.duration : undefined);
    setNavState(AppState.TAKING_QUIZ);
  };
  
  const handleConfigureQuizStart = (quiz: SavedQuiz) => {
    setConfiguringQuiz(quiz);
    if (settings.alwaysConfigureQuiz) {
        setNavState(AppState.CONFIGURING_QUIZ_START);
    } else {
        handleStartQuiz(quiz, settings.defaultQuizSettings);
    }
  };

  const handleFinishQuiz = (failed: QuizQuestion[], unanswered: QuizQuestion[], finalUserAnswers: UserAnswersMap) => {
    if (!currentQuiz || !activeQuestions || !appData) return;
    setLoaderMessage("Calculando resultados...");
    setNavState(AppState.GENERATING);
    // Fix: Use the new pure function `calculateQuizCompletion` to get the new app state and results.
    const { newAppData, score: finalScore, questionToSuggestMnemonic } = libraryService.calculateQuizCompletion(appData, activeQuestions, finalUserAnswers, quizSettings!, 'id' in currentQuiz ? currentQuiz.id : null, activeQuizType);
    setAppData(newAppData);
    setSyncStatus('unsaved');
    setScore(finalScore);
    setSessionFailedQuestions(failed);
    setSessionUnansweredQuestions(unanswered);
    setUserAnswers(finalUserAnswers);
    if (questionToSuggestMnemonic) setMnemonicSuggestionForQuestion(questionToSuggestMnemonic);
    setNavState(AppState.RESULTS);
  };

    const handlePauseQuiz = (currentState: Omit<PausedQuizState, 'quizId' | 'quizTitle' | 'activeQuizType'>) => {
        if (!currentQuiz || !appData) return;
        const pausedState: PausedQuizState = {
            ...currentState,
            quizId: 'id' in currentQuiz ? currentQuiz.id : null,
            quizTitle: currentQuiz.title,
            activeQuizType: activeQuizType,
        };
        // Fix: Use the new pure function `getAppDataWithPausedState` to update app state.
        updateAppDataAndMarkDirty(currentData => libraryService.getAppDataWithPausedState(currentData, pausedState));
        handleResetToLibrary();
    };

    const handleResumeQuiz = () => {
        if (!pausedQuizState || !appData) return;
        const quizToResume: SavedQuiz | GeneratedQuiz = {
            id: pausedQuizState.quizId || crypto.randomUUID(),
            type: 'quiz',
            title: pausedQuizState.quizTitle,
            questions: pausedQuizState.questions,
            createdAt: new Date().toISOString()
        };
        
        setActiveQuestions(pausedQuizState.questions);
        setCurrentQuiz(quizToResume);
        setQuizSettings(pausedQuizState.quizSettings);
        setActiveQuizType(pausedQuizState.activeQuizType);
        setUserAnswers(new Map(pausedQuizState.userAnswers));
        setCurrentQuestionIndex(pausedQuizState.currentQuestionIndex);
        setTimeLeft(pausedQuizState.timeLeft);
        
        // Fix: Use the new pure function `getAppDataWithPausedState` to update app state.
        updateAppDataAndMarkDirty(currentData => libraryService.getAppDataWithPausedState(currentData, null));
        setNavState(AppState.TAKING_QUIZ);
    };

    const handleConfirmAndGeneratePlannedQuiz = async (session: StudyPlanSession, questionCount: number) => {
        const fileItem = storedFiles.find(f => f.id === session.fileId);
        if (!fileItem) {
            setError("El archivo de la sesión planificada no se ha encontrado.");
            setNavState(AppState.VIEWING_LIBRARY);
            return;
        }
        if (fileItem.mimeType !== 'application/pdf') {
            setError("Las sesiones de estudio planificadas solo funcionan con archivos PDF por ahora.");
            setNavState(AppState.VIEWING_LIBRARY);
            return;
        }

        setNavState(AppState.GENERATING);
        setLoaderMessage(`Preparando tu sesión de estudio de "${fileItem.name}"...`);

        try {
            const content = await libraryService.getFileContent(fileItem.id);
            if (!content) throw new Error("No se pudo cargar el contenido del archivo.");

            const arrayBuffer = Uint8Array.from(atob(content.split(',')[1]), c => c.charCodeAt(0)).buffer;
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const pageRange = `${session.startPage}-${session.endPage}`;
            const pagesToParse = parsePageRange(pageRange, pdf.numPages);
            if (pagesToParse.length === 0) throw new Error("Rango de páginas no válido para la sesión.");

            let combinedText = "";
            const pageImages: string[] = [];
            for (const pageNum of pagesToParse) {
                setLoaderMessage(`Procesando página ${pageNum} de la sesión...`);
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                combinedText += textContent.items.map(item => 'str' in item ? item.str : '').join('\n') + '\n\n';
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                const viewport = page.getViewport({ scale: 1.5 });
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                if (context) {
                    await page.render({ canvasContext: context, viewport, canvas }).promise;
                    pageImages.push(canvas.toDataURL('image/jpeg', 0.9));
                }
            }

            if (!combinedText.trim()) {
                throw new Error("No se encontró texto en las páginas seleccionadas para generar un test.");
            }

            const difficulty: QuizDifficulty = 'Medio';
            
            setLoaderMessage('La IA está creando tu test de la sesión...');
            const generatedQuiz = await generateQuizFromContent(
                combinedText,
                pageImages,
                questionCount,
                difficulty,
                `Genera un test sobre las páginas ${pageRange}.`,
                settings.defaultNumberOfOptions
            );
            
            const temporaryQuiz: GeneratedQuiz = {
                ...generatedQuiz,
                title: `Sesión: ${fileItem.name} (p. ${pageRange})`
            };
            handleStartQuiz(temporaryQuiz, settings.defaultQuizSettings, 'practice');
        } catch (err: any) {
            setError(`Error al iniciar la sesión planificada: ${err.message}`);
            setNavState(AppState.VIEWING_LIBRARY);
        }
    };

    const handleStartPlannedSessionQuiz = (session: StudyPlanSession) => {
        setConfiguringPlannedSession(session);
        setNavState(AppState.CONFIGURING_PLANNED_QUIZ);
    };
  
  const handleViewSource = async (question: QuizQuestion) => {
    if (!question.sourceFileId) return;
    const file = storedFiles.find(f => f.id === question.sourceFileId);
    if (file) {
        setLoaderMessage("Cargando documento...");
        const content = await libraryService.getFileContent(file.id);
        if (content) {
            setLoaderMessage("");
            setPdfViewerState({ file: {...file, base64Content: content}, page: question.sourcePage || 1, highlightText: question.question });
        } else { 
            setError("No se pudo cargar el contenido."); 
            setLoaderMessage(""); 
        }
    }
  };

  const handleViewFile = async (fileId: string) => {
    const file = storedFiles.find(f => f.id === fileId);
    if (file) {
        setNavState(AppState.GENERATING);
        setLoaderMessage("Cargando documento...");
        try {
            const content = await libraryService.getFileContent(file.id);
            if (content) {
                setPdfViewerState({ file: {...file, base64Content: content}, page: 1 });
            } else {
                throw new Error("No se pudo cargar el contenido del archivo.");
            }
        } catch(e: any) {
            setError(e.message || "Error al cargar el archivo.");
        } finally {
            // Return to the previous state, which was likely VIEWING_DOCUMENTS
            setAppState(previousAppState || AppState.VIEWING_LIBRARY);
        }
    } else {
        setError("Archivo adjunto no encontrado.");
    }
  };

const handleStartProgressPractice = useCallback((questions: QuizQuestion[]) => {
    if (questions.length === 0) {
        setError("No hay preguntas seleccionadas para la práctica.");
        setNavState(AppState.VIEWING_LIBRARY);
        return;
    }
    const filteredQuestions = questions.filter(q => q.flag !== 'suspendida');
    if (filteredQuestions.length === 0) {
        setError("Todas las preguntas seleccionadas están suspendidas.");
        setNavState(AppState.VIEWING_LIBRARY);
        return;
    }

    const quizTitle = `Práctica Personalizada - ${new Date().toLocaleDateString()}`;
    const newQuiz: GeneratedQuiz = { title: quizTitle, questions: filteredQuestions };
    handleStartQuiz(newQuiz, settings.defaultQuizSettings, 'practice');
}, [settings.defaultQuizSettings]);

const handleSelectImportFile = useCallback(async (file: File) => {
    setNavState(AppState.GENERATING);
    setLoaderMessage(`Leyendo archivo de importación: ${file.name}...`);
    try {
        const fileContent = await file.text();
        const data = JSON.parse(fileContent) as LibraryData;
        if (!data.id || !data.name || !Array.isArray(data.library)) {
            throw new Error("El archivo no parece ser una exportación válida de la biblioteca.");
        }
        setConfiguringImportData({ fileName: file.name, data });
        setNavState(AppState.CONFIGURING_IMPORT);
    } catch (err: any) {
        setError(`Error al procesar el archivo de importación: ${err.message}`);
        setNavState(AppState.VIEWING_LIBRARY);
    }
}, []);

const handleImportIntoLibrary = useCallback(async (targetLibraryId: string, data: LibraryData, includeProgress: boolean, includeDocuments: boolean) => {
    if (!appData) return;
    setNavState(AppState.GENERATING);
    setLoaderMessage('Importando en biblioteca existente...');
    try {
        const newAppData = await libraryService.importItemsIntoLibrary(targetLibraryId, data, includeProgress, includeDocuments, appData);
        setAppData(newAppData);
        setSyncStatus('unsaved');
        setNavState(AppState.VIEWING_LIBRARY);
    } catch (e: any) {
        setError(`Error al importar: ${e.message}`);
        setNavState(AppState.VIEWING_LIBRARY);
    } finally {
        setConfiguringImportData(null);
    }
}, [appData, setAppData]);

// FIX: Change signature to match prop type. It should not expect `name` as an argument.
const handleImportAsNew = useCallback(async (data: LibraryData, includeProgress: boolean, includeDocuments: boolean) => {
    setNavState(AppState.GENERATING);
    setLoaderMessage('Creando nueva biblioteca...');
    try {
        if(!appData) return;
        const newAppData = await libraryService.importAsNewLibrary(data.name, data, includeProgress, includeDocuments, appData);
        setAppData(newAppData);
        setSyncStatus('unsaved');
        setNavState(AppState.VIEWING_LIBRARY);
    } catch (e: any) {
        setError(`Error al importar: ${e.message}`);
        setNavState(AppState.VIEWING_LIBRARY);
    } finally {
        setConfiguringImportData(null);
    }
}, [appData, setAppData]);

const handleExport = async (selectedIds: Set<string>, fileName: string, includeProgress: boolean, includeDocuments: boolean) => {
    setNavState(AppState.GENERATING);
    setLoaderMessage('Preparando exportación...');
    try {
        if(!appData) throw new Error("No hay datos de la aplicación para exportar.");
        
        const dataToExport = await libraryService.prepareExportData(Array.from(selectedIds), includeProgress, includeDocuments, appData);
        
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        await saveFile(blob, fileName, [{ description: 'JSON file', accept: { 'application/json': ['.json'] } }]);
    } catch (err: any) {
        setError(`Error al exportar: ${err.message}`);
    }
    setNavState(AppState.VIEWING_LIBRARY);
};

const handlePdfExport = async (selectedIds: string[], fileName: string) => {
    setNavState(AppState.GENERATING);
    setLoaderMessage('Generando PDF...');
    try {
        const quizzesToExport = getQuizzesFromSelection(library, new Set(selectedIds));
        if (quizzesToExport.length === 0) {
            throw new Error("No se seleccionaron tests para exportar.");
        }
        const pdfBlob = await generatePdfBlob(quizzesToExport);
        await saveFile(pdfBlob, fileName, [{ description: 'PDF file', accept: { 'application/pdf': ['.pdf'] } }]);
    } catch (err: any) {
        setError(`Error al exportar a PDF: ${err.message}`);
    }
    setNavState(AppState.VIEWING_LIBRARY);
};

const handleStartChallenge = (type: 'weekly' | 'monthly') => {
    const { challengeSettings } = settings;
    const questionCount = type === 'weekly' ? challengeSettings.weeklyQuestionCount : challengeSettings.monthlyQuestionCount;
    const title = type === 'weekly' ? "Reto Semanal" : "Reto Mensual";
    const quizType = type === 'weekly' ? 'weekly_challenge' : 'monthly_challenge';

    const availableQuestions = allQuestions.filter(q => q.flag !== 'suspendida');

    if (availableQuestions.length < questionCount) {
        setError(`No tienes suficientes preguntas activas (${availableQuestions.length}) para el reto. Se necesitan ${questionCount}.`);
        return;
    }

    const challengeQuestions = [...availableQuestions].sort(() => Math.random() - 0.5).slice(0, questionCount);
    const newQuiz: GeneratedQuiz = { title, questions: challengeQuestions };
    handleStartQuiz(newQuiz, settings.defaultQuizSettings, quizType);
};

const handleAddMoreQuestions = async (quiz: SavedQuiz) => {
    const sourceFileId = quiz.questions.find(q => q.sourceFileId)?.sourceFileId;
    if (!sourceFileId) {
        setError("Este test no tiene un documento de origen asociado.");
        return;
    }

    const sourceFile = storedFiles.find(f => f.id === sourceFileId);
    if (!sourceFile) {
        setError("No se encontró el documento de origen.");
        return;
    }

    setNavState(AppState.GENERATING);
    setLoaderMessage(`Re-analizando "${sourceFile.name}"...`);
    
    try {
        const fileContent = await libraryService.getFileContent(sourceFile.id);
        if (!fileContent) throw new Error("No se pudo cargar el contenido del archivo.");
        
        const existingQuestionTexts = new Set(quiz.questions.map(q => q.question.trim().toLowerCase()));
        let allParsedQuestions: QuizQuestion[] = [];
        
        if (sourceFile.mimeType === 'application/pdf') {
            const arrayBuffer = Uint8Array.from(atob(fileContent.split(',')[1]), c => c.charCodeAt(0)).buffer;
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                setLoaderMessage(`Procesando página ${pageNum} de ${pdf.numPages}...`);
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => 'str' in item ? item.str : '').join('\n');
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                const viewport = page.getViewport({ scale: 1.5 });
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                let pageImageBase64: string | undefined = undefined;
                if (context) {
                    await page.render({ canvas, canvasContext: context, viewport: viewport }).promise;
                    pageImageBase64 = canvas.toDataURL('image/jpeg', 0.9);
                }

                if (pageText.trim().length > 10 || pageImageBase64) {
                    const { quiz: parsedQuizChunk } = await parseQuizFromText(pageText, pageImageBase64);

                    if (parsedQuizChunk.questions.length > 0) {
                        const processedQuestions = await Promise.all(
                            parsedQuizChunk.questions.map(async (q_raw: any) => {
                                const correctAnswer = q_raw.options[q_raw.correctAnswerIndex];
                                let finalImageUrl: string | undefined = undefined;
                                const sourcePageImage = pageImageBase64;
                    
                                if (pageImageBase64 && q_raw.boundingBox) {
                                    try {
                                        finalImageUrl = await cropImage(pageImageBase64, q_raw.boundingBox);
                                    } catch (cropError) {
                                        console.error("No se pudo recortar la imagen, usando la página completa:", q_raw.question, cropError);
                                        finalImageUrl = pageImageBase64;
                                    }
                                }
                                
                                return {
                                    id: crypto.randomUUID(),
                                    question: q_raw.question.replace(/\s*\[\d+\]\s*/g, ' ').trim(),
                                    options: q_raw.options,
                                    correctAnswer,
                                    explanation: q_raw.explanation.replace(/\s*\[\d+\]\s*/g, ' ').trim(),
                                    imageUrl: finalImageUrl,
                                    sourcePageImage: sourcePageImage,
                                    sourcePage: pageNum,
                                    sourceFileId: sourceFile.id,
                                } as QuizQuestion;
                            })
                        );
                        allParsedQuestions.push(...processedQuestions);
                    }
                }
            }
        } else {
            const fullText = await parseTextFromContent(fileContent, sourceFile.mimeType);
            const questionChunks = fullText.split(/(?=\n\d{1,3}[.-]\s)/g);
            
            for (let j = 0; j < questionChunks.length; j += QUESTIONS_PER_API_CHUNK) {
                setLoaderMessage(`Procesando lote ${Math.floor(j / QUESTIONS_PER_API_CHUNK) + 1}...`);
                const batchText = questionChunks.slice(j, j + QUESTIONS_PER_API_CHUNK).join('');
                if (batchText.trim().length === 0) continue;

                const { quiz: parsedQuizChunk } = await parseQuizFromText(batchText);
                const processedQuestions = parsedQuizChunk.questions.map((q_raw: any) => ({
                     id: crypto.randomUUID(),
                     question: q_raw.question.trim(),
                     options: q_raw.options,
                     correctAnswer: q_raw.options[q_raw.correctAnswerIndex],
                     explanation: q_raw.explanation.trim(),
                     sourceFileId: sourceFile.id
                }));
                allParsedQuestions.push(...processedQuestions);
            }
        }
        
        const newQuestions = allParsedQuestions.filter(q => !existingQuestionTexts.has(q.question.trim().toLowerCase()));

        if (newQuestions.length > 0) {
            setAddQuestionsModalState({ targetQuiz: quiz, newQuestions });
        } else {
            setError("No se encontraron preguntas nuevas en el documento.");
        }

    } catch (err: any) {
        setError(`Error al re-analizar el documento: ${err.message}`);
    } finally {
        setAppState(AppState.EDITING_QUIZ);
    }
};

const handleConfirmAddQuestions = async (questionsToAdd: QuizQuestion[]) => {
    if (!addQuestionsModalState) return;
    const { targetQuiz } = addQuestionsModalState;

    const finalQuestionsToAdd = questionsToAdd.map(q => ({
        ...q,
        sourceQuizId: targetQuiz.id,
        sourceQuizTitle: targetQuiz.title,
    }));
    
    const updatedQuiz: SavedQuiz = {
        ...targetQuiz,
        questions: [...targetQuiz.questions, ...finalQuestionsToAdd]
    };
    
    handleUpdateSingleItem(updatedQuiz);
    setEditingQuiz(updatedQuiz);
    setAddQuestionsModalState(null);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
};

const handleQuestionFlagged = async (questionId: string, flag: QuestionFlag | null) => {
    // FIX: Use the pure function `getAppDataWithFlaggedQuestions` via `updateAppDataAndMarkDirty`.
    if (!appData) return;
    updateAppDataAndMarkDirty(d => libraryService.getAppDataWithFlaggedQuestions(d, new Set([questionId]), flag));

    setActiveQuestions(prevQuestions => {
        if (!prevQuestions) return null;
        return prevQuestions.map(q => {
            if (q.id === questionId) {
                const updatedQ = { ...q };
                if (flag) {
                    updatedQ.flag = flag;
                } else {
                    delete updatedQ.flag;
                }
                return updatedQ;
            }
            return q;
        });
    });
};

const isWeeklyAvailable = useMemo(() => {
    if (!activeLibrary?.lastWeeklyChallengeCompleted) return true;
    const [year, week] = activeLibrary.lastWeeklyChallengeCompleted.split('-').map(Number);
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentWeek = getISOWeek(today);
    return currentYear > year || (currentYear === year && currentWeek > week);
}, [activeLibrary]);

const isMonthlyAvailable = useMemo(() => {
    if (!activeLibrary?.lastMonthlyChallengeCompleted) return true;
    const [year, month] = activeLibrary.lastMonthlyChallengeCompleted.split('-').map(Number);
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // getMonth() is 0-indexed
    return currentYear > year || (currentYear === year && currentMonth > month);
}, [activeLibrary]);


  const renderContent = () => {
    if (appState === AppState.GENERATING || isMigrating) {
        return <Loader message={loaderMessage} />;
    }
    switch (appState) {
        case AppState.VIEWING_LIBRARY:
            return (
                <QuizLibrary
                    library={library}
                    pausedQuiz={pausedQuizState || null}
                    onResumeQuiz={handleResumeQuiz}
                    plannedSessions={todaysSessions}
                    onStartPlannedQuiz={handleStartPlannedSessionQuiz}
                    activeLibraryName={activeLibrary?.name || ''}
                    settings={settings}
                    stats={stats}
                    openFolders={openFolderIds}
                    onToggleFolder={handleToggleFolder}
                    onMoveItems={handleMoveItems}
                    onViewDetails={(quiz) => { setViewingQuizDetails(quiz); setNavState(AppState.VIEWING_QUIZ_DETAILS); }}
                    onStudyDeck={(deck) => { setCurrentDeck(deck); setNavState(AppState.PRACTICING_DECK); }}
                    onEdit={(quiz) => { setEditingQuiz(quiz); setNavState(AppState.EDITING_QUIZ); }}
                    onUpdateLibrary={handleUpdateLibrary}
                    onDeleteSelected={(ids) => {
                        // Fix: Use the new pure function `getAppDataWithDeletedItems` to update app state.
                        if (!appData) return;
                        updateAppDataAndMarkDirty(currentData => libraryService.getAppDataWithDeletedItems(currentData, ids));
                    }}
                    onStartCustomConfiguration={() => {
                        setPracticeConfigInitialStatus('none');
                        setNavState(AppState.CONFIGURING_UNIFIED_REVIEW);
                    }}
                    onStartCreation={() => setNavState(AppState.CREATING_CONTENT)}
                    onSelectImportFile={handleSelectImportFile}
                    // Fix: Pass the `reloadAppData` function to QuizLibrary.
                    reloadAppData={reloadAppData}
                    onViewDocuments={() => setNavState(AppState.VIEWING_DOCUMENTS)}
                    onStartChallenge={handleStartChallenge}
                    onOpenAdvancedSearch={() => setNavState(AppState.VIEWING_ADVANCED_SEARCH)}
                    isWeeklyAvailable={isWeeklyAvailable}
                    isMonthlyAvailable={isMonthlyAvailable}
                    onStartPracticeConfiguration={(type) => {
                        setPracticeConfigInitialStatus(type);
                        setNavState(AppState.CONFIGURING_UNIFIED_REVIEW);
                    }}
                    onAttachFile={() => { /* attach file */ }}
                    onViewFile={handleViewFile}
                    importInputRef={importInputRef}
                />
            );
        case AppState.VIEWING_QUIZ_DETAILS:
            if (!viewingQuizDetails) { handleResetToLibrary(); return null; }
            return (
                <QuizDetailsView
                    quiz={viewingQuizDetails}
                    activeLibrary={activeLibrary}
                    onBack={handleBack}
                    onStartQuiz={(quiz) => handleStartQuiz(quiz, settings.defaultQuizSettings, 'normal')}
                    onConfigureQuiz={(quiz) => {
                        setConfiguringQuiz(quiz);
                        setNavState(AppState.CONFIGURING_QUIZ_START);
                    }}
                    theme={settings.theme}
                    onReview={(questions, title) => {
                        setViewingQuestions(questions);
                        setViewingTitle(title);
                        setNavState(AppState.VIEWING_QUESTION_LIST);
                    }}
                />
            );
        case AppState.CONFIGURING_IMPORT:
            if (!configuringImportData || !activeLibrary || !appData) {
                handleResetToLibrary();
                return null;
            }
            return (
                <ImportConfigurator
                    importData={configuringImportData.data}
                    libraries={Object.values(appData.libraries)}
                    activeLibraryId={activeLibrary.id}
                    onImportIntoLibrary={handleImportIntoLibrary}
                    onImportAsNew={handleImportAsNew}
                    onCancel={handleResetToLibrary}
                />
            );
        case AppState.CONFIGURING_EXPORT:
             return <ExportConfigurator library={library} activeLibraryName={activeLibrary?.name || ''} onExport={handleExport} onCancel={handleBack} />;
        case AppState.CONFIGURING_PDF_EXPORT:
            return <PdfExportConfigurator library={library} activeLibraryName={activeLibrary?.name || ''} onExport={handlePdfExport} onCancel={handleBack} />;
        case AppState.CREATING_CONTENT:
            return <QuizInput
                        onBack={handleBack}
                        onGenerateQuiz={handleGenerateQuiz}
                        onGenerateDeck={handleGenerateDeck}
                        onGenerateFromWeb={handleGenerateFromWeb}
                        onGenerateDeckFromWeb={handleGenerateDeckFromWeb}
                        onBatchParse={handleBatchParse}
// FIX: Correct prop assignment to match expected function signature.
                        onSaveManualQuiz={(quizData) => handleSaveQuiz(quizData)}
                        onSaveManualDeck={handleSaveDeck}
                        isGenerating={false}
                        documentLibrary={documentLibrary}
                        allDocuments={allDocuments}
                        onGenerateFromStoredFile={handleGenerateFromStoredFile}
                    />;
        case AppState.TAKING_QUIZ:
            if (!activeQuestions) return <Loader message="Cargando test..." />;
            return <QuizView 
                        questions={activeQuestions} 
                        onFinish={handleFinishQuiz} 
                        quizSettings={quizSettings!}
                        onPause={handlePauseQuiz}
                        onViewSource={handleViewSource}
                        mnemonicsByQuestionId={mnemonicsByQuestionId}
                        onViewMnemonic={setViewingMnemonic}
                        srsEntries={srsEntries}
                        onQuestionAnswered={() => {}}
                        onQuestionFailed={() => {}}
                        onQuestionSkipped={() => {}}
                        onQuestionFlagged={handleQuestionFlagged}
                    />;
        case AppState.RESULTS:
            return <QuizResults
                        score={score}
                        totalQuestions={activeQuestions?.length || 0}
                        sessionFailedQuestions={sessionFailedQuestions}
                        sessionUnansweredQuestions={sessionUnansweredQuestions}
                        onReset={handleResetToLibrary}
                        onPracticeFailed={(qs) => handleStartQuiz({ title: "Repaso de Falladas", questions: qs }, settings.defaultQuizSettings, 'practice')}
                        onPracticeUnanswered={(qs) => handleStartQuiz({ title: "Repaso 'En Blanco'", questions: qs }, settings.defaultQuizSettings, 'practice')}
                        onPracticeCombined={(failed, unanswered) => handleStartQuiz({ title: "Repaso Combinado", questions: [...failed, ...unanswered] }, settings.defaultQuizSettings, 'practice')}
                        quiz={currentQuiz}
                        quizSettings={quizSettings}
                        userAnswers={userAnswers}
                        onViewSource={handleViewSource}
                        mnemonicsByQuestionId={mnemonicsByQuestionId}
                        onViewMnemonic={setViewingMnemonic}
                    />;
        case AppState.CONFIGURING_QUIZ_START:
            if (!configuringQuiz) { handleResetToLibrary(); return null; }
            return (<QuizStartConfigurator onStart={(settings) => handleStartQuiz(configuringQuiz, settings, 'normal')} onCancel={handleBack} defaultSettings={settings.defaultQuizSettings} />);

        case AppState.EDITING_QUIZ:
            if (!editingQuiz) { handleResetToLibrary(); return null; }
            return (<QuizEditor quiz={editingQuiz} onSave={(updatedQuiz) => { handleUpdateSingleItem(updatedQuiz); setEditingQuiz(null); handleResetToLibrary(); }} onCancel={() => { setEditingQuiz(null); handleResetToLibrary(); }} onViewSource={handleViewSource} mnemonicsByQuestionId={mnemonicsByQuestionId} onViewMnemonic={setViewingMnemonic} onAddMoreQuestions={handleAddMoreQuestions} />);

        case AppState.VIEWING_QUESTION_LIST:
            if (!viewingQuestions) { handleResetToLibrary(); return null; }
            return (<QuestionListViewer title={viewingTitle} questions={viewingQuestions} onBack={() => { setViewingQuestions(null); setViewingTitle(''); handleBack(); }} />);
        
        case AppState.PRACTICING_DECK:
              if (!currentDeck) { handleResetToLibrary(); return null; }
              const deck = currentDeck; // To satisfy type checker inside callbacks
              // Fix: Use the new pure function `updateAppDataWithFlashcardResult` to update app state.
              return (<FlashcardView deck={currentDeck} onBack={() => { setCurrentDeck(null); handleResetToLibrary(); }} onCorrect={(card) => { if ('id' in deck && appData) { updateAppDataAndMarkDirty(d => libraryService.updateAppDataWithFlashcardResult(d, card.id, true)) } }} onIncorrect={(card) => { if ('id' in deck && appData) { updateAppDataAndMarkDirty(d => libraryService.updateAppDataWithFlashcardResult(d, card.id, false)) } }} />);

        case AppState.CONFIGURING_UNIFIED_REVIEW:
            return (
                <UnifiedReviewConfigurator
                    library={library}
                    correctQuestions={correctlyAnsweredQuestions}
                    failedQuestions={allFailedQuestions}
                    unansweredQuestions={allUnansweredQuestions}
                    srsQuestions={dueSrsQuestions}
                    initialStatus={practiceConfigInitialStatus}
                    onCancel={handleBack}
                    onCreate={handleStartProgressPractice}
                    onViewQuestions={(questions, title) => {
                        setViewingQuestions(questions);
                        setViewingTitle(title);
                        setNavState(AppState.VIEWING_QUESTION_LIST);
                    }}
                />
            );
        
        case AppState.VIEWING_PROGRESS:
            return <ProgressView 
                        libraryData={activeLibrary} 
                        onBack={handleBack}
                        onViewQuizDetails={(quiz) => { setViewingQuizDetails(quiz); setNavState(AppState.VIEWING_QUIZ_DETAILS); }}
                    />;

        case AppState.VIEWING_DOCUMENTS:
              // Fix: Use the new pure functions `getAppDataWith...` for document management.
              if (!appData) return null;
              return (<DocumentLibrary documentLibrary={documentLibrary} onUpdateLibrary={handleUpdateDocumentLibrary} onDeleteSelected={(ids) => updateAppDataAndMarkDirty(d => libraryService.getAppDataWithDeletedDocItems(d, ids))} onRenameItem={async (id, name) => { updateAppDataAndMarkDirty(d => libraryService.getAppDataWithRenamedDocItem(d, id, name)) }} onMoveItems={async (ids, folderId) => { updateAppDataAndMarkDirty(d => libraryService.getAppDataWithMovedDocItems(d, ids, folderId)) }} onBack={handleBack} onViewFile={handleViewFile} />);

        case AppState.VIEWING_PLANNER:
            // Fix: Use the new pure function `getAppDataWithUpdatedPlan` to update app state.
            if (!appData) return null;
            return (<PlannerView config={studyPlanConfig} sessions={studyPlanSessions} documentLibrary={documentLibrary} onGeneratePlan={(config) => { const newSessions = plannerService.generateStudyPlan(config, storedFiles); updateAppDataAndMarkDirty(d => libraryService.getAppDataWithUpdatedPlan(d, config, newSessions)); }} onUpdateSessions={(sessions) => { if(appData?.libraries[appData.activeLibraryId!]?.studyPlanConfig) { updateAppDataAndMarkDirty(d => libraryService.getAppDataWithUpdatedPlan(d, d.libraries[d.activeLibraryId!].studyPlanConfig!, sessions)); } }} onStartPlannedQuiz={handleStartPlannedSessionQuiz} onBack={handleBack} onUploadFile={async (file) => { const { count, isApproximation } = await getFilePageCount(file); const newFile: StoredFileItem = { id: crypto.randomUUID(), name: file.name, type: 'file', mimeType: file.type, size: file.size, createdAt: new Date().toISOString(), pageCount: count, isPageCountApprox: isApproximation }; await libraryService.saveFileContent(newFile.id, await fileToBase64(file)); handleUpdateDocumentLibrary([newFile, ...documentLibrary]); return newFile.id; }} />);

        case AppState.CONFIGURING_PLANNED_QUIZ:
            if (!configuringPlannedSession) { handleResetToLibrary(); return null; }
            return (
                <PlannedQuizConfigurator
                    session={configuringPlannedSession}
                    defaultQuestionCount={configuringPlannedSession.questionsPerSession}
                    onStart={(count) => handleConfirmAndGeneratePlannedQuiz(configuringPlannedSession, count)}
                    onCancel={handleBack}
                />
            );

        case AppState.VIEWING_MNEMONIC_HELPER:
            // Fix: Use the new pure functions `getAppDataWith...` for mnemonic management.
            if (!appData) return null;
            return (<MnemonicHelper onBack={handleBack} onSaveRule={(rule) => { updateAppDataAndMarkDirty(d => libraryService.getAppDataWithSavedMnemonic(d, rule)) }} onDeleteRule={(ruleId) => { updateAppDataAndMarkDirty(d => libraryService.getAppDataWithDeletedMnemonic(d, ruleId)) }} allRules={mnemonics} allQuestions={allQuestions} associatingForQuestion={mnemonicSuggestionForQuestion} srsEntries={srsEntries} />);

        case AppState.VIEWING_ADVANCED_SEARCH:
            return (<AdvancedSearchView
                        library={library}
                        activeLibrary={activeLibrary}
                        onBack={handleBack}
// FIX: Corrected variable name from 'onViewSource' to 'handleViewSource'.
                        onViewSource={handleViewSource}
                        // Fix: Pass the `reloadAppData` function to AdvancedSearchView.
                        reloadAppData={reloadAppData}
                        onEditQuestion={(q, onSave) => setQuestionEditorState({ question: q, onSave })}
                        onMoveQuestions={(qIds, onMove) => setMoveQuestionsState({ questionIds: qIds, onMove })}
                        // Fix: Use the new pure functions `getAppDataWith...` for question management.
                        onDeleteQuestions={async (qIds) => { if (!appData) return; updateAppDataAndMarkDirty(d => libraryService.getAppDataWithDeletedQuestions(d, qIds)) }}
                        onFlagQuestions={async (qIds, flag) => { if (!appData) return; updateAppDataAndMarkDirty(d => libraryService.getAppDataWithFlaggedQuestions(d, qIds, flag)) }}
                    />);
        
        default:
            return (
                <div className="text-center p-8">
                    <h2 className="text-xl font-bold text-red-500">Vista no implementada: {appState}</h2>
                    <button onClick={handleResetToLibrary} className="mt-4 px-4 py-2 bg-slate-200 rounded">Volver a la Biblioteca</button>
                </div>
            );
    }
  };

  if (!appData || !activeLibrary) {
      return <Loader message={isMigrating ? loaderMessage : "Cargando biblioteca..."} />;
  }

  return (
    <div className="min-h-screen flex flex-col text-slate-800 dark:text-slate-200">
      <header className="flex-shrink-0 bg-gradient-to-r from-purple-100 via-cyan-100 to-lime-100 dark:from-purple-900/80 dark:via-cyan-900/80 dark:to-lime-900/80 backdrop-blur-lg sticky top-0 z-20 border-b border-slate-200 dark:border-slate-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
                <div className="flex items-center gap-4">
                    <button onClick={handleResetToLibrary} title="Volver a la Biblioteca">
                        <AppLogoIcon className="h-10 w-10" />
                    </button>
                    {activeLibrary && <LibrarySwitcher
                        activeLibrary={activeLibrary}
                        allLibraries={allLibraries}
                        // Fix: Use the new pure functions `getAppDataWith...` for library management.
                        onSwitch={(id) => { if (!appData) return; setAppData(libraryService.getAppDataWithSwitchedLibrary(appData, id)); setSyncStatus('unsaved'); }}
                        // FIX: Rename 'getAppDataWithNewLabel' to 'getAppDataWithNewLibrary'
                        onCreate={(name) => { if (!appData) return; setAppData(libraryService.getAppDataWithNewLibrary(appData, name)); setSyncStatus('unsaved'); }}
                        onRename={(name) => { updateAppDataAndMarkDirty(d => libraryService.getAppDataWithRenamedLibrary(d, name)); }}
                        onDelete={() => { if(window.confirm(`¿Seguro que quieres borrar "${activeLibrary.name}"?`)) { if (!appData) return; setAppData(libraryService.getAppDataWithDeletedLibrary(appData)); setSyncStatus('unsaved'); }}}
                        onImport={() => importInputRef.current?.click()}
                        onExportJson={() => setNavState(AppState.CONFIGURING_EXPORT)}
                        onExportPdf={() => setNavState(AppState.CONFIGURING_PDF_EXPORT)}
                    />}
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                    {settings.showMnemonicHelper && (
                        <button onClick={() => setNavState(AppState.VIEWING_MNEMONIC_HELPER)} className="group p-2.5 rounded-full text-slate-700 dark:text-slate-200 transition-all duration-200 hover:shadow-md hover:bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50" title="Ayudante de Memoria">
                            <BrainIcon className="h-6 w-6 text-amber-500" />
                        </button>
                    )}
                    {settings.showPlanner && (
                        <button onClick={() => setNavState(AppState.VIEWING_PLANNER)} className="group p-2.5 rounded-full text-slate-700 dark:text-slate-200 transition-all duration-200 hover:shadow-md hover:bg-gradient-to-br from-purple-100 to-sky-100 dark:from-purple-900/50 dark:to-sky-900/50" title="Planificador">
                            <CalendarDaysIcon className="h-6 w-6 text-purple-500" />
                        </button>
                    )}
                    {settings.showProgressView && (
                        <button onClick={() => setNavState(AppState.VIEWING_PROGRESS)} className="group p-2.5 rounded-full text-slate-700 dark:text-slate-200 transition-all duration-200 hover:shadow-md hover:bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/50 dark:to-blue-900/50" title="Estadísticas">
                            <ChartBarIcon className="h-6 w-6 text-indigo-500" />
                        </button>
                    )}

                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>

                    <SyncStatusIndicator status={syncStatus} onSave={handleManualSave} />
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Ajustes">
                        <Cog6ToothIcon className="h-6 w-6" />
                    </button>
                </div>
            </div>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 flex">
        <div className="w-full">
            {renderContent()}
        </div>
      </main>

      {isSettingsOpen && <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            settings={settings} 
            onSave={handleSaveSettings}
            activeLibrary={activeLibrary}
            allLibraries={allLibraries}
            // Fix: Use the new pure functions `getAppDataWith...` for library management.
            onSwitch={(id) => { if (!appData) return; setAppData(libraryService.getAppDataWithSwitchedLibrary(appData, id)); setSyncStatus('unsaved'); }}
            // FIX: Rename 'getAppDataWithNewLabel' to 'getAppDataWithNewLibrary'
            onCreate={(name) => { if (!appData) return; setAppData(libraryService.getAppDataWithNewLibrary(appData, name)); setSyncStatus('unsaved'); }}
            onRename={(name) => { updateAppDataAndMarkDirty(d => libraryService.getAppDataWithRenamedLibrary(d, name)); }}
            onDelete={() => { if(window.confirm(`¿Seguro que quieres borrar "${activeLibrary.name}"?`)) { if (!appData) return; setAppData(libraryService.getAppDataWithDeletedLibrary(appData)); setSyncStatus('unsaved'); }}}
            onOpenHelp={() => { setIsSettingsOpen(false); setIsHelpModalOpen(true); }}
            onResetProgress={handleResetProgress}
            onImport={() => { setIsSettingsOpen(false); importInputRef.current?.click(); }}
            onExportJson={() => { setIsSettingsOpen(false); setNavState(AppState.CONFIGURING_EXPORT); }}
            onExportPdf={() => { setIsSettingsOpen(false); setNavState(AppState.CONFIGURING_PDF_EXPORT); }}
      />}
      {isHelpModalOpen && <HelpModal onClose={() => setIsHelpModalOpen(false)} />}
      {duplicateResolutionData && <DuplicateQuestionModal 
            quizData={duplicateResolutionData.quizData}
            duplicates={duplicateResolutionData.duplicates}
            onResolve={(qs) => duplicateResolutionData.onResolve(qs, duplicateResolutionData.fileId)}
            onCancel={duplicateResolutionData.onCancel}
      />}
      {pdfViewerState && <PdfViewerModal file={pdfViewerState.file} initialPage={pdfViewerState.page} highlightText={pdfViewerState.highlightText} onClose={() => setPdfViewerState(null)} />}
      {mnemonicSuggestionForQuestion && <MnemonicSuggestionModal question={mnemonicSuggestionForQuestion} onConfirm={(q) => { setMnemonicSuggestionForQuestion(null); setNavState(AppState.VIEWING_MNEMONIC_HELPER); }} onDismiss={() => setMnemonicSuggestionForQuestion(null)} />}
      {viewingMnemonic && <ViewMnemonicModal rule={viewingMnemonic} onClose={() => setViewingMnemonic(null)} />}
      {addQuestionsModalState && <AddQuestionsModal 
          newQuestions={addQuestionsModalState.newQuestions}
          onConfirm={handleConfirmAddQuestions}
          onClose={() => setAddQuestionsModalState(null)}
      />}
      {questionEditorState && <QuestionEditorModal 
          questionToEdit={questionEditorState.question}
          onSave={(q) => { questionEditorState.onSave(q); setQuestionEditorState(null); }}
          onClose={() => setQuestionEditorState(null)}
      />}
      {moveQuestionsState && <MoveQuestionsModal
          library={library}
          onMove={(targetQuizId) => { moveQuestionsState.onMove(targetQuizId); setMoveQuestionsState(null); }}
          onClose={() => setMoveQuestionsState(null)}
      />}
      
      <Sidebar isOpen={isCoachOpen} onClose={() => setIsCoachOpen(false)} title="Omni-Coach">
        <StudyCoach appData={appData} settings={settings} onExecuteAction={() => Promise.resolve()} />
      </Sidebar>
      
      {settings.showStudyCoach && (
        <button
          onClick={() => setIsCoachOpen(true)}
          className="fixed bottom-6 right-6 z-30 flex items-center justify-center h-16 w-16 rounded-full bg-indigo-600 text-white shadow-lg hover:scale-105 transition-transform duration-200 ease-in-out"
          title="Omni-Coach"
        >
            <AcademicCapIcon className="h-8 w-8" />
        </button>
      )}

      {error && (
          <div className="animate-fade-in-out fixed bottom-5 right-5 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              <span className="font-medium">{error}</span>
              <button onClick={() => setError(null)} className="ml-4 text-red-800">
                  <XMarkIcon className="h-5 w-5" />
              </button>
          </div>
      )}
       {showSaveSuccess && (
          <div className="animate-fade-in-out fixed bottom-5 right-5 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3">
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
              <span className="font-medium">Guardado con éxito.</span>
          </div>
      )}
    </div>
  );
};

export default App;