import { missingNativeBuild } from '../nativeError'
import type { PrintResult } from '../specs/OnePrint.nitro'
import { assertPrintFileUri, assertPrintJobName } from './validate'

export type { PrintResult }

function isAvailable(): Promise<boolean> {
  return Promise.resolve(false)
}

function printPdf(fileUri: string, jobName?: string): Promise<PrintResult> {
  assertPrintFileUri(fileUri)
  assertPrintJobName(jobName)
  return Promise.reject(missingNativeBuild('Print.printPdf'))
}

export const Print = Object.freeze({ isAvailable, printPdf })
