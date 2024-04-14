import './polyfill'
import { createRoot } from 'react-dom/client'
import { App } from './App'

// should be hydrateRoot once ssred
createRoot(document.querySelector('#root')!).render(<App />)
