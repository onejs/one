import { printNative as native } from './backend'
import { rethrowNativeError } from '../nativeError'
import type { PrintResult } from '../specs/OnePrint.nitro'
import { assertPrintFileUri, assertPrintJobName } from './validate'

export type { PrintResult }

function isAvailable(): Promise<boolean> {
  return native().isAvailable().catch(rethrowNativeError)
}

function printPdf(fileUri: string, jobName?: string): Promise<PrintResult> {
  assertPrintFileUri(fileUri)
  assertPrintJobName(jobName)
  return native().printPdf(fileUri, jobName).catch(rethrowNativeError)
}

export const Print = Object.freeze({ isAvailable, printPdf })
