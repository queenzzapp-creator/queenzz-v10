import React from 'react';
import { SavedQuiz, LibraryData, QuizQuestion, ScoreRecord } from '../types.ts';
import { BookOpenIcon, ArrowPathIcon, SparklesIcon, TrophyIcon, CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon, MagnifyingGlassEyeIcon } from './Icons.tsx';

interface QuizDetailsViewProps {
  quiz: SavedQuiz;
  activeLibrary: LibraryData;
  onBack: () => void;
  onStartQuiz: (quiz: SavedQuiz) => void;
  onConfigureQuiz: (quiz: SavedQuiz) => void;
  onReview: (questions: QuizQuestion[], title: string) => void;
  theme: 'light' | 'dark';
}

const AttemptStat: React.FC<{ Icon: React.FC<any>, count?: number, color: string }> = ({ Icon, count, color }) => (
    <div className={`flex items-center gap-1.5 text-sm font-semibold ${color}`}>
        <Icon className="h-4 w-4" />
        <span className="font-mono">{count ?? 0}</span>
    </div>
);

const QuizDetailsView: React.FC<QuizDetailsViewProps> = ({ quiz, activeLibrary, onBack, onStartQuiz, onConfigureQuiz, onReview, theme }) => {
  return (
    <div className="animate-fade-in w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <BookOpenIcon className="h-8 w-8 text-sky-500" />
          Detalles del Test
        </h2>
        <button onClick={onBack} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-bold bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowPathIcon className="h-5 w-5" /> Volver
        </button>
      </div>
      
      <div className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-start gap-4">
            <div className="flex-grow">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{quiz.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{quiz.questions.length} preguntas</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Creado: {new Date(quiz.createdAt).toLocaleDateString()}</p>
            </div>
            <button onClick={() => onReview(quiz.questions, `Revisión: ${quiz.title}`)} title="Revisar Test" className="flex-shrink-0 p-2 text-slate-500 dark:text-slate-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <MagnifyingGlassEyeIcon className="h-6 w-6" />
            </button>
        </div>
        
        <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
            <button onClick={() => onStartQuiz(quiz)} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700">
                <SparklesIcon className="h-5 w-5"/> Empezar Test
            </button>
            <button onClick={() => onConfigureQuiz(quiz)} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-bold rounded-md bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-200 hover:bg-sky-200 dark:hover:bg-sky-800/60">
                Configurar Práctica
            </button>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <TrophyIcon className="h-6 w-6 text-amber-500" /> Historial de Puntuaciones
        </h3>
        {(quiz.scoreHistory && quiz.scoreHistory.length > 0) ? (
          <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <ul className="space-y-2">
              {quiz.scoreHistory.map((record, index) => (
                <li key={index} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 p-3 bg-slate-100/50 dark:bg-slate-700/50 rounded-md text-sm">
                  <div className="flex-grow">
                    <span className="text-slate-500 dark:text-slate-400">{new Date(record.date).toLocaleString('es-ES', { day:'2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                    {record.type === 'practice' && <span className="ml-2 text-xs font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 px-2 py-0.5 rounded-full">Práctica</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <AttemptStat Icon={CheckCircleIcon} count={record.correctCount} color="text-green-500" />
                    <AttemptStat Icon={XCircleIcon} count={record.failedCount} color="text-red-500" />
                    <AttemptStat Icon={QuestionMarkCircleIcon} count={record.unansweredCount} color="text-sky-500" />
                    <span className="font-bold text-base text-slate-800 dark:text-slate-100 w-20 text-right">{record.score.toFixed(2)} / 10</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-12 px-6 bg-slate-100/70 dark:bg-slate-800/40 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400 font-sans">Aún no has completado este test.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizDetailsView;