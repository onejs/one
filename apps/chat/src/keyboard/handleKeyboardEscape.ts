import { messageReplyEmitter } from '~/interface/messages/emitters'
import { messageItemEmitter } from '~/interface/messages/MessageItem'

export function handleKeyboardEscape() {
  if (messageItemEmitter.value?.type === 'highlight') {
    messageItemEmitter.emit({ type: 'cancel' })
    return true
  }

  if (messageReplyEmitter.value?.type === 'reply') {
    messageReplyEmitter.emit({ type: 'cancel' })
    return true
  }
}
