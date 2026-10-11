import './i18n';

import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';
import flagFontUrl from 'country-flag-emoji-polyfill/dist/TwemojiCountryFlags.woff2?url';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FLAG_FONT } from './theme';

// Windows has no flag emoji; this loads a flags-only font there and nowhere else.
polyfillCountryFlagEmojis(FLAG_FONT, flagFontUrl);

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
