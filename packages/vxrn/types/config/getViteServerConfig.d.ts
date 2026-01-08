import { type UserConfig } from 'vite';
import type { VXRNOptionsFilled } from './getOptionsFilled';
/**
 * Only used in CLI mode since this hard-codes the `mode` to `'serve'` and contains
 * custom config merging logic.
 */
export declare function getViteServerConfig(config: VXRNOptionsFilled, userViteConfig?: UserConfig): Promise<UserConfig>;
//# sourceMappingURL=getViteServerConfig.d.ts.map