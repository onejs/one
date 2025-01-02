import { useHotkeys } from 'react-hotkeys-hook'
import { handleKeyboardEscape } from '~/keyboard/handleKeyboardEscape'

export const useGlobalHotKeys = () => {
  useHotkeys('Escape', () => {
    if (handleKeyboardEscape()) {
      return
    }
  })
}
