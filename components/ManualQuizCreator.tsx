import React, { useState, useCallback } from 'react';
import { GeneratedQuiz, QuizQuestion, Flashcard, GeneratedFlashcardDeck } from '../types.ts';
import { PlusCircleIcon, TrashIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, BookOpenIcon, QueueListIcon } from './Icons.tsx';

// --- PROPS ---
interface ManualCreatorProps {
    onSaveQuiz: (quiz: GeneratedQuiz) => void;
    onSaveDeck: (deck: GeneratedFlashcardDeck) => void;
}

// --- QUIZ CREATOR ---
const emptyQuestion = (): QuizQuestion => ({
    id: crypto.randomUUID(),
    question: '',
    options: ['', ''],
    correctAnswer: '',
    explanation: '',
});

const QuizCreator: React.FC<{ onSave: (quiz: GeneratedQuiz) => void }> = ({ onSave }) => {
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState<QuizQuestion[]>([emptyQuestion()]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const handleAddQuestion = useCallback(() => {
        const newQuestions = [...questions, emptyQuestion()];
        setQuestions(newQuestions);
        setActiveIndex(newQuestions.length - 1);
    }, [questions]);
    
    const handleNext = useCallback(() => {
        if (activeIndex === questions.length - 1) {
            handleAddQuestion();
        } else {
            setActiveIndex(p => p + 1);
        }
    }, [activeIndex, questions.length, handleAddQuestion]);

    const handleQuestionChange = (index: number, field: 'question' | 'explanation', value: string) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };

    const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        const oldOptionValue = newQuestions[qIndex].options[oIndex];
        newQuestions[qIndex].options[oIndex] = value;
        if (newQuestions[qIndex].correctAnswer === oldOptionValue) {
            newQuestions[qIndex].correctAnswer = value;
        }
        setQuestions(newQuestions);
    };
    
    const handleCorrectAnswerChange = (qIndex: number, value: string) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].correctAnswer = value;
        setQuestions(newQuestions);
    };

    const handleRemoveQuestion = (index: number) => {
        if (questions.length > 1) {
            const newQuestions = questions.filter((_, i) => i !== index);
            setQuestions(newQuestions);
            setActiveIndex(prev => Math.max(0, prev - 1));
        }
    };
    
    const handleAddOption = (qIndex: number) => {
        const newQuestions = [...questions];
        if (newQuestions[qIndex].options.length < 5) {
            newQuestions[qIndex].options.push('');
            setQuestions(newQuestions);
        }
    };

    const handleRemoveOption = (qIndex: number, oIndex: number) => {
        const newQuestions = [...questions];
        const question = newQuestions[qIndex];
        if (question.options.length > 2) {
            const removedOption = question.options[oIndex];
            question.options.splice(oIndex, 1);
            if (question.correctAnswer === removedOption) {
                question.correctAnswer = '';
            }
            setQuestions(newQuestions);
        }
    };

    const validateQuiz = (): boolean => {
        if (!title.trim()) { setError("El título del test no puede estar vacío."); return false; }
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.question.trim()) { setError(`El enunciado de la pregunta ${i + 1} no puede estar vacío.`); setActiveIndex(i); return false; }
            if (q.options.some(opt => !opt.trim())) { setError(`Todas las opciones de la pregunta ${i + 1} deben tener contenido.`); setActiveIndex(i); return false; }
            if (!q.correctAnswer) { setError(`Debes seleccionar una respuesta correcta para la pregunta ${i + 1}.`); setActiveIndex(i); return false; }
            if (!q.explanation.trim()) { setError(`La explicación de la pregunta ${i + 1} no puede estar vacía.`); setActiveIndex(i); return false; }
        }
        setError(null);
        return true;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateQuiz()) {
            const finalQuestions = questions.map(q => ({
                ...q,
                question: q.question.replace(/\s*\[\d+\]\s*/g, ' ').trim(),
                explanation: q.explanation.replace(/\s*\[\d+\]\s*/g, ' ').trim(),
            }));
            const finalQuiz: GeneratedQuiz = { title: title.trim(), questions: finalQuestions };
            onSave(finalQuiz);
        }
    };
    
    const currentQuestion = questions[activeIndex];

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-4 animate-fade-in">
            <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-4 pb-4">
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Título del Test de Opciones..."
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500 font-sans text-slate-900 dark:text-slate-100"
                    required
                />
                <div className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={() => setActiveIndex(p => Math.max(0, p - 1))} disabled={activeIndex === 0} className="p-1 rounded-full disabled:opacity-30 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronLeftIcon className="h-6 w-6" /></button>
                        <h3 className="font-bold text-lg text-lime-600 dark:text-lime-400">Pregunta {activeIndex + 1} / {questions.length}</h3>
                        <button type="button" onClick={handleNext} className="p-1 rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronRightIcon className="h-6 w-6" /></button>
                    </div>
                    <div className="space-y-4 pt-2">
                        <textarea id={`q-${activeIndex}-question`} rows={2} value={currentQuestion.question} onChange={(e) => handleQuestionChange(activeIndex, 'question', e.target.value)} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-lime-500 text-slate-900 dark:text-slate-100" placeholder="Enunciado de la pregunta" required />
                        <div className="space-y-2">
                            {currentQuestion.options.map((opt, oIndex) => (
                                <div key={oIndex} className="flex items-center gap-2">
                                    <input type="radio" name={`q-${activeIndex}-correct`} id={`q-${activeIndex}-o-${oIndex}`} checked={currentQuestion.correctAnswer === opt && opt !== ''} onChange={() => handleCorrectAnswerChange(activeIndex, opt)} className="h-4 w-4 text-lime-600 focus:ring-lime-500" />
                                    <input type="text" value={opt} onChange={(e) => handleOptionChange(activeIndex, oIndex, e.target.value)} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-lime-500 text-slate-900 dark:text-slate-100" placeholder={`Opción ${oIndex + 1}`} required />
                                    <button type="button" onClick={() => handleRemoveOption(activeIndex, oIndex)} disabled={currentQuestion.options.length <= 2} className="p-1 text-red-500 rounded-full hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed"><TrashIcon className="h-4 w-4" /></button>
                                </div>
                            ))}
                             <button type="button" onClick={() => handleAddOption(activeIndex)} disabled={currentQuestion.options.length >= 5} className="text-xs font-semibold text-lime-600 hover:underline disabled:opacity-50 ml-6">Añadir opción</button>
                        </div>
                        <textarea id={`q-${activeIndex}-explanation`} rows={2} value={currentQuestion.explanation} onChange={(e) => handleQuestionChange(activeIndex, 'explanation', e.target.value)} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-lime-500 text-slate-900 dark:text-slate-100" placeholder="Explicación de la respuesta" required />
                    </div>
                </div>
            </div>
            <div className="flex-shrink-0 mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={handleAddQuestion} className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md text-slate-600 bg-white/50 hover:bg-slate-100 font-sans"><PlusCircleIcon className="h-4 w-4" />Añadir</button>
                        {questions.length > 1 && <button type="button" onClick={() => handleRemoveQuestion(activeIndex)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 text-xs font-medium"><TrashIcon className="h-4 w-4" />Eliminar</button>}
                    </div>
                    <div className="flex flex-col items-end">
                        {error && <p className="text-red-600 text-sm font-sans mb-2 text-right">{error}</p>}
                        <button type="submit" className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 font-sans"><CheckCircleIcon className="h-5 w-5" />Guardar Test</button>
                    </div>
                </div>
            </div>
        </form>
    );
};

