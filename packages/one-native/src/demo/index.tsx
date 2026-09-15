import React from 'react';
import { render } from '../runtime';
import { App } from './App';

console.log('[OneNative] Booting application on Main Thread...');

// Render into root native container (id: 1)
render(<App />, 1);

console.log('[OneNative] Initial render complete.');
