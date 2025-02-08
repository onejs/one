import { useState, useCallback } from 'react'

interface AsyncState<T> {
  loading: boolean
  error: Error | null
  data: T | null
}

export const useAsync = <T>(asyncFunction: () => Promise<T>, args?: any[]) => {
  const [state, setState] = useState<AsyncState<T>>({
    loading: false,
    error: null,
    data: null,
  })

  const execute = useCallback(async () => {
    try {
      setState({ loading: true, error: null, data: null })
      const result = await asyncFunction()
      setState({ loading: false, error: null, data: result })
    } catch (error) {
      setState({ loading: false, error: error as Error, data: null })
    }
  }, [asyncFunction])

  return { ...state, execute }
}
