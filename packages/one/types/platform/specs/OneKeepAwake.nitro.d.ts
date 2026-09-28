import type { HybridObject } from 'react-native-nitro-modules';
export interface OneKeepAwake extends HybridObject<{
    ios: 'swift';
}> {
    isEnabled(): Promise<boolean>;
    setEnabled(enabled: boolean): Promise<void>;
}
//# sourceMappingURL=OneKeepAwake.nitro.d.ts.map