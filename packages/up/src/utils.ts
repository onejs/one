import { useState, useCallback } from 'react'

interface AsyncState<T> {
  loading: boolean
  error: Error | null
  data: T | null
}

export const useAsync = <T, Args extends any[]>(
  asyncFunction: (...args: Args) => Promise<T>,
  ...args: Args
) => {
  const [state, setState] = useState<AsyncState<T>>({
    loading: false,
    error: null,
    data: null,
  })

  const execute = async () => {
    try {
      setState({ loading: true, error: null, data: null })
      const result = await asyncFunction(...args)
      setState({ loading: false, error: null, data: result })
    } catch (error) {
      setState({ loading: false, error: error as Error, data: null })
    }
  }

  return { ...state, execute }
}
