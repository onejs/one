import type { TestInfo } from '@vxrn/test'

declare module 'vitest' {
  export interface ProvidedContext {
    testInfo: TestInfo
  }
}
