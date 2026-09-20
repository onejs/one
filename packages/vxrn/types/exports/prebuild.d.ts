import { type PrebuildAppConfig } from './prebuildWithoutExpo';
export declare const prebuild: ({ root, platform, 'no-install': noInstall, app, }: {
    root: string;
    platform?: 'ios' | 'android' | string;
    'no-install'?: boolean;
    app: PrebuildAppConfig;
}) => Promise<void>;
export declare function replaceInUTF8File(filePath: string, findThis: string, replaceWith: string): Promise<void>;
//# sourceMappingURL=prebuild.d.ts.map