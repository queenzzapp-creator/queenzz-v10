export type QuestionFlag = 'buena' | 'mala' | 'interesante' | 'revisar' | 'suspendida';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation:string;
  imageUrl?: string;
  sourceQuizId?: string;
  sourceQuizTitle?: string;
  sourceFileId?: string; // ID of the StoredFile
  sourcePage?: number; // Page number in the source file
  sourcePageImage?: string; // The original full-page image for re-cropping
  flag?: QuestionFlag;
  libraryId?: string; // New: For DB indexing
  quizId?: string; // New: For DB indexing
  searchText?: string; // New: For full-text search indexing
  signature?: string;
}

export type Quiz = QuizQuestion[];

export interface GeneratedQuiz {
    title: string;
    questions: Quiz;
}

export interface ScoreRecord {
  score: number;
  total: number;
  date: string;
  type: 'full' | 'practice';
  questionsAttempted?: number;
  totalQuestionsInQuiz?: number;
  correctCount?: number;
  failedCount?: number;
  unansweredCount?: number;
}

export interface SavedQuiz extends GeneratedQuiz {
    type: 'quiz';
    id: string;
    createdAt: string;
    completionCount?: number;
    scoreHistory?: ScoreRecord[];
    libraryId?: string; // New: For DB indexing
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  sourceDeckId?: string;
  sourceDeckTitle?: string;
}

// For AI generation, before it gets a real ID
export interface GeneratedFlashcard {
  question: string;
  answer: string;
}

export interface GeneratedFlashcardDeck {
    title: string;
    cards: GeneratedFlashcard[];
}


export interface FlashcardDeck {
  type: 'deck';
  id: string;
  title:string;
  createdAt: string;
  cards: Flashcard[];
  difficulty?: QuizDifficulty;
}

export interface Folder {
    type: 'folder';
    id: string;
    name: string;
    children: LibraryItem[];
    isOpen: boolean;
}

export type LibraryItem = SavedQuiz | Folder | FlashcardDeck;

// --- NEW SRS TYPE ---
export interface FailedQuestionEntry {
  question: QuizQuestion;
  srsLevel: number; // Indicates the learning stage
  nextReviewDate: string; // ISO string date
  failureCount: number; // Tracks how many times this question has been failed
}

// --- Mnemonic Rule ---
export interface MnemonicRule {
    id: string;
    questionId: string;
    title: string;
    type: 'story' | 'number';
    // For story type
    story?: string;
    imageUrl?: string; // base64
    keywords?: string;
    // For number type
    numberStr?: string;
    letters?: string;
    words?: string;
}

// --- State for a paused quiz ---
export type ActiveQuizType = 'normal' | 'srs_review' | 'practice' | 'custom' | 'weekly_challenge' | 'monthly_challenge';

export interface PausedQuizState {
    quizId: string | null; // null for practice quizzes
    quizTitle: string;
    questions: QuizQuestion[];
    userAnswers: [number, { selected: string, isCorrect: boolean }][]; // Serializable form of Map
    currentQuestionIndex: number;
    quizSettings: QuizSettings;
    timeLeft?: number;
    activeQuizType: ActiveQuizType;
    sourceSessionId?: string; // For planner integration
}

// Represents a file stored within the app
export interface StoredFile {
  id: string;
  name: string;
  mimeType: string; // MIME type
  size: number; // in bytes
  base64Content?: string; // Loaded on-demand for viewer or export
  createdAt: string;
  pageCount?: number;
  isPageCountApprox?: boolean;
}

// Represents a URL stored as a reference
export interface StoredURL {
    id: string;
    url: string;
    title: string;
    createdAt: string;
}

// --- NEW DOCUMENT LIBRARY TYPES ---
// The Omit is removed so that `base64Content` can be temporarily added for export.
// It must be stripped before saving to the main app state.
export interface StoredFileItem extends StoredFile {
    type: 'file';
}

export interface StoredURLItem extends StoredURL {
    type: 'url';
}

export interface DocumentFolder {
    type: 'folder';
    id: string;
    name: string;
    children: DocumentItem[];
    isOpen: boolean;
}

export type DocumentItem = StoredFileItem | StoredURLItem | DocumentFolder;


// --- NEW PLANNER TYPES ---
export interface StudyBlock {
  id: string;
  name: string;
  fileIds: string[];
  studyDays: number[]; // Array of days of the week (0=Sun, 1=Mon...)
  color: string;
  pacingMode: 'pages' | 'examDate';
  pagesPerSession: number;
  examDate?: string; // YYYY-MM-DD
  laps: number;
  questionsPerSession: number;
}

export interface StudyPlanConfig {
  blocks: StudyBlock[];
}

export interface StudyPlanSession {
  id: string;
  date: string; // YYYY-MM-DD
  blockId: string;
  blockName: string;
  fileId: string;
  fileName: string;
  startPage: number;
  endPage: number;
  lap: number; // Which lap this session belongs to
  completed: boolean;
  blockColor: string;
  questionsPerSession: number;
}


