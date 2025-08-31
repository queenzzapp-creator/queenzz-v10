import React, { useState, useCallback } from 'react';
import { AppLogoIcon, SparklesIcon, DocumentArrowUpIcon, PencilSquareIcon, BookOpenIcon, QueueListIcon, InboxStackIcon, DocumentTextIcon, GlobeIcon, ArrowPathIcon, CheckCircleIcon, XMarkIcon, PlusCircleIcon, TrashIcon, FolderIcon, FolderOpenIcon, XCircleIcon } from './Icons.tsx';
import { parseFileToText, getFilePageCount } from '../utils/fileParser.ts';
import ManualQuizCreator from './ManualQuizCreator.tsx';
import { GeneratedQuiz, GeneratedFlashcardDeck, QuizDifficulty, StoredFile, Settings, DocumentItem, StoredFileItem, StoredURLItem } from '../types.ts';
import * as settingsService from '../services/settingsService.ts';

interface FileGroup {
  id: string;
  questionsFile: File;
  answersFile?: File;
  pageCount?: number;
  isPageCountApprox?: boolean;
  pageRange?: string;
  referenceFile?: File;
  contextImageFiles?: File[];
  contextText?: string;
  requiresImage?: boolean;
}

type NumberOfOptions = 2 | 3 | 4 | 5 | 'variable';

interface QuizInputProps {
  onBack: () => void;
  onGenerateQuiz: (text: string, questionCount: number, difficulty: QuizDifficulty, numberOfOptions: NumberOfOptions, file?: File, instructions?: string, pageRange?: string, useImages?: boolean) => void;
  onGenerateDeck: (text: string, cardCount: number, difficulty: QuizDifficulty, file?: File, instructions?: string, pageRange?: string, useImages?: boolean) => void;
  onGenerateFromWeb: (topic: string, questionCount: number, difficulty: QuizDifficulty, numberOfOptions: NumberOfOptions, url?: string, instructions?: string) => void;
  onGenerateDeckFromWeb: (topic: string, cardCount: number, difficulty: QuizDifficulty, url?: string, instructions?: string) => void;
  onBatchParse: (groups: { questionsFile: File; answersFile?: File, pageRange?: string, referenceFile?: File, contextImageFiles?: File[], contextText?: string, requiresImage?: boolean }[]) => void;
  onSaveManualQuiz: (quiz: GeneratedQuiz) => void;
  onSaveManualDeck: (deck: GeneratedFlashcardDeck) => void;
  isGenerating: boolean;
  documentLibrary: DocumentItem[];
  allDocuments: (StoredFileItem | StoredURLItem)[];
  onGenerateFromStoredFile: (fileId: string, count: number, difficulty: QuizDifficulty, genType: 'quiz' | 'deck', numberOfOptions: NumberOfOptions, instructions?: string, pageRange?: string, useImages?: boolean) => void;
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

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
};

