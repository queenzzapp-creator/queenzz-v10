import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types.ts';
import { PlusCircleIcon, TrashIcon, CheckCircleIcon, XMarkIcon, PencilSquareIcon } from './Icons.tsx';

interface QuestionEditorModalProps {
    onSave: (question: QuizQuestion, position?: number) => void;
    onClose: () => void;
    questionToEdit?: QuizQuestion;
    totalQuestions?: number;
}

const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({ onSave, onClose, questionToEdit, totalQuestions }) => {
    const [question, setQuestion] = useState<QuizQuestion>(
        questionToEdit || {
            id: crypto.randomUUID(),
            question: '',
            options: ['', '', '', ''],
            correctAnswer: '',
            explanation: '',
        }
    );
    const [position, setPosition] = useState((totalQuestions || 0) + 1);
    const [error, setError] = useState('');
    
    useEffect(() => {
        if(questionToEdit) {
            setQuestion(questionToEdit);
        }
    }, [questionToEdit]);

    useEffect(() => {
        if (totalQuestions !== undefined) {
            setPosition(totalQuestions + 1);
        }
    }, [totalQuestions]);

    const handleFieldChange = (field: keyof QuizQuestion, value: string) => {
        setQuestion(prev => ({ ...prev, [field]: value }));
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...question.options];
        newOptions[index] = value;
        if (question.correctAnswer === question.options[index]) {
            setQuestion(prev => ({ ...prev, options: newOptions, correctAnswer: value }));
        } else {
            setQuestion(prev => ({ ...prev, options: newOptions }));
        }
    };

    const handleCorrectAnswerChange = (optionValue: string) => {
        setQuestion(prev => ({...prev, correctAnswer: optionValue}));
    };

    const handleAddOption = () => {
        if (question.options.length < 5) {
            setQuestion(prev => ({ ...prev, options: [...prev.options, ''] }));
        }
    };

    const handleRemoveOption = (index: number) => {
        if (question.options.length > 2) {
            const removedOption = question.options[index];
            const newOptions = question.options.filter((_, i) => i !== index);
            setQuestion(prev => ({
                ...prev,
                options: newOptions,
                correctAnswer: prev.correctAnswer === removedOption ? '' : prev.correctAnswer
            }));
        }
    };

    const handleSubmit = () => {
        setError('');
        if (!question.question.trim()) { setError('El enunciado no puede estar vacío.'); return; }
        if (question.options.some(opt => !opt.trim())) { setError('Todas las opciones deben tener contenido.'); return; }
        if (!question.correctAnswer) { setError('Debes seleccionar una respuesta correcta.'); return; }
        if (!question.explanation.trim()) { setError('La explicación no puede estar vacía.'); return; }
        
        onSave(question, questionToEdit ? undefined : position);
    };

    return (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="relative bg-[#FAF8F1] dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-6 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        {questionToEdit ? <PencilSquareIcon className="h-7 w-7 text-lime-500" /> : <PlusCircleIcon className="h-7 w-7 text-lime-500" />}
                        {questionToEdit ? 'Editar Pregunta' : 'Añadir Pregunta'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"><XMarkIcon className="h-6 w-6" /></button>
                </header>
                
                <div className="p-6 flex-grow overflow-y-auto space-y-4">
                    {!questionToEdit && totalQuestions !== undefined && (
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <label htmlFor="position-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Posición de la nueva pregunta
                            </label>
                            <div className="flex items-center gap-2">
                                <input 
                                    id="position-input"
                                    type="number" 
                                    value={position} 
                                    onChange={e => {
                                        const val = Number(e.target.value);
                                        if (val >= 1 && val <= totalQuestions + 1) {
                                            setPosition(val);
                                        }
                                    }}
                                    min="1"
                                    max={totalQuestions + 1}
                                    className="w-24 p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"
                                />
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    (de 1 a {totalQuestions + 1})
                                </span>
                            </div>
                        </div>
                    )}
                    <textarea value={question.question} onChange={e => handleFieldChange('question', e.target.value)} rows={3} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md" placeholder="Enunciado de la pregunta" />
                    
                    <div className="space-y-2">
                        {question.options.map((opt, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input type="radio" name="correct-answer" checked={question.correctAnswer === opt && opt !== ''} onChange={() => handleCorrectAnswerChange(opt)} className="h-4 w-4 text-lime-600 focus:ring-lime-500" />
                                <input type="text" value={opt} onChange={e => handleOptionChange(index, e.target.value)} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md" placeholder={`Opción ${index + 1}`} />
                                <button type="button" onClick={() => handleRemoveOption(index)} disabled={question.options.length <= 2} className="p-1 text-red-500 rounded-full hover:bg-red-100 disabled:opacity-30"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddOption} disabled={question.options.length >= 5} className="text-xs font-semibold text-lime-600 hover:underline disabled:opacity-50 ml-6">Añadir opción</button>
                    </div>
                    
                    <textarea value={question.explanation} onChange={e => handleFieldChange('explanation', e.target.value)} rows={2} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md" placeholder="Explicación de la respuesta correcta" />
                </div>

                <footer className="flex-shrink-0 flex justify-between items-center gap-4 p-6 border-t border-slate-200 dark:border-slate-700">
                    {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
                    <div className="flex gap-4 ml-auto">
                        <button onClick={onClose} className="px-5 py-2 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-slate-200/70 hover:bg-slate-300/70">Cancelar</button>
                        <button onClick={handleSubmit} className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-md text-white bg-lime-600 hover:bg-lime-700">
                            <CheckCircleIcon className="h-5 w-5" /> Guardar Pregunta
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default QuestionEditorModal;