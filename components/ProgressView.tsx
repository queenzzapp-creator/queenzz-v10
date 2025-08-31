import React, { useState, useMemo } from 'react';
import { LibraryData, SavedQuiz, LibraryItem, ScoreRecord, QuizQuestion, Folder } from '../types.ts';
import { ArrowPathIcon, ChartBarIcon, BookOpenIcon, TrophyIcon, FolderIcon, ChevronRightIcon, ChevronDownIcon, ExclamationTriangleIcon, GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon } from './Icons.tsx';
import * as settingsService from '../services/settingsService.ts';
import BarChart, { StackedBarChart } from './charts/BarChart.tsx';
import CircularProgressBar from './charts/CircularProgressBar.tsx';
import CelebrationModal from './CelebrationModal.tsx';

interface ProgressViewProps {
  libraryData: LibraryData;
  onBack: () => void;
  onViewQuizDetails: (quiz: SavedQuiz) => void;
}

// Helper to get all quizzes, regardless of nesting
const getAllQuizzesInScope = (items: LibraryItem[]): SavedQuiz[] => {
    let quizzes: SavedQuiz[] = [];
    for (const item of items) {
        if (item.type === 'quiz') {
            quizzes.push(item);
        } else if (item.type === 'folder') {
            quizzes.push(...getAllQuizzesInScope(item.children));
        }
    }
    return quizzes;
};

// Helper to get all questions from a list of quizzes
const getAllQuestionsFromQuizzes = (quizzes: SavedQuiz[]): QuizQuestion[] => {
    return quizzes.flatMap(quiz => quiz.questions);
};