const DocumentItemRenderer: React.FC<{
  item: DocumentItem;
  level: number;
  onFileSelect: (file: StoredFileItem) => void;
  selectedFileId: string | null;
  openFolders: Set<string>;
  toggleFolder: (folderId: string) => void;
}> = ({ item, level, onFileSelect, selectedFileId, openFolders, toggleFolder }) => {
  const isOpen = item.type === 'folder' && openFolders.has(item.id);
  
  const Icon = item.type === 'folder' ? (isOpen ? FolderOpenIcon : FolderIcon) : item.type === 'file' ? DocumentArrowUpIcon : GlobeIcon;
  const iconColor = item.type === 'folder' ? 'text-purple-500' : item.type === 'file' ? 'text-sky-500' : 'text-indigo-500';
  const name = item.type === 'url' ? item.title : item.name;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === 'folder') toggleFolder(item.id);
    if (item.type === 'file') onFileSelect(item);
  };
  
  return (
    <>
      <div 
        onClick={handleClick}
        className={`group flex items-center gap-3 p-2 rounded-lg transition-colors duration-200 cursor-pointer ${selectedFileId === item.id ? 'bg-lime-100/70 dark:bg-lime-900/40' : 'hover:bg-slate-100/70 dark:hover:bg-slate-700/50'}`}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
      >
        <Icon className={`h-6 w-6 shrink-0 ${iconColor}`} />
        <div className="flex-grow flex flex-col min-w-0">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{name}</h3>
          {(item.type === 'file') && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatFileSize(item.size)} &bull; {new Date(item.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
      {item.type === 'folder' && isOpen && (
        <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 ml-3">
          {item.children.map(child => <DocumentItemRenderer key={child.id} item={child} level={level + 1} onFileSelect={onFileSelect} selectedFileId={selectedFileId} openFolders={openFolders} toggleFolder={toggleFolder} />)}
        </div>
      )}
    </>
  );
};


const QuizInput: React.FC<QuizInputProps> = ({ 
    onBack, onGenerateQuiz, onGenerateDeck, onGenerateFromWeb, onGenerateDeckFromWeb, onBatchParse,
    onSaveManualQuiz, onSaveManualDeck, isGenerating, documentLibrary, allDocuments, onGenerateFromStoredFile
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'manual' | 'import'>('import');
  const [settings] = useState<Settings>(settingsService.getSettings());
  
  // State for AI Generation Tab
  const [aiSourceType, setAiSourceType] = useState<'text' | 'file' | 'stored' | 'web'>('text');
  const [selectedFileForGen, setSelectedFileForGen] = useState<StoredFileItem | null>(null);

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
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [usePdfImages, setUsePdfImages] = useState(true);


  // State for Import Tab
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  
  const toggleFolder = useCallback((folderId: string) => {
    setOpenFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(folderId)) newSet.delete(folderId);
        else newSet.add(folderId);
        return newSet;
    });
  }, []);

  const handleFileSelectForGen = (file: StoredFileItem) => {
      if (selectedFileForGen?.id === file.id) {
          setSelectedFileForGen(null); // Deselect
      } else {
          setSelectedFileForGen(file);
      }
  };
  
  const handleAiFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setAiParseError(null);
    setAiText('');

    if (selectedFiles.length === 1) {
        const selectedFile = selectedFiles[0];
        setAiFile(selectedFile);
        const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
        setUsePdfImages(isPdf);
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
        setUsePdfImages(false);
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
                contextText: '',
                contextImageFiles: [],
                requiresImage: false,
            };
        })
    );
    setFileGroups(prev => [...prev, ...newFileGroups]);
  }, []);

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiParseError(null);
    const instructions = additionalInstructions.trim();

    if (aiSourceType === 'stored') {
        if (!selectedFileForGen) { setAiParseError("Por favor, selecciona un archivo de la lista."); return; }
        onGenerateFromStoredFile(selectedFileForGen.id, aiGenType === 'quiz' ? questionCount : cardCount, difficulty, aiGenType, numberOfOptions, instructions, pageRange, usePdfImages);
        return;
    }

    if (aiSourceType === 'web') {
      if (!webTopic.trim()) { setAiParseError("El tema no puede estar vacío."); return; }
      if (aiGenType === 'quiz') onGenerateFromWeb(webTopic.trim(), questionCount, difficulty, numberOfOptions, webUrl.trim(), instructions);
      else onGenerateDeckFromWeb(webTopic.trim(), cardCount, difficulty, webUrl.trim(), instructions);

    } else if (aiSourceType === 'text') {
      if (!aiText.trim()) { setAiParseError("Pega algo de texto para generar."); return; }
      if (aiGenType === 'quiz') onGenerateQuiz(aiText.trim(), questionCount, difficulty, numberOfOptions, undefined, instructions, undefined, false);
      else onGenerateDeck(aiText.trim(), cardCount, difficulty, undefined, instructions, undefined, false);

    } else if (aiSourceType === 'file') {
      if (!aiFile) { setAiParseError("Por favor, sube un archivo."); return; }
      try {
        const isPdf = aiFile.type === 'application/pdf' || aiFile.name.toLowerCase().endsWith('.pdf');
        // Let App.tsx handle text parsing for PDFs
        const textToGenerate = isPdf ? '' : await parseFileToText(aiFile, pageRange);
        if (!isPdf && !textToGenerate) { setAiParseError("No se pudo extraer texto del archivo."); return; }
        if (aiGenType === 'quiz') onGenerateQuiz(textToGenerate, questionCount, difficulty, numberOfOptions, aiFile, instructions, pageRange, usePdfImages);
        else onGenerateDeck(textToGenerate, cardCount, difficulty, aiFile, instructions, pageRange, usePdfImages);
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

  const handleGroupContextImagesChange = (groupId: string, files: FileList | null) => {
    if (!files) return;
    setFileGroups(prev =>
      prev.map(group =>
        group.id === groupId
          ? { ...group, contextImageFiles: [...(group.contextImageFiles || []), ...Array.from(files)] }
          : group
      )
    );
  };

  const handleRemoveContextImage = (groupId: string, fileToRemove: File) => {
    setFileGroups(prev =>
      prev.map(group =>
        group.id === groupId
          ? { ...group, contextImageFiles: (group.contextImageFiles || []).filter(f => f !== fileToRemove) }
          : group
      )
    );
  };
  
  const handleGroupTextChange = (groupId: string, field: 'pageRange' | 'contextText', value: string) => {
    setFileGroups(prev => prev.map(g => g.id === groupId ? {...g, [field]: value} : g));
  };

  const handleGroupBoolChange = (groupId: string, field: 'requiresImage', value: boolean) => {
    setFileGroups(prev => prev.map(g => g.id === groupId ? {...g, [field]: value} : g));
  }

  const handleRemoveGroup = (groupId: string) => {
    setFileGroups(prev => prev.filter(group => group.id !== groupId));
  };

  const renderAiSourceOptions = () => (
    <div className="flex rounded-lg bg-slate-200/70 dark:bg-slate-800/60 p-1 mb-4">
        <button type="button" onClick={() => {setAiSourceType('text'); setSelectedFileForGen(null)}} className={`w-1/4 py-2 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 ${aiSourceType === 'text' ? 'bg-white dark:bg-slate-700 text-lime-600 dark:text-lime-400 shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}><DocumentTextIcon className="h-4 w-4"/>Texto</button>
        <button type="button" onClick={() => {setAiSourceType('file'); setSelectedFileForGen(null)}} className={`w-1/4 py-2 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 ${aiSourceType === 'file' ? 'bg-white dark:bg-slate-700 text-lime-600 dark:text-lime-400 shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}><DocumentArrowUpIcon className="h-4 w-4"/>Subir</button>
        <button type="button" onClick={() => {setAiSourceType('stored'); setSelectedFileForGen(null)}} className={`w-1/4 py-2 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 ${aiSourceType === 'stored' ? 'bg-white dark:bg-slate-700 text-lime-600 dark:text-lime-400 shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}><InboxStackIcon className="h-4 w-4"/>Guardado</button>
        <button type="button" onClick={() => {setAiSourceType('web'); setSelectedFileForGen(null)}} className={`w-1/4 py-2 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 ${aiSourceType === 'web' ? 'bg-white dark:bg-slate-700 text-lime-600 dark:text-lime-400 shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}><GlobeIcon className="h-4 w-4"/>Web</button>
    </div>
  );

  const renderAiContentSource = () => {
    switch(aiSourceType) {
        case 'text':
            return <textarea id="document-text" rows={8} value={aiText} onChange={(e) => { setAiText(e.target.value); setAiFile(null); }} placeholder="Pega aquí el contenido para generar..." className="w-full p-2 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border-none focus:ring-0 resize-y"/>
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
             return documentLibrary.length > 0 ? (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {documentLibrary.map(item => (
                        <DocumentItemRenderer 
                            key={item.id}
                            item={item} 
                            level={0} 
                            onFileSelect={(file) => {
                                handleFileSelectForGen(file);
                                const isPdf = file.mimeType === 'application/pdf';
                                setUsePdfImages(isPdf);
                                if (isPdf && file.pageCount) {
                                    setPageRange(`1-${file.pageCount}`);
                                } else {
                                    setPageRange('');
                                }
                            }}
                            selectedFileId={selectedFileForGen?.id || null}
                            openFolders={openFolders}
                            toggleFolder={toggleFolder}
                        />
                    ))}
                </div>
            ) : <p className="text-sm text-center text-slate-500 dark:text-slate-400 pt-8">No tienes archivos guardados.</p>;
        case 'web':
             return <div className="space-y-3">
                <input id="web-topic" type="text" value={webTopic} onChange={(e) => setWebTopic(e.target.value)} placeholder="Ej: 'La crisis de los misiles en Cuba'" className="w-full p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500" required />
                <input id="web-url" type="url" value={webUrl} onChange={(e) => setWebUrl(e.target.value)} placeholder="URL específica (opcional)" className="w-full p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500" />
             </div>
    }
  }
  
  const isPdfSelected = (aiSourceType === 'file' && aiFile?.type === 'application/pdf') || (aiSourceType === 'stored' && selectedFileForGen?.mimeType === 'application/pdf');

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
                {(aiFile && aiSourceType === 'file') && (
                    <div className="animate-fade-in mt-2">
                        <label htmlFor="page-range" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Seleccionar Páginas (Total: {filePageCount}{isFilePageCountApprox ? ' Aprox.' : ''})</label>
                        <input id="page-range" type="text" value={pageRange} onChange={(e) => setPageRange(e.target.value)} placeholder="Ej: 1-5, 8, 10-12" className="w-full mt-1 p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500"/>
                    </div>
                )}
                 {(selectedFileForGen && aiSourceType === 'stored') && (
                    <div className="animate-fade-in mt-2">
                        <label htmlFor="page-range" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Seleccionar Páginas (Total: {selectedFileForGen.pageCount}{selectedFileForGen.isPageCountApprox ? ' Aprox.' : ''})</label>
                        <input id="page-range" type="text" value={pageRange} onChange={(e) => setPageRange(e.target.value)} placeholder="Ej: 1-5, 8, 10-12" className="w-full mt-1 p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500"/>
                    </div>
                )}
            </div>
            <div className="animate-fade-in">
                <p className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">3. Opciones</p>
                <div className="p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className={`grid grid-cols-1 ${aiGenType === 'quiz' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
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
                     {isPdfSelected && (
                        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-600">
                             <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-700/50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={usePdfImages}
                                    onChange={(e) => setUsePdfImages(e.target.checked)}
                                    className="h-4 w-4 rounded-sm bg-slate-100 border-slate-300 text-lime-600 focus:ring-lime-500"
                                />
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                    Usar análisis visual de imágenes
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">Recomendado para PDFs con tablas, gráficos o formato complejo.</p>
                                </span>
                            </label>
                        </div>
                    )}
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
        
        <div className="flex-shrink-0 pt-4 mt-auto border-t border-slate-200 dark:border-slate-700">
            <div className="flex justify-end">
                <button type="submit" disabled={isGenerating} className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-500 dark:focus:ring-offset-slate-900 transition-all duration-200 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none">
                    <SparklesIcon className="h-5 w-5" />
                    <span>Crear con IA</span>
                </button>
            </div>
        </div>
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
                      <div className="pl-4 space-y-3">
                        {group.pageCount && group.pageCount > 0 && (
                            <div>
                                <label htmlFor={`import-page-range-${group.id}`} className="text-xs font-medium text-slate-600 dark:text-slate-300">Páginas (de {group.pageCount}{group.isPageCountApprox ? ' Aprox.' : ''})</label>
                                <input id={`import-page-range-${group.id}`} type="text" value={group.pageRange} onChange={e => handleGroupTextChange(group.id, 'pageRange', e.target.value)} placeholder="Ej: 1-5, 8" className="w-full mt-1 p-1.5 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"/>
                            </div>
                        )}
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={group.requiresImage} onChange={e => handleGroupBoolChange(group.id, 'requiresImage', e.target.checked)} className="h-4 w-4 rounded-sm text-lime-600 focus:ring-lime-500" />
                            Preguntas con imagen (recorte)
                        </label>
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
                        <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-600">
                             <textarea value={group.contextText} onChange={e => handleGroupTextChange(group.id, 'contextText', e.target.value)} rows={2} placeholder="Añadir contexto o instrucciones para la IA (opcional)..." className="w-full mt-1 p-1.5 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"/>
                             <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mt-2">
                                <label className="cursor-pointer text-xs font-semibold text-green-600 dark:text-green-400 hover:underline">
                                    Añadir imágenes de contexto
                                    <input type="file" multiple className="sr-only" onChange={(e) => handleGroupContextImagesChange(group.id, e.target.files)} accept="image/*" />
                               </label>
                            </div>
                             {group.contextImageFiles && group.contextImageFiles.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {group.contextImageFiles.map((file, index) => (
                                        <div key={index} className="relative bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 text-xs font-medium px-2 py-1 rounded-full">
                                            <span>{file.name}</span>
                                            <button type="button" onClick={() => handleRemoveContextImage(group.id, file)} className="absolute -top-1.5 -right-1.5 bg-slate-500 text-white rounded-full">
                                                <XCircleIcon className="h-4 w-4"/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
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