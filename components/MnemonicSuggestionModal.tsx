
import React from 'react';
import { QuizQuestion } from '../types';
import { BrainIcon, LightBulbIcon } from './Icons';

interface MnemonicSuggestionModalProps {
  question: QuizQuestion;
  onConfirm: (question: QuizQuestion) => void;
  onDismiss: () => void;
}

const MnemonicSuggestionModal: React.FC<MnemonicSuggestionModalProps> = ({ question, onConfirm, onDismiss }) => {
  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onDismiss}>
      <div className="relative bg-[#FAF8F1] dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-8 text-center" onClick={e => e.stopPropagation()}>
        <LightBulbIcon className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">¿Necesitas Ayuda para Recordar?</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-4 mb-2">
          Hemos notado que has tenido dificultades con esta pregunta:
        </p>
        <p className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 mb-6 italic">
          "{question.question}"
        </p>
        <p className="text-slate-600 dark:text-slate-400 mt-2 mb-6">
          ¿Te gustaría crear una regla mnemotécnica para que no se te vuelva a olvidar?
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onDismiss}
            className="px-6 py-3 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-700/70 hover:bg-slate-300/70 dark:hover:bg-slate-600/70 transition-colors"
          >
            No, gracias
          </button>
          <button
            onClick={() => onConfirm(question)}
            className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-sm font-bold rounded-md shadow-lg shadow-amber-500/30 text-white bg-amber-500 hover:bg-amber-600"
          >
            <BrainIcon className="h-5 w-5" />
            Crear Regla
          </button>
        </div>
      </div>
    </div>
  );
};

export default MnemonicSuggestionModal;