// --- FLASHCARD CREATOR ---
const emptyCard = (): Flashcard => ({ id: crypto.randomUUID(), question: '', answer: '' });

const FlashcardCreator: React.FC<{ onSave: (deck: GeneratedFlashcardDeck) => void }> = ({ onSave }) => {
    const [title, setTitle] = useState('');
    const [cards, setCards] = useState<Flashcard[]>([emptyCard()]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const handleCardChange = (index: number, field: 'question' | 'answer', value: string) => {
        const newCards = [...cards];
        newCards[index][field] = value;
        setCards(newCards);
    };

    const handleAddCard = useCallback(() => {
        const newCards = [...cards, emptyCard()];
        setCards(newCards);
        setActiveIndex(newCards.length - 1);
    }, [cards]);

    const handleNext = useCallback(() => {
        if (activeIndex === cards.length - 1) {
            handleAddCard();
        } else {
            setActiveIndex(p => p + 1);
        }
    }, [activeIndex, cards.length, handleAddCard]);
    
    const handleRemoveCard = (index: number) => {
        if (cards.length > 1) {
            const newCards = cards.filter((_, i) => i !== index);
            setCards(newCards);
            setActiveIndex(prev => Math.max(0, prev - 1));
        }
    };

    const validateDeck = (): boolean => {
        if (!title.trim()) { setError("El título del mazo no puede estar vacío."); return false; }
        for (let i = 0; i < cards.length; i++) {
            if (!cards[i].question.trim() || !cards[i].answer.trim()) {
                setError(`La pregunta y la respuesta de la ficha ${i + 1} no pueden estar vacías.`);
                setActiveIndex(i);
                return false;
            }
        }
        setError(null);
        return true;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateDeck()) {
            const finalDeck: GeneratedFlashcardDeck = { 
                title: title.trim(), 
                cards: cards.map(c => ({ question: c.question, answer: c.answer })) 
            };
            onSave(finalDeck);
        }
    };
    
    const currentCard = cards[activeIndex];

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-4 animate-fade-in">
            <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-4 pb-4">
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Título del Mazo de Fichas..."
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500 font-sans text-slate-900 dark:text-slate-100"
                    required
                />
                <div className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={() => setActiveIndex(p => Math.max(0, p - 1))} disabled={activeIndex === 0} className="p-1 rounded-full disabled:opacity-30 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronLeftIcon className="h-6 w-6" /></button>
                        <h3 className="font-bold text-lg text-lime-600 dark:text-lime-400">Ficha {activeIndex + 1} / {cards.length}</h3>
                        <button type="button" onClick={handleNext} className="p-1 rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronRightIcon className="h-6 w-6" /></button>
                    </div>
                    {currentCard && (
                        <div className="space-y-4 pt-2">
                            <textarea value={currentCard.question} onChange={e => handleCardChange(activeIndex, 'question', e.target.value)} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-lime-500 text-slate-900 dark:text-slate-100" placeholder="Pregunta (Anverso)" rows={3} required />
                            <textarea value={currentCard.answer} onChange={e => handleCardChange(activeIndex, 'answer', e.target.value)} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-lime-500 text-slate-900 dark:text-slate-100" placeholder="Respuesta (Reverso)" rows={3} required />
                        </div>
                    )}
                </div>
            </div>

             <div className="flex-shrink-0 mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={handleAddCard} className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md text-slate-600 bg-white/50 hover:bg-slate-100 font-sans"><PlusCircleIcon className="h-4 w-4" />Añadir Ficha</button>
                        {cards.length > 1 && <button type="button" onClick={() => handleRemoveCard(activeIndex)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 text-xs font-medium"><TrashIcon className="h-4 w-4" />Eliminar Ficha</button>}
                    </div>
                    <div className="flex flex-col items-end">
                        {error && <p className="text-red-600 text-sm font-sans mb-2 text-right">{error}</p>}
                        <button type="submit" className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 font-sans"><CheckCircleIcon className="h-5 w-5" />Guardar Mazo</button>
                    </div>
                </div>
            </div>
        </form>
    );
};


// --- MAIN COMPONENT ---
const ManualCreator: React.FC<ManualCreatorProps> = ({ onSaveQuiz, onSaveDeck }) => {
    const [creatorType, setCreatorType] = useState<'quiz' | 'deck'>('quiz');

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 font-sans">1. Elige qué quieres crear</label>
                <div className="flex gap-4">
                    <button type="button" onClick={() => setCreatorType('quiz')} className={`flex items-center gap-3 p-3 border rounded-lg transition-colors w-1/2 ${creatorType === 'quiz' ? 'bg-lime-50 dark:bg-lime-900/50 border-lime-500 ring-2 ring-lime-200 dark:ring-lime-800' : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        <BookOpenIcon className="h-6 w-6 text-lime-600 dark:text-lime-400" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">Test de Opciones</span>
                    </button>
                    <button type="button" onClick={() => setCreatorType('deck')} className={`flex items-center gap-3 p-3 border rounded-lg transition-colors w-1/2 ${creatorType === 'deck' ? 'bg-lime-50 dark:bg-lime-900/50 border-lime-500 ring-2 ring-lime-200 dark:ring-lime-800' : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        <QueueListIcon className="h-6 w-6 text-lime-600 dark:text-lime-400" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">Fichas de Estudio</span>
                    </button>
                </div>
            </div>

            <div className="flex-grow flex flex-col min-h-0">
                 <h3 className="flex-shrink-0 text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 font-sans">2. Añade el contenido</h3>
                <div className="flex-grow overflow-hidden">
                    {creatorType === 'quiz' ? <QuizCreator onSave={onSaveQuiz} /> : <FlashcardCreator onSave={onSaveDeck} />}
                </div>
            </div>
        </div>
    );
};

export default ManualCreator;