import { createLatestComputation } from '../background/createLatestComputation.js';
import { type WarmStateSerializeInput, type WarmStateSerializeOutput } from './warmStateShared.js';
export declare function createWarmSerializer(onState: Parameters<typeof createLatestComputation<WarmStateSerializeInput, WarmStateSerializeOutput>>[1]): {
    update(input: WarmStateSerializeInput): void;
    getCurrent: () => import("../background.native.js").BackgroundResult<WarmStateSerializeOutput> | null;
    dispose(): void;
};
//# sourceMappingURL=warmStateSerialize.d.ts.map