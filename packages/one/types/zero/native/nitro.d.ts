import { NativeZero } from './client';
import type { NativeZeroOptions } from './client';
export declare function createNativeZero(options: Omit<NativeZeroOptions, 'engine'> & {
    name: string;
    clientID: string;
}): Promise<NativeZero>;
//# sourceMappingURL=nitro.d.ts.map