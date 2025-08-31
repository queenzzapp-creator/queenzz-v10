import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { QuizQuestion, QuizSettings, UserAnswersMap, PausedQuizState, MnemonicRule, QuestionFlag, FailedQuestionEntry } from '../types.ts';
import { CheckCircleIcon, XCircleIcon, StopCircleIcon, ClockIcon, PauseCircleIcon, DocumentMagnifyingGlassIcon, BrainIcon, ChevronLeftIcon, ChevronRightIcon, FlagIcon } from './Icons.tsx';
import ImageZoomModal from './ImageZoomModal.tsx';
import * as libraryService from '../services/libraryService.ts';

interface QuizViewProps {
  questions: QuizQuestion[];
  onFinish: (failedOnSession: QuizQuestion[], unansweredOnSession: QuizQuestion[], userAnswers: UserAnswersMap) => void;
  onQuestionAnswered: (questionId: string) => void;
  onQuestionFailed: (question: QuizQuestion) => void;
  onQuestionSkipped: (question: QuizQuestion) => void;
  onQuestionFlagged: (questionId: string, flag: QuestionFlag | null) => void;
  quizSettings: QuizSettings;
  onPause: (currentState: Omit<PausedQuizState, 'quizId' | 'quizTitle' | 'activeQuizType'>) => void;
  onViewSource: (question: QuizQuestion) => void;
  mnemonicsByQuestionId: Map<string, MnemonicRule>;
  onViewMnemonic: (rule: MnemonicRule) => void;
  srsEntries: FailedQuestionEntry[];
  initialUserAnswers?: UserAnswersMap;
  initialQuestionIndex?: number;
  initialTimeLeft?: number;
}

