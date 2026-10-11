import { sdkAnimationValues, type SDKAnimation } from './generated/controlTypes'
import { getNativeSyncFactory } from './syncNative'
import type { WithAnimationCompletionCriteria } from './types'

type NativeAnimation = {
  begin(): void
  commit(
    animation: SDKAnimation | null,
    completionCriteria: WithAnimationCompletionCriteria,
    completion?: () => void
  ): void
}

function isNativeAnimation(value: unknown): value is NativeAnimation {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'begin') === 'function' &&
    typeof Reflect.get(value, 'commit') === 'function'
  )
}

function isSDKAnimation(value: unknown): value is SDKAnimation {
  return sdkAnimationValues.some((name) => name === value)
}

let animating = false

// SwiftUI's withAnimation(_:completionCriteria:_:completion:). every
// useNativeState value the body writes reaches its bound views inside one
// SwiftUI transaction, so they animate together. null applies the writes
// without animation. a body that throws applies its writes without animation
// and skips completion.
export function withAnimation(
  animation: SDKAnimation | null,
  body: () => void,
  completion?: () => void,
  completionCriteria: WithAnimationCompletionCriteria = 'logicallyComplete'
): void {
  if (animation !== null && !isSDKAnimation(animation)) {
    throw new Error(`Swift.withAnimation animation must be null or one of ${sdkAnimationValues.join(', ')}`)
  }
  if (typeof body !== 'function') throw new Error('Swift.withAnimation body must be a function')
  if (completion !== undefined && typeof completion !== 'function') {
    throw new Error('Swift.withAnimation completion must be a function')
  }
  if (completionCriteria !== 'logicallyComplete' && completionCriteria !== 'removed') {
    throw new Error('Swift.withAnimation completionCriteria must be logicallyComplete or removed')
  }
  if (animating) throw new Error('Swift.withAnimation cannot be called inside another withAnimation body')
  // the sync state install also installs the animation transaction.
  getNativeSyncFactory()
  const native = Reflect.get(globalThis, '__OneNativeAnimation')
  if (!isNativeAnimation(native)) throw new Error('Swift.withAnimation requires the OneNative iOS module')
  animating = true
  native.begin()
  let completed = false
  try {
    body()
    completed = true
  } finally {
    animating = false
    if (completed) native.commit(animation, completionCriteria, completion)
    else native.commit(null, completionCriteria)
  }
}
