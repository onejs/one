// escape handler stack: LIFO registration for dismissable layers.
//
// it lives here rather than in the app because DialogHost is a registrant:
// Tamagui's Sheet implements no escape of its own, so the host supplies it for
// the sheet presentation. escape is a keyboard concept, so on native every
// entry point is a no-op and nothing here touches the DOM off the web.

import { useEffect } from 'react'
import { isWeb } from 'tamagui'

const handlers: (() => void)[] = []

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.defaultPrevented) return
  if (handleEscape()) event.preventDefault()
}

export function registerEscapeHandler(handler: () => void): () => void {
  if (!isWeb) return () => {}
  if (!handlers.length) document.addEventListener('keydown', onKeyDown, true)
  handlers.push(handler)
  return () => {
    const idx = handlers.indexOf(handler)
    if (idx >= 0) handlers.splice(idx, 1)
    if (!handlers.length) document.removeEventListener('keydown', onKeyDown, true)
  }
}

// call the most recent handler. the layer unregisters when it closes; retaining
// it here preserves two-step escape behavior such as blur-then-close dialogs.
export function handleEscape(): boolean {
  if (!handlers.length) return false
  const handler = handlers[handlers.length - 1]!
  handler()
  return true
}

export function useEscapeHandler(handler: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    return registerEscapeHandler(handler)
  }, [handler, enabled])
}

// escape inside a non-empty text field commits that field first: it blurs,
// firing whatever blur-save the content installed, and leaves the layer open so
// a second escape dismisses. shared because a dialog and the sheet it adapts
// into must not drift apart on it. pass nothing to check the focused element.
export function blurNonEmptyTextField(target: unknown = focusedElement()): boolean {
  if (!isWeb) return false
  const field =
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      ? target
      : null
  if (!field?.value) return false
  field.blur()
  return true
}

function focusedElement(): unknown {
  return isWeb ? document.activeElement : null
}
