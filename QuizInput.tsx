import React, { useState, useCallback } from 'react';
import { AppLogoIcon, SparklesIcon, DocumentArrowUpIcon, PencilSquareIcon, BookOpenIcon, QueueListIcon, InboxStackIcon, DocumentTextIcon, GlobeAltIcon, ArrowPathIcon, CheckCircleIcon, XMarkIcon, PlusCircleIcon, TrashIcon } from './Icons.tsx';
import { parseFileToText, getFilePageCount } from '../utils/fileParser.ts';
import ManualQuizCreator from './ManualQuizCreator.tsx';
import { GeneratedQuiz, GeneratedFlashcardDeck, QuizDifficulty, StoredFile, Settings } from '../types.ts';
import * as settingsService from '../services/settingsService.ts';

interface FileGroup {
  id: string;
  questionsFile: File;
  answersFile?: File;
  pageCount?: number;
  isPageCountApprox?: boolean;
  pageRange?: string;
  referenceFile?: File;
}

type NumberOfOptions = 2 | 3 | 4 | 5 | 'variable';

interface QuizInputProps {
  onBack: () => void;
  onGenerateQuiz: (text: string, questionCount: number, difficulty: QuizDifficulty, numberOfOptions: NumberOfOptions, file?: File, instructions?: string) => void;
  onGenerateDeck: (text: string, cardCount: number, difficulty: QuizDifficulty, file?: File, instructions?: string) => void;
  onGenerateFromWeb: (topic: string, questionCount: number, difficulty: QuizDifficulty, numberOfOptions: NumberOfOptions, url?: string, instructions?: string) => void;
  onGenerateDeckFromWeb: (topic: string, cardCount: number, difficulty: QuizDifficulty, url?: string, instructions?: string) => void;
  onBatchParse: (groups: { questionsFile: File; answersFile?: File, pageRange?: string, referenceFile?: File }[]) => void;
  onSaveManualQuiz: (quiz: GeneratedQuiz) => void;
  onSaveManualDeck: (deck: GeneratedFlashcardDeck) => void;
  isGenerating: boolean;
  storedFiles: StoredFile[];
  onGenerateFromStoredFile: (fileId: string, count: number, difficulty: QuizDifficulty, genType: 'quiz' | 'deck', numberOfOptions: NumberOfOptions, pageRange?: string, instructions?: string) => void;
}

