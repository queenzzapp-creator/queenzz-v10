
import React, { useState, useMemo } from 'react';
import { Flashcard } from '../types';
import { SparklesIcon, QueueListIcon, ArrowPathIcon } from './Icons';

interface FlashcardReviewConfiguratorProps {
  failedFlashcards: Flashcard[];
  onCreate: (cardsToReview: Flashcard[]) => void;
  onCancel: () => void;
}

const FlashcardReviewConfigurator: React.FC<FlashcardReviewConfiguratorProps> = ({ failedFlashcards, onCreate, onCancel }) => {
  const topics = useMemo(() => {
    const topicSet = new Set<string>();
    failedFlashcards.forEach(card => {
      if (card.sourceDeckTitle) {
        topicSet.add(card.sourceDeckTitle);
      }
    });
    return Array.from(topicSet);
  }, [failedFlashcards]);

  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(() => new Set(topics));

  const filteredFlashcards = useMemo(() => {
    return failedFlashcards.filter(card => selectedTopics.has(card.sourceDeckTitle || ''));
  }, [failedFlashcards, selectedTopics]);
  
  const [cardCount, setCardCount] = useState(Math.min(filteredFlashcards.length, 10));

  const handleTopicToggle = (topic: string) => {
    const newSelected = new Set(selectedTopics);
    if (newSelected.has(topic)) {
      newSelected.delete(topic);
    } else {
      newSelected.add(topic);
    }
    setSelectedTopics(newSelected);
    const newFilteredCount = failedFlashcards.filter(card => newSelected.has(card.sourceDeckTitle || '')).length;
    setCardCount(prev => Math.min(prev, newFilteredCount));
  };
  
  const handleSelectAll = () => setSelectedTopics(new Set(topics));
  const handleDeselectAll = () => setSelectedTopics(new Set());

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let count = Number(e.target.value);
    if (count > filteredFlashcards.length) count = filteredFlashcards.length;
    if (count < 1 && filteredFlashcards.length > 0) count = 1;
    setCardCount(count);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardCount > 0) {
      // Create a shuffled sub-selection of cards to review
      const cardsToReview = [...filteredFlashcards].sort(() => 0.5 - Math.random()).slice(0, cardCount);
      onCreate(cardsToReview);
    }
  };

  return (
    <div className="animate-fade-in w-full max-w-3xl mx-auto dark:text-slate-200 flex flex-col h-full">
       <div className="flex-shrink-0">
         <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                  <QueueListIcon className="h-8 w-8 text-sky-500" />
                  Practicar Fichas Falladas
              </h2>
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <ArrowPathIcon className="h-5 w-5" />
                Volver
              </button>
        </div>

        <p className="text-slate-500 dark:text-slate-400 mb-2 font-sans">
          Has acumulado <span className="font-bold">{failedFlashcards.length}</span> ficha(s) para repasar.
        </p>
        <p className="text-slate-500 dark:text-slate-400 mb-8 font-sans">
          Filtra por tema (mazo) y elige cuántas quieres estudiar.
        </p>
      </div>

      {failedFlashcards.length > 0 ? (
        <form onSubmit={handleSubmit} className="flex-grow flex flex-col space-y-6 bg-white/50 dark:bg-slate-800/50 p-6 sm:p-8 rounded-lg border border-slate-200 dark:border-slate-700 min-h-0">
           <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-6 pb-4">
              <div>
                <h3 className="text-lg font-semibold mb-3">Filtrar por Tema</h3>
                <div className="flex gap-2 mb-3">
                    <button type="button" onClick={handleSelectAll} className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">Seleccionar todo</button>
                    <button type="button" onClick={handleDeselectAll} className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">Deseleccionar todo</button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-slate-50/70 dark:bg-slate-900/40 rounded-md border border-slate-200 dark:border-slate-600">
                    {topics.map(topic => (
                        <label key={topic} className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-700/50 cursor-pointer">
                            <input 
                                type="checkbox"
                                checked={selectedTopics.has(topic)}
                                onChange={() => handleTopicToggle(topic)}
                                className="h-4 w-4 rounded-sm bg-slate-100 border-slate-300 text-lime-600 focus:ring-lime-500"
                            />
                            <span className="text-sm font-medium">{topic}</span>
                        </label>
                    ))}
                </div>
              </div>

              <div>
                <label htmlFor="card-count" className="block text-sm font-medium mb-2 font-sans">
                  Número de fichas a repasar ({filteredFlashcards.length} disponibles)
                </label>
                <input
                  id="card-count"
                  type="number"
                  min="1"
                  max={filteredFlashcards.length}
                  value={cardCount}
                  onChange={handleCountChange}
                  disabled={filteredFlashcards.length === 0}
                  className="w-48 p-3 bg-white dark:bg-slate-700 border font-sans border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-colors duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-slate-900 dark:text-slate-100 disabled:bg-slate-100"
                />
              </div>
          </div>
          
          <div className="flex-shrink-0 mt-auto pt-6 border-t border-slate-200 dark:border-slate-700">
            <div className="flex justify-end gap-4">
                <button
                type="submit"
                disabled={cardCount === 0 || filteredFlashcards.length === 0}
                className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-500 dark:focus:ring-offset-slate-900 transition-all duration-200 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none font-sans"
                >
                <SparklesIcon className="h-5 w-5" />
                Empezar Repaso
                </button>
            </div>
          </div>
        </form>
      ) : (
         <div className="text-center py-12 px-6 bg-slate-50/70 dark:bg-slate-800/40 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
            <p className="font-sans">¡Felicidades! No tienes fichas para repasar.</p>
            <button
              onClick={onCancel}
              className="mt-4 px-6 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md shadow-sm text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 font-sans transition-colors"
            >
              Volver
            </button>
        </div>
      )}
    </div>
  );
};

export default FlashcardReviewConfigurator;
