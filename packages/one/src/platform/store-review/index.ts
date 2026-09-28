function requestReview(): Promise<void> {
  throw new Error('StoreReview requires an iOS native build')
}

export const StoreReview = Object.freeze({ requestReview })
