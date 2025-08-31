import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { StudyPlanConfig, StudyPlanSession, StoredFile, DocumentItem, StoredFileItem, StudyBlock } from '../types.ts';
import { CalendarDaysIcon, ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon, CheckCircleIcon, SparklesIcon, BookOpenIcon, DocumentArrowUpIcon, FolderIcon, FolderOpenIcon, PlusCircleIcon, ChevronDownIcon, XMarkIcon } from './Icons.tsx';

const sortDocumentItems = (items: DocumentItem[]): DocumentItem[] => {
    const sorted = [...items].sort((a, b) => {
        const nameA = (a.type === 'url' ? a.title : a.name).toLowerCase();
        const nameB = (b.type === 'url' ? b.title : b.name).toLowerCase();
        return nameA.localeCompare(nameB);
    });

    return sorted.map(item => {
        if (item.type === 'folder') {
            return { ...item, children: sortDocumentItems(item.children) };
        }
        return item;
    });
};

const getTextColorForBg = (hexColor: string): string => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? 'text-slate-800' : 'text-white';
};


const CalendarPreview: React.FC<{ blocks: StudyBlock[], calendarDate: Date, onDateChange: (newDate: Date) => void }> = ({ blocks, calendarDate, onDateChange }) => {
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const daysOfWeek = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    const { month, year, daysInMonth, firstDayOfMonth } = useMemo(() => {
        const month = calendarDate.getMonth();
        const year = calendarDate.getFullYear();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let firstDay = new Date(year, month, 1).getDay();
        firstDay = firstDay === 0 ? 6 : firstDay - 1; // Adjust so Monday is 0
        return { month, year, daysInMonth, firstDayOfMonth: firstDay };
    }, [calendarDate]);
    
    const prevMonth = () => onDateChange(new Date(year, month - 1, 1));
    const nextMonth = () => onDateChange(new Date(year, month + 1, 1));

    const blocksByDay: { [key: number]: { name: string, color: string }[] } = {};
    blocks.forEach(block => {
        block.studyDays.forEach(day => {
            const adjustedDay = day === 0 ? 6 : day - 1; // Adjust to Mon=0...Sun=6
            if (!blocksByDay[adjustedDay]) blocksByDay[adjustedDay] = [];
            blocksByDay[adjustedDay].push({ name: block.name, color: block.color });
        });
    });

    return (
        <div className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 h-full">
            <div className="flex justify-between items-center mb-4">
                <button onClick={prevMonth} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronLeftIcon className="h-5 w-5"/></button>
                <h4 className="font-bold text-lg text-slate-700 dark:text-slate-200">{monthNames[month]} {year}</h4>
                <button onClick={nextMonth} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronRightIcon className="h-5 w-5"/></button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500">
                {daysOfWeek.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 mt-2">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)}
                {Array.from({ length: daysInMonth }).map((_, day) => {
                    const date = day + 1;
                    const dayOfWeek = (firstDayOfMonth + day) % 7;
                    const todaysBlocks = blocksByDay[dayOfWeek] || [];
                    const isToday = new Date().toDateString() === new Date(year, month, date).toDateString();
                    
                    return (
                        <div key={date} className={`p-1.5 rounded-md min-h-[70px] bg-slate-100 dark:bg-slate-700/50 ${isToday ? 'ring-2 ring-lime-500' : ''}`}>
                            <span className={`font-bold text-sm ${isToday ? 'text-lime-600 dark:text-lime-400' : 'text-slate-600 dark:text-slate-300'}`}>{date}</span>
                            <div className="mt-1 space-y-1">
                                {todaysBlocks.map(block => (
                                    <div key={block.name} style={{ backgroundColor: block.color }} className={`text-[10px] font-semibold ${getTextColorForBg(block.color)} rounded px-1 py-0.5 truncate`} title={block.name}>
                                        {block.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const COLORS = ['#A7F3D0', '#BAE6FD', '#FBCFE8', '#FDE68A', '#DDD6FE', '#FFD8B3'];
const getNextColor = (index: number) => COLORS[index % COLORS.length];

const PlannerConfigurator: React.FC<{
    documentLibrary: DocumentItem[];
    onGeneratePlan: (config: StudyPlanConfig) => void;
    onUploadFile: (file: File) => Promise<string>;
    onBack: () => void;
}> = ({ documentLibrary, onGeneratePlan, onUploadFile, onBack }) => {
    const today = new Date();
    today.setDate(today.getDate() + 30);
    const defaultExamDate = today.toISOString().split('T')[0];

    const [blocks, setBlocks] = useState<StudyBlock[]>([{ id: crypto.randomUUID(), name: 'Bloque Principal', fileIds: [], pagesPerSession: 10, studyDays: [1, 2, 3, 4, 5], color: getNextColor(0), pacingMode: 'pages', examDate: defaultExamDate, laps: 1, questionsPerSession: 10 }]);
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [activeBlockId, setActiveBlockId] = useState<string | null>(blocks[0]?.id || null);

    const tabContainerRef = useRef<HTMLDivElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const [scrollPosition, setScrollPosition] = useState(0);

    useEffect(() => {
        if (!activeBlockId && blocks.length > 0) {
            setActiveBlockId(blocks[0].id);
        } else if (activeBlockId && !blocks.some(b => b.id === activeBlockId)) {
            setActiveBlockId(blocks.length > 0 ? blocks[0].id : null);
        }
    }, [blocks, activeBlockId]);
    
    useEffect(() => {
        const checkOverflow = () => {
            if (tabContainerRef.current) {
                const { scrollWidth, clientWidth } = tabContainerRef.current;
                setIsOverflowing(scrollWidth > clientWidth);
            }
        };

        const handleScroll = () => {
            if (tabContainerRef.current) {
                setScrollPosition(tabContainerRef.current.scrollLeft);
            }
        };
        
        checkOverflow();
        
        const resizeObserver = new ResizeObserver(checkOverflow);
        if (tabContainerRef.current) {
            resizeObserver.observe(tabContainerRef.current);
            tabContainerRef.current.addEventListener('scroll', handleScroll);
        }
        
        // Also check on blocks change
        checkOverflow();

        return () => {
            if (tabContainerRef.current) {
                resizeObserver.unobserve(tabContainerRef.current);
                tabContainerRef.current.removeEventListener('scroll', handleScroll);
            }
        };
    }, [blocks]);


    const sortedDocumentLibrary = useMemo(() => sortDocumentItems(documentLibrary), [documentLibrary]);
    
    const handleAddBlock = () => {
        const newBlock: StudyBlock = { id: crypto.randomUUID(), name: `Bloque ${blocks.length + 1}`, fileIds: [], pagesPerSession: 10, studyDays: [], color: getNextColor(blocks.length), pacingMode: 'pages', examDate: defaultExamDate, laps: 1, questionsPerSession: 10 };
        setBlocks(prev => [...prev, newBlock]);
        setActiveBlockId(newBlock.id);
    };

    const handleRemoveBlock = (blockIdToRemove: string) => {
        const currentIndex = blocks.findIndex(b => b.id === blockIdToRemove);
        const newBlocks = blocks.filter(b => b.id !== blockIdToRemove);

        if (activeBlockId === blockIdToRemove) {
            if (newBlocks.length === 0) {
                setActiveBlockId(null);
            } else {
                const newActiveIndex = Math.min(currentIndex, newBlocks.length - 1);
                setActiveBlockId(newBlocks[newActiveIndex].id);
            }
        }
        setBlocks(newBlocks);
    };

    const handleUpdateBlock = (blockId: string, updatedFields: Partial<StudyBlock>) => setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, ...updatedFields } : b));

    const handleSubmit = () => {
        if (blocks.some(b => b.fileIds.length === 0)) {
            alert("Por favor, selecciona al menos un archivo para cada bloque de estudio.");
            return;
        }
        if (blocks.every(b => b.studyDays.length === 0)) {
            alert("Por favor, selecciona al menos un día de estudio a la semana para al menos un bloque.");
            return;
        }
        onGeneratePlan({ blocks });
    };

    const activeBlock = useMemo(() => blocks.find(b => b.id === activeBlockId), [blocks, activeBlockId]);
    
    const handleScroll = (direction: 'left' | 'right') => {
        if (tabContainerRef.current) {
            const scrollAmount = 200;
            tabContainerRef.current.scrollBy({ 
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };
    
    const canScrollLeft = scrollPosition > 0;
    const canScrollRight = tabContainerRef.current ? scrollPosition < tabContainerRef.current.scrollWidth - tabContainerRef.current.clientWidth -1 : false;

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <CalendarDaysIcon className="h-8 w-8 text-purple-500" />
                    <div>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Crea tu Plan de Estudio Inteligente</h3>
                        <p className="mt-1 text-slate-500 dark:text-slate-400 text-sm">Organiza tu temario en bloques y la IA generará tests para cada sesión.</p>
                    </div>
                </div>
                <button onClick={onBack} className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <ArrowPathIcon className="h-5 w-5" /> Volver
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* Left Column: Config */}
                <div>
                     <h4 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-3">1. Define tus Bloques de Estudio</h4>
                     <div className="flex items-center border-b border-slate-200 dark:border-slate-700">
                        {isOverflowing && (
                            <button onClick={() => handleScroll('left')} disabled={!canScrollLeft} className="p-2 disabled:opacity-30 flex-shrink-0"><ChevronLeftIcon className="h-4 w-4"/></button>
                        )}
                         <div ref={tabContainerRef} className="flex-grow flex items-center overflow-x-hidden whitespace-nowrap -mb-px">
                            {blocks.map(block => (
                                <div key={block.id} className={`relative border rounded-t-lg -mr-px flex-shrink-0 ${activeBlockId === block.id ? 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 border-b-transparent' : 'bg-slate-100/50 dark:bg-slate-800/20 border-transparent'}`}>
                                    <button 
                                        onClick={() => setActiveBlockId(block.id)}
                                        className={`flex items-center gap-2 px-4 py-3 font-semibold ${activeBlockId === block.id ? 'text-lime-600 dark:text-lime-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                    >
                                        <span style={{ backgroundColor: block.color }} className="w-3 h-3 rounded-full flex-shrink-0"/>
                                        <span className="truncate max-w-24">{block.name}</span>
                                    </button>
                                    {blocks.length > 1 && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleRemoveBlock(block.id); }}
                                            className="absolute top-1 right-1 p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-100/50"
                                            title={`Eliminar ${block.name}`}
                                        >
                                            <XMarkIcon className="h-3 w-3"/>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddBlock} title="Añadir nuevo bloque" className="p-3 text-slate-500 hover:text-lime-600 flex items-center">
                            <PlusCircleIcon className="h-5 w-5"/>
                        </button>
                        {isOverflowing && (
                            <button onClick={() => handleScroll('right')} disabled={!canScrollRight} className="p-2 disabled:opacity-30 flex-shrink-0"><ChevronRightIcon className="h-4 w-4"/></button>
                        )}
                    </div>
                    <div className="p-6 bg-white/50 dark:bg-slate-800/50 rounded-b-lg rounded-tr-lg border border-slate-200 dark:border-slate-700">
                        {activeBlock ? (
                            <BlockConfigurator
                                key={activeBlock.id}
                                block={activeBlock}
                                onUpdate={handleUpdateBlock}
                                documentLibrary={sortedDocumentLibrary}
                                onUploadFile={onUploadFile}
                            />
                        ) : (
                            <div className="text-center py-12 text-slate-500">
                                <p>No hay bloques. ¡Añade uno para empezar!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Calendar Preview */}
                <div className="min-h-[400px]">
                    <h4 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-3">Previsualización del Plan</h4>
                    <CalendarPreview blocks={blocks} calendarDate={calendarDate} onDateChange={setCalendarDate} />
                </div>
            </div>

             <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={handleSubmit} className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg text-white bg-lime-600 hover:bg-lime-700">
                    <SparklesIcon className="h-5 w-5"/> Generar Plan
                </button>
            </div>
        </div>
    );
};

const BlockConfigurator: React.FC<{
    block: StudyBlock;
    onUpdate: (blockId: string, updatedFields: Partial<StudyBlock>) => void;
    documentLibrary: DocumentItem[];
    onUploadFile: (file: File) => Promise<string>;
}> = ({ block, onUpdate, documentLibrary, onUploadFile }) => {
    const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
    const [isSelectingFiles, setIsSelectingFiles] = useState(false);
    
    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const dayMapping = [1, 2, 3, 4, 5, 6, 0];

    const handleDayToggle = (dayIndex: number) => {
        const realDayIndex = dayMapping[dayIndex];
        const newStudyDays = new Set(block.studyDays);
        if (newStudyDays.has(realDayIndex)) newStudyDays.delete(realDayIndex);
        else newStudyDays.add(realDayIndex);
        onUpdate(block.id, { studyDays: Array.from(newStudyDays) });
    }

    const handleItemToggle = (item: DocumentItem, isChecked: boolean) => {
        const newFileIds = new Set(block.fileIds);
        const processItem = (currentItem: DocumentItem, check: boolean) => {
            if (currentItem.type === 'file') {
                if (check) newFileIds.add(currentItem.id);
                else newFileIds.delete(currentItem.id);
            } else if (currentItem.type === 'folder') {
                currentItem.children.forEach(child => processItem(child, check));
            }
        };
        processItem(item, isChecked);
        onUpdate(block.id, { fileIds: Array.from(newFileIds) });
    };

    const handleFileUploadAndSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newFileIds: string[] = [];
        for (const file of Array.from(files)) {
            const newId = await onUploadFile(file);
            newFileIds.push(newId);
        }

        if (newFileIds.length > 0) {
            onUpdate(block.id, { fileIds: [...new Set([...block.fileIds, ...newFileIds])] });
        }
    };

    const renderItemTree = (items: DocumentItem[], level = 0): React.ReactNode => {
        return items.filter(item => item.type === 'file' || item.type === 'folder').map(item => {
            const hasChildren = item.type === 'folder' && item.children.length > 0;
            const isOpen = item.type === 'folder' && openFolders.has(item.id);
            const Icon = item.type === 'folder' ? (isOpen ? FolderOpenIcon : FolderIcon) : BookOpenIcon;
            return (
                <div key={item.id} style={{ paddingLeft: `${level * 1.5}rem`}}>
                    <label className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-700/50 cursor-pointer">
                        <input type="checkbox" checked={block.fileIds.includes(item.id)} onChange={(e) => handleItemToggle(item, e.target.checked)} className="h-4 w-4 rounded text-lime-600 focus:ring-lime-500"/>
                        <div className="flex-shrink-0" onClick={(e) => { e.preventDefault(); if(item.type === 'folder') setOpenFolders(p => { const newSet = new Set(p); if (newSet.has(item.id)) newSet.delete(item.id); else newSet.add(item.id); return newSet; }); }}>
                            <Icon className={`h-5 w-5 ${item.type === 'folder' ? 'text-lime-500' : 'text-slate-500'}`} />
                        </div>
                        <span>{(item.type === 'folder' || item.type === 'file') ? item.name : ''} {item.type === 'file' && <span className="text-xs text-slate-500">({item.pageCount} págs)</span>}</span>
                    </label>
                    {hasChildren && isOpen && renderItemTree(item.children, level + 1)}
                </div>
            );
        });
    };
    
    const todayForMinDate = new Date().toISOString().split("T")[0];

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-4">
                <input type="text" value={block.name} onChange={e => onUpdate(block.id, { name: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-700 rounded-md border border-slate-300 dark:border-slate-600 font-semibold" placeholder="Nombre del bloque..."/>
                <label htmlFor={`block-color-${block.id}`} className="text-sm font-medium flex-shrink-0">Color del Bloque</label>
                <input id={`block-color-${block.id}`} type="color" value={block.color} onChange={e => onUpdate(block.id, { color: e.target.value })} className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent"/>
            </div>
            
            <div className="space-y-2">
                <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-600 space-y-2">
                    <button type="button" onClick={() => setIsSelectingFiles(p => !p)} className="w-full p-3 text-left border rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 border-slate-300 dark:border-slate-600">
                        <p className="font-semibold">Temario del Bloque</p>
                        <p className="text-sm text-slate-500">{block.fileIds.length} archivo(s) seleccionado(s)</p>
                    </button>
                    <label className="block w-full p-3 text-center border rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 border-slate-300 dark:border-slate-600 cursor-pointer text-slate-500 dark:text-slate-400 text-sm">
                        Sube archivos para añadirlos al bloque.
                        <input type="file" multiple className="sr-only" onChange={handleFileUploadAndSelect} accept=".pdf,.docx,.txt" />
                    </label>
                </div>

                {isSelectingFiles && (
                    <div className="mt-1 max-h-48 overflow-y-auto p-2 bg-slate-100/50 dark:bg-slate-900/40 rounded-md border border-slate-200 dark:border-slate-700">
                        {documentLibrary.length > 0 ? renderItemTree(documentLibrary) : (
                            <p className="text-sm text-center text-slate-500 dark:text-slate-400 p-4">No hay archivos en el gestor. Sube uno nuevo para seleccionarlo.</p>
                        )}
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Vueltas al temario</label>
                    <input type="number" min="1" value={block.laps} onChange={e => onUpdate(block.id, { laps: parseInt(e.target.value) || 1 })} className="w-full p-2 bg-white dark:bg-slate-700 rounded-md border border-slate-300 dark:border-slate-600"/>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Preguntas por sesión</label>
                    <input type="number" min="1" max="50" value={block.questionsPerSession} onChange={e => onUpdate(block.id, { questionsPerSession: parseInt(e.target.value) || 10 })} className="w-full p-2 bg-white dark:bg-slate-700 rounded-md border border-slate-300 dark:border-slate-600"/>
                </div>
            </div>
            <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-600">
                    <p className="block text-sm font-medium mb-2">Ritmo de Estudio</p>
                    <div className="flex gap-2">
                    <label className={`flex-1 p-2 rounded-md text-center text-sm font-semibold border-2 cursor-pointer ${block.pacingMode === 'pages' ? 'bg-lime-100/80 border-lime-500' : 'bg-white dark:bg-slate-700/50 border-transparent'}`}><input type="radio" value="pages" checked={block.pacingMode === 'pages'} onChange={() => onUpdate(block.id, {pacingMode: 'pages'})} className="sr-only"/>Páginas/sesión</label>
                    <label className={`flex-1 p-2 rounded-md text-center text-sm font-semibold border-2 cursor-pointer ${block.pacingMode === 'examDate' ? 'bg-lime-100/80 border-lime-500' : 'bg-white dark:bg-slate-700/50 border-transparent'}`}><input type="radio" value="examDate" checked={block.pacingMode === 'examDate'} onChange={() => onUpdate(block.id, {pacingMode: 'examDate'})} className="sr-only"/>Fecha de examen</label>
                    </div>
                    <div className="mt-3">
                    {block.pacingMode === 'pages' ? (
                            <div><label className="block text-xs font-medium mb-1">Páginas por sesión</label><input type="number" min="1" value={block.pagesPerSession} onChange={e => onUpdate(block.id, { pagesPerSession: parseInt(e.target.value) || 1 })} className="w-full p-2 bg-white dark:bg-slate-700 rounded-md border border-slate-300 dark:border-slate-600"/></div>
                    ) : (
                            <div><label className="block text-xs font-medium mb-1">Fecha de examen</label><input type="date" min={todayForMinDate} value={block.examDate} onChange={e => onUpdate(block.id, { examDate: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-700 rounded-md border border-slate-300 dark:border-slate-600"/></div>
                    )}
                    </div>
            </div>
            <div>
                    <label className="block text-sm font-medium mb-1">Días de estudio</label>
                <div className="flex gap-2">
                    {weekDays.map((day, index) => (
                        <button key={day} type="button" onClick={() => handleDayToggle(index)} className={`h-10 w-10 font-bold rounded-full ${block.studyDays.includes(dayMapping[index]) ? 'bg-lime-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>{day}</button>
                    ))}
                </div>
            </div>
        </div>
    );
}

interface PlannerViewProps {
    config: StudyPlanConfig | undefined;
    sessions: StudyPlanSession[];
    onUpdateSessions: (sessions: StudyPlanSession[]) => void;
    onStartPlannedQuiz: (session: StudyPlanSession) => void;
    onBack: () => void;
    onGeneratePlan: (config: StudyPlanConfig) => void;
    documentLibrary: DocumentItem[];
    onUploadFile: (file: File) => Promise<string>;
}

const PlannerView: React.FC<PlannerViewProps> = ({ config, sessions, onUpdateSessions, onStartPlannedQuiz, onBack, onGeneratePlan, documentLibrary, onUploadFile }) => {
    const [view, setView] = useState<'plan' | 'config'>(config ? 'plan' : 'config');
    const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1) + (currentWeekOffset * 7)); // Monday start
    
    const weekDates = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        return date;
    });

    const sessionsByDate = useMemo(() => {
        const map = new Map<string, StudyPlanSession[]>();
        sessions.forEach(session => {
            const dateStr = session.date;
            if (!map.has(dateStr)) map.set(dateStr, []);
            map.get(dateStr)!.push(session);
        });
        return map;
    }, [sessions]);
    
    const handleToggleCompletion = (sessionId: string) => {
        onUpdateSessions(sessions.map(s => s.id === sessionId ? {...s, completed: !s.completed} : s));
    }
    
    const handleDeleteAllSessions = () => {
        if (window.confirm("¿Estás seguro de que quieres borrar todas las sesiones del plan actual?")) {
            onUpdateSessions([]);
        }
    };
    
    const handleConfigBack = () => {
        if (config) {
            setView('plan');
        } else {
            onBack();
        }
    };

    if (view === 'config' || !config) {
        return <PlannerConfigurator documentLibrary={documentLibrary} onGeneratePlan={(cfg) => { onGeneratePlan(cfg); setView('plan'); }} onUploadFile={onUploadFile} onBack={handleConfigBack} />;
    }

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col h-full">
            <div className="flex-shrink-0 flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <CalendarDaysIcon className="h-8 w-8 text-purple-500" />
                    <div>
                        <h2 className="text-2xl font-bold">Plan de Estudio</h2>
                        <p className="text-sm text-slate-500">{weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                     <button onClick={() => setView('config')} className="text-sm font-bold px-3 py-1.5 rounded-md bg-slate-200 text-slate-600"><SparklesIcon className="h-4 w-4 inline mr-1"/>Editar Plan</button>
                    <button onClick={handleDeleteAllSessions} className="text-sm font-bold px-3 py-1.5 rounded-md bg-red-100 text-red-600"><TrashIcon className="h-4 w-4 inline mr-1"/>Borrar Plan</button>
                    <button onClick={onBack} className="text-sm font-bold px-3 py-1.5 rounded-md bg-slate-200 text-slate-600"><ArrowPathIcon className="h-4 w-4 inline mr-1"/>Volver</button>
                </div>
            </div>
            
            <div className="flex-shrink-0 flex justify-between items-center mb-4">
                <button onClick={() => setCurrentWeekOffset(p => p - 1)} className="p-2 rounded-full hover:bg-slate-200"><ChevronLeftIcon className="h-6 w-6"/></button>
                <button onClick={() => setCurrentWeekOffset(p => p + 1)} className="p-2 rounded-full hover:bg-slate-200"><ChevronRightIcon className="h-6 w-6"/></button>
            </div>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-7 gap-4 overflow-y-auto pr-2 -mr-2 pb-4">
                {weekDates.map(date => {
                    const dateStr = date.toISOString().split('T')[0];
                    const daySessions = sessionsByDate.get(dateStr) || [];
                    const isToday = date.toDateString() === today.toDateString();

                    return (
                        <div key={dateStr} className={`p-4 rounded-lg ${isToday ? 'bg-lime-50 dark:bg-lime-900/50 border-2 border-lime-500' : 'bg-slate-100/70 dark:bg-slate-800/60'}`}>
                            <h4 className="font-bold text-center">{date.toLocaleDateString('es-ES', { weekday: 'short' })}</h4>
                            <p className="text-sm text-slate-500 text-center mb-3">{date.getDate()}</p>
                            <div className="space-y-2">
                                {daySessions.map(session => (
                                    <div key={session.id} style={{ backgroundColor: session.completed ? '' : session.blockColor }} className={`p-2 rounded-md text-xs ${session.completed ? 'bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-200' : getTextColorForBg(session.blockColor) }`}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-grow pr-1">
                                                <p className="font-bold">{session.blockName}</p>
                                                <p className="font-semibold">{session.fileName}</p>
                                            </div>
                                            <input type="checkbox" checked={session.completed} onChange={() => handleToggleCompletion(session.id)} className="h-4 w-4 rounded-sm text-lime-600 mt-0.5 flex-shrink-0"/>
                                        </div>
                                        <span className={session.completed ? 'text-slate-500' : ''}>Págs: {session.startPage}-{session.endPage} (V{session.lap})</span>
                                        {!session.completed && <button onClick={() => onStartPlannedQuiz(session)} className="w-full mt-2 text-center text-xs font-bold bg-black/20 hover:bg-black/40 rounded py-1">Empezar</button>}
                                    </div>
                                ))}
                                {daySessions.length === 0 && <div className="h-10"></div>}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export { PlannerView };