const TabButton = ({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex-1 flex justify-center items-center gap-2 px-3 py-3 text-sm font-bold border-b-2 transition-colors duration-200 dark:text-slate-300 ${
            isActive
                ? 'border-lime-500 text-lime-600 dark:text-lime-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
        }`}
    >
        {icon}
        <span className="hidden sm:inline">{label}</span>
    </button>
);


const QuizInput: React.FC<QuizInputProps> = ({ 
    onBack, onGenerateQuiz, onGenerateDeck, onGenerateFromWeb, onGenerateDeckFromWeb, onBatchParse,
    onSaveManualQuiz, onSaveManualDeck, isGenerating, storedFiles, onGenerateFromStoredFile
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'manual' | 'import'>('generate');
  const [settings] = useState<Settings>(settingsService.getSettings());
  
  // State for AI Generation Tab
  const [aiSourceType, setAiSourceType] = useState<'text' | 'file' | 'stored' | 'web'>('text');
  const [aiGenType, setAiGenType] = useState<'quiz' | 'deck'>('quiz');
  const [aiText, setAiText] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [numberOfOptions, setNumberOfOptions] = useState<NumberOfOptions>(settings.defaultNumberOfOptions);
  const [cardCount, setCardCount] = useState(10);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('Medio');
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiParseError, setAiParseError] = useState<string | null>(null);
  const [webTopic, setWebTopic] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [pageRange, setPageRange] = useState('');
  const [filePageCount, setFilePageCount] = useState<number | null>(null);
  const [isFilePageCountApprox, setIsFilePageCountApprox] = useState(false);
  const [configuringFileId, setConfiguringFileId] = useState<string | null>(null);
  const [storedFilePageRange, setStoredFilePageRange] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');


  // State for Import Tab
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  
  const handleAiFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setAiParseError(null);
    setAiText('');

    if (selectedFiles.length === 1) {
        const selectedFile = selectedFiles[0];
        setAiFile(selectedFile);
        setPageRange('');
        setFilePageCount(null);
        setIsFilePageCountApprox(false);
        try {
            const { count, isApproximation } = await getFilePageCount(selectedFile);
            setFilePageCount(count);
            setIsFilePageCountApprox(isApproximation);
            if (count > 0) {
                setPageRange(`1-${count}`);
            }
        } catch (error) {
            setAiParseError(error instanceof Error ? error.message : 'Fallo al leer el archivo.');
            setAiFile(null);
        }
    } else {
        setAiFile(null);
        setPageRange('');
        setFilePageCount(null);
        setIsFilePageCountApprox(false);
        setAiText('Procesando archivos...');
         try {
            const texts = await Promise.all(
              Array.from(selectedFiles).map(file => parseFileToText(file))
            );
            const combinedText = texts.join('\n\n--- NUEVO DOCUMENTO ---\n\n');
            setAiText(combinedText);
            setAiSourceType('text');
        } catch (error) {
            setAiParseError(error instanceof Error ? error.message : 'Fallo al procesar uno o más archivos.');
            setAiText('');
        }
    }
  }, []);
  
  const addFilesToGroups = useCallback(async (files: File[]) => {
    const newFileGroups = await Promise.all(
        files.map(async (file) => {
            const { count, isApproximation } = await getFilePageCount(file);
            return {
                id: crypto.randomUUID(),
                questionsFile: file,
                pageCount: count,
                isPageCountApprox: isApproximation,
                pageRange: count > 0 ? `1-${count}` : undefined,
            };
        })
    );
    setFileGroups(prev => [...prev, ...newFileGroups]);
  }, []);

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiParseError(null);
    const instructions = additionalInstructions.trim();

    if (aiSourceType === 'web') {
      if (!webTopic.trim()) { setAiParseError("El tema no puede estar vacío."); return; }
      if (aiGenType === 'quiz') onGenerateFromWeb(webTopic.trim(), questionCount, difficulty, numberOfOptions, webUrl.trim(), instructions);
      else onGenerateDeckFromWeb(webTopic.trim(), cardCount, difficulty, webUrl.trim(), instructions);

    } else if (aiSourceType === 'text') {
      if (!aiText.trim()) { setAiParseError("Pega algo de texto para generar."); return; }
      if (aiGenType === 'quiz') onGenerateQuiz(aiText.trim(), questionCount, difficulty, numberOfOptions, undefined, instructions);
      else onGenerateDeck(aiText.trim(), cardCount, difficulty, undefined, instructions);

    } else if (aiSourceType === 'file') {
      if (!aiFile) { setAiParseError("Por favor, sube un archivo."); return; }
      try {
        const textToGenerate = await parseFileToText(aiFile, pageRange);
        if (!textToGenerate) { setAiParseError("No se pudo extraer texto del archivo."); return; }
        if (aiGenType === 'quiz') onGenerateQuiz(textToGenerate, questionCount, difficulty, numberOfOptions, aiFile, instructions);
        else onGenerateDeck(textToGenerate, cardCount, difficulty, aiFile, instructions);
      } catch (error) {
        setAiParseError(error instanceof Error ? error.message : 'Fallo al procesar el archivo.');
      }
    }
  };
  
  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(fileGroups.length === 0) return;
    onBatchParse(fileGroups.map(({id, ...rest}) => rest));
  };
  
  const handleFileDrop = (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if(e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          addFilesToGroups(Array.from(e.dataTransfer.files));
      }
  };
  
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        addFilesToGroups(Array.from(e.target.files));
        if (e.target) e.target.value = ''; // Allow re-uploading the same file
    }
  };

  const handleGroupFileChange = (groupId: string, fileType: 'answersFile' | 'referenceFile', file: File | null) => {
    setFileGroups(prev => 
        prev.map(group => 
            group.id === groupId ? { ...group, [fileType]: file || undefined } : group
        )
    );
  };
  
  const handleRemoveGroup = (groupId: string) => {
    setFileGroups(prev => prev.filter(group => group.id !== groupId));
  };

  const renderAiSourceOptions = () => (
    <div className="flex rounded-lg bg-slate-200/70 dark:bg-slate-800/60 p-1 mb-4">
        <button type="button" onClick={() => setAiSourceType('text')} className={`w-1/4 py-2 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 ${aiSourceType === 'text' ? 'bg-white dark:bg-slate-700 text-lime-600 dark:text-lime-400 shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}><DocumentTextIcon className="h-4 w-4"/>Texto</button>
        <button type="button" onClick={() => setAiSourceType('file')} className={`w-1/4 py-2 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 ${aiSourceType === 'file' ? 'bg-white dark:bg-slate-700 text-lime-600 dark:text-lime-400 shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}><DocumentArrowUpIcon className="h-4 w-4"/>Subir</button>
        <button type="button" onClick={() => setAiSourceType('stored')} className={`w-1/4 py-2 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 ${aiSourceType === 'stored' ? 'bg-white dark:bg-slate-700 text-lime-600 dark:text-lime-400 shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}><InboxStackIcon className="h-4 w-4"/>Guardado</button>
        <button type="button" onClick={() => setAiSourceType('web')} className={`w-1/4 py-2 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 ${aiSourceType === 'web' ? 'bg-white dark:bg-slate-700 text-lime-600 dark:text-lime-400 shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}><GlobeAltIcon className="h-4 w-4"/>Web</button>
    </div>
  );

  const renderAiContentSource = () => {
    switch(aiSourceType) {
        case 'text':
            return <textarea id="document-text" rows={12} value={aiText} onChange={(e) => { setAiText(e.target.value); setAiFile(null); }} placeholder="Pega aquí el contenido para generar..." className="w-full p-2 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border-none focus:ring-0 resize-y"/>
        case 'file':
            return (
                 <div className="flex flex-col items-center justify-center h-full">
                    <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
                    <label htmlFor="file-upload-ai" className="mt-2 text-sm font-semibold text-lime-600 dark:text-lime-400 hover:text-lime-500 cursor-pointer">
                        <span>{aiFile ? `Archivo: ${aiFile.name}` : 'Selecciona archivo(s) (PDF, DOCX, TXT)'}</span>
                        <input id="file-upload-ai" name="file-upload" type="file" className="sr-only" onChange={handleAiFileChange} accept=".pdf,.docx,.txt" multiple />
                    </label>
                    {aiFile && <button type="button" onClick={() => setAiFile(null)} className="mt-1 text-xs text-red-500 hover:underline">Quitar</button>}
                 </div>
            );
        case 'stored':
             return storedFiles.length > 0 ? (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {storedFiles.map(file => (
                        <div key={file.id}>
                            <button type="button" onClick={() => {setConfiguringFileId(file.id === configuringFileId ? null : file.id); if(file.pageCount) setStoredFilePageRange(`1-${file.pageCount}`)}} className={`w-full text-left p-3 rounded-lg transition-colors ${configuringFileId === file.id ? 'bg-lime-100 dark:bg-lime-900/40' : 'bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200'}`}>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate pr-2">{file.name}</span>
                            </button>
                            {configuringFileId === file.id && (
                                <div className="p-3 bg-lime-50 dark:bg-lime-900/20 rounded-b-lg space-y-3 animate-fade-in">
                                    {file.pageCount && file.pageCount > 0 && (
                                        <div>
                                            <label htmlFor={`stored-page-range-${file.id}`} className="text-xs font-medium text-slate-600 dark:text-slate-300">Seleccionar Páginas (Total: {file.pageCount}{file.isPageCountApprox ? ' Aprox.' : ''})</label>
                                            <input id={`stored-page-range-${file.id}`} type="text" value={storedFilePageRange} onChange={e => setStoredFilePageRange(e.target.value)} placeholder="Ej: 1-5, 8, 10-12" className="w-full mt-1 p-2 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"/>
                                        </div>
                                    )}
                                    <button type="button" onClick={() => onGenerateFromStoredFile(file.id, aiGenType === 'quiz' ? questionCount : cardCount, difficulty, aiGenType, numberOfOptions, file.pageCount ? storedFilePageRange : undefined, additionalInstructions.trim())} className="w-full px-3 py-1.5 bg-lime-500 hover:bg-lime-600 text-white font-bold rounded-md text-sm">Generar</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : <p className="text-sm text-center text-slate-500 dark:text-slate-400 pt-8">No tienes archivos guardados. Sube uno desde la pestaña "Subir".</p>;
        case 'web':
             return <div className="space-y-3">
                <input id="web-topic" type="text" value={webTopic} onChange={(e) => setWebTopic(e.target.value)} placeholder="Ej: 'La crisis de los misiles en Cuba'" className="w-full p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500" required />
                <input id="web-url" type="url" value={webUrl} onChange={(e) => setWebUrl(e.target.value)} placeholder="URL específica (opcional)" className="w-full p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500" />
             </div>
    }
  }

  const renderGenerateTab = () => (
    <form onSubmit={handleGenerateSubmit} className="flex flex-col h-full animate-fade-in">
        <div className="flex-grow space-y-4 overflow-y-auto pr-2 -mr-2 pb-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1. ¿Qué quieres generar?</label>
                <div className="flex gap-4">
                    <button type="button" onClick={() => setAiGenType('quiz')} className={`flex items-center gap-3 p-3 border rounded-lg transition-colors w-1/2 ${aiGenType === 'quiz' ? 'bg-lime-50 dark:bg-lime-900/50 border-lime-500 dark:border-lime-600 ring-2 ring-lime-200 dark:ring-lime-800' : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        <BookOpenIcon className="h-6 w-6 text-lime-600 dark:text-lime-400" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">Test</span>
                    </button>
                    <button type="button" onClick={() => setAiGenType('deck')} className={`flex items-center gap-3 p-3 border rounded-lg transition-colors w-1/2 ${aiGenType === 'deck' ? 'bg-lime-50 dark:bg-lime-900/50 border-lime-500 dark:border-lime-600 ring-2 ring-lime-200 dark:ring-lime-800' : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        <QueueListIcon className="h-6 w-6 text-lime-600 dark:text-lime-400" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">Fichas</span>
                    </button>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">2. Elige la fuente</label>
                {renderAiSourceOptions()}
                <div className="p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[150px] flex flex-col justify-center">
                    {renderAiContentSource()}
                </div>
                {aiParseError && <p className="text-red-600 text-sm mt-2">{aiParseError}</p>}
                {filePageCount && aiFile && aiSourceType === 'file' && (
                    <div className="animate-fade-in mt-2">
                        <label htmlFor="page-range" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Seleccionar Páginas (Total: {filePageCount}{isFilePageCountApprox ? ' Aprox.' : ''})</label>
                        <input id="page-range" type="text" value={pageRange} onChange={(e) => setPageRange(e.target.value)} placeholder="Ej: 1-5, 8, 10-12" className="w-full mt-1 p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500"/>
                    </div>
                )}
            </div>
            <div className="animate-fade-in">
                <p className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">3. Opciones</p>
                <div className={`grid grid-cols-1 ${aiGenType === 'quiz' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4 p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700`}>
                    <div>
                        <label htmlFor={aiGenType === 'quiz' ? 'question-count' : 'card-count'} className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{aiGenType === 'quiz' ? '# Preguntas' : '# Fichas'}</label>
                        <input id={aiGenType === 'quiz' ? 'question-count' : 'card-count'} type="number" min="1" value={aiGenType === 'quiz' ? questionCount : cardCount} onChange={(e) => aiGenType === 'quiz' ? setQuestionCount(Number(e.target.value)) : setCardCount(Number(e.target.value))} className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500"/>
                    </div>
                    {aiGenType === 'quiz' && (
                        <div>
                           <label htmlFor="number-of-options" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"># Opciones</label>
                           <select id="number-of-options" value={numberOfOptions} onChange={e => setNumberOfOptions(e.target.value as NumberOfOptions)} className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500">
                               <option value="2">2</option>
                               <option value="3">3</option>
                               <option value="4">4</option>
                               <option value="5">5</option>
                               <option value="variable">Variable</option>
                           </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Dificultad</label>
                        <div className="flex rounded-lg bg-slate-200/70 dark:bg-slate-900/60 p-1 w-full">
                            {(['Fácil', 'Medio', 'Difícil'] as QuizDifficulty[]).map((level) => (<button key={level} type="button" onClick={() => setDifficulty(level)} className={`flex-1 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-colors ${difficulty === level ? 'bg-white dark:bg-slate-700 text-lime-600 dark:text-lime-400 shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>{level}</button>))}
                        </div>
                    </div>
                </div>
            </div>
             <div className="animate-fade-in mt-4">
                <label htmlFor="additional-instructions" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">4. Instrucciones Adicionales (Opcional)</label>
                 <textarea 
                    id="additional-instructions"
                    rows={2}
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="Ej: 'Crea preguntas solo sobre el Capítulo 3' o 'Enfócate en fechas y autores'."
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500 font-sans text-sm text-slate-900 dark:text-slate-100"
                />
            </div>
        </div>
        
        {aiSourceType !== 'stored' && <div className="flex-shrink-0 pt-4 mt-auto border-t border-slate-200 dark:border-slate-700">
            <div className="flex justify-end">
                <button type="submit" disabled={isGenerating} className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-500 dark:focus:ring-offset-slate-900 transition-all duration-200 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none">
                    <SparklesIcon className="h-5 w-5" />
                    <span>Crear con IA</span>
                </button>
            </div>
        </div>}
    </form>
  );

  const renderImportTab = () => (
     <form onSubmit={handleImportSubmit} className="flex flex-col h-full animate-fade-in">
        <div className="flex-grow space-y-4 overflow-y-auto pr-2 -mr-2 pb-4">
            <label 
                htmlFor="import-file-upload" 
                className="w-full text-center cursor-pointer p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col items-center justify-center"
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
            >
                <DocumentArrowUpIcon className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-2" />
                <span className="font-semibold text-lime-600 dark:text-lime-400">Arrastra archivos aquí o haz clic para subir</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sube tests y claves de respuestas (PDF, DOCX, TXT)</span>
                <input id="import-file-upload" type="file" className="sr-only" onChange={handleImportFileChange} accept=".pdf,.docx,.txt" multiple />
            </label>
            {fileGroups.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Archivos para importar:</h3>
                {fileGroups.map((group) => (
                  <div key={group.id} className="bg-white/50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex-grow">{group.questionsFile.name}</p>
                        <button type="button" onClick={() => handleRemoveGroup(group.id)} className="p-1 text-slate-400 hover:text-red-500"><XMarkIcon className="h-4 w-4"/></button>
                      </div>
                      <div className="pl-4 space-y-2">
                        {group.pageCount && group.pageCount > 0 && (
                            <div>
                                <label htmlFor={`import-page-range-${group.id}`} className="text-xs font-medium text-slate-600 dark:text-slate-300">Páginas (de {group.pageCount}{group.isPageCountApprox ? ' Aprox.' : ''})</label>
                                <input id={`import-page-range-${group.id}`} type="text" value={group.pageRange} onChange={e => setFileGroups(prev => prev.map(g => g.id === group.id ? {...g, pageRange: e.target.value} : g))} placeholder="Ej: 1-5, 8" className="w-full mt-1 p-1.5 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"/>
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                           <label className="cursor-pointer text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline">
                                {group.answersFile ? `Clave: ${group.answersFile.name}` : 'Añadir clave de respuestas'}
                                <input type="file" className="sr-only" onChange={(e) => handleGroupFileChange(group.id, 'answersFile', e.target.files ? e.target.files[0] : null)} accept=".pdf,.docx,.txt" />
                           </label>
                           {group.answersFile && <button type="button" onClick={() => handleGroupFileChange(group.id, 'answersFile', null)} className="text-xs text-red-500 hover:underline">Quitar</button>}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                           <label className="cursor-pointer text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">
                                {group.referenceFile ? `Ref: ${group.referenceFile.name}` : 'Añadir ley de referencia'}
                                <input type="file" className="sr-only" onChange={(e) => handleGroupFileChange(group.id, 'referenceFile', e.target.files ? e.target.files[0] : null)} accept=".pdf,.docx,.txt" />
                           </label>
                           {group.referenceFile && <button type="button" onClick={() => handleGroupFileChange(group.id, 'referenceFile', null)} className="text-xs text-red-500 hover:underline">Quitar</button>}
                        </div>
                      </div>
                  </div>
                ))}
              </div>
            )}
        </div>
        <div className="flex-shrink-0 pt-4 mt-auto border-t border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center">
                <button type="button" onClick={() => setFileGroups([])} className="text-sm font-semibold text-red-500 hover:underline">Limpiar todo</button>
                <button type="submit" disabled={isGenerating || fileGroups.length === 0} className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 disabled:bg-slate-400 disabled:shadow-none">
                    <SparklesIcon className="h-5 w-5" />
                    <span>Importar {fileGroups.length > 0 ? `(${fileGroups.length})` : ''} Test(s)</span>
                </button>
            </div>
        </div>
     </form>
  );

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto animate-fade-in">
        <div className="flex-shrink-0 flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <SparklesIcon className="h-8 w-8 text-lime-500" />
                Añadir Contenido
            </h2>
            <button
              onClick={onBack}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowPathIcon className="h-5 w-5" />
              Volver
            </button>
        </div>
        <div className="flex flex-shrink-0 border-b border-slate-200 dark:border-slate-700 mb-6">
            <TabButton isActive={activeTab === 'generate'} onClick={() => setActiveTab('generate')} icon={<SparklesIcon className="h-5 w-5" />} label="Generar con IA"/>
            <TabButton isActive={activeTab === 'manual'} onClick={() => setActiveTab('manual')} icon={<PencilSquareIcon className="h-5 w-5" />} label="Crear Manualmente"/>
            <TabButton isActive={activeTab === 'import'} onClick={() => setActiveTab('import')} icon={<DocumentArrowUpIcon className="h-5 w-5" />} label="Importar PDF"/>
        </div>

        <div className="flex-grow overflow-hidden">
            {activeTab === 'generate' && renderGenerateTab()}
            {activeTab === 'manual' && <ManualQuizCreator onSaveQuiz={onSaveManualQuiz} onSaveDeck={onSaveManualDeck} />}
            {activeTab === 'import' && renderImportTab()}
        </div>
    </div>
  );
};

export default QuizInput;