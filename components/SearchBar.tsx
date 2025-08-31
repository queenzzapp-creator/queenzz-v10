import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from './Icons.tsx';

interface SearchBarProps {
  onSearch: (query: string) => void;
  autoFocus?: boolean;
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(({ onSearch, autoFocus = false }, ref) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => inputRef.current!, []);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
        inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
    inputRef.current?.blur();
  };
  
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearch(newQuery); // Fire search on every change
  };

  const clearSearch = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full" role="search">
      <label htmlFor="search-input" className="sr-only">Buscar preguntas</label>
      <input
        id="search-input"
        ref={inputRef}
        type="search"
        value={query}
        onChange={handleQueryChange}
        placeholder="Buscar en la colección..."
        className="w-full pl-10 pr-8 py-2 bg-slate-100/70 dark:bg-slate-700/50 border border-transparent rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 outline-none text-sm text-slate-800 dark:text-slate-100 transition-colors"
      />
      <div className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 pointer-events-none">
        <MagnifyingGlassIcon />
      </div>
      {query && (
        <button 
            type="button" 
            onClick={clearSearch} 
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
            aria-label="Limpiar búsqueda"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
    </form>
  );
});

export default SearchBar;