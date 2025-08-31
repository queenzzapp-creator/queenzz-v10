import { LibraryItem, QuizQuestion, AppData, LibraryData, SavedQuiz, Flashcard, FailedQuestionEntry, PausedQuizState, StoredFile, StoredURL, StudyPlanSession, MnemonicRule, StudyPlanConfig, UserAnswersMap, QuizSettings, ScoreRecord, ActiveQuizType, GeneratedQuiz, DocumentItem } from "../types";
import * as settingsService from './settingsService.ts';

// IndexedDB is handled in the main libraryService file now.
// For the sake of this file, we assume these functions exist and work.
declare function saveFileContent(id: string, content: string): Promise<void>;
declare function getFileContent(id: string): Promise<string | undefined>;
declare function deleteFileFromDB(id: string): Promise<void>;

// Let TypeScript know that an 'ai' object might exist on the window/global scope.
declare const ai: any;

const isStudioEnvironment = (): boolean => {
    try {
        return typeof ai?.studio?.getFrameData === 'function' && typeof ai?.studio?.setFrameData === 'function';
    } catch {
        return false;
    }
};

export const migrateData = (appData: any): AppData => {
    let needsSave = false;
    for (const libId in appData.libraries) {
        const lib = appData.libraries[libId];

        if (!Array.isArray(lib.library)) { lib.library = []; needsSave = true; }
        if (!Array.isArray(lib.failedQuestions)) { lib.failedQuestions = []; needsSave = true; }
        if (!Array.isArray(lib.answeredQuestionIds)) { lib.answeredQuestionIds = []; needsSave = true; }
        if (!Array.isArray(lib.failedFlashcards)) { lib.failedFlashcards = []; needsSave = true; }
        if (typeof lib.pausedQuizState === 'undefined') { lib.pausedQuizState = null; needsSave = true; }
        if (!Array.isArray(lib.allTimeFailedQuestionIds)) { lib.allTimeFailedQuestionIds = []; needsSave = true; }
        if (!Array.isArray(lib.allTimeUnansweredQuestionIds)) { lib.allTimeUnansweredQuestionIds = []; needsSave = true; }
        if (typeof lib.studyPlanConfig === 'undefined') { lib.studyPlanConfig = undefined; needsSave = true; }
        if (!Array.isArray(lib.studyPlanSessions)) { lib.studyPlanSessions = []; needsSave = true; }
        if (!Array.isArray(lib.mnemonics)) { lib.mnemonics = []; needsSave = true; }

        if (lib.studyPlan) { delete lib.studyPlan; needsSave = true; }

        // Document Library Migration
        if (!lib.documentLibrary && (lib.storedFiles || lib.storedURLs)) {
            console.log(`Migrating stored files/URLs to documentLibrary for library "${lib.name}".`);
            const newDocumentLibrary: DocumentItem[] = [];
            (lib.storedFiles || []).forEach((file: StoredFile) => {
                const { base64Content, ...fileData } = file;
                newDocumentLibrary.push({ ...fileData, type: 'file' });
            });
            (lib.storedURLs || []).forEach((url: StoredURL) => {
                newDocumentLibrary.push({ ...url, type: 'url' });
            });
            lib.documentLibrary = newDocumentLibrary;
            delete lib.storedFiles;
            delete lib.storedURLs;
            needsSave = true;
        }
        if (!lib.documentLibrary) {
            lib.documentLibrary = [];
            needsSave = true;
        }
        
        if (lib.allTimeFailedQuestionIds.length === 0 && lib.failedQuestions.length > 0) {
             lib.allTimeFailedQuestionIds = [...new Set(lib.failedQuestions.map((e: FailedQuestionEntry) => e.question.id))];
             needsSave = true;
        }
        
        if (lib.failedQuestions.length > 0) {
            let srsMigrationNeeded = false;
            lib.failedQuestions.forEach((entry: any) => {
                if (entry && typeof entry === 'object' && entry.question) {
                     if (!entry.hasOwnProperty('srsLevel')) { entry.srsLevel = 0; srsMigrationNeeded = true; }
                    if (!entry.hasOwnProperty('failureCount')) { entry.failureCount = 1; srsMigrationNeeded = true; }
                     if (!entry.hasOwnProperty('nextReviewDate')) {
                        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
                        entry.nextReviewDate = tomorrow.toISOString().split('T')[0];
                        srsMigrationNeeded = true;
                    }
                } else { // Old format was just QuizQuestion[]
                    srsMigrationNeeded = true;
                }
            });
            if (srsMigrationNeeded) {
                const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
                lib.failedQuestions = lib.failedQuestions.map((entry: any) => {
                    const question = entry.question || entry;
                    return {
                        question,
                        srsLevel: entry.srsLevel ?? 0,
                        nextReviewDate: entry.nextReviewDate ?? tomorrow.toISOString().split('T')[0],
                        failureCount: entry.failureCount ?? 1,
                    }
                });
                needsSave = true;
            }
        }
    }
    if (needsSave) {
        console.log("Data migration performed.");
    }
    return appData as AppData;
}


