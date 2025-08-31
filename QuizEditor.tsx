
import React, { useState, useRef } from 'react';
import { SavedQuiz, QuizQuestion, MnemonicRule } from '../types';
import { BookOpenIcon, CheckCircleIcon, ArrowPathIcon, DocumentMagnifyingGlassIcon, BrainIcon, PlusCircleIcon, TrashIcon, PencilSquareIcon, XMarkIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowUturnLeftIcon } from './Icons';

interface ImageCropperModalProps {
  imageUrl: string;
  onCrop: (newImageUrl: string) => void;
  onClose: () => void;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ imageUrl, onCrop, onClose }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));
  const handleZoomReset = () => setScale(1);

  const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    if (!imageRef.current) return null;
    const rect = imageRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Calculate coordinates relative to the image element
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getCoords(e);
    if (!coords) return;
    setIsDragging(true);
    setStartPos(coords);
    setCrop({ x: coords.x, y: coords.y, width: 0, height: 0 });
  };

  const handleInteractionMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !startPos) return;
    e.preventDefault();
    const coords = getCoords(e);
    if (!coords) return;

    const x = Math.min(startPos.x, coords.x);
    const y = Math.min(startPos.y, coords.y);
    const width = Math.abs(startPos.x - coords.x);
    const height = Math.abs(startPos.y - coords.y);

    setCrop({ x, y, width, height });
  };

  const handleInteractionEnd = () => {
    setIsDragging(false);
    setStartPos(null);
  };

  const handleCrop = () => {
    if (!crop || !imageRef.current || crop.width < 10 || crop.height < 10) {
      onClose();
      return;
    }

    const image = imageRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const canvas = document.createElement('canvas');
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error("Could not get canvas context");
      onClose();
      return;
    }

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    onCrop(canvas.toDataURL('image/jpeg'));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="relative bg-[#FAF8F1] dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
        <header className="flex-shrink-0 p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Ajustar Imagen</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleZoomOut} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"><MagnifyingGlassMinusIcon className="h-5 w-5"/></button>
            <button onClick={handleZoomReset} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"><ArrowUturnLeftIcon className="h-5 w-5"/></button>
            <button onClick={handleZoomIn} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"><MagnifyingGlassPlusIcon className="h-5 w-5"/></button>
            <button onClick={onClose} className="p-2 ml-4 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"><XMarkIcon className="h-6 w-6" /></button>
          </div>
        </header>
        <main className="flex-grow p-4 overflow-auto flex justify-center items-center bg-slate-100 dark:bg-slate-800/50">
          <div
            ref={containerRef}
            className="relative cursor-crosshair"
            onMouseDown={handleInteractionStart}
            onMouseMove={handleInteractionMove}
            onMouseUp={handleInteractionEnd}
            onMouseLeave={handleInteractionEnd}
            onTouchStart={handleInteractionStart}
            onTouchMove={handleInteractionMove}
            onTouchEnd={handleInteractionEnd}
          >
            <img ref={imageRef} src={imageUrl} style={{ transform: `scale(${scale})`, transformOrigin: 'center' }} className="max-w-full max-h-full object-contain select-none transition-transform duration-150" alt="Recortar imagen" />
            {crop && (
              <div
                className="absolute border-2 border-dashed border-lime-500 bg-lime-500/20 pointer-events-none"
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.width,
                  height: crop.height,
                }}
              />
            )}
          </div>
        </main>
        <footer className="flex-shrink-0 flex justify-end gap-4 p-4 border-t border-slate-200 dark:border-slate-700">
            <button onClick={onClose} className="px-5 py-2 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-700/70 hover:bg-slate-300/70 dark:hover:bg-slate-600/70 transition-colors">
              Cancelar
            </button>
            <button onClick={handleCrop} disabled={!crop || crop.width < 10 || crop.height < 10} className="inline-flex items-center gap-2 px-5 py-2 border border-transparent text-sm font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 disabled:bg-slate-400 disabled:shadow-none">
              <CheckCircleIcon className="h-5 w-5" />
              Aplicar Recorte
            </button>
        </footer>
      </div>
    </div>
  );
};


