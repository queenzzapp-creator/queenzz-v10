import React from 'react';
import { XMarkIcon } from './Icons.tsx';

interface ImageZoomModalProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ imageUrl, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/70 dark:bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Vista ampliada de la imagen"
    >
      <div 
        className="relative max-w-5xl max-h-[90vh] bg-white dark:bg-slate-800 p-2 rounded-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <img src={imageUrl} alt="Vista ampliada" className="max-w-full max-h-[calc(90vh-2rem)] object-contain rounded" />
        <button 
          onClick={onClose} 
          className="absolute -top-3 -right-3 p-1.5 rounded-full bg-slate-800/80 text-white hover:bg-black"
          aria-label="Cerrar vista ampliada"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default ImageZoomModal;
