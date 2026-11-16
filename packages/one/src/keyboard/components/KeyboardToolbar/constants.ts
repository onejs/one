import { KEYBOARD_HAS_ROUNDED_CORNERS } from '../../constants'

import type { HEX } from './types'

export const TEST_ID_KEYBOARD_TOOLBAR = 'keyboard.toolbar'
export const TEST_ID_KEYBOARD_TOOLBAR_PREVIOUS = `${TEST_ID_KEYBOARD_TOOLBAR}.previous`
export const TEST_ID_KEYBOARD_TOOLBAR_NEXT = `${TEST_ID_KEYBOARD_TOOLBAR}.next`
export const TEST_ID_KEYBOARD_TOOLBAR_CONTENT = `${TEST_ID_KEYBOARD_TOOLBAR}.content`
export const TEST_ID_KEYBOARD_TOOLBAR_DONE = `${TEST_ID_KEYBOARD_TOOLBAR}.done`

export const KEYBOARD_TOOLBAR_HEIGHT = 42
export const DEFAULT_OPACITY: HEX = 'FF'
export const OPENED_OFFSET = KEYBOARD_HAS_ROUNDED_CORNERS ? -11 : 0
