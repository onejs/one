import { createEmitter } from '@vxrn/emitter'

export const messageReplyEmitter = createEmitter<
  | { type: 'cancel' }
  | {
      type: 'reply'
      messageId: string
    }
>()

export const messageInputEmitter = createEmitter<{ type: 'submit' } | { type: 'focus' }>()
