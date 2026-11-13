import { UIApplication } from 'one/ios/UIKit'
import { keepAwakeDefaultTag } from './validate'

let tags = new Set<string>()
let pending = Promise.resolve()

// serialize mutations across the asynchronous main-actor calls. a failed
// update rejects its caller without changing tags or blocking later updates.
function update(tag: string, enabled: boolean): Promise<void> {
  const operation = pending.then(async () => {
    const next = new Set(tags)
    if (enabled) next.add(tag)
    else next.delete(tag)
    await (await UIApplication.shared).setIsIdleTimerDisabled(next.size > 0)
    tags = next
  })
  pending = operation.then(() => {}, () => {})
  return operation
}

const backend = {
  async isEnabled() {
    await pending
    return tags.size > 0
  },
  setEnabled(enabled: boolean) {
    return update(keepAwakeDefaultTag, enabled)
  },
  activate(tag: string) {
    return update(tag, true)
  },
  deactivate(tag: string) {
    return update(tag, false)
  },
}

export function keepAwakeNative() {
  return backend
}
