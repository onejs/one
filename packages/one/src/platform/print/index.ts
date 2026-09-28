import type { PrintResult } from '../specs/OnePrint.nitro'
import { assertPrintFileUri, assertPrintJobName } from './validate'

export type { PrintResult }

const unsupported = (): never => {
  throw new Error('Print requires an iOS native build')
}

function isAvailable(): Promise<boolean> {
  return unsupported()
}

function printPdf(fileUri: string, jobName?: string): Promise<PrintResult> {
  assertPrintFileUri(fileUri)
  assertPrintJobName(jobName)
  return unsupported()
}

export const Print = Object.freeze({ isAvailable, printPdf })
