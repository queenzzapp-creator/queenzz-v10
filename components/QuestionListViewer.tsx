import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { ArrowPathIcon, BookOpenIcon } from './Icons';
import ImageZoomModal from './ImageZoomModal.tsx';

const QuestionCard: React.FC<{ question: QuizQuestion; index: number; onImageClick: (url: string) => void; }> = ({ question, index, onImageClick }) => {
  return (
    <div className="bg-white/60 dark:bg-slate-800/60 p-5 sm:p-6 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
      <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 leading-relaxed">
        {index + 1}. {question.question}
      </h3>
       {question.imageUrl && (
          <div className="mb-4 flex justify-center bg-slate-100 dark:bg-slate-900/50 p-2 rounded-lg">
              <button type="button" onClick={() => onImageClick(question.imageUrl!)} aria-label="Ampliar imagen">
                <img src={question.imageUrl} alt="Pregunta" className="max-w-full max-h-60 rounded-md object-contain cursor-zoom-in" />
              </button>
          </div>
      )}
      <div className="space-y-2 font-sans mb-4">
        {question.options.map((option, oIndex) => (
          <div
            key={oIndex}
            className={`flex items-start p-3 rounded-md border text-sm ${
              option === question.correctAnswer
                ? 'bg-green-100/70 dark:bg-green-900/40 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200 font-semibold'
                : 'bg-slate-50/60 dark:bg-slate-200/70 dark:border-slate-700/50 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span>{option}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-700/50">
        <p className="font-semibold text-lime-600 dark:text-lime-400 mb-1">Explicación:</p>
        <p className="text-slate-700 dark:text-slate-300 font-sans text-sm">{question.explanation}</p>
      </div>
    </div>
  );
};

const QuestionListViewer: React.FC<{
  title: string;
  questions: QuizQuestion[];
  onBack: () => void;
}> = ({ title, questions, onBack }) => {
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  return (
    <div className="animate-fade-in w-full max-w-4xl mx-auto flex flex-col h-full">
      <div className="flex-shrink-0">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <BookOpenIcon className="h-8 w-8 text-sky-500" />
            {title}
          </h2>
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Volver
          </button>
        </div>
      </div>
      
      <div className="flex-grow overflow-y-auto pr-2 -mr-2 pb-4">
        {questions.length > 0 ? (
          <div className="space-y-4">
            {questions.map((q, i) => <QuestionCard key={q.id || i} question={q} index={i} onImageClick={setZoomedImageUrl} />)}
          </div>
        ) : (
          <div className="text-center py-12 px-6 bg-slate-50/70 dark:bg-slate-800/40 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 font-sans">No hay preguntas para mostrar aquí.</p>
          </div>
        )}
      </div>
      {zoomedImageUrl && <ImageZoomModal imageUrl={zoomedImageUrl} onClose={() => setZoomedImageUrl(null)} />}
    </div>
  );
};

export default QuestionListViewer;