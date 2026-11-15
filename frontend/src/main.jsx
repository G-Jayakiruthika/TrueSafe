import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ThemeProvider } from './lib/theme.jsx';
import './index.css';

// BASE_URL is '/' for the server build and '/TrueSafe/' on GitHub Pages; the router
// and the service worker both have to be told, or every route 404s under the prefix.
const base = import.meta.env.BASE_URL;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={base}><ThemeProvider><App /></ThemeProvider></BrowserRouter>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register(`${base}sw.js`);