// Represents all data associated with a single, self-contained library.
export interface LibraryData {
  id: string;
  name: string;
  createdAt: string;
  library: LibraryItem[];
  openFolderIds?: string[];
  documentLibrary?: DocumentItem[]; // NEW HIERARCHICAL STRUCTURE
  failedQuestions: FailedQuestionEntry[];
  answeredQuestionIds: string[];
  failedFlashcards?: Flashcard[];
  pausedQuizState?: PausedQuizState | null; // For resuming quizzes
  allTimeFailedQuestionIds?: string[]; // Permanent record of all failed questions
  allTimeUnansweredQuestionIds?: string[]; // Permanent record of all unanswered questions
  studyPlanConfig?: StudyPlanConfig; // New: Configuration for the planner
  studyPlanSessions?: StudyPlanSession[]; // New: Generated plan sessions
  mnemonics?: MnemonicRule[]; // For the mnemonic helper
  lastWeeklyChallengeCompleted?: string; // e.g., "2024-23"
  lastMonthlyChallengeCompleted?: string; // e.g., "2024-05"
  
  // DEPRECATED: To be migrated to documentLibrary
  storedFiles?: StoredFile[];
  storedURLs?: StoredURL[];
}

// Represents the entire application's data stored in localStorage.
export interface AppData {
  activeLibraryId: string | null;
  libraries: { [id: string]: LibraryData };
}

// Challenge Settings
export interface ChallengeSettings {
  weeklyQuestionCount: number;
  monthlyQuestionCount: number;
}

// Represents user-configurable settings.
export interface Settings {
  theme: 'light' | 'dark';
  vision: 'default' | 'minimalist';
  saveMode: 'auto' | 'manual';
  showStats: boolean;
  cloudSyncEnabled: boolean;
  defaultQuizSettings: QuizSettings;
  defaultNumberOfOptions: 2 | 3 | 4 | 5 | 'variable';
  alwaysConfigureQuiz: boolean;
  saveCustomTests: boolean;
  showProgressView: boolean;
  showPlanner: boolean;
  showDocumentManager: boolean;
  showMnemonicHelper: boolean;
  showStudyCoach: boolean;
  srsGraduationRequirement: number;
  srsIntervals: number[];
  challengeSettings: ChallengeSettings;
  coachKnowledgeBaseUrls?: string[];
}

// Represents the settings for a quiz session
export interface QuizSettings {
    mode: 'none' | 'perQuestion' | 'total';
    duration: number; // in seconds
    showAnswers: 'immediately' | 'atEnd';
    penaltySystem: 'classic' | 'standard';
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
}

// Represents the settings for a custom quiz session
export interface CustomQuizSettings {
  itemEntries: { itemId: string; questionCount: number }[];
  smartReview: {
    failed: {
      enabled: boolean;
      count: number;
      selectedTopics: string[];
    };
    unanswered: {
      enabled: boolean;
      count: number;
      selectedTopics: string[];
    };
  };
}


// Represents the map of user answers for a quiz session
export type UserAnswersMap = Map<number, { selected: string, isCorrect: boolean }>;

// Represents the status of cloud synchronization
export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline' | 'unsaved';

// Represents the difficulty of an AI-generated quiz
export type QuizDifficulty = 'Fácil' | 'Medio' | 'Difícil';


export enum AppState {
  GENERATING = 'GENERATING',
  CONFIGURING_QUIZ_START = 'CONFIGURING_QUIZ_START',
  TAKING_QUIZ = 'TAKING_QUIZ',
  RESULTS = 'RESULTS',
  VIEWING_LIBRARY = 'VIEWING_LIBRARY',
  EDITING_QUIZ = 'EDITING_QUIZ',
  VIEWING_QUIZ_DETAILS = 'VIEWING_QUIZ_DETAILS',
  VIEWING_QUESTION_LIST = 'VIEWING_QUESTION_LIST',
  PRACTICING_DECK = 'PRACTICING_DECK',
  CONFIGURING_FLASHCARD_REVIEW = 'CONFIGURING_FLASHCARD_REVIEW',
  CONFIGURING_UNIFIED_REVIEW = 'CONFIGURING_UNIFIED_REVIEW',
  CONFIGURING_IMPORT = 'CONFIGURING_IMPORT',
  CONFIGURING_EXPORT = 'CONFIGURING_EXPORT',
  CONFIGURING_PDF_EXPORT = 'CONFIGURING_PDF_EXPORT',
  VIEWING_PROGRESS = 'VIEWING_PROGRESS',
  VIEWING_DOCUMENTS = 'VIEWING_DOCUMENTS',
  HANDLING_DUPLICATES = 'HANDLING_DUPLICATES',
  VIEWING_PLANNER = 'VIEWING_PLANNER',
  CONFIGURING_PLANNED_QUIZ = 'CONFIGURING_PLANNED_QUIZ',
  VIEWING_MNEMONIC_HELPER = 'VIEWING_MNEMONIC_HELPER',
  CREATING_CONTENT = 'CREATING_CONTENT',
  VIEWING_ADVANCED_SEARCH = 'VIEWING_ADVANCED_SEARCH',
}

export interface Stats {
  correct: number;
  srsDue: number;
  totalFailed: number;
  unanswered: number;
  failedFlashcards: number;
  reviewItems: number;
}