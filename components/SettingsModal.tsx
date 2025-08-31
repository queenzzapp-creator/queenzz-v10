import React, { useState } from 'react';
import { Settings, QuizSettings, LibraryData } from '../types.ts';
import { XMarkIcon, Cog6ToothIcon, SunIcon, MoonIcon, EyeIcon, QuestionMarkCircleIcon, CloudIcon, ClockIcon, WrenchScrewdriverIcon, EnvelopeIcon, PlusCircleIcon, TrashIcon, AcademicCapIcon, InboxStackIcon, AdjustmentsHorizontalIcon, Squares2X2Icon, BookOpenIcon, ExclamationTriangleIcon } from './Icons.tsx';
import LibrarySwitcher from './LibrarySwitcher.tsx';
import HelpModal from './HelpModal.tsx';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: Settings;
    onSave: (newSettings: Settings) => void;
    activeLibrary: LibraryData;
    allLibraries: { id: string; name: string }[];
    onSwitch: (id: string) => void;
    onCreate: (name: string) => void;
    onRename: (newName: string) => void;
    onDelete: () => void;
    onOpenHelp: () => void;
    onResetProgress: () => void;
    onImport: () => void;
    onExportJson: () => void;
    onExportPdf: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, activeLibrary, allLibraries, onSwitch, onCreate, onRename, onDelete, onOpenHelp, onResetProgress, onImport, onExportJson, onExportPdf }) => {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState<'appearance' | 'quiz' | 'modules' | 'coach' | 'libraries' | 'help'>('appearance');
    const [localSettings, setLocalSettings] = useState<Settings>(settings);
    const [newUrl, setNewUrl] = useState('');

    const handleSaveAndClose = () => {
        const intervals = String(localSettings.srsIntervals)
            .split(',')
            .map(s => parseInt(s.trim(), 10))
            .filter(n => !isNaN(n) && n > 0);
        
        if (intervals.length === 0) {
            intervals.push(1); // Ensure there's at least one interval
        }

        onSave({ ...localSettings, srsIntervals: intervals });
        onClose();
    };
    
    const handleSettingChange = (newSettings: Partial<Settings>) => {
        setLocalSettings(prev => ({ ...prev, ...newSettings }));
    };

    const handleDefaultQuizSettingChange = <K extends keyof QuizSettings>(key: K, value: QuizSettings[K]) => {
        handleSettingChange({
            defaultQuizSettings: {
                ...localSettings.defaultQuizSettings,
                [key]: value,
            },
        });
    };
    
    const handleAddUrl = () => {
        if (newUrl.trim() && !localSettings.coachKnowledgeBaseUrls?.includes(newUrl.trim())) {
            handleSettingChange({
                coachKnowledgeBaseUrls: [...(localSettings.coachKnowledgeBaseUrls || []), newUrl.trim()]
            });
            setNewUrl('');
        }
    };

    const handleRemoveUrl = (urlToRemove: string) => {
        handleSettingChange({
            coachKnowledgeBaseUrls: (localSettings.coachKnowledgeBaseUrls || []).filter(url => url !== urlToRemove)
        });
    };

    const appearanceTab = (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Tema</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Elige cómo quieres que se vea la aplicación.</p>
                <div className="flex gap-4">
                    <button onClick={() => handleSettingChange({ theme: 'light' })} className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 border rounded-lg transition-colors ${localSettings.theme === 'light' ? 'bg-lime-50 dark:bg-lime-900/50 border-lime-500 ring-2 ring-lime-200 dark:ring-lime-700' : 'bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                        <SunIcon className="h-8 w-8 text-yellow-500" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">Claro</span>
                    </button>
                    <button onClick={() => handleSettingChange({ theme: 'dark' })} className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 border rounded-lg transition-colors ${localSettings.theme === 'dark' ? 'bg-lime-50 dark:bg-lime-900/50 border-lime-500 ring-2 ring-lime-200 dark:ring-lime-700' : 'bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                        <MoonIcon className="h-8 w-8 text-indigo-400" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">Oscuro</span>
                    </button>
                </div>
            </div>
             <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Modo de Visualización</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Elige una experiencia visual simplificada y sin distracciones.</p>
                <div className="flex gap-4">
                    <button onClick={() => handleSettingChange({ vision: 'default' })} className={`flex-1 p-4 border rounded-lg transition-colors ${localSettings.vision === 'default' ? 'bg-lime-50 dark:bg-lime-900/50 border-lime-500 ring-2 ring-lime-200 dark:ring-lime-700' : 'bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                        <span className="font-medium text-slate-800 dark:text-slate-200">Estándar</span>
                    </button>
                    <button onClick={() => handleSettingChange({ vision: 'minimalist' })} className={`flex-1 p-4 border rounded-lg transition-colors ${localSettings.vision === 'minimalist' ? 'bg-lime-50 dark:bg-lime-900/50 border-lime-500 ring-2 ring-lime-200 dark:ring-lime-700' : 'bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                        <span className="font-medium text-slate-800 dark:text-slate-200">Minimalista</span>
                    </button>
                </div>
            </div>
        </div>
    );
    
    const modulesTab = (
         <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Módulos de la Aplicación</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Activa o desactiva las herramientas principales para personalizar la interfaz.</p>
            
            {[
                { key: 'showStats', label: 'Panel de Estadísticas (Biblioteca)' },
                { key: 'showStudyCoach', label: 'Tutor con IA (Botón flotante)' },
                { key: 'showMnemonicHelper', label: 'Ayudante de Estudio' },
                { key: 'showPlanner', label: 'Planificador de Estudio' },
                { key: 'showProgressView', label: 'Análisis de Progreso' },
                { key: 'showDocumentManager', label: 'Gestor de Contenido (en Biblioteca)' },
            ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between p-4 bg-white dark:bg-slate-700/50 border dark:border-slate-600 rounded-lg cursor-pointer">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{label}</span>
                    <div 
                        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${localSettings[key as keyof Settings] ? 'bg-lime-600' : 'bg-slate-300 dark:bg-slate-500'}`} 
                        onClick={() => handleSettingChange({ [key]: !localSettings[key as keyof Settings] } as Partial<Settings>)}
                    >
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${localSettings[key as keyof Settings] ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                </label>
            ))}
        </div>
    );

    const coachTab = (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Base de Conocimiento del Asistente</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Añade URLs para que el asistente de IA las use como fuente principal de información al responder tus preguntas.</p>
                <div className="flex items-stretch gap-2">
                    <input
                        type="url"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }}
                        placeholder="https://ejemplo.com/mi-documento"
                        className="flex-grow p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"
                    />
                    <button type="button" onClick={handleAddUrl} className="px-4 py-2 font-bold bg-lime-600 text-white rounded-lg hover:bg-lime-700">Añadir</button>
                </div>
                <div className="mt-4 max-h-48 overflow-y-auto space-y-2">
                    {(localSettings.coachKnowledgeBaseUrls || []).map(url => (
                        <div key={url} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate pr-2">{url}</span>
                            <button type="button" onClick={() => handleRemoveUrl(url)} className="p-1 text-slate-400 hover:text-red-500"><TrashIcon className="h-4 w-4"/></button>
                        </div>
                    ))}
                     {(localSettings.coachKnowledgeBaseUrls || []).length === 0 && <p className="text-sm text-slate-500 text-center py-4">No hay URLs añadidas.</p>}
                </div>
            </div>
        </div>
    );

    const quizTab = (
        <div className="space-y-6">
            <div>
                 <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Configuración de Inicio</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Controla si se muestra la pantalla de configuración cada vez que inicias un test.</p>
                 <label className="flex items-center justify-between p-4 bg-white dark:bg-slate-700/50 border dark:border-slate-600 rounded-lg cursor-pointer">
                    <span className="font-medium text-slate-800 dark:text-slate-200">Preguntar siempre antes de empezar</span>
                    <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${localSettings.alwaysConfigureQuiz ? 'bg-lime-600' : 'bg-slate-300 dark:bg-slate-500'}`} onClick={() => handleSettingChange({ alwaysConfigureQuiz: !localSettings.alwaysConfigureQuiz })}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${localSettings.alwaysConfigureQuiz ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                 </label>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Ajustes por Defecto del Test</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Estos ajustes se usarán si desactivas la opción de "preguntar siempre".</p>
                <div className="p-4 bg-white dark:bg-slate-700/50 border dark:border-slate-600 rounded-lg space-y-4">
                    <div>
                        <label htmlFor="scoring-system" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Sistema de Puntuación</label>
                        <select id="scoring-system" value={localSettings.defaultQuizSettings.penaltySystem} onChange={(e) => handleDefaultQuizSettingChange('penaltySystem', e.target.value as any)} className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md">
                            <option value="standard">Estándar (con penalización)</option>
                            <option value="classic">Clásico (sin penalización)</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="show-answers" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Mostrar Respuestas</label>
                        <select id="show-answers" value={localSettings.defaultQuizSettings.showAnswers} onChange={(e) => handleDefaultQuizSettingChange('showAnswers', e.target.value as any)} className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md">
                            <option value="immediately">Después de cada pregunta</option>
                            <option value="atEnd">Al finalizar el test</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="time-mode" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Modo de Tiempo</label>
                        <select id="time-mode" value={localSettings.defaultQuizSettings.mode} onChange={(e) => handleDefaultQuizSettingChange('mode', e.target.value as any)} className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md">
                            <option value="none">Sin temporizador</option>
                            <option value="perQuestion">Tiempo por pregunta</option>
                            <option value="total">Tiempo total del test</option>
                        </select>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Aleatorización por Defecto</p>
                        <div className="mt-2 space-y-2">
                            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input type="checkbox" checked={localSettings.defaultQuizSettings.shuffleQuestions} onChange={(e) => handleDefaultQuizSettingChange('shuffleQuestions', e.target.checked)} className="h-4 w-4 rounded text-lime-600 focus:ring-lime-500"/> Mezclar orden de preguntas</label>
                            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input type="checkbox" checked={localSettings.defaultQuizSettings.shuffleOptions} onChange={(e) => handleDefaultQuizSettingChange('shuffleOptions', e.target.checked)} className="h-4 w-4 rounded text-lime-600 focus:ring-lime-500"/> Mezclar orden de respuestas</label>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Retos</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Configura el número de preguntas para los retos semanales y mensuales.</p>
                <div className="p-4 bg-white dark:bg-slate-700/50 border dark:border-slate-600 rounded-lg space-y-4">
                    <div>
                        <label htmlFor="weekly-challenge-count" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Preguntas del Reto Semanal</label>
                        <input
                            id="weekly-challenge-count"
                            type="number"
                            min="1"
                            value={localSettings.challengeSettings.weeklyQuestionCount}
                            onChange={e => handleSettingChange({ challengeSettings: { ...localSettings.challengeSettings, weeklyQuestionCount: Number(e.target.value) } })}
                            className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md"
                        />
                    </div>
                    <div>
                        <label htmlFor="monthly-challenge-count" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Preguntas del Reto Mensual</label>
                        <input
                            id="monthly-challenge-count"
                            type="number"
                            min="1"
                            value={localSettings.challengeSettings.monthlyQuestionCount}
                            onChange={e => handleSettingChange({ challengeSettings: { ...localSettings.challengeSettings, monthlyQuestionCount: Number(e.target.value) } })}
                            className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md"
                        />
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Generación con IA</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Establece los valores por defecto para la creación de contenido con IA.</p>
                <div className="p-4 bg-white dark:bg-slate-700/50 border dark:border-slate-600 rounded-lg">
                    <label htmlFor="default-options" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Número de opciones por defecto</label>
                    <select
                        id="default-options"
                        value={localSettings.defaultNumberOfOptions}
                        onChange={e => handleSettingChange({ defaultNumberOfOptions: e.target.value as any })}
                        className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md"
                    >
                        <option value="2">2 Opciones</option>
                        <option value="3">3 Opciones</option>
                        <option value="4">4 Opciones</option>
                        <option value="5">5 Opciones</option>
                        <option value="variable">Variable (IA decide)</option>
                    </select>
                </div>
            </div>
            <div>
                 <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Tests Personalizados</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Elige si quieres guardar los tests creados desde "Test Personalizado" en tu biblioteca después de completarlos.</p>
                 <label className="flex items-center justify-between p-4 bg-white dark:bg-slate-700/50 border dark:border-slate-600 rounded-lg cursor-pointer">
                    <span className="font-medium text-slate-800 dark:text-slate-200">Guardar tests personalizados automáticamente</span>
                    <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${localSettings.saveCustomTests ? 'bg-lime-600' : 'bg-slate-300 dark:bg-slate-500'}`} onClick={() => handleSettingChange({ saveCustomTests: !localSettings.saveCustomTests })}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${localSettings.saveCustomTests ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                 </label>
            </div>
            <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Sistema de Repaso Espaciado (SRS)</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Configura los intervalos (en días) entre repasos correctos para optimizar la memorización.</p>
                <div className="space-y-4 p-4 bg-white dark:bg-slate-700/50 border dark:border-slate-600 rounded-lg">
                    <div>
                        <label htmlFor="srs-intervals" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Intervalos de Repaso (días, separados por comas)</label>
                        <input 
                            id="srs-intervals"
                            type="text" 
                            defaultValue={localSettings.srsIntervals.join(', ')}
                            onChange={e => handleSettingChange({ srsIntervals: e.target.value.split(',').map(s => Number(s.trim())).filter(Boolean) as any })}
                            className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md font-mono"
                        />
                    </div>
                    <div>
                        <label htmlFor="srs-req" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Aciertos espaciados necesarios para "aprender"</label>
                        <input 
                            id="srs-req"
                            type="number" 
                            value={localSettings.srsGraduationRequirement} 
                            onChange={e => handleSettingChange({ srsGraduationRequirement: Number(e.target.value) || 3 })} 
                            min="1" 
                            max="10"
                            className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const librariesTab = (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Gestionar Bibliotecas</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Cambia, crea, renombra o elimina tus colecciones de estudio desde aquí.</p>
                <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg flex justify-center">
                    <LibrarySwitcher 
                        activeLibrary={activeLibrary} 
                        allLibraries={allLibraries}
                        onSwitch={onSwitch}
                        onCreate={onCreate}
                        onRename={onRename}
                        onDelete={onDelete}
                        onImport={onImport}
                        onExportJson={onExportJson}
                        onExportPdf={onExportPdf}
                    />
                </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-300 dark:border-slate-600">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Zona de Peligro</h3>
                <div className="mt-4 p-4 border border-red-300 dark:border-red-600 rounded-lg bg-red-50/50 dark:bg-red-900/30">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Restablecer Progreso</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-3">
                        Esto borrará todo tu historial de estudio para la biblioteca actual: puntuaciones de tests, preguntas falladas y acertadas, y el progreso de repaso (SRS). El contenido (tests, fichas) no se eliminará.
                    </p>
                    <button
                        onClick={onResetProgress}
                        className="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                        Restablecer Progreso de "{activeLibrary.name}"
                    </button>
                </div>
            </div>
        </div>
    );

    const helpTab = (
        <div className="space-y-6">
            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Ayuda y Consejos</h3>
                <p><strong>Generar contenido:</strong> Usa el panel lateral para crear tests y fichas desde texto, archivos, o la web.</p>
                <p><strong>Repaso Inteligente:</strong> Las preguntas que fallas o dejas en blanco se añaden a una cola de repaso (SRS). Practícalas desde el panel principal.</p>
                <p><strong>Organización:</strong> Haz doble clic en un elemento para renombrarlo. Usa una pulsación larga (o clic derecho) para activar la selección múltiple y mover o eliminar elementos.</p>
                <p><strong>Múltiples Bibliotecas:</strong> Puedes crear distintas bibliotecas (ej. "Universidad", "Oposiciones") para mantener tu contenido separado.</p>
            </div>
            <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Soporte y Guía</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">¿Necesitas un recorrido completo o has encontrado un error?</p>
                <div className="flex flex-col sm:flex-row gap-4">
                     <button 
                        onClick={onOpenHelp}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <BookOpenIcon className="h-5 w-5" />
                        Manual de Usuario
                    </button>
                    <a 
                        href="mailto:soporte.queenzz@gmail.com?subject=Reporte%20de%20Fallo%20-%20QUEENZZ%20App" 
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <EnvelopeIcon className="h-5 w-5" />
                        Reportar un Fallo
                    </a>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={handleSaveAndClose}>
            <div className="relative bg-[#FAF8F1] dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-6 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <Cog6ToothIcon className="h-7 w-7" /> Configuración
                    </h2>
                    <button onClick={handleSaveAndClose} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100 transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </header>
                <div className="flex flex-grow overflow-hidden">
                    <nav className="w-1/4 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 p-4 space-y-1">
                        <button onClick={() => setActiveTab('appearance')} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'appearance' ? 'bg-lime-100/70 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            <EyeIcon className="h-5 w-5"/> Apariencia
                        </button>
                        <button onClick={() => setActiveTab('quiz')} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'quiz' ? 'bg-lime-100/70 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            <AdjustmentsHorizontalIcon className="h-5 w-5"/> Tests
                        </button>
                         <button onClick={() => setActiveTab('modules')} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'modules' ? 'bg-lime-100/70 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            <Squares2X2Icon className="h-5 w-5"/> Módulos
                        </button>
                         <button onClick={() => setActiveTab('coach')} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'coach' ? 'bg-lime-100/70 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            <AcademicCapIcon className="h-5 w-5"/> Asistente
                        </button>
                        <button onClick={() => setActiveTab('libraries')} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'libraries' ? 'bg-lime-100/70 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            <InboxStackIcon className="h-5 w-5"/> Bibliotecas
                        </button>
                        <button onClick={() => setActiveTab('help')} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'help' ? 'bg-lime-100/70 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            <QuestionMarkCircleIcon className="h-5 w-5"/> Ayuda
                        </button>
                    </nav>
                    <main className="flex-grow p-6 overflow-y-auto min-h-[480px]">
                        {activeTab === 'appearance' && appearanceTab}
                        {activeTab === 'quiz' && quizTab}
                        {activeTab === 'modules' && modulesTab}
                        {activeTab === 'coach' && coachTab}
                        {activeTab === 'libraries' && librariesTab}
                        {activeTab === 'help' && helpTab}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;