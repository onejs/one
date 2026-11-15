import { keepAwakeNative as native } from './backend'
import { useEffect, useId } from 'react'
import { rethrowNativeError } from '../nativeError'
import { assertKeepAwakeEnabled, assertKeepAwakeTag, normalizeKeepAwakeTag } from './validate'

function isEnabled(): Promise<boolean> {
  return native().isEnabled().catch(rethrowNativeError)
}

function setEnabled(enabled: boolean): Promise<void> {
  assertKeepAwakeEnabled(enabled)
  return native().setEnabled(enabled).catch(rethrowNativeError)
}

function activate(tag?: string): Promise<void> {
  assertKeepAwakeTag(tag, 'activate')
  return native().activate(normalizeKeepAwakeTag(tag)).catch(rethrowNativeError)
}

function deactivate(tag?: string): Promise<void> {
  assertKeepAwakeTag(tag, 'deactivate')
  return native().deactivate(normalizeKeepAwakeTag(tag)).catch(rethrowNativeError)
}

export function useKeepAwake(tag?: string): void {
  const fallback = useId()
  assertKeepAwakeTag(tag, 'useKeepAwake')
  // a hook without a tag owns an id unique to its component instance, never
  // the shared default tag, matching expo-keep-awake.
  const effective = tag ?? fallback
  useEffect(() => {
    // a hook has no caller to reject to, so failures are reported, as
    // usePreventScreenCapture does.
    activate(effective).catch((error: unknown) => {
      console.error(`Failed to keep the screen awake: ${String(error)}`)
    })
    return () => {
      deactivate(effective).catch(() => {})
    }
  }, [effective])
}

export const KeepAwake = Object.freeze({ isEnabled, setEnabled, activate, deactivate })
