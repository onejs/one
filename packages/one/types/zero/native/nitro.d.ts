import { NativeZero } from './client';
import type { NativeZeroOptions } from './client';
import type { Mutators } from './types';
export declare function createNativeZero<M extends Mutators>(options: Omit<NativeZeroOptions<M>, 'engine'> & {
    name: string;
    clientID?: string;
}): Promise<NativeZero<M>>;
//# sourceMappingURL=nitro.d.ts.map