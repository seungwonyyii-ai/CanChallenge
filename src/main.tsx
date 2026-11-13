import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { loadFonts } from './fonts';
import { preloadLabelImages } from './three/textures';
import './styles.css';

const timeout = new Promise((r) => setTimeout(r, 3000));
Promise.race([Promise.all([loadFonts(), preloadLabelImages()]), timeout]).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
