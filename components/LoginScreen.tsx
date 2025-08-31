
import React, { useState, useEffect } from 'react';
import { AppLogoIcon } from './Icons';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => boolean;
  error: string | null;
}

const LOGIN_CREDS_KEY = 'queenzz_login_credentials';

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    try {
      const savedCreds = localStorage.getItem(LOGIN_CREDS_KEY);
      if (savedCreds) {
        const { u, p } = JSON.parse(savedCreds);
        setUsername(u);
        setPassword(p);
        setRememberMe(true);
      }
    } catch (e) {
      console.error("Failed to parse saved credentials:", e);
      localStorage.removeItem(LOGIN_CREDS_KEY);
    }
  }, []);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(username, password);
    if (success) {
      if (rememberMe) {
        localStorage.setItem(LOGIN_CREDS_KEY, JSON.stringify({ u: username, p: password }));
      } else {
        localStorage.removeItem(LOGIN_CREDS_KEY);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
            <AppLogoIcon className="h-24 w-24" />
            <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 tracking-wider mt-4">
                QUEENZZ
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Tu centro de mando para tests.</p>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-lg border border-slate-200/80 dark:border-slate-700/80 shadow-lg shadow-slate-300/20 dark:shadow-black/20 p-8 rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 font-sans">
                Usuario
              </label>
              <div className="mt-2">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-colors duration-200 font-sans text-slate-900 dark:text-slate-100"
                  placeholder="Tu email o usuario"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 font-sans">
                Contraseña
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-colors duration-200 font-sans text-slate-900 dark:text-slate-100"
                  placeholder="Tu contraseña"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <input 
                        id="remember-me" 
                        name="remember-me" 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-lime-600 focus:ring-lime-500 border-slate-300 dark:border-slate-600 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700 dark:text-slate-300 font-sans">
                        Recordarme
                    </label>
                </div>
            </div>
            
            {error && <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>}

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg shadow-lime-500/30 text-base font-bold text-white bg-lime-600 hover:bg-lime-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-500 focus:ring-offset-stone-50 transition-all"
              >
                Entrar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
