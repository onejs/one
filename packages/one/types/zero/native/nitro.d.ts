import { NativeZero } from './client.js';
import type { NativeZeroOptions } from './client.js';
import type { Mutators } from './types.js';
export declare function createNativeZero<M extends Mutators>(options: Omit<NativeZeroOptions<M>, 'engine'> & {
    name: string;
    clientID?: string;
}): Promise<NativeZero<M>>;
//# sourceMappingURL=nitro.d.ts.map