import { createEmitter } from '@vxrn/emitter'
import type { DialogType } from './types'
import { Dialog, styled } from 'tamagui'

export const dialogEmitter = createEmitter<DialogType>()
export const dialogEmit = dialogEmitter.emit
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
    'quickest',
    {
      opacity: {
        overshootClamping: true,
      },
    },
  ],
  bordered: true,
  elevate: true,
  bg: '$color2',
  w: '60%',
  h: '50%',
  miw: 200,
  maw: 500,
  mih: 400,
  mah: 'max-content',
  enterStyle: { x: 0, y: -10, opacity: 0 },
  exitStyle: { x: 0, y: 10, opacity: 0 },
  gap: '$4',
})
