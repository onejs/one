import './polyfill'
import { createRoot } from 'react-dom/client'
import { App } from './src/App'
import React from 'react'

createRoot(document.querySelector('#root')).render(<App />)
