import { render } from 'preact';
import '@fontsource/vt323';
import { App } from './app';
import './styles.css';

// the overlay is drawn into a canvas, which silently falls back to another font if VT323 is not
// loaded yet, so wait for it once before the first render
document.fonts
  .load('16px VT323')
  .catch(() => undefined)
  .finally(() => render(<App />, document.getElementById('app')!));
