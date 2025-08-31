import React, { useState, useMemo } from 'react';
import { QuizQuestion } from '../types';
import { ArrowPathIcon, BookOpenIcon, CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon, EyeIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';

interface ProgressPracticeConfiguratorProps {
  onCancel: () => void;
  correctQuestions: QuizQuestion[];
  failedQuestions: QuizQuestion[];
  unansweredQuestions: QuizQuestion[];
  onStartPractice: (config: {
    correct: { count: number; selectedTopics: string[] };
    failed: { count: number; selectedTopics: string[] };
    unanswered: { count: number; selectedTopics: string[] };
  }) => void;
  onViewQuestions: (questions: QuizQuestion[], title: string) => void;
}

const getTopics = (questions: QuizQuestion[]): string[] => Array.from(new Set(questions.map(q => q.sourceQuizTitle || 'Desconocido')));

const CategorySection: React.FC<{
  categoryKey: 'correct' | 'failed' | 'unanswered';
  label: string;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  color: string;
  questions: QuizQuestion[];
  count: number;
  selectedTopics: string[];
  onCountChange: (value: number) => void;
  onTopicToggle: (topic: string) => void;
  onViewQuestions: () => void;
}> = ({ categoryKey, label, Icon, color, questions, count, selectedTopics, onCountChange, onTopicToggle, onViewQuestions }) => {
  const [topicsVisible, setTopicsVisible] = useState(false);
  const allTopics = useMemo(() => getTopics(questions), [questions]);
  const filteredQuestions = useMemo(() => questions.filter(q => selectedTopics.includes(q.sourceQuizTitle || 'Desconocido')), [questions, selectedTopics]);

  return (
    <div className={`p-4 rounded-lg border bg-${color}-50/70 dark:bg-${color}-900/30 border-${color}-300 dark:border-${color}-800`}>
      <div className="flex items-center justify-between">
        <label htmlFor={`count-${categoryKey}`} className={`font-semibold text-slate-800 dark:text-slate-100`}>
          <Icon className={`inline h-5 w-5 mr-2 text-${color}-500`} />
          {label} ({filteredQuestions.length})
        </label>
        <button type="button" onClick={onViewQuestions} disabled={questions.length === 0} className="p-1.5 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40" title="Ver preguntas">
          <EyeIcon className="h-5 w-5"/>
        </button>
      </div>
      <input id={`count-${categoryKey}`} type="range" min="0" max={filteredQuestions.length} value={Math.min(count, filteredQuestions.length)} onChange={(e) => onCountChange(parseInt(e.target.value, 10))} disabled={questions.length === 0} className={`w-full h-2 mt-3 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-${color}-500`} />
      <div className="flex justify-between items-center mt-1">
        <button type="button" onClick={() => setTopicsVisible(p => !p)} disabled={allTopics.length === 0} className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
            Filtrar Temas {topicsVisible ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
        </button>
        <div className="text-right">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{Math.min(count, filteredQuestions.length)}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400"> / {filteredQuestions.length}</span>
        </div>
      </div>
      {topicsVisible && (
        <div className="mt-2 p-2 bg-slate-100/50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg max-h-32 overflow-y-auto space-y-1">
          {allTopics.map(topic => (
            <label key={topic} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-700/50 cursor-pointer text-sm">
              <input type="checkbox" checked={selectedTopics.includes(topic)} onChange={() => onTopicToggle(topic)} className="h-4 w-4 rounded-sm bg-slate-100 border-slate-300 text-lime-600 focus:ring-lime-500" />
              <span className="text-slate-700 dark:text-slate-200">{topic}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const ProgressPracticeConfigurator: React.FC<ProgressPracticeConfiguratorProps> = ({ onCancel, correctQuestions, failedQuestions, unansweredQuestions, onStartPractice, onViewQuestions, }) => {
  
  const [config, setConfig] = useState({
    correct: { count: 0, selectedTopics: getTopics(correctQuestions) },
    failed: { count: Math.min(10, failedQuestions.length), selectedTopics: getTopics(failedQuestions) },
    unanswered: { count: Math.min(10, unansweredQuestions.length), selectedTopics: getTopics(unansweredQuestions) },
  });

  const totalSelected = useMemo(() => {
    const correctFilteredCount = correctQuestions.filter(q => config.correct.selectedTopics.includes(q.sourceQuizTitle || 'Desconocido')).length;
    const failedFilteredCount = failedQuestions.filter(q => config.failed.selectedTopics.includes(q.sourceQuizTitle || 'Desconocido')).length;
    const unansweredFilteredCount = unansweredQuestions.filter(q => config.unanswered.selectedTopics.includes(q.sourceQuizTitle || 'Desconocido')).length;

    return Math.min(config.correct.count, correctFilteredCount) +
           Math.min(config.failed.count, failedFilteredCount) +
           Math.min(config.unanswered.count, unansweredFilteredCount);
  }, [config, correctQuestions, failedQuestions, unansweredQuestions]);

  const handleCountChange = (category: 'correct' | 'failed' | 'unanswered', value: number) => {
    setConfig(prev => ({ ...prev, [category]: { ...prev[category], count: value } }));
  };
  
  const handleTopicToggle = (category: 'correct' | 'failed' | 'unanswered', topic: string) => {
    setConfig(prev => {
        const newTopics = new Set(prev[category].selectedTopics);
        if (newTopics.has(topic)) newTopics.delete(topic);
        else newTopics.add(topic);
        return { ...prev, [category]: { ...prev[category], selectedTopics: Array.from(newTopics) }};
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartPractice(config);
  };
  
  const categoryConfigs = [
    { key: 'correct', Icon: CheckCircleIcon, color: 'green', questions: correctQuestions, label: 'Preguntas Acertadas' },
    { key: 'failed', Icon: XCircleIcon, color: 'red', questions: failedQuestions, label: 'Preguntas Falladas' },
    { key: 'unanswered', Icon: QuestionMarkCircleIcon, color: 'sky', questions: unansweredQuestions, label: 'Preguntas en Blanco' }
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in w-full max-w-2xl mx-auto flex flex-col h-full">
      <div className="flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <BookOpenIcon className="h-8 w-8 text-sky-500" />
            Práctica de Progreso
          </h2>
          <button type="button" onClick={onCancel} className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700">
            <ArrowPathIcon className="h-5 w-5" /> Volver
          </button>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mb-8 font-sans">
          Crea un test de práctica personalizado basado en tu historial de respuestas.
        </p>
      </div>

      <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-4 pb-4">
        {categoryConfigs.map(({ key, Icon, color, questions, label }) => (
          <CategorySection
            key={key}
            categoryKey={key}
            label={label}
            Icon={Icon}
            color={color}
            questions={questions}
            count={config[key].count}
            selectedTopics={config[key].selectedTopics}
            onCountChange={(value) => handleCountChange(key, value)}
            onTopicToggle={(topic) => handleTopicToggle(key, topic)}
            onViewQuestions={() => onViewQuestions(questions, label)}
          />
        ))}
      </div>

      <div className="flex-shrink-0 mt-auto pt-6 border-t border-slate-200 dark:border-slate-700">
        <div className="flex justify-end">
          <button type="submit" disabled={totalSelected === 0} className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 disabled:bg-slate-400 disabled:shadow-none">
            Empezar Práctica ({totalSelected})
          </button>
        </div>
      </div>
    </form>
  );
};

export default ProgressPracticeConfigurator;