// --- Generic helper functions ---
const getActiveLibraryData = async (): Promise<LibraryData | null> => {
    const appData = await loadAppData();
    return appData.activeLibraryId ? appData.libraries[appData.activeLibraryId] : null;
};

// --- Document Library Management ---

export const updateDocumentLibrary = async (docLibrary: DocumentItem[]): Promise<void> => {
    await updateActiveLibraryData(active => ({ ...active, documentLibrary: docLibrary }));
};

export const deleteMultipleDocumentItems = async (itemIds: Set<string>): Promise<void> => {
    const filesToDelete = new Set<string>();

    const recurseDelete = (items: DocumentItem[]): DocumentItem[] => {
        return items.filter(item => {
            if (itemIds.has(item.id)) {
                if (item.type === 'file') {
                    filesToDelete.add(item.id);
                } else if (item.type === 'folder') {
                    const collectFileIds = (folderItems: DocumentItem[]) => {
                        folderItems.forEach(child => {
                            if (child.type === 'file') filesToDelete.add(child.id);
                            if (child.type === 'folder') collectFileIds(child.children);
                        });
                    };
                    collectFileIds(item.children);
                }
                return false;
            }
            if (item.type === 'folder') {
                item.children = recurseDelete(item.children);
            }
            return true;
        });
    };

    await updateActiveLibraryData(active => ({ ...active, documentLibrary: recurseDelete(active.documentLibrary || []) }));
    for (const fileId of filesToDelete) {
        await deleteFileFromDB(fileId);
    }
};

export const renameDocumentItem = async (itemId: string, newName: string): Promise<void> => {
    await updateActiveLibraryData(active => {
        const updateInTree = (items: DocumentItem[]): DocumentItem[] => {
            return items.map(item => {
                if (item.id === itemId) {
                    const updatedItem = { ...item };
                    if (updatedItem.type === 'file' || updatedItem.type === 'folder') {
                        updatedItem.name = newName;
                    } else if (updatedItem.type === 'url') {
                        updatedItem.title = newName;
                    }
                    return updatedItem;
                }
                if (item.type === 'folder') {
                    return { ...item, children: updateInTree(item.children) };
                }
                return item;
            });
        };
        return { ...active, documentLibrary: updateInTree(active.documentLibrary || []) };
    });
};

export const moveMultipleDocumentItems = async (itemIds: Set<string>, targetFolderId: string | null): Promise<void> => {
    await updateActiveLibraryData(active => {
        const newDocLibraryData = { ...active };
        const itemsToMove: DocumentItem[] = [];

        const extractItems = (items: DocumentItem[]): DocumentItem[] => {
            return items.filter(item => {
                if (itemIds.has(item.id)) {
                    itemsToMove.push(item);
                    return false;
                }
                if (item.type === 'folder') {
                    item.children = extractItems(item.children);
                }
                return true;
            });
        };

        newDocLibraryData.documentLibrary = extractItems(newDocLibraryData.documentLibrary || []);
        
        if (targetFolderId === null) {
            newDocLibraryData.documentLibrary.unshift(...itemsToMove);
        } else {
            const findAndInsert = (items: DocumentItem[]): DocumentItem[] => {
                return items.map(item => {
                    if (item.id === targetFolderId && item.type === 'folder') {
                        return { ...item, children: [...itemsToMove, ...item.children] };
                    }
                    if (item.type === 'folder') {
                        return { ...item, children: findAndInsert(item.children) };
                    }
                    return item;
                });
            };
            newDocLibraryData.documentLibrary = findAndInsert(newDocLibraryData.documentLibrary);
        }
        return newDocLibraryData;
    });
};


