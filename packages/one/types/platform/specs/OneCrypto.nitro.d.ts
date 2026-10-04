import type { HybridObject } from 'react-native-nitro-modules';
export interface OneCrypto extends HybridObject<{
    ios: 'c++';
    android: 'c++';
}> {
    fillRandomBytes(buffer: ArrayBuffer, offset: number, length: number): void;
    randomUUID(): string;
}
//# sourceMappingURL=OneCrypto.nitro.d.ts.map