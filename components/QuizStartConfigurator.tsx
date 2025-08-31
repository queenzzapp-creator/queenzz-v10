

import React, { useState } from 'react';
import { QuizSettings } from '../types';
import { SparklesIcon, ClockIcon, ArrowPathIcon } from './Icons';

interface QuizStartConfiguratorProps {
  onStart: (settings: QuizSettings) => void;
  onCancel: () => void;
  defaultSettings: QuizSettings;
}

const QuizStartConfigurator: React.FC<QuizStartConfiguratorProps> = ({ onStart, onCancel, defaultSettings }) => {
  const [mode, setMode] = useState<QuizSettings['mode']>(defaultSettings.mode);
  const [duration, setDuration] = useState(defaultSettings.duration);
  const [showAnswers, setShowAnswers] = useState<QuizSettings['showAnswers']>(defaultSettings.showAnswers);
  const [penaltySystem, setPenaltySystem] = useState<QuizSettings['penaltySystem']>(defaultSettings.penaltySystem);
  const [shuffleQuestions, setShuffleQuestions] = useState(defaultSettings.shuffleQuestions ?? false);
  const [shuffleOptions, setShuffleOptions] = useState(defaultSettings.shuffleOptions ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({
      mode,
      duration: mode === 'none' ? 0 : duration,
      showAnswers,
      penaltySystem,
      shuffleQuestions,
      shuffleOptions,
    });
  };
  
  const handleModeChange = (newMode: QuizSettings['mode']) => {
    setMode(newMode);
    if(newMode === 'perQuestion' && duration < 10) setDuration(60);
    if(newMode === 'total' && duration < 60) setDuration(600); // 10 minutes
  }

  return (
    <div className="animate-fade-in w-full max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <ClockIcon className="h-8 w-8 text-sky-500" />
            Configurar Test
        </h2>
        <button
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-md text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
            <ArrowPathIcon className="h-5 w-5" />
            Volver
        </button>
      </div>

      <p className="text-slate-500 dark:text-slate-400 mb-8 font-sans">
        Personaliza tu sesión para adaptarla a tu estilo de estudio.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">1. Sistema de Puntuación</h3>
            <div className="space-y-3">
                <button type="button" onClick={() => setPenaltySystem('classic')} className={`w-full text-left flex items-center justify-between gap-3 p-4 border rounded-lg transition-colors ${penaltySystem === 'classic' ? 'bg-lime-50 dark:bg-lime-900/50 border-lime-500 ring-2 ring-lime-200 dark:ring-lime-700' : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    <p><span className="font-bold text-slate-800 dark:text-slate-200">Clásico</span><br/><span className="text-sm text-slate-500 dark:text-slate-400">Las respuestas correctas suman. Las incorrectas o en blanco no restan.</span></p>
                </button>
                <button type="button" onClick={() => setPenaltySystem('standard')} className={`w-full text-left flex items-center justify-between gap-3 p-4 border rounded-lg transition-colors ${penaltySystem === 'standard' ? 'bg-lime-50 dark:bg-lime-900/50 border-lime-500 ring-2 ring-lime-200 dark:ring-lime-700' : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    <p><span className="font-bold text-slate-800 dark:text-slate-200">Estándar (con penalización)</span><br/><span className="text-sm text-slate-500 dark:text-slate-400">Las incorrectas restan puntos. Ideal para simular oposiciones.</span></p>
                </button>
            </div>
        </div>
        <div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">2. Modo de Tiempo</h3>
            <div className="space-y-3">
              <button type="button" onClick={() => handleModeChange('none')} className={`w-full text-left flex items-center justify-between gap-3 p-4 border rounded-lg transition-colors ${mode === 'none' ? 'bg-lime-50 dark:bg-lime-900/50 border-lime-500 ring-2 ring-lime-200 dark:ring-lime-700' : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                <p><span className="font-bold text-slate-800 dark:text-slate-200">Sin Temporizador</span><br/><span className="text-sm text-slate-500 dark:text-slate-400">Estudia a tu propio ritmo.</span></p>
              </button>
              <button type="button" onClick={() => handleModeChange('perQuestion')} className={`w-full text-left flex items-center justify-between gap-3 p-4 border rounded-lg transition-colors ${mode === 'perQuestion' ? 'bg-lime-50 dark:bg-lime-900/50 border-lime-500 ring-2 ring-lime-200 dark:ring-lime-700' : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                <p><span className="font-bold text-slate-800 dark:text-slate-200">Tiempo por Pregunta</span><br/><span className="text-sm text-slate-500 dark:text-slate-400">Practica tu agilidad.</span></p>
              </button>
              <button type="button" onClick={() => handleModeChange('total')} className={`w-full text-left flex items-center justify-between gap-3 p-4 border rounded-lg transition-colors ${mode === 'total' ? 'bg-lime-50 dark:bg-lime-900/50 border-lime-500 ring-2 ring-lime-200 dark:ring-lime-700' : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                <p><span className="font-bold text-slate-800 dark:text-slate-200">Tiempo Total del Test</span><br/><span className="text-sm text-slate-500 dark:text-slate-400">Simulación de examen.</span></p>
              </button>
            </div>
        </div>

        {mode !== 'none' && (
          <div className="animate-fade-in">
            <label htmlFor="duration" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 font-sans">
              Duración ({mode === 'total' ? 'minutos' : 'segundos'})
            </label>
            <input
              id="duration"
              type="number"
              min={mode === 'total' ? 1 : 10}
              step={mode === 'total' ? 1 : 5}
              value={mode === 'total' ? Math.round(duration / 60) : duration}
              onChange={e => {
                  const val = Number(e.target.value) || 0;
                  setDuration(mode === 'total' ? val * 60 : val);
              }}
              className="w-48 p-3 bg-white dark:bg-slate-700 border font-sans border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-colors"
            />
          </div>
        )}
        
        <div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">3. Mostrar Respuestas</h3>
            <div className="space-y-3">
                <button type="button" onClick={() => setShowAnswers('immediately')} className={`w-full text-left flex items-center justify-between gap-3 p-4 border rounded-lg transition-colors ${showAnswers === 'immediately' ? 'bg-lime-50 dark:bg-lime-900/50 border-lime-500 ring-2 ring-lime-200 dark:ring-lime-700' : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    <p><span className="font-bold text-slate-800 dark:text-slate-200">Después de cada pregunta</span><br/><span className="text-sm text-slate-500 dark:text-slate-400">Ideal para estudiar y aprender.</span></p>
                </button>
                <button type="button" onClick={() => setShowAnswers('atEnd')} className={`w-full text-left flex items-center justify-between gap-3 p-4 border rounded-lg transition-colors ${showAnswers === 'atEnd' ? 'bg-lime-50 dark:bg-lime-900/50 border-lime-500 ring-2 ring-lime-200 dark:ring-lime-700' : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    <p><span className="font-bold text-slate-800 dark:text-slate-200">Al finalizar el test</span><br/><span className="text-sm text-slate-500 dark:text-slate-400">Simulación de examen real.</span></p>
                </button>
            </div>
        </div>

        <div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">4. Aleatorización</h3>
            <div className="space-y-3">
                <label className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 border dark:border-slate-700 rounded-lg cursor-pointer" onClick={(e) => { e.preventDefault(); setShuffleQuestions(p => !p); }}>
                    <span className="font-medium text-slate-800 dark:text-slate-200">Mezclar orden de preguntas</span>
                    <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${shuffleQuestions ? 'bg-lime-600' : 'bg-slate-300 dark:bg-slate-500'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${shuffleQuestions ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                </label>
                <label className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 border dark:border-slate-700 rounded-lg cursor-pointer" onClick={(e) => { e.preventDefault(); setShuffleOptions(p => !p); }}>
                    <span className="font-medium text-slate-800 dark:text-slate-200">Mezclar orden de respuestas</span>
                     <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${shuffleOptions ? 'bg-lime-600' : 'bg-slate-300 dark:bg-slate-500'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${shuffleOptions ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                </label>
            </div>
        </div>
        
        <div className="flex justify-end gap-4 pt-6">
          <button type="submit" className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-bold rounded-md shadow-lg shadow-lime-500/30 text-white bg-lime-600 hover:bg-lime-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-500 font-sans">
            <SparklesIcon className="h-5 w-5" />
            Empezar Test
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuizStartConfigurator;
