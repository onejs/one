import 'one/ios/UIKit/UIWindow';
import 'one/ios/UIKit/UIViewController';
import 'one/ios/UIKit/UIView';
import type { PrintResult } from '../specs/OnePrint.nitro.js';
declare function isAvailable(): Promise<boolean>;
declare function printPdf(fileUri: string, jobName?: string): Promise<PrintResult>;
export declare function printNative(): {
    isAvailable: typeof isAvailable;
    printPdf: typeof printPdf;
};
export {};
//# sourceMappingURL=backend.sdk.d.ts.map