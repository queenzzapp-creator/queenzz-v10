import React, { useState, useEffect, useMemo } from 'react';
import { ArrowPathIcon, BrainIcon, SparklesIcon, TrashIcon, CheckCircleIcon, LightBulbIcon } from './Icons.tsx';
import { generateWordsForNumbers, generateStoryFromWords, generateImageForStory, generateComparisonChart } from '../services/geminiService.ts';
import { MnemonicRule, QuizQuestion, FailedQuestionEntry } from '../types.ts';
import Loader from './Loader.tsx';

// --- Sub-components ---
const MarkdownTable: React.FC<{ content: string }> = ({ content }) => {
    const tableData = useMemo(() => {
        if (!content.trim()) return null;
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) return null; // Header + separator

        const parseLine = (line: string) => line.split('|').map(s => s.trim()).filter(Boolean);

        const header = parseLine(lines[0]);
        const body = lines.slice(2).map(parseLine);

        return { header, body };
    }, [content]);

    if (!tableData || tableData.header.length === 0) return (
        <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg whitespace-pre-wrap font-mono text-xs">
            {content}
        </div>
    );

    return (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                    <tr>
                        {tableData.header.map((th, i) => <th key={i} scope="col" className="px-6 py-3">{th}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {tableData.body.map((row, i) => (
                        <tr key={i} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                            {row.map((td, j) => <td key={j} className="px-6 py-4">{td}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- Main Component ---
interface MnemonicHelperProps {
  onBack: () => void;
  onSaveRule: (rule: MnemonicRule) => void;
  onDeleteRule: (ruleId: string) => void;
  allRules: MnemonicRule[];
  allQuestions: QuizQuestion[];
  associatingForQuestion?: QuizQuestion | null;
  srsEntries: FailedQuestionEntry[];
}

type CreationStep = 'numberInput' | 'wordSelect' | 'storyCreate';
type NumberResult = { number: string; letters: string; words: string[] }[];

const MnemonicHelper: React.FC<MnemonicHelperProps> = ({ onBack, onSaveRule, onDeleteRule, allRules, allQuestions, associatingForQuestion, srsEntries }) => {
    const [activeTab, setActiveTab] = useState<'create' | 'suggestions' | 'my-rules' | 'comparison'>('create');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Rule Creation State
    const [creationStep, setCreationStep] = useState<CreationStep>('numberInput');
    const [numberInput, setNumberInput] = useState('');
    const [numberResult, setNumberResult] = useState<NumberResult | null>(null);
    const [selectedWords, setSelectedWords] = useState<Map<string, string>>(new Map());
    const [additionalKeywords, setAdditionalKeywords] = useState('');
    const [storyContext, setStoryContext] = useState('');
    const [storyResult, setStoryResult] = useState<{ story: string; imageUrl: string } | null>(null);
    const [ruleTitle, setRuleTitle] = useState('');
    const [questionIdLink, setQuestionIdLink] = useState('');

    // Comparison Chart State
    const [chartInput, setChartInput] = useState('');
    const [generatedChart, setGeneratedChart] = useState<string | null>(null);
    const [isGeneratingChart, setIsGeneratingChart] = useState(false);

    const studySuggestions = useMemo(() => {
        return srsEntries.filter(e => e.failureCount >= 3);
    }, [srsEntries]);
    
    const resetCreationState = () => {
        setCreationStep('numberInput');
        setNumberInput('');
        setNumberResult(null);
        setSelectedWords(new Map());
        setAdditionalKeywords('');
        setStoryContext('');
        setStoryResult(null);
        setRuleTitle('');
        setQuestionIdLink('');
        setError('');
    };
    
    const startCreationForQuestion = (question: QuizQuestion) => {
        resetCreationState();
        setRuleTitle(`Regla para: ${question.question.substring(0, 30)}...`);
        setQuestionIdLink(question.id);
        setActiveTab('create');
    };
    
    useEffect(() => {
        if(associatingForQuestion) {
            startCreationForQuestion(associatingForQuestion);
        }
    }, [associatingForQuestion]);

    const handleGenerateWords = async () => {
        const numbers = numberInput.split(',').map(n => n.trim()).filter(Boolean);
        if (numbers.length === 0 || numbers.some(n => !n.match(/^\d+$/))) {
            setError('Introduce solo números, separados por comas.');
            return;
        }
        setIsLoading(true);
        setError('');
        setNumberResult(null);
        try {
            const result = await generateWordsForNumbers(numbers);
            setNumberResult(result);
            setCreationStep('wordSelect');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fallo al generar palabras.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleWordSelection = (number: string, word: string) => {
        const newSelection = new Map(selectedWords);
        if (newSelection.get(number) === word) {
            newSelection.delete(number); // Toggle off
        } else {
            newSelection.set(number, word); // Select
        }
        setSelectedWords(newSelection);
    };

    const handleGenerateStory = async () => {
        const allKeywords = [...Array.from(selectedWords.values()), ...additionalKeywords.split(',').map(k => k.trim()).filter(Boolean)].join(', ');
        if (!allKeywords) {
            setError('Introduce o selecciona al menos una palabra clave.');
            return;
        }
        setIsLoading(true);
        setError('');
        setStoryResult(null);
        try {
            const story = await generateStoryFromWords(allKeywords, storyContext);
            const imageUrl = await generateImageForStory(story);
            setStoryResult({ story, imageUrl: `data:image/jpeg;base64,${imageUrl}` });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fallo al generar la historia o la imagen.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveCurrentRule = () => {
        if (!ruleTitle.trim()) {
            setError('El título de la regla no puede estar vacío.');
            return;
        }
        
        let newRule: MnemonicRule | null = null;
        if(storyResult) {
             newRule = {
                id: crypto.randomUUID(),
                questionId: questionIdLink,
                title: ruleTitle.trim(),
                type: 'story',
                keywords: [...Array.from(selectedWords.values()), ...additionalKeywords.split(',').map(k => k.trim()).filter(Boolean)].join(', '),
                story: storyResult.story,
                imageUrl: storyResult.imageUrl,
                ...(selectedWords.size > 0 && {
                    numberStr: Array.from(selectedWords.keys()).join(', '),
                    words: Array.from(selectedWords.values()).join(', ')
                })
            };
        }

        if (newRule) {
            onSaveRule(newRule);
            resetCreationState();
            setActiveTab('my-rules');
        }
    };

    const handleGenerateChart = async () => {
        if(!chartInput.trim()) {
            setError("Introduce un tema o selecciona una pregunta para generar el cuadro.");
            return;
        }
        setIsGeneratingChart(true);
        setError('');
        setGeneratedChart(null);
        try {
            const result = await generateComparisonChart(chartInput.trim());
            setGeneratedChart(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fallo al generar el cuadro comparativo.');
        } finally {
            setIsGeneratingChart(false);
        }
    }

    const questionsMap = useMemo(() => new Map(allQuestions.map(q => [q.id, q])), [allQuestions]);

    // --- RENDER FUNCTIONS ---
    
    const renderStudySuggestions = () => (
        <div className="space-y-4">
             <p className="text-sm text-slate-500 dark:text-slate-400">Aquí tienes las preguntas que has fallado 3 o más veces. ¡Es un buen momento para crearles una regla mnemotécnica!</p>
             {studySuggestions.length > 0 ? studySuggestions.map(entry => (
                <div key={entry.question.id} className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{entry.question.question}</p>
                        <p className="text-xs text-red-500 font-bold">Fallada {entry.failureCount} veces</p>
                    </div>
                    <button onClick={() => startCreationForQuestion(entry.question)} className="px-3 py-1.5 text-xs font-bold bg-lime-600 text-white rounded-md hover:bg-lime-700">Crear Regla</button>
                </div>
             )) : <p className="text-center py-8 text-slate-500">¡Felicidades! No tienes preguntas con 3 o más fallos.</p>}
        </div>
    );
    
    const renderMyRules = () => (
        <div className="space-y-4">
             <p className="text-sm text-slate-500 dark:text-slate-400">Aquí puedes ver todas tus reglas mnemotécnicas guardadas.</p>
             {allRules.length > 0 ? allRules.map(rule => (
                <div key={rule.id} className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100">{rule.title}</h4>
                            {rule.questionId && questionsMap.has(rule.questionId) ? (
                                <p className="text-xs text-lime-600 dark:text-lime-400 italic">Vinculada a: "{questionsMap.get(rule.questionId)!.question.substring(0, 50)}..."</p>
                            ) : (
                                <p className="text-xs text-slate-500 italic">No vinculada a una pregunta específica.</p>
                            )}
                        </div>
                        <button onClick={() => onDeleteRule(rule.id)} className="p-2 text-slate-400 hover:text-red-500"><TrashIcon className="h-5 w-5"/></button>
                    </div>
                </div>
             )) : <p className="text-center py-8 text-slate-500">No tienes reglas guardadas.</p>}
        </div>
    );
    
    const renderCreationFlow = () => (
        <div className="space-y-6">
            {creationStep === 'numberInput' && (
                <div className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 animate-fade-in">
                    <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-2">Paso 1: ¿Hay números que recordar?</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Convierte números (fechas, artículos...) en palabras fáciles de recordar. Puedes añadir varios separados por comas.</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input type="text" value={numberInput} onChange={e => setNumberInput(e.target.value)} placeholder="Ej: 1812, 42, 7" className="flex-grow p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"/>
                        <button onClick={handleGenerateWords} disabled={isLoading || !numberInput} className="px-5 py-2 text-base font-bold bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors shadow-lg disabled:bg-slate-400">Convertir a Palabras</button>
                    </div>
                     <div className="mt-4 text-center">
                        <button onClick={() => setCreationStep('storyCreate')} className="text-sm text-slate-500 dark:text-slate-400 hover:underline">Omitir y crear una historia directamente</button>
                    </div>
                </div>
            )}
            
            {creationStep === 'wordSelect' && numberResult && (
                <div className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 animate-fade-in">
                    <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-2">Paso 2: Selecciona tus palabras</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Haz clic en la palabra que te parezca más fácil de recordar para cada número.</p>
                    <div className="max-h-60 overflow-y-auto space-y-4 p-2 border rounded-md bg-slate-100/50 dark:bg-slate-900/40">
                        {numberResult.map(res => (
                            <div key={res.number}>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200">{res.number} <span className="font-mono text-xs p-1 bg-slate-200 dark:bg-slate-700 rounded">{res.letters}</span></h4>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {res.words.map(word => (
                                        <button key={word} type="button" onClick={() => handleWordSelection(res.number, word)} className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${selectedWords.get(res.number) === word ? 'bg-lime-500 border-lime-600 text-white' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-lime-100 dark:hover:bg-lime-800'}`}>
                                            {word}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button onClick={() => setCreationStep('storyCreate')} className="px-5 py-2 text-base font-bold bg-lime-600 text-white rounded-lg hover:bg-lime-700">Continuar</button>
                    </div>
                </div>
            )}

            {creationStep === 'storyCreate' && (
                 <div className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 animate-fade-in space-y-4">
                    <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200">Paso 3: Crea tu historia visual</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Combina las palabras seleccionadas con otras que necesites recordar y añade contexto para que la IA genere la historia perfecta.</p>
                    
                    {selectedWords.size > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Palabras de los números:</label>
                             <div className="flex flex-wrap gap-2">
                                {[...selectedWords.values()].map(w => <span key={w} className="px-2 py-1 bg-lime-200 dark:bg-lime-800 text-lime-800 dark:text-lime-200 text-sm font-semibold rounded-full">{w}</span>)}
                            </div>
                        </div>
                    )}
                     <div>
                        <label htmlFor="additional-keywords" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Palabras clave adicionales (separadas por coma):</label>
                        <input id="additional-keywords" type="text" value={additionalKeywords} onChange={e => setAdditionalKeywords(e.target.value)} placeholder="Ej: Constitución, Rey" className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"/>
                    </div>
                     <div>
                        <label htmlFor="story-context" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Sugerencias para la historia (opcional):</label>
                        <textarea id="story-context" value={storyContext} onChange={e => setStoryContext(e.target.value)} rows={2} placeholder="Ej: Haz que sea graciosa, ambientada en la Edad Media..." className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"/>
                    </div>
                    <div className="text-right">
                        <button onClick={handleGenerateStory} disabled={isLoading} className="px-5 py-2 text-base font-bold bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors shadow-lg disabled:bg-slate-400">Generar Historia Visual</button>
                    </div>

                    {storyResult && !isLoading && (
                        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 animate-fade-in space-y-4">
                            <img src={storyResult.imageUrl} alt="Visualización de la historia" className="w-full h-auto max-w-sm mx-auto rounded-lg shadow-md" />
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-200">Historia Generada:</h4>
                                <p className="italic">{storyResult.story}</p>
                            </div>
                             <div className="p-4 bg-lime-50 dark:bg-lime-900/40 rounded-lg border border-lime-200 dark:border-lime-700 space-y-3">
                                <h3 className="font-bold text-lg text-lime-700 dark:text-lime-300">Guardar esta Regla</h3>
                                <input type="text" value={ruleTitle} onChange={e => setRuleTitle(e.target.value)} placeholder="Dale un título a tu regla..." className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"/>
                                <select value={questionIdLink} onChange={e => setQuestionIdLink(e.target.value)} className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                                    <option value="">Vincular a una pregunta (opcional)</option>
                                    {allQuestions.map(q => <option key={q.id} value={q.id}>{q.question.substring(0, 80)}...</option>)}
                                </select>
                                <div className="flex justify-end">
                                    <button onClick={handleSaveCurrentRule} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md text-white bg-lime-600 hover:bg-lime-700"><CheckCircleIcon className="h-5 w-5"/>Guardar Regla</button>
                                </div>
                            </div>
                        </div>
                    )}
                 </div>
            )}
        </div>
    );

    const renderComparisonChartTab = () => (
        <div className="space-y-6">
            <div className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200">Generador de Cuadros Comparativos</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Introduce un tema o selecciona una de tus preguntas difíciles para que la IA cree una tabla comparativa que te ayude a estudiar.</p>
                <select 
                    onChange={e => setChartInput(e.target.value)} 
                    value={chartInput}
                    className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                >
                    <option value="">O selecciona una pregunta sugerida...</option>
                    {studySuggestions.map(s => <option key={s.question.id} value={s.question.question}>{s.question.question.substring(0,100)}...</option>)}
                </select>
                <textarea 
                    value={chartInput} 
                    onChange={e => setChartInput(e.target.value)} 
                    rows={3} 
                    placeholder="Ej: Diferencias entre la Constitución de 1812 y 1978" 
                    className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"
                />
                <div className="text-right">
                    <button onClick={handleGenerateChart} disabled={isGeneratingChart} className="px-5 py-2 text-base font-bold bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors shadow-lg disabled:bg-slate-400">
                        {isGeneratingChart ? 'Generando...' : 'Generar Cuadro'}
                    </button>
                </div>
            </div>
            {isGeneratingChart && <Loader message="Creando cuadro comparativo..." />}
            {generatedChart && (
                <div className="animate-fade-in">
                    <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-2">Resultado</h3>
                    <MarkdownTable content={generatedChart} />
                </div>
            )}
        </div>
    );

    return (
        <div className="animate-fade-in flex flex-col h-full w-full max-w-4xl mx-auto">
            <div className="flex-shrink-0">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <BrainIcon className="h-8 w-8 text-amber-500" />
                        Ayudante de Estudio
                    </h2>
                    <button onClick={onBack} className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <ArrowPathIcon className="h-5 w-5" /> Volver
                    </button>
                </div>
            </div>
            
            <div className="flex-shrink-0 flex border-b border-slate-200 dark:border-slate-700 mb-6">
                <button onClick={() => setActiveTab('create')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'create' ? 'border-lime-500 text-lime-600 dark:text-lime-400' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Crear Regla</button>
                <button onClick={() => setActiveTab('comparison')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'comparison' ? 'border-lime-500 text-lime-600 dark:text-lime-400' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Cuadro Comparativo</button>
                <button onClick={() => setActiveTab('suggestions')} className={`relative flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'suggestions' ? 'border-lime-500 text-lime-600 dark:text-lime-400' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    Sugerencias
                    {studySuggestions.length > 0 && <span className="absolute top-1 right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{studySuggestions.length}</span>}
                </button>
                <button onClick={() => setActiveTab('my-rules')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'my-rules' ? 'border-lime-500 text-lime-600 dark:text-lime-400' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Mis Reglas ({allRules.length})</button>
            </div>

            <div className="flex-grow overflow-y-auto pr-2 -mr-2 pb-4">
                {isLoading ? <Loader message="La IA está pensando..." /> :
                 error ? <p className="text-red-500 text-center">{error}</p> :
                 <>
                    {activeTab === 'create' && renderCreationFlow()}
                    {activeTab === 'comparison' && renderComparisonChartTab()}
                    {activeTab === 'suggestions' && renderStudySuggestions()}
                    {activeTab === 'my-rules' && renderMyRules()}
                 </>
                }
            </div>
        </div>
    );
};

export default MnemonicHelper;