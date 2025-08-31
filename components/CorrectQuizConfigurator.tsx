import React from 'react';
import { SparklesIcon, ArrowPathIcon, CheckCircleIcon } from './Icons';

interface CorrectQuizConfiguratorProps {
  onStart: () => void;
  onCancel: () => void;
  correctQuestionsCount: number;
}

const CorrectQuizConfigurator: React.FC<CorrectQuizConfiguratorProps> = ({ onStart, onCancel, correctQuestionsCount }) => {
  const hasQuestions = correctQuestionsCount > 0;

  return (
    <div className="animate-fade-in w-full max-w-2xl mx-auto flex flex-col h-full">
      <div className="flex-shrink-0">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
            Repasar Acertadas
          </h2>
          <button
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Volver
          </button>
        </div>
      </div>
      
      <div className="flex-grow flex flex-col items-center justify-center text-center">
        {hasQuestions ? (
          <div>
            <p className="text-slate-500 dark:text-slate-400 mb-8 font-sans max-w-lg mx-auto">
              Has respondido correctamente a <span className="font-bold text-slate-700 dark:text-slate-100">{correctQuestionsCount}</span> pregunta(s). ¡Repásalas para consolidar tu conocimiento!
            </p>
            <button
              onClick={onStart}
              className="inline-flex items-center gap-3 px-8 py-4 border border-transparent text-lg font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-500 dark:focus:ring-offset-slate-900 transition-all duration-200 font-sans"
            >
              <SparklesIcon className="h-6 w-6" />
              Empezar Práctica
            </button>
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 mb-8 font-sans">
            No tienes preguntas acertadas para repasar todavía. ¡Sigue estudiando!
          </p>
        )}
      </div>
    </div>
  );
};

export default CorrectQuizConfigurator;
