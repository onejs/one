import { createEmitter } from '@vxrn/emitter'
import type { DialogType } from './types'
import { closeOpenTooltips, Dialog, styled } from 'tamagui'

export const dialogEmitter = createEmitter<DialogType>()

export const dialogEmit = (next: DialogType) => {
  closeOpenTooltips()
  dialogEmitter.emit(next)
}

export const useDialogEmit = dialogEmitter.use

export const DialogOverlay = styled(Dialog.Overlay, {
  // @ts-ignore
  'data-tauri-drag-region': true,
  animation: 'quickest',
  enterStyle: { opacity: 0 },
  exitStyle: { opacity: 0 },
  bg: '$shadowColor',
})

export const DialogContent = styled(Dialog.Content, {
  animation: [
    'quicker',
    {
      opacity: {
        overshootClamping: true,
      },
    },
  ],
  bordered: true,
  elevate: true,
  bg: '$color2',
  width: '60%',
  height: '50%',
  minW: 200,
  maxW: 500,
  minH: 400,
  opacity: 1,
  maxH: 'max-content',
  y: 0,
  enterStyle: { x: 0, y: -5, opacity: 0 },
  exitStyle: { x: 0, y: 5, opacity: 0 },
  gap: '$4',
})
