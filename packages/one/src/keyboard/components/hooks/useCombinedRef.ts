import { useCallback } from 'react'

import type { Ref, RefCallback } from 'react'

const useCombinedRef = <T>(...refs: Ref<T>[]): RefCallback<T> => {
  return useCallback((value: T | null) => {
    for (const ref of refs) {
      if (!ref) {
        continue
      }

      if (typeof ref === 'function') {
        ref(value)
      } else {
        ref.current = value
      }
    }
    // eslint-disable-next-line react-compiler/react-compiler
  }, refs)
}

export default useCombinedRef
