import { type UserDepPatches } from '../utils/patches.js';
import { type PrebuildAppConfig } from './prebuildWithoutExpo.js';
export declare const prebuild: ({ root, platform, 'no-install': noInstall, app, beforeInstall, patches, }: {
    root: string;
    platform?: 'ios' | 'android' | string;
    'no-install'?: boolean;
    app: PrebuildAppConfig;
    beforeInstall?: () => Promise<void>;
    patches?: UserDepPatches;
}) => Promise<void>;
export declare function replaceInUTF8File(filePath: string, findThis: string, replaceWith: string): Promise<void>;
//# sourceMappingURL=prebuild.d.ts.map