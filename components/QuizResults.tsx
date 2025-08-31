import React, { useState, useEffect } from 'react';
import { ArrowPathIcon, XCircleIcon, QuestionMarkCircleIcon, ChevronUpIcon, ChevronDownIcon, CheckCircleIcon, DocumentMagnifyingGlassIcon, BrainIcon, TrophyIcon, CheckBadgeIcon } from './Icons.tsx';
import { QuizQuestion, QuizSettings, UserAnswersMap, GeneratedQuiz, SavedQuiz, ScoreRecord, MnemonicRule } from '../types.ts';
import ImageZoomModal from './ImageZoomModal.tsx';
import CelebrationModal from './CelebrationModal.tsx';

const ReviewSection: React.FC<{
  quiz: GeneratedQuiz;
  userAnswers: UserAnswersMap;
  onViewSource: (question: QuizQuestion) => void;
  mnemonicsByQuestionId: Map<string, MnemonicRule>;
  onViewMnemonic: (rule: MnemonicRule) => void;
}> = ({ quiz, userAnswers, onViewSource, mnemonicsByQuestionId, onViewMnemonic }) => {
    const [openReview, setOpenReview] = useState(true);
    const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

    return (
        <div className="w-full max-w-4xl mt-8 text-left">
            <button onClick={() => setOpenReview(prev => !prev)} className="w-full flex justify-between items-center p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700">
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">Revisión de Respuestas</h3>
                {openReview ? <ChevronUpIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" /> : <ChevronDownIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" />}
            </button>

            {openReview && (
                <div className="mt-4 space-y-4 animate-fade-in">
                    {quiz.questions.map((q, index) => {
                        const userAnswer = userAnswers.get(index);
                        const userSelection = userAnswer?.selected;
                        const wasCorrect = userAnswer?.isCorrect;
                        const mnemonic = mnemonicsByQuestionId.get(q.id);

                        return (
                            <div key={q.id} className="bg-white/50 dark:bg-slate-800/50 p-5 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between items-start gap-4">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex-grow">{index + 1}. {q.question}</h4>
                                    <div className="flex-shrink-0 flex items-center">
                                        {mnemonic && (
                                            <button 
                                                onClick={() => onViewMnemonic(mnemonic)}
                                                className="p-2 text-slate-400 hover:text-amber-500 dark:text-slate-500 dark:hover:text-amber-400 transition-colors rounded-full"
                                                title="Ver Regla Mnemotécnica"
                                            >
                                                <BrainIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                        {q.sourceFileId && (
                                            <button 
                                                onClick={() => onViewSource(q)}
                                                className="p-2 text-slate-400 hover:text-sky-500 dark:text-slate-500 dark:hover:text-sky-400 transition-colors rounded-full"
                                                title={q.sourcePage ? `Ver fuente (Página ${q.sourcePage})` : 'Ver fuente'}
                                            >
                                                <DocumentMagnifyingGlassIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {q.imageUrl && (
                                    <div className="mb-4 flex justify-center bg-slate-100 dark:bg-slate-900/50 p-2 rounded-lg">
                                         <button type="button" onClick={() => setZoomedImageUrl(q.imageUrl!)} aria-label="Ampliar imagen de la pregunta">
                                            <img src={q.imageUrl} alt="Contenido visual de la pregunta" className="max-w-full max-h-60 rounded-md object-contain cursor-zoom-in" />
                                        </button>
                                    </div>
                                )}
                                <div className="space-y-2 font-sans text-sm">
                                    {q.options.map((opt, oIndex) => {
                                        const isCorrectAnswer = opt === q.correctAnswer;
                                        const isUserSelection = opt === userSelection;
                                        const wasSkipped = !userAnswer;

                                        let style = "bg-slate-100/60 dark:bg-slate-700/40 border-slate-200/70 dark:border-slate-600/50 text-slate-700 dark:text-slate-300";

                                        if (isCorrectAnswer) {
                                            style = "bg-green-100/70 dark:bg-green-900/40 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200 font-semibold";
                                        } else if (isUserSelection && !wasCorrect) {
                                            style = "bg-red-100/70 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200";
                                        } else if (wasSkipped && isCorrectAnswer) {
                                            style = "bg-yellow-100/70 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 font-semibold";
                                        }

                                        return (
                                            <div key={oIndex} className={`flex items-center gap-3 p-3 rounded-md border ${style}`}>
                                                {isCorrectAnswer && <CheckCircleIcon className="h-5 w-5 shrink-0" />}
                                                {isUserSelection && !wasCorrect && <XCircleIcon className="h-5 w-5 shrink-0" />}
                                                {wasSkipped && <QuestionMarkCircleIcon className="h-5 w-5 shrink-0"/>}
                                                {!wasSkipped && !isCorrectAnswer && !isUserSelection && <div className="w-5 h-5 shrink-0"></div>}
                                                <span>{opt}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                                    <p className="font-semibold text-lime-600 dark:text-lime-400 mb-1">Explicación:</p>
                                    <p className="text-slate-600 dark:text-slate-300 font-sans text-sm">{q.explanation}</p>
                                </div>
                            </div>
                        );
                    })}
                     {zoomedImageUrl && <ImageZoomModal imageUrl={zoomedImageUrl} onClose={() => setZoomedImageUrl(null)} />}
                </div>
            )}
        </div>
    );
};

const HistorySection: React.FC<{ history: ScoreRecord[] }> = ({ history }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    if (history.length <= 1) return null; // Only show history if there's more than one attempt

    // Exclude the most recent attempt for the history view
    const pastAttempts = history.slice(1);

    if(pastAttempts.length === 0) return null;

    return (
        <div className="w-full max-w-sm mt-4">
             <button onClick={() => setIsOpen(p => !p)} className="w-full flex justify-between items-center px-4 py-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-sm">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Ver Historial de Intentos</span>
                {isOpen ? <ChevronUpIcon className="h-5 w-5 text-slate-500" /> : <ChevronDownIcon className="h-5 w-5 text-slate-500" />}
            </button>
            {isOpen && (
                <div className="mt-2 space-y-2 animate-fade-in font-sans">
                    {pastAttempts.map((record, index) => (
                         <div key={index} className="flex justify-between items-center p-3 bg-white/50 dark:bg-slate-800/40 rounded-md text-sm">
                            <span className="text-slate-500 dark:text-slate-400">{new Date(record.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{record.score} / {record.total}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  sessionFailedQuestions: QuizQuestion[];
  sessionUnansweredQuestions: QuizQuestion[];
  quiz: SavedQuiz | GeneratedQuiz | null;
  quizSettings: QuizSettings | null;
  userAnswers: UserAnswersMap | null;
  onReset: () => void;
  onPracticeFailed: (questions: QuizQuestion[]) => void;
  onPracticeUnanswered: (questions: QuizQuestion[]) => void;
  onPracticeCombined: (failed: QuizQuestion[], unanswered: QuizQuestion[]) => void;
  onViewSource: (question: QuizQuestion) => void;
  mnemonicsByQuestionId: Map<string, MnemonicRule>;
  onViewMnemonic: (rule: MnemonicRule) => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({ score, totalQuestions, sessionFailedQuestions, sessionUnansweredQuestions, onReset, onPracticeFailed, onPracticeUnanswered, onPracticeCombined, quizSettings, userAnswers, quiz, onViewSource, mnemonicsByQuestionId, onViewMnemonic }) => {
  const [showReviewOptions, setShowReviewOptions] = useState(false);
  const [showPerfectScoreCelebration, setShowPerfectScoreCelebration] = useState(false);
  
  const scoreOutOfTen = score; // Score is now pre-calculated out of 10
  const percentage = totalQuestions > 0 ? (scoreOutOfTen / 10) * 100 : 0;
  
  const hasFailed = sessionFailedQuestions.length > 0;
  const hasUnanswered = sessionUnansweredQuestions.length > 0;
  
  const correctAnswers = totalQuestions - sessionFailedQuestions.length - sessionUnansweredQuestions.length;
  const isPerfectScore = totalQuestions > 0 && correctAnswers === totalQuestions;

  useEffect(() => {
    if (isPerfectScore) {
      setShowPerfectScoreCelebration(true);
    }
  }, [isPerfectScore]);

  const getFeedback = () => {
    if (totalQuestions === 0) return "No has respondido ninguna pregunta.";
    if (isPerfectScore) return "¡Puntuación Perfecta! ¡Eres un maestro/a!";
    if (scoreOutOfTen >= 8) return "¡Excelente trabajo! Realmente dominas el tema.";
    if (scoreOutOfTen >= 6) return "¡Buen trabajo! Un rendimiento sólido.";
    if (scoreOutOfTen >= 5) return "Aprobado, pero hay margen de mejora.";
    return "¡Sigue estudiando! La próxima vez lo harás mejor.";
  };

  return (
    <div className="text-center animate-fade-in flex flex-col items-center w-full">
      {isPerfectScore ? 
        <CheckBadgeIcon className="h-24 w-24 text-yellow-400 mb-4" /> :
        <TrophyIcon className="h-24 w-24 text-yellow-400 mb-4" />
      }
      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-lime-500 to-sky-500 mb-2">
        ¡Test Completado!
      </h2>
      <p className="text-lg text-slate-600 dark:text-slate-400 mb-6 font-sans">{getFeedback()}</p>

      <div className="bg-white/50 dark:bg-slate-800/50 p-6 sm:p-8 rounded-xl border border-slate-200 dark:border-slate-700 mb-2 w-full max-w-md">
        <p className="text-xl text-slate-500 dark:text-slate-400 font-sans">Tu Nota Final</p>
        <p className="text-6xl font-bold my-2 text-slate-800 dark:text-slate-100">
          {scoreOutOfTen.toFixed(2)} <span className="text-4xl text-slate-400 dark:text-slate-500">/ 10</span>
        </p>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 mt-4">
          <div
            className="bg-gradient-to-r from-lime-500 to-sky-500 h-4 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div className="mt-6 flex justify-around text-sm font-sans">
             <div className="text-green-600 dark:text-green-400"><strong>{correctAnswers}</strong> Acertadas</div>
             <div className="text-red-600 dark:text-red-400"><strong>{sessionFailedQuestions.length}</strong> Falladas</div>
             <div className="text-slate-500 dark:text-slate-400"><strong>{sessionUnansweredQuestions.length}</strong> En Blanco</div>
        </div>
      </div>
      
      {quiz && 'scoreHistory' in quiz && quiz.scoreHistory && (
          <HistorySection history={quiz.scoreHistory} />
      )}

      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <button
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-500 dark:focus:ring-offset-slate-900 transition-all duration-200 font-sans"
        >
          <ArrowPathIcon className="h-5 w-5" />
          Volver a la Biblioteca
        </button>
         {(hasFailed || hasUnanswered) && (
            <button
              onClick={() => setShowReviewOptions(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-sky-300 dark:border-sky-700 text-base font-bold rounded-md shadow-sm text-sky-700 dark:text-sky-200 bg-sky-100 dark:bg-sky-900/40 hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-all duration-200 font-sans"
            >
              <ArrowPathIcon className="h-5 w-5" />
              Repasar
            </button>
        )}
      </div>

      {quiz && userAnswers && (
        <ReviewSection quiz={quiz} userAnswers={userAnswers} onViewSource={onViewSource} mnemonicsByQuestionId={mnemonicsByQuestionId} onViewMnemonic={onViewMnemonic} />
      )}
      
      {showReviewOptions && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowReviewOptions(false)}>
            <div className="relative bg-[#FAF8F1] dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 text-center">Elige tu modo de repaso</h3>
                <div className="space-y-3">
                    {hasFailed && (
                        <button onClick={() => { onPracticeFailed(sessionFailedQuestions); setShowReviewOptions(false); }} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-red-300 dark:border-red-700 text-base font-bold rounded-md shadow-sm text-red-700 dark:text-red-200 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 transition-all duration-200 font-sans">
                            <XCircleIcon className="h-5 w-5" /> Repasar {sessionFailedQuestions.length} Fallada(s)
                        </button>
                    )}
                    {hasUnanswered && (
                         <button onClick={() => { onPracticeUnanswered(sessionUnansweredQuestions); setShowReviewOptions(false); }} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-sky-300 dark:border-sky-700 text-base font-bold rounded-md shadow-sm text-sky-700 dark:text-sky-200 bg-sky-100 dark:bg-sky-900/40 hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-all duration-200 font-sans">
                            <QuestionMarkCircleIcon className="h-5 w-5" /> Repasar {sessionUnansweredQuestions.length} en Blanco
                        </button>
                    )}
                     {hasFailed && hasUnanswered && (
                         <button onClick={() => { onPracticeCombined(sessionFailedQuestions, sessionUnansweredQuestions); setShowReviewOptions(false); }} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-purple-300 dark:border-purple-700 text-base font-bold rounded-md shadow-sm text-purple-700 dark:text-purple-200 bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-all duration-200 font-sans">
                            <ArrowPathIcon className="h-5 w-5" /> Repasar Ambas
                        </button>
                    )}
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={() => setShowReviewOptions(false)} className="w-full px-4 py-2 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-700/70 hover:bg-slate-300/70 dark:hover:bg-slate-600/70 transition-colors">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
      )}

       {showPerfectScoreCelebration && (
        <CelebrationModal
          title="¡Puntuación Perfecta!"
          message="¡Felicidades, eres un maestro/a!"
          onClose={() => setShowPerfectScoreCelebration(false)}
        />
      )}
    </div>
  );
};

export default QuizResults;
