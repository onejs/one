import type { ConfigT } from 'metro-config';
import Server from 'metro/src/Server';
import metroBundle from 'metro/src/shared/output/bundle';
import type metroRamBundle from 'metro/src/shared/output/RamBundle';
import type { BundleCommandArgs } from './types';
export declare function buildBundleWithConfig(args: BundleCommandArgs, config: ConfigT, bundleImpl?: typeof metroBundle | typeof metroRamBundle, { patchServer }?: {
    patchServer?: (server: Server) => void;
}): Promise<void>;
//# sourceMappingURL=buildBundleWithConfig.d.ts.map