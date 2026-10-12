import type {
  OneDataScanner,
  DataScannerRecognizedItem,
} from '../specs/OneDataScanner.nitro'

// each iterator owns a native AsyncStream task; return cancels it, including pending reads.
export function recognizedItems(
  native: OneDataScanner
): AsyncIterable<DataScannerRecognizedItem[]> {
  return {
    [Symbol.asyncIterator]() {
      const queue: DataScannerRecognizedItem[][] = []
      const waiting: ((value: IteratorResult<DataScannerRecognizedItem[]>) => void)[] = []
      let ended = false
      let canceled = false
      const end = () => {
        ended = true
        for (const resolve of waiting.splice(0)) resolve({ done: true, value: undefined })
      }
      const id = native.subscribeRecognizedItems((items) => {
        if (ended) return
        const resolve = waiting.shift()
        if (resolve) resolve({ done: false, value: items })
        else queue.push(items)
      }, end)
      return {
        next(): Promise<IteratorResult<DataScannerRecognizedItem[]>> {
          const value = queue.shift()
          if (value) return Promise.resolve({ done: false, value })
          if (ended) return Promise.resolve({ done: true, value: undefined })
          return new Promise((resolve) => waiting.push(resolve))
        },
        async return(): Promise<IteratorResult<DataScannerRecognizedItem[]>> {
          queue.length = 0
          end()
          if (!canceled) {
            canceled = true
            native.unsubscribeRecognizedItems(id)
          }
          return { done: true, value: undefined }
        },
      }
    },
  }
}