const QuestionNavigator: React.FC<{
  questionCount: number;
  currentQuestionIndex: number;
  userAnswers: UserAnswersMap;
  quizSettings: QuizSettings | null;
  onNavigate: (index: number) => void;
}> = ({ questionCount, currentQuestionIndex, userAnswers, quizSettings, onNavigate }) => {
  const activePageRef = useRef<HTMLDivElement>(null);

  // As requested, pagination will activate for tests with more than 50 questions.
  const PAGINATION_THRESHOLD = 50;
  const QUESTIONS_PER_PAGE = 50;
  const isPaginated = questionCount > PAGINATION_THRESHOLD;

  useEffect(() => {
    // Scroll the current page container into view if we're using pagination
    if (isPaginated && activePageRef.current) {
      activePageRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start',
      });
    }
  }, [currentQuestionIndex, isPaginated]);
  
  const getStatusClass = (index: number) => {
    const isCurrent = index === currentQuestionIndex;
    const answer = userAnswers.get(index);
    
    if (isCurrent) {
        return 'ring-2 ring-lime-500 bg-lime-200 dark:bg-lime-700 text-lime-800 dark:text-lime-100 font-bold';
    }
    
    if (answer) {
        if (quizSettings?.showAnswers === 'immediately') {
            return answer.isCorrect
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white';
        }
        return 'bg-sky-500 text-white'; // Answered in 'atEnd' mode
    }

    return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200';
  };

  const renderButtonsGrid = (startIndex: number, endIndex: number) => (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: endIndex - startIndex }).map((_, i) => {
        const questionIndex = startIndex + i;
        return (
          <button
            key={questionIndex}
            onClick={() => onNavigate(questionIndex)}
            className={`w-10 h-10 flex items-center justify-center rounded-md text-sm font-sans transition-all duration-200 ${getStatusClass(questionIndex)} hover:scale-110 flex-shrink-0`}
            aria-label={`Ir a la pregunta ${questionIndex + 1}`}
          >
            {questionIndex + 1}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-lg border border-slate-200/80 dark:border-slate-700/80 shadow-lg p-4 rounded-2xl">
      <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-4">Preguntas</h3>
      {isPaginated ? (
        <div className="overflow-x-auto pb-2 -mb-2 flex snap-x snap-mandatory">
          {Array.from({ length: Math.ceil(questionCount / QUESTIONS_PER_PAGE) }).map((_, pageIndex) => {
            const isActivePage = pageIndex === Math.floor(currentQuestionIndex / QUESTIONS_PER_PAGE);
            const start = pageIndex * QUESTIONS_PER_PAGE;
            const end = Math.min(start + QUESTIONS_PER_PAGE, questionCount);
            return (
              <div
                key={pageIndex}
                ref={isActivePage ? activePageRef : null}
                className="flex-shrink-0 w-full snap-start pr-2" // Added padding-right to prevent gap cutting off content
              >
                {renderButtonsGrid(start, end)}
              </div>
            );
          })}
        </div>
      ) : (
        renderButtonsGrid(0, questionCount)
      )}
    </div>
  );
};


const QuizView: React.FC<QuizViewProps> = ({ 
    questions, 
    onFinish, 
    onQuestionAnswered, 
    onQuestionFailed, 
    onQuestionSkipped, 
    onQuestionFlagged,
    quizSettings,
    onPause,
    onViewSource,
    mnemonicsByQuestionId,
    onViewMnemonic,
    srsEntries,
    initialUserAnswers,
    initialQuestionIndex,
    initialTimeLeft,
}) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex || 0);
    const [userAnswers, setUserAnswers] = useState<UserAnswersMap>(initialUserAnswers || new Map());
    const [timeLeft, setTimeLeft] = useState<number | undefined>(initialTimeLeft);
    const [answerFeedback, setAnswerFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
    const [hydratedCurrentQuestion, setHydratedCurrentQuestion] = useState<QuizQuestion | null>(null);
    const [isFlagMenuOpen, setIsFlagMenuOpen] = useState(false);
    const [highlightedOptionIndex, setHighlightedOptionIndex] = useState(-1);
    const [showFinishConfirm, setShowFinishConfirm] = useState(false);

    const timerRef = useRef<number | null>(null);
    const flagMenuRef = useRef<HTMLDivElement>(null);
    const currentQuestion = questions[currentQuestionIndex];

    const srsEntryForCurrentQuestion = useMemo(() => {
        if (!srsEntries || !currentQuestion) return null;
        return srsEntries.find(entry => entry.question.id === currentQuestion.id);
    }, [srsEntries, currentQuestion]);

    const shouldHighlightFailure = srsEntryForCurrentQuestion && srsEntryForCurrentQuestion.failureCount >= 3;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (flagMenuRef.current && !flagMenuRef.current.contains(event.target as Node)) {
                setIsFlagMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFinish = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        
        const failed: QuizQuestion[] = [];
        const unanswered: QuizQuestion[] = [];
        
        questions.forEach((q, index) => {
            const answer = userAnswers.get(index);
            if (!answer) {
                unanswered.push(q);
            } else if (!answer.isCorrect) {
                failed.push(q);
            }
        });
        
        onFinish(failed, unanswered, userAnswers);
    }, [questions, userAnswers, onFinish]);

    const handleNextQuestion = useCallback((skipped = false) => {
        if (!userAnswers.get(currentQuestionIndex) && skipped) {
            onQuestionSkipped(currentQuestion);
        }
        setAnswerFeedback(null);
        setIsFlagMenuOpen(false);
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            setShowFinishConfirm(true);
        }
    }, [userAnswers, currentQuestionIndex, onQuestionSkipped, currentQuestion, questions.length]);
    
    useEffect(() => {
        setHighlightedOptionIndex(-1);
    }, [currentQuestionIndex]);

    const handleAnswerSelect = useCallback((selectedOption: string) => {
        if (userAnswers.get(currentQuestionIndex)) return;

        const isCorrect = selectedOption === currentQuestion.correctAnswer;
        const newUserAnswers = new Map(userAnswers);
        newUserAnswers.set(currentQuestionIndex, { selected: selectedOption, isCorrect });
        setUserAnswers(newUserAnswers);

        if (isCorrect) {
            onQuestionAnswered(currentQuestion.id);
            setAnswerFeedback('correct');
        } else {
            onQuestionFailed(currentQuestion);
            setAnswerFeedback('incorrect');
        }
        
        if (quizSettings.showAnswers !== 'immediately') {
            setTimeout(() => handleNextQuestion(), 300); // Brief delay to show selection
        }
    }, [currentQuestionIndex, currentQuestion, userAnswers, onQuestionAnswered, onQuestionFailed, quizSettings.showAnswers, handleNextQuestion]);

    const handlePrevQuestion = useCallback(() => {
         setAnswerFeedback(null);
         setIsFlagMenuOpen(false);
         if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
         }
    }, [currentQuestionIndex]);
    
    const handlePause = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        const stateToSave: Omit<PausedQuizState, 'quizId' | 'quizTitle' | 'activeQuizType'> = {
            questions,
            userAnswers: Array.from(userAnswers.entries()),
            currentQuestionIndex,
            quizSettings,
            timeLeft
        };
        onPause(stateToSave);
    }, [questions, userAnswers, currentQuestionIndex, quizSettings, timeLeft, onPause]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (showFinishConfirm) {
                if (e.key === 'Enter') handleFinish();
                if (e.key === 'Escape') setShowFinishConfirm(false);
                return;
            }
            
            if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
                return;
            }

            const optionIndex = parseInt(e.key, 10) - 1;
            if (optionIndex >= 0 && optionIndex < 5 && currentQuestion.options[optionIndex]) {
                e.preventDefault();
                handleAnswerSelect(currentQuestion.options[optionIndex]);
                return;
            }

            switch (e.key) {
                case 'ArrowRight':
                case ' ':
                    e.preventDefault();
                    if (quizSettings.showAnswers === 'immediately' && userAnswers.has(currentQuestionIndex)) {
                        handleNextQuestion();
                    } else if (quizSettings.showAnswers !== 'immediately') {
                        handleNextQuestion();
                    }
                    break;
                case 'ArrowLeft':
                case 'Control' && 'z':
                    e.preventDefault();
                    handlePrevQuestion();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setHighlightedOptionIndex(prev => (prev - 1 + currentQuestion.options.length) % currentQuestion.options.length);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setHighlightedOptionIndex(prev => (prev + 1) % currentQuestion.options.length);
                    break;
                case 'Shift':
                    e.preventDefault();
                    if (userAnswers.has(currentQuestionIndex)) {
                        handleNextQuestion();
                    } else if (highlightedOptionIndex > -1) {
                        handleAnswerSelect(currentQuestion.options[highlightedOptionIndex]);
                    }
                    break;
                case 'Enter':
                    e.preventDefault();
                    setShowFinishConfirm(true);
                    break;
                case 'Escape':
                    e.preventDefault();
                    handlePause();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentQuestion, currentQuestionIndex, questions.length, quizSettings.showAnswers, userAnswers, handleAnswerSelect, handleNextQuestion, handlePrevQuestion, handlePause, handleFinish, highlightedOptionIndex, showFinishConfirm]);


    const handleTimeUp = useCallback(() => {
        if (quizSettings.mode === 'total') {
            handleFinish();
        } else if (quizSettings.mode === 'perQuestion') {
            handleNextQuestion(true);
        }
    }, [quizSettings.mode, handleFinish, handleNextQuestion]);

    // Timer logic
    useEffect(() => {
        if (timeLeft === undefined) return;

        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev === undefined || prev <= 1) {
                    clearInterval(timerRef.current!);
                    handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timeLeft, handleTimeUp]);

    useEffect(() => {
        if (quizSettings.mode === 'perQuestion') {
            setTimeLeft(quizSettings.duration);
        }
        
        const hydrateCurrentQuestion = async () => {
            setHydratedCurrentQuestion(null);
            if (currentQuestion) {
                const assets = await libraryService.getQuestionAssets(currentQuestion.id);
                setHydratedCurrentQuestion({ ...currentQuestion, ...assets });
            }
        };

        hydrateCurrentQuestion();

    }, [currentQuestionIndex, quizSettings.mode, quizSettings.duration, questions, currentQuestion]);

    const questionToDisplay = hydratedCurrentQuestion || currentQuestion;
    const userAnswer = userAnswers.get(currentQuestionIndex);

    const handleFlagSet = (flag: QuestionFlag | null) => {
        onQuestionFlagged(currentQuestion.id, flag);
        setIsFlagMenuOpen(false);
    };

    const formatTime = (seconds: number | undefined): string => {
        if (seconds === undefined) return '';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const renderTimer = () => {
        if (quizSettings.mode === 'none') return null;
        return (
             <div className="flex items-center gap-2 text-lg font-bold text-slate-700 dark:text-slate-200">
                <ClockIcon className="h-6 w-6" />
                <span>{formatTime(timeLeft)}</span>
            </div>
        )
    }
    
    const mnemonic = mnemonicsByQuestionId.get(currentQuestion.id);

    const flagOptions: { label: string, value: QuestionFlag | null, color: string }[] = [
        { label: 'Sin marcar', value: null, color: 'bg-slate-400' },
        { label: 'Buena pregunta', value: 'buena', color: 'bg-green-500' },
        { label: 'Mala pregunta', value: 'mala', color: 'bg-red-500' },
        { label: 'Interesante', value: 'interesante', color: 'bg-yellow-500' },
        { label: 'Revisar', value: 'revisar', color: 'bg-sky-500' },
        { label: 'Suspendida', value: 'suspendida', color: 'bg-purple-500' },
    ];
    
    return (
        <div className="flex flex-col lg:flex-row gap-8 w-full max-w-7xl mx-auto h-full">
            {/* Main Content */}
            <div className="flex-grow flex flex-col">
                <header className="flex-shrink-0 flex justify-between items-center mb-4">
                    {renderTimer()}
                </header>

                <div className="flex justify-end items-center gap-2 mb-2">
                    <button onClick={handlePause} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                        <PauseCircleIcon className="h-5 w-5" /> Pausar
                    </button>
                    <button onClick={() => setShowFinishConfirm(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
                        <StopCircleIcon className="h-5 w-5" /> Finalizar
                    </button>
                </div>

                <div className={`flex-grow bg-white/50 dark:bg-slate-800/50 p-6 sm:p-8 rounded-xl border-2 border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-300 ${shouldHighlightFailure ? 'border-red-500/50 dark:border-red-500/60 ring-2 ring-red-500/20' : ''}`}>
                    <div className="flex justify-between items-start gap-4 mb-4">
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Pregunta {currentQuestionIndex + 1} de {questions.length}</p>
                        <div className="flex-shrink-0 flex items-center gap-1">
                             <div className="relative" ref={flagMenuRef}>
                                <button onClick={() => setIsFlagMenuOpen(p => !p)} className="p-2 text-slate-400 hover:text-amber-500" title="Marcar pregunta">
                                    <FlagIcon className={`h-5 w-5 ${questionToDisplay.flag ? 'text-lime-500' : ''}`} />
                                </button>
                                {isFlagMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 z-10 py-1">
                                        {flagOptions.map(opt => (
                                            <button key={opt.label} onClick={() => handleFlagSet(opt.value)} className="w-full text-left px-3 py-2 text-sm flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700">
                                                <span className={`h-3 w-3 rounded-full ${opt.color}`}></span>
                                                <span>{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {mnemonic && (
                                <button onClick={() => onViewMnemonic(mnemonic)} className="p-2 text-slate-400 hover:text-amber-500" title="Ver Regla Mnemotécnica"><BrainIcon className="h-5 w-5" /></button>
                            )}
                            {questionToDisplay.sourceFileId && (
                                <button onClick={() => onViewSource(questionToDisplay)} className="p-2 text-slate-400 hover:text-sky-500" title={questionToDisplay.sourcePage ? `Ver fuente (Página ${questionToDisplay.sourcePage})` : 'Ver fuente'}><DocumentMagnifyingGlassIcon className="h-5 w-5" /></button>
                            )}
                        </div>
                    </div>

                    <h2 className={`text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 ${shouldHighlightFailure ? 'text-red-900 dark:text-red-300' : ''}`}>{questionToDisplay.question}</h2>
                    
                    {questionToDisplay.imageUrl && (
                        <div className="mb-6 flex justify-center bg-slate-100 dark:bg-slate-900/50 p-2 rounded-lg">
                             <button type="button" onClick={() => setZoomedImageUrl(questionToDisplay.imageUrl!)} aria-label="Ampliar imagen de la pregunta">
                                <img src={questionToDisplay.imageUrl} alt="Contenido visual de la pregunta" className="max-w-full max-h-64 rounded-md object-contain cursor-zoom-in" />
                            </button>
                        </div>
                    )}

                    <div className="space-y-3">
                        {questionToDisplay.options.map((option, index) => {
                            const isSelected = userAnswer?.selected === option;
                            const isHighlighted = !userAnswer && index === highlightedOptionIndex;
                            
                            let buttonClass = "bg-white dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 hover:bg-lime-50 dark:hover:bg-slate-700";
                            if (userAnswer && quizSettings.showAnswers === 'immediately') {
                                const isCorrectAnswer = option === questionToDisplay.correctAnswer;
                                if(isCorrectAnswer) buttonClass = "bg-green-100 dark:bg-green-900/40 border-green-500 text-green-800 dark:text-green-200 font-bold";
                                else if(isSelected) buttonClass = "bg-red-100 dark:bg-red-900/40 border-red-500 text-red-800 dark:text-red-200";
                            } else if (isSelected) {
                                buttonClass = "bg-sky-100 dark:bg-sky-900/40 border-sky-500 font-semibold";
                            } else if (isHighlighted) {
                                buttonClass = "bg-lime-100 dark:bg-lime-800/50 border-lime-400 dark:border-lime-600 ring-2 ring-lime-300 dark:ring-lime-700";
                            }

                            return (
                            <button key={index} onClick={() => handleAnswerSelect(option)} disabled={!!userAnswer} className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${buttonClass}`}>
                                {option}
                            </button>
                            )
                        })}
                    </div>
                    
                    {userAnswer && quizSettings.showAnswers === 'immediately' && (
                         <div className="mt-6 pt-4 border-t border-dashed border-slate-300 dark:border-slate-600 animate-fade-in">
                            <h4 className="font-bold text-lime-600 dark:text-lime-400 mb-2">Explicación</h4>
                            <p className="text-slate-600 dark:text-slate-300 font-sans">{questionToDisplay.explanation}</p>
                        </div>
                    )}
                </div>
                 <div className="flex-shrink-0 mt-6 flex justify-between items-center">
                    <button onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0} className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 disabled:opacity-40">
                        <ChevronLeftIcon className="h-5 w-5" /> Anterior
                    </button>
                    <button onClick={() => handleNextQuestion(true)} disabled={!!userAnswer && quizSettings.showAnswers !== 'immediately'} className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 disabled:opacity-40">
                        Siguiente <ChevronRightIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Navigator */}
            <div className="w-full lg:w-72 flex-shrink-0">
                <QuestionNavigator 
                    questionCount={questions.length}
                    currentQuestionIndex={currentQuestionIndex}
                    userAnswers={userAnswers}
                    quizSettings={quizSettings}
                    onNavigate={setCurrentQuestionIndex}
                />
            </div>
            {zoomedImageUrl && <ImageZoomModal imageUrl={zoomedImageUrl} onClose={() => setZoomedImageUrl(null)} />}
            {showFinishConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowFinishConfirm(false)}>
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-lg text-center shadow-lg animate-fade-in" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold">¿Finalizar Test?</h3>
                        <p className="my-4 text-slate-600 dark:text-slate-300">¿Estás seguro de que quieres terminar y corregir el test?</p>
                        <div className="flex justify-center gap-4 mt-6">
                            <button onClick={() => setShowFinishConfirm(false)} className="px-6 py-2 font-semibold rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">Cancelar (Esc)</button>
                            <button onClick={handleFinish} className="px-6 py-2 font-bold rounded-md bg-lime-600 text-white">Confirmar (Enter)</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default QuizView;