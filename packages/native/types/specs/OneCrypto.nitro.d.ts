import type { HybridObject } from 'react-native-nitro-modules';
export interface OneCrypto extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    getRandomBytes(count: number): ArrayBuffer;
}
//# sourceMappingURL=OneCrypto.nitro.d.ts.map