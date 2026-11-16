export const debounce = <F extends (...args: Parameters<F>) => ReturnType<F>>(
  worklet: F,
  wait = 0
) => {
  'worklet'

  const value = {
    time: 0,
  }

  return (...args: Parameters<F>): ReturnType<F> | void => {
    'worklet'

    const t = Date.now()
    const now = t - value.time

    if (now < wait) {
      value.time = t

      return
    }

    value.time = t

    return worklet(...args)
  }
}

export const scrollDistanceWithRespectToSnapPoints = (
  defaultScrollValue: number,
  snapPoints?: number[]
) => {
  'worklet'

  let snapPoint: number | undefined

  if (snapPoints) {
    snapPoint = snapPoints.find((offset) => offset >= defaultScrollValue)
  }

  return snapPoint ?? defaultScrollValue
}
