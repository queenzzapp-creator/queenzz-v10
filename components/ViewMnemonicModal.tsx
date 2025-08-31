import React, { useState, useEffect } from 'react';
import { MnemonicRule } from '../types.ts';
import { XMarkIcon, BrainIcon } from './Icons.tsx';
import * as libraryService from '../services/libraryService.ts';

interface ViewMnemonicModalProps {
  rule: MnemonicRule;
  onClose: () => void;
}

const ViewMnemonicModal: React.FC<ViewMnemonicModalProps> = ({ rule, onClose }) => {
  const [hydratedRule, setHydratedRule] = useState<MnemonicRule>(rule);

  useEffect(() => {
    const hydrate = async () => {
      if (rule.type === 'story' && !rule.imageUrl) {
        const imageUrl = await libraryService.getMnemonicImageUrl(rule.id);
        if (imageUrl) {
          setHydratedRule(prev => ({ ...prev, imageUrl }));
        }
      }
    };
    hydrate();
  }, [rule]);

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="relative bg-[#FAF8F1] dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <header className="flex-shrink-0 p-6 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <BrainIcon className="h-6 w-6 text-amber-500" />
            {hydratedRule.title}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"><XMarkIcon className="h-6 w-6" /></button>
        </header>
        
        <div className="p-6 flex-grow overflow-y-auto space-y-4">
          {hydratedRule.type === 'story' && (
            <div className="space-y-4">
              {hydratedRule.imageUrl && <img src={hydratedRule.imageUrl} alt="Visualización de la historia" className="w-full h-auto rounded-lg shadow-md" />}
              {hydratedRule.keywords && (
                <div>
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Palabras Clave:</h3>
                  <p className="text-slate-600 dark:text-slate-400 italic">{hydratedRule.keywords}</p>
                </div>
              )}
               {hydratedRule.story && (
                <div>
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Historia:</h3>
                  <p className="text-slate-600 dark:text-slate-400">{hydratedRule.story}</p>
                </div>
              )}
            </div>
          )}
          {hydratedRule.type === 'number' && (
             <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Número:</h3>
                  <p className="text-2xl font-mono text-lime-600 dark:text-lime-400">{hydratedRule.numberStr}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Letras:</h3>
                  <p className="font-mono text-lg text-slate-600 dark:text-slate-400">{hydratedRule.letters}</p>
                </div>
                 <div>
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Palabras:</h3>
                  <p className="text-lg text-slate-800 dark:text-slate-200">{hydratedRule.words}</p>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewMnemonicModal;