const getRecentActivity = (items: LibraryItem[], range: 7 | 30 | 90 | 'all'): { label: string; value: number }[] => {
    const quizzes = getAllQuizzesInScope(items);
    const activity = new Map<string, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (range !== 'all') {
        for (let i = range - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            activity.set(dateString, 0);
        }
    }

    quizzes.forEach(quiz => {
        (quiz.scoreHistory || []).forEach(record => {
            const recordDate = new Date(record.date);
            recordDate.setHours(0, 0, 0, 0);
            if (range === 'all' || (today.getTime() - recordDate.getTime()) / (1000 * 3600 * 24) < range) {
                const dateString = recordDate.toISOString().split('T')[0];
                activity.set(dateString, (activity.get(dateString) || 0) + 1);
            }
        });
    });
    
    const sortedActivity = Array.from(activity.entries()).sort((a,b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

    return sortedActivity.map(([date, count]) => {
        const d = new Date(date);
        return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: count };
    });
};

const sortItems = (items: LibraryItem[]): LibraryItem[] => {
    const sorted = [...items].sort((a, b) => {
        const nameA = (a.type === 'folder' ? a.name : a.title).toLowerCase();
        const nameB = (b.type === 'folder' ? b.name : b.title).toLowerCase();
        return nameA.localeCompare(nameB);
    });
    return sorted.map(item => {
        if (item.type === 'folder') {
            return { ...item, children: sortItems(item.children) };
        }
        return item;
    });
};

const MedalIndicator: React.FC<{ score: number; onClick?: () => void }> = ({ score, onClick }) => {
    const scoreText = `Nota: ${score.toFixed(2)}`;
    let content;

    if (score < 5) {
        content = <><ExclamationTriangleIcon className="h-8 w-8 text-red-500" /><span className="text-xs font-bold text-red-500 mt-1">Repasar</span></>;
    } else if (score < 7) {
        content = <><BronzeMedalIcon className="h-12 w-12" /><span className="text-xs font-bold text-[#cd7f32] -mt-2">Bronce</span></>;
    } else if (score < 9) {
        content = <><SilverMedalIcon className="h-12 w-12" /><span className="text-xs font-bold text-slate-500 -mt-2">Plata</span></>;
    } else {
        content = <><GoldMedalIcon className="h-12 w-12" /><span className="text-xs font-bold text-amber-500 -mt-2">Oro</span></>;
    }
    
    const Tag = onClick ? 'button' : 'div';

    return (
        <Tag title={scoreText} onClick={onClick} className="flex flex-col items-center justify-center h-full w-full">
            {content}
        </Tag>
    );
};


const ProgressView: React.FC<ProgressViewProps> = ({ libraryData, onBack, onViewQuizDetails }) => {
    const [theme] = useState(settingsService.getSettings().theme);
    const [scopeHistory, setScopeHistory] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Biblioteca Principal' }]);
    const [activityRange, setActivityRange] = useState<7 | 30 | 90 | 'all'>(7);
    const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationTitle, setCelebrationTitle] = useState('');


    const currentScope = scopeHistory[scopeHistory.length - 1];
    const { answeredQuestionIds, allTimeFailedQuestionIds } = libraryData;
    const answeredIds = useMemo(() => new Set(answeredQuestionIds), [answeredQuestionIds]);
    const failedIds = useMemo(() => new Set(allTimeFailedQuestionIds), [allTimeFailedQuestionIds]);

    const itemsInScope = useMemo(() => {
        const findInTree = (items: LibraryItem[], id: string): Folder | null => {
            for (const item of items) {
                if (item.id === id && item.type === 'folder') return item;
                if (item.type === 'folder') {
                    const found = findInTree(item.children, id);
                    if (found) return found;
                }
            }
            return null;
        };

        if (currentScope.id === null) return libraryData.library;

        const folder = findInTree(libraryData.library, currentScope.id);
        return folder ? folder.children : [];
    }, [currentScope.id, libraryData.library]);

    const statsForScope = useMemo(() => {
        const quizzesInScope = getAllQuizzesInScope(itemsInScope);
        const totalTests = quizzesInScope.length;
        const completedQuizzes = quizzesInScope.filter(q => (q.scoreHistory || []).length > 0);
        const completedTests = completedQuizzes.length;
        
        let totalWeightedScore = 0;
        let totalQuestionsInCompleted = 0;

        completedQuizzes.forEach(quiz => {
            const lastScoreRecord = quiz.scoreHistory?.[0];
            if (lastScoreRecord) {
                const numQuestions = quiz.questions.length;
                totalWeightedScore += lastScoreRecord.score * numQuestions;
                totalQuestionsInCompleted += numQuestions;
            }
        });

        const averageScore = totalQuestionsInCompleted > 0 ? totalWeightedScore / totalQuestionsInCompleted : 0;

        const allQuestions = getAllQuestionsFromQuizzes(quizzesInScope);
        const totalQuestions = allQuestions.length;
        const answeredCount = allQuestions.filter(q => answeredIds.has(q.id)).length;
        const progressPercentage = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;
        
        return {
            totalTests,
            completedTests,
            totalQuestions,
            answeredCount,
            progressPercentage,
            averageScore,
        };
    }, [itemsInScope, answeredIds]);
    
    const recentActivityData = useMemo(() => getRecentActivity(itemsInScope, activityRange), [itemsInScope, activityRange]);

    const handleBreadcrumbClick = (index: number) => setScopeHistory(prev => prev.slice(0, index + 1));
    const handleToggleFolder = (folderId: string) => setOpenFolders(prev => { const newSet = new Set(prev); if (newSet.has(folderId)) newSet.delete(folderId); else newSet.add(folderId); return newSet; });

    const handleProgressClick = (isComplete: boolean, name: string) => {
        if (isComplete) {
            setCelebrationTitle(`¡Felicidades por completar "${name}"!`);
            setShowCelebration(true);
        }
    };


    const ContentNode: React.FC<{item: LibraryItem, level: number}> = ({ item, level }) => {
        let progressPercentage = 0;
        let isComplete = false;
        let scoreForMedal = 0;
        let totalQuestions = 0;
        let correctCount = 0;
        let failedCount = 0;
        let unansweredCount = 0;
        let barTotal = 0;

        if (item.type === 'folder') {
            const quizzesInFolder = getAllQuizzesInScope(item.children);
            const totalTestsInFolder = quizzesInFolder.length;
            totalQuestions = getAllQuestionsFromQuizzes(quizzesInFolder).length;

            if (totalTestsInFolder > 0) {
                const completedTests = quizzesInFolder.filter(q => (q.scoreHistory || []).length > 0);
                progressPercentage = (completedTests.length / totalTestsInFolder) * 100;
                isComplete = completedTests.length === totalTestsInFolder;
                
                let totalWeightedScore = 0;
                let totalQuestionsInCompleted = 0;
                let aggregatedCorrect = 0;
                let aggregatedFailed = 0;
                let aggregatedUnanswered = 0;
                
                quizzesInFolder.forEach(quiz => {
                    const lastScoreRecord = quiz.scoreHistory?.[0];
                    if (lastScoreRecord) {
                        const numQuestions = quiz.questions.length;
                        totalWeightedScore += lastScoreRecord.score * numQuestions;
                        totalQuestionsInCompleted += numQuestions;

                        aggregatedCorrect += lastScoreRecord.correctCount ?? 0;
                        aggregatedFailed += lastScoreRecord.failedCount ?? 0;
                        aggregatedUnanswered += lastScoreRecord.unansweredCount ?? 0;

                    } else {
                        aggregatedUnanswered += quiz.questions.length;
                    }
                });

                if (totalQuestionsInCompleted > 0) {
                    scoreForMedal = totalWeightedScore / totalQuestionsInCompleted;
                }

                correctCount = aggregatedCorrect;
                failedCount = aggregatedFailed;
                unansweredCount = aggregatedUnanswered;
                barTotal = correctCount + failedCount + unansweredCount;
            } else {
                barTotal = totalQuestions;
                unansweredCount = totalQuestions;
            }
        } else if (item.type === 'quiz') {
            totalQuestions = item.questions.length;
            barTotal = totalQuestions;
            const answeredCount = item.questions.filter(q => answeredIds.has(q.id)).length;
            isComplete = totalQuestions > 0 && answeredCount === totalQuestions;
            progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
            
            const latestAttempt = item.scoreHistory?.[0];
            if (latestAttempt) {
                scoreForMedal = latestAttempt.score;
                correctCount = latestAttempt.correctCount ?? 0;
                failedCount = latestAttempt.failedCount ?? 0;
                unansweredCount = latestAttempt.unansweredCount ?? 0;
            } else {
                unansweredCount = totalQuestions;
            }
        }
        
        if (totalQuestions === 0 && item.type !== 'folder') return null;

        const handleNodeClick = () => {
            if (item.type === 'folder') {
                setScopeHistory(prev => [...prev, { id: item.id, name: item.name }]);
            } else if (item.type === 'quiz') {
                onViewQuizDetails(item);
            }
        };

        const isClickable = item.type === 'folder' || item.type === 'quiz';
        const itemName = item.type === 'folder' ? item.name : item.title;

        return (
            <div style={{ paddingLeft: `${level * 1.5}rem`}} className="my-2 first:mt-0 last:mb-0">
                <div onClick={isClickable ? handleNodeClick : undefined} className={`flex items-center gap-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700 ${isClickable ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50' : ''}`}>
                    <div className="flex-shrink-0 w-[60px] h-[60px] flex items-center justify-center">
                        {isComplete ? (
                            <MedalIndicator score={scoreForMedal} onClick={() => handleProgressClick(true, itemName)} />
                        ) : (
                            <CircularProgressBar percentage={progressPercentage} theme={theme} size={60} strokeWidth={7} />
                        )}
                    </div>
                    <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                            {item.type === 'folder' && <button onClick={(e) => { e.stopPropagation(); handleToggleFolder(item.id);}} className="p-1 -ml-1"><ChevronRightIcon className={`h-4 w-4 transition-transform ${openFolders.has(item.id) ? 'rotate-90' : ''}`} /></button>}
                            {item.type === 'quiz' && <BookOpenIcon className="h-5 w-5 text-slate-500 flex-shrink-0"/>}
                            <span className="font-semibold truncate" title={itemName}>{itemName}</span>
                        </div>
                        <p className="text-xs text-slate-500">{totalQuestions} preguntas</p>
                    </div>
                     <div className="w-1/3 pl-4 flex-shrink-0">
                        <StackedBarChart
                            correct={correctCount}
                            failed={failedCount}
                            unanswered={unansweredCount}
                            total={barTotal}
                        />
                    </div>
                    {isClickable && <ChevronRightIcon className="h-6 w-6 text-slate-400 flex-shrink-0"/>}
                </div>
                {item.type === 'folder' && openFolders.has(item.id) && <div className="mt-2 space-y-2">{sortItems(item.children).map(child => <ContentNode key={child.id} item={child} level={level + 1} />)}</div>}
            </div>
        )
    };
    
    return (
        <div className="animate-fade-in flex flex-col h-full w-full max-w-7xl mx-auto">
            <header className="flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <ChartBarIcon className="h-8 w-8 text-indigo-500" />Estadísticas
                    </h2>
                    <button onClick={onBack} className="inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-bold"><ArrowPathIcon className="h-5 w-5" />Volver</button>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 mb-6">
                    {scopeHistory.map((scope, index) => (
                        <React.Fragment key={scope.id || 'root'}>
                            <button onClick={() => handleBreadcrumbClick(index)} disabled={index === scopeHistory.length - 1}>{scope.name}</button>
                            {index < scopeHistory.length - 1 && <ChevronRightIcon className="h-4 w-4" />}
                        </React.Fragment>
                    ))}
                </div>
            </header>

            {libraryData.library.length === 0 ? (
                 <div className="flex-grow flex items-center justify-center text-center py-12 px-6 bg-slate-50/70 dark:bg-slate-800/40 rounded-lg border-dashed">
                    <p className="text-slate-500 dark:text-slate-400">No hay datos para mostrar. ¡Completa algunos tests!</p>
                </div>
            ) : (
                <div className="flex-grow flex flex-col lg:flex-row gap-8 min-h-0">
                    {/* Left Column */}
                    <aside className="lg:w-1/3 flex-shrink-0 flex flex-col space-y-6">
                        <section className="p-6 bg-white/50 dark:bg-slate-800/50 rounded-lg border">
                             <h3 className="text-xl font-bold text-center mb-2">Progreso en "{currentScope.name}"</h3>
                             <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-4">Has respondido a {statsForScope.answeredCount} de {statsForScope.totalQuestions} preguntas.</p>
                             <div className="flex items-center justify-center gap-8">
                                <button onClick={() => handleProgressClick(statsForScope.progressPercentage >= 100, currentScope.name)} className="disabled:cursor-default" disabled={statsForScope.progressPercentage < 100}>
                                    <CircularProgressBar 
                                        percentage={statsForScope.progressPercentage} 
                                        theme={theme} 
                                        size={140} 
                                        strokeWidth={16}
                                    />
                                </button>
                                <div className="text-center space-y-4">
                                    <div><span className="text-3xl font-bold">{statsForScope.completedTests} / {statsForScope.totalTests}</span><p className="text-sm text-slate-500">Tests</p></div>
                                    <div><span className="text-3xl font-bold">{statsForScope.averageScore.toFixed(2)}</span><p className="text-sm text-slate-500">Nota Media</p></div>
                                </div>
                            </div>
                        </section>
                        <section className="p-6 bg-white/50 dark:bg-slate-800/50 rounded-lg border">
                            <h3 className="text-xl font-bold mb-4">Actividad Reciente</h3>
                            <div className="flex justify-center gap-2 mb-4">
                                {([7, 30, 90, 'all'] as const).map(r => (
                                    <button key={r} onClick={() => setActivityRange(r)} className={`px-3 py-1 text-xs font-bold rounded-full ${activityRange === r ? 'bg-lime-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                        {r === 'all' ? 'Todo' : `${r}D`}
                                    </button>
                                ))}
                            </div>
                            <div className="h-60">
                                {recentActivityData.some(d => d.value > 0) ? <BarChart data={recentActivityData} theme={theme} yAxisLabel="Nº de Tests" /> : <p className="text-center pt-12 text-sm text-slate-500">Sin actividad en este periodo.</p>}
                            </div>
                        </section>
                    </aside>
                    {/* Right Column */}
                    <main className="flex-grow lg:w-2/3 flex flex-col min-h-0">
                        <h3 className="text-xl font-bold mb-4">Desglose de Contenido</h3>
                        <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-3 pb-4">
                            {itemsInScope.length > 0 ? sortItems(itemsInScope).map(item => <ContentNode key={item.id} item={item} level={0} />) : <p className="text-center pt-12 text-sm text-slate-500">Esta carpeta está vacía.</p>}
                        </div>
                    </main>
                </div>
            )}
            {showCelebration && (
                <CelebrationModal
                    title={celebrationTitle}
                    message="¡Has dominado este tema!"
                    onClose={() => setShowCelebration(false)}
                />
            )}
        </div>
    );
};

export default ProgressView;
