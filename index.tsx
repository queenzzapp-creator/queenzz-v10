
// Polyfill for crypto.randomUUID for environments where it's not available (e.g., non-secure contexts)
if (typeof crypto.randomUUID === 'undefined') {
  // @ts-ignore
  crypto.randomUUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import * as pdfjsLib from 'pdfjs-dist';

// Set up the PDF.js worker. This is crucial for PDF parsing to work correctly.
// Aligning the worker's CDN with the main library's CDN (esm.sh) to prevent version mismatches or cross-origin issues.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for PWA capabilities
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }).catch(err => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
