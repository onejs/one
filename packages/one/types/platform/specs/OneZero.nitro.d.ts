import type { HybridObject } from 'react-native-nitro-modules';
export interface OneZero extends HybridObject<{
    ios: 'c++';
    android: 'c++';
}> {
    open(name: string, schemaJson: string, clientID: string): Promise<void>;
    execute(requestJson: string): Promise<string>;
    close(): Promise<void>;
}
//# sourceMappingURL=OneZero.nitro.d.ts.map