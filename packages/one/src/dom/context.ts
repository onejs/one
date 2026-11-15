import { createContext } from 'react'
import type { DOMBrowserBridge } from './browserBridge'

export const DOMBridgeContext = createContext<DOMBrowserBridge | null>(null)
