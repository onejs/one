import type { PrintResult } from '../specs/OnePrint.nitro';
export type { PrintResult };
declare function isAvailable(): Promise<boolean>;
declare function printPdf(fileUri: string, jobName?: string): Promise<PrintResult>;
export declare const Print: Readonly<{
    isAvailable: typeof isAvailable;
    printPdf: typeof printPdf;
}>;
//# sourceMappingURL=index.native.d.ts.map