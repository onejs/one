import type { LocationRegion } from '../specs/OneLocation.nitro';
export declare function assertRegion(region: unknown, verb: string): asserts region is LocationRegion;
export declare function assertIdentifier(identifier: unknown, verb: string): asserts identifier is string;
export declare function assertRegionListener(listener: unknown, verb: string): asserts listener is (region: LocationRegion) => void;
//# sourceMappingURL=validation.d.ts.map