import { type PrebuildAppConfig } from './prebuildWithoutExpo';
export declare const prebuild: ({ root, platform, 'no-install': noInstall, app, beforeInstall, }: {
    root: string;
    platform?: 'ios' | 'android' | string;
    'no-install'?: boolean;
    app: PrebuildAppConfig;
    beforeInstall?: () => Promise<void>;
}) => Promise<void>;
export declare function replaceInUTF8File(filePath: string, findThis: string, replaceWith: string): Promise<void>;
//# sourceMappingURL=prebuild.d.ts.map