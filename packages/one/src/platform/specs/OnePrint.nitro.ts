import type { HybridObject } from 'react-native-nitro-modules'

export type PrintResult = { completed: boolean }

export interface OnePrint extends HybridObject<{ ios: 'swift' }> {
  isAvailable(): Promise<boolean>
  printPdf(fileUri: string, jobName?: string): Promise<PrintResult>
}
