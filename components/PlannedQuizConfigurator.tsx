import React, { useState } from 'react';
import { StudyPlanSession } from '../types.ts';
import { SparklesIcon, ArrowPathIcon, CalendarDaysIcon } from './Icons.tsx';

interface PlannedQuizConfiguratorProps {
  session: StudyPlanSession;
  onStart: (questionCount: number) => void;
  onCancel: () => void;
  defaultQuestionCount: number;
}

const PlannedQuizConfigurator: React.FC<PlannedQuizConfiguratorProps> = ({ session, onStart, onCancel, defaultQuestionCount }) => {
  const [questionCount, setQuestionCount] = useState(defaultQuestionCount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart(questionCount);
  };

  return (
    <div className="animate-fade-in w-full max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <CalendarDaysIcon className="h-8 w-8 text-purple-500" />
          Sesión de Estudio
        </h2>
        <button
          onClick={onCancel}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowPathIcon className="h-5 w-5" />
          Volver
        </button>
      </div>

      <div className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700 mb-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Estás a punto de empezar tu sesión planificada:</p>
        <p className="font-bold text-lg text-slate-800 dark:text-slate-100 mt-1">
          {session.fileName}
        </p>
        <p className="font-semibold text-slate-600 dark:text-slate-300">
          Páginas {session.startPage} - {session.endPage}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="question-count" className="block text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
            ¿Cuántas preguntas quieres generar?
          </label>
          <input
            id="question-count"
            type="number"
            min="1"
            max="50"
            value={questionCount}
            onChange={e => setQuestionCount(Number(e.target.value))}
            className="w-48 p-3 bg-white dark:bg-slate-700 border font-sans border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500 text-slate-900 dark:text-slate-100"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-4 pt-6">
          <button
            type="submit"
            disabled={questionCount <= 0}
            className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 disabled:bg-slate-400 disabled:shadow-none"
          >
            <SparklesIcon className="h-5 w-5" />
            Empezar Test
          </button>
        </div>
      </form>
    </div>
  );
};

export default PlannedQuizConfigurator;
