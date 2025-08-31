
import React, { useState } from 'react';
import { QuizQuestion, GeneratedQuiz } from '../types';
import { SparklesIcon, XCircleIcon, CheckCircleIcon } from './Icons';

type Resolution = 'omit' | 'add';

interface DuplicateQuestionModalProps {
  quizData: GeneratedQuiz;
  duplicates: { existing: QuizQuestion, new: QuizQuestion }[];
  onResolve: (resolvedQuestions: QuizQuestion[]) => void;
  onCancel: () => void;
}

const DuplicateQuestionModal: React.FC<DuplicateQuestionModalProps> = ({ quizData, duplicates, onResolve, onCancel }) => {
  const [resolutions, setResolutions] = useState<Map<string, Resolution>>(() => new Map(duplicates.map(d => [d.new.id, 'omit'])));

  const handleResolutionChange = (questionId: string, resolution: Resolution) => {
    setResolutions(prev => new Map(prev).set(questionId, resolution));
  };

  const handleBulkAction = (resolution: Resolution) => {
    setResolutions(new Map(duplicates.map(d => [d.new.id, resolution])));
  };

  const handleSubmit = () => {
    const questionsToKeep = quizData.questions.filter(q => {
      const resolution = resolutions.get(q.id);
      // If it's not in the resolutions map, it's not a duplicate, so keep it.
      // If it is a duplicate, keep it only if the resolution is 'add'.
      return resolution === undefined || resolution === 'add';
    });
    onResolve(questionsToKeep);
  };
  
  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="relative bg-[#FAF8F1] dark:bg-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <header className="flex-shrink-0 p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <SparklesIcon className="h-7 w-7 text-amber-500" />
            Se Encontraron Preguntas Duplicadas
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Algunas de las preguntas generadas ya existen en tu biblioteca. Decide qué quieres hacer con ellas.</p>
        </header>
        
        <div className="p-6 flex-grow overflow-y-auto">
            <div className="flex justify-start gap-3 mb-4">
                 <button onClick={() => handleBulkAction('omit')} className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">Omitir Todas</button>
                 <button onClick={() => handleBulkAction('add')} className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">Añadir Todas</button>
            </div>

            <div className="space-y-4">
                {duplicates.map(({ new: newQuestion }, index) => (
                    <div key={newQuestion.id} className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="font-semibold text-slate-700 dark:text-slate-200 mb-3">{index + 1}. {newQuestion.question}</p>
                        <fieldset className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name={`res-${newQuestion.id}`} checked={resolutions.get(newQuestion.id) === 'omit'} onChange={() => handleResolutionChange(newQuestion.id, 'omit')} className="h-4 w-4 text-red-600 focus:ring-red-500"/>
                                <span className="text-sm text-red-600 dark:text-red-400 font-medium">Omitir</span>
                            </label>
                             <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name={`res-${newQuestion.id}`} checked={resolutions.get(newQuestion.id) === 'add'} onChange={() => handleResolutionChange(newQuestion.id, 'add')} className="h-4 w-4 text-lime-600 focus:ring-lime-500"/>
                                <span className="text-sm text-lime-600 dark:text-lime-400 font-medium">Añadir Igualmente</span>
                            </label>
                        </fieldset>
                    </div>
                ))}
            </div>
        </div>
        
        <footer className="flex-shrink-0 flex justify-end gap-4 p-6 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onCancel} className="px-5 py-2 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-700/70 hover:bg-slate-300/70 dark:hover:bg-slate-600/70 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="inline-flex items-center gap-2 px-5 py-2 border border-transparent text-sm font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700">
            <CheckCircleIcon className="h-5 w-5" />
            Confirmar y Guardar
          </button>
        </footer>
      </div>
    </div>
  );
};

export default DuplicateQuestionModal;
