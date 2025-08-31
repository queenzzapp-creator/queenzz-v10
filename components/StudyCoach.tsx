import React, { useState, useEffect, useRef } from 'react';
import { createOmniCoachChatSession } from '../services/geminiService.ts';
import { Chat, Part } from '@google/genai';
import { AppLogoIcon, PaperAirplaneIcon, PlusCircleIcon, XCircleIcon } from './Icons.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';
import { AppData, Settings } from '../types.ts';
import { fileToBase64, parseFileToText } from '../utils/fileParser.ts';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
}

interface StudyCoachProps {
    appData: AppData;
    settings: Settings;
    onExecuteAction: (action: string, params: any) => Promise<any>;
}

const fileToPart = async (file: File): Promise<Part> => {
    // If it's an image, send it as inlineData
    if (file.type.startsWith('image/')) {
        const base64String = await fileToBase64(file);
        const [, data] = base64String.split(',');
        return {
            inlineData: {
                mimeType: file.type,
                data
            }
        };
    }
    
    // For other supported types, parse to text and send as a text part
    try {
        const textContent = await parseFileToText(file);
        return { text: `Contenido del archivo adjunto "${file.name}":\n\n${textContent}` };
    } catch (e) {
        console.error(`Error parsing file ${file.name}:`, e);
        return { text: `[No se pudo procesar el archivo ${file.name}]` };
    }
};

const StudyCoach: React.FC<StudyCoachProps> = ({ appData, settings, onExecuteAction }) => {
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const initChat = () => {
            setIsLoading(true);
            const session = createOmniCoachChatSession(appData, settings);
            setChatSession(session);
            setMessages([{
                id: crypto.randomUUID(),
                text: '¡Hola! Soy tu asistente de estudio. ¿Qué necesitas hacer? Puedes adjuntar archivos para que los analice.',
                sender: 'ai'
            }]);
            setIsLoading(false);
        };
        initChat();
    }, [appData, settings]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!userInput.trim() && attachedFiles.length === 0) || !chatSession || isLoading) return;

        const currentInput = userInput.trim();
        const userMessage: Message = { id: crypto.randomUUID(), text: currentInput, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsLoading(true);

        try {
            const fileParts = await Promise.all(attachedFiles.map(fileToPart));
            
            const messageParts: Part[] = [];
            if (currentInput) {
                messageParts.push({ text: currentInput });
            }
            messageParts.push(...fileParts);

            let response = await chatSession.sendMessage({ message: messageParts });
            
            let finalResponse = response;
            if (finalResponse.functionCalls && finalResponse.functionCalls.length > 0) {
                const calls = finalResponse.functionCalls;
                const toolResponses = await Promise.all(calls.map(async call => {
                    const result = await onExecuteAction(call.name, call.args);
                    return {
                        functionResponse: { name: call.name, response: result }
                    };
                }));
            
                finalResponse = await chatSession.sendMessage({ message: toolResponses as any });
            }
            
            setAttachedFiles([]); // Clear files after sending
            setMessages(prev => [...prev, { id: crypto.randomUUID(), text: finalResponse.text || '', sender: 'ai' }]);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { id: crypto.randomUUID(), text: 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.', sender: 'ai' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeFile = (fileToRemove: File) => {
        setAttachedFiles(prev => prev.filter(file => file !== fileToRemove));
    };
    
    return (
        <div className="flex flex-col h-full w-full">
            <main className="flex-grow p-4 overflow-y-auto">
                <div className="space-y-4">
                    {messages.map((message) => (
                        <div key={message.id} className={`flex items-end gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                            {message.sender === 'ai' && <AppLogoIcon className="h-8 w-8 flex-shrink-0" />}
                            <div className={`max-w-md p-3 rounded-2xl ${message.sender === 'user' ? 'bg-lime-500 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none'}`}>
                                <MarkdownRenderer text={message.text} />
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className={`flex items-end gap-3`}>
                            <AppLogoIcon className="h-8 w-8 flex-shrink-0" />
                            <div className={`max-w-md p-3 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none`}>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div ref={messagesEndRef} />
            </main>
             <footer className="flex-shrink-0 p-4 border-t border-slate-200 dark:border-slate-700">
                {attachedFiles.length > 0 && (
                    <div className="mb-2 p-2 border border-slate-300 dark:border-slate-600 rounded-lg">
                        <div className="flex flex-wrap gap-2">
                            {attachedFiles.map((file, index) => (
                                <div key={index} className="relative bg-slate-200 dark:bg-slate-700 p-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200">
                                    <span>{file.name}</span>
                                    <button onClick={() => removeFile(file)} className="absolute -top-1 -right-1 bg-slate-500 text-white rounded-full">
                                        <XCircleIcon className="h-4 w-4"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-500 dark:text-slate-400 hover:text-lime-600 dark:hover:text-lime-400" title="Adjuntar archivos">
                        <PlusCircleIcon className="h-6 w-6" />
                    </button>
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Pregúntame o dame una orden..."
                        disabled={isLoading}
                        className="w-full p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500 text-slate-900 dark:text-slate-100 disabled:opacity-60"
                    />
                    <button type="submit" disabled={isLoading || (!userInput.trim() && attachedFiles.length === 0)} className="p-3 bg-lime-600 text-white rounded-lg hover:bg-lime-700 disabled:bg-slate-400 disabled:cursor-not-allowed">
                        <PaperAirplaneIcon className="h-6 w-6" />
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default StudyCoach;