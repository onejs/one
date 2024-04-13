import type { ReactNativeStackFrame } from './types/symbolicate'

export const inferPlatformFromStack = (stack: ReactNativeStackFrame[]) => {
  for (const frame of stack) {
    if (!frame.file) {
      return
    }
    // Does URL works on RN? if not use polyfill
    const { searchParams, pathname } = new URL(frame.file, 'file://')
    const platform = searchParams.get('platform')
    if (platform) {
      return platform
    }

    const [bundleFilename] = pathname.split('/').reverse()
    const [, platformOrExtension, extension] = bundleFilename.split('.')
    if (extension) {
      return platformOrExtension
    }
  }
}

export const processStacks = async (stack: ReactNativeStackFrame[]) => {}
