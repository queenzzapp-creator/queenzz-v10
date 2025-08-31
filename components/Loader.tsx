
import React from 'react';
import { SparklesIcon } from './Icons.tsx';

interface LoaderProps {
  message: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center" role="status">
      <SparklesIcon className="w-16 h-16 text-lime-500 animate-pulse mb-6" />
      <p className="text-xl font-semibold text-slate-600 font-sans">{message}</p>
      <span className="sr-only">Cargando...</span>
    </div>
  );
};

export default Loader;