interface QuizEditorProps {
  quiz: SavedQuiz;
  onSave: (updatedQuiz: SavedQuiz) => void;
  onCancel: () => void;
  onViewSource: (question: QuizQuestion) => void;
  mnemonicsByQuestionId: Map<string, MnemonicRule>;
  onViewMnemonic: (rule: MnemonicRule) => void;
  onAddMoreQuestions: (quiz: SavedQuiz) => void;
}

const QuizEditor: React.FC<QuizEditorProps> = ({ quiz, onSave, onCancel, onViewSource, mnemonicsByQuestionId, onViewMnemonic, onAddMoreQuestions }) => {
  const [editedQuiz, setEditedQuiz] = useState<SavedQuiz>({ ...quiz });
  const [croppingQuestion, setCroppingQuestion] = useState<QuizQuestion | null>(null);
  const sourceFileId = quiz.questions[0]?.sourceFileId;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedQuiz(prev => ({ ...prev, title: e.target.value }));
  };

  const handleQuestionChange = (index: number, field: keyof QuizQuestion, value: string | string[]) => {
    const newQuestions = [...editedQuiz.questions];
    (newQuestions[index] as any)[field] = value;
    setEditedQuiz(prev => ({ ...prev, questions: newQuestions }));
  };
  
  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...editedQuiz.questions];
    const oldOptionValue = newQuestions[qIndex].options[oIndex];
    newQuestions[qIndex].options[oIndex] = value;
    if (newQuestions[qIndex].correctAnswer === oldOptionValue) {
        newQuestions[qIndex].correctAnswer = value;
    }
    setEditedQuiz(prev => ({ ...prev, questions: newQuestions }));
  };
  
  const handleCorrectAnswerChange = (qIndex: number, value: string) => {
    const newQuestions = [...editedQuiz.questions];
    newQuestions[qIndex].correctAnswer = value;
    setEditedQuiz(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleAddOption = (qIndex: number) => {
    const newQuestions = [...editedQuiz.questions];
    if (newQuestions[qIndex].options.length < 5) {
        newQuestions[qIndex].options.push('');
        setEditedQuiz(prev => ({ ...prev, questions: newQuestions }));
    }
  };

  const handleRemoveOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...editedQuiz.questions];
    const question = newQuestions[qIndex];
    if (question.options.length > 2) {
        const removedOption = question.options[oIndex];
        question.options.splice(oIndex, 1);
        if (question.correctAnswer === removedOption) {
            question.correctAnswer = '';
        }
        setEditedQuiz(prev => ({ ...prev, questions: newQuestions }));
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedQuiz);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="animate-fade-in flex flex-col h-full">
        <div className="flex-shrink-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <BookOpenIcon className="h-8 w-8 text-sky-500" />
              Editando Test
            </h2>
             <div className="flex items-center gap-2">
                {sourceFileId && (
                <button
                    type="button"
                    onClick={() => onAddMoreQuestions(quiz)}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-sky-300 dark:border-sky-600 text-sm font-bold rounded-md text-sky-600 dark:text-sky-300 bg-sky-50/50 dark:bg-sky-900/30 hover:bg-sky-100 dark:hover:bg-sky-800/50 transition-colors"
                >
                    <MagnifyingGlassPlusIcon className="h-5 w-5" />
                    Añadir más preguntas
                </button>
                )}
                <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                    <ArrowPathIcon className="h-5 w-5" />
                    Volver
                </button>
             </div>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-8 pb-4">
          <div>
            <label htmlFor="quiz-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 font-sans">
              Título del Test
            </label>
            <input
              id="quiz-title"
              type="text"
              value={editedQuiz.title}
              onChange={handleTitleChange}
              className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-colors duration-200 font-sans text-slate-900 dark:text-slate-100"
            />
          </div>

          {editedQuiz.questions.map((q, qIndex) => {
              const mnemonic = mnemonicsByQuestionId.get(q.id);
              return (
                <div key={q.id} className="p-6 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex justify-between items-center">
                      <h3 className="font-bold text-lg text-lime-600 dark:text-lime-400">Pregunta {qIndex + 1}</h3>
                      <div className="flex-shrink-0 flex items-center">
                          {mnemonic && (
                              <button 
                                  type="button"
                                  onClick={() => onViewMnemonic(mnemonic)}
                                  className="p-2 text-slate-400 hover:text-amber-500 dark:text-slate-500 dark:hover:text-amber-400 transition-colors rounded-full"
                                  title="Ver Regla Mnemotécnica"
                              >
                                  <BrainIcon className="h-5 w-5" />
                              </button>
                          )}
                          {q.sourceFileId && (
                              <button 
                                  type="button"
                                  onClick={() => onViewSource(q)}
                                  className="p-2 text-slate-400 hover:text-sky-500 dark:text-slate-500 dark:hover:text-sky-400 transition-colors rounded-full"
                                  title={q.sourcePage ? `Ver fuente (Página ${q.sourcePage})` : 'Ver fuente'}
                              >
                                  <DocumentMagnifyingGlassIcon className="h-5 w-5" />
                              </button>
                          )}
                      </div>
                  </div>
                  
                  {q.imageUrl && (
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex justify-center bg-slate-100 dark:bg-slate-900/50 p-2 rounded-lg">
                            <img src={q.imageUrl} alt="Pregunta" className="max-w-full max-h-60 rounded-md object-contain" />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setCroppingQuestion(q)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-300 bg-sky-100/70 dark:bg-sky-800/50 rounded-md hover:bg-sky-200/70 dark:hover:bg-sky-700/50"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                          Ajustar Imagen
                        </button>
                    </div>
                  )}
                  {!q.imageUrl && q.sourcePageImage && (
                    <div className="mt-2 flex justify-center">
                        <button 
                            type="button"
                            onClick={() => setCroppingQuestion(q)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-green-600 dark:text-green-300 bg-green-100/70 dark:bg-green-800/50 rounded-lg hover:bg-green-200/70 dark:hover:bg-green-700/50 border border-green-200 dark:border-green-700"
                        >
                            <PlusCircleIcon className="h-5 w-5" />
                            Añadir Imagen desde Documento
                        </button>
                    </div>
                  )}
                  
                  <div className="font-sans">
                    <label htmlFor={`q-${qIndex}-question`} className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Enunciado
                    </label>
                    <textarea
                      id={`q-${qIndex}-question`}
                      rows={3}
                      value={q.question}
                      onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                      className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-lime-500 transition-colors text-slate-900 dark:text-slate-200"
                    />
                  </div>

                  <div className="font-sans">
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Opciones (marca la correcta)
                    </label>
                    <div className="space-y-2">
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`q-${qIndex}-correct`}
                            id={`q-${qIndex}-o-${oIndex}`}
                            checked={q.correctAnswer === opt && opt !== ''}
                            onChange={() => handleCorrectAnswerChange(qIndex, opt)}
                            className="h-4 w-4 text-lime-600 bg-slate-100 border-slate-300 focus:ring-lime-500"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                            className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-lime-500 transition-colors text-slate-900 dark:text-slate-200"
                          />
                           <button type="button" onClick={() => handleRemoveOption(qIndex, oIndex)} disabled={q.options.length <= 2} className="p-1 text-red-500 rounded-full hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed"><TrashIcon className="h-4 w-4" /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => handleAddOption(qIndex)} disabled={q.options.length >= 5} className="ml-6 text-xs font-semibold text-lime-600 hover:underline disabled:opacity-50">Añadir opción</button>
                    </div>
                  </div>

                   <div className="font-sans">
                    <label htmlFor={`q-${qIndex}-explanation`} className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Explicación
                    </label>
                    <textarea
                      id={`q-${qIndex}-explanation`}
                      rows={2}
                      value={q.explanation}
                      onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                      className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-lime-500 transition-colors text-slate-900 dark:text-slate-200"
                    />
                  </div>
                </div>
              )
          })}
        </div>
          
        <div className="flex-shrink-0 mt-auto pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex justify-end gap-4">
              <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 font-sans"
              >
                  <CheckCircleIcon className="h-5 w-5" />
                  Guardar Cambios
              </button>
          </div>
        </div>
      </form>

      {croppingQuestion && (
        <ImageCropperModal
          imageUrl={croppingQuestion.sourcePageImage || croppingQuestion.imageUrl!}
          onClose={() => setCroppingQuestion(null)}
          onCrop={(newImageUrl) => {
            const qIndex = editedQuiz.questions.findIndex(q => q.id === croppingQuestion.id);
            if (qIndex > -1) {
              handleQuestionChange(qIndex, 'imageUrl', newImageUrl);
            }
            setCroppingQuestion(null);
          }}
        />
      )}
    </>
  );
};

export default QuizEditor;
