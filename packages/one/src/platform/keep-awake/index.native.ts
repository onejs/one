import { useEffect, useId } from 'react'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneKeepAwake } from '../specs/OneKeepAwake.nitro'
import { assertKeepAwakeEnabled, assertKeepAwakeTag, normalizeKeepAwakeTag } from './validate'

let hybrid: OneKeepAwake | undefined

function native(): OneKeepAwake {
  hybrid ??= NitroModules.createHybridObject<OneKeepAwake>('OneKeepAwake')
  return hybrid
}

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
    void activate(effective)
    return () => {
      void deactivate(effective)
    }
  }, [effective])
}

export const KeepAwake = Object.freeze({ isEnabled, setEnabled, activate, deactivate })
