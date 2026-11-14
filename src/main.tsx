import { StrictMode, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { loadFonts } from './fonts';
import { preloadLabelImages } from './three/textures';
import './styles.css';

// `?preview…` opens the design mock-ups (loaded on demand, so the game bundle
// is unaffected). Everything else is the CAN game.
const isPreview = new URLSearchParams(window.location.search).has('preview');

async function boot(): Promise<ComponentType> {
  if (!isPreview) return App;
  const [{ default: PreviewApp }, { MOCK_TEXT }] = await Promise.all([import('./preview/PreviewApp'), import('./themes/mockItems')]);
  await loadFonts(MOCK_TEXT);
  return PreviewApp;
}

const timeout = new Promise((r) => setTimeout(r, 3000));
Promise.race([Promise.all([loadFonts(), preloadLabelImages()]), timeout])
  .then(boot)
  .catch(() => App)
  .then((Root) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <Root />
      </StrictMode>,
    );
  });
