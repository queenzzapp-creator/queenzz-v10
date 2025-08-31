import React from 'react';
import { XMarkIcon, CheckBadgeIcon, DocumentTextIcon } from './Icons.tsx';
import Confetti from './Confetti.tsx';

// The image is embedded as a base64 data URL to prevent pathing and module resolution issues.
const happyCatImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDI0MCAyODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjAsIDMwKSI+PHBhdGggZD0iTTEwMCw1MCBDNjAsNTAgNTAsODAgNTAsMTAwIEwgNTAsMTIwIEMgNTAsMTQwIDcwLDE1NSAxMDAsMTU1IEMgMTMwLDE1NSAxNTAsMTQwIDE1MCwxMjAgTCAxNTAsMTAwIEMgMTUwLDgwIDE0MCw1MCAxMDAsNTAgWiIgZmlsbD0iI0Y2QUQ1NSIvPjxwYXRoIGQ9Ik04NSA5MCBDIDkwLDgwLCAxMTAsODAsIDExNSw5MCIgZmlsbD0iI0ZGRjVGNSIvPjxwYXRoIGQ9Ik01MCAxMDAgQyA0MCA3MCwgNzAsNzAsIDc1LDkwIiBmaWxsPSIjRjZBRDU1IiBzdHJva2U9IiNCRjVBM0YiIHN0cm9rZS13aWR0aD0iMyIvPjxwYXRoIGQ9Ik0xNTAgMTAwIEMgMTYwLDcwLCAxMzAsNzAsIDEyNSw5MCIgZmlsbD0iI0Y2QUQ1NSIgc3Ryb2tlPSIjQkY1QTJGIiBzdHJva2Utd2lkdGg9IjMiLz48cGF0aCBkPSJNNzUgMTEwIEMgODAsMTE1LCA5MCwxMTUsIDk1LDExMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMkQzNzQ4IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik0xMDUgMTEwIEMgMTEwLDExNSwgMTIwLDExNSwgMTI1LDExMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMkQzNzQ4IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik05MCAxMjUgQyA5NSwxMzUsIDEwNSwxMzUsIDExMCwxMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzRBNTU2OCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMTAwIDExNSBMIDEwMCAxMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzRBNTU2OCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNODUgNjUgTCA5Miw1MCAxMDAsNjAgTCAxMDgsNTAgTCAxMTUsNjUgWiIgZmlsbD0iI0ZCQkYyNCIgc3Ryb2tlPSIjQjQ1MzA5IiBzdHJva2Utd2lkdGg9IjIiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI1NSIgcj0iNCIgZmlsbD0iIzYwQTVGQSIvPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsIDEwMCkiPjxwYXRoIGQ9Ik03MCA5MCBDIDYwLDkwLCA1NSw2MCwgNzAsNTUgTCAxMzAsNTUgQyAxNDUsNjAsIDE0MCw5MCwgMTMwLDkwIFoiIGZpbGw9IndoaXRlIiBzdHJva2U9IiNBMEFFQzAiIHN0cm9rZS13aWR0aD0iMiIvPjxlbGxpcHNlIGN4PSIxMDAiIGN5PSI1NSIgcng9IjMwIiByeT0iNSIgZmlsbD0id2hpdGUiIHN0cm9rZT0iI0EwQUVDMCIgc3Ryb2tlLXdpZHRoPSIyIi8+PGVsbGlwc2UgY3g9IjEwMCIgY3k9IjU1IiByeD0iMjgiIHJ5PSI0IiBmaWxsPSIjOEQ2RTYzIi8+PHBhdGggZD0iTTEzMCA2NSBDIDE0NSw2NSwgMTQ1LDgwLCAxMzAsODAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0EwQUVDMCIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvZz48L3N2Zz4=';

interface CelebrationModalProps {
  onClose: () => void;
  title: string;
  message: string;
}

const CelebrationModal: React.FC<CelebrationModalProps> = ({ onClose, title, message }) => {
  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="relative pt-12" onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
          <div className="p-1 bg-[#fefcf4] dark:bg-slate-800 rounded-full">
            <CheckBadgeIcon className="h-20 w-20 text-yellow-400" />
          </div>
        </div>

        <div className="relative bg-[#fefcf4] dark:bg-slate-800 w-full max-w-sm sm:max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 pt-12 text-center overflow-hidden">
          <Confetti />

          <button 
              onClick={onClose} 
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 hover:bg-slate-300/80 dark:hover:bg-slate-600/80 z-20"
              aria-label="Cerrar celebración"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <div className="mb-6 mx-auto max-w-[240px] border border-slate-200 dark:border-slate-600 rounded-lg bg-white/50 dark:bg-slate-700/30 relative z-10">
            <div className="flex items-center gap-2 py-1 px-3 border-b border-slate-200 dark:border-slate-600">
              <DocumentTextIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Celebración</span>
            </div>
            <div className="p-2 sm:p-4 h-48 flex items-center justify-center">
              <img src={happyCatImage} alt="Gato feliz de celebración" className="max-w-full max-h-full object-contain" />
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 relative z-10">{title}</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2 mb-8 relative z-10">
            {message}
          </p>
          
          <button
              onClick={onClose}
              className="px-8 py-3 text-base font-bold rounded-md text-white bg-lime-600 hover:bg-lime-700 transition-colors relative z-10 shadow-lg shadow-lime-500/30"
          >
            ¡Genial!
          </button>
        </div>
      </div>
    </div>
  );
};

export default CelebrationModal;
