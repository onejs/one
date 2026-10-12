import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OnePrint, PrintResult } from '../specs/OnePrint.nitro'
import { assertPrintFileUri, assertPrintJobName } from './validate'

export type { PrintResult }

let hybrid: OnePrint | undefined

function native(): OnePrint {
  hybrid ??= NitroModules.createHybridObject<OnePrint>('OnePrint')
  return hybrid
}

function isAvailable(): Promise<boolean> {
  return native().isAvailable().catch(rethrowNativeError)
}

function printPdf(fileUri: string, jobName?: string): Promise<PrintResult> {
  assertPrintFileUri(fileUri)
  assertPrintJobName(jobName)
  return native().printPdf(fileUri, jobName).catch(rethrowNativeError)
}

export const Print = Object.freeze({ isAvailable, printPdf })
