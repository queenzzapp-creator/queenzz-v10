
import React, { useState } from 'react';
import { FlashcardDeck, Flashcard } from '../types';
import { ArrowPathIcon, CheckCircleIcon, XCircleIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface FlashcardViewProps {
  deck: FlashcardDeck | { title: string; cards: Flashcard[] }; // Allow review decks
  onBack: () => void;
  onCorrect: (card: Flashcard) => void;
  onIncorrect: (card: Flashcard) => void;
}

const FlashcardView: React.FC<FlashcardViewProps> = ({ deck, onBack, onCorrect, onIncorrect }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerShown, setIsAnswerShown] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);

  if (!deck.cards || deck.cards.length === 0) {
    // This case should ideally be handled before rendering this component
    return <div>Mazo vacío</div>;
  }
  
  const currentCard = deck.cards[currentIndex];

  const handleNext = (isCorrect: boolean) => {
    if (isCorrect) {
      onCorrect(currentCard);
    } else {
      onIncorrect(currentCard);
    }
    
    setAnsweredCount(prev => prev + 1);

    if (currentIndex < deck.cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsAnswerShown(false);
    } else {
      // Last card answered, finish session
      onBack();
    }
  };

  const handleSkip = () => {
    if (currentIndex < deck.cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsAnswerShown(false);
    }
  }
  
  const progressPercentage = (answeredCount / deck.cards.length) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in flex flex-col h-full dark:text-slate-100">
      <header className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold truncate" title={deck.title}>{deck.title}</h2>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          Finalizar
        </button>
      </header>
      
      <main className="flex-grow flex items-center justify-center py-4">
        <div className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg p-6 sm:p-8 flex flex-col min-h-[350px]">
          <div className="flex-grow flex items-center justify-center text-center">
            <p className="text-2xl sm:text-3xl font-semibold">{currentCard.question}</p>
          </div>
          
          {isAnswerShown && (
            <div className="mt-6 pt-6 border-t border-dashed border-slate-300 dark:border-slate-600 animate-fade-in text-center">
               <p className="text-xl sm:text-2xl text-lime-600 dark:text-lime-400">{currentCard.answer}</p>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-4 flex-shrink-0">
        {!isAnswerShown ? (
           <button 
             onClick={() => setIsAnswerShown(true)}
             className="w-full py-4 bg-lime-600 hover:bg-lime-700 text-white font-bold rounded-lg transition-colors duration-200 shadow-lg shadow-lime-500/30 text-lg"
           >
             Mostrar Respuesta
           </button>
        ) : (
          <div className="grid grid-cols-2 gap-4 animate-fade-in">
            <button
                onClick={() => handleNext(false)}
                className="flex items-center justify-center gap-3 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors text-lg"
            >
                <XCircleIcon className="h-7 w-7" /> Incorrecto
            </button>
            <button
                onClick={() => handleNext(true)}
                className="flex items-center justify-center gap-3 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors text-lg"
            >
                <CheckCircleIcon className="h-7 w-7" /> Correcto
            </button>
          </div>
        )}
        
        {/* Navigation and Progress */}
        <div className="mt-6 flex justify-between items-center">
             <button onClick={handleSkip} disabled={currentIndex === deck.cards.length - 1} className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40">
                Saltar
            </button>
            <p className="font-semibold text-slate-600 dark:text-slate-400 font-sans">{currentIndex + 1} / {deck.cards.length}</p>
             <div className="w-1/3">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                    <div className="bg-lime-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default FlashcardView;