// --- Original functions (partially omitted for brevity, but they'd be here) ---
export const migrateFilesToIndexedDB = async (): Promise<void> => { /* ... */ };
export const getInitialAppData = (): AppData => { /* ... */ return { activeLibraryId: null, libraries: {} }; };
export const loadAppData = async (): Promise<AppData> => { /* ... */ return getInitialAppData(); };
export const saveAppData = async (appData: AppData): Promise<void> => { /* ... */ };
const updateActiveLibraryData = async (updater: (activeLibrary: LibraryData) => LibraryData) => { /* ... */ };
export const updateLibrary = async (library: LibraryItem[]): Promise<void> => { /* ... */ };
export const savePausedQuizState = async (state: PausedQuizState | null): Promise<void> => { /* ... */ };
export const removeFailedFlashcard = async (cardId: string): Promise<void> => { /* ... */ };
export const addFailedFlashcard = async (card: Flashcard): Promise<void> => { /* ... */ };
export const updateStudyPlanConfigAndSessions = (config: StudyPlanConfig, sessions: StudyPlanSession[]): Promise<void> => updateActiveLibraryData(active => ({ ...active, studyPlanConfig: config, studyPlanSessions: sessions }));
export const updateStudyPlanSessions = (sessions: StudyPlanSession[]): Promise<void> => updateActiveLibraryData(active => ({ ...active, studyPlanSessions: sessions }));
export const saveMnemonicRule = (rule: MnemonicRule): Promise<void> => updateActiveLibraryData(active => { /* ... */ return active; });
export const deleteMnemonicRule = (ruleId: string): Promise<void> => updateActiveLibraryData(active => ({ /* ... */ } as LibraryData));
export const switchActiveLibrary = async (libraryId: string): Promise<void> => { /* ... */ };
export const createNewLibrary = async (name: string): Promise<string> => { /* ... */ return ''; };
export const renameActiveLibrary = (newName: string): Promise<void> => { /* ... */ return Promise.resolve(); };
export const renameItem = async (itemId: string, newName: string): Promise<void> => { /* ... */ };
export const deleteActiveLibrary = async (): Promise<string | null> => { /* ... */ return null; };
export const deleteMultipleItems = async (itemIds: Set<string>): Promise<void> => { /* ... */ };
export const moveMultipleItems = async (itemIds: Set<string>, targetFolderId: string | null): Promise<void> => { /* ... */ };
export const prepareExportData = async (selectedIds: string[], includeProgress: boolean, appData: AppData): Promise<LibraryData> => { /* ... */ return {} as LibraryData; };
export const importAsNewLibrary = async (dataToImport: LibraryData, includeProgress: boolean): Promise<string> => { /* ... */ return ''; };
export const importItemsIntoLibrary = async (targetLibraryId: string, importData: LibraryData, includeProgress: boolean, appData: AppData): Promise<void> => { /* ... */ };
export const filterLibraryData = (fullData: LibraryData, selectedItemIds: Set<string>, includeProgress: boolean): LibraryData => { /* ... */ return {} as LibraryData; };
export const processQuizCompletion = async (questions: QuizQuestion[], userAnswers: UserAnswersMap, quizSettings: QuizSettings, quizId: string | null, activeQuizType: ActiveQuizType): Promise<{ score: number, questionToSuggestMnemonic: QuizQuestion | null }> => { /* ... */ return { score: 0, questionToSuggestMnemonic: null }; };
export const attachFileToQuizzes = async (itemIds: Set<string>, fileId: string): Promise<void> => { /* ... */ };
export const splitLargeQuiz = (quiz: GeneratedQuiz): GeneratedQuiz[] => { /* ... */ return []; };
// The original add/delete for storedFile/URL are now obsolete and removed in favor of document library functions.
export const addStoredFile = async (file: StoredFile): Promise<void> => { /* ... */ };
export const deleteStoredFile = async (fileId: string): Promise<void> => { /* ... */ };
export const addStoredURL = async ({ url, title }: { url: string, title: string }): Promise<void> => { /* ... */ };
export const deleteStoredURL = async (urlId: string): Promise<void> => { /* ... */ };
