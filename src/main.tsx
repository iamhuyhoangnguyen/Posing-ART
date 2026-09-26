import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import './index.css';

const savedTheme = localStorage.getItem('theme');
const initialDarkMode = savedTheme
  ? savedTheme === 'dark'
  : window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.classList.toggle('dark', initialDarkMode);
document.documentElement.style.colorScheme = initialDarkMode ? 'dark' : 'light';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <PwaUpdatePrompt />
  </StrictMode>,
);
