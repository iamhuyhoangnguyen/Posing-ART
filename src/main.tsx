import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import { PublicSharePage } from './components/PublicSharePage';
import './index.css';

const savedTheme = localStorage.getItem('theme');
const initialDarkMode = savedTheme === 'dark'
  ? true
  : savedTheme === 'light'
    ? false
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
if (savedTheme !== 'light' && savedTheme !== 'dark') {
  localStorage.setItem('theme', initialDarkMode ? 'dark' : 'light');
}
document.documentElement.classList.toggle('dark', initialDarkMode);
document.documentElement.style.colorScheme = initialDarkMode ? 'dark' : 'light';

const shareMatch = window.location.pathname.match(/^\/share\/([A-Za-z0-9_-]{32,128})\/?$/);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {shareMatch ? <PublicSharePage shareToken={shareMatch[1]} /> : <><App /><PwaUpdatePrompt /></>}
  </StrictMode>,
);
