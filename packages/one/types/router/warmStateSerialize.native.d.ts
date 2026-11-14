import { createLatestComputation } from '../background/createLatestComputation';
import { type WarmStateSerializeInput, type WarmStateSerializeOutput } from './warmStateShared';
export declare function createWarmSerializer(onState: Parameters<typeof createLatestComputation<WarmStateSerializeInput, WarmStateSerializeOutput>>[1]): {
    update(input: WarmStateSerializeInput): void;
    getCurrent: () => import("../background.native").BackgroundResult<WarmStateSerializeOutput> | null;
    dispose(): void;
};
//# sourceMappingURL=warmStateSerialize.native.d.ts.map