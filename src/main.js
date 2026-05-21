/**
 * App entry point.
 * Vite loads this from <script type="module" src="/src/main.js">.
 */
import './styles.css';
import { migrateFromLocalStorage } from './lib/storage.js';
import './quran/QuranApp.jsx';
import { registerServiceWorker } from './sw-register.js';

// Run one-time storage migration in the background
migrateFromLocalStorage().catch(err => console.warn('[main] migration failed', err));

registerServiceWorker();
