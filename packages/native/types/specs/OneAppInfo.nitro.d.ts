import type { HybridObject } from 'react-native-nitro-modules';
export interface OneAppInfo extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    readonly version: string | undefined;
    readonly build: string | undefined;
    readonly applicationId: string | undefined;
}
//# sourceMappingURL=OneAppInfo.nitro.d.ts.map