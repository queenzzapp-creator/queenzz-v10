import React, { useState, useMemo } from 'react';
import { LibraryItem, Folder, SavedQuiz } from '../types.ts';
import { XMarkIcon, FolderIcon, CheckCircleIcon, BookOpenIcon, FolderOpenIcon } from './Icons.tsx';

interface MoveQuestionsModalProps {
    library: LibraryItem[];
    onMove: (targetQuizId: string) => void;
    onClose: () => void;
}

const MoveQuestionsModal: React.FC<MoveQuestionsModalProps> = ({ library, onMove, onClose }) => {
    const [targetId, setTargetId] = useState<string | null>(null);
    const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

    const renderTree = (items: LibraryItem[], level = 0): React.ReactNode[] => {
        return items.map(item => {
            if (item.type === 'deck') return null;

            const isFolder = item.type === 'folder';
            const isOpen = isFolder && openFolders.has(item.id);

            return (
                <div key={item.id} style={{ paddingLeft: `${level * 1.5}rem`}}>
                    <button 
                        onClick={() => {
                            if(isFolder) {
                                const newOpen = new Set(openFolders);
                                if(newOpen.has(item.id)) newOpen.delete(item.id); else newOpen.add(item.id);
                                setOpenFolders(newOpen);
                            } else {
                                setTargetId(item.id);
                            }
                        }}
                        className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border-2 ${targetId === item.id ? 'bg-lime-50 dark:bg-lime-900/50 border-lime-500' : 'border-transparent hover:bg-slate-100/70 dark:hover:bg-slate-700/50'}`}
                    >
                        {isFolder ? (isOpen ? <FolderOpenIcon className="h-5 w-5 text-lime-500"/> : <FolderIcon className="h-5 w-5 text-lime-500"/>) : <BookOpenIcon className="h-5 w-5 text-slate-500"/>}
                        <span className="font-medium text-sm">{item.type === 'folder' ? item.name : item.title}</span>
                    </button>
                    {isFolder && isOpen && renderTree(item.children, level + 1)}
                </div>
            );
        });
    };

    return (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="relative bg-[#FAF8F1] dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-6 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Mover Preguntas A...</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"><XMarkIcon className="h-6 w-6" /></button>
                </header>
                
                <div className="p-6 flex-grow overflow-y-auto">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Elige el test de destino.</p>
                    <div className="space-y-1">
                       {renderTree(library)}
                    </div>
                </div>
                
                <footer className="flex-shrink-0 flex justify-end gap-4 p-6 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={onClose} className="px-5 py-2 text-sm font-bold rounded-md text-slate-600 bg-slate-200/70 hover:bg-slate-300/70">Cancelar</button>
                    <button 
                        onClick={() => onMove(targetId!)}
                        disabled={!targetId}
                        className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-md text-white bg-lime-600 hover:bg-lime-700 disabled:bg-slate-400"
                    >
                        <CheckCircleIcon className="h-5 w-5" />
                        Mover aquí
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default MoveQuestionsModal;