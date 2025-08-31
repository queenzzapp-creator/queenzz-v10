import React, { useState } from 'react';
import { QuizQuestion } from '../types.ts';
import { PlusCircleIcon, XMarkIcon, CheckCircleIcon } from './Icons.tsx';

interface AddQuestionsModalProps {
  newQuestions: QuizQuestion[];
  onConfirm: (questionsToAdd: QuizQuestion[]) => void;
  onClose: () => void;
}

const QuestionPreview: React.FC<{ question: QuizQuestion, isSelected: boolean, onToggle: (e: React.MouseEvent) => void }> = ({ question, isSelected, onToggle }) => {
    return (
        <div 
            onClick={onToggle}
            className={`p-4 rounded-lg border transition-colors cursor-pointer ${isSelected ? 'bg-lime-50 dark:bg-lime-900/40 border-lime-300' : 'bg-white/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'}`}
        >
            <div className="flex items-start gap-3 pointer-events-none">
                <input type="checkbox" checked={isSelected} readOnly className="mt-1 h-4 w-4 rounded-sm text-lime-600 focus:ring-lime-500"/>
                <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{question.question}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Correcta: {question.correctAnswer}</p>
                </div>
            </div>
        </div>
    );
};

const AddQuestionsModal: React.FC<AddQuestionsModalProps> = ({ newQuestions, onConfirm, onClose }) => {
  const allIds = newQuestions.map(q => q.id);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(allIds));
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);

  const handleToggle = (questionId: string, event: React.MouseEvent) => {
    const newSelection = new Set(selectedIds);
    const isCurrentlySelected = newSelection.has(questionId);

    if (event.shiftKey && lastClickedId) {
        const lastIndex = newQuestions.findIndex(q => q.id === lastClickedId);
        const currentIndex = newQuestions.findIndex(q => q.id === questionId);
        if (lastIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            const targetState = !isCurrentlySelected;
            for (let i = start; i <= end; i++) {
                if (targetState) {
                    newSelection.add(newQuestions[i].id);
                } else {
                    newSelection.delete(newQuestions[i].id);
                }
            }
            setSelectedIds(newSelection);
            return;
        }
    }

    if (isCurrentlySelected) {
        newSelection.delete(questionId);
    } else {
        newSelection.add(questionId);
    }
    setSelectedIds(newSelection);
    setLastClickedId(questionId);
  };

  const handleSelectAll = () => {
      setSelectedIds(new Set(allIds));
      setLastClickedId(null);
  };
  const handleDeselectAll = () => {
      setSelectedIds(new Set());
      setLastClickedId(null);
  };
  
  const handleSubmit = () => {
    const questionsToAdd = newQuestions.filter(q => selectedIds.has(q.id));
    onConfirm(questionsToAdd);
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="relative bg-[#FAF8F1] dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <header className="flex-shrink-0 p-6 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <PlusCircleIcon className="h-7 w-7 text-lime-500" />
            Añadir Nuevas Preguntas
          </h2>
          <button onClick={onClose} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </header>
        
        <div className="p-6 flex-grow overflow-y-auto">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Se encontraron {newQuestions.length} preguntas nuevas en el documento. Selecciona las que quieres añadir al test.</p>
            <div className="flex justify-start gap-3 mb-4">
                 <button onClick={handleSelectAll} className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">Seleccionar Todas</button>
                 <button onClick={handleDeselectAll} className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">Deseleccionar Todas</button>
            </div>
            <div className="space-y-3">
                {newQuestions.map(q => (
                    <QuestionPreview key={q.id} question={q} isSelected={selectedIds.has(q.id)} onToggle={(e) => handleToggle(q.id, e)} />
                ))}
            </div>
        </div>
        
        <footer className="flex-shrink-0 flex justify-end gap-4 p-6 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="px-5 py-2 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-700/70 hover:bg-slate-300/70 dark:hover:bg-slate-600/70 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={selectedIds.size === 0} className="inline-flex items-center gap-2 px-5 py-2 border border-transparent text-sm font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 disabled:bg-slate-400 disabled:shadow-none">
            <CheckCircleIcon className="h-5 w-5" />
            Añadir {selectedIds.size} Pregunta(s)
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AddQuestionsModal